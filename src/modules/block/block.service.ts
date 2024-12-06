import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BlockWithTransactions } from './dto/block.transactions.dto';
import { PaginatedBlocksResponse } from './dto/paginated.blocks.response.dto';
import { Block, Prisma, Transaction } from '@prisma/client';
import { ArchiveNodeService } from '../archive/archive-node.service';
import { BitUtil } from '../../utilz/bitUtil';
import { BlockUtil } from '../validator/blockUtil';
import { Logger } from 'winston';
import { WinstonUtil } from '../../utilz/winstonUtil';
import { StrUtil } from '../../utilz/strUtil';
import { DateUtil } from '../../utilz/dateUtil';
import { Check } from '../../utilz/check';
import { NumUtil } from '../../utilz/numUtil';
import { CaipAddr, ChainUtil } from '../../utilz/chainUtil';

@Injectable()
export class BlockService {
  private log: Logger = WinstonUtil.newLog(BlockService);

  constructor(
    private prisma: PrismaService,
    private archiveNodeService: ArchiveNodeService,
  ) {}

  async push_getBlocksByTime(
    startTime: number,
    direction: string,
    showDetails: boolean,
    pageSize: number,
    page: number = 1, // Default page number is 1
  ): Promise<PaginatedBlocksResponse> {
    const orderByDirection = direction === 'ASC' ? 'asc' : 'desc';

    const where = {
      ts: {
        [orderByDirection === 'asc' ? 'gte' : 'lte']: startTime,
      },
    };

    const totalBlocks = await this.prisma.block.count({
      where,
    });

    const totalPages = Math.ceil(totalBlocks / pageSize);
    const skip = (page - 1) * pageSize;

    const blocks = await this.prisma.block.findMany({
      where,
      orderBy: { ts: orderByDirection },
      take: pageSize,
      skip: skip, // Skip based on the page number
    });

    const lastTs = blocks.length ? blocks[blocks.length - 1].ts : BigInt(0);

    const responseBlocks: BlockWithTransactions[] = await Promise.all(
      blocks.map(async (block: Block): Promise<BlockWithTransactions> => {
        const totalNumberOfTxns = await this.prisma.transaction.count({
          where: { block_hash: block.block_hash },
        });

        let transactions: Transaction[] = [];

        if (showDetails) {
          transactions = await this.prisma.transaction.findMany({
            where: { block_hash: block.block_hash },
          });
        }

        const blockSize = block.data.length;

        return {
          blockHash: block.block_hash,
          blockData: block.data.toString('hex'),
          blockDataAsJson: block.data_as_json ?? ({} as Prisma.JsonValue),
          blockSize,
          ts: block.ts,
          transactions: transactions.map((tx) => ({
            txnHash: tx.txn_hash,
            ts: tx.ts,
            blockHash: tx.block_hash,
            category: tx.category,
            sender: tx.sender,
            status: tx.status,
            from: tx.from,
            recipients: tx.recipients,
            txnDataAsJson: tx.data_as_json,
            txnData: tx.data.toString('hex'),
            sig: tx.sig,
          })),
          totalNumberOfTxns,
        };
      }),
    );

    return {
      blocks: responseBlocks,
      lastTs,
      totalPages,
    };
  }

  async push_getBlockByHash(
    blockHash: string,
    showDetails: boolean = true,
  ): Promise<PaginatedBlocksResponse> {
    const block = await this.prisma.block.findUnique({
      where: { block_hash: blockHash },
    });

    if (!block) {
      return { blocks: [], lastTs: BigInt(0), totalPages: 0 };
    }

    const totalNumberOfTxns = await this.prisma.transaction.count({
      where: { block_hash: block.block_hash },
    });

    const responseBlock: BlockWithTransactions = {
      blockHash: block.block_hash,
      blockSize: block.data.length,
      blockData: block.data.toString('hex'),
      blockDataAsJson: block.data_as_json,
      ts: block.ts,
      transactions: [],
      totalNumberOfTxns,
    };

    if (showDetails) {
      const transactions = await this.prisma.transaction.findMany({
        where: { block_hash: block.block_hash },
      });

      responseBlock.transactions = transactions.map((tx) => ({
        txnHash: tx.txn_hash,
        ts: tx.ts,
        blockHash: tx.block_hash,
        category: tx.category,
        sender: tx.sender,
        status: tx.status,
        from: tx.from,
        recipients: tx.recipients,
        txnDataAsJson: tx.data_as_json,
        txnData: tx.data.toString('hex'),
        sig: tx.sig,
      }));
    }

    return {
      blocks: [responseBlock],
      lastTs: block.ts,
      totalPages: 1,
    };
  }

  async getTotalBlocks(): Promise<number> {
    return this.prisma.block.count();
  }

