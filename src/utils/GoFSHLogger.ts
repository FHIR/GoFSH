import { createLogger, format, transports } from 'winston';
import chalk from 'chalk';

const { combine, printf } = format;

const incrementCounts = format(info => {
  switch (info.level) {
    case 'info':
      stats.numInfo++;
      break;
    case 'warn':
      stats.numWarn++;
      break;
    case 'error':
      stats.numError++;
      break;
    case 'debug':
      stats.numDebug++;
      break;
    default:
      break;
  }

  return info;
});

const trackErrorsAndWarnings = format(info => {
  if (!errorsAndWarnings.shouldTrack) {
    return info;
  }
  if (info.level === 'error') {
    errorsAndWarnings.errors.push({
      message: info.message,
      location: info.location,
      input: info.file
    });
  } else if (info.level === 'warn') {
    errorsAndWarnings.warnings.push({
      message: info.message,
      location: info.location,
      input: info.file
    });
  }
  return info;
});

const printer = printf(info => {
  let level;
  switch (info.level) {
    case 'info':
      level = chalk.whiteBright.bgGreen(`${info.level} `);
      break;
    case 'warn':
      // (179, 98, 0) = dark dark orange
      level = chalk.whiteBright.bgRgb(179, 98, 0)(`${info.level} `);
      break;
    case 'error':
      level = chalk.whiteBright.bgRed(`${info.level}`);
      break;
    case 'debug':
      level = chalk.whiteBright.bgBlue(`${info.level}`);
      break;
    default:
      break;
  }
  return `${level} ${info.message}`;
});

export const logger = createLogger({
  format: combine(incrementCounts(), trackErrorsAndWarnings(), printer),
  transports: [new transports.Console()]
});

class LoggerStats {
  public numInfo = 0;
  public numWarn = 0;
  public numError = 0;
  public numDebug = 0;

  reset(): void {
    this.numInfo = 0;
    this.numWarn = 0;
    this.numError = 0;
    this.numDebug = 0;
  }
}

export class ErrorsAndWarnings {
  public errors: { message: string; location?: string; input?: string }[] = [];
  public warnings: { message: string; location?: string; input?: string }[] = [];
  public shouldTrack = false;

  reset(): void {
    this.errors = [];
    this.warnings = [];
    this.shouldTrack = false;
  }
}

export const stats = new LoggerStats();
export const errorsAndWarnings = new ErrorsAndWarnings();

export const logMessage = (level: string, message: string): void => {
  logger.log(level, message);
};
