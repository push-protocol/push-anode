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
exports.ArchiveNodeService = void 0;
const block_pb_1 = require("../../generated/block_pb");
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const objectHasher_1 = require("../../utils/objectHasher");
const validator_contract_state_service_1 = require("../validator/validator-contract-state.service");
const blockUtil_1 = require("../../utils/blockUtil");
let ArchiveNodeService = class ArchiveNodeService {
    async postConstruct() {
        await this.valContractState.onModuleInit();
    }
    constructor(prisma) {
        this.prisma = prisma;
        this.valContractState = new validator_contract_state_service_1.ValidatorContractState();
        this.postConstruct();
    }
    async accept(item) {
        try {
            // Deserialize the block data
            const bytes = Uint8Array.from(Buffer.from(item.object, 'hex'));
            const deserializedBlock = block_pb_1.Block.deserializeBinary(bytes);
            const block = deserializedBlock.toObject();
            // Block validation //
            // validate the hash
            const calculatedHash = blockUtil_1.BlockUtil.hashBlockAsHex(bytes);
            if (calculatedHash != item.object_hash) {
                throw new Error('received item hash= , ' +
                    item.object_hash +
                    'which differs from calculatedHash=, ' +
                    calculatedHash +
                    'ignoring the block because producer calculated the hash incorrectly');
            }
            // validate the signature
            if (!(await this.validateBlock(deserializedBlock))) {
                throw new Error('Block validation failed');
            }
            // Extract block hash from the block
            const blockHash = this.getBlockHash(block);
            if (await this.isBlockAlreadyStored(blockHash)) {
                console.log('Block already exists, skipping:', blockHash);
                return true;
            }
            // Prepare the block data for insertion
            const blockData = {
                block_hash: blockHash,
                data_as_json: this.recursivelyConvertToJSON(block), // Convert to JSON-compatible format
                data: Buffer.from(bytes), // Store the binary data
                ts: block.ts,
            };
            // Prepare transaction data for insertion
            const transactionsData = await this.prepareTransactionsData(deserializedBlock.getTxobjList(), blockHash, block.ts);
            if (transactionsData.length === 0) {
                console.log('All transactions already exist, skipping block insert.');
                return true;
            }
            // Insert block into the database
            await this.prisma.block.create({ data: blockData });
            // Insert transactions into the database
            await this.prisma.transaction.createMany({ data: transactionsData });
            console.log('Block and transactions inserted:', blockHash);
            return true;
        }
        catch (error) {
            console.log('Failed to process block:', error);
            return false;
        }
    }
    async validateBlock(block) {
        const validatorSet = new Set(this.valContractState.getAllNodesMap().keys());
        const validationPerBlock = this.valContractState.contractCli.valPerBlock;
        const validationRes = await blockUtil_1.BlockUtil.checkBlockFinalized(block, validatorSet, validationPerBlock);
        if (!validationRes.success) {
            console.error('Error while block validation');
            return false;
        }
        else {
            return true;
        }
    }
    getBlockHash(block) {
        // Generate a block hash using the ObjectHasher utility
        return objectHasher_1.ObjectHasher.hashToSha256(block);
    }
    async isBlockAlreadyStored(blockHash) {
        const block = await this.prisma.block.findUnique({
            where: { block_hash: blockHash },
        });
        return block !== null;
    }
    recursivelyConvertToJSON(obj) {
        if (obj instanceof Uint8Array) {
            // Convert Uint8Array to a base64 string
            return Buffer.from(obj).toString('base64');
        }
        if (Array.isArray(obj)) {
            return obj.map((item) => this.recursivelyConvertToJSON(item));
        }
        if (obj !== null && typeof obj === 'object') {
            const convertedObj = {};
            for (const key in obj) {
                convertedObj[key] = this.recursivelyConvertToJSON(obj[key]);
            }
            return convertedObj;
        }
        return obj;
    }
    // TODO: remove from or sender its redundant
    async prepareTransactionsData(txObjList, blockHash, blockTs) {
        var _a, _b, _c, _d;
        const transactionsData = [];
        for (const txObj of txObjList) {
            const tx = txObj.getTx();
            const txnHash = this.getTransactionHash(tx);
            if (await this.isTransactionAlreadyStored(txnHash)) {
                console.log('Transaction already exists, skipping:', txnHash);
                continue;
            }
            const txJsonObj = txObj.toObject();
            const txData = {
                ts: blockTs,
                txn_hash: txnHash,
                block_hash: blockHash,
                category: txJsonObj.tx.category || '',
                sender: ((_a = txJsonObj.tx) === null || _a === void 0 ? void 0 : _a.sender) || '',
                status: 'SUCCESS',
                from: ((_b = txJsonObj.tx) === null || _b === void 0 ? void 0 : _b.sender) || '',
                recipients: {
                    recipients: ((_c = txJsonObj.tx) === null || _c === void 0 ? void 0 : _c.recipientsList.map((recipient) => ({
                        address: recipient,
                    }))) || [],
                },
                data: txJsonObj.tx.data, // Store binary data
                data_as_json: txJsonObj,
                sig: (_d = txJsonObj.tx) === null || _d === void 0 ? void 0 : _d.signature,
            };
            transactionsData.push(txData);
        }
        return transactionsData;
    }
    getTransactionHash(transaction) {
        return blockUtil_1.BlockUtil.hashTxAsHex(transaction.serializeBinary());
    }
    async isTransactionAlreadyStored(txnHash) {
        const transaction = await this.prisma.transaction.findUnique({
            where: { txn_hash: txnHash },
        });
        return transaction !== null;
    }
};
exports.ArchiveNodeService = ArchiveNodeService;
exports.ArchiveNodeService = ArchiveNodeService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ArchiveNodeService);
//# sourceMappingURL=archive-node.service.js.map