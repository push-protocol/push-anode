"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueModule = void 0;
const common_1 = require("@nestjs/common");
const queue_manager_service_1 = require("./queue-manager.service");
const queue_client_helper_service_1 = require("./queue-client-helper.service");
const prisma_module_1 = require("../prisma/prisma.module");
const archive_module_1 = require("../archive/archive.module");
const validator_module_1 = require("../validator/validator.module");
let QueueModule = class QueueModule {
};
exports.QueueModule = QueueModule;
exports.QueueModule = QueueModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, archive_module_1.ArchiveModule, validator_module_1.ValidatorModule],
        providers: [queue_manager_service_1.QueueManagerService, queue_client_helper_service_1.QueueClientHelper],
        exports: [queue_manager_service_1.QueueManagerService, queue_client_helper_service_1.QueueClientHelper],
    })
], QueueModule);
//# sourceMappingURL=queue.module.js.map