  // TODO: Add signature validation
  // TODO: normal logging
  async push_putBlockHash(hashes: string[]) {
    this.log.debug('push_putBlockHash: %s', StrUtil.fmt(hashes));
    if (hashes.length === 0) {
      return [];
    }
    const results = await this.prisma.$queryRaw<
      Array<{ hash: string; is_present: number }>
    >(
      Prisma.sql`SELECT h.hash, CASE WHEN b.block_hash IS NOT NULL THEN 1 ELSE 0 END AS is_present
    FROM unnest(${hashes}::text[]) AS h(hash)
    LEFT JOIN "Block" b ON h.hash = b.block_hash`,
    );
    const statusArr = results.map((result) =>
      result.is_present === 1 ? 'DO_NOT_SEND' : 'SEND',
    );
    this.log.debug('Returning response: %s', statusArr);
    return statusArr;
  }

  // TODO: add signature validation
  async push_putBlock(
    blocks: string[],
  ): Promise<{ status: string; reason?: string }[]> {
    this.log.debug('push_putBlock: %s', StrUtil.fmt(blocks));
    let statusArr: { status: string; reason?: string }[] = [];
    if (blocks.length === 0) {
      return statusArr;
    }
    const prisma = new PrismaService();
    for (let i = 0; i < blocks.length; i++) {
      try {
        let block = blocks[i];
        const mb = BitUtil.base16ToBytes(block);
        const parsedBlock = BlockUtil.parseBlock(mb);
        const [res, err] = await this.archiveNodeService.handleBlock(
          parsedBlock,
          mb,
        );
        if (err != null) {
          statusArr.push({ status: 'REJECTED', reason: err });
          continue;
        }
        if (!res) {
          statusArr.push({ status: 'REJECTED', reason: 'duplicate' });
          continue;
        }
        statusArr.push({ status: 'SUCCESS' });
      } catch (error) {
        statusArr.push({ status: 'REJECTED', reason: error.message });
      }
    }
    this.log.debug('Returning response: %s', statusArr);
    return statusArr;
  }

  async push_getTransactions(walletInCaip: string, category: string, firstTs: string, sort: string) {
    // the value should be the same for SNODE/ANODE
    // DON'T EDIT THIS UNLESS YOU NEED TO
    let pageSize = 30;
    if (StrUtil.isEmpty(firstTs)) {
      firstTs = '' + DateUtil.currentTimeSeconds();
    }
    if (StrUtil.isEmpty(sort)) {
      sort = 'DESC';
    }
    Check.isTrue(ChainUtil.isFullCAIPAddress(walletInCaip), 'invalid wallet, only caip10 format is supported' + walletInCaip);
    Check.isTrue(sort === 'ASC' || sort === 'DESC', 'invalid sort');
    Check.isTrue(pageSize > 0 && pageSize <= 1000, 'invalid pageSize');
    const isFirstQuery = StrUtil.isEmpty(firstTs);
    let firstTsSeconds = DateUtil.parseUnixFloatOrFail(firstTs);
    let firstTsMillis = DateUtil.unixFloatToMillis(firstTsSeconds);
    Check.isTrue(isFirstQuery || firstTsSeconds != null);
    const comparator = sort === 'ASC' ? '>' : '<';
    const recipientJson = JSON.stringify({ recipients: [{ address: walletInCaip }] });

    let sql = `select ts, txn_hash, data_as_json
     from "Transaction" 
     where category=$1 and (sender=$2 OR recipients @> $3::jsonb) 
     ${isFirstQuery ? '' : `and ts ${comparator} $4`}
     order by ts ${sort}
     FETCH FIRST ${pageSize} ROWS WITH TIES`;
    this.log.debug('query: %s', sql);
    const rows = await this.prisma.$queryRawUnsafe<
      Array<{ ts: BigInt; txn_hash: string, data_as_json: any }>
    >(
      sql,
      category, walletInCaip, recipientJson, firstTsMillis
    );
    const itemsArr = rows.map((row) => {
      let tx:{ fee: string, data: string, type: number, sender: string, category: string, recipientsList: string} = row.data_as_json.tx;
      let dataAsBase16 = BitUtil.base64ToBase16(tx.data);
      let tsAsUnixFloatStr = NumUtil.toString(Number(row.ts));
      return {
        ns: tx.category,
        skey: row.txn_hash,
        ts: tsAsUnixFloatStr,
        payload: {
          data: dataAsBase16,
          hash: row.txn_hash,
          type: tx.type,
          sender: tx.sender,
          category: tx.category,
          recipientsList: tx.recipientsList
        }
      } as Item;
    });
    for (const row of itemsArr) {
      this.log.debug('row %o', row);
    }
    let lastTs = itemsArr.length == 0 ? null : itemsArr[itemsArr.length - 1].ts
    return {
      items: itemsArr,
      lastTs: lastTs
    } as PushGetTransactionsResult
  }
}

type Payload = {
  data: string;
  hash: string;
  type: number;
  sender: string;
  category: string;
  recipientsList: string;
}

type Item = {
  ns: string;
  skey: string;
  ts: string;
  payload: Payload;
}

type PushGetTransactionsResult = {
  items: Item[];
  lastTs: string | null;
}

