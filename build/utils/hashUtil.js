"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HashUtil = void 0;
const crypto_1 = __importDefault(require("crypto"));
const CryptoJS = __importStar(require("crypto-js"));
// todo use a better lib
class HashUtil {
    // for readability
    static arrayToWordArray(data) {
        return CryptoJS.lib.WordArray.create(data);
    }
    // for readability
    static wordArrayToArray(shaAsWordArray) {
        const hexString = CryptoJS.enc.Hex.stringify(shaAsWordArray);
        const shaAsArray = Uint8Array.from(Buffer.from(hexString, 'hex'));
        return shaAsArray;
    }
    static sha256AsBytes(data) {
        const wa = HashUtil.arrayToWordArray(data);
        const shaAsWordArray = CryptoJS.SHA256(wa);
        return HashUtil.wordArrayToArray(shaAsWordArray);
    }
    static sha256ArrayAsBytes(data) {
        const sha256 = CryptoJS.algo.SHA256.create();
        for (const chunk of data) {
            const wa = HashUtil.arrayToWordArray(chunk);
            sha256.update(wa);
        }
        const shaAsWordArray = sha256.finalize();
        return HashUtil.wordArrayToArray(shaAsWordArray);
    }
    // todo compare this hash with crypto-js
    static sha512ArrayAsBytes(data) {
        const hasher = crypto_1.default.createHash('sha512');
        for (const arr of data) {
            hasher.update(arr);
        }
        const hash = hasher.digest();
        return new Uint8Array(hash);
    }
    // todo compare this hash with crypto-js
    static sha256AsBytesEx(data) {
        const hasher = crypto_1.default.createHash('sha256');
        hasher.update(data);
        const hash = hasher.digest();
        return new Uint8Array(hash);
    }
}
exports.HashUtil = HashUtil;
//# sourceMappingURL=hashUtil.js.map