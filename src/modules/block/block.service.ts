import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BlockWithTransactions } from './dto/block.transactions.dto';
import { PaginatedBlocksResponse } from './dto/paginated.blocks.response.dto';
import { Block, Prisma, Transaction } from '@prisma/client';

@Injectable()
export class BlockService {
  constructor(private prisma: PrismaService) {}

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

    const lastTs = blocks.length ? blocks[blocks.length - 1].ts : 0;

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
      return { blocks: [], lastTs: 0, totalPages: 0 };
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
}
