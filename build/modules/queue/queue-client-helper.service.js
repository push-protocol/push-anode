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
var QueueClientHelper_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueClientHelper = void 0;
const prisma_service_1 = require("../../prisma/prisma.service");
const winstonUtil_1 = require("../../utils/winstonUtil");
const validator_contract_state_service_1 = require("../validator/validator-contract-state.service");
const common_1 = require("@nestjs/common");
let QueueClientHelper = QueueClientHelper_1 = class QueueClientHelper {
    constructor(prisma) {
        this.prisma = prisma;
        this.log = winstonUtil_1.WinstonUtil.newLog(QueueClientHelper_1);
    }
    /**
     * Initializes the client for every validator across multiple queues.
     * @param contract The ValidatorContractState containing validator information.
     * @param queueNames The list of queue names.
     */
    async initClientForEveryQueueForEveryValidator(contract, queueNames) {
        var _a;
        // Check that queueNames is not empty
        if (!queueNames.length) {
            throw new Error('Queue names are missing');
        }
        const allValidators = contract.getAllValidatorsExceptSelf();
        for (const queueName of queueNames) {
            for (const nodeInfo of allValidators) {
                const targetNodeId = nodeInfo.nodeId;
                const targetNodeUrl = nodeInfo.url;
                const targetState = validator_contract_state_service_1.ValidatorContractState.isEnabled(nodeInfo) ? 1 : 0;
                // Prisma upsert for inserting or updating target node information
                await this.prisma.dsetClient.upsert({
                    where: {
                        queue_name_target_node_id: {
                            queue_name: queueName,
                            target_node_id: targetNodeId,
                        },
                    },
                    update: {
                        target_node_url: targetNodeUrl,
                        state: targetState,
                    },
                    create: {
                        queue_name: queueName,
                        target_node_id: targetNodeId,
                        target_node_url: targetNodeUrl,
                        target_offset: 0,
                        state: targetState,
                    },
                });
                // Retrieve target offset using Prisma
                const targetOffset = await this.prisma.dsetClient.findUnique({
                    where: {
                        queue_name_target_node_id: {
                            queue_name: queueName,
                            target_node_id: targetNodeId,
                        },
                    },
                    select: {
                        target_offset: true,
                    },
                });
                // Logging information
                this.log.info('Client polls (state: %s) queue: %s node: %s from offset: %d', targetState, queueName, targetNodeId, (_a = targetOffset === null || targetOffset === void 0 ? void 0 : targetOffset.target_offset) !== null && _a !== void 0 ? _a : 0);
            }
        }
    }
};
exports.QueueClientHelper = QueueClientHelper;
exports.QueueClientHelper = QueueClientHelper = QueueClientHelper_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], QueueClientHelper);
//# sourceMappingURL=queue-client-helper.service.js.map