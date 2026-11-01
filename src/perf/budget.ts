// src/perf/budget.ts
// Performance budget tracker for the VibeCode engine.
// Pure module (no vscode import) so it can be unit-tested in isolation.

export interface PerformanceBudgetConfig {
  activationLimitMs: number;
  commandLimitMs: number;
  commandLimits?: Record<string, number>;
}

export interface PerfRecord {
  name: string;
  durationMs: number;
  limitMs: number;
  ok: boolean;
  at: string;
}

export class PerformanceBudgetExceeded extends Error {
  constructor(name: string, durationMs: number, limitMs: number) {
    super(`Performance budget exceeded for ${name}: ${durationMs.toFixed(2)}ms > ${limitMs}ms`);
    this.name = 'PerformanceBudgetExceeded';
  }
}

const DEFAULT_CONFIG: PerformanceBudgetConfig = {
  activationLimitMs: 3000,
  commandLimitMs: 1000,
};

export class PerformanceBudget {
  private readonly config: PerformanceBudgetConfig;
  private readonly clock: () => number;
  private readonly records: PerfRecord[] = [];
  private activationMs: number | undefined;
  private activationStart: number | undefined;

  constructor(
    config: Partial<PerformanceBudgetConfig> = {},
    clock: () => number = defaultClock,
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.clock = clock;
  }

  /** Mark the beginning of activation (uses performance.now via clock). */
  beginActivation(): number {
    this.activationStart = this.clock();
    return this.activationStart;
  }

  /** Record activation duration. Accepts a start timestamp (performance.now value)
   *  or, if omitted, uses the timestamp captured by beginActivation(). */
  recordActivationTime(startMs?: number): number {
    const start = startMs ?? this.activationStart ?? this.clock();
    const duration = this.clock() - start;
    this.activationMs = duration;
    const limit = this.config.activationLimitMs;
    const ok = duration <= limit;
    this.records.push({
      name: 'activation',
      durationMs: duration,
      limitMs: limit,
      ok,
      at: new Date().toISOString(),
    });
    return duration;
  }

  /** Record a single command timing. */
  recordCommand(command: string, durationMs: number): PerfRecord {
    const limit = this.limitFor(command);
    const ok = durationMs <= limit;
    const rec: PerfRecord = {
      name: command,
      durationMs,
      limitMs: limit,
      ok,
      at: new Date().toISOString(),
    };
    this.records.push(rec);
    return rec;
  }

  /** Whether a duration is within the budget for the given name. */
  check(name: string, durationMs: number): boolean {
    return durationMs <= this.limitFor(name);
  }

  isWithinLimit(name: string, durationMs: number): boolean {
    return this.check(name, durationMs);
  }

  /** Static helper: is duration within an explicit limit? */
  static within(limitMs: number, durationMs: number): boolean {
    return durationMs <= limitMs;
  }

  /** Throw if the budget is exceeded. */
  enforce(name: string, durationMs: number): void {
    const limit = this.limitFor(name);
    if (durationMs > limit) {
      throw new PerformanceBudgetExceeded(name, durationMs, limit);
    }
  }

  limitFor(name: string): number {
    if (name === 'activation') return this.config.activationLimitMs;
    return this.config.commandLimits?.[name] ?? this.config.commandLimitMs;
  }

  get activationDurationMs(): number | undefined {
    return this.activationMs;
  }

  /** All recorded entries. */
  allRecords(): readonly PerfRecord[] {
    return this.records;
  }

  /** Aggregate report suitable for diagnostics output. */
  report(): string {
    const lines: string[] = [];
    lines.push('VibeCode Performance Budget Report');
    lines.push('==================================');
    if (this.activationMs !== undefined) {
      const limit = this.config.activationLimitMs;
      const status = this.activationMs <= limit ? 'OK' : 'EXCEEDED';
      lines.push(`Activation: ${this.activationMs.toFixed(2)} ms / ${limit} ms [${status}]`);
    } else {
      lines.push('Activation: not recorded');
    }
    lines.push('');

    // Aggregate command timings.
    const byCommand = new Map<string, { count: number; total: number; max: number; limit: number; violations: number }>();
    for (const r of this.records) {
      if (r.name === 'activation') continue;
      const agg = byCommand.get(r.name) ?? { count: 0, total: 0, max: 0, limit: r.limitMs, violations: 0 };
      agg.count += 1;
      agg.total += r.durationMs;
      agg.max = Math.max(agg.max, r.durationMs);
      agg.limit = r.limitMs;
      if (!r.ok) agg.violations += 1;
      byCommand.set(r.name, agg);
    }

    if (byCommand.size === 0) {
      lines.push('Commands: none recorded');
    } else {
      lines.push('Commands:');
      for (const [name, agg] of byCommand) {
        const avg = agg.total / agg.count;
        const status = agg.violations > 0 ? 'EXCEEDED' : 'OK';
        lines.push(
          `  ${name}: count=${agg.count} avg=${avg.toFixed(2)}ms max=${agg.max.toFixed(2)}ms limit=${agg.limit}ms [${status}]`,
        );
      }
    }

    const violations = this.records.filter(r => !r.ok).length;
    lines.push('');
    lines.push(`Total records: ${this.records.length} · Violations: ${violations}`);
    return lines.join('\n');
  }

  reset(): void {
    this.records.length = 0;
    this.activationMs = undefined;
    this.activationStart = undefined;
  }
}

function defaultClock(): number {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}
