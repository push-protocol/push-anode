import { ApiProperty } from "@nestjs/swagger";
import { Prisma } from "@prisma/client";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

export class BlockDto {
  @ApiProperty({
    example: "2608d687-fe55-4fe9-9fa5-1f782dcebb34",
    description: "The hash of the block (primary key)",
  })
  hash: string;

  @ApiProperty({
    example: "{}",
    description: "Metadata associated with the block",
  })
  metaData: Prisma.JsonValue;

  @ApiProperty({
    example: "2024-08-11T00:00:00Z",
    description: "Timestamp when the block was created",
  })
  timestamp: Date;

  constructor(hash: string, metaData: JsonValue, timestamp: Date) {
    this.hash = hash;
    this.metaData = metaData;
    this.timestamp = timestamp;
  }
}
