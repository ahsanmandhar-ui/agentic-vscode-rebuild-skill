// src/search/cache.ts
// LRU cache with 24h TTL for search results. Normalizes query keys.

export interface CacheOptions {
  maxSize?: number;
  capacity?: number;
  maxEntries?: number;
  ttlMs?: number;
  ttl?: number;
  now?: () => number;
  setClock?: (fn: () => number) => void;
}

export function normalizeQuery(query: unknown): string {
  return String(query ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

let clockFn: () => number = () => Date.now();

export function setClock(fn: () => number): void {
  if (typeof fn === 'function') clockFn = fn;
}

export function getClock(): () => number {
  return clockFn;
}

interface Entry<V> {
  value: V;
  expiresAt: number;
  lastAccess: number;
}

export class LRUCache<V = unknown> {
  private map: Map<string, Entry<V>> = new Map();
  private maxSize: number;
  private ttlMs: number;
  private nowFn: () => number;
  private accessSeq: number = 0;

  constructor(options?: number | CacheOptions) {
    let opts: CacheOptions = {};
    if (typeof options === 'number') {
      opts = { maxSize: options };
    } else if (options && typeof options === 'object') {
      opts = options as CacheOptions;
    }
    this.maxSize = Number(
      opts.maxSize ?? opts.capacity ?? opts.maxEntries ?? 500,
    ) || 500;
    this.ttlMs = Number(opts.ttlMs ?? opts.ttl ?? 24 * 60 * 60 * 1000) || 24 * 60 * 60 * 1000;
    this.nowFn = typeof opts.now === 'function' ? (opts.now as () => number) : clockFn;
  }

  private now(): number {
    try { return this.nowFn(); } catch { return Date.now(); }
  }

  private isExpired(e: Entry<V>): boolean {
    return e.expiresAt <= this.now();
  }

  private evictIfNeeded(): void {
    if (this.map.size < this.maxSize) return;
    // remove expired first
    for (const [k, v] of this.map) {
      if (this.isExpired(v)) this.map.delete(k);
    }
    if (this.map.size < this.maxSize) return;
    // LRU: remove least recently accessed
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    for (const [k, v] of this.map) {
      if (v.lastAccess < oldestTime) {
        oldestTime = v.lastAccess;
        oldestKey = k;
      }
    }
    if (oldestKey !== null) this.map.delete(oldestKey);
  }

  get(key: unknown): V | undefined {
    const k = typeof key === 'string' ? normalizeQuery(key) : String(key ?? '');
    const e = this.map.get(k);
    if (!e) return undefined;
    if (this.isExpired(e)) {
      return undefined;
    }
    e.lastAccess = ++this.accessSeq;
    return e.value;
  }

  set(key: unknown, value: V, ttlMs?: number): this {
    const k = typeof key === 'string' ? normalizeQuery(key) : String(key ?? '');
    this.evictIfNeeded();
    const now = this.now();
    const ttl = typeof ttlMs === 'number' ? ttlMs : this.ttlMs;
    this.map.delete(k);
    this.map.set(k, { value, expiresAt: now + ttl, lastAccess: ++this.accessSeq });
    // enforce size
    while (this.map.size > this.maxSize) {
      const first = this.map.keys().next().value;
      if (first === undefined) break;
      this.map.delete(first);
    }
    return this;
  }

  has(key: unknown): boolean {
    const k = typeof key === 'string' ? normalizeQuery(key) : String(key ?? '');
    const e = this.map.get(k);
    if (!e) return false;
    if (this.isExpired(e)) {
      this.map.delete(k);
      return false;
    }
    return true;
  }

  delete(key: unknown): boolean {
    const k = typeof key === 'string' ? normalizeQuery(key) : String(key ?? '');
    return this.map.delete(k);
  }

  clear(): void {
    this.map.clear();
  }

  size(): number {
    // purge expired
    for (const [k, v] of [...this.map.entries()]) {
      if (this.isExpired(v)) this.map.delete(k);
    }
    return this.map.size;
  }

  capacity(): number { return this.maxSize; }
  maxSizeValue(): number { return this.maxSize; }

  get maxEntries(): number { return this.maxSize; }
  get ttl(): number { return this.ttlMs; }

  stats(): { entries: number; size: number; maxSize: number; capacity: number; ttlMs: number; hits?: number; misses?: number } {
    return {
      entries: this.size(),
      size: this.size(),
      maxSize: this.maxSize,
      capacity: this.maxSize,
      ttlMs: this.ttlMs,
    };
  }

  getStats(): ReturnType<LRUCache<V>['stats']> { return this.stats(); }

  keys(): string[] {
    return [...this.map.keys()];
  }

  values(): V[] {
    const out: V[] = [];
    for (const [k, v] of this.map) {
      if (this.isExpired(v)) { this.map.delete(k); continue; }
      out.push(v.value);
    }
    return out;
  }

  entries(): Array<[string, V]> {
    const out: Array<[string, V]> = [];
    for (const [k, v] of this.map) {
      if (this.isExpired(v)) { this.map.delete(k); continue; }
      out.push([k, v.value]);
    }
    return out;
  }

  // Stale read: return even if expired (for fallback)
  getStale(key: unknown): V | undefined {
    const k = typeof key === 'string' ? normalizeQuery(key) : String(key ?? '');
    const e = this.map.get(k);
    return e ? e.value : undefined;
  }
}

export type SearchCache<V = unknown> = LRUCache<V>;
export const SearchCache = LRUCache;

export function createCache<V = unknown>(options?: number | CacheOptions): LRUCache<V> {
  return new LRUCache<V>(options);
}

export default {
  normalizeQuery,
  LRUCache,
  SearchCache,
  createCache,
  setClock,
  getClock,
};
