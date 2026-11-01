// src/search/serpapi.ts
// SerpAPI adapter.

import { RateLimitError, type SearchOptions, type SearchResult, type SearchProvider } from './types';
import { isPrivateOrReservedHost } from '../providers/transport';

function assertSafeEndpoint(endpoint: string): void {
  let u: URL;
  try { u = new URL(endpoint); } catch { throw new Error('invalid endpoint'); }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('unsupported protocol');
  if (isPrivateOrReservedHost(u.hostname)) throw new Error('SSRF guard: host not allowed');
}

export interface SerpApiSearchOptions {
  fetch?: (url: string, init?: any) => Promise<any>;
  apiKey?: string;
  key?: string;
  token?: string;
  secret?: string;
  storage?: any;
  secretStorage?: any;
  endpoint?: string;
  maxResults?: number;
  limit?: number;
  signal?: AbortSignal;
  [key: string]: unknown;
}

function resolveStorage(opts: any): any {
  return opts?.storage ?? opts?.secretStorage ?? opts?.secretStorageLike;
}

async function resolveApiKey(opts: any): Promise<string | undefined> {
  const direct = opts?.apiKey ?? opts?.key ?? opts?.token ?? opts?.secret;
  if (direct) return String(direct).trim();
  const storage = resolveStorage(opts);
  if (!storage) return undefined;
  for (const k of [`vibecode.search.serpapi.apiKey`, `vibecode.search.serpapi.api-key`, `vibecode.search.serpapi.key`, `vibecode.search.serpapi.api_key`]) {
    try {
      const v = await storage.get(k);
      if (v) return String(v).trim();
    } catch { /* ignore */ }
  }
  try {
    const { AccountManager } = await import('../providers/accounts');
    const mgr = new (AccountManager as any)(storage);
    const accounts = await mgr.listAccounts('serpapi');
    if (accounts && accounts.length) {
      const sec = await mgr.getSecret(accounts[0]);
      if (sec) return String(sec).trim();
    }
  } catch { /* ignore */ }
  return undefined;
}

function parseResults(json: any): SearchResult[] {
  const out: SearchResult[] = [];
  const results = json?.organic_results ?? json?.results ?? [];
  if (!Array.isArray(results)) return out;
  for (const r of results) {
    if (!r || typeof r !== 'object') continue;
    out.push({
      title: String(r.title ?? ''),
      url: String(r.link ?? r.url ?? ''),
      snippet: r.snippet ?? r.description,
      description: r.snippet,
      source: 'serpapi',
    });
  }
  return out;
}

function applyLimit(results: SearchResult[], options: any): SearchResult[] {
  const limit = Number(options?.maxResults ?? options?.limit);
  if (Number.isFinite(limit) && limit > 0) return results.slice(0, limit);
  return results;
}

export async function searchSerpApi(query: string, options: SerpApiSearchOptions & SearchOptions = {}): Promise<SearchResult[]> {
  const q = String(query ?? '').trim();
  if (!q) return [];
  const fetchFn = typeof options.fetch === 'function' ? options.fetch : globalThis.fetch;
  const apiKey = await resolveApiKey(options);
  if (!apiKey) throw new Error('SerpAPI key is required');
  const endpoint = options.endpoint || 'https://serpapi.com/search.json';
  assertSafeEndpoint(endpoint);
  const url = `${endpoint}?q=${encodeURIComponent(q)}&num=${Number(options.maxResults ?? options.limit ?? 10) || 10}`;
  const init: any = { method: 'GET', headers: { 'X-API-Key': apiKey, 'Authorization': `Bearer ${apiKey}`, 'Accept': 'application/json' } };
  if (options.signal) init.signal = options.signal;

  const res = await fetchFn(url, init);
  if (res && typeof res.ok === 'boolean') {
    if (!res.ok) {
      const status = res.status;
      if (status === 429) {
        throw new RateLimitError('SerpAPI rate limited', { status: 429, provider: 'serpapi' });
      }
      throw new Error(`SerpAPI request failed: ${status}`);
    }
    const json = typeof res.json === 'function' ? await res.json() : res;
    return applyLimit(parseResults(json), options);
  }
  return applyLimit(parseResults(res), options);
}

export function createSerpApiAdapter(options: SerpApiSearchOptions = {}): SearchProvider {
  const opts = { ...options };
  const provider: SearchProvider = {
    id: (opts.id as string) ?? 'serpapi',
    name: (opts.name as string) ?? 'SerpAPI',
    label: (opts.name as string) ?? 'SerpAPI',
    search: (query: string, searchOpts?: SearchOptions) => searchSerpApi(query, { ...opts, ...(searchOpts || {}) }),
    health: async () => ({ ok: true, provider: (opts.id as string) ?? 'serpapi' }),
    test: async (query?: string) => {
      const r = await searchSerpApi(query || 'test', { ...opts, maxResults: 3 });
      return { ok: true, count: r.length, provider: (opts.id as string) ?? 'serpapi' };
    },
  };
  return provider;
}

export const createSerpApiProvider = createSerpApiAdapter;
export const createSerpapiAdapter = createSerpApiAdapter;
export const SerpApiAdapter = createSerpApiAdapter;
export const serpApiSearch = searchSerpApi;
export const serpapiSearch = searchSerpApi;

export default { searchSerpApi, createSerpApiAdapter, createSerpApiProvider, serpApiSearch };
