"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpressUtil = void 0;
const winstonUtil_1 = require("./winstonUtil");
class ExpressUtil {
    static handle(req, res, next) {
        ExpressUtil.log.debug(`>> Calling %s %s %o with body: %o`, req.method, req.url, req.params, req.body);
        res.on('finish', function () {
            ExpressUtil.log.debug(`<< Reply ${res.statusCode} with body: %s`, res.statusMessage);
        });
        next();
    }
}
exports.ExpressUtil = ExpressUtil;
ExpressUtil.log = winstonUtil_1.WinstonUtil.newLog('http');
//# sourceMappingURL=expressUtil.js.map