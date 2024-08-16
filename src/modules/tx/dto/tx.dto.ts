import { ApiProperty } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { JsonValue } from '@prisma/client/runtime/library';

export class TxDto {
  @ApiProperty({
    example:
      '0xb903239f8543d04b5dc1ba6579132b143087c68db1b2168786408fcbce568238',
    description: 'The signature hash of the transaction (primary key)',
  })
  sig: string;

  @ApiProperty({
    example: '2608d687-fe55-4fe9-9fa5-1f782dcebb34',
    description: 'The hash of the associated block',
  })
  block_hash: string;

  @ApiProperty({
    example: 'Email',
    description: 'Category of the transaction',
  })
  category: string;

  @ApiProperty({
    example: '2024-08-11T00:00:00Z',
    description: 'Timestamp when the transaction was created',
  })
  ts: Date;

  @ApiProperty({
    example: 'sender_address',
    description: 'Source address of the transaction',
  })
  source: string;

  @ApiProperty({
    example: ['recipient1_address', 'recipient2_address'],
    description: 'Recipients of the transaction',
  })
  recipients: JsonValue; // Assuming recipients are stored as JSON

  @ApiProperty({
    example: '{}',
    description: 'Data associated with the transaction',
  })
  data: string;

  @ApiProperty({
    example: '{}',
    description: 'Additional data as JSON associated with the transaction',
  })
  data_as_json: Prisma.JsonValue;

  constructor(
    sig: string,
    block_hash: string,
    category: string,
    ts: Date,
    source: string,
    recipients: JsonValue,
    data: string,
    data_as_json: Prisma.JsonValue,
  ) {
    this.sig = sig;
    this.block_hash = block_hash;
    this.category = category;
    this.ts = ts;
    this.source = source;
    this.recipients = recipients;
    this.data = data;
    this.data_as_json = data_as_json;
  }
}
