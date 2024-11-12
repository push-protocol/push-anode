"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvLoader = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const strUtil_1 = __importDefault(require("./strUtil"));
const numUtil_1 = require("./numUtil");
class EnvLoader {
    static loadEnvOrFail() {
        const envFound = dotenv_1.default.config();
        if (envFound.error) {
            throw new Error("⚠️  Couldn't find .env file  ⚠️");
        }
    }
    static getPropertyOrFail(propName) {
        const val = process.env[propName];
        if (strUtil_1.default.isEmpty(val)) {
            throw new Error(`process.env.${propName} is empty`);
        }
        return val; // Assert that it's a string here
    }
    static getPropertyAsBool(propName) {
        const val = process.env[propName];
        return val != null && val.toLowerCase() === 'true';
    }
    static getPropertyOrDefault(propName, def) {
        const val = process.env[propName];
        return strUtil_1.default.isEmpty(val) ? def : (val !== null && val !== void 0 ? val : def);
    }
    static getPropertyAsNumber(propName, defaultValue) {
        const val = process.env[propName];
        return numUtil_1.NumUtil.parseInt(val, defaultValue);
    }
}
exports.EnvLoader = EnvLoader;
//# sourceMappingURL=envLoader.js.map