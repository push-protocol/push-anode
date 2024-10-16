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

  /**
   * Tx where recipientAddress is in recipients array
   * @returns
   */
  async push_getTransactionsByRecipient(
    recipientAddress: string,
    startTime: number,
    direction: string,
    pageSize: number,
    page: number = 1, // Default page number is 1
  ): Promise<PaginatedBlocksResponse> {
    const finalPage = page < 1 ? 1 : page; // Ensure the page is at least 1
    const orderByDirection = direction === 'asc' ? 'ASC' : 'DESC';
    const comparisonOperator = orderByDirection === 'ASC' ? '>=' : '<=';
    const skip = (finalPage - 1) * pageSize;

    // Construct the count query as a raw string to search within recipients or sender
    const countQueryStr = `
    SELECT COUNT(*) FROM "Transaction"
    WHERE ts ${comparisonOperator} ${startTime}
    AND jsonb_path_exists(
        recipients,
        '$.recipients[*] ? (@.address == "${recipientAddress}")'
    )`;

    console.log('Count Query:', countQueryStr); // Log the count query

    // Execute the total count query
    const totalTransactionsResult = await this.prisma.$queryRaw<
      { count: bigint }[]
    >(Prisma.sql([countQueryStr]));

    const totalTransactions =
      totalTransactionsResult.length > 0
        ? Number(totalTransactionsResult[0].count)
        : 0;
    const totalPages = Math.ceil(totalTransactions / pageSize);

    // Construct the fetch query as a raw string to search within recipients or sender
    const fetchQueryStr = `
    SELECT * FROM "Transaction"
    WHERE ts ${comparisonOperator} ${startTime}
    AND jsonb_path_exists(
        recipients,
        '$.recipients[*] ? (@.address == "${recipientAddress}")'
    )
    ORDER BY ts ${orderByDirection}
    LIMIT ${pageSize}
    OFFSET ${skip} -- Skip based on the page number
  `;

    console.log('Fetch Query:', fetchQueryStr); // Log the fetch query

    // Execute the fetch query
    const transactions = await this.prisma.$queryRaw<Transaction[]>(
      Prisma.sql([fetchQueryStr]),
    );

    const blocks = await this.groupTransactionsByBlock(transactions);

    console.log('Transactions:', transactions);
    console.log('Blocks:', blocks);

    const lastTs = transactions.length
      ? transactions[transactions.length - 1].ts
      : BigInt(0);

    return {
      blocks,
      lastTs,
      totalPages,
    };
  }

  /**
   * Tx where senderAddress is the sender of Tx
   * @returns
   */
  async push_getTransactionsBySender(
    senderAddress: string,
    startTime: number,
    direction: string,
    pageSize: number,
    page: number = 1, // Default page number is 1
  ): Promise<PaginatedBlocksResponse> {
    const finalPage = page < 1 ? 1 : page; // Ensure the page is at least 1
    const orderByDirection = direction === 'asc' ? 'ASC' : 'DESC';
    const comparisonOperator = orderByDirection === 'ASC' ? '>=' : '<=';
    const skip = (finalPage - 1) * pageSize;

    // Construct the count query as a raw string to search within sender
    const countQueryStr = `
      SELECT COUNT(*) FROM "Transaction"
      WHERE ts ${comparisonOperator} ${startTime}
      AND sender = '${senderAddress}'
    `;

    console.log('Count Query:', countQueryStr); // Log the count query

    // Execute the total count query
    const totalTransactionsResult = await this.prisma.$queryRaw<
      { count: bigint }[]
    >(Prisma.sql([countQueryStr]));

    const totalTransactions =
      totalTransactionsResult.length > 0
        ? Number(totalTransactionsResult[0].count)
        : 0;
    const totalPages = Math.ceil(totalTransactions / pageSize);

    // Construct the fetch query as a raw string to search within sender
    const fetchQueryStr = `
      SELECT * FROM "Transaction"
      WHERE ts ${comparisonOperator} ${startTime}
      AND sender = '${senderAddress}'
      ORDER BY ts ${orderByDirection}
      LIMIT ${pageSize}
      OFFSET ${skip} -- Skip based on the page number
    `;

    console.log('Fetch Query:', fetchQueryStr); // Log the fetch query

    // Execute the fetch query
    const transactions = await this.prisma.$queryRaw<Transaction[]>(
      Prisma.sql([fetchQueryStr]),
    );

    const blocks = await this.groupTransactionsByBlock(transactions);

    console.log('Transactions:', transactions);
    console.log('Blocks:', blocks);

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

  /**
   * Tx where sender is userAddress or recipientAddress is in recipients array
   * @returns
   */
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
      await this.prisma.$queryRaw<{ count: bigint }[]>(countQuery);

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

  async push_Health(): Promise<void> {}
}
