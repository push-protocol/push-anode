"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EthSig = void 0;
exports.Signed = Signed;
const utils_1 = require("ethers/lib/utils");
const objectHasher_1 = require("./objectHasher");
/**
 * Utitily class that allows
 * - to sign objects with an eth private key
 * - to check that signature later
 *
 * Ignores 'signature' properties
 */
class EthSig {
    static async create(wallet, ...object) {
        const ethMessage = objectHasher_1.ObjectHasher.hashToSha256IgnoreSig(object);
        const sig = await wallet.signMessage(ethMessage);
        return sig;
    }
    static check(sig, targetWallet, ...object) {
        const ethMessage = objectHasher_1.ObjectHasher.hashToSha256IgnoreSig(object);
        const verificationAddress = (0, utils_1.verifyMessage)(ethMessage, sig);
        if (targetWallet !== verificationAddress) {
            return false;
        }
        return true;
    }
    static isEthZero(addr) {
        return '0x0000000000000000000000000000000000000000' === addr;
    }
}
exports.EthSig = EthSig;
function Signed(target) { }
//# sourceMappingURL=ethSig.js.map