// src/providers/capabilities.ts
// Probe-driven model capabilities with TTL cache + manual override + conservative defaults.

import { Capability, ModelCapabilities, RouterProvider } from './router-types';

export interface CapabilityProbeResult {
  tools?: boolean;
  streaming?: boolean;
  jsonMode?: boolean;
  vision?: boolean;
  audio?: boolean;
  contextWindow?: number;
  maxInputTokens?: number;
  maxOutputTokens?: number;
  maxTokens?: number;
  source?: 'provider-api' | 'config' | 'documentation' | 'unknown';
  [key: string]: unknown;
}

export const CONSERVATIVE_DEFAULTS: Capability = {
  tools: false,
  streaming: false,
  jsonMode: false,
  contextWindow: 4096,
  source: 'unknown',
};

export const DEFAULT_TTL_MS = 5 * 60 * 1000;

let clockFn: () => number = () => Date.now();
export function setClock(fn: () => number | Date): void {
  clockFn = () => {
    try {
      const v = fn();
      return v instanceof Date ? v.getTime() : Number(v);
    } catch {
      return Date.now();
    }
  };
}
export function resetClock(): void { clockFn = () => Date.now(); }
function nowMs(): number { return clockFn(); }

interface CacheEntry {
  value: Capability;
  expiresAt: number;
}

export class CapabilityCache {
  private cache: Map<string, CacheEntry> = new Map();
  private overrides: Map<string, Capability> = new Map();
  private ttlMs: number;
  constructor(ttlMs: number = DEFAULT_TTL_MS) { this.ttlMs = ttlMs; }
  key(providerId: string, modelId: string): string { return `${providerId}::${modelId}`; }
  setTtl(ms: number): void { this.ttlMs = ms; }
  getTtl(): number { return this.ttlMs; }

  setOverride(providerId: string, modelId: string, caps: CapabilityProbeResult | Capability): void {
    this.overrides.set(this.key(providerId, modelId), normalizeCapability(caps, 'config'));
  }
  clearOverride(providerId: string, modelId: string): void { this.overrides.delete(this.key(providerId, modelId)); }
  clearOverrides(): void { this.overrides.clear(); }
  hasOverride(providerId: string, modelId: string): boolean { return this.overrides.has(this.key(providerId, modelId)); }
  getOverride(providerId: string, modelId: string): Capability | undefined { return this.overrides.get(this.key(providerId, modelId)); }

  get(providerId: string, modelId: string): Capability | undefined {
    const k = this.key(providerId, modelId);
    const ovr = this.overrides.get(k);
    if (ovr) return { ...ovr };
    const entry = this.cache.get(k);
    if (!entry) return undefined;
    if (nowMs() >= entry.expiresAt) {
      this.cache.delete(k);
      return undefined;
    }
    return { ...entry.value };
  }
  set(providerId: string, modelId: string, caps: CapabilityProbeResult | Capability, ttlMs?: number): Capability {
    const norm = normalizeCapability(caps, (caps as any)?.source ?? 'provider-api');
    const entry: CacheEntry = { value: norm, expiresAt: nowMs() + (ttlMs ?? this.ttlMs) };
    this.cache.set(this.key(providerId, modelId), entry);
    return { ...norm };
  }
  delete(providerId: string, modelId: string): boolean { return this.cache.delete(this.key(providerId, modelId)); }
  clear(): void { this.cache.clear(); }
  size(): number { return this.cache.size; }
}

function normalizeCapability(input: any, defaultSource: Capability['source'] = 'unknown'): Capability {
  const src = (input && (input.source)) || defaultSource;
  const tools = !!(input && (input.tools ?? input.supportsTools ?? input.supportsFunctionCalling ?? input.functionCalling));
  const streaming = !!(input && (input.streaming ?? input.supportsStreaming));
  const jsonMode = !!(input && (input.jsonMode ?? input.supportsJsonMode));
  const ctx = input && (input.contextWindow ?? input.maxInputTokens ?? input.maxTokens);
  const cap: Capability = {
    tools,
    streaming,
    jsonMode,
    contextWindow: typeof ctx === 'number' ? ctx : (ctx ? Number(ctx) : CONSERVATIVE_DEFAULTS.contextWindow),
    source: (src as Capability['source']) || 'unknown',
  };
  return cap;
}

export function normalizeCapabilities(input: any, defaultSource?: Capability['source']): Capability {
  return normalizeCapability(input, defaultSource ?? 'unknown');
}

const defaultCache = new CapabilityCache(DEFAULT_TTL_MS);

