import { PrismaService } from '../../prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { BlockWithTransactions } from '../block/dto/block.transactions.dto';
import { PaginatedBlocksResponse } from '../block/dto/paginated.blocks.response.dto';
import { TransactionDTO } from './dto/transaction.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class TxService {
  constructor(private prisma: PrismaService) {}

  async push_getTransactions(
    startTime: number,
    direction: string,
    pageSize: number,
    category?: string,
  ): Promise<PaginatedBlocksResponse> {
    const orderByDirection = direction === 'ASC' ? 'asc' : 'desc';

    const where = {
      ...(category && { category }), // Filter by category if provided
      ts: {
        [orderByDirection === 'asc' ? 'gte' : 'lte']: startTime, // Use UNIX timestamp as is
      },
    };

    // Calculate the total count of transactions
    const totalTransactions = await this.prisma.transaction.count({
      where,
    });

    // Calculate total pages
    const totalPages = Math.ceil(totalTransactions / pageSize);

    const transactions = await this.prisma.transaction.findMany({
      where,
      orderBy: {
        ts: orderByDirection,
      },
      take: pageSize,
    });

    const blocks = await this.groupTransactionsByBlock(transactions);
    const lastTs = transactions.length
      ? transactions[transactions.length - 1].ts
      : 0;

    return {
      blocks,
      lastTs,
      totalPages, // Include total pages in the response
    };
  }

  async push_getTransactionsByRecipient(
    recipientAddress: string,
    startTime: number,
    direction: string,
    pageSize: number,
  ): Promise<PaginatedBlocksResponse> {
  
    const orderByDirection = direction === 'asc' ? 'asc' : 'desc';

    const where = {
      AND: [
        {
          ts: {
            [orderByDirection === 'asc' ? 'gte' : 'lte']: startTime,
          },
        },
        {
          recipients: {
            path: ['address'],
            equals: recipientAddress,
          },
        },
      ],
    };

    // Calculate the total count of transactions
    const totalTransactions = await this.prisma.transaction.count({
      where,
    });

    // Calculate total pages
    const totalPages = Math.ceil(totalTransactions / pageSize);

    // Fetch transactions with pagination
    const transactions = await this.prisma.transaction.findMany({
      where,
      orderBy: {
        ts: orderByDirection,
      },
      take: pageSize, // Apply the page size
    });

    const blocks = await this.groupTransactionsByBlock(transactions);
    const lastTs = transactions.length
      ? transactions[transactions.length - 1].ts
      : 0;

    return {
      blocks,
      lastTs,
      totalPages, // Include total pages in the response
    };
  }

  // Total transactions count
  async getTotalTransactions(): Promise<number> {
    return this.prisma.transaction.count();
  }

  // Daily transactions count (from the start of the day)
  async getDailyTransactions(): Promise<number> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0); // Start of the day

    return this.prisma.transaction.count({
      where: {
        ts: {
          gte: Math.floor(todayStart.getTime() / 1000), // Using epoch time for comparison
        },
      },
    });
  }

  private async groupTransactionsByBlock(
    transactions: TransactionDTO[],
  ): Promise<BlockWithTransactions[]> {
    const blocksMap = new Map<string, BlockWithTransactions>();

    for (const tx of transactions) {
      // Check if the block is already in the map
      if (!blocksMap.has(tx.block_hash)) {
        // Fetch the block data associated with the block_hash only if it hasn't been fetched already
        const block = await this.prisma.block.findUnique({
          where: { block_hash: tx.block_hash },
        });

        // Ensure block exists before proceeding
        if (block) {
          blocksMap.set(tx.block_hash, {
            block_hash: block.block_hash,
            ts: block.ts,
            transactions: [],
          });
        }
      }

      // If the block exists in the map, add the transaction to the block's transactions list
      const blockWithTransactions = blocksMap.get(tx.block_hash);
      if (blockWithTransactions) {
        blockWithTransactions.transactions.push(tx);
      }
    }

    return Array.from(blocksMap.values());
  }

  /**
   * Fetches a transaction based on its hash.
   *
   * @param params - The parameters containing the transaction hash.
   * @returns A transaction object if found, otherwise throws an error.
   */
  async push_getTransactionByHash(params: {
    hash: string;
  }): Promise<TransactionDTO> {
    const tx = await this.prisma.transaction.findUnique({
      where: { txn_hash: params.hash },
    });

    if (!tx) {
      throw new Error('Transaction not found');
    }

    return {
      txn_hash: tx.txn_hash,
      ts: tx.ts,
      block_hash: tx.block_hash,
      category: tx.category,
      source: tx.source,
      recipients: tx.recipients ?? ({} as Prisma.JsonValue), // Ensure recipients is always defined
      data_as_json: tx.data_as_json ?? ({} as Prisma.JsonValue), // Ensure data_as_json is always defined
      sig: tx.sig,
    };
  }
}
