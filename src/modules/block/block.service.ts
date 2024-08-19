import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BlockDTO } from './dto/block.dto';
import { BlockWithTransactions } from './dto/block.transactions.dto';
import { PaginatedBlocksResponse } from './dto/paginated.blocks.response.dto';
import { TransactionDTO } from '../tx/dto/transaction.dto';

@Injectable()
export class BlockService {
  constructor(private prisma: PrismaService) {}

  async push_getBlocksByTime(
    params: [number, string, boolean, number?], // startTime, direction, showDetails, pageSize
  ): Promise<PaginatedBlocksResponse> {
    const [startTime, direction, showDetails, pageSize = 10] = params;

    const orderByDirection = direction === 'ASC' ? 'asc' : 'desc';

    // Calculate the total count of blocks
    const totalBlocks = await this.prisma.block.count({
      where: {
        ts: {
          gte: startTime,
        },
      },
    });

    // Calculate total pages
    const totalPages = Math.ceil(totalBlocks / pageSize);

    const blocks = await this.prisma.block.findMany({
      where: {
        ts: {
          gte: startTime,
        },
      },
      orderBy: { ts: orderByDirection },
      take: pageSize,
    });

    const lastTs = blocks.length ? blocks[blocks.length - 1].ts : 0;

    let responseBlocks: BlockWithTransactions[] = blocks.map(
      (block: BlockDTO) => ({
        block_hash: block.block_hash,
        ts: block.ts,
        transactions: [],
      }),
    );

    if (showDetails) {
      responseBlocks = await Promise.all(
        blocks.map(async (block: BlockDTO): Promise<BlockWithTransactions> => {
          const transactions = await this.prisma.transaction.findMany({
            where: { block_hash: block.block_hash },
          });
          return {
            block_hash: block.block_hash,
            ts: block.ts,
            transactions: transactions.map((tx: TransactionDTO) => ({
              txn_hash: tx.txn_hash,
              ts: tx.ts,
              block_hash: tx.block_hash,
              category: tx.category,
              source: tx.source,
              recipients: tx.recipients,
              data_as_json: tx.data_as_json,
              sig: tx.sig,
            })),
          };
        }),
      );
    }

    return {
      blocks: responseBlocks,
      lastTs,
      totalPages,
    };
  }

  async push_getBlockByHash(
    params: [string],
  ): Promise<BlockWithTransactions | null> {
    const [blockHash] = params;

    const block = await this.prisma.block.findUnique({
      where: { block_hash: blockHash },
    });

    if (!block) {
      throw new Error('Block not found');
    }

    const transactions = await this.prisma.transaction.findMany({
      where: { block_hash: block.block_hash },
    });

    return {
      block_hash: block.block_hash,
      ts: block.ts,
      transactions: transactions.map((tx: TransactionDTO) => ({
        txn_hash: tx.txn_hash,
        ts: tx.ts,
        block_hash: tx.block_hash,
        category: tx.category,
        source: tx.source,
        recipients: tx.recipients,
        data_as_json: tx.data_as_json,
        sig: tx.sig,
      })),
    };
  }

  async getTotalBlocks(): Promise<number> {
    return this.prisma.block.count();
  }
}
