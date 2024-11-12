"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Check = void 0;
const strUtil_1 = __importDefault(require("./strUtil"));
class Check {
    static isTrue(condition, err) {
        if (!condition) {
            throw new Error(strUtil_1.default.isEmpty(err) ? 'Assertion failed' : err);
        }
    }
    static notNull(condition, err) {
        if (condition == null) {
            throw new Error(strUtil_1.default.isEmpty(err) ? 'Null check failed' : err);
        }
    }
    // todo make var types
    static notEmpty(value, err) {
        if (strUtil_1.default.isEmpty(value)) {
            throw new Error(strUtil_1.default.isEmpty(err) ? 'Str empty check failed' : err);
        }
    }
    static notEmptyArr(value, err) {
        if (value == null || value.length == 0) {
            throw new Error(strUtil_1.default.isEmpty(err) ? 'Str empty check failed' : err);
        }
    }
    static notEmptySet(value, err) {
        if (value == null || value.size == 0) {
            throw new Error(strUtil_1.default.isEmpty(err) ? 'Set empty check failed' : err);
        }
    }
    static isEqual(a, b, err) {
        return a === b;
    }
}
exports.Check = Check;
//# sourceMappingURL=check.js.map