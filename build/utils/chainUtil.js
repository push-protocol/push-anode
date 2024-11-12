"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CaipAddr = exports.ChainUtil = void 0;
const strUtil_1 = __importDefault(require("./strUtil"));
class ChainUtil {
    /**
     * caip10 spec https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-10.md
     *
     * @param addressinCAIP or error message
     */
    static parseCaipAddress(addressinCAIP) {
        if (strUtil_1.default.isEmpty(addressinCAIP) || addressinCAIP.trim() === '') {
            return [null, 'Address is empty'];
        }
        const addressComponents = addressinCAIP.split(':');
        let namespace;
        let chainId = null;
        let addr;
        if (addressComponents.length === 3) {
            ;
            [namespace, chainId, addr] = addressComponents;
        }
        else if (addressComponents.length === 2) {
            ;
            [namespace, addr] = addressComponents;
        }
        else {
            return [null, 'Invalid CAIP address format'];
        }
        if (!strUtil_1.default.hasSize(namespace, 1, this.NAMESPACE_MAX)) {
            return [null, `Invalid namespace value: ${namespace}`];
        }
        if (addressComponents.length == 3 && !strUtil_1.default.hasSize(chainId, 1, this.CHAINID_MAX)) {
            return [null, `Invalid chainId value: ${chainId}`];
        }
        const addrNoPrefix = addr.startsWith('0x') ? addr.substring(2) : addr;
        if (!strUtil_1.default.hasSize(addrNoPrefix, 4, this.ADDR_MAX)) {
            return [null, `Invalid address value: ${addr}`];
        }
        return [{ namespace, chainId, addr }, null];
    }
    /*
    Valid addresses:
    eip155:5:0xAAAAAA
    e:1:0
     */
    static isFullCAIPAddress(fullCaipAddress) {
        const [caip, err] = ChainUtil.parseCaipAddress(fullCaipAddress);
        if (err != null) {
            return false;
        }
        const valid = !strUtil_1.default.isEmpty(caip.chainId) &&
            !strUtil_1.default.isEmpty(caip.namespace) &&
            !strUtil_1.default.isEmpty(caip.addr);
        return valid;
    }
}
exports.ChainUtil = ChainUtil;
ChainUtil.ADDR_MAX = 64;
ChainUtil.NAMESPACE_MAX = 8;
ChainUtil.CHAINID_MAX = 32;
// ex: eip155:5:0xD8634C39BBFd4033c0d3289C4515275102423681
class CaipAddr {
}
exports.CaipAddr = CaipAddr;
//# sourceMappingURL=chainUtil.js.map