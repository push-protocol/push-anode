import { Prisma } from '@prisma/client';
import { TransactionDTO } from '../../tx/dto/transaction.dto';

export interface BlockWithTransactions {
  blockHash: string;
  blockSize: number;
  blockData: string;
  blockDataAsJson: Prisma.JsonValue;
  ts: number;
  transactions: TransactionDTO[];
  totalNumberOfTxns: number;
}
