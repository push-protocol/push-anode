import { PrismaService } from '../../prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { BlockWithTransactions } from '../block/dto/block.transactions.dto';
import { PaginatedBlocksResponse } from '../block/dto/paginated.blocks.response.dto';
import { Prisma, Transaction } from '@prisma/client';

@Injectable()
export class TxService {
  constructor(private prisma: PrismaService) {}

  private buildWhereClause(
    startTime: number,
    direction: string,
    category?: string,
    recipientAddress?: string,
    senderAddress?: string,
    userAddress?: string,
  ) {
    const comparisonOperator = direction === 'ASC' ? 'gte' : 'lte';

    let where: Prisma.TransactionWhereInput = {
      ts: {
        [comparisonOperator]: startTime,
      },
    };

    if (category) {
      where = { ...where, category };
    }

    if (recipientAddress) {
      where = {
        ...where,
        recipients: {
          path: ['recipients'],
          array_contains: [{ address: recipientAddress }],
        },
      };
    }

    if (senderAddress) {
      where = { ...where, sender: senderAddress };
    }

    if (userAddress) {
      where = {
        ...where,
        OR: [
          { sender: userAddress },
          {
            recipients: {
              path: ['recipients'],
              array_contains: [{ address: userAddress }],
            },
          },
        ],
      };
    }

    return where;
  }

  private async paginateTransactions(
    where: Prisma.TransactionWhereInput,
    direction: string,
    pageSize: number,
    page: number,
  ): Promise<{
    transactions: Transaction[];
    totalTransactions: number;
    totalPages: number;
  }> {
    const orderByDirection = direction === 'ASC' ? 'asc' : 'desc';
    const skip = (page - 1) * pageSize;

    const totalTransactions = await this.prisma.transaction.count({ where });
    const totalPages = Math.ceil(totalTransactions / pageSize);

    const transactions = await this.prisma.transaction.findMany({
      where,
      orderBy: { ts: orderByDirection },
      take: pageSize,
      skip,
    });

    return { transactions, totalTransactions, totalPages };
  }

  async push_getTransactions(
    startTime: number,
    direction: string,
    pageSize: number,
    page: number = 1,
    category?: string,
  ): Promise<PaginatedBlocksResponse> {
    const where = this.buildWhereClause(startTime, direction, category);
    const { transactions, totalPages } = await this.paginateTransactions(
      where,
      direction,
      pageSize,
      page,
    );

    const blocks = await this.groupTransactionsByBlock(transactions);
    const lastTs = transactions.length
      ? transactions[transactions.length - 1].ts
      : BigInt(0);

    return { blocks, lastTs, totalPages };
  }

  async push_getTransactionsByRecipient(
    recipientAddress: string,
    startTime: number,
    direction: string,
    pageSize: number,
    page: number = 1,
    category?: string,
  ): Promise<PaginatedBlocksResponse> {
    const where = this.buildWhereClause(
      startTime,
      direction,
      category,
      recipientAddress,
    );
    const { transactions, totalPages } = await this.paginateTransactions(
      where,
      direction,
      pageSize,
      page,
    );

    const blocks = await this.groupTransactionsByBlock(transactions);
    const lastTs = transactions.length
      ? transactions[transactions.length - 1].ts
      : BigInt(0);

    return { blocks, lastTs, totalPages };
  }

  async push_getTransactionsBySender(
    senderAddress: string,
    startTime: number,
    direction: string,
    pageSize: number,
    page: number = 1,
    category?: string,
  ): Promise<PaginatedBlocksResponse> {
    const where = this.buildWhereClause(
      startTime,
      direction,
      category,
      undefined,
      senderAddress,
    );
    const { transactions, totalPages } = await this.paginateTransactions(
      where,
      direction,
      pageSize,
      page,
    );

    const blocks = await this.groupTransactionsByBlock(transactions);
    const lastTs = transactions.length
      ? transactions[transactions.length - 1].ts
      : BigInt(0);

    return { blocks, lastTs, totalPages };
  }

