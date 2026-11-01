// src/search/brave.ts
// Brave Search API adapter.

import { RateLimitError, type SearchOptions, type SearchResult, type SearchProvider } from './types';
import { InMemorySecretStorage, type SecretStorageLike } from '../providers/accounts';
import { isPrivateOrReservedHost } from '../providers/transport';

function assertSafeEndpoint(endpoint: string): void {
  let u: URL;
  try { u = new URL(endpoint); } catch { throw new Error('invalid endpoint'); }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('unsupported protocol');
  if (isPrivateOrReservedHost(u.hostname)) throw new Error('SSRF guard: host not allowed');
}

export interface BraveSearchOptions {
  fetch?: (url: string, init?: any) => Promise<any>;
  apiKey?: string;
  key?: string;
  token?: string;
  secret?: string;
  storage?: SecretStorageLike;
  secretStorage?: SecretStorageLike;
  endpoint?: string;
  maxResults?: number;
  limit?: number;
  signal?: AbortSignal;
  [key: string]: unknown;
}

function resolveStorage(opts: any): SecretStorageLike | undefined {
  return opts?.storage ?? opts?.secretStorage ?? opts?.secretStorageLike;
}

async function resolveApiKey(opts: any): Promise<string | undefined> {
  const direct = opts?.apiKey ?? opts?.key ?? opts?.token ?? opts?.secret;
  if (direct) return String(direct).trim();
  const storage = resolveStorage(opts);
  if (!storage) return undefined;
  for (const k of [`vibecode.search.brave.apiKey`, `vibecode.search.brave.api-key`, `vibecode.search.brave.key`]) {
    try {
      const v = await storage.get(k);
      if (v) return String(v).trim();
    } catch { /* ignore */ }
  }
  try {
    const { AccountManager } = await import('../providers/accounts');
    const mgr = new (AccountManager as any)(storage);
    const accounts = await mgr.listAccounts('brave');
    if (accounts && accounts.length) {
      const sec = await mgr.getSecret(accounts[0]);
      if (sec) return String(sec).trim();
    }
  } catch { /* ignore */ }
  return undefined;
}

function parseResults(json: any): SearchResult[] {
  const out: SearchResult[] = [];
  const results = json?.web?.results ?? json?.results ?? [];
  if (!Array.isArray(results)) return out;
  for (const r of results) {
    if (!r || typeof r !== 'object') continue;
    out.push({
      title: String(r.title ?? r.name ?? ''),
      url: String(r.url ?? r.link ?? ''),
      snippet: r.description ?? r.snippet,
      description: r.description,
      source: 'brave',
    });
  }
  return out;
}

function applyLimit(results: SearchResult[], options: any): SearchResult[] {
  const limit = Number(options?.maxResults ?? options?.limit);
  if (Number.isFinite(limit) && limit > 0) return results.slice(0, limit);
  return results;
}

export async function searchBrave(query: string, options: BraveSearchOptions & SearchOptions = {}): Promise<SearchResult[]> {
  const q = String(query ?? '').trim();
  if (!q) return [];
  const fetchFn = typeof options.fetch === 'function' ? options.fetch : globalThis.fetch;
  const apiKey = await resolveApiKey(options);
  if (!apiKey) throw new Error('Brave Search API key is required');
  const endpoint = options.endpoint || 'https://api.search.brave.com/res/v1/web/search';
  assertSafeEndpoint(endpoint);
  const url = `${endpoint}?q=${encodeURIComponent(q)}&count=${Number(options.maxResults ?? options.limit ?? 10) || 10}`;
  const init: any = { method: 'GET', headers: { 'X-Subscription-Token': apiKey, 'Accept': 'application/json' } };
  if (options.signal) init.signal = options.signal;

  const res = await fetchFn(url, init);
  if (res && typeof res.ok === 'boolean') {
    if (!res.ok) {
      const status = res.status;
      if (status === 429) {
        throw new RateLimitError('Brave rate limited', { status: 429, provider: 'brave' });
      }
      throw new Error(`Brave request failed: ${status}`);
    }
    const json = typeof res.json === 'function' ? await res.json() : res;
    return applyLimit(parseResults(json), options);
  }
  return applyLimit(parseResults(res), options);
}

export function createBraveAdapter(options: BraveSearchOptions = {}): SearchProvider {
  const opts = { ...options };
  const provider: SearchProvider = {
    id: (opts.id as string) ?? 'brave',
    name: (opts.name as string) ?? 'Brave',
    label: (opts.name as string) ?? 'Brave',
    search: (query: string, searchOpts?: SearchOptions) => searchBrave(query, { ...opts, ...(searchOpts || {}) }),
    health: async () => ({ ok: true, provider: (opts.id as string) ?? 'brave' }),
    test: async (query?: string) => {
      const r = await searchBrave(query || 'test', { ...opts, maxResults: 3 });
      return { ok: true, count: r.length, provider: (opts.id as string) ?? 'brave' };
    },
  };
  return provider;
}

export const createBraveProvider = createBraveAdapter;
export const BraveAdapter = createBraveAdapter;
export const braveSearch = searchBrave;

export default { searchBrave, createBraveAdapter, createBraveProvider, braveSearch };
