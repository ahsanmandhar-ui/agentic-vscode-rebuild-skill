// src/perf/prompt-cache.ts
// Simple in-memory prompt/result cache with clearing on deactivate.

export interface PromptCacheEntry<T = unknown> {
  key: string;
  value: T;
  createdAt: number;
  expiresAt?: number;
}

export class PromptCache<T = unknown> {
  private store: Map<string, PromptCacheEntry<T>> = new Map();
  private maxSize: number;
  private ttlMs: number;
  constructor(options: { maxSize?: number; ttlMs?: number } = {}) {
    this.maxSize = options.maxSize ?? 100;
    this.ttlMs = options.ttlMs ?? 5 * 60 * 1000;
  }
  get(key: string): T | undefined {
    const e = this.store.get(key);
    if (!e) return undefined;
    if (e.expiresAt !== undefined && Date.now() > e.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return e.value;
  }
  set(key: string, value: T, ttlMs?: number): void {
    if (this.store.size >= this.maxSize && !this.store.has(key)) {
      const first = this.store.keys().next().value;
      if (first !== undefined) this.store.delete(first);
    }
    this.store.set(key, { key, value, createdAt: Date.now(), expiresAt: Date.now() + (ttlMs ?? this.ttlMs) });
  }
  has(key: string): boolean { return this.get(key) !== undefined; }
  delete(key: string): boolean { return this.store.delete(key); }
  clear(): void { this.store.clear(); }
  size(): number { return this.store.size; }
}

const globalCache = new PromptCache();
export function getPromptCache(): PromptCache { return globalCache; }
export function clearPromptCache(): void { globalCache.clear(); }
export default { PromptCache, getPromptCache, clearPromptCache };