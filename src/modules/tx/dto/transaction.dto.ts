import { Prisma } from '@prisma/client';

export interface TransactionDTO {
  txnHash: string;
  ts: number;
  blockHash: string;
  category: string;
  source: string;
  status: string;
  from: string;
  recipients: Prisma.JsonValue;
  txnData: string;
  txnDataAsJson: Prisma.JsonValue;
  sig: string;
}