  async push_getTransactionByHash(
    transactionHash: string,
  ): Promise<PaginatedBlocksResponse> {
    const tx = await this.prisma.transaction.findUnique({
      where: { txn_hash: transactionHash },
    });

    if (!tx) {
      return { blocks: [], lastTs: BigInt(0), totalPages: 0 };
    }

    const block = await this.prisma.block.findUnique({
      where: { block_hash: tx.block_hash },
    });

    if (!block) {
      return { blocks: [], lastTs: BigInt(0), totalPages: 0 };
    }

    const totalNumberOfTxns = await this.prisma.transaction.count({
      where: { block_hash: tx.block_hash },
    });

    const blockWithTransaction: BlockWithTransactions = {
      blockHash: tx.block_hash,
      blockSize: block.data.length,
      blockData: block.data.toString('hex'),
      blockDataAsJson: block.data_as_json,
      totalNumberOfTxns,
      ts: tx.ts,
      transactions: [
        {
          txnHash: tx.txn_hash,
          ts: tx.ts,
          blockHash: tx.block_hash,
          category: tx.category,
          sender: tx.sender,
          status: tx.status,
          from: tx.from,
          recipients: tx.recipients,
          txnData: tx.data.toString('hex'),
          txnDataAsJson: tx.data_as_json ?? {},
          sig: tx.sig,
        },
      ],
    };

    return {
      blocks: [blockWithTransaction],
      lastTs: tx.ts,
      totalPages: 1,
    };
  }

  async push_getTransactionsByUser(
    userAddress: string,
    startTime: number,
    direction: string,
    pageSize: number,
    page: number = 1,
    category?: string,
  ): Promise<PaginatedBlocksResponse> {
    const where = this.buildWhereClause(
      startTime,
      direction,
      category,
      undefined,
      undefined,
      userAddress,
    );
    const { transactions, totalPages } = await this.paginateTransactions(
      where,
      direction,
      pageSize,
      page,
    );

    const blocks = await this.groupTransactionsByBlock(transactions);
    const lastTs = transactions.length
      ? transactions[transactions.length - 1].ts
      : BigInt(0);

    return { blocks, lastTs, totalPages };
  }

  async getTotalTransactions(): Promise<number> {
    return this.prisma.transaction.count();
  }

  async getDailyTransactions(): Promise<number> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0); // Set time to midnight for today's start

    return this.prisma.transaction.count({
      where: {
        ts: {
          gte: todayStart.getTime(),
        },
      },
    });
  }

  private async groupTransactionsByBlock(
    transactions: Transaction[],
  ): Promise<BlockWithTransactions[]> {
    const blocksMap = new Map<string, BlockWithTransactions>();

    for (const tx of transactions) {
      if (!blocksMap.has(tx.block_hash)) {
        const block = await this.prisma.block.findUnique({
          where: { block_hash: tx.block_hash },
        });

        if (block) {
          const totalNumberOfTxns = await this.prisma.transaction.count({
            where: { block_hash: block.block_hash },
          });
          blocksMap.set(tx.block_hash, {
            blockHash: block.block_hash,
            blockData: block.data.toString('hex'),
            blockDataAsJson: block.data_as_json,
            blockSize: block.data.length,
            ts: block.ts,
            transactions: [],
            totalNumberOfTxns,
          });
        }
      }

      const blockWithTransactions = blocksMap.get(tx.block_hash);
      if (blockWithTransactions) {
        blockWithTransactions.transactions.push({
          txnHash: tx.txn_hash,
          ts: tx.ts,
          blockHash: tx.block_hash,
          category: tx.category,
          sender: tx.sender,
          status: tx.status,
          from: tx.from,
          recipients: tx.recipients,
          txnData: tx.data.toString('hex'),
          txnDataAsJson: tx.data_as_json ?? {},
          sig: tx.sig,
        });
      }
    }

    return Array.from(blocksMap.values());
  }
}
