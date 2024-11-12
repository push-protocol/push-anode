"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArchiveModule = void 0;
const common_1 = require("@nestjs/common");
const archive_node_service_1 = require("./archive-node.service");
const prisma_module_1 = require("../prisma/prisma.module");
let ArchiveModule = class ArchiveModule {
};
exports.ArchiveModule = ArchiveModule;
exports.ArchiveModule = ArchiveModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule],
        providers: [archive_node_service_1.ArchiveNodeService],
        exports: [archive_node_service_1.ArchiveNodeService],
    })
], ArchiveModule);
//# sourceMappingURL=archive.module.js.map