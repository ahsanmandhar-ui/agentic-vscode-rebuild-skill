import { describe, it, expect, beforeEach } from 'vitest';

import { RouterErrorCode, RouterError } from '../providers/router-types';
import { validateUrl, TransportError } from '../providers/transport';
import { ProviderRegistry, getRegistry, registerProvider, listProviders } from '../providers/registry';
import { createOpenRouterAdapter } from '../providers/adapters';
import {
  recordFailure,
  recordSuccess,
  selectWithFallback,
  getCircuitState,
  resetFallback,
  setClock,
  setFallbackChain,
  getHealth,
  probeHealth,
} from '../providers/fallback';
import {
  AccountManager,
  InMemorySecretStorage,
  maskKey,
  storageKey,
} from '../providers/accounts';
import { TelemetryStore } from '../providers/telemetry';

describe('router-types smoke', () => {
  it('exposes RouterErrorCode values', () => {
    expect(RouterErrorCode.Unknown).toBe('unknown');
    expect(RouterErrorCode.Network).toBe('network');
    expect(RouterErrorCode.RateLimited).toBe('rate_limited');
  });

  it('allows constructing a RouterError-shaped object', () => {
    const e: RouterError = { code: RouterErrorCode.BadRequest, message: 'bad' };
    expect(e.code).toBe('bad_request');
  });
});

describe('transport URL validation (SSRF)', () => {
  it('accepts valid https url', () => {
    expect(validateUrl('https://api.example.com/v1')).toBe(true);
  });

  it('rejects invalid url', () => {
    expect(() => validateUrl('not a url')).toThrow(TransportError);
  });

  it('rejects non-http protocols', () => {
    expect(() => validateUrl('file:///etc/passwd')).toThrow(TransportError);
    expect(() => validateUrl('ftp://example.com')).toThrow(TransportError);
  });

  it('blocks cloud metadata IP (SSRF)', () => {
    expect(() => validateUrl('http://169.254.169.254/latest/meta-data/')).toThrow(TransportError);
  });

  it('requires allowlist for custom providers', () => {
    const custom = { id: 'custom', custom: true };
    expect(() => validateUrl('https://evil.example.com', custom)).toThrow(TransportError);
  });

  it('enforces allowlist host matching', () => {
    const custom = { id: 'custom', custom: true, allowlist: ['api.example.com'] };
    expect(() => validateUrl('https://evil.example.com', custom)).toThrow(TransportError);
    expect(validateUrl('https://api.example.com/v1', custom)).toBe(true);
  });
});

describe('registry built-ins', () => {
  beforeEach(() => {
    ProviderRegistry.reset();
  });

  it('registers built-in adapters on first access', () => {
    const reg = getRegistry();
    expect(reg.has('openrouter')).toBe(true);
    expect(reg.has('litellm')).toBe(true);
    expect(reg.has('ollama')).toBe(true);
    expect(reg.has('custom')).toBe(true);
    expect(reg.list().length).toBeGreaterThanOrEqual(4);
  });

  it('supports register/get/unregister', () => {
    const reg = getRegistry();
    const p = createOpenRouterAdapter({ id: 'myprov' });
    reg.register(p);
    expect(reg.get('myprov')).toBeDefined();
    expect(reg.has('myprov')).toBe(true);
    expect(reg.unregister('myprov')).toBe(true);
    expect(reg.has('myprov')).toBe(false);
  });

  it('registerProvider helper works with object', () => {
    ProviderRegistry.reset();
    const p = createOpenRouterAdapter({ id: 'helper' });
    registerProvider(p);
    expect(listProviders().some((x) => x.id === 'helper')).toBe(true);
  });
});

describe('fallback circuit breaker', () => {
  beforeEach(() => {
    resetFallback();
    setClock(() => 1000);
  });

  it('starts closed', () => {
    expect(getCircuitState('openrouter')).toBe('closed');
  });

  it('opens after threshold failures', () => {
    recordFailure('openrouter');
    recordFailure('openrouter');
    recordFailure('openrouter');
    expect(getCircuitState('openrouter')).toBe('open');
  });

  it('selectWithFallback skips open circuits', () => {
    recordFailure('openrouter');
    recordFailure('openrouter');
    recordFailure('openrouter');
    const chain = [
      { providerId: 'openrouter', modelId: 'm1' },
      { providerId: 'litellm', modelId: 'm2' },
    ];
    const sel = selectWithFallback(chain);
    expect(sel?.providerId).toBe('litellm');
  });

  it('recovers to half-open after cooldown', () => {
    let t = 1000;
    setClock(() => t);
    recordFailure('openrouter');
    recordFailure('openrouter');
    recordFailure('openrouter');
    expect(getCircuitState('openrouter')).toBe('open');
    t = 1000 + 30001;
    expect(getCircuitState('openrouter')).toBe('half-open');
  });

  it('recordSuccess closes circuit', () => {
    recordFailure('openrouter');
    recordFailure('openrouter');
    recordFailure('openrouter');
    recordSuccess('openrouter');
    expect(getCircuitState('openrouter')).toBe('closed');
  });

  it('probeHealth records health', async () => {
    const rec = await probeHealth('openrouter', async () => ({ ok: true, status: 'ok' }));
    expect(rec.status).toBe('ok');
    expect(getHealth('openrouter')?.status).toBe('ok');
  });
});

