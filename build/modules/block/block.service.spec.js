"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const block_service_1 = require("./block.service");
const prisma_service_1 = require("../../prisma/prisma.service");
describe('BlockService', () => {
    let service;
    let prismaService;
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            providers: [
                block_service_1.BlockService,
                {
                    provide: prisma_service_1.PrismaService,
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
        service = module.get(block_service_1.BlockService);
        prismaService = module.get(prisma_service_1.PrismaService);
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
                    ts: BigInt(Math.floor(Date.now() / 1000)),
                    data_as_json: {},
                }, // ts as number
            ];
            const mockTransactions = [
                {
                    ts: BigInt(Math.floor(Date.now() / 1000)), // ts as number
                    txn_hash: 'txnHash1',
                    block_hash: 'hash1',
                    category: 'category1',
                    sender: 'sender1',
                    status: 'SUCCESS',
                    from: 'from',
                    recipients: {}, // Correct type for JSON fields
                    data: Buffer.from('data1'),
                    data_as_json: {}, // Correct type for JSON fields
                    sig: 'sig1',
                },
            ];
            jest.spyOn(prismaService.block, 'findMany').mockResolvedValue(mockBlocks);
            jest
                .spyOn(prismaService.transaction, 'findMany')
                .mockResolvedValue(mockTransactions);
            const startTimeEpoch = Math.floor(Date.now() / 1000); // Generate current epoch time as number
            const result = await service.push_getBlocksByTime(startTimeEpoch, 'DESC', true, 10);
            // Ensure that blocks[0] has transactions
            if ('transactions' in result.blocks[0]) {
                expect(result.blocks[0].transactions).toEqual(mockTransactions);
            }
            else {
                throw new Error('Expected transactions to be present');
            }
        });
    });
    describe('push_getBlockByHash', () => {
        it('should return block with transactions by hash', async () => {
            const mockBlock = {
                block_hash: 'hash1',
                data: Buffer.from('data1'),
                data_as_json: {},
                ts: BigInt(Math.floor(Date.now() / 1000)),
            };
            const mockTransactions = [
                {
                    ts: BigInt(Math.floor(Date.now() / 1000)),
                    txn_hash: 'txnHash1',
                    block_hash: 'hash1',
                    category: 'category1',
                    sender: 'source1',
                    status: 'SUCCESS',
                    from: 'from',
                    recipients: {},
                    data: Buffer.from('data1'),
                    data_as_json: {},
                    sig: 'sig1',
                },
            ];
            jest
                .spyOn(prismaService.block, 'findUnique')
                .mockResolvedValue(mockBlock);
            jest
                .spyOn(prismaService.transaction, 'findMany')
                .mockResolvedValue(mockTransactions);
            const result = await service.push_getBlockByHash('hash1');
            expect(result).toEqual(Object.assign(Object.assign({}, mockBlock), { transactions: mockTransactions }));
        });
        it('should throw an error if block not found', async () => {
            jest.spyOn(prismaService.block, 'findUnique').mockResolvedValue(null);
            await expect(service.push_getBlockByHash('nonExistentHash')).rejects.toThrow('Block not found');
        });
    });
});
//# sourceMappingURL=block.service.spec.js.map