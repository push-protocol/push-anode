import { Block } from "./block.dto";
import { BlockWithTransactions } from "./block.transactions.dto";

export interface PaginatedBlocksResponse {
  blocks: (Block | BlockWithTransactions)[];
  lastTs: string;
}
