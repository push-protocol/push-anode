"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bitUtil_1 = require("./bitUtil");
class StrUtil {
    static replaceAll(str, find, replace, regexFlags) {
        let gFlag = false;
        if (typeof str !== 'string') {
            throw new TypeError('`str` parameter must be a string!');
        }
        if (!Array.isArray(find)) {
            throw new TypeError('`find` parameter must be an array!');
        }
        if (!Array.isArray(replace)) {
            throw new TypeError('`replace` parameter must be an array!');
        }
        if (!find.length || !replace.length) {
            throw new Error('`find` and `replace` parameters must not be empty!');
        }
        if (find.length !== replace.length) {
            throw new Error('`find` and `replace` parameters must be equal in length!');
        }
        if (regexFlags) {
            if (typeof regexFlags !== 'string') {
                throw new TypeError('`regexFlags` parameter must be a string!');
            }
            else if (~regexFlags.indexOf('g')) {
                gFlag = true;
            }
            else {
                regexFlags += 'g';
            }
        }
        else {
            regexFlags = 'g';
        }
        const done = [];
        const joined = find.join(')|(');
        const regex = new RegExp('(' + joined + ')', regexFlags);
        return str.replace(regex, (match, ...finds) => {
            let replaced;
            finds.some((found, index) => {
                if (found !== undefined) {
                    if (gFlag) {
                        replaced = replace[index];
                    }
                    else if (!~done.indexOf(found)) {
                        done.push(found);
                        replaced = replace[index];
                    }
                    else {
                        replaced = found;
                    }
                    return true;
                }
            });
            return replaced;
        });
    }
    /**
     * replaces MySql placeholders ? with Postre placehoslers $1 $2 $3
     * example:
     * aaaa?bbbb?cccc? => aaaa$1bbbb$2cccc$3
     */
    static replaceAllMySqlToPostre(s) {
        let cnt = 1;
        return s.replace(/\?/g, function () {
            return `$${cnt++}`;
        });
    }
    static isEmpty(s) {
        if (s == null) {
            return true;
        }
        if (typeof s !== 'string') {
            return false;
        }
        return s.length === 0;
    }
    static hasSize(s, minSize, maxSize) {
        if (s == null || typeof s !== 'string') {
            return false;
        }
        const length = s.length;
        if (minSize !== null && length < minSize) {
            return false;
        }
        if (maxSize !== null && length > maxSize) {
            return false;
        }
        return true;
    }
    static isHex(s) {
        if (StrUtil.isEmpty(s)) {
            return false;
        }
        const pattern = /^[A-F0-9]+$/i;
        const result = pattern.test(s);
        return result;
    }
    /**
     * Return s if this is not empty, defaultValue otherwise
     * @param s
     * @param defaultValue
     */
    static getOrDefault(s, defaultValue) {
        return StrUtil.isEmpty(s) ? defaultValue : s;
    }
    static toStringDeep(obj) {
        return JSON.stringify(obj, null, 4);
    }
    // https://ethereum.stackexchange.com/questions/2045/is-ethereum-wallet-address-case-sensitive
    static normalizeEthAddress(addr) {
        return addr;
    }
    static fmtProtoBytes(obj) {
        if (typeof obj.serializeBinary === 'function') {
            return StrUtil.fmt(obj.serializeBinary());
        }
    }
    static fmtProtoObj(obj) {
        if (typeof obj.toObject === 'function') {
            return StrUtil.fmt(obj.toObject());
        }
    }
    // write a good recurive format for every possible type
    static fmt(obj, visited = new WeakMap()) {
        if (obj === null) {
            return 'null';
        }
        if (obj === undefined) {
            return 'undef';
        }
        if (typeof obj === 'boolean') {
            return '' + obj;
        }
        if (typeof obj === 'bigint') {
            return '' + obj.toString();
        }
        if (typeof obj === 'function' || typeof obj === 'symbol') {
            return '?';
        }
        if (typeof obj === 'string') {
            return "'" + obj + "'";
        }
        if (typeof obj === 'number') {
            return '' + obj;
        }
        if (typeof obj === 'object') {
            if (visited.has(obj)) {
                return '[Circular]';
            }
            try {
                visited.set(obj, 0);
                if (obj instanceof Date) {
                    return obj.toISOString();
                }
                if (obj instanceof RegExp) {
                    return obj.toString();
                }
                if (obj instanceof Error) {
                    return `Error:${obj.message}`;
                }
                if (obj instanceof Uint8Array) {
                    return bitUtil_1.BitUtil.bytesToBase16(obj);
                }
                if (obj instanceof Buffer) {
                    return obj.toString('hex');
                }
                if (typeof obj.serializeBinary === 'function') {
                    const result = obj.serializeBinary();
                    if (result instanceof Uint8Array) {
                        return StrUtil.fmtProtoObj(obj);
                    }
                }
                if (Array.isArray(obj)) {
                    let result = '';
                    obj.forEach((val, index, array) => {
                        if (result.length != 0) {
                            result += ',';
                        }
                        result += StrUtil.fmt(val, visited);
                    });
                    return '[' + result + ']';
                }
                if (obj instanceof Set) {
                    let result = '';
                    obj.forEach((value, value2, set) => {
                        if (result.length != 0) {
                            result += ',';
                        }
                        result += StrUtil.fmt(value, visited);
                    });
                    return '[[' + result + ']]';
                }
                if (obj instanceof Map) {
                    let result = '';
                    obj.forEach((value, key) => {
                        if (result.length != 0) {
                            result += ',';
                        }
                        const fmtKey = StrUtil.fmt(key, visited);
                        const fmtValue = StrUtil.fmt(value, visited);
                        result += `${fmtKey}->${fmtValue}`;
                    });
                    return '[[' + result + ']]';
                }
                if (obj instanceof Object) {
                    let result = '';
                    for (const key in obj) {
                        if (Object.prototype.hasOwnProperty.call(obj, key)) {
                            if (result.length != 0) {
                                result += ',';
                            }
                            const value = obj[key];
                            const fmtValue = StrUtil.fmt(value, visited);
                            result += `${key}:${fmtValue}`;
                        }
                    }
                    return '{' + result + '}';
                }
            }
            finally {
                visited.delete(obj);
            }
        }
        return '?';
    }
}
exports.default = StrUtil;
//# sourceMappingURL=strUtil.js.map