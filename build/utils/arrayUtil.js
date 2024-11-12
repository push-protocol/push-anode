"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArrayUtil = void 0;
class ArrayUtil {
    static isEmpty(arr) {
        if (arr == null) {
            return true;
        }
        if (typeof arr !== 'object') {
            return false;
        }
        return arr.length === 0;
    }
    static isArrayEmpty(array) {
        return array == null || array.length === 0;
    }
    static hasMinSize(array, minSize) {
        if (minSize === 0) {
            return ArrayUtil.isArrayEmpty(array);
        }
        return array.length >= minSize;
    }
    static isEqual(arr0, arr1) {
        if (arr0 == null && arr1 == null) {
            return true;
        }
        if (arr0 == arr1) {
            return true;
        }
        if (arr0.length !== arr1.length) {
            return false;
        }
        return Buffer.from(arr0).equals(Buffer.from(arr1));
    }
}
exports.ArrayUtil = ArrayUtil;
//# sourceMappingURL=arrayUtil.js.map