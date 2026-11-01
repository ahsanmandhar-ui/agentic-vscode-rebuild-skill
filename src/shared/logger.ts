// src/shared/logger.ts
import { redactSecrets } from './redact';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  ts: string;
  level: LogLevel;
  message: string;
  data?: unknown;
}

export class Logger {
  private entries: LogEntry[] = [];
  private readonly maxEntries: number;

  constructor(maxEntries = 500, private sink?: (line: string) => void) {
    this.maxEntries = maxEntries;
  }

  private write(level: LogLevel, message: string, data?: unknown): void {
    const entry: LogEntry = {
      ts: new Date().toISOString(),
      level,
      message: String(redactSecrets(message)),
      data: data === undefined ? undefined : redactSecrets(data),
    };
    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) this.entries.splice(0, this.entries.length - this.maxEntries);
    const line = `[${entry.ts}] [${level.toUpperCase()}] ${entry.message}${entry.data !== undefined ? ' ' + JSON.stringify(entry.data) : ''}`;
    this.sink?.(line);
  }

  debug(message: string, data?: unknown): void { this.write('debug', message, data); }
  info(message: string, data?: unknown): void { this.write('info', message, data); }
  warn(message: string, data?: unknown): void { this.write('warn', message, data); }
  error(message: string, data?: unknown): void { this.write('error', message, data); }

  recent(n = 50): LogEntry[] {
    return this.entries.slice(-n);
  }

  redactedLogs(n = 200): string[] {
    return this.entries.slice(-n).map((e) =>
      `[${e.ts}] [${e.level.toUpperCase()}] ${e.message}${e.data !== undefined ? ' ' + JSON.stringify(e.data) : ''}`,
    );
  }

  clear(): void { this.entries.length = 0; }
}
