import { Injectable } from '@nestjs/common';
import { RpcHandler } from '@klerick/nestjs-json-rpc';
import { BlockService } from './modules/block/block.service';
import { PaginatedBlocksResponse } from './modules/block/dto/paginated.blocks.response.dto';
import { TxService } from './modules/tx/tx.service';
import { QItem } from './messaging/types/queue-types';

@RpcHandler()
@Injectable()
export class RpcService {
  constructor(
    private readonly blockService: BlockService,
    private readonly txService: TxService,
  ) {}

  bigIntReplacer(key: string, value: bigint | string) {
    // If the value is a BigInt, convert it to a string
    if (typeof value === 'bigint') {
      return value.toString();
    }
    // Otherwise, return the value as-is
    return value;
  }

  async getBlocks(
    startTime?: number,
    direction?: string,
    showDetails?: boolean,
    pageSize?: number,
    page?: number, // Add page parameter here
  ): Promise<PaginatedBlocksResponse> {
    const finalStartTime = startTime ?? 0;
    const finalDirection = direction ?? 'DESC';
    const finalShowDetails = showDetails ?? false;
    const finalPageSize = pageSize ?? 10;
    const finalPage = page ?? 1; // Default to page 1 if not provided

    const result = await this.blockService.push_getBlocksByTime(
      finalStartTime,
      finalDirection,
      finalShowDetails,
      finalPageSize,
      finalPage, // Pass the page parameter
    );

    return JSON.parse(JSON.stringify(result, this.bigIntReplacer));
  }

  async getBlockByHash(
    blockHash: string,
    showDetails = true,
  ): Promise<PaginatedBlocksResponse> {
    const result = await this.blockService.push_getBlockByHash(
      blockHash,
      showDetails,
    );
    return JSON.parse(JSON.stringify(result, this.bigIntReplacer));
  }

  async getTxs(
    startTime?: number,
    direction?: string,
    pageSize?: number,
    page?: number, // Add page parameter here
    category?: string,
  ): Promise<PaginatedBlocksResponse> {
    const finalStartTime = startTime ?? 0;
    const finalDirection = direction ?? 'DESC';
    const finalPageSize = pageSize ?? 10;
    const finalPage = page ?? 1; // Default to page 1 if not provided

    const result = await this.txService.push_getTransactions(
      finalStartTime,
      finalDirection,
      finalPageSize,
      finalPage,
      category,
    );
    return JSON.parse(JSON.stringify(result, this.bigIntReplacer));
  }

  async getTxsByRecipient(
    recipientAddress: string,
    startTime?: number,
    direction?: string,
    pageSize?: number,
    page?: number, // Add page parameter here
    category?: string,
  ): Promise<PaginatedBlocksResponse> {
    const finalStartTime = startTime ?? 0;
    const finalDirection = direction ?? 'DESC';
    const finalPageSize = pageSize ?? 10;
    const finalPage = page ?? 1; // Default to page 1 if not provided

    const result = await this.txService.push_getTransactionsByRecipient(
      recipientAddress,
      finalStartTime,
      finalDirection,
      finalPageSize,
      finalPage, // Pass the page parameter
      category,
    );
    return JSON.parse(JSON.stringify(result, this.bigIntReplacer));
  }

  async getTxsBySender(
    senderAddress: string,
    startTime?: number,
    direction?: string,
    pageSize?: number,
    page?: number, // Add page parameter here
    category?: string,
  ): Promise<PaginatedBlocksResponse> {
    const finalStartTime = startTime ?? 0;
    const finalDirection = direction ?? 'DESC';
    const finalPageSize = pageSize ?? 10;
    const finalPage = page ?? 1; // Default to page 1 if not provided

    const result = await this.txService.push_getTransactionsBySender(
      senderAddress,
      finalStartTime,
      finalDirection,
      finalPageSize,
      finalPage, // Pass the page parameter
      category,
    );
    return JSON.parse(JSON.stringify(result, this.bigIntReplacer));
  }

