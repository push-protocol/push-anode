import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BlockWithTransactions } from './dto/block.transactions.dto';
import { PaginatedBlocksResponse } from './dto/paginated.blocks.response.dto';
import { TransactionDTO } from '../tx/dto/transaction.dto';
import { Block } from '@prisma/client';

@Injectable()
export class BlockService {
  constructor(private prisma: PrismaService) {}

  async push_getBlocksByTime(
    startTime: number,
    direction: string,
    showDetails: boolean,
    pageSize: number,
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

    const blocks = await this.prisma.block.findMany({
      where,
      orderBy: { ts: orderByDirection },
      take: pageSize,
    });

    const lastTs = blocks.length ? blocks[blocks.length - 1].ts : 0;

    const responseBlocks: BlockWithTransactions[] = await Promise.all(
      blocks.map(async (block: Block): Promise<BlockWithTransactions> => {
        const totalNumberOfTxns = await this.prisma.transaction.count({
          where: { block_hash: block.block_hash },
        });

        let transactions: TransactionDTO[] = [];

        if (showDetails) {
          transactions = await this.prisma.transaction.findMany({
            where: { block_hash: block.block_hash },
          });
        }
        
        const blockSize = block.data.length; 

        return {
          blockHash: block.block_hash,
          blockSize,
          ts: block.ts,
          transactions: transactions,
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

    let responseBlock: BlockWithTransactions = {
      blockHash: block.block_hash,
      blockSize: block.data.length,
      ts: block.ts,
      transactions: [],
      totalNumberOfTxns,
    };

    if (showDetails) {
      const transactions = await this.prisma.transaction.findMany({
        where: { block_hash: block.block_hash },
      });

      responseBlock.transactions = transactions.map((tx: TransactionDTO) => ({
        txn_hash: tx.txn_hash,
        ts: tx.ts,
        block_hash: tx.block_hash,
        category: tx.category,
        source: tx.source,
        recipients: tx.recipients,
        data_as_json: tx.data_as_json,
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
