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
exports.TxService = void 0;
const prisma_service_1 = require("../../prisma/prisma.service");
const common_1 = require("@nestjs/common");
let TxService = class TxService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    buildWhereClause(startTime, direction, category, recipientAddress, senderAddress, userAddress) {
        const comparisonOperator = direction === 'ASC' ? 'gte' : 'lte';
        let where = {
            ts: {
                [comparisonOperator]: startTime,
            },
        };
        if (category) {
            where = Object.assign(Object.assign({}, where), { category });
        }
        if (recipientAddress) {
            where = Object.assign(Object.assign({}, where), { recipients: {
                    path: ['recipients'],
                    array_contains: [{ address: recipientAddress }],
                } });
        }
        if (senderAddress) {
            where = Object.assign(Object.assign({}, where), { sender: senderAddress });
        }
        if (userAddress) {
            where = Object.assign(Object.assign({}, where), { OR: [
                    { sender: userAddress },
                    {
                        recipients: {
                            path: ['recipients'],
                            array_contains: [{ address: userAddress }],
                        },
                    },
                ] });
        }
        return where;
    }
    async paginateTransactions(where, direction, pageSize, page) {
        const orderByDirection = direction === 'ASC' ? 'asc' : 'desc';
        const skip = (page - 1) * pageSize;
        const totalTransactions = await this.prisma.transaction.count({ where });
        const totalPages = Math.ceil(totalTransactions / pageSize);
        const transactions = await this.prisma.transaction.findMany({
            where,
            orderBy: { ts: orderByDirection },
            take: pageSize,
            skip,
        });
        return { transactions, totalTransactions, totalPages };
    }
    async push_getTransactions(startTime, direction, pageSize, page = 1, category) {
        const where = this.buildWhereClause(startTime, direction, category);
        const { transactions, totalPages } = await this.paginateTransactions(where, direction, pageSize, page);
        const blocks = await this.groupTransactionsByBlock(transactions);
        const lastTs = transactions.length
            ? transactions[transactions.length - 1].ts
            : BigInt(0);
        return { blocks, lastTs, totalPages };
    }
    async push_getTransactionsByRecipient(recipientAddress, startTime, direction, pageSize, page = 1, category) {
        const where = this.buildWhereClause(startTime, direction, category, recipientAddress);
        const { transactions, totalPages } = await this.paginateTransactions(where, direction, pageSize, page);
        const blocks = await this.groupTransactionsByBlock(transactions);
        const lastTs = transactions.length
            ? transactions[transactions.length - 1].ts
            : BigInt(0);
        return { blocks, lastTs, totalPages };
    }
    async push_getTransactionsBySender(senderAddress, startTime, direction, pageSize, page = 1, category) {
        const where = this.buildWhereClause(startTime, direction, category, undefined, senderAddress);
        const { transactions, totalPages } = await this.paginateTransactions(where, direction, pageSize, page);
        const blocks = await this.groupTransactionsByBlock(transactions);
        const lastTs = transactions.length
            ? transactions[transactions.length - 1].ts
            : BigInt(0);
        return { blocks, lastTs, totalPages };
    }
    async push_getTransactionByHash(transactionHash) {
        var _a;
        const tx = await this.prisma.transaction.findUnique({
            where: { txn_hash: transactionHash },
        });
        if (!tx) {
            return { blocks: [], lastTs: BigInt(0), totalPages: 0 };
        }
        const block = await this.prisma.block.findUnique({
            where: { block_hash: tx.block_hash },
        });
        if (!block) {
            return { blocks: [], lastTs: BigInt(0), totalPages: 0 };
        }
        const totalNumberOfTxns = await this.prisma.transaction.count({
            where: { block_hash: tx.block_hash },
        });
        const blockWithTransaction = {
            blockHash: tx.block_hash,
            blockSize: block.data.length,
            blockData: block.data.toString('hex'),
            blockDataAsJson: block.data_as_json,
            totalNumberOfTxns,
            ts: tx.ts,
            transactions: [
                {
                    txnHash: tx.txn_hash,
                    ts: tx.ts,
                    blockHash: tx.block_hash,
                    category: tx.category,
                    sender: tx.sender,
                    status: tx.status,
                    from: tx.from,
                    recipients: tx.recipients,
                    txnData: tx.data.toString('hex'),
                    txnDataAsJson: (_a = tx.data_as_json) !== null && _a !== void 0 ? _a : {},
                    sig: tx.sig,
                },
            ],
        };
        return {
            blocks: [blockWithTransaction],
            lastTs: tx.ts,
            totalPages: 1,
        };
    }
    async push_getTransactionsByUser(userAddress, startTime, direction, pageSize, page = 1, category) {
        const where = this.buildWhereClause(startTime, direction, category, undefined, undefined, userAddress);
        const { transactions, totalPages } = await this.paginateTransactions(where, direction, pageSize, page);
        const blocks = await this.groupTransactionsByBlock(transactions);
        const lastTs = transactions.length
            ? transactions[transactions.length - 1].ts
            : BigInt(0);
        return { blocks, lastTs, totalPages };
    }
    async getTotalTransactions() {
        return this.prisma.transaction.count();
    }
    async getDailyTransactions() {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0); // Set time to midnight for today's start
        return this.prisma.transaction.count({
            where: {
                ts: {
                    gte: todayStart.getTime(),
                },
            },
        });
    }
    async groupTransactionsByBlock(transactions) {
        var _a;
        const blocksMap = new Map();
        for (const tx of transactions) {
            if (!blocksMap.has(tx.block_hash)) {
                const block = await this.prisma.block.findUnique({
                    where: { block_hash: tx.block_hash },
                });
                if (block) {
                    const totalNumberOfTxns = await this.prisma.transaction.count({
                        where: { block_hash: block.block_hash },
                    });
                    blocksMap.set(tx.block_hash, {
                        blockHash: block.block_hash,
                        blockData: block.data.toString('hex'),
                        blockDataAsJson: block.data_as_json,
                        blockSize: block.data.length,
                        ts: block.ts,
                        transactions: [],
                        totalNumberOfTxns,
                    });
                }
            }
            const blockWithTransactions = blocksMap.get(tx.block_hash);
            if (blockWithTransactions) {
                blockWithTransactions.transactions.push({
                    txnHash: tx.txn_hash,
                    ts: tx.ts,
                    blockHash: tx.block_hash,
                    category: tx.category,
                    sender: tx.sender,
                    status: tx.status,
                    from: tx.from,
                    recipients: tx.recipients,
                    txnData: tx.data.toString('hex'),
                    txnDataAsJson: (_a = tx.data_as_json) !== null && _a !== void 0 ? _a : {},
                    sig: tx.sig,
                });
            }
        }
        return Array.from(blocksMap.values());
    }
};
exports.TxService = TxService;
exports.TxService = TxService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TxService);
//# sourceMappingURL=tx.service.js.map