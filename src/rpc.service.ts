import { Injectable } from "@nestjs/common";
import { RpcHandler } from "@klerick/nestjs-json-rpc";
import { BlockService } from "./modules/block/block.service";
import { PaginatedBlocksResponse } from "./modules/block/dto/paginated.blocks.response.dto";
import { TxService } from "./modules/tx/tx.service";
import { Transaction } from "./modules/tx/dto/transaction.dto";

@RpcHandler()
@Injectable()
export class RpcService {
  constructor(
    private readonly blockService: BlockService,
    private readonly txService: TxService,
  ) {}

  async getBlocks(params: {
    startTime: string;
    direction: string;
    showDetails: boolean;
  }): Promise<PaginatedBlocksResponse> {
    const { startTime, direction, showDetails } = params;

    // Default values
    const finalDirection = direction || 'DESC';
    const finalShowDetails = showDetails || false;
     const startTimeEpoch = Math.floor(new Date(startTime).getTime() / 1000);
    return this.blockService.push_getBlocksByTime([
      startTimeEpoch,
      finalDirection,
      finalShowDetails,
    ]);
  }

  async getBlockByHash(params: { hash: string }) {
    return this.blockService.push_getBlockByHash([params.hash]);
  }

  async getTxs(params: {
    category?: string;
    sortKey: string;
    direction?: 'asc' | 'desc';
    showDetails?: boolean;
  }): Promise<PaginatedBlocksResponse> {
    return this.txService.push_getTransactions(params);
  }

  async getTxByHash(params: { hash: string }): Promise<Transaction> {
    return this.txService.push_getTransactionByHash(params);
  }
}