describe('accounts masking & strategies', () => {
  it('maskKey masks correctly', () => {
    expect(maskKey('')).toBe('');
    expect(maskKey('abcd')).toBe('****');
    expect(maskKey('abcdefgh')).toBe('ab...gh');
    expect(maskKey('key-1234567890abcdef')).toBe('key-...cdef');
  });

  it('storageKey builds keys', () => {
    expect(storageKey('openrouter', 'accounts')).toBe('vibecode.router.openrouter.accounts');
    expect(storageKey('openrouter', 'api-key', 'a1')).toBe('vibecode.router.openrouter.api-key.a1');
  });

  it('addAccount and listAccounts', async () => {
    const storage = new InMemorySecretStorage();
    const mgr = new AccountManager(storage);
    const a = await mgr.addAccount({ providerId: 'openrouter', secret: 'sk-secret', label: 'A' });
    expect(a.id).toBeTruthy();
    const list = await mgr.listAccounts('openrouter');
    expect(list.length).toBe(1);
    const sec = await mgr.getSecret(list[0]);
    expect(sec).toBe('sk-secret');
  });

  it('removeAccount deletes secret', async () => {
    const storage = new InMemorySecretStorage();
    const mgr = new AccountManager(storage);
    const a = await mgr.addAccount({ providerId: 'openrouter', secret: 'sk-secret' });
    const ok = await mgr.removeAccount(a.id, 'openrouter');
    expect(ok).toBe(true);
    const list = await mgr.listAccounts('openrouter');
    expect(list.length).toBe(0);
  });

  it('selectAccount strategies', () => {
    const mgr = new AccountManager(new InMemorySecretStorage());
    const accounts = [
      { id: 'a', provider: 'p', usageCount: 0 },
      { id: 'b', provider: 'p', usageCount: 0 },
    ] as any;
    const m = mgr.selectAccount(accounts, 'manual');
    expect(m?.id).toBe('a');
    const r1 = mgr.selectAccount(accounts, 'round-robin');
    const r2 = mgr.selectAccount(accounts, 'round-robin');
    expect(r1?.id).not.toBeUndefined();
    expect(r2?.id).not.toBeUndefined();
    const l = mgr.selectAccount(accounts, 'least-used');
    expect(['a', 'b']).toContain(l?.id);
  });
});

describe('telemetry aggregation', () => {
  it('aggregates counts, tokens, cost, latency', () => {
    const store = new TelemetryStore();
    store.record({ provider: 'openrouter', model: 'gpt-4o-mini', tokensIn: 10, tokensOut: 20, latencyMs: 100, cost: 0.01, success: true });
    store.record({ provider: 'openrouter', model: 'gpt-4o-mini', tokensIn: 5, tokensOut: 5, latencyMs: 200, cost: 0.02, success: false });
    const stats = store.getStats();
    expect(stats.count).toBe(2);
    expect(stats.requests).toBe(2);
    expect(stats.successes).toBe(1);
    expect(stats.failures).toBe(1);
    expect(stats.tokensIn).toBe(15);
    expect(stats.tokensOut).toBe(25);
    expect(stats.totalTokens).toBe(40);
    expect(stats.totalCost).toBeCloseTo(0.03);
    expect(stats.avgLatencyMs).toBe(150);
    expect(stats.minLatencyMs).toBe(100);
    expect(stats.maxLatencyMs).toBe(200);
    expect(stats.byProvider['openrouter'].count).toBe(2);
  });

  it('filters by provider/model/success', () => {
    const store = new TelemetryStore();
    store.record({ provider: 'a', model: 'm1', success: true, latencyMs: 10 });
    store.record({ provider: 'b', model: 'm2', success: false, latencyMs: 20 });
    expect(store.getStats({ provider: 'a' }).count).toBe(1);
    expect(store.getStats({ success: false }).count).toBe(1);
    expect(store.getRecords({ provider: 'b' }).length).toBe(1);
  });

  it('capacity trims records', () => {
    const store = new TelemetryStore({ capacity: 2 });
    store.record({ provider: 'a' });
    store.record({ provider: 'b' });
    store.record({ provider: 'c' });
    expect(store.size()).toBe(2);
  });
});
