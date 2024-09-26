import { Format, TransformableInfo } from 'logform';
import { DateTime } from 'ts-luxon';
import winston from 'winston';
import StrUtil from './strUtil';
import { EnvLoader } from './envLoader';
import {
  consoleTransport,
  jsonLogTransport, // Ensure this is exported correctly
} from '../logger/logger'; // Adjust the import path based on your structure

export class WinstonUtil {
  private static readonly CLASS_NAME_LENGTH = 23;
  static loggerMap: Map<string, winston.Logger> = new Map();

  public static renderFormat2(info: TransformableInfo): string {
    const {level, message, meta } = info;
    const levelFirstChar = level == null ? '' : level.toUpperCase()[0];
    const date = DateTime.now();
    const formattedDate = date.toFormat('yyMMdd HHmmss');
    const className = info.className;
    const formattedClassName = StrUtil.isEmpty(className)
      ? ' '
      : (' [' + className.substring(0, this.CLASS_NAME_LENGTH) + '] ').padEnd(
          this.CLASS_NAME_LENGTH + 4,
        );

    const metaAsString = meta == null ? '' : meta;
    return `${levelFirstChar} ${formattedDate}${formattedClassName}${message} ${metaAsString}`;
  }

  public static createFormat1WhichSetsClassName(
    className: string | null,
  ): Format {
    return winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss',
      }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.json(),
      winston.format.printf((info) => {
        info['className'] = className;
        return '';
      }),
    );
  }

  public static createFormat2WhichRendersClassName(): Format {
    return winston.format.combine(
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.printf((info) => {
        return WinstonUtil.renderFormat2(info);
      }),
    );
  }

  public static debugFileTransport = new winston.transports.File({
    level: 'debug',
    filename: `${EnvLoader.getPropertyOrFail('LOG_DIR')}/debug.log`,
    handleExceptions: true,
    maxsize: 5242880,
    maxFiles: 5,
    tailable: true,
    format: WinstonUtil.createFormat2WhichRendersClassName(),
  });

  public static errorFileTransport = new winston.transports.File({
    level: 'error',
    filename: `${EnvLoader.getPropertyOrFail('LOG_DIR')}/error.log`,
    handleExceptions: true,
    maxsize: 5242880,
    maxFiles: 5,
    tailable: true,
    format: WinstonUtil.createFormat2WhichRendersClassName(),
  });

  public static newLog(
    classNameOrClass: string | { name: string },
  ): winston.Logger {
    let loggerName =
      typeof classNameOrClass === 'string'
        ? classNameOrClass
        : classNameOrClass?.name;
    loggerName = loggerName
      ? loggerName.substring(0, this.CLASS_NAME_LENGTH)
      : '';

    let loggerObj = WinstonUtil.loggerMap.get(loggerName);
    if (loggerObj) {
      return loggerObj;
    }

    loggerObj = winston.createLogger({
      level: 'debug', // Use string 'debug' instead of customLevels.levels.debug
      format: this.createFormat1WhichSetsClassName(loggerName),
      transports: [
        consoleTransport,
        jsonLogTransport,
        this.debugFileTransport,
        this.errorFileTransport,
      ],
    });

    WinstonUtil.loggerMap.set(loggerName, loggerObj);
    return loggerObj;
  }
}