export async function probeCapabilities(
  provider: any,
  model: any,
  options?: any,
): Promise<Capability> {
  const providerId = (typeof provider === 'string') ? provider : String(provider?.id ?? provider?.provider ?? provider?.name ?? '');
  const modelId = (typeof model === 'string') ? model : String(model?.id ?? model?.model ?? model?.modelId ?? model?.name ?? '');
  const cache: CapabilityCache = (options && options.cache instanceof CapabilityCache) ? options.cache : defaultCache;
  const ttlMs = (options && typeof options.ttlMs === 'number') ? options.ttlMs : undefined;
  const force = !!(options && options.force);

  const override = cache.getOverride(providerId, modelId);
  if (override && !force) return { ...override };

  if (!force) {
    const cached = cache.get(providerId, modelId);
    if (cached) return cached;
  }

  let probed: any = null;
  const probeFn = (provider && typeof provider.capabilities === 'function') ? provider.capabilities.bind(provider)
    : (options && typeof options.probe === 'function') ? options.probe : null;

  if (probeFn) {
    try {
      probed = await Promise.resolve(probeFn(modelId));
    } catch {
      probed = null;
    }
  }

  if (!probed) {
    const def = { ...CONSERVATIVE_DEFAULTS };
    cache.set(providerId, modelId, def, ttlMs);
    return def;
  }

  const norm = normalizeCapability(probed, 'provider-api');
  cache.set(providerId, modelId, norm, ttlMs);
  return norm;
}

export function getCapabilities(provider: any, model: any, options?: any): Capability {
  const providerId = (typeof provider === 'string') ? provider : String(provider?.id ?? provider?.provider ?? provider?.name ?? '');
  const modelId = (typeof model === 'string') ? model : String(model?.id ?? model?.model ?? model?.modelId ?? model?.name ?? '');
  const cache: CapabilityCache = (options && options.cache instanceof CapabilityCache) ? options.cache : defaultCache;
  const override = cache.getOverride(providerId, modelId);
  if (override) return { ...override };
  const cached = cache.get(providerId, modelId);
  if (cached) return cached;
  return { ...CONSERVATIVE_DEFAULTS };
}

export async function getCapabilitiesAsync(provider: any, model: any, options?: any): Promise<Capability> {
  return probeCapabilities(provider, model, options);
}

export function setManualOverride(provider: any, model: any, caps: any, options?: any): Capability {
  const providerId = (typeof provider === 'string') ? provider : String(provider?.id ?? provider?.provider ?? provider?.name ?? '');
  const modelId = (typeof model === 'string') ? model : String(model?.id ?? model?.model ?? model?.modelId ?? model?.name ?? '');
  const cache: CapabilityCache = (options && options.cache instanceof CapabilityCache) ? options.cache : defaultCache;
  const norm = normalizeCapability(caps, 'config');
  cache.setOverride(providerId, modelId, norm);
  return norm;
}

export function clearManualOverride(provider: any, model: any, options?: any): void {
  const providerId = (typeof provider === 'string') ? provider : String(provider?.id ?? provider?.provider ?? provider?.name ?? '');
  const modelId = (typeof model === 'string') ? model : String(model?.id ?? model?.model ?? model?.modelId ?? model?.name ?? '');
  const cache: CapabilityCache = (options && options.cache instanceof CapabilityCache) ? options.cache : defaultCache;
  cache.clearOverride(providerId, modelId);
}

export function clearCapabilityCache(provider?: any, model?: any, options?: any): void {
  const cache: CapabilityCache = (options && options.cache instanceof CapabilityCache) ? options.cache : defaultCache;
  if (provider && model) {
    const providerId = (typeof provider === 'string') ? provider : String(provider?.id ?? provider?.provider ?? provider?.name ?? '');
    const modelId = (typeof model === 'string') ? model : String(model?.id ?? model?.model ?? model?.modelId ?? model?.name ?? '');
    cache.delete(providerId, modelId);
  } else {
    cache.clear();
  }
}

export function createCapabilityCache(ttlMs?: number): CapabilityCache {
  return new CapabilityCache(ttlMs);
}

export const probe = probeCapabilities;
export const getCapability = getCapabilities;
export const setOverride = setManualOverride;
export const clearOverride = clearManualOverride;

export default {
  CapabilityCache,
  CONSERVATIVE_DEFAULTS,
  DEFAULT_TTL_MS,
  setClock,
  resetClock,
  probeCapabilities,
  getCapabilities,
  getCapabilitiesAsync,
  setManualOverride,
  clearManualOverride,
  clearCapabilityCache,
  createCapabilityCache,
  normalizeCapabilities,
  probe,
  getCapability,
  setOverride,
  clearOverride,
};
