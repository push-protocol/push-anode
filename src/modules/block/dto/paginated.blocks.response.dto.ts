import { BlockHashResponseInternal, BlockResponseInternal, BlockWithTransactions } from './block.transactions.dto';

export interface PaginatedBlocksResponse {
  blocks: BlockWithTransactions[];
  lastTs: bigint;
  totalPages: number;
}

export interface PaginatedBlockHashesResponse {
  blocks: BlockHashResponseInternal[];
  lastTs: bigint;
  totalPages: number;
}


export interface PaginatedBlocksResponseInternal {
  blocks: BlockResponseInternal[];
}

export interface PaginatedBlockHashResponseInternal {
  blocks: BlockHashResponseInternal[];
  lastTs: bigint;
  totalPages: number;
}