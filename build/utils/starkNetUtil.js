"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StarkNetUtil = void 0;
const starknet_1 = require("starknet");
const bitUtil_1 = require("./bitUtil");
class StarkNetUtil {
    static signBytes(walletPrivKey, msgBytes) {
        const convertedMsg = Array.from(msgBytes);
        const msgHash = starknet_1.hash.computeHashOnElements(convertedMsg);
        const signature = starknet_1.ec.starkCurve.sign(msgHash, walletPrivKey);
        return signature.toCompactRawBytes();
    }
    static checkSignatureWithFullPublicKey(walletFullPubKey, msgBytes, signature) {
        const convertedMsg = Array.from(msgBytes);
        const msgHash = starknet_1.hash.computeHashOnElements(convertedMsg);
        const result = starknet_1.ec.starkCurve.verify(signature, msgHash, walletFullPubKey);
        console.log('Result (boolean) =', result);
        return result;
    }
    static checkSignature(walletAddress, msgBytes, signature) {
        const convertedMsg = Array.from(msgBytes);
        const msgHash = starknet_1.hash.computeHashOnElements(convertedMsg);
        const result = starknet_1.ec.starkCurve.verify(signature, msgHash, walletAddress);
        console.log('Result (boolean) =', result);
        return result;
    }
    // public static isFullPubKeyRelatedToAccount() {
    //   return
    //     publicKey.publicKey == BigInt(encode.addHexPrefix(fullPublicKey.slice(4, 68)));
    // }
    static convertPrivKeyToPubKey(walletPrivateKey) {
        return starknet_1.ec.starkCurve.getPublicKey(walletPrivateKey, false);
    }
    static convertPubKeyToAddr(pubKey) {
        return bitUtil_1.BitUtil.bytesToBase16(pubKey);
    }
    static convertPrivKeyToAddr(starkNetPrivateKey) {
        const pubKey = StarkNetUtil.convertPrivKeyToPubKey(starkNetPrivateKey);
        const addrStr = StarkNetUtil.convertPubKeyToAddr(pubKey);
        return addrStr;
    }
    static convertAddrToPubKey(starkNetAddress) {
        return bitUtil_1.BitUtil.base16ToBytes(starkNetAddress);
    }
}
exports.StarkNetUtil = StarkNetUtil;
//# sourceMappingURL=starkNetUtil.js.map