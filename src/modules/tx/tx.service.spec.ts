import { Test, TestingModule } from '@nestjs/testing';
import { TxService } from './tx.service';
import { PrismaService } from '../../prisma/prisma.service';

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
          ts: new Date(),
          block_hash: 'blockHash1',
          category: 'category1',
          source: 'source1',
          recipients: { recipient1: 'value1' },
          data: 'data1',
          data_as_json: { key: 'value1' },
          sig: 'sig1',
        },
        {
          ts: new Date(),
          block_hash: 'blockHash1',
          category: 'category1',
          source: 'source2',
          recipients: { recipient2: 'value2' },
          data: 'data2',
          data_as_json: { key: 'value2' },
          sig: 'sig2',
        },
      ];

      jest
        .spyOn(prismaService.transaction, 'findMany')
        .mockResolvedValue(mockTransactions);

      const params = {
        category: 'category1',
        sortKey: '1722512552.001000',
        direction: 'desc' as const, // Explicitly typing the direction
        showDetails: false,
      };

      const result = await service.push_getTransactions(params);

      expect(result.blocks.length).toBe(1);
      expect(result.blocks[0].transactions.length).toBe(2);
      expect(result.lastTs).toBe(mockTransactions[1].ts.getTime().toString());
    });
  });

  describe('push_getTransactionByHash', () => {
    it('should return transaction by hash', async () => {
      const mockTransaction = {
        ts: new Date(),
        block_hash: 'blockHash1',
        category: 'category1',
        source: 'source1',
        recipients: { recipient1: 'value1' },
        data: 'data1',
        data_as_json: { key: 'value1' },
        sig: 'sig1',
      };

      jest
        .spyOn(prismaService.transaction, 'findUnique')
        .mockResolvedValue(mockTransaction);

      const result = await service.push_getTransactionByHash({
        hash: 'sig1',
      });

      expect(result).toEqual(mockTransaction);
    });

    it('should throw an error if transaction not found', async () => {
      jest
        .spyOn(prismaService.transaction, 'findUnique')
        .mockResolvedValue(null);

      await expect(
        service.push_getTransactionByHash({ hash: 'nonExistentHash' }),
      ).rejects.toThrow('Transaction not found');
    });
  });
});
