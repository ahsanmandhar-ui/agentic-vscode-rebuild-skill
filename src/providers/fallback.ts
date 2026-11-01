// src/providers/fallback.ts
// Fallback chains, circuit breaker (closed/open/half-open, lazy recovery), and per-provider
// health checks for the VibeCode provider router. Pure module (no vscode) so it is unit-testable.

export type RouteProfileName = 'chat' | 'code' | 'embeddings';

export interface FallbackEntry {
  providerId: string;
  modelId: string;
}

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerState {
  state: CircuitState;
  failures: number;
  openedAt: number | null;
  halfOpenInFlight: boolean;
  threshold: number;
  cooldownMs: number;
}

export type HealthStatus = 'ok' | 'healthy' | 'degraded' | 'down' | 'unhealthy' | 'unknown';

export interface HealthRecord {
  providerId: string;
  status: HealthStatus;
  latencyMs?: number;
  lastChecked?: string;
  error?: string;
}

export interface SelectRequest {
  now?: (() => Date) | Date;
  exclude?: Array<string | { providerId?: string; modelId?: string }>;
  tried?: Array<string | { providerId?: string; modelId?: string }>;
  [key: string]: unknown;
}

const FAILURE_THRESHOLD = 3;
const COOLDOWN_MS = 30_000;

const defaultChains: Record<RouteProfileName, FallbackEntry[]> = {
  chat: [
    { providerId: 'openrouter', modelId: 'openai/gpt-4o-mini' },
    { providerId: 'litellm', modelId: 'gpt-4o-mini' },
    { providerId: 'ollama', modelId: 'llama3.1' },
  ],
  code: [
    { providerId: 'openrouter', modelId: 'anthropic/claude-3.5-sonnet' },
    { providerId: 'litellm', modelId: 'claude-3-5-sonnet' },
    { providerId: 'ollama', modelId: 'qwen2.5' },
  ],
  embeddings: [
    { providerId: 'openrouter', modelId: 'openai/text-embedding-3-small' },
    { providerId: 'litellm', modelId: 'text-embedding-3-small' },
    { providerId: 'ollama', modelId: 'nomic-embed-text' },
  ],
};

const chains: Map<string, FallbackEntry[]> = new Map(
  Object.entries(defaultChains).map(([k, v]) => [k, v.map((e) => ({ ...e }))]),
);

const circuits: Map<string, CircuitBreakerState> = new Map();
const health: Map<string, HealthRecord> = new Map();

let nowFn: () => number = () => Date.now();

function nowMs(req?: SelectRequest): number {
  const n = req?.now;
  if (typeof n === 'function') {
    try {
      const d = (n as () => Date)();
      return d instanceof Date ? d.getTime() : Number(d);
    } catch {
      return Date.now();
    }
  }
  if (n instanceof Date) return n.getTime();
  return nowFn();
}

function toProviderId(target: unknown): string {
  if (typeof target === 'string') return target;
  if (target && typeof target === 'object') {
    const o = target as Record<string, unknown>;
    const v = o.providerId ?? o.provider ?? o.id ?? o.provider_id;
    if (typeof v === 'string' && v) return v;
  }
  return '';
}

function normalizeChain(profile: unknown): FallbackEntry[] {
  if (Array.isArray(profile)) {
    return profile
      .map((e) => (e && typeof e === 'object' ? { providerId: String((e as any).providerId ?? (e as any).provider ?? ''), modelId: String((e as any).modelId ?? (e as any).model ?? '') } : null))
      .filter((e): e is FallbackEntry => !!e && !!e.providerId);
  }
  if (typeof profile === 'string') {
    const c = chains.get(profile);
    if (c) return c.map((e) => ({ ...e }));
    if (defaultChains[profile as RouteProfileName]) return defaultChains[profile as RouteProfileName].map((e) => ({ ...e }));
    return [];
  }
  if (profile && typeof profile === 'object') {
    const o = profile as Record<string, unknown>;
    for (const key of ['chain', 'entries', 'fallback', 'providers', 'models']) {
      if (Array.isArray(o[key])) return normalizeChain(o[key]);
    }
    if (typeof o.name === 'string' || typeof o.id === 'string') {
      const name = String(o.name ?? o.id);
      if (chains.has(name)) return (chains.get(name) ?? []).map((e) => ({ ...e }));
    }
  }
  return [];
}

function isExcluded(entry: FallbackEntry, req?: SelectRequest): boolean {
  const list = [...(req?.exclude ?? []), ...(req?.tried ?? [])];
  return list.some((x) => {
    if (typeof x === 'string') return x === entry.providerId || x === `${entry.providerId}/${entry.modelId}`;
    if (x && typeof x === 'object') {
      const o = x as Record<string, unknown>;
      const pid = o.providerId ?? o.provider;
      const mid = o.modelId ?? o.model;
      if (pid && pid !== entry.providerId) return false;
      if (mid && mid !== entry.modelId) return false;
      return !!(pid || mid);
    }
    return false;
  });
}

function getCircuit(providerId: string): CircuitBreakerState {
  let cb = circuits.get(providerId);
  if (!cb) {
    cb = { state: 'closed', failures: 0, openedAt: null, halfOpenInFlight: false, threshold: FAILURE_THRESHOLD, cooldownMs: COOLDOWN_MS };
    circuits.set(providerId, cb);
  }
  return cb;
}

