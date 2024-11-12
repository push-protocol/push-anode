"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObjectHasher = void 0;
const object_hash_1 = __importDefault(require("object-hash"));
/**
 * Allows to build a consistent hash out of a json object
 */
class ObjectHasher {
    // todo Object.assign(target, src)
    /**
     * Returns hex string
     * ex: de5ed3919975ece48c922a6380b59efc8638967ed236e0892164cc17ccfbf87b
     * @param obj json object
     */
    static hashToSha256(obj) {
        return (0, object_hash_1.default)(obj, ObjectHasher.options);
    }
    static hashToSha256IgnoreSig(obj) {
        return (0, object_hash_1.default)(obj, Object.assign(Object.assign({}, ObjectHasher.options), { excludeKeys: function (propName) {
                return 'signature' === propName;
            } }));
    }
    static hashToSha256IgnoreRecipientsResolved(obj) {
        return (0, object_hash_1.default)(obj, Object.assign(Object.assign({}, ObjectHasher.options), { excludeKeys: function (propName) {
                return 'recipientsResolved' === propName;
            } }));
    }
}
exports.ObjectHasher = ObjectHasher;
ObjectHasher.options = {
    algorithm: 'sha256',
    encoding: 'hex',
    respectFunctionProperties: false, // skip functions
    respectFunctionNames: false, // skip function names
    respectType: false, // skip class info
    unorderedArrays: false, // don't sort arrays before hash
    unorderedSets: false, // don't sort sets before hash
    unorderedObjects: true, // sort object properties before hash
};
//# sourceMappingURL=objectHasher.js.map