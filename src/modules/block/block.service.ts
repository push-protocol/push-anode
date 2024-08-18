import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Block } from './dto/block.dto';
import { BlockWithTransactions } from './dto/block.transactions.dto';
import { PaginatedBlocksResponse } from './dto/paginated.blocks.response.dto';
@Injectable()
export class BlockService {
  constructor(private prisma: PrismaService) {}

  async push_getBlocksByTime(
    params: [string, string, boolean],
  ): Promise<PaginatedBlocksResponse> {
    const [startTime, direction, showDetails] = params;

    const orderByDirection = direction === 'ASC' ? 'asc' : 'desc';

    const blocks = await this.prisma.block.findMany({
      where: {
        ts: { gte: new Date(startTime) }, // Start from the provided timestamp
      },
      orderBy: { ts: orderByDirection },
      take: 10, // Assuming pagination, fetching 10 blocks
    });

    const lastTs = blocks.length
      ? blocks[blocks.length - 1].ts.getTime().toString()
      : '';

    let responseBlocks: (Block | BlockWithTransactions)[] = blocks.map(
      (block: any) => ({
        block_hash: block.block_hash,
        data: block.data,
        ts: block.ts,
      }),
    );

    if (showDetails) {
      responseBlocks = await Promise.all(
        blocks.map(async (block: any) => {
          const transactions = await this.prisma.transaction.findMany({
            where: { block_hash: block.block_hash },
          });
          return {
            block_hash: block.block_hash,
            data: block.data,
            ts: block.ts,
            transactions: transactions.map((tx: any) => ({
              ts: tx.ts,
              block_hash: tx.block_hash,
              category: tx.category,
              source: tx.source,
              recipients: tx.recipients,
              data: tx.data,
              data_as_json: tx.data_as_json,
              sig: tx.sig,
            })),
          } as BlockWithTransactions;
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
      transactions: transactions.map((tx: any) => ({
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
