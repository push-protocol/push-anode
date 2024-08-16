import { PrismaService } from '../../prisma/prisma.service';
import { Injectable } from '@nestjs/common';

export interface Transaction {
  ts: Date;
  block_hash: string;
  category: string;
  source: string;
  recipients?: any; // Replace 'any' with the appropriate type if known
  data: string;
  data_as_json?: any; // Replace 'any' with the appropriate type if known
  sig: string;
}

interface BlockWithTransactions {
  ts: string;
  transactions: Transaction[];
}

export interface PaginatedTransactionsResponse {
  blocks: BlockWithTransactions[];
  lastTs: string;
}

@Injectable()
export class TxService {
  constructor(private prisma: PrismaService) {}

  async push_getTransactions(params: {
    category?: string;
    sortKey: string;
    direction?: 'asc' | 'desc';
    showDetails?: boolean; // This is now unused but kept for potential future use
  }): Promise<PaginatedTransactionsResponse> {
    const { category, sortKey, direction = 'desc' } = params;

    const where = {
      ...(category && { category }), // Filter by category if provided
      ts: {
        [direction === 'asc' ? 'gte' : 'lte']: new Date(
          parseFloat(sortKey) * 1000,
        ), // Convert UNIX timestamp to date
      },
    };

    const transactions = await this.prisma.transaction.findMany({
      where,
      orderBy: {
        ts: direction,
      },
    });

    const blocks = this.groupTransactionsByBlock(transactions);
    const lastTs = transactions.length
      ? transactions[transactions.length - 1].ts.getTime().toString()
      : sortKey;

    return {
      blocks,
      lastTs,
    };
  }

  private groupTransactionsByBlock(
    transactions: Transaction[],
  ): BlockWithTransactions[] {
    const blocksMap = new Map<string, BlockWithTransactions>();

    transactions.forEach((tx) => {
      if (!blocksMap.has(tx.block_hash)) {
        blocksMap.set(tx.block_hash, {
          ts: tx.ts.getTime().toString(),
          transactions: [],
        });
      }
      blocksMap.get(tx.block_hash)!.transactions.push(tx);
    });

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
  }): Promise<Transaction> {
    const tx = await this.prisma.transaction.findUnique({
      where: { sig: params.hash },
    });

    if (!tx) {
      throw new Error('Transaction not found');
    }

    return {
      ts: tx.ts,
      block_hash: tx.block_hash,
      category: tx.category,
      source: tx.source,
      recipients: tx.recipients,
      data: tx.data,
      data_as_json: tx.data_as_json,
      sig: tx.sig,
    };
  }
}
