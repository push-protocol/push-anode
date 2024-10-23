import { Block } from '../../generated/block_pb';
import { Consumer, QItem } from '../../messaging/types/queue-types';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ObjectHasher } from '../../utils/objectHasher';

@Injectable()
export class ArchiveNodeService implements Consumer<QItem> {
  constructor(private readonly prisma: PrismaService) {}

  public async accept(item: QItem): Promise<boolean> {
    try {
      // Deserialize the block data
      const bytes = Uint8Array.from(Buffer.from(item.object, 'hex'));
      const block = Block.deserializeBinary(bytes).toObject();

      // Extract block hash from the block
      const blockHash = this.getBlockHash(block);
      if (await this.isBlockAlreadyStored(blockHash)) {
        console.log('Block already exists, skipping:', blockHash);
        return true;
      }

      // Prepare the block data for insertion
      const blockData = {
        block_hash: blockHash,
        data_as_json: this.recursivelyConvertToJSON(block), // Convert to JSON-compatible format
        data: Buffer.from(bytes), // Store the binary data
        ts: block.ts,
      };

      // Prepare transaction data for insertion
      const transactionsData = await this.prepareTransactionsData(
        block.txobjList,
        blockHash,
        block.ts,
      );
      if (transactionsData.length === 0) {
        console.log('All transactions already exist, skipping block insert.');
        return true;
      }

      // Insert block into the database
      await this.prisma.block.create({ data: blockData });

      // Insert transactions into the database
      await this.prisma.transaction.createMany({ data: transactionsData });

      console.log('Block and transactions inserted:', blockHash);
      return true;
    } catch (error) {
      console.log('Failed to process block:', error);
      return false;
    }
  }

  private getBlockHash(block: Block.AsObject): string {
    // Generate a block hash using the ObjectHasher utility
    return ObjectHasher.hashToSha256(block);
  }

  private async isBlockAlreadyStored(blockHash: string): Promise<boolean> {
    const block = await this.prisma.block.findUnique({
      where: { block_hash: blockHash },
    });
    return block !== null;
  }

  private recursivelyConvertToJSON(obj: any): any {
    if (obj instanceof Uint8Array) {
      // Convert Uint8Array to a base64 string
      return Buffer.from(obj).toString('base64');
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.recursivelyConvertToJSON(item));
    }

    if (obj !== null && typeof obj === 'object') {
      const convertedObj: any = {};
      for (const key in obj) {
        convertedObj[key] = this.recursivelyConvertToJSON(obj[key]);
      }
      return convertedObj;
    }

    return obj;
  }

  // TODO: remove from or sender its redundant
  private async prepareTransactionsData(
    txObjList: Block.AsObject['txobjList'],
    blockHash: string,
    blockTs: number,
  ): Promise<any[]> {
    const transactionsData = [];

    for (const txObj of txObjList) {
      const txnHash = this.getTransactionHash(txObj);
      if (await this.isTransactionAlreadyStored(txnHash)) {
        console.log('Transaction already exists, skipping:', txnHash);
        continue;
      }

      const txData = {
        ts: blockTs,
        txn_hash: txnHash,
        block_hash: blockHash,
        category: txObj.tx?.category || '',
        sender: txObj.tx?.sender || '',
        status: 'SUCCESS',
        from: txObj.tx?.sender || '',
        recipients: {
          recipients:
            txObj.tx?.recipientsList.map((recipient) => ({
              address: recipient,
            })) || [],
        },
        data: txObj.tx.data, // Store binary data
        data_as_json: txObj,
        sig: txObj.tx?.signature,
      };

      transactionsData.push(txData);
    }

    return transactionsData;
  }

  private getTransactionHash(txObj: Block.AsObject['txobjList'][0]): string {
    return ObjectHasher.hashToSha256(txObj);
  }

  private async isTransactionAlreadyStored(txnHash: string): Promise<boolean> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { txn_hash: txnHash },
    });
    return transaction !== null;
  }
}