  async getTxByHash(transactionHash: string): Promise<PaginatedBlocksResponse> {
    const result =
      await this.txService.push_getTransactionByHash(transactionHash);
    return JSON.parse(JSON.stringify(result, this.bigIntReplacer));
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

  async searchByAddress(
    searchTerm: string,
    startTime?: number,
    direction?: string,
    pageSize?: number,
    showDetails?: boolean,
    page?: number, // Add page parameter here
  ): Promise<PaginatedBlocksResponse> {
    const finalStartTime = startTime ?? 0;
    const finalDirection = direction ?? 'DESC';
    const finalShowDetails = showDetails ?? false;
    const finalPageSize = pageSize ?? 10;
    const finalPage = page ?? 1; // Default to page 1 if not provided

    const blockSearch = this.blockService.push_getBlockByHash(
      searchTerm,
      finalShowDetails,
    );
    const txSearch = this.txService.push_getTransactionByHash(searchTerm);
    const recipientSearch = this.txService.push_getTransactionsByRecipient(
      searchTerm,
      finalStartTime,
      finalDirection,
      finalPageSize,
      finalPage, // Pass the page parameter
    );

    try {
      const [blockResult, txResult, recipientResult] = await Promise.allSettled(
        [blockSearch, txSearch, recipientSearch],
      );

      console.log(blockResult);
      console.log(txResult);
      console.log(recipientResult);

      if (
        blockResult.status === 'fulfilled' &&
        blockResult.value.blocks.length > 0
      ) {
        return JSON.parse(
          JSON.stringify(blockResult.value, this.bigIntReplacer),
        );
      }

      if (txResult.status === 'fulfilled' && txResult.value.blocks.length > 0) {
        return JSON.parse(JSON.stringify(txResult.value, this.bigIntReplacer));
      }

      if (
        recipientResult.status === 'fulfilled' &&
        recipientResult.value.blocks.length > 0
      ) {
        return JSON.parse(
          JSON.stringify(recipientResult.value, this.bigIntReplacer),
        );
      }

      return JSON.parse(
        JSON.stringify(
          {
            blocks: [],
            lastTs: BigInt(0),
            totalPages: 0,
          },
          this.bigIntReplacer,
        ),
      );
    } catch (error) {
      console.error('Error during search:', error);
      return JSON.parse(
        JSON.stringify(
          {
            blocks: [],
            lastTs: BigInt(0),
            totalPages: 0,
          },
          this.bigIntReplacer,
        ),
      );
    }
  }

  async getTransactionsByUser(
    userAddress: string,
    startTime?: number,
    direction?: string,
    pageSize?: number,
    page?: number,
    category?: string,
  ): Promise<PaginatedBlocksResponse> {
    const finalStartTime = startTime ?? 0;
    const finalDirection = direction ?? 'DESC';
    const finalPageSize = pageSize ?? 10;
    const finalPage = page ?? 1;

    const result = await this.txService.push_getTransactionsByUser(
      userAddress,
      finalStartTime,
      finalDirection,
      finalPageSize,
      finalPage,
      category,
    );
    return JSON.parse(JSON.stringify(result, this.bigIntReplacer));
  }

  async health(): Promise<{ success: string }> {
    return { success: 'ok' };
  }

  async putBlockHash(hashes: string | string[], signature: string) {
    //TODO: for now, passing an array directly doesnt work, so for implemntation sake, i am passing comma separated hashes
    // will need to find a way to support array first
    if (typeof hashes == 'string') {
      hashes = JSON.parse(hashes);
    }
    const result = await this.blockService.push_putBlockHash(
      hashes as string[],
      signature,
    );
    return JSON.parse(JSON.stringify(result, this.bigIntReplacer));
  }

  async putBlock(blocks: QItem[], signature: string) {
    //TODO: for now, passing an array directly doesnt work, so for implemntation sake, i am passing comma separated hashes
    // will need to find a way to support array first
    const result = await this.blockService.push_putBlock(blocks, signature);
    console.log('Result:', result);
    return JSON.parse(JSON.stringify(result, this.bigIntReplacer));
  }
}
