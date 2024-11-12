"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const nestjs_json_rpc_1 = require("@klerick/nestjs-json-rpc");
const block_module_1 = require("./modules/block/block.module");
const tx_module_1 = require("./modules/tx/tx.module");
const rpc_service_1 = require("./rpc.service"); // Import your new RPC service
const health_controller_1 = require("./modules/health/health.controller");
const queue_module_1 = require("./modules/queue/queue.module");
const archive_module_1 = require("./modules/archive/archive.module");
const validator_module_1 = require("./modules/validator/validator.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            block_module_1.BlockModule,
            tx_module_1.TxModule,
            queue_module_1.QueueModule,
            archive_module_1.ArchiveModule,
            validator_module_1.ValidatorModule,
            nestjs_json_rpc_1.NestjsJsonRpcModule.forRoot({
                path: 'rpc',
                transport: nestjs_json_rpc_1.TransportType.HTTP,
            }),
        ],
        providers: [rpc_service_1.RpcService],
        controllers: [health_controller_1.HealthController],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map