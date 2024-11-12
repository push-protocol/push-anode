"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EthersUtil = void 0;
const ethers_1 = require("ethers");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const winstonUtil_1 = require("./winstonUtil");
class EthersUtil {
    static loadAbi(configDir, fileNameInConfigDir) {
        const fileAbsolute = path_1.default.resolve(configDir, `./${fileNameInConfigDir}`);
        const file = fs_1.default.readFileSync(fileAbsolute, 'utf8');
        const json = JSON.parse(file);
        const abi = json.abi;
        console.log(`abi size:`, abi.length);
        return abi;
    }
    // creates a client, using an encrypted private key from disk, so that we could sign/write to the blockchain
    static async connectWithKey(configDir, privateKeyFileName, privateKeyPass, contractAbiFileName, contractAddr, provider) {
        const abi = EthersUtil.loadAbi(configDir, contractAbiFileName);
        const jsonFile = fs_1.default.readFileSync(configDir + '/' + privateKeyFileName, 'utf-8');
        const nodeWallet = await ethers_1.Wallet.fromEncryptedJson(jsonFile, privateKeyPass);
        const nodeAddress = await nodeWallet.getAddress();
        const signer = nodeWallet.connect(provider);
        const contract = new ethers_1.ethers.Contract(contractAddr, abi, signer);
        this.log.debug('connecting contract %s using signer %s (keydir: %s, keyfile: %s, abi: %s) ', contractAddr, signer.address, configDir, privateKeyFileName, contractAbiFileName);
        return {
            contract,
            nodeWallet,
            nodeAddress
        };
    }
    // creates a client which can only read blockchain state
    static async connectWithoutKey(configDir, contractAbiFileName, contractAddr, provider) {
        const abi = EthersUtil.loadAbi(configDir, contractAbiFileName);
        const contract = new ethers_1.ethers.Contract(contractAddr, abi, provider);
        this.log.debug('connecting contract %s (no key, abi: %s) ', contractAddr, contractAbiFileName);
        return contract;
    }
}
exports.EthersUtil = EthersUtil;
EthersUtil.log = winstonUtil_1.WinstonUtil.newLog(EthersUtil);
//# sourceMappingURL=ethersUtil.js.map