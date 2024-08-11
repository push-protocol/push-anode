import { Injectable } from "@nestjs/common";
import { RpcHandler } from "@klerick/nestjs-json-rpc";
import { BlockService } from "./modules/block/block.service";
import { TxService } from "./modules/tx/tx.service";

@RpcHandler()
@Injectable()
export class RpcService {
  constructor(
    private readonly blockService: BlockService,
    private readonly txService: TxService
  ) {}

  async getBlocks(params: {
    page: number;
    pageSize: number;
    startTime: string;
    endTime: string;
  }) {
    return this.blockService.getBlocksPaginated(params);
  }

  async getBlockByHash(params: { hash: string }) {
    return this.blockService.getBlockByHash(params);
  }

  async getTxs(params: {
    page: number;
    pageSize: number;
    startTime: string;
    endTime: string;
  }) {
    return this.txService.getTxsPaginated(params);
  }

  async getTxByHash(params: { hash: string }) {
    return this.txService.getTxByHash(params);
  }
}
