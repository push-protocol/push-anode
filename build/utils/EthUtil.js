"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EthUtil = void 0;
exports.Signed = Signed;
const hash_1 = require("@ethersproject/hash");
const transactions_1 = require("@ethersproject/transactions");
const ethers_1 = require("ethers");
const utils_1 = require("ethers/lib/utils");
const bitUtil_1 = require("./bitUtil");
const check_1 = require("./check");
const objectHasher_1 = require("./objectHasher");
const strUtil_1 = __importDefault(require("./strUtil"));
const winstonUtil_1 = require("./winstonUtil");
/**
 * Utitily class that allows
 * - to sign objects with an eth private key
 * - to check that signature later
 *
 * Ignores 'signature' properties
 */
class EthUtil {
    // sign object
    static async create(wallet, ...objectsToHash) {
        const ethMessage = objectHasher_1.ObjectHasher.hashToSha256IgnoreSig(objectsToHash);
        const sig = await wallet.signMessage(ethMessage);
        return sig;
    }
    static parseCaipAddress(addressinCAIP) {
        if (strUtil_1.default.isEmpty(addressinCAIP)) {
            return null;
        }
        const addressComponent = addressinCAIP.split(':');
        if (addressComponent.length === 3) {
            return {
                namespace: addressComponent[0],
                chainId: addressComponent[1],
                addr: addressComponent[2]
            };
        }
        else if (addressComponent.length === 2) {
            return {
                namespace: addressComponent[0],
                chainId: null,
                addr: addressComponent[1]
            };
        }
        else {
            return null;
        }
    }
    // check object
    static check(sig, targetWallet, ...objectsToHash) {
        const ethMessage = objectHasher_1.ObjectHasher.hashToSha256IgnoreSig(objectsToHash);
        const verificationAddress = (0, utils_1.verifyMessage)(ethMessage, sig);
        if (targetWallet !== verificationAddress) {
            return false;
        }
        return true;
    }
    static isEthZero(addr) {
        return '0x0000000000000000000000000000000000000000' === addr;
    }
    static getMessageHashAsInContract(message) {
        return ethers_1.ethers.utils.keccak256(ethers_1.ethers.utils.arrayify(message));
    }
    static toBytes(value) {
        return ethers_1.ethers.utils.arrayify(value);
    }
    // simple sign with a private key
    static async signString(wallet, message) {
        return await wallet.signMessage(this.toBytes(message));
    }
    // simple check signature's public key (via address)
    static async checkString(message, sig, targetWallet) {
        const verificationAddress = (0, utils_1.verifyMessage)(this.toBytes(message), sig);
        console.log('verification address:', verificationAddress);
        if (targetWallet !== verificationAddress) {
            return false;
        }
        return true;
    }
    // https://ethereum.org/es/developers/tutorials/eip-1271-smart-contract-signatures/
    // sign 'message hash'
    static async signForContract(wallet, message) {
        const hash = this.getMessageHashAsInContract(message);
        return await wallet.signMessage(this.toBytes(hash));
    }
    // check 'message hash'
    static async checkForContract(message, sig, targetWallet) {
        const hash = this.getMessageHashAsInContract(message);
        const verificationAddress = (0, utils_1.verifyMessage)(ethers_1.ethers.utils.arrayify(hash), sig);
        console.log('verification address:', verificationAddress);
        if (targetWallet !== verificationAddress) {
            return false;
        }
        return true;
    }
    // 0xAAAA == eip155:1:0xAAAAA
    static recoverAddressFromMsg(message, signature) {
        return (0, transactions_1.recoverAddress)((0, hash_1.hashMessage)(message), signature);
    }
    static recoverAddress(hash, signature) {
        return (0, transactions_1.recoverAddress)(hash, signature);
    }
    static ethHash(message) {
        return (0, hash_1.hashMessage)(message);
    }
    static async signBytes(wallet, bytes) {
        const sig = await wallet.signMessage(bytes);
        check_1.Check.isTrue(sig.startsWith('0x'));
        const sigNoPrefix = sig.slice(2);
        const result = bitUtil_1.BitUtil.base16ToBytes(sigNoPrefix);
        check_1.Check.isTrue(result != null && result.length > 0);
        return result;
    }
}
exports.EthUtil = EthUtil;
EthUtil.log = winstonUtil_1.WinstonUtil.newLog(EthUtil);
function Signed(target) { }
//# sourceMappingURL=EthUtil.js.map