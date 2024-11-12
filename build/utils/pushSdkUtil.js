"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SigCheck = exports.PushSdkUtil = void 0;
const ethers_1 = require("ethers");
const tweetnacl_1 = __importDefault(require("tweetnacl"));
const bs58_1 = __importDefault(require("bs58"));
const sha256_1 = require("@noble/hashes/sha256");
const util_1 = __importDefault(require("util"));
const utils_1 = require("ethers/lib/utils");
const transactions_1 = require("@ethersproject/transactions");
const bech32_1 = require("bech32");
const hexes = /*#__PURE__*/ Array.from({ length: 256 }, (_v, i) => i.toString(16).padStart(2, '0'));
/*
A utility SDK class which is shared between back and front.
Provides signature validation logic which should be in sync.

Rules:
1. Don't use any utility classes
2. Only public libs which work in the browser
3. NO BACKEND DEPENDENCIES: THIS IS FRONT END LIB

*/
class PushSdkUtil {
    static async checkPushInitDidSignature(masterPublicKeyUncompressed, msgBytes, sig) {
        const masterAddrStr = (0, transactions_1.computeAddress)(masterPublicKeyUncompressed).toLowerCase();
        const hashBytes = this.messageBytesToHashBytes(msgBytes);
        const recoverAddrStr = (0, utils_1.verifyMessage)(hashBytes, sig).toLowerCase();
        if (recoverAddrStr !== masterAddrStr) {
            return SigCheck.failWithText(`masterPublicKey address ${masterAddrStr} differs from signature addr ${recoverAddrStr}`);
        }
        return SigCheck.ok();
    }
    static async checkPushNetworkSignature(caipNamespace, caipChainId, caipAddr, msgBytes, sig) {
        const hashBytes = this.messageBytesToHashBytes(msgBytes);
        if (caipNamespace === 'push') {
            // PUSH NETWORK SIGNATURES
            const evmAddr = this.pushAddrToEvmAddr(caipAddr);
            const recoveredAddr = ethers_1.ethers.utils.recoverAddress(ethers_1.ethers.utils.hashMessage(hashBytes), sig);
            const valid = (recoveredAddr === null || recoveredAddr === void 0 ? void 0 : recoveredAddr.toLowerCase()) === (evmAddr === null || evmAddr === void 0 ? void 0 : evmAddr.toLowerCase());
            if (!valid) {
                return SigCheck.failWithText(`sender address ${caipAddr} does not match recovered address ${recoveredAddr} signature was: ${sig}`);
            }
            return SigCheck.ok();
        }
        else if (caipNamespace === 'eip155') {
            // EVM SIGNATURES
            const recoveredAddr = ethers_1.ethers.utils.recoverAddress(ethers_1.ethers.utils.hashMessage(hashBytes), sig);
            const valid = recoveredAddr === caipAddr;
            if (!valid) {
                return SigCheck.failWithText(`sender address ${caipAddr} does not match recovered address ${recoveredAddr} signature was: ${sig}`);
            }
            return SigCheck.ok();
        }
        else if (caipNamespace === 'solana') {
            // SOLANA SIGNATURES
            const expectedPubKey = bs58_1.default.decode(caipAddr);
            const valid = tweetnacl_1.default.sign.detached.verify(hashBytes, sig, expectedPubKey);
            if (!valid) {
                return SigCheck.failWithText(`sender address ${caipAddr} does not match with signature: ${sig}`);
            }
            return SigCheck.ok();
        }
        else {
            return SigCheck.failWithText(`unsupported chain id: ${caipNamespace}`);
        }
    }
    /**
     * Converts a Push (bech32m) address to an EVM address
     * @param address Push address,
     * ex: pushconsumer1ulpxwud78ctaar5zgeuhmju5k8gpz8najcvxkn
     * @returns EVM address in checksum format,
     * ex: 0xE7C26771bE3E17dE8e8246797DCB94b1D0111E7D
     */
    static pushAddrToEvmAddr(address) {
        const decoded = bech32_1.bech32m.decode(address);
        const bytes = new Uint8Array(bech32_1.bech32m.fromWords(decoded.words));
        const result = (0, utils_1.getAddress)(this.toHex(bytes));
        return result;
    }
    ;
    /**
     * For some web3 wallet compatibility we cannot sign
     * 1. raw bytes - Phantom tries to decode this (https://docs.phantom.app/solana/signing-a-message)
     * 2. base16 text - Metamask adds 0x prefix
     * 3. long base16 text - this breaks UX
     *
     * So the only good option to sign is to use
     * 1. short
     * 2. 0x prefixed
     * 3. string
     * 4. in utf8 bytes
     *
     * so we try to convert this payload into a 0xSHA bytes first
     * @param payload
     */
    static messageBytesToHashBytes(payload) {
        const txSha = (0, sha256_1.sha256)(payload); // raw bytes (non ascii)
        const hexedSha = this.toHex(txSha);
        const textShaInBytesUtf8 = new util_1.default.TextEncoder().encode(hexedSha); // utf-8
        return textShaInBytesUtf8;
    }
    static toHex(value) {
        let string = '';
        for (let i = 0; i < value.length; i++) {
            string += hexes[value[i]];
        }
        const hex = `0x${string}`;
        return hex;
    }
    static hex0xRemove(hexString) {
        if (hexString.length >= 2 && (hexString.startsWith('0x') || hexString.startsWith('0X'))) {
            hexString = hexString.substring(2);
        }
        if (hexString.length % 2 == 1) {
            hexString = '0' + hexString;
        }
        return hexString.toLowerCase();
    }
}
exports.PushSdkUtil = PushSdkUtil;
class SigCheck {
    static failWithText(err) {
        return { success: false, err: err };
    }
    static ok() {
        return { success: true, err: '' };
    }
}
exports.SigCheck = SigCheck;
//# sourceMappingURL=pushSdkUtil.js.map