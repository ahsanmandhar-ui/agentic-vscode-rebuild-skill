// src/search/duckduckgo.ts
// DuckDuckGo search adapter with exponential backoff + jitter.

import { RateLimitError, type SearchOptions, type SearchResult, type SearchProvider } from './types';
import { isPrivateOrReservedHost } from '../providers/transport';

function assertSafeEndpoint(endpoint: string): void {
  let u: URL;
  try { u = new URL(endpoint); } catch { throw new Error('invalid endpoint'); }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('unsupported protocol');
  if (isPrivateOrReservedHost(u.hostname)) throw new Error('SSRF guard: host not allowed');
}

export interface DuckDuckGoOptions {
  fetch?: (url: string, init?: any) => Promise<any>;
  sleep?: (ms: number) => Promise<void>;
  maxRetries?: number;
  retries?: number;
  baseDelayMs?: number;
  baseDelay?: number;
  maxDelayMs?: number;
  maxDelay?: number;
  jitter?: boolean | number;
  timeoutMs?: number;
  signal?: AbortSignal;
  endpoint?: string;
  id?: string;
  name?: string;
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function backoffDelay(attempt: number, baseMs = 200, maxMs = 5000, jitter: boolean | number = true): number {
  const exp = Math.min(maxMs, baseMs * Math.pow(2, attempt));
  let j = 0;
  if (jitter === true) j = Math.random() * baseMs;
  else if (typeof jitter === 'number') j = Math.random() * jitter;
  return Math.min(maxMs, exp + j);
}

function parseResults(json: any): SearchResult[] {
  const out: SearchResult[] = [];
  if (!json || typeof json !== 'object') return out;
  const abstract = json.AbstractText || json.Abstract;
  const abstractUrl = json.AbstractURL || json.AbstractSource;
  if (abstract) out.push({ title: json.Heading || 'DuckDuckGo', url: abstractUrl || '', snippet: abstract, source: 'duckduckgo' });
  const topics = Array.isArray(json.RelatedTopics) ? json.RelatedTopics : [];
  for (const t of topics) {
    if (!t || typeof t !== 'object') continue;
    if (t.Text && t.FirstURL) out.push({ title: String(t.Text).slice(0, 120), url: t.FirstURL, snippet: t.Text, source: 'duckduckgo' });
    else if (Array.isArray(t.Topics)) {
      for (const sub of t.Topics) {
        if (sub && sub.Text && sub.FirstURL) out.push({ title: String(sub.Text).slice(0, 120), url: sub.FirstURL, snippet: sub.Text, source: 'duckduckgo' });
      }
    }
  }
  return out;
}

function applyLimit(results: SearchResult[], options: any): SearchResult[] {
  const limit = Number(options?.maxResults ?? options?.limit);
  if (Number.isFinite(limit) && limit > 0) return results.slice(0, limit);
  return results;
}

export async function searchDuckDuckGo(query: string, options: DuckDuckGoOptions & SearchOptions = {}): Promise<SearchResult[]> {
  const q = String(query ?? '').trim();
  if (!q) return [];
  const fetchFn = typeof options.fetch === 'function' ? options.fetch : globalThis.fetch;
  const sleep = typeof options.sleep === 'function' ? options.sleep : (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
  const maxRetries = Number(options.maxRetries ?? options.retries ?? 3) || 0;
  const base = Number(options.baseDelayMs ?? options.baseDelay ?? 200) || 200;
  const max = Number(options.maxDelayMs ?? options.maxDelay ?? 5000) || 5000;
  const jitter = options.jitter === undefined ? true : options.jitter;
  const endpoint = options.endpoint || 'https://api.duckduckgo.com/';
  assertSafeEndpoint(endpoint);
  const url = `${endpoint}?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1`;
  const init: any = { method: 'GET' };
  if (options.signal) init.signal = options.signal;

  let lastErr: any = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetchFn(url, init);
      if (res && typeof res.ok === 'boolean') {
        if (!res.ok) {
          const status = res.status;
          if (status === 429) {
            lastErr = new RateLimitError('DuckDuckGo rate limited', { status: 429, provider: 'duckduckgo' });
            if (attempt < maxRetries) { await sleep(backoffDelay(attempt, base, max, jitter)); continue; }
            throw lastErr;
          }
          if (status >= 500) {
            lastErr = new Error(`DuckDuckGo server error ${status}`);
            if (attempt < maxRetries) { await sleep(backoffDelay(attempt, base, max, jitter)); continue; }
            throw lastErr;
          }
          throw new Error(`DuckDuckGo request failed: ${status}`);
        }
        const json = typeof res.json === 'function' ? await res.json() : res;
        return applyLimit(parseResults(json), options);
      }
      // already parsed json
      return applyLimit(parseResults(res), options);
    } catch (e: any) {
      lastErr = e;
      const isNetwork = !e?.status && (e?.name === 'TypeError' || e?.name === 'AbortError' || /network|fetch/i.test(String(e?.message)));
      if (attempt < maxRetries && (isNetwork || e instanceof RateLimitError)) {
        // RateLimitError already retried above; here only network
        if (!(e instanceof RateLimitError)) await sleep(backoffDelay(attempt, base, max, jitter));
        else if (attempt < maxRetries) await sleep(backoffDelay(attempt, base, max, jitter));
        continue;
      }
      if (attempt >= maxRetries) throw e;
      await sleep(backoffDelay(attempt, base, max, jitter));
    }
  }
  throw lastErr ?? new Error('DuckDuckGo search failed');
}

export function createDuckDuckGoAdapter(options: DuckDuckGoOptions = {}): SearchProvider {
  const opts = { ...options };
  const provider: SearchProvider = {
    id: opts.id ?? 'duckduckgo',
    name: opts.name ?? 'DuckDuckGo',
    label: opts.name ?? 'DuckDuckGo',
    search: (query: string, searchOpts?: SearchOptions) => searchDuckDuckGo(query, { ...opts, ...(searchOpts || {}) }),
    health: async () => ({ ok: true, provider: opts.id ?? 'duckduckgo' }),
    test: async (query?: string) => {
      const r = await searchDuckDuckGo(query || 'test', { ...opts, maxResults: 3 });
      return { ok: true, count: r.length, provider: opts.id ?? 'duckduckgo' };
    },
  };
  return provider;
}

export const createDuckDuckGoProvider = createDuckDuckGoAdapter;
export const DuckDuckGoAdapter = createDuckDuckGoAdapter;
export const duckDuckGoSearch = searchDuckDuckGo;

export default { searchDuckDuckGo, createDuckDuckGoAdapter, createDuckDuckGoProvider, backoffDelay };
