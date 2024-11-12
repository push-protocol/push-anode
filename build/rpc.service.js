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
exports.RpcService = void 0;
const common_1 = require("@nestjs/common");
const nestjs_json_rpc_1 = require("@klerick/nestjs-json-rpc");
const block_service_1 = require("./modules/block/block.service");
const tx_service_1 = require("./modules/tx/tx.service");
let RpcService = class RpcService {
    constructor(blockService, txService) {
        this.blockService = blockService;
        this.txService = txService;
    }
    bigIntReplacer(key, value) {
        // If the value is a BigInt, convert it to a string
        if (typeof value === 'bigint') {
            return value.toString();
        }
        // Otherwise, return the value as-is
        return value;
    }
    async getBlocks(startTime, direction, showDetails, pageSize, page) {
        const finalStartTime = startTime !== null && startTime !== void 0 ? startTime : 0;
        const finalDirection = direction !== null && direction !== void 0 ? direction : 'DESC';
        const finalShowDetails = showDetails !== null && showDetails !== void 0 ? showDetails : false;
        const finalPageSize = pageSize !== null && pageSize !== void 0 ? pageSize : 10;
        const finalPage = page !== null && page !== void 0 ? page : 1; // Default to page 1 if not provided
        const result = await this.blockService.push_getBlocksByTime(finalStartTime, finalDirection, finalShowDetails, finalPageSize, finalPage);
        return JSON.parse(JSON.stringify(result, this.bigIntReplacer));
    }
    async getBlockByHash(blockHash, showDetails = true) {
        const result = await this.blockService.push_getBlockByHash(blockHash, showDetails);
        return JSON.parse(JSON.stringify(result, this.bigIntReplacer));
    }
    async getTxs(startTime, direction, pageSize, page, // Add page parameter here
    category) {
        const finalStartTime = startTime !== null && startTime !== void 0 ? startTime : 0;
        const finalDirection = direction !== null && direction !== void 0 ? direction : 'DESC';
        const finalPageSize = pageSize !== null && pageSize !== void 0 ? pageSize : 10;
        const finalPage = page !== null && page !== void 0 ? page : 1; // Default to page 1 if not provided
        const result = await this.txService.push_getTransactions(finalStartTime, finalDirection, finalPageSize, finalPage, category);
        return JSON.parse(JSON.stringify(result, this.bigIntReplacer));
    }
    async getTxsByRecipient(recipientAddress, startTime, direction, pageSize, page, // Add page parameter here
    category) {
        const finalStartTime = startTime !== null && startTime !== void 0 ? startTime : 0;
        const finalDirection = direction !== null && direction !== void 0 ? direction : 'DESC';
        const finalPageSize = pageSize !== null && pageSize !== void 0 ? pageSize : 10;
        const finalPage = page !== null && page !== void 0 ? page : 1; // Default to page 1 if not provided
        const result = await this.txService.push_getTransactionsByRecipient(recipientAddress, finalStartTime, finalDirection, finalPageSize, finalPage, // Pass the page parameter
        category);
        return JSON.parse(JSON.stringify(result, this.bigIntReplacer));
    }
    async getTxsBySender(senderAddress, startTime, direction, pageSize, page, // Add page parameter here
    category) {
        const finalStartTime = startTime !== null && startTime !== void 0 ? startTime : 0;
        const finalDirection = direction !== null && direction !== void 0 ? direction : 'DESC';
        const finalPageSize = pageSize !== null && pageSize !== void 0 ? pageSize : 10;
        const finalPage = page !== null && page !== void 0 ? page : 1; // Default to page 1 if not provided
        const result = await this.txService.push_getTransactionsBySender(senderAddress, finalStartTime, finalDirection, finalPageSize, finalPage, // Pass the page parameter
        category);
        return JSON.parse(JSON.stringify(result, this.bigIntReplacer));
    }
    async getTxByHash(transactionHash) {
        const result = await this.txService.push_getTransactionByHash(transactionHash);
        return JSON.parse(JSON.stringify(result, this.bigIntReplacer));
    }
    async getCounts() {
        const [totalBlocks, totalTransactions, dailyTransactions] = await Promise.all([
            this.blockService.getTotalBlocks(),
            this.txService.getTotalTransactions(),
            this.txService.getDailyTransactions(),
        ]);
        return {
            totalBlocks,
            totalTransactions,
            dailyTransactions,
        };
    }
    async searchByAddress(searchTerm, startTime, direction, pageSize, showDetails, page) {
        const finalStartTime = startTime !== null && startTime !== void 0 ? startTime : 0;
        const finalDirection = direction !== null && direction !== void 0 ? direction : 'DESC';
        const finalShowDetails = showDetails !== null && showDetails !== void 0 ? showDetails : false;
        const finalPageSize = pageSize !== null && pageSize !== void 0 ? pageSize : 10;
        const finalPage = page !== null && page !== void 0 ? page : 1; // Default to page 1 if not provided
        const blockSearch = this.blockService.push_getBlockByHash(searchTerm, finalShowDetails);
        const txSearch = this.txService.push_getTransactionByHash(searchTerm);
        const recipientSearch = this.txService.push_getTransactionsByRecipient(searchTerm, finalStartTime, finalDirection, finalPageSize, finalPage);
        try {
            const [blockResult, txResult, recipientResult] = await Promise.allSettled([blockSearch, txSearch, recipientSearch]);
            console.log(blockResult);
            console.log(txResult);
            console.log(recipientResult);
            if (blockResult.status === 'fulfilled' &&
                blockResult.value.blocks.length > 0) {
                return JSON.parse(JSON.stringify(blockResult.value, this.bigIntReplacer));
            }
            if (txResult.status === 'fulfilled' && txResult.value.blocks.length > 0) {
                return JSON.parse(JSON.stringify(txResult.value, this.bigIntReplacer));
            }
            if (recipientResult.status === 'fulfilled' &&
                recipientResult.value.blocks.length > 0) {
                return JSON.parse(JSON.stringify(recipientResult.value, this.bigIntReplacer));
            }
            return JSON.parse(JSON.stringify({
                blocks: [],
                lastTs: BigInt(0),
                totalPages: 0,
            }, this.bigIntReplacer));
        }
        catch (error) {
            console.error('Error during search:', error);
            return JSON.parse(JSON.stringify({
                blocks: [],
                lastTs: BigInt(0),
                totalPages: 0,
            }, this.bigIntReplacer));
        }
    }
    async getTransactionsByUser(userAddress, startTime, direction, pageSize, page, category) {
        const finalStartTime = startTime !== null && startTime !== void 0 ? startTime : 0;
        const finalDirection = direction !== null && direction !== void 0 ? direction : 'DESC';
        const finalPageSize = pageSize !== null && pageSize !== void 0 ? pageSize : 10;
        const finalPage = page !== null && page !== void 0 ? page : 1;
        const result = await this.txService.push_getTransactionsByUser(userAddress, finalStartTime, finalDirection, finalPageSize, finalPage, category);
        return JSON.parse(JSON.stringify(result, this.bigIntReplacer));
    }
    async health() {
        return { success: 'ok' };
    }
};
exports.RpcService = RpcService;
exports.RpcService = RpcService = __decorate([
    (0, nestjs_json_rpc_1.RpcHandler)(),
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [block_service_1.BlockService,
        tx_service_1.TxService])
], RpcService);
//# sourceMappingURL=rpc.service.js.map