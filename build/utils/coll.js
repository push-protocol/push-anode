"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Coll = void 0;
// CollectionUtils
// all the proper type safe way to work with JS collections/sets/arrays
class Coll {
    static arrayToMap(arr, keyField) {
        if (arr == null || arr.length == 0) {
            return new Map();
        }
        return new Map(arr.map((value) => [value[keyField], value]));
    }
    static mapValuesToArray(map) {
        if (map == null || map.size == 0) {
            return [];
        }
        return [...map.values()];
    }
    static mapKeysToArray(map) {
        if (map == null || map.size == 0) {
            return [];
        }
        return [...map.keys()];
    }
    static arrayToSet(arr) {
        if (arr == null) {
            return new Set();
        }
        return new Set(arr);
    }
    static arrayToFields(arr, keyField) {
        const arrayOfFields = arr.map((obj) => obj[keyField]);
        return new Set(arrayOfFields);
    }
    static findIndex(arr, filter) {
        if (arr == null) {
            return -1;
        }
        return arr.findIndex(filter);
    }
    static setToArray(set) {
        if (set == null) {
            return [];
        }
        return Array.from(set.keys());
    }
    // [1,2,3] - [2,3] = [1]
    static substractSet(set1, set2) {
        return new Set([...set1].filter((x) => !set2.has(x)));
    }
    // [1,2,3] x [2, 3] = [2,3]
    static intersectSet(set1, set2) {
        return new Set([...set1].filter((x) => set2.has(x)));
    }
    // [1,2,3] x [2, 3] = [2,3]
    static addSet(set1, set2) {
        return new Set([...set1, ...set2]);
    }
    static sortNumbersAsc(array) {
        if (array == null || array.length == 0) {
            return;
        }
        array.sort((a, b) => {
            return a - b;
        });
    }
    static isEqualSet(a, b) {
        if (a === b)
            return true;
        if (a.size !== b.size)
            return false;
        for (const value of a) {
            if (!b.has(value)) {
                return false;
            }
        }
        return true;
    }
    // parse '[1,2,3]' into Set<number>: 1,2,3
    static parseAsNumberSet(jsonArray) {
        const arr = JSON.parse(jsonArray);
        return Coll.arrayToSet(arr);
    }
    // store set 1,2,3 as array: [1,2,3]
    static numberSetToJson(s) {
        return JSON.stringify([...s]);
    }
    // set 1,2,3 to sql: ('1','2','3')
    static numberSetToSqlQuoted(s) {
        return ('(' +
            Coll.setToArray(s)
                .map((num) => "'" + num + "'")
                .join(',') +
            ')');
    }
}
exports.Coll = Coll;
//# sourceMappingURL=coll.js.map