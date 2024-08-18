import { TransactionDTO } from "../../tx/dto/transaction.dto";

export interface BlockWithTransactions {
  block_hash: string;
  ts: number;
  transactions: TransactionDTO[];
}