import { Prisma } from '@prisma/client';

export interface TransactionDTO {
  txn_hash: string;
  ts: number;
  block_hash: string;
  category: string;
  source: string;
  recipients?: Prisma.JsonValue;
  data_as_json?: Prisma.JsonValue;
  sig: string;
}
