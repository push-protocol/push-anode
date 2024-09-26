import { Prisma } from '@prisma/client';

export interface TransactionDTO {
  txnHash: string;
  ts: bigint;
  blockHash: string;
  category: string;
  sender: string;
  status: string;
  from: string;
  recipients: Prisma.JsonValue;
  txnData: string;
  txnDataAsJson: Prisma.JsonValue;
  sig: string;
}
