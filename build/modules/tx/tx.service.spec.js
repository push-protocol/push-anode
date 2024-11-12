"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const tx_service_1 = require("./tx.service");
const prisma_service_1 = require("../../prisma/prisma.service");
describe('TxService', () => {
    let service;
    let prismaService;
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            providers: [
                tx_service_1.TxService,
                {
                    provide: prisma_service_1.PrismaService,
                    useValue: {
                        transaction: {
                            findMany: jest.fn(),
                            findUnique: jest.fn(),
                        },
                    },
                },
            ],
        }).compile();
        service = module.get(tx_service_1.TxService);
        prismaService = module.get(prisma_service_1.PrismaService);
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
                    recipients: { recipient1: 'value1' }, // Correct type for JSON fields
                    data_as_json: { key: 'value1' }, // Correct type for JSON fields
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
                    recipients: { recipient2: 'value2' },
                    data_as_json: { key: 'value2' },
                    sig: 'sig2',
                    data: Buffer.from('data1'),
                },
            ];
            jest
                .spyOn(prismaService.transaction, 'findMany')
                .mockResolvedValue(mockTransactions);
            const result = await service.push_getTransactions(1722512552.001, 'desc', 10, 1, 'category1');
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
                recipients: { recipient1: 'value1' },
                data: Buffer.from('data1'),
                data_as_json: { key: 'value1' },
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
            await expect(service.push_getTransactionByHash('nonExistentHash')).rejects.toThrow('Transaction not found');
        });
    });
});
//# sourceMappingURL=tx.service.spec.js.map