import { Injectable } from '@nestjs/common';
import { RpcHandler } from '@klerick/nestjs-json-rpc';
import { BlockService } from './modules/block/block.service';
import { PaginatedBlocksResponse } from './modules/block/dto/paginated.blocks.response.dto';
import { TxService } from './modules/tx/tx.service';
import { TransactionDTO } from './modules/tx/dto/transaction.dto';

@RpcHandler()
@Injectable()
export class RpcService {
  constructor(
    private readonly blockService: BlockService,
    private readonly txService: TxService,
  ) {}

  async getBlocks(
    startTime?: number,
    direction?: string,
    showDetails?: boolean,
    pageSize?: number,
  ): Promise<PaginatedBlocksResponse> {
    const finalStartTime = startTime ?? 0;
    const finalDirection = direction ?? 'DESC';
    const finalShowDetails = showDetails ?? false;
    const finalPageSize = pageSize ?? 10;

    return this.blockService.push_getBlocksByTime(
      finalStartTime,
      finalDirection,
      finalShowDetails,
      finalPageSize,
    );
  }

  async getBlockByHash(hash: string) {
    return this.blockService.push_getBlockByHash([hash]);
  }

  async getTxs(
    startTime?: number,
    direction?: string,
    pageSize?: number,
    category?: string,
  ): Promise<PaginatedBlocksResponse> {
    const finalStartTime = startTime ?? 0;
    const finalDirection = direction ?? 'DESC';
    const finalPageSize = pageSize ?? 10;

    return this.txService.push_getTransactions(
      finalStartTime,
      finalDirection,
      finalPageSize,
      category,
    );
  }

  async getTxsByRecipient(
    recipientAddress: string,
    startTime?: number,
    direction?: string,
    pageSize?: number,
  ): Promise<PaginatedBlocksResponse> {
    const finalStartTime = startTime ?? 0;
    const finalDirection = direction ?? 'DESC';
    const finalPageSize = pageSize ?? 10;

    return this.txService.push_getTransactionsByRecipient(
      recipientAddress,
      finalStartTime,
      finalDirection,
      finalPageSize,
    );
  }

  async getTxByHash(params: { hash: string }): Promise<TransactionDTO> {
    return this.txService.push_getTransactionByHash(params);
  }
  async getCounts(): Promise<{
    totalBlocks: number;
    totalTransactions: number;
    dailyTransactions: number;
  }> {
    const [totalBlocks, totalTransactions, dailyTransactions] =
      await Promise.all([
        this.blockService.getTotalBlocks(),
        this.txService.getTotalTransactions(),
        this.txService.getDailyTransactions(),
      ]);

    return {
      totalBlocks,
      totalTransactions,
      dailyTransactions,
    };
  }
}
