import winston from 'winston';
import { WinstonUtil } from '../utils/winstonUtil'; // Adjust based on your project structure
import { EnvLoader } from '../utils/envLoader';

// Define custom log levels
export const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
  },
};

// Define custom log colors separately
export const customColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue',
};

// Log formatting logic
const formatLogInfo = (info: any) => {
  const { level, message, meta } = info;
  const timestamp = new Date().toISOString();
  const metaMsg = meta ? `: ${JSON.stringify(meta, null, 2)}` : '';

  let className = info.className || '';
  className = className ? `[${className}] ` : '';

  return `${timestamp} ${level.toUpperCase()}: ${className}${message}${metaMsg}`;
};

// Formatter for winston
const formatter = winston.format.combine(
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.colorize(),
  winston.format.printf((info) => formatLogInfo(info)),
);

// Console transport
export const consoleTransport = new winston.transports.Console({
  format: formatter,
});

// JSON log file transport
export const jsonLogTransport = new winston.transports.File({
  level: 'info',
  filename: `${EnvLoader.getPropertyOrFail('LOG_DIR')}/app.log`,
  handleExceptions: true,
  maxsize: 5242880, // 5MB
  maxFiles: 5,
  format: winston.format.combine(winston.format.json()),
});

// Setup logger transports
const transports: winston.transport[] = [consoleTransport, jsonLogTransport];

if (EnvLoader.getPropertyAsBool('VALIDATOR_DEBUG_LOG')) {
  transports.push(
    WinstonUtil.debugFileTransport,
    WinstonUtil.errorFileTransport,
  );
}

// Create logger instance
const LoggerInstance = winston.createLogger({
  level: 'debug', // Use string 'debug' instead of a number
  levels: customLevels.levels, // This defines the custom numeric levels
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.json(),
  ),
  transports,
});

// Apply colors for custom levels
winston.addColors(customColors);

export default LoggerInstance;
