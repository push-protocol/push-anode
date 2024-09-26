import { BlockWithTransactions } from './block.transactions.dto';

export interface PaginatedBlocksResponse {
  blocks: BlockWithTransactions[];
  lastTs: bigint;
  totalPages: number;
}
