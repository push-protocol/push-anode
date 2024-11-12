"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NumUtil = void 0;
class NumUtil {
    static parseInt(val, defaultValue) {
        if (val === null) {
            return defaultValue;
        }
        const valN = typeof val === 'string' ? Number(val) : val;
        if (isNaN(valN)) {
            return defaultValue;
        }
        return this.isRoundedInteger(valN) ? valN : Math.round(valN);
    }
    static isRoundedInteger(valN) {
        return Number.isInteger(valN);
    }
    static toString(value) {
        if (value == null) {
            return '';
        }
        return '' + value;
    }
}
exports.NumUtil = NumUtil;
//# sourceMappingURL=numUtil.js.map