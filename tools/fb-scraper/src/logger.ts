import { SingleBar, Presets } from 'cli-progress';

export type LogLevel = 'info' | 'warn' | 'error' | 'debug' | 'success';

const COLORS: Record<LogLevel, string> = {
  info: '\x1b[36m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
  debug: '\x1b[90m',
  success: '\x1b[32m',
};

const RESET = '\x1b[0m';

function timestamp(): string {
  return new Date().toISOString().slice(11, 19);
}

function log(level: LogLevel, message: string): void {
  const color = COLORS[level];
  console.log(`${color}[${timestamp()} ${level.toUpperCase()}]${RESET} ${message}`);
}

export const logger = {
  info: (msg: string) => log('info', msg),
  warn: (msg: string) => log('warn', msg),
  error: (msg: string) => log('error', msg),
  debug: (msg: string) => log('debug', msg),
  success: (msg: string) => log('success', msg),
};

export function createProgressBar(total: number, label: string): SingleBar {
  const bar = new SingleBar(
    {
      format: `${label} [{bar}] {percentage}% | {value}/{total} | ETA: {eta_formatted}`,
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true,
      clearOnComplete: true,
    },
    Presets.shades_classic,
  );

  bar.start(total, 0);
  return bar;
}