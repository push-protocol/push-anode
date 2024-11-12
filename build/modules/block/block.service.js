"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlockService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let BlockService = class BlockService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async push_getBlocksByTime(startTime, direction, showDetails, pageSize, page = 1) {
        const orderByDirection = direction === 'ASC' ? 'asc' : 'desc';
        const where = {
            ts: {
                [orderByDirection === 'asc' ? 'gte' : 'lte']: startTime,
            },
        };
        const totalBlocks = await this.prisma.block.count({
            where,
        });
        const totalPages = Math.ceil(totalBlocks / pageSize);
        const skip = (page - 1) * pageSize;
        const blocks = await this.prisma.block.findMany({
            where,
            orderBy: { ts: orderByDirection },
            take: pageSize,
            skip: skip, // Skip based on the page number
        });
        const lastTs = blocks.length ? blocks[blocks.length - 1].ts : BigInt(0);
        const responseBlocks = await Promise.all(blocks.map(async (block) => {
            var _a;
            const totalNumberOfTxns = await this.prisma.transaction.count({
                where: { block_hash: block.block_hash },
            });
            let transactions = [];
            if (showDetails) {
                transactions = await this.prisma.transaction.findMany({
                    where: { block_hash: block.block_hash },
                });
            }
            const blockSize = block.data.length;
            return {
                blockHash: block.block_hash,
                blockData: block.data.toString('hex'),
                blockDataAsJson: (_a = block.data_as_json) !== null && _a !== void 0 ? _a : {},
                blockSize,
                ts: block.ts,
                transactions: transactions.map((tx) => ({
                    txnHash: tx.txn_hash,
                    ts: tx.ts,
                    blockHash: tx.block_hash,
                    category: tx.category,
                    sender: tx.sender,
                    status: tx.status,
                    from: tx.from,
                    recipients: tx.recipients,
                    txnDataAsJson: tx.data_as_json,
                    txnData: tx.data.toString('hex'),
                    sig: tx.sig,
                })),
                totalNumberOfTxns,
            };
        }));
        return {
            blocks: responseBlocks,
            lastTs,
            totalPages,
        };
    }
    async push_getBlockByHash(blockHash, showDetails = true) {
        const block = await this.prisma.block.findUnique({
            where: { block_hash: blockHash },
        });
        if (!block) {
            return { blocks: [], lastTs: BigInt(0), totalPages: 0 };
        }
        const totalNumberOfTxns = await this.prisma.transaction.count({
            where: { block_hash: block.block_hash },
        });
        const responseBlock = {
            blockHash: block.block_hash,
            blockSize: block.data.length,
            blockData: block.data.toString('hex'),
            blockDataAsJson: block.data_as_json,
            ts: block.ts,
            transactions: [],
            totalNumberOfTxns,
        };
        if (showDetails) {
            const transactions = await this.prisma.transaction.findMany({
                where: { block_hash: block.block_hash },
            });
            responseBlock.transactions = transactions.map((tx) => ({
                txnHash: tx.txn_hash,
                ts: tx.ts,
                blockHash: tx.block_hash,
                category: tx.category,
                sender: tx.sender,
                status: tx.status,
                from: tx.from,
                recipients: tx.recipients,
                txnDataAsJson: tx.data_as_json,
                txnData: tx.data.toString('hex'),
                sig: tx.sig,
            }));
        }
        return {
            blocks: [responseBlock],
            lastTs: block.ts,
            totalPages: 1,
        };
    }
    async getTotalBlocks() {
        return this.prisma.block.count();
    }
};
exports.BlockService = BlockService;
exports.BlockService = BlockService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], BlockService);
//# sourceMappingURL=block.service.js.map