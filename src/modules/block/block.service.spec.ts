import { Test, TestingModule } from '@nestjs/testing';
import { BlockService } from './block.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client'; // Import Prisma for JsonValue type

describe('BlockService', () => {
  let service: BlockService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlockService,
        {
          provide: PrismaService,
          useValue: {
            block: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
            },
            transaction: {
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<BlockService>(BlockService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('push_getBlocksByTime', () => {
    it('should return paginated blocks with transactions when showDetails is true', async () => {
      const mockBlocks = [
        {
          block_hash: 'hash1',
          data: Buffer.from('data1'),
          ts: Math.floor(Date.now() / 1000),
        }, // ts as number
      ];
      const mockTransactions = [
        {
          ts: Math.floor(Date.now() / 1000), // ts as number
          txn_hash: 'txnHash1',
          block_hash: 'hash1',
          category: 'category1',
          source: 'source1',
          recipients: {} as Prisma.JsonValue, // Correct type for JSON fields
          data: Buffer.from('data1'),
          data_as_json: {} as Prisma.JsonValue, // Correct type for JSON fields
          sig: 'sig1',
        },
      ];

      jest.spyOn(prismaService.block, 'findMany').mockResolvedValue(mockBlocks);
      jest
        .spyOn(prismaService.transaction, 'findMany')
        .mockResolvedValue(mockTransactions);

      const startTimeEpoch = Math.floor(Date.now() / 1000); // Generate current epoch time as number
    

      const result = await service.push_getBlocksByTime(
        startTimeEpoch,
        'DESC',
        true,
        10
      );

      // Ensure that blocks[0] has transactions
      if ('transactions' in result.blocks[0]) {
        expect(result.blocks[0].transactions).toEqual(mockTransactions);
      } else {
        throw new Error('Expected transactions to be present');
      }
    });
  });

  describe('push_getBlockByHash', () => {
    it('should return block with transactions by hash', async () => {
      const mockBlock = {
        block_hash: 'hash1',
        data: Buffer.from('data1'),
        ts: Math.floor(Date.now() / 1000), // ts as number
      };
      const mockTransactions = [
        {
          ts: Math.floor(Date.now() / 1000), // ts as number
          txn_hash: 'txnHash1',
          block_hash: 'hash1',
          category: 'category1',
          source: 'source1',
          recipients: {} as Prisma.JsonValue, // Correct type for JSON fields
          data: Buffer.from('data1'),
          data_as_json: {} as Prisma.JsonValue, // Correct type for JSON fields
          sig: 'sig1',
        },
      ];

      jest
        .spyOn(prismaService.block, 'findUnique')
        .mockResolvedValue(mockBlock);
      jest
        .spyOn(prismaService.transaction, 'findMany')
        .mockResolvedValue(mockTransactions);

      const params: [string] = ['hash1'];
      const result = await service.push_getBlockByHash(params);

      expect(result).toEqual({
        ...mockBlock,
        transactions: mockTransactions,
      });
    });

    it('should throw an error if block not found', async () => {
      jest.spyOn(prismaService.block, 'findUnique').mockResolvedValue(null);

      const params: [string] = ['nonExistentHash'];

      await expect(service.push_getBlockByHash(params)).rejects.toThrow(
        'Block not found',
      );
    });
  });
});
