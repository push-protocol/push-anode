"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SolUtil = void 0;
const web3_js_1 = require("@solana/web3.js");
const tweetnacl_1 = __importDefault(require("tweetnacl"));
const bitUtil_1 = require("./bitUtil");
const check_1 = require("./check");
class SolUtil {
    static signBytes(walletPrivKey, msgBytes) {
        const signature = tweetnacl_1.default.sign.detached(msgBytes, walletPrivKey);
        check_1.Check.isTrue(signature != null && signature.length > 0);
        return signature;
    }
    static checkSignature(walletPubKey, msgBytes, signature) {
        const result = tweetnacl_1.default.sign.detached.verify(msgBytes, signature, walletPubKey);
        return result;
    }
    static convertAddrToPubKey(solAddress) {
        return bitUtil_1.BitUtil.base58ToBytes(solAddress);
    }
    static convertPubKeyToAddr(pubKey) {
        return bitUtil_1.BitUtil.bytesToBase58(pubKey);
    }
    static convertPrivKeyToPubKey(solanaPrivateKey) {
        const keypair = web3_js_1.Keypair.fromSecretKey(solanaPrivateKey);
        const pubKey = keypair.publicKey;
        return pubKey.toBytes();
    }
    static convertPrivKeyToAddr(solanaPrivateKey) {
        const pubKey = SolUtil.convertPrivKeyToPubKey(solanaPrivateKey);
        const addrStr = SolUtil.convertPubKeyToAddr(pubKey);
        return addrStr;
    }
}
exports.SolUtil = SolUtil;
//# sourceMappingURL=solUtil.js.map