"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.jsonLogTransport = exports.consoleTransport = exports.customColors = exports.customLevels = void 0;
const winston_1 = __importDefault(require("winston"));
const winstonUtil_1 = require("../utils/winstonUtil"); // Adjust based on your project structure
const envLoader_1 = require("../utils/envLoader");
// Define custom log levels
exports.customLevels = {
    levels: {
        error: 0,
        warn: 1,
        info: 2,
        debug: 3,
    },
};
// Define custom log colors separately
exports.customColors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    debug: 'blue',
};
// Log formatting logic
const formatLogInfo = (info) => {
    const { level, message, meta } = info;
    const timestamp = new Date().toISOString();
    const metaMsg = meta ? `: ${JSON.stringify(meta, null, 2)}` : '';
    let className = info.className || '';
    className = className ? `[${className}] ` : '';
    return `${timestamp} ${level.toUpperCase()}: ${className}${message}${metaMsg}`;
};
// Formatter for winston
const formatter = winston_1.default.format.combine(winston_1.default.format.errors({ stack: true }), winston_1.default.format.splat(), winston_1.default.format.colorize(), winston_1.default.format.printf((info) => formatLogInfo(info)));
// Console transport
exports.consoleTransport = new winston_1.default.transports.Console({
    format: formatter,
});
// JSON log file transport
exports.jsonLogTransport = new winston_1.default.transports.File({
    level: 'info',
    filename: `${envLoader_1.EnvLoader.getPropertyOrFail('LOG_DIR')}/app.log`,
    handleExceptions: true,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
    format: winston_1.default.format.combine(winston_1.default.format.json()),
});
// Setup logger transports
const transports = [exports.consoleTransport, exports.jsonLogTransport];
if (envLoader_1.EnvLoader.getPropertyAsBool('VALIDATOR_DEBUG_LOG')) {
    transports.push(winstonUtil_1.WinstonUtil.debugFileTransport, winstonUtil_1.WinstonUtil.errorFileTransport);
}
// Create logger instance
const LoggerInstance = winston_1.default.createLogger({
    level: 'debug', // Use string 'debug' instead of a number
    levels: exports.customLevels.levels, // This defines the custom numeric levels
    format: winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.json()),
    transports,
});
// Apply colors for custom levels
winston_1.default.addColors(exports.customColors);
exports.default = LoggerInstance;
//# sourceMappingURL=logger.js.map