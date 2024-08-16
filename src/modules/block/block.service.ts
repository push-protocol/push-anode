import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface Transaction {
  ts: Date;
  block_hash: string;
  category: string;
  source: string;
  recipients: unknown; // Change to appropriate type if known
  data: string;
  data_as_json: unknown; // Change to appropriate type if known
  sig: string;
}

interface Block {
  block_hash: string;
  data: Buffer; // Since data is now Bytes in the schema
  ts: Date;
}

interface BlockWithTransactions extends Block {
  transactions: Transaction[];
}

export interface PaginatedBlocksResponse {
  blocks: (Block | BlockWithTransactions)[];
  lastTs: string;
}

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
      (block) => ({
        block_hash: block.block_hash,
        data: block.data,
        ts: block.ts,
      }),
    );

    if (showDetails) {
      responseBlocks = await Promise.all(
        blocks.map(async (block) => {
          const transactions = await this.prisma.transaction.findMany({
            where: { block_hash: block.block_hash },
          });
          return {
            block_hash: block.block_hash,
            data: block.data,
            ts: block.ts,
            transactions: transactions.map((tx) => ({
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
      transactions: transactions.map((tx) => ({
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
