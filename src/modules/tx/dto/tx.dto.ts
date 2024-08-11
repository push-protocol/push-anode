import { ApiProperty } from "@nestjs/swagger";
import { Prisma } from "@prisma/client";
import { JsonValue } from "@prisma/client/runtime/library";

export class TxDto {
  @ApiProperty({
    example: "b0249fbb-a03d-4292-9599-042c693958e",
    description: "The hash of the transaction (primary key)",
  })
  hash: string;

  @ApiProperty({
    example: "2608d687-fe55-4fe9-9fa5-1f782dcebb34",
    description: "The hash of the associated block",
  })
  blockHash: string;

  @ApiProperty({
    example: "Email",
    description: "Category of the transaction",
  })
  category: string;

  @ApiProperty({
    example: "{}",
    description: "Data associated with the transaction",
  })
  data: Prisma.JsonValue;

  @ApiProperty({
    example: "2024-08-11T00:00:00Z",
    description: "Timestamp when the transaction was created",
  })
  timestamp: Date;

  constructor(
    hash: string,
    blockHash: string,
    category: string,
    data: JsonValue,
    timestamp: Date
  ) {
    this.hash = hash;
    this.blockHash = blockHash;
    this.category = category;
    this.data = data;
    this.timestamp = timestamp;
  }
}
