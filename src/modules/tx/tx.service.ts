import { PrismaService } from '../../prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { BlockWithTransactions } from '../block/dto/block.transactions.dto';
import { PaginatedBlocksResponse } from '../block/dto/paginated.blocks.response.dto';
import { Prisma, Transaction } from '@prisma/client';

@Injectable()
export class TxService {
  constructor(private prisma: PrismaService) {}

  async push_getTransactions(
    startTime: number,
    direction: string,
    pageSize: number,
    page: number = 1, // Default page number is 1
    category?: string,
  ): Promise<PaginatedBlocksResponse> {
    const orderByDirection = direction === 'ASC' ? 'asc' : 'desc';
    const skip = (page - 1) * pageSize;

    const where = {
      ...(category && { category }),
      ts: {
        [orderByDirection === 'asc' ? 'gte' : 'lte']: startTime,
      },
    };

    const totalTransactions = await this.prisma.transaction.count({
      where,
    });

    const totalPages = Math.ceil(totalTransactions / pageSize);

    const transactions = await this.prisma.transaction.findMany({
      where,
      orderBy: {
        ts: orderByDirection,
      },
      take: pageSize,
      skip, // Skip records based on the page number
    });

    const blocks = await this.groupTransactionsByBlock(transactions);
    const lastTs = transactions.length
      ? transactions[transactions.length - 1].ts
      : BigInt(0);

    return {
      blocks,
      lastTs,
      totalPages,
    };
  }

  async push_getTransactionsByRecipient(
    recipientAddress: string,
    startTime: number,
    direction: string,
    pageSize: number,
    page: number = 1, // Default page number is 1
  ): Promise<PaginatedBlocksResponse> {
    const orderByDirection = direction === 'asc' ? 'ASC' : 'DESC';
    const comparisonOperator = orderByDirection === 'ASC' ? '>=' : '<=';
    const skip = (page - 1) * pageSize;

    const countQuery = Prisma.sql`
  SELECT COUNT(*) FROM "Transaction"
  WHERE ts ${Prisma.raw(comparisonOperator)} ${Prisma.raw(startTime.toString())}
  AND jsonb_path_exists(
    recipients,
    ${Prisma.raw(`'$.recipients[*] ? (@.address == "${recipientAddress}")'`)}
  )
`;

    // Execute the total count query
    const totalTransactionsResult =
      await this.prisma.$queryRaw<{ count: bigint }[]>(countQuery);

    const totalTransactions =
      totalTransactionsResult.length > 0
        ? Number(totalTransactionsResult[0].count)
        : 0;

    const totalPages = Math.ceil(totalTransactions / pageSize);

    const fetchQuery = Prisma.sql`
  SELECT * FROM "Transaction"
  WHERE ts ${Prisma.raw(comparisonOperator)} ${Prisma.raw(startTime.toString())}
  AND jsonb_path_exists(
    recipients,
    ${Prisma.raw(`'$.recipients[*] ? (@.address == "${recipientAddress}")'`)}
  )
  ORDER BY ts ${Prisma.raw(orderByDirection)}
  LIMIT ${Prisma.raw(pageSize.toString())}
  OFFSET ${Prisma.raw(skip.toString())} -- Skip based on the page number
`;

    const transactions = await this.prisma.$queryRaw<Transaction[]>(fetchQuery);

    const blocks = await this.groupTransactionsByBlock(transactions);
    const lastTs = transactions.length
      ? transactions[transactions.length - 1].ts
      : BigInt(0);

    return {
      blocks,
      lastTs,
      totalPages,
    };
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
  ): Promise<PaginatedBlocksResponse> {
    const orderByDirection = direction === 'asc' ? 'ASC' : 'DESC';
    const comparisonOperator = orderByDirection === 'ASC' ? '>=' : '<=';
    const skip = (page - 1) * pageSize;

    // Corrected count query to directly inject the userAddress
    const countQuery = Prisma.sql`
    SELECT COUNT(*) FROM "Transaction"
    WHERE ts ${Prisma.raw(comparisonOperator)} ${startTime}
    AND (
      "sender" = ${userAddress} OR
      jsonb_path_exists(
        recipients,
        '$.recipients[*] ? (@.address == "${userAddress}")'
      )
    )
  `;

    // Execute the total count query
    const totalTransactionsResult =
      await this.prisma.$queryRaw<{ count: BigInt }[]>(countQuery);

    const totalTransactions =
      totalTransactionsResult.length > 0
        ? Number(totalTransactionsResult[0].count)
        : 0;

    const totalPages = Math.ceil(totalTransactions / pageSize);

    // Corrected fetch query to directly inject the userAddress
    const fetchQuery = Prisma.sql`
    SELECT * FROM "Transaction"
    WHERE ts ${Prisma.raw(comparisonOperator)} ${startTime}
    AND (
      "sender" = ${userAddress} OR
      jsonb_path_exists(
        recipients,
        '$.recipients[*] ? (@.address == "${userAddress}")'
      )
    )
    ORDER BY ts ${Prisma.raw(orderByDirection)}
    LIMIT ${pageSize}
    OFFSET ${skip}
  `;

    const transactions = await this.prisma.$queryRaw<Transaction[]>(fetchQuery);

    const blocks = await this.groupTransactionsByBlock(transactions);
    const lastTs = transactions.length
      ? transactions[transactions.length - 1].ts
      : BigInt(0);

    return {
      blocks,
      lastTs,
      totalPages,
    };
  }

  async getTotalTransactions(): Promise<number> {
    return this.prisma.transaction.count();
  }

  async getDailyTransactions(): Promise<number> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    return this.prisma.transaction.count({
      where: {
        ts: {
          gte: Math.floor(todayStart.getTime() / 1000),
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

  async push_Health(): Promise<void> {}
}
