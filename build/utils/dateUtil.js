"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ts_luxon_1 = require("ts-luxon");
class DateUtil {
    static formatYYYYMMDD(yearValue, monthValue, dayValue) {
        return ts_luxon_1.DateTime.fromObject({ year: yearValue, month: monthValue, day: dayValue }).toFormat('yyyyMMdd');
    }
    static formatYYYYMMDDEx(dt) {
        return dt.toFormat('yyyyMMdd');
    }
    static formatYYYYMM(dt) {
        return dt.toFormat('yyyyMM');
    }
    static buildDateTime(yearValue, monthValue, dayValue) {
        return ts_luxon_1.DateTime.fromObject({ year: yearValue, month: monthValue, day: dayValue });
    }
    // example: 1661214142.000000
    static parseUnixFloatAsDouble(timestamp) {
        return Number.parseFloat(timestamp);
    }
    // example: 1661214142
    static parseUnixFloatAsInt(timestamp) {
        return Math.floor(Number.parseFloat(timestamp));
    }
    static parseUnixFloatAsDateTime(timestamp) {
        return ts_luxon_1.DateTime.fromMillis(Number.parseFloat(timestamp) * 1000);
    }
    static dateTimeToUnixFloat(dt) {
        return dt.toMillis() / 1000.0;
    }
    static currentTimeMillis() {
        return Date.now();
    }
    static currentTimeSeconds() {
        // new Date().getTime()
        return Math.round(Date.now() / 1000);
    }
    static millisToDate(timestamp) {
        return new Date(timestamp);
    }
    static millisToUnixSeconds(timestamp) {
        return Math.round(timestamp / 1000);
    }
}
exports.default = DateUtil;
//# sourceMappingURL=dateUtil.js.map