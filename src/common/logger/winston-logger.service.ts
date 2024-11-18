import { Injectable, LoggerService } from '@nestjs/common';
import { createLogger, format, transports } from 'winston';
import { WinstonUtil } from '../../utilz/winstonUtil';

@Injectable()
export class WinstonLoggerService implements LoggerService {

  private logger = createLogger({
    level: 'info',
    format: format.combine(format.timestamp(), format.json()),
    transports: [
      new transports.Console(),
      // customizable LOG_DIR path is needed for dockerized setups
      new transports.File({ filename: `${WinstonUtil.LOG_DIR}/app.log` }),
    ],
  });

  log(message: string) {
    this.logger.info(message);
  }

  error(message: string, trace: string) {
    this.logger.error(message, { trace });
  }

  warn(message: string) {
    this.logger.warn(message);
  }

  debug(message: string) {
    this.logger.debug(message);
  }

  verbose(message: string) {
    this.logger.verbose(message);
  }
}
