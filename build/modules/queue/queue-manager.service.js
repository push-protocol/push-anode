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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var QueueManagerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueManagerService = void 0;
const node_schedule_1 = __importDefault(require("node-schedule"));
const envLoader_1 = require("../../utils/envLoader");
const winstonUtil_1 = require("../../utils/winstonUtil");
const queue_client_service_1 = require("./queue-client.service");
const queue_client_helper_service_1 = require("./queue-client-helper.service");
const prisma_service_1 = require("../../prisma/prisma.service");
const archive_node_service_1 = require("../archive/archive-node.service");
const common_1 = require("@nestjs/common");
const validator_contract_state_service_1 = require("../validator/validator-contract-state.service");
let QueueManagerService = QueueManagerService_1 = class QueueManagerService {
    constructor(contract, archiveNode, prisma, queueClientHelper) {
        this.contract = contract;
        this.archiveNode = archiveNode;
        this.prisma = prisma;
        this.queueClientHelper = queueClientHelper;
        this.log = winstonUtil_1.WinstonUtil.newLog(QueueManagerService_1);
        this.CLIENT_READ_SCHEDULE = envLoader_1.EnvLoader.getPropertyOrDefault('CLIENT_READ_SCHEDULE', '*/10 * * * * *');
        this.CLIENT_REQUEST_PER_SCHEDULED_JOB = 10;
    }
    /**
     * Called after the module's providers are initialized
     */
    async onModuleInit() {
        this.log.debug('onModuleInit');
        this.mblockClient = new queue_client_service_1.QueueClient(this.archiveNode, QueueManagerService_1.QUEUE_MBLOCK, this.prisma);
        await this.queueClientHelper.initClientForEveryQueueForEveryValidator(this.contract, [QueueManagerService_1.QUEUE_MBLOCK]);
        this.scheduleQueuePolling();
    }
    /**
     * Schedule polling for the queue based on CLIENT_READ_SCHEDULE
     */
    scheduleQueuePolling() {
        const qs = this;
        node_schedule_1.default.scheduleJob(this.CLIENT_READ_SCHEDULE, async function () {
            const dbgPrefix = 'PollRemoteQueue';
            try {
                await qs.mblockClient.pollRemoteQueue(qs.CLIENT_REQUEST_PER_SCHEDULED_JOB);
                qs.log.info(`CRON %s started`, dbgPrefix);
            }
            catch (err) {
                qs.log.error(`CRON %s failed %o`, dbgPrefix, err);
            }
            finally {
                qs.log.info(`CRON %s finished`, dbgPrefix);
            }
        });
    }
    /**
     * Poll remote queues
     * @returns Result of polling the queue
     */
    async pollRemoteQueues() {
        const result = await this.mblockClient.pollRemoteQueue(1);
        return result;
    }
};
exports.QueueManagerService = QueueManagerService;
QueueManagerService.QUEUE_MBLOCK = 'mblock';
exports.QueueManagerService = QueueManagerService = QueueManagerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [validator_contract_state_service_1.ValidatorContractState,
        archive_node_service_1.ArchiveNodeService,
        prisma_service_1.PrismaService,
        queue_client_helper_service_1.QueueClientHelper])
], QueueManagerService);
//# sourceMappingURL=queue-manager.service.js.map