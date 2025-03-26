import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { WinstonUtil } from '../utilz/winstonUtil';

@Injectable()
export class IpLoggerMiddleware implements NestMiddleware {
  private readonly log = WinstonUtil.newLog(IpLoggerMiddleware);

  use(req: Request, res: Response, next: NextFunction) {
    const ip = req.ip || req.connection.remoteAddress;
    const endpoint = req.url;
    const method = req.method;

    this.log.debug(
      `Request - IP: ${ip}, Method: ${method}, Endpoint: ${endpoint}`,
    );
    next();
  }
}
