import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Block } from './dto/block.dto';
import { BlockWithTransactions } from './dto/block.transactions.dto';
import { PaginatedBlocksResponse } from './dto/paginated.blocks.response.dto';
import { Transaction } from '../tx/dto/transaction.dto';

@Injectable()
export class BlockService {
  constructor(private prisma: PrismaService) {}

  async push_getBlocksByTime(
    params: [number, string, boolean], // startTime is now a number (epoch)
  ): Promise<PaginatedBlocksResponse> {
    const [startTimeEpoch, direction, showDetails] = params;

    const orderByDirection = direction === 'ASC' ? 'asc' : 'desc';

    const blocks = await this.prisma.block.findMany({
      where: {
        ts: { gte: startTimeEpoch as number }, // Ensure startTimeEpoch is an integer
      },
      orderBy: { ts: orderByDirection },
      take: 10, // Assuming pagination, fetching 10 blocks
    });

    const lastTs = blocks.length
      ? blocks[blocks.length - 1].ts
      : 0;

    let responseBlocks: BlockWithTransactions[] = blocks.map(
      (block: Block) => ({
        block_hash: block.block_hash,
        data: block.data,
        ts: block.ts,
        transactions: [],
      }),
    );

    if (showDetails) {
      responseBlocks = await Promise.all(
        blocks.map(async (block: Block): Promise<BlockWithTransactions> => {
          const transactions = await this.prisma.transaction.findMany({
            where: { block_hash: block.block_hash },
          });
          return {
            block_hash: block.block_hash,
            data: block.data,
            ts: block.ts,
            transactions: transactions.map((tx: Transaction) => ({
              ts: tx.ts,
              block_hash: tx.block_hash,
              category: tx.category,
              source: tx.source,
              recipients: tx.recipients,
              data: tx.data,
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
      data: block.data,
      ts: block.ts,
      transactions: transactions.map((tx: Transaction) => ({
        ts: tx.ts,
        block_hash: tx.block_hash,
        category: tx.category,
        source: tx.source,
        recipients: tx.recipients,
        data: tx.data,
        data_as_json: tx.data_as_json,
        sig: tx.sig,
      })),
    };
  }
}
