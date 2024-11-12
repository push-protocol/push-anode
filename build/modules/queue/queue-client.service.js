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
var QueueClient_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueClient = void 0;
const winstonUtil_1 = require("../../utils/winstonUtil");
const prisma_service_1 = require("../../prisma/prisma.service");
const archive_node_service_1 = require("../archive/archive-node.service");
const rpcUtil_1 = require("../../utils/rpcUtil");
const common_1 = require("@nestjs/common");
let QueueClient = QueueClient_1 = class QueueClient {
    constructor(consumer, queueName, prisma) {
        this.prisma = prisma;
        this.log = winstonUtil_1.WinstonUtil.newLog(QueueClient_1);
        this.consumer = consumer;
        this.queueName = queueName;
    }
    async pollRemoteQueue(maxRequests) {
        var _a;
        const result = [];
        // Use Prisma to fetch data
        const sameQueueEndpoints = await this.prisma.dsetClient.findMany({
            where: {
                queue_name: this.queueName,
                state: 1,
            },
            orderBy: {
                id: 'asc',
            },
            select: {
                id: true,
                queue_name: true,
                target_node_id: true,
                target_node_url: true,
                target_offset: true,
            },
        });
        for (const endpoint of sameQueueEndpoints) {
            const endpointStats = {
                queueName: this.queueName,
                target_node_id: endpoint.target_node_id,
                target_node_url: endpoint.target_node_url,
                queries: 0,
                downloadedItems: 0,
                newItems: 0,
                lastOffset: Number(endpoint.target_offset), // Ensure this is a number
            };
            // Convert `target_offset` (bigint) to number for further processing
            let lastOffset = Number(endpoint.target_offset);
            for (let i = 0; i < maxRequests; i++) {
                result.push(endpointStats);
                endpointStats.queries++;
                const reply = await this.readItems(endpoint.queue_name, endpoint.target_node_url, lastOffset);
                console.log('\n\n\n');
                console.log(reply);
                console.log('\n\n\n');
                if (!reply || ((_a = reply.items) === null || _a === void 0 ? void 0 : _a.length) === 0) {
                    break;
                }
                for (const item of reply.items) {
                    endpointStats.downloadedItems++;
                    let appendSuccessful = false;
                    try {
                        appendSuccessful = await this.consumer.accept(item);
                    }
                    catch (e) {
                        this.log.error('error processing accept(): queue %s: ', this.queueName);
                        this.log.error(e);
                    }
                    if (appendSuccessful) {
                        endpointStats.newItems++;
                    }
                }
                // Convert `reply.lastOffset` (number) to bigint before updating the database
                await this.prisma.dsetClient.update({
                    where: { id: endpoint.id },
                    data: { target_offset: BigInt(reply.lastOffset) },
                });
                lastOffset = reply.lastOffset; // Continue using `lastOffset` as a number
                endpointStats.lastOffset = reply.lastOffset; // This is now compatible since both are numbers
            }
        }
        return { result: result };
    }
    /**
     * Updates the queue offset after processing an item.
     * @param itemId The ID of the item processed.
     */
    async updateQueueOffset(itemId) {
        try {
            await this.prisma.dsetClient.update({
                where: { id: itemId },
                data: { target_offset: itemId },
            });
            this.log.info(`Queue offset updated to ${itemId}.`);
        }
        catch (error) {
            this.log.error(`Failed to update queue offset for item ID ${itemId}: %o`, error);
            throw error;
        }
    }
    async readItems(queueName, baseUri, firstOffset = 0) {
        const url = `${baseUri}/api/v1/rpc`;
        try {
            const re = await new rpcUtil_1.RpcUtils(url, 'push_readBlockQueue', [
                `${firstOffset}`,
            ]).call();
            // TODO: implement the logic to deserialise the blocks
            this.log.debug('readItems %s from offset %d %o', url, firstOffset, re === null || re === void 0 ? void 0 : re.data);
            const obj = re.data.result;
            return obj;
        }
        catch (e) {
            this.log.warn('readItems failed for url %s', url);
            return null;
        }
    }
    async readLastOffset(queueName, baseUri) {
        const url = `${baseUri}/api/v1/rpc`;
        const resp = await new rpcUtil_1.RpcUtils(url, 'push_readBlockQueueSize', []).call();
        const result = resp.data.result;
        return result;
    }
};
exports.QueueClient = QueueClient;
exports.QueueClient = QueueClient = QueueClient_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [archive_node_service_1.ArchiveNodeService, String, prisma_service_1.PrismaService])
], QueueClient);
//# sourceMappingURL=queue-client.service.js.map