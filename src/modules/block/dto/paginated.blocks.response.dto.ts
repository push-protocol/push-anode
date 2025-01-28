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


export interface BlocksResponseInternal {
  blocks: BlockResponseInternal[];
}

export interface PaginatedBlockHashResponseInternal {
  blockHashes: BlockHashResponseInternal[];
  lastTs: bigint;
  totalPages: number;
}