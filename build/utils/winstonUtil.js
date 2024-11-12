"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WinstonUtil = void 0;
const ts_luxon_1 = require("ts-luxon");
const winston_1 = __importDefault(require("winston"));
const strUtil_1 = __importDefault(require("./strUtil"));
const envLoader_1 = require("./envLoader");
const logger_1 = require("../logger/logger"); // Adjust the import path based on your structure
class WinstonUtil {
    static renderFormat2(info) {
        const { level, message, meta } = info;
        const levelFirstChar = level == null ? '' : level.toUpperCase()[0];
        const date = ts_luxon_1.DateTime.now();
        const formattedDate = date.toFormat('yyMMdd HHmmss');
        const className = info.className;
        const formattedClassName = strUtil_1.default.isEmpty(className)
            ? ' '
            : (' [' + className.substring(0, this.CLASS_NAME_LENGTH) + '] ').padEnd(this.CLASS_NAME_LENGTH + 4);
        const metaAsString = meta == null ? '' : meta;
        return `${levelFirstChar} ${formattedDate}${formattedClassName}${message} ${metaAsString}`;
    }
    static createFormat1WhichSetsClassName(className) {
        return winston_1.default.format.combine(winston_1.default.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss',
        }), winston_1.default.format.errors({ stack: true }), winston_1.default.format.splat(), winston_1.default.format.json(), winston_1.default.format.printf((info) => {
            info['className'] = className;
            return '';
        }));
    }
    static createFormat2WhichRendersClassName() {
        return winston_1.default.format.combine(winston_1.default.format.errors({ stack: true }), winston_1.default.format.splat(), winston_1.default.format.printf((info) => {
            return WinstonUtil.renderFormat2(info);
        }));
    }
    static newLog(classNameOrClass) {
        let loggerName = typeof classNameOrClass === 'string'
            ? classNameOrClass
            : classNameOrClass === null || classNameOrClass === void 0 ? void 0 : classNameOrClass.name;
        loggerName = loggerName
            ? loggerName.substring(0, this.CLASS_NAME_LENGTH)
            : '';
        let loggerObj = WinstonUtil.loggerMap.get(loggerName);
        if (loggerObj) {
            return loggerObj;
        }
        loggerObj = winston_1.default.createLogger({
            level: 'debug', // Use string 'debug' instead of customLevels.levels.debug
            format: this.createFormat1WhichSetsClassName(loggerName),
            transports: [
                logger_1.consoleTransport,
                logger_1.jsonLogTransport,
                this.debugFileTransport,
                this.errorFileTransport,
            ],
        });
        WinstonUtil.loggerMap.set(loggerName, loggerObj);
        return loggerObj;
    }
}
exports.WinstonUtil = WinstonUtil;
WinstonUtil.CLASS_NAME_LENGTH = 23;
WinstonUtil.loggerMap = new Map();
WinstonUtil.debugFileTransport = new winston_1.default.transports.File({
    level: 'debug',
    filename: `${envLoader_1.EnvLoader.getPropertyOrFail('LOG_DIR')}/debug.log`,
    handleExceptions: true,
    maxsize: 5242880,
    maxFiles: 5,
    tailable: true,
    format: WinstonUtil.createFormat2WhichRendersClassName(),
});
WinstonUtil.errorFileTransport = new winston_1.default.transports.File({
    level: 'error',
    filename: `${envLoader_1.EnvLoader.getPropertyOrFail('LOG_DIR')}/error.log`,
    handleExceptions: true,
    maxsize: 5242880,
    maxFiles: 5,
    tailable: true,
    format: WinstonUtil.createFormat2WhichRendersClassName(),
});
//# sourceMappingURL=winstonUtil.js.map