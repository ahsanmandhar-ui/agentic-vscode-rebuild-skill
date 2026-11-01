import { describe, it, expect, beforeEach } from 'vitest';

import { normalizeQuery, createCache, setClock, LRUCache } from '../search/cache';
import { backoffDelay, searchDuckDuckGo, createDuckDuckGoAdapter } from '../search/duckduckgo';
import { searchBrave, createBraveAdapter } from '../search/brave';
import { searchSerpApi, createSerpApiAdapter } from '../search/serpapi';
import { createSearchRegistry, resetSearchRegistry } from '../search/registry';
import {
  CapabilityCache,
  setClock as setCapClock,
  resetClock,
  probeCapabilities,
  getCapabilities,
  setManualOverride,
  clearManualOverride,
  clearCapabilityCache,
  normalizeCapabilities,
} from '../providers/capabilities';
import { collectSystemInfo } from '../system/info';
import { renderSearchPanel } from '../ui/search-panel';
describe('search cache: normalize', () => {
  it('trims and lowercases', () => {
    expect(normalizeQuery('  Hello World  ')).toBe('hello world');
  });
  it('collapses whitespace', () => {
    expect(normalizeQuery('a   b\tc')).toBe('a b c');
  });
  it('handles non-string', () => {
    expect(normalizeQuery(null)).toBe('');
    expect(normalizeQuery(42)).toBe('42');
  });
});

describe('search cache: TTL', () => {
  it('expires entries', () => {
    let now = 1000;
    const c = createCache<number>({ maxSize: 10, ttlMs: 100, now: () => now });
    c.set('q', 5);
    expect(c.get('q')).toBe(5);
    now = 1200;
    expect(c.get('q')).toBeUndefined();
  });
  it('getStale returns expired value', () => {
    let now = 1000;
    const c = createCache<number>({ maxSize: 10, ttlMs: 100, now: () => now });
    c.set('q', 7);
    now = 2000;
    expect(c.get('q')).toBeUndefined();
    expect(c.getStale('q')).toBe(7);
  });
  it('has reflects expiry', () => {
    let now = 1000;
    const c = createCache<number>({ maxSize: 10, ttlMs: 100, now: () => now });
    c.set('q', 1);
    now = 2000;
    expect(c.has('q')).toBe(false);
  });
});

describe('search cache: LRU', () => {
  it('evicts least recently used', () => {
    const c = createCache<number>({ maxSize: 2, ttlMs: 100000 });
    c.set('a', 1);
    c.set('b', 2);
    c.get('a');
    c.set('c', 3);
    expect(c.has('b')).toBe(false);
    expect(c.get('a')).toBe(1);
    expect(c.get('c')).toBe(3);
  });
  it('respects number constructor', () => {
    const c = new LRUCache<number>(3);
    expect(c.capacity()).toBe(3);
  });
  it('size purges expired', () => {
    let now = 1000;
    const c = createCache<number>({ maxSize: 10, ttlMs: 100, now: () => now });
    c.set('a', 1);
    now = 2000;
    expect(c.size()).toBe(0);
  });
});

describe('duckduckgo backoff', () => {
  it('computes exponential delay', () => {
    const d0 = backoffDelay(0, 200, 5000, false);
    const d1 = backoffDelay(1, 200, 5000, false);
    expect(d0).toBe(200);
    expect(d1).toBe(400);
  });
  it('caps at max', () => {
    const d = backoffDelay(10, 200, 5000, false);
    expect(d).toBeLessThanOrEqual(5000);
  });
  it('adds jitter when true', () => {
    const d = backoffDelay(0, 200, 5000, true);
    expect(d).toBeGreaterThanOrEqual(200);
    expect(d).toBeLessThanOrEqual(400);
  });
});

describe('duckduckgo search', () => {
  it('parses results', async () => {
    const fetchFn = async () => ({
      ok: true,
      json: async () => ({ AbstractText: 'abs', AbstractURL: 'http://x', Heading: 'H', RelatedTopics: [{ Text: 't1', FirstURL: 'http://y' }] }),
    });
    const r = await searchDuckDuckGo('q', { fetch: fetchFn as any, maxResults: 10 });
    expect(r.length).toBe(2);
    expect(r[0].url).toBe('http://x');
  });
  it('retries on 429', async () => {
    let calls = 0;
    const fetchFn = async () => {
      calls++;
      if (calls === 1) return { ok: false, status: 429, json: async () => ({}) };
      return { ok: true, json: async () => ({ RelatedTopics: [] }) };
    };
    const sleep = async () => {};
    const r = await searchDuckDuckGo('q', { fetch: fetchFn as any, maxRetries: 2, sleep, baseDelayMs: 1, jitter: false });
    expect(calls).toBe(2);
    expect(r).toEqual([]);
  });
  it('returns [] for empty query', async () => {
    const r = await searchDuckDuckGo('   ');
    expect(r).toEqual([]);
  });
  it('adapter health/test', async () => {
    const p = createDuckDuckGoAdapter({ fetch: async () => ({ ok: true, json: async () => ({}) }) as any });
    expect(p.id).toBe('duckduckgo');
    const h = await p.health!();
    expect(h.ok).toBe(true);
  });
});

describe('brave parsing', () => {
  it('throws without api key', async () => {
    await expect(searchBrave('q', { fetch: async () => ({ ok: true, json: async () => ({}) }) as any })).rejects.toThrow(/api key/i);
  });
  it('parses web.results', async () => {
    const fetchFn = async () => ({ ok: true, json: async () => ({ web: { results: [{ title: 't', url: 'u', description: 'd' }] } }) });
    const r = await searchBrave('q', { fetch: fetchFn as any, apiKey: 'k', maxResults: 5 });
    expect(r.length).toBe(1);
    expect(r[0].title).toBe('t');
    expect(r[0].source).toBe('brave');
  });
  it('adapter', async () => {
    const p = createBraveAdapter({ apiKey: 'k', fetch: async () => ({ ok: true, json: async () => ({ web: { results: [] } }) }) as any });
    expect(p.id).toBe('brave');
  });
});

describe('serpapi parsing', () => {
  it('throws without key', async () => {
    await expect(searchSerpApi('q', { fetch: async () => ({ ok: true, json: async () => ({}) }) as any })).rejects.toThrow(/key is required/i);
  });
  it('parses organic_results', async () => {
    const fetchFn = async () => ({ ok: true, json: async () => ({ organic_results: [{ title: 't', link: 'u', snippet: 's' }] }) });
    const r = await searchSerpApi('q', { fetch: fetchFn as any, apiKey: 'k' });
    expect(r.length).toBe(1);
    expect(r[0].url).toBe('u');
    expect(r[0].source).toBe('serpapi');
  });
});

describe('registry fallback', () => {
  beforeEach(() => resetSearchRegistry());
  it('falls back on rate limit', async () => {
    const { RateLimitError } = await import('../search/types');
    const failing = {
      id: 'duckduckgo',
      search: async () => { throw new RateLimitError('rl', { status: 429 }); },
    } as any;
    const ok = { id: 'brave', search: async () => [{ title: 'r', url: 'u', source: 'brave' }] } as any;
    const reg = createSearchRegistry({ providers: [failing, ok], cache: false });
    const r = await reg.search('q');
    expect(r[0].source).toBe('brave');
    expect(reg.isCooling('duckduckgo')).toBe(true);
  });
  it('uses cache', async () => {
    let calls = 0;
    const p = { id: 'ddg', search: async () => { calls++; return [{ title: 'r', url: 'u' }]; } } as any;
    const reg = createSearchRegistry({ providers: [p], cache: true });
    await reg.search('q');
    const r2 = await reg.search('q');
    expect(calls).toBe(1);
    expect(r2.length).toBe(1);
  });
  it('returns stale on all fail', async () => {
    let now = 1000;
    const cache = createCache<any>({ maxSize: 10, ttlMs: 10, now: () => now });
    const p = { id: 'ddg', search: async () => [{ title: 'stale', url: 'u' }] } as any;
    const reg = createSearchRegistry({ providers: [p], cache });
    await reg.search('q');
    now = 5000;
    const failing = { id: 'ddg2', search: async () => { throw new Error('boom'); } } as any;
    const reg2 = createSearchRegistry({ providers: [failing], cache });
    const r = await reg2.search('q');
    expect(r[0].title).toBe('stale');
  });
  it('normalizes query input object', async () => {
    const p = { id: 'ddg', search: async (q: string) => [{ title: q, url: 'u' }] } as any;
    const reg = createSearchRegistry({ providers: [p], cache: false });
    const r = await reg.search({ query: 'hello' });
    expect(r[0].title).toBe('hello');
  });
});

describe('capabilities probe/override/TTL', () => {
  beforeEach(() => { resetClock(); clearCapabilityCache(); });
  it('conservative defaults', () => {
    const c = getCapabilities('p', 'm');
    expect(c.tools).toBe(false);
    expect(c.contextWindow).toBe(4096);
  });
  it('probe uses provider.capabilities', async () => {
    const provider = { id: 'p', capabilities: async () => ({ tools: true, contextWindow: 8192 }) };
    const cap = await probeCapabilities(provider, 'm', { ttlMs: 1000 });
    expect(cap.tools).toBe(true);
    expect(cap.contextWindow).toBe(8192);
  });
  it('caches probe result with TTL', async () => {
    setCapClock(() => 1000);
    const provider = { id: 'p', capabilities: async () => ({ tools: true }) };
    await probeCapabilities(provider, 'm', { ttlMs: 100 });
    setCapClock(() => 2000);
    const c = getCapabilities('p', 'm');
    expect(c.tools).toBe(false);
  });
  it('override takes precedence', () => {
    setManualOverride('p', 'm', { tools: true, contextWindow: 100 });
    const c = getCapabilities('p', 'm');
    expect(c.tools).toBe(true);
    expect(c.contextWindow).toBe(100);
  });
  it('clear override', () => {
    setManualOverride('p', 'm', { tools: true });
    clearManualOverride('p', 'm');
    const c = getCapabilities('p', 'm');
    expect(c.tools).toBe(false);
  });
  it('force probe bypasses cache/override', async () => {
    setManualOverride('p', 'm', { tools: false });
    const provider = { id: 'p', capabilities: async () => ({ tools: true }) };
    const cap = await probeCapabilities(provider, 'm', { force: true });
    expect(cap.tools).toBe(true);
  });
  it('normalizeCapabilities', () => {
    const c = normalizeCapabilities({ supportsTools: true, maxTokens: 2048 }, 'config');
    expect(c.tools).toBe(true);
    expect(c.contextWindow).toBe(2048);
  });
  it('CapabilityCache override methods', () => {
    const cache = new CapabilityCache(1000);
    cache.setOverride('p', 'm', { tools: true });
    expect(cache.hasOverride('p', 'm')).toBe(true);
    expect(cache.getOverride('p', 'm')?.tools).toBe(true);
    cache.clearOverride('p', 'm');
    expect(cache.hasOverride('p', 'm')).toBe(false);
  });
  it('CapabilityCache TTL expiry', () => {
    setCapClock(() => 1000);
    const cache = new CapabilityCache(100);
    cache.set('p', 'm', { tools: true });
    setCapClock(() => 1200);
    expect(cache.get('p', 'm')).toBeUndefined();
  });
});

describe('system info collect', () => {
  it('returns shape', () => {
    const info = collectSystemInfo(process.cwd());
    expect(typeof info.os).toBe('string');
    expect(typeof info.arch).toBe('string');
    expect(typeof info.cpuCores).toBe('number');
    expect(typeof info.ramMB).toBe('number');
    expect(info.runtimes).toHaveProperty('node');
    expect(info.project.root).toBe(process.cwd());
  });
});

describe('search panel render', () => {
  it('renders provider cards', () => {
    const html = renderSearchPanel({ providers: [{ id: 'brave', name: 'Brave', apiKey: 'k' }], cacheStats: { entries: 2, maxSize: 10 } });
    expect(html).toContain('Brave');
    expect(html).toContain('Entries: 2');
    expect(html).toContain('Max: 10');
  });
  it('renders empty state', () => {
    const html = renderSearchPanel({ providers: [] });
    expect(html).toContain('No search providers configured.');
  });
  it('renders rate limit banner', () => {
    const html = renderSearchPanel({ providers: [{ id: 'x', name: 'X', cooling: true }], status: 'rate limited' });
    expect(html).toContain('rate-limit-banner');
    expect(html).toContain('Rate limited');
  });
  it('escapes html', () => {
    const html = renderSearchPanel({ providers: [{ id: 'a', name: '<script>' }] });
    expect(html).not.toContain('<script>');
  });
});

