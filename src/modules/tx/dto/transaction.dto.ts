import { Prisma } from "@prisma/client";

export interface TransactionDTO {
  ts: number;
  block_hash: string;
  category: string;
  source: string;
  recipients?:  Prisma.JsonValue;
  data: string;
  data_as_json?:  Prisma.JsonValue;
  sig: string;
}