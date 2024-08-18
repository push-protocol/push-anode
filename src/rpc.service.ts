import { Injectable } from "@nestjs/common";
import { RpcHandler } from "@klerick/nestjs-json-rpc";
import { BlockService } from "./modules/block/block.service";
import { PaginatedBlocksResponse } from "./modules/block/dto/paginated.blocks.response.dto";
import { TxService } from "./modules/tx/tx.service";
import { TransactionDTO } from "./modules/tx/dto/transaction.dto";

@RpcHandler()
@Injectable()
export class RpcService {
  constructor(
    private readonly blockService: BlockService,
    private readonly txService: TxService,
  ) {}

  async getBlocks(
    startTime: number,
    direction: string,
    showDetails: boolean
  ): Promise<PaginatedBlocksResponse> {

    // Default values
    const finalDirection = direction || 'DESC';
    const finalShowDetails = showDetails || false;
    return this.blockService.push_getBlocksByTime([
      startTime,
      finalDirection,
      finalShowDetails,
    ]);
  }

  async getBlockByHash( hash: string ) {
    return this.blockService.push_getBlockByHash([hash]);
  }

  async getTxs(params: {
    category?: string;
    sortKey: string;
    direction?: 'asc' | 'desc';
    showDetails?: boolean;
  }): Promise<PaginatedBlocksResponse> {
    return this.txService.push_getTransactions(params);
  }

  async getTxByHash(params: { hash: string }): Promise<TransactionDTO> {
    return this.txService.push_getTransactionByHash(params);
  }
    async getCounts(): Promise<{
    totalBlocks: number;
    totalTransactions: number;
    dailyTransactions: number;
  }> {
    const [totalBlocks, totalTransactions, dailyTransactions] = await Promise.all([
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