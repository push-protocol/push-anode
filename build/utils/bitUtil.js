"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BitUtil = void 0;
const coll_1 = require("./coll");
// @ts-ignore
const bs58_1 = __importDefault(require("bs58"));
const check_1 = require("./check");
// bytes      (as hex numbers)            = 0x41 0x41 0x42 0x42
// Uint8Array (as decimal numbers)        = 65 65 66 66
//        string (as non printable chars) = ..
// base16 string                          = 0xAABB
// base64 string                          = QUFCQg==
class BitUtil {
    /**
     * XORs 2 buffers, byte by byte: src = src XOR add
     * 1 modifies src
     * 2 returns srs || src's resized copy in case there is no room for add bytes
     *
     * @param src
     * @param add
     */
    static xor(src, add) {
        if (src == null && add == null) {
            return Buffer.alloc(0);
        }
        else if (add == null) {
            return src;
        }
        else if (src == null) {
            src = new Buffer(add.length);
            add.copy(src, 0, 0, add.length);
            return src;
        }
        let target = src;
        if (add.length > src.length) {
            target = new Buffer(add.length);
            src.copy(target, 0, 0, src.length);
        }
        const length = Math.min(target.length, add.length);
        for (let i = 0; i < length; ++i) {
            target[i] = target[i] ^ add[i];
        }
        return target;
    }
    static strToBase64(value) {
        return Buffer.from(value).toString('base64');
    }
    static base64ToStr(value) {
        return Buffer.from(value, 'base64').toString('utf8');
    }
    static getBit(number, bitOffset) {
        return (number & (1 << bitOffset)) === 0 ? 0 : 1;
    }
    static bitsToPositions(number) {
        // return null;
        const result = [];
        let position = 0;
        while (number !== 0) {
            if ((number & 1) === 1) {
                result.push(position);
            }
            number = number >>> 1;
            position++;
        }
        coll_1.Coll.sortNumbersAsc(result);
        return result;
    }
    static base16ToBytes(base16String) {
        if (base16String.length % 2 == 1) {
            base16String = '0' + base16String;
        }
        const result = Uint8Array.from(Buffer.from(base16String, 'hex'));
        const conversionHadNoErrors = base16String.length == 0 || result.length == base16String.length / 2;
        check_1.Check.isTrue(conversionHadNoErrors, 'failed to convert hex string ' + base16String);
        return result;
    }
    static bytesToBase16(arr) {
        return Buffer.from(arr).toString('hex');
    }
    static bytesBufToBase16(buf) {
        return buf.toString('hex');
    }
    static base64ToString(base64String) {
        return Buffer.from(base64String, 'base64').toString('utf8');
    }
    static bytesToBase64(bytes) {
        return Buffer.from(bytes).toString('base64');
    }
    static base64ToBytes(base64String) {
        return new Uint8Array(Buffer.from(base64String, 'base64'));
    }
    static bytesUtfToString(bytes) {
        return Buffer.from(bytes).toString('utf8');
    }
    static stringToBytesUtf(str) {
        return new Uint8Array(Buffer.from(str, 'utf-8'));
    }
    static stringToBase64(str) {
        return Buffer.from(str, 'utf-8').toString('base64');
    }
    static base64ToBase16(base64String) {
        return Buffer.from(base64String, 'base64').toString('hex');
    }
    static base58ToBytes(base58String) {
        return bs58_1.default.decode(base58String);
    }
    static bytesToBase58(bytes) {
        return bs58_1.default.encode(bytes);
    }
    static asciiToBase16(char) {
        const a = this.asciis;
        if (char >= a._0 && char <= a._9)
            return char - a._0;
        if (char >= a._A && char <= a._F)
            return char - (a._A - 10);
        if (char >= a._a && char <= a._f)
            return char - (a._a - 10);
        return;
    }
    static hex0xToBytes(hexString) {
        hexString = this.hex0xRemove(hexString);
        const result = this.base16ToBytes(hexString);
        // there is no way to check for illegal characters without iterating over each char
        // and Buffer silently ignores invalid chars
        // so we will simply compare the output length; it should be 1 byte per 2 chars of input!
        const conversionHadNoErrors = result.length == hexString.length / 2;
        check_1.Check.isTrue(hexString.length == 0 || conversionHadNoErrors, 'hex string contains invalid chars');
        return result;
    }
    static hex0xRemove(hexString) {
        check_1.Check.notNull(hexString, 'hex string is null');
        check_1.Check.isTrue(typeof hexString === 'string', 'string is expected');
        if (hexString.length >= 2 && (hexString.startsWith('0x') || hexString.startsWith('0X'))) {
            hexString = hexString.substring(2);
        }
        if (hexString.length % 2 == 1) {
            hexString = '0' + hexString;
        }
        return hexString.toLowerCase();
    }
    static hex0xAppend(hexString) {
        check_1.Check.notNull(hexString, 'hex string is null');
        check_1.Check.isTrue(typeof hexString === 'string', 'string is expected');
        if (hexString.length >= 2 && (hexString.startsWith('0x') || hexString.startsWith('0X'))) {
            return hexString;
        }
        return '0x' + hexString;
    }
}
exports.BitUtil = BitUtil;
BitUtil.asciis = { _0: 48, _9: 57, _A: 65, _F: 70, _a: 97, _f: 102 };
//# sourceMappingURL=bitUtil.js.map