"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RpcUtils = void 0;
const axios_1 = __importDefault(require("axios"));
class RpcUtils {
    constructor(_baseUrl, _functionName, _params) {
        this.baseUrl = _baseUrl;
        this.functionName = _functionName;
        this.params = _params;
        this.payload = {
            jsonrpc: '2.0',
            method: this.functionName,
            params: this.params,
            id: 1
        };
    }
    async call() {
        return await axios_1.default.post(this.baseUrl, this.payload, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
}
exports.RpcUtils = RpcUtils;
//# sourceMappingURL=rpcUtil.js.map