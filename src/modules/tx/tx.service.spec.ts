import { Test, TestingModule } from '@nestjs/testing';
import { TxService } from './tx.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client'; // Import Prisma for JsonValue type

describe('TxService', () => {
  let service: TxService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TxService,
        {
          provide: PrismaService,
          useValue: {
            transaction: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<TxService>(TxService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('push_getTransactions', () => {
    it('should return transactions grouped by block', async () => {
      const mockTransactions = [
        {
          ts: BigInt(Math.floor(Date.now() / 1000)), // ts as number (Unix timestamp)
          txn_hash: 'txnHash1',
          block_hash: 'blockHash1',
          category: 'category1',
          sender: 'source1',
          status: 'SUCCESS',
          from: 'from',
          recipients: { recipient1: 'value1' } as Prisma.JsonValue, // Correct type for JSON fields
          data_as_json: { key: 'value1' } as Prisma.JsonValue, // Correct type for JSON fields
          sig: 'sig1',
          data: Buffer.from('data1'),
        },
        {
          ts: BigInt(Math.floor(Date.now() / 1000)),
          txn_hash: 'txnHash2',
          block_hash: 'blockHash1',
          category: 'category1',
          sender: 'source2',
          status: 'SUCCESS',
          from: 'from',
          recipients: { recipient2: 'value2' } as Prisma.JsonValue,
          data_as_json: { key: 'value2' } as Prisma.JsonValue,
          sig: 'sig2',
          data: Buffer.from('data1'),
        },
      ];

      jest
        .spyOn(prismaService.transaction, 'findMany')
        .mockResolvedValue(mockTransactions);

      const result = await service.push_getTransactions(
        1722512552.001,
        'desc',
        10,
        1,
        'category1',
      );

      expect(result.blocks.length).toBe(1);
      expect(result.blocks[0].transactions.length).toBe(2);
      expect(result.lastTs).toBe(mockTransactions[1].ts.toString());
    });
  });

  describe('push_getTransactionByHash', () => {
    it('should return transaction by hash', async () => {
      const mockTransaction = {
        ts: BigInt(Math.floor(Date.now() / 1000)),
        txn_hash: 'txnHash2',
        block_hash: 'blockHash1',
        category: 'category1',
        sender: 'source1',
        status: 'SUCCESS',
        from: 'from',
        recipients: { recipient1: 'value1' } as Prisma.JsonValue,
        data: Buffer.from('data1'),
        data_as_json: { key: 'value1' } as Prisma.JsonValue,
        sig: 'sig1',
      };

      jest
        .spyOn(prismaService.transaction, 'findUnique')
        .mockResolvedValue(mockTransaction);

      const result = await service.push_getTransactionByHash('sig1');

      expect(result).toEqual(mockTransaction);
    });

    it('should throw an error if transaction not found', async () => {
      jest
        .spyOn(prismaService.transaction, 'findUnique')
        .mockResolvedValue(null);

      await expect(
        service.push_getTransactionByHash('nonExistentHash'),
      ).rejects.toThrow('Transaction not found');
    });
  });
});
