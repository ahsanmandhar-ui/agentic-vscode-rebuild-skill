// src/search/registry.ts
// Search provider registry with fallback chain + auto-switch on 429.

import { RateLimitError, type SearchOptions, type SearchResult, type SearchProvider } from './types';
import { createDuckDuckGoAdapter } from './duckduckgo';
import { createBraveAdapter } from './brave';
import { createSerpApiAdapter } from './serpapi';
import { LRUCache, createCache, normalizeQuery } from './cache';

export interface SearchRegistryOptions {
  providers?: SearchProvider[] | Array<SearchProvider | string>;
  fetch?: (url: string, init?: any) => Promise<any>;
  storage?: any;
  secretStorage?: any;
  cache?: LRUCache<SearchResult[]> | boolean | number;
  useCache?: boolean;
  cooldownMs?: number;
  [key: string]: unknown;
}

const DEFAULT_COOLDOWN_MS = 5 * 60 * 1000;

function makeDefaultProviders(opts: any): SearchProvider[] {
  return [
    createDuckDuckGoAdapter({ fetch: opts?.fetch }),
    createBraveAdapter({ fetch: opts?.fetch, storage: opts?.storage ?? opts?.secretStorage }),
    createSerpApiAdapter({ fetch: opts?.fetch, storage: opts?.storage ?? opts?.secretStorage }),
  ];
}

function resolveQuery(input: any): { query: string; options: any } {
  if (input && typeof input === 'object' && !Array.isArray(input) && typeof input.query === 'string') {
    return { query: input.query, options: input.options ?? {} };
  }
  if (input && typeof input === 'object' && !Array.isArray(input) && typeof input.q === 'string') {
    return { query: input.q, options: input };
  }
  return { query: input, options: {} };
}

export class SearchRegistry {
  providers: SearchProvider[];
  cooldowns: Map<string, number> = new Map();
  cache: LRUCache<SearchResult[]> | null = null;
  cooldownMs: number;
  opts: any;

  constructor(options?: SearchRegistryOptions | SearchProvider[] | any) {
    let opts: any = {};
    if (Array.isArray(options)) {
      opts = { providers: options };
    } else if (options && typeof options === 'object') {
      opts = options;
    }
    this.opts = opts;
    this.cooldownMs = Number(opts.cooldownMs ?? DEFAULT_COOLDOWN_MS) || DEFAULT_COOLDOWN_MS;
    if (opts.cache instanceof LRUCache) {
      this.cache = opts.cache as LRUCache<SearchResult[]>;
    } else if (opts.cache === true || opts.useCache === true) {
      this.cache = createCache<SearchResult[]>({ maxSize: 500, ttlMs: 24 * 60 * 60 * 1000 });
    } else if (typeof opts.cache === 'number') {
      this.cache = createCache<SearchResult[]>({ maxSize: opts.cache, ttlMs: 24 * 60 * 60 * 1000 });
    }
    if (Array.isArray(opts.providers) && opts.providers.length) {
      this.providers = opts.providers.map((p: any) => {
        if (typeof p === 'string') {
          const defs = makeDefaultProviders(opts);
          return defs.find((d) => d.id === p) ?? createDuckDuckGoAdapter({ id: p });
        }
        return p as SearchProvider;
      });
    } else {
      this.providers = makeDefaultProviders(opts);
    }
  }

  isCooling(providerId: string, now: number = Date.now()): boolean {
    const until = this.cooldowns.get(providerId);
    if (!until) return false;
    if (now >= until) {
      this.cooldowns.delete(providerId);
      return false;
    }
    return true;
  }

  markCooling(providerId: string, now: number = Date.now()): void {
    this.cooldowns.set(providerId, now + this.cooldownMs);
  }

  async search(input: any, maybeOptions?: any): Promise<SearchResult[]> {
    const { query, options: resolvedOpts } = resolveQuery(input);
    const options = { ...this.opts, ...(maybeOptions || {}), ...(resolvedOpts || {}) };
    const q = String(query ?? '').trim();
    if (!q) return [];

    if (this.cache) {
      const cached = this.cache.get(q);
      if (cached) return cached;
    }

    const fetchFn = options.fetch;
    let lastErr: any = null;
    for (const provider of this.providers) {
      const pid = (provider && (provider.id || provider.name)) || 'unknown';
      if (this.isCooling(pid)) continue;
      try {
        const res = await provider.search(q, { ...options, ...(fetchFn ? { fetch: fetchFn } : {}) });
        if (this.cache) this.cache.set(q, res);
        return res;
      } catch (e: any) {
        lastErr = e;
        if (e instanceof RateLimitError || (e && (e.status === 429 || e.code === 'rate_limited'))) {
          this.markCooling(pid);
        }
      }
    }

    if (this.cache) {
      const stale = this.cache.getStale(q);
      if (stale) return stale;
    }
    if (lastErr) throw lastErr;
    return [];
  }
}

let defaultRegistry: SearchRegistry | null = null;
function getDefaultRegistry(opts?: any): SearchRegistry {
  if (!defaultRegistry) defaultRegistry = new SearchRegistry(opts);
  return defaultRegistry;
}

export function createSearchRegistry(options?: any): SearchRegistry {
  return new SearchRegistry(options);
}

export function createRegistry(options?: any): SearchRegistry {
  return new SearchRegistry(options);
}

export async function search(query: any, options?: any): Promise<SearchResult[]> {
  if (query && typeof query === 'object' && !Array.isArray(query) && typeof query.query === 'string') {
    const reg = getDefaultRegistry(options);
    return reg.search(query, options);
  }
  const reg = getDefaultRegistry(options);
  return reg.search(query, options);
}

export function resetSearchRegistry(): void {
  defaultRegistry = null;
}

export default { search, SearchRegistry, createSearchRegistry, createRegistry, resetSearchRegistry };