function lazyRecover(cb: CircuitBreakerState, now: number): void {
  if (cb.state === 'open' && cb.openedAt !== null && now >= cb.openedAt + cb.cooldownMs) {
    cb.state = 'half-open';
    cb.halfOpenInFlight = false;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function setClock(fn: () => number): void {
  nowFn = fn;
}

export function resetFallback(): void {
  circuits.clear();
  health.clear();
  chains.clear();
  for (const [k, v] of Object.entries(defaultChains)) chains.set(k, v.map((e) => ({ ...e })));
}

export function setFallbackChain(profile: string, chain: FallbackEntry[]): void {
  chains.set(profile, chain.map((e) => ({ ...e })));
}

export function getFallbackChain(profile: string): FallbackEntry[] {
  const c = chains.get(profile);
  return c ? c.map((e) => ({ ...e })) : [];
}

export const FALLBACK_CHAINS = defaultChains;
export const ROUTE_PROFILES = defaultChains;

export function getCircuitState(providerId: string): CircuitState {
  const cb = getCircuit(providerId);
  lazyRecover(cb, nowFn());
  return cb.state;
}

export function getHealth(target: unknown): HealthRecord | undefined {
  const pid = toProviderId(target) || (typeof target === 'string' ? target : '');
  if (!pid) return undefined;
  const h = health.get(pid);
  return h ? { ...h } : undefined;
}

export function recordFailure(target: unknown, error?: unknown, latencyMs?: number): void {
  const pid = toProviderId(target);
  if (!pid) return;
  const cb = getCircuit(pid);
  const now = nowFn();
  lazyRecover(cb, now);
  cb.failures += 1;
  if (cb.state === 'half-open') {
    cb.state = 'open';
    cb.openedAt = now;
    cb.halfOpenInFlight = false;
  } else if (cb.failures >= cb.threshold) {
    cb.state = 'open';
    cb.openedAt = now;
  }
  const rec: HealthRecord = {
    providerId: pid,
    status: 'down',
    lastChecked: new Date(now).toISOString(),
  };
  if (latencyMs !== undefined) rec.latencyMs = latencyMs;
  if (error !== undefined) rec.error = error instanceof Error ? error.message : String(error);
  const prev = health.get(pid);
  if (prev?.latencyMs !== undefined && rec.latencyMs === undefined) rec.latencyMs = prev.latencyMs;
  health.set(pid, rec);
}

export function recordSuccess(target: unknown, latencyMs?: number): void {
  const pid = toProviderId(target);
  if (!pid) return;
  const cb = getCircuit(pid);
  cb.state = 'closed';
  cb.failures = 0;
  cb.openedAt = null;
  cb.halfOpenInFlight = false;
  const now = nowFn();
  const rec: HealthRecord = {
    providerId: pid,
    status: 'ok',
    lastChecked: new Date(now).toISOString(),
  };
  if (latencyMs !== undefined) rec.latencyMs = latencyMs;
  const prev = health.get(pid);
  if (prev?.latencyMs !== undefined && rec.latencyMs === undefined) rec.latencyMs = prev.latencyMs;
  health.set(pid, rec);
}

export function selectWithFallback(profile: unknown, request?: SelectRequest): FallbackEntry | null {
  const chain = normalizeChain(profile);
  const now = nowMs(request);
  for (const entry of chain) {
    if (isExcluded(entry, request)) continue;
    const cb = getCircuit(entry.providerId);
    lazyRecover(cb, now);
    if (cb.state === 'open') continue;
    if (cb.state === 'half-open') {
      if (cb.halfOpenInFlight) continue;
      cb.halfOpenInFlight = true;
    }
    const h = health.get(entry.providerId);
    if (h && (h.status === 'down' || h.status === 'unhealthy')) {
      if (cb.state !== 'half-open') continue;
    }
    return { providerId: entry.providerId, modelId: entry.modelId };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Health probes
// ---------------------------------------------------------------------------

export async function probeHealth(
  target: unknown,
  probe: () => unknown | Promise<unknown>,
  timeoutMs?: number,
): Promise<HealthRecord> {
  const pid = toProviderId(target) || (typeof target === 'string' ? target : '');
  if (!pid) throw new Error('probeHealth requires a providerId');
  const start = nowFn();
  let status: HealthStatus = 'ok';
  let error: string | undefined;
  let latencyMs: number | undefined;
  try {
    const res = await Promise.resolve(probe());
    const end = nowFn();
    latencyMs = end - start;
    if (res && typeof res === 'object') {
      const r = res as Record<string, unknown>;
      if (typeof r.status === 'string') status = r.status as HealthStatus;
      else if (r.ok === false || r.healthy === false) status = 'down';
      if (typeof r.latencyMs === 'number') latencyMs = r.latencyMs;
      if (typeof r.error === 'string') error = r.error;
      else if (r.error instanceof Error) error = r.error.message;
    }
    if (timeoutMs && latencyMs !== undefined && latencyMs > timeoutMs) status = 'degraded';
  } catch (e) {
    const end = nowFn();
    latencyMs = end - start;
    status = 'down';
    error = e instanceof Error ? e.message : String(e);
  }
  const rec: HealthRecord = {
    providerId: pid,
    status,
    latencyMs,
    lastChecked: new Date(nowFn()).toISOString(),
  };
  if (error) rec.error = error;
  health.set(pid, rec);
  if (status === 'down' || status === 'unhealthy') recordFailure(pid, error, latencyMs);
  else recordSuccess(pid, latencyMs);
  return { ...rec };
}

export const checkHealth = probeHealth;
export const healthCheck = probeHealth;
export const probe = probeHealth;

export default {
  selectWithFallback,
  recordFailure,
  recordSuccess,
  getHealth,
  probeHealth,
  checkHealth,
  healthCheck,
  probe,
  getCircuitState,
  getFallbackChain,
  setFallbackChain,
  resetFallback,
  FALLBACK_CHAINS,
  ROUTE_PROFILES,
};
