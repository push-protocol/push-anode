import {
  Block,
  TransactionObj,
  Transaction as Tx,
} from '../../generated/push/block_pb';
import { Consumer, QItem } from '../../messaging/types/queue-types';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ObjectHasher } from '../../utilz/objectHasher';
import { ValidatorContractState } from '../validator/validator-contract-state.service';
import { BlockUtil } from '../validator/blockUtil';
import {
  InputJsonValue,
  InputJsonObject,
} from '@prisma/client/runtime/library';
import { Tuple } from '../../utilz/tuple';

type Transaction = {
  ts?: bigint | number;
  txn_hash: string;
  block_hash: string;
  category: string;
  sender: string;
  status: string;
  from: string;
  recipients: InputJsonValue;
  data: Buffer;
  data_as_json: InputJsonValue;
  sig: string;
};
@Injectable()
export class ArchiveNodeService implements Consumer<QItem> {

  constructor(private prisma: PrismaService,
              private valContractState: ValidatorContractState) {
  }

  public async accept(item: QItem): Promise<boolean> {
    try {
      // Deserialize the block data
      const bytes = Uint8Array.from(Buffer.from(item.object, 'hex'));
      const deserializedBlock = Block.deserializeBinary(bytes);

      // Block validation //
      // validate the hash
      const calculatedHash = BlockUtil.hashBlockAsHex(bytes);
      if (calculatedHash != item.object_hash) {
        throw new Error(
          'received item hash= , ' +
            item.object_hash +
            'which differs from calculatedHash=, ' +
            calculatedHash +
            'ignoring the block because producer calculated the hash incorrectly',
        );
      }
      // validate the signature
      let [res, err] = await this.handleBlock(deserializedBlock, bytes);
      return res;
    } catch (error) {
      console.log('Failed to process block:', error);
      return false;
    }
  }

  public async handleBlock(blockObj: Block, blockBytes: Uint8Array): Promise<Tuple<boolean, string>> {
    try {
      // check by block hash
      const blockHash = BlockUtil.hashBlockAsHex(blockBytes);
      if (await this.isBlockAlreadyStored(blockHash)) {
        console.log('Block already exists, skipping:', blockHash);
        return [true, null];
      }
      // check if valid
      const block = blockObj.toObject();
      if (!(await this.validateBlock(blockObj))) {
        throw new Error('Block validation failed');
      }

      // Prepare the block data for insertion
      const blockData = {
        block_hash: blockHash,
        data_as_json: this.recursivelyConvertToJSON(block), // Convert to JSON-compatible format
        data: Buffer.from(blockBytes), // Store the binary data
        ts: block.ts,
      };
      // Prepare transaction data for insertion
      const transactionsData = await this.prepareTransactionsData(
        blockObj.getTxobjList(),
        blockHash,
        block.ts,
      );
      if (transactionsData.length === 0) {
        console.log('All transactions already exist, skipping block insert.');
        return [true, null];
      }
      // Insert block into the database
      await this.prisma.block.create({ data: blockData });

      // Insert transactions into the database
      await this.prisma.transaction.createMany({ data: transactionsData });

      console.log('Block and transactions inserted:', blockHash);
      return [true, null];
    } catch (error) {
      console.error('Failed to process block:', error);
      return [false, error.message];
    }
  }

  private async validateBlock(block: Block) {
    const validatorSet = new Set(this.valContractState.getAllNodesMap().keys());
    const validationPerBlock = this.valContractState.contractCli.valPerBlock;
    const validationRes = await BlockUtil.checkBlockAsSNode(
      block,
      validatorSet,
      validationPerBlock,
    );
    if (!validationRes.success) {
      console.error('Error while block validation');
      return false;
    } else {
      return true;
    }
  }

  private getBlockHash(block: Block.AsObject): string {
    // Generate a block hash using the ObjectHasher utility
    return ObjectHasher.hashToSha256(block);
  }

  public async isBlockAlreadyStored(blockHash: string): Promise<boolean> {
    const block = await this.prisma.block.findUnique({
      where: { block_hash: blockHash },
    });
    return block !== null;
  }

  private recursivelyConvertToJSON(
    obj: Uint8Array | Array<unknown> | object,
  ): InputJsonObject | InputJsonValue {
    if (obj instanceof Uint8Array) {
      // Convert Uint8Array to a base64 string
      return Buffer.from(obj).toString('base64');
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.recursivelyConvertToJSON(item));
    }

    if (obj !== null && typeof obj === 'object') {
      const convertedObj: unknown = {};
      for (const key in obj) {
        convertedObj[key] = this.recursivelyConvertToJSON(obj[key]);
      }
      return convertedObj as InputJsonObject;
    }

    return obj;
  }

  // TODO: remove from or sender its redundant
  private async prepareTransactionsData(txObjList: Array<TransactionObj>, blockHash: string, blockTs: number,): Promise<Transaction[]> {
    const transactionsData = [];

    for (const txObj of txObjList) {
      const tx = txObj.getTx();
      const txnHash = this.getTransactionHash(tx);
      if (await this.isTransactionAlreadyStored(txnHash)) {
        console.log('Transaction already exists, skipping:', txnHash);
        continue;
      }

      const txJsonObj = txObj.toObject();
      const txData = {
        ts: blockTs,
        txn_hash: txnHash,
        block_hash: blockHash,
        category: txJsonObj.tx.category || '',
        sender: txJsonObj.tx?.sender || '',
        status: 'SUCCESS',
        from: txJsonObj.tx?.sender || '',
        recipients: {
          recipients:
            txJsonObj.tx?.recipientsList.map((recipient) => ({
              address: recipient,
            })) || [],
        },
        data: txJsonObj.tx.data, // Store binary data
        data_as_json: txJsonObj,
        sig: txJsonObj.tx?.signature,
      };
      transactionsData.push(txData);
    }

    return transactionsData;
  }

  private getTransactionHash(transaction: Tx): string {
    return BlockUtil.hashTxAsHex(transaction.serializeBinary());
  }

  private async isTransactionAlreadyStored(txnHash: string): Promise<boolean> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { txn_hash: txnHash },
    });
    return transaction !== null;
  }
}
