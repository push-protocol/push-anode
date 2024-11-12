"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var ValidatorContractState_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeType = exports.NodeInfo = exports.NodeStatus = exports.ValidatorCtClient = exports.ValidatorContractState = void 0;
const ethers_1 = require("ethers");
const strUtil_1 = __importDefault(require("../../utils/strUtil"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const envLoader_1 = require("../../utils/envLoader");
const winstonUtil_1 = require("../../utils/winstonUtil");
const common_1 = require("@nestjs/common");
/*
Validator contract abstraction.
All blockchain goes here
 */
let ValidatorContractState = ValidatorContractState_1 = class ValidatorContractState {
    constructor() {
        this.log = winstonUtil_1.WinstonUtil.newLog(ValidatorContractState_1);
    }
    async onModuleInit() {
        this.log.info('onModuleInit()');
        // Initialize contract factory and client
        this.contractFactory = new ContractClientFactory();
        this.contractCli = await this.contractFactory.buildROClient(this.log);
        await this.contractCli.connect();
        // Set wallet and nodeId
        this.wallet = this.contractFactory.nodeWallet;
        this.nodeId = this.wallet.address;
        // Perform necessary checks
        if (!this.wallet)
            throw new Error('wallet is not loaded');
        if (this.contractCli.vnodes == null)
            throw new Error('Nodes are not initialized');
    }
    isActiveValidator(nodeId) {
        const vi = this.contractCli.vnodes.get(nodeId);
        return vi != null;
    }
    getAllNodesMap() {
        return this.contractCli.vnodes;
    }
    getValidatorNodesMap() {
        return this.contractCli.vnodes;
    }
    getStorageNodesMap() {
        return this.contractCli.snodes;
    }
    getActiveValidatorsExceptSelf() {
        const allNodes = Array.from(this.getAllNodesMap().values());
        const onlyGoodValidators = allNodes.filter((ni) => ni.nodeType == NodeType.VNode &&
            ValidatorContractState_1.isEnabled(ni) &&
            this.nodeId !== ni.nodeId);
        return onlyGoodValidators;
    }
    getActiveValidators() {
        const allNodes = Array.from(this.getAllNodesMap().values());
        const onlyGoodValidators = allNodes.filter((ni) => ni.nodeType == NodeType.VNode && ValidatorContractState_1.isEnabled(ni));
        return onlyGoodValidators;
    }
    getAllValidatorsExceptSelf() {
        const allNodes = Array.from(this.getAllNodesMap().values());
        const onlyGoodValidators = allNodes.filter((ni) => ni.nodeType == NodeType.VNode &&
            ValidatorContractState_1.isEnabled(ni) &&
            this.nodeId !== ni.nodeId);
        return onlyGoodValidators;
    }
    static isEnabled(ni) {
        return (ni.nodeStatus == NodeStatus.OK ||
            ni.nodeStatus == NodeStatus.Reported ||
            ni.nodeStatus == NodeStatus.Slashed);
    }
};
exports.ValidatorContractState = ValidatorContractState;
exports.ValidatorContractState = ValidatorContractState = ValidatorContractState_1 = __decorate([
    (0, common_1.Injectable)()
], ValidatorContractState);
class ContractClientFactory {
    constructor() {
        this.validatorCtAddr = envLoader_1.EnvLoader.getPropertyOrFail('VALIDATOR_CONTRACT_ADDRESS');
        this.validatorRpcEndpoint = envLoader_1.EnvLoader.getPropertyOrFail('VALIDATOR_RPC_ENDPOINT');
        this.validatorRpcNetwork = Number.parseInt(envLoader_1.EnvLoader.getPropertyOrFail('VALIDATOR_RPC_NETWORK'));
        this.provider = new ethers_1.ethers.providers.JsonRpcProvider(this.validatorRpcEndpoint, this.validatorRpcNetwork);
        this.configDir = envLoader_1.EnvLoader.getPropertyOrFail('CONFIG_DIR');
        this.abi = ContractClientFactory.loadValidatorContractAbi(this.configDir, 'ValidatorV1.json');
    }
    static loadValidatorContractAbi(configDir, fileNameInConfigDir) {
        const fileAbsolute = path_1.default.resolve(configDir, `./${fileNameInConfigDir}`);
        const file = fs_1.default.readFileSync(fileAbsolute, 'utf8');
        const json = JSON.parse(file);
        const abi = json.abi;
        return abi;
    }
    async buildROClient(log) {
        this.validatorPrivateKeyFile = envLoader_1.EnvLoader.getPropertyOrFail('VALIDATOR_PRIVATE_KEY_FILE');
        this.validatorPrivateKeyPass = envLoader_1.EnvLoader.getPropertyOrFail('VALIDATOR_PRIVATE_KEY_PASS');
        const jsonFile = fs_1.default.readFileSync(this.configDir + '/' + this.validatorPrivateKeyFile, 'utf-8');
        this.nodeWallet = await ethers_1.Wallet.fromEncryptedJson(jsonFile, this.validatorPrivateKeyPass);
        this.nodeAddress = await this.nodeWallet.getAddress();
        const contract = new ethers_1.ethers.Contract(this.validatorCtAddr, this.abi, this.provider);
        return new ValidatorCtClient(contract, log);
    }
}
// all Validator contract interactions are wrapped into this class
// todo update with new events
class ValidatorCtClient {
    constructor(contract, log) {
        this.vnodes = new Map();
        this.snodes = new Map();
        this.dnodes = new Map();
        // Initialize with default values
        this.valPerBlock = 0; // Default initialization
        this.valPerBlockTarget = 0; // Default initialization
        this.nodeRandomMinCount = 0; // Default initialization
        this.nodeRandomPingCount = 0; // Default initialization
        this.contract = contract;
        this.log = log;
    }
    async loadConstantsAndSubscribeToUpdates() {
        this.valPerBlock = await this.contract.valPerBlock();
        this.valPerBlockTarget = await this.contract.valPerBlockTarget();
        this.log.info(`valPerBlock=${this.valPerBlock}`);
        if (this.valPerBlock == null) {
            throw new Error('valPerBlock is undefined');
        }
        this.contract.on('BlockParamsUpdated', (valPerBlock, valPerBlockTarget) => {
            this.valPerBlock = valPerBlock;
            this.valPerBlockTarget = valPerBlockTarget;
            this.log.info(`attestersRequired=${this.valPerBlock}`);
        });
        this.nodeRandomMinCount = await this.contract.nodeRandomMinCount();
        this.log.info(`nodeRandomMinCount=${this.nodeRandomMinCount}`);
        if (this.nodeRandomMinCount == null) {
            throw new Error('nodeRandomMinCount is undefined');
        }
        this.nodeRandomPingCount = await this.contract.nodeRandomPingCount();
        this.log.info(`nodeRandomPingCount=${this.nodeRandomPingCount}`);
        this.contract.on('RandomParamsUpdated', (nodeRandomMinCount, nodeRandomPingCount) => {
            this.nodeRandomMinCount = nodeRandomMinCount;
            this.nodeRandomPingCount = nodeRandomPingCount;
            this.log.info(`nodeRandomMinCount=${this.nodeRandomMinCount}`);
        });
    }
    // todo work with corrupted url's: returning nulls as of now
    fixNodeUrl(nodeUrl) {
        if (nodeUrl.length > 100) {
            this.log.error('nodeUrl should be less than 100 chars');
            return '';
        }
        try {
            // Ensure nodeUrl is non-null before passing to URL constructor
            const urlObj = new URL(nodeUrl);
            if (envLoader_1.EnvLoader.getPropertyAsBool('LOCALH') && !strUtil_1.default.isEmpty(nodeUrl)) {
                if (urlObj.hostname.endsWith('.local')) {
                    urlObj.hostname = 'localhost';
                }
            }
            let fixedUrl = urlObj.toString();
            if (fixedUrl.endsWith('/')) {
                fixedUrl = fixedUrl.slice(0, -1);
            }
            return fixedUrl;
        }
        catch (e) {
            this.log.error(e);
            return '';
        }
    }
    async loadVSDNodesAndSubscribeToUpdates() {
        const vNodes = await this.contract.getVNodes();
        for (const nodeAddr of vNodes) {
            const niFromCt = await this.contract.getNodeInfo(nodeAddr);
            const ni = new NodeInfo(niFromCt.nodeWallet, this.fixNodeUrl(niFromCt.nodeApiBaseUrl), niFromCt.nodeType, niFromCt.status);
            this.vnodes.set(niFromCt.nodeWallet, ni);
        }
        this.log.info('validator nodes loaded %o', this.vnodes);
        const sNodes = await this.contract.getSNodes();
        for (const nodeAddr of sNodes) {
            const niFromCt = await this.contract.getNodeInfo(nodeAddr);
            const ni = new NodeInfo(niFromCt.nodeWallet, this.fixNodeUrl(niFromCt.nodeApiBaseUrl), niFromCt.nodeType, niFromCt.status);
            this.snodes.set(niFromCt.nodeWallet, ni);
        }
        this.log.info('storage nodes loaded %o', this.snodes);
        const dNodes = await this.contract.getDNodes();
        for (const nodeAddr of dNodes) {
            const niFromCt = await this.contract.getNodeInfo(nodeAddr);
            const ni = new NodeInfo(niFromCt.nodeWallet, this.fixNodeUrl(niFromCt.nodeApiBaseUrl), niFromCt.nodeType, niFromCt.status);
            this.dnodes.set(niFromCt.nodeWallet, ni);
        }
        this.log.info('delivery nodes loaded %o', this.dnodes);
        this.contract.on('NodeAdded', (ownerWallet, nodeWallet, nodeType, nodeTokens, nodeApiBaseUrl) => {
            nodeApiBaseUrl = this.fixNodeUrl(nodeApiBaseUrl);
            this.log.info('NodeAdded %s %s %s %s %s', ownerWallet, nodeWallet, nodeType, nodeTokens, nodeApiBaseUrl);
            const nodeMapByType = this.getNodeMapByType(nodeType);
            const ni = new NodeInfo(nodeWallet, nodeApiBaseUrl, nodeType, NodeStatus.OK);
            nodeMapByType.set(nodeWallet, ni);
            this.log.info('NodeAdded: nodeType: %s , %s -> %s', nodeType, nodeWallet, JSON.stringify(ni));
        });
        this.contract.on('NodeStatusChanged', (nodeWallet, nodeStatus, nodeTokens) => {
            var _a, _b;
            this.log.info('NodeStatusChanged', nodeWallet, nodeStatus, nodeTokens);
            const ni = (_b = (_a = this.vnodes.get(nodeWallet)) !== null && _a !== void 0 ? _a : this.snodes.get(nodeWallet)) !== null && _b !== void 0 ? _b : this.dnodes.get(nodeWallet);
            if (ni == null) {
                this.log.error(`unknown node ${nodeWallet}`);
                return;
            }
            ni.nodeStatus = nodeStatus;
        });
    }
    getNodeMapByType(nodeType) {
        if (nodeType == NodeType.VNode) {
            return this.vnodes;
        }
        else if (nodeType == NodeType.SNode) {
            return this.snodes;
        }
        else if (nodeType == NodeType.DNode) {
            return this.dnodes;
        }
        else {
            throw new Error('unsupported node type ' + nodeType);
        }
    }
    async connect() {
        await this.loadConstantsAndSubscribeToUpdates();
        const result = this.loadNodesFromEnv();
        if (result != null) {
            // we have a debug variable set; no need to do blockchain
            this.vnodes = result;
            return;
        }
        await this.loadVSDNodesAndSubscribeToUpdates();
    }
    loadNodesFromEnv() {
        const testValidatorsEnv = process.env.VALIDATOR_CONTRACT_TEST_VALIDATORS;
        if (testValidatorsEnv) {
            // test mode
            const testValidators = (JSON.parse(testValidatorsEnv));
            const result = new Map();
            for (const vi of testValidators.validators) {
                vi.nodeId = strUtil_1.default.normalizeEthAddress(vi.nodeId);
                result.set(vi.nodeId, vi);
            }
            return result;
        }
        else {
            return null;
        }
    }
}
exports.ValidatorCtClient = ValidatorCtClient;
// from smart contract
var NodeStatus;
(function (NodeStatus) {
    NodeStatus[NodeStatus["OK"] = 0] = "OK";
    NodeStatus[NodeStatus["Reported"] = 1] = "Reported";
    NodeStatus[NodeStatus["Slashed"] = 2] = "Slashed";
    NodeStatus[NodeStatus["BannedAndUnstaked"] = 3] = "BannedAndUnstaked";
    NodeStatus[NodeStatus["Unstaked"] = 4] = "Unstaked";
})(NodeStatus || (exports.NodeStatus = NodeStatus = {}));
class NodeInfo {
    constructor(nodeId, url, nodeType, nodeStatus) {
        this.nodeId = nodeId;
        this.url = url;
        this.nodeType = nodeType;
        this.nodeStatus = nodeStatus;
    }
}
exports.NodeInfo = NodeInfo;
var NodeType;
(function (NodeType) {
    NodeType[NodeType["VNode"] = 0] = "VNode";
    NodeType[NodeType["SNode"] = 1] = "SNode";
    NodeType[NodeType["DNode"] = 2] = "DNode";
})(NodeType || (exports.NodeType = NodeType = {}));
//# sourceMappingURL=validator-contract-state.service.js.map