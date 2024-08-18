import { Transaction } from "../../tx/dto/transaction.dto";

export interface BlockWithTransactions {
  block_hash: string;
  ts: string;
  data: Buffer;
  transactions: Transaction[];
}