import { TransactionDTO } from '../../tx/dto/transaction.dto';

export interface BlockWithTransactions {
  blockHash: string;
  blockSize: number;
  ts: number;
  transactions: TransactionDTO[];
  totalNumberOfTxns: number;
}
