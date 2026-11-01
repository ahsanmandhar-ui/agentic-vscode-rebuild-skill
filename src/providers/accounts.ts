// src/providers/accounts.ts
// Multi-account, SecretStorage-backed authorization + selection strategies.
// Pure module (no vscode imports): SecretStorage is injected; an in-memory
// fallback is provided for tests and non-host environments.

import { AccountRecord } from '../routing/types';

export type SelectionStrategy = 'manual' | 'round-robin' | 'least-used';

export interface SecretStorageLike {
  get(key: string): Promise<string | undefined>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

export function adaptSecretStorage(raw: any): SecretStorageLike {
  if (!raw) throw new Error('secret storage is required');
  if (typeof raw.get === 'function' && typeof raw.set === 'function' && typeof raw.delete === 'function') {
    return raw as SecretStorageLike;
  }
  if (typeof raw.get === 'function' && typeof raw.store === 'function' && typeof raw.delete === 'function') {
    return {
      get: (k: string) => raw.get(k),
      set: (k: string, v: string) => raw.store(k, v),
      delete: (k: string) => raw.delete(k),
    };
  }
  throw new Error('invalid secret storage: missing get/store/delete');
}

export class InMemorySecretStorage implements SecretStorageLike {
  private readonly _store = new Map<string, string>();
  async get(key: string): Promise<string | undefined> { return this._store.get(key); }
  async set(key: string, value: string): Promise<void> { this._store.set(key, value); }
  async delete(key: string): Promise<void> { this._store.delete(key); }
  async store(key: string, value: string): Promise<void> { return this.set(key, value); }
  keys(): string[] { return Array.from(this._store.keys()); }
  clear(): void { this._store.clear(); }
}

const ID_RE = /^[A-Za-z0-9._-]{1,64}$/;
function assertId(value: string, label: string): string {
  if (!ID_RE.test(value)) throw new Error(`invalid ${label}: ${value}`);
  return value;
}

export function storageKey(providerId: string, type: string, accountId?: string): string {
  const p = assertId(String(providerId), 'providerId');
  const t = assertId(String(type), 'type');
  const base = `vibecode.router.${p}.${t}`;
  if (!accountId) return base;
  return `${base}.${assertId(String(accountId), 'accountId')}`;
}

export function maskKey(value?: string): string {
  if (!value) return '';
  const s = String(value);
  if (s.length <= 4) return '*'.repeat(s.length);
  if (s.length <= 8) return `${s.slice(0, 2)}...${s.slice(-2)}`;
  return `${s.slice(0, 4)}...${s.slice(-4)}`;
}


export interface AccountInput {
  id?: string;
  providerId?: string;
  provider?: string;
  type?: string;
  label?: string;
  secret?: string;
  value?: string;
  apiKey?: string;
  token?: string;
  authKind?: AccountRecord['authKind'];
  authorizedForFallback?: boolean;
  status?: AccountRecord['status'];
  [key: string]: unknown;
}

interface AccountMetadata extends AccountRecord {
  type?: string;
  usageCount?: number;
  lastUsedAt?: string;
}

const ACCOUNTS_TYPE = 'accounts';

function nowIso(now?: () => Date): string {
  return (now ? now() : new Date()).toISOString();
}

function genId(): string {
  try { return crypto.randomUUID(); } catch { return `acct_${Date.now()}_${Math.random().toString(36).slice(2)}`; }
}

function parseJson<T>(raw: string | undefined): T | undefined {
  if (!raw) return undefined;
  try { return JSON.parse(raw) as T; } catch { return undefined; }
}

function normalizeAccountInput(input: any): { providerId: string; type: string; secret: string; meta: Partial<AccountMetadata> } {
  const providerId = String(input?.providerId ?? input?.provider ?? input?.provider_id ?? '').trim();
  if (!providerId) throw new Error('providerId is required');
  const type = String(input?.type ?? input?.kind ?? input?.authKind ?? 'api-key').trim();
  const secret = String(input?.secret ?? input?.value ?? input?.apiKey ?? input?.token ?? input?.key ?? '').trim();
  const meta: Partial<AccountMetadata> = {
    id: input?.id ?? input?.accountId ?? input?.account,
    label: input?.label ?? input?.name,
    authKind: input?.authKind ?? input?.auth_kind ?? (type === 'oauth' ? 'oauth' : type === 'local' ? 'local' : 'api-key'),
    authorizedForFallback: input?.authorizedForFallback ?? false,
    status: input?.status ?? 'ok',
  };
  return { providerId, type, secret, meta };
}

export class AccountManager {
  private storage: SecretStorageLike;
  private readonly nowFn: () => Date;
  private cache: Map<string, AccountMetadata[]> = new Map();
  private cursor: Map<string, number> = new Map();
  private usage: Map<string, number> = new Map();

  constructor(storageOrOpts?: any, maybeOpts?: { storage?: any; now?: () => Date }) {
    let storage: any;
    let opts: { storage?: any; now?: () => Date } = {};
    if (storageOrOpts && (typeof storageOrOpts.get === 'function' || typeof storageOrOpts.store === 'function')) {
      storage = storageOrOpts;
      opts = maybeOpts ?? {};
    } else if (storageOrOpts && typeof storageOrOpts === 'object') {
      opts = storageOrOpts;
      storage = opts.storage;
    } else {
      storage = storageOrOpts;
    }
    this.storage = storage ? adaptSecretStorage(storage) : new InMemorySecretStorage();
    this.nowFn = opts.now ?? (() => new Date());
  }

  private async readIndex(providerId: string): Promise<AccountMetadata[]> {
    const key = storageKey(providerId, ACCOUNTS_TYPE);
    const raw = await this.storage.get(key);
    const parsed = parseJson<AccountMetadata[]>(raw);
    return Array.isArray(parsed) ? parsed : [];
  }

  private async writeIndex(providerId: string, accounts: AccountMetadata[]): Promise<void> {
    const key = storageKey(providerId, ACCOUNTS_TYPE);
    await this.storage.set(key, JSON.stringify(accounts));
  }

  async addAccount(input: any): Promise<AccountRecord> {
    const { providerId, type, secret, meta } = normalizeAccountInput(input);
    const id = String(meta.id ?? genId());
    const secretRef = storageKey(providerId, type, id);
    if (secret) {
      await this.storage.set(secretRef, secret);
    }
    const account: AccountMetadata = {
      id,
      label: meta.label ?? `${providerId} account`,
      provider: providerId,
      secretRef,
      authKind: (meta.authKind as any) ?? 'api-key',
      addedAt: nowIso(this.nowFn),
      authorizedForFallback: meta.authorizedForFallback ?? false,
      status: (meta.status as any) ?? 'ok',
      type,
      usageCount: 0,
    };
    const existing = await this.readIndex(providerId);
    const next = existing.filter((a) => a.id !== id).concat(account);
    await this.writeIndex(providerId, next);
    this.cache.set(providerId, next);
    return account as AccountRecord;
  }

  selectAccount(strategyOrAccounts: any, maybeStrategy?: any, maybeAccounts?: any): AccountRecord | undefined {
    let accounts: AccountMetadata[] | undefined;
    let strategy: SelectionStrategy = 'manual';

    if (Array.isArray(strategyOrAccounts)) {
      accounts = strategyOrAccounts as AccountMetadata[];
      strategy = (maybeStrategy ?? 'manual') as SelectionStrategy;
    } else if (typeof strategyOrAccounts === 'string') {
      strategy = strategyOrAccounts as SelectionStrategy;
      if (Array.isArray(maybeStrategy)) accounts = maybeStrategy as AccountMetadata[];
      else if (Array.isArray(maybeAccounts)) accounts = maybeAccounts as AccountMetadata[];
    } else if (strategyOrAccounts && typeof strategyOrAccounts === 'object' && !Array.isArray(strategyOrAccounts)) {
      if (Array.isArray(strategyOrAccounts.accounts)) accounts = strategyOrAccounts.accounts;
      if (typeof strategyOrAccounts.strategy === 'string') strategy = strategyOrAccounts.strategy;
      if (Array.isArray(maybeStrategy)) accounts = maybeStrategy;
      if (typeof maybeStrategy === 'string') strategy = maybeStrategy as SelectionStrategy;
    }

    if (!accounts) {
      const first = this.cache.values().next().value;
      accounts = first ?? [];
    }

    const eligible = (accounts ?? []).filter(Boolean);
    if (eligible.length === 0) return undefined;

    if (strategy === 'manual') {
      const preferred = (typeof maybeAccounts === 'object' && !Array.isArray(maybeAccounts)) ? maybeAccounts?.preferredId : undefined;
      if (preferred) {
        const p = eligible.find((a) => a.id === preferred);
        if (p) return p as AccountRecord;
      }
      return eligible[0] as AccountRecord;
    }

    if (strategy === 'round-robin') {
      const pid = eligible[0]?.provider ?? 'default';
      const idx = this.cursor.get(pid) ?? 0;
      const chosen = eligible[idx % eligible.length];
      this.cursor.set(pid, (idx + 1) % eligible.length);
      const id = chosen.id;
      this.usage.set(id, (this.usage.get(id) ?? 0) + 1);
      return chosen as AccountRecord;
    }

    if (strategy === 'least-used') {
      let best = eligible[0];
      for (const a of eligible) {
        const ua = this.usage.get(a.id) ?? a.usageCount ?? 0;
        const ub = this.usage.get(best.id) ?? best.usageCount ?? 0;
        if (ua < ub) best = a;
        else if (ua === ub && (a.lastUsedAt ?? '') < (best.lastUsedAt ?? '')) best = a;
      }
      const id = best.id;
      this.usage.set(id, (this.usage.get(id) ?? 0) + 1);
      (best as any).lastUsedAt = nowIso(this.nowFn);
      (best as any).usageCount = this.usage.get(id);
      return best as AccountRecord;
    }

    return eligible[0] as AccountRecord;
  }

  async selectAccountAsync(strategyOrAccounts: any, maybeStrategy?: any, maybeAccounts?: any): Promise<AccountRecord | undefined> {
    let accounts = Array.isArray(strategyOrAccounts) ? strategyOrAccounts
      : Array.isArray(maybeStrategy) ? maybeStrategy
      : Array.isArray(maybeAccounts) ? maybeAccounts
      : undefined;

    if (typeof strategyOrAccounts === 'string' && typeof maybeStrategy === 'string' && !accounts) {
      const loaded = await this.listAccounts(maybeStrategy);
      return this.selectAccount(loaded, strategyOrAccounts as SelectionStrategy);
    }
    return this.selectAccount(strategyOrAccounts, maybeStrategy, maybeAccounts);
  }
  async removeAccount(idOrAccount: any, providerId?: string): Promise<boolean> {
    let accountId: string;
    let prov: string | undefined = providerId;
    if (idOrAccount && typeof idOrAccount === 'object') {
      accountId = String(idOrAccount.id ?? idOrAccount.accountId ?? idOrAccount.account);
      prov = prov ?? String(idOrAccount.providerId ?? idOrAccount.provider ?? '');
    } else {
      accountId = String(idOrAccount);
    }
    if (!prov) {
      if (typeof (this.storage as any).keys === 'function') {
        for (const k of (this.storage as any).keys()) {
          if (k.endsWith(`.${ACCOUNTS_TYPE}`)) {
            const p = k.split('.')[2];
            const list = await this.readIndex(p);
            if (list.some((a) => a.id === accountId)) { prov = p; break; }
          }
        }
      }
    }
    if (!prov) return false;
    const existing = await this.readIndex(prov);
    const target = existing.find((a) => a.id === accountId);
    if (!target) return false;
    await this.storage.delete(target.secretRef);
    const next = existing.filter((a) => a.id !== accountId);
    await this.writeIndex(prov, next);
    this.cache.set(prov, next);
    return true;
  }

  async listAccounts(providerId?: string): Promise<AccountRecord[]> {
    if (providerId) {
      const list = await this.readIndex(providerId);
      this.cache.set(providerId, list);
      return list as AccountRecord[];
    }
    const out: AccountMetadata[] = [];
    if (typeof (this.storage as any).keys === 'function') {
      for (const k of (this.storage as any).keys()) {
        if (k.endsWith(`.${ACCOUNTS_TYPE}`)) {
          const p = k.split('.')[2];
          out.push(...(await this.readIndex(p)));
        }
      }
    } else if (this.cache.size) {
      for (const v of this.cache.values()) out.push(...v);
    }
    return out as AccountRecord[];
  }

  private normalizeStatusReason(reason?: any): { status: AccountRecord['status']; cooldownUntil?: string } {
    const r = String((reason && (reason.reason ?? reason)) ?? '').toLowerCase();
    if (r.includes('auth') || r.includes('unauthor') || r.includes('forbidden') || r.includes('401') || r.includes('403')) {
      return { status: 'auth_expired' };
    }
    if (r.includes('cool') || r.includes('rate') || r.includes('429')) {
      const ms = (typeof reason === 'object' && reason?.cooldownMs) ? Number(reason.cooldownMs) : 5 * 60 * 1000;
      return { status: 'cooling_down', cooldownUntil: new Date(this.nowFn().getTime() + ms).toISOString() };
    }
    if (r.includes('quota') || r.includes('exhaust')) {
      return { status: 'quota_exhausted' };
    }
    const ms = (typeof reason === 'object' && reason?.cooldownMs) ? Number(reason.cooldownMs) : 0;
    if (ms > 0) return { status: 'cooling_down', cooldownUntil: new Date(this.nowFn().getTime() + ms).toISOString() };
    return { status: 'quota_exhausted' };
  }

  async markExhausted(accountOrId: any, providerId?: string, reason?: any): Promise<AccountRecord | undefined> {
    const { id, prov } = this.resolveAccountRef(accountOrId, providerId);
    if (!prov || !id) return undefined;
    const opts = (typeof reason === 'object' && reason !== null && !Array.isArray(reason)) ? reason : { reason };
    const { status, cooldownUntil } = this.normalizeStatusReason(opts.reason ?? reason);
    const existing = await this.readIndex(prov);
    const idx = existing.findIndex((a) => a.id === id);
    if (idx === -1) return undefined;
    const updated: AccountMetadata = { ...existing[idx], status, cooldownUntil } as AccountMetadata;
    existing[idx] = updated;
    await this.writeIndex(prov, existing);
    this.cache.set(prov, existing);
    return updated as AccountRecord;
  }

  async markAccountExhausted(accountOrId: any, providerId?: string, reason?: any): Promise<AccountRecord | undefined> {
    return this.markExhausted(accountOrId, providerId, reason);
  }
  async markFailed(accountOrId: any, providerId?: string, error?: any): Promise<AccountRecord | undefined> {
    const msg = error instanceof Error ? error.message : String(error ?? '');
    const statusHint = (error && (error.status || error.code)) ? `${error.status ?? ''} ${error.code ?? ''}` : msg;
    return this.markExhausted(accountOrId, providerId, statusHint || 'quota');
  }

  async markCoolingDown(accountOrId: any, providerId?: string, cooldownMs?: number): Promise<AccountRecord | undefined> {
    return this.markExhausted(accountOrId, providerId, { reason: 'rate', cooldownMs: cooldownMs ?? 5 * 60 * 1000 });
  }

  private resolveAccountRef(accountOrId: any, providerId?: string): { id: string; prov: string | undefined } {
    let id: string;
    let prov: string | undefined = providerId;
    if (accountOrId && typeof accountOrId === 'object') {
      id = String(accountOrId.id ?? accountOrId.accountId ?? accountOrId.account ?? '');
      prov = prov ?? String(accountOrId.providerId ?? accountOrId.provider ?? '');
    } else {
      id = String(accountOrId);
    }
    if (!prov && typeof (this.storage as any).keys === 'function') {
      for (const k of (this.storage as any).keys()) {
        if (k.endsWith(`.${ACCOUNTS_TYPE}`)) {
          const p = k.split('.')[2];
          const list = this.cache.get(p) ?? [];
          if (list.some((a) => a.id === id)) { prov = p; break; }
        }
      }
    }
    if (!prov && this.cache.size) {
      for (const [p, list] of this.cache.entries()) {
        if (list.some((a) => a.id === id)) { prov = p; break; }
      }
    }
    return { id, prov };
  }

  isActiveAccount(account: any, now: Date = this.nowFn()): boolean {
    if (!account) return false;
    const status = account.status;
    if (status === 'revoked' || status === 'quota_exhausted') return false;
    if (status === 'cooling_down') {
      if (!account.cooldownUntil) return false;
      return new Date(account.cooldownUntil).getTime() <= now.getTime();
    }
    return true;
  }

  getActiveAccounts(accountsOrProviderId: any): AccountRecord[] {
    let accounts: any[] = [];
    if (Array.isArray(accountsOrProviderId)) accounts = accountsOrProviderId;
    else if (typeof accountsOrProviderId === 'string') accounts = this.cache.get(accountsOrProviderId) ?? [];
    const now = this.nowFn();
    return accounts.filter((a) => this.isActiveAccount(a, now)) as AccountRecord[];
  }

  pickNextActive(accountsOrProviderId: any, strategy?: any, exclude?: any): AccountRecord | undefined {
    let accounts: any[] = [];
    let strat: SelectionStrategy = 'manual';
    let excl: any = exclude;
    if (Array.isArray(accountsOrProviderId)) {
      accounts = accountsOrProviderId;
      if (typeof strategy === 'string' && ['manual','round-robin','least-used'].includes(strategy)) strat = strategy as SelectionStrategy;
    } else if (typeof accountsOrProviderId === 'string') {
      accounts = this.cache.get(accountsOrProviderId) ?? [];
      if (typeof strategy === 'string' && ['manual','round-robin','least-used'].includes(strategy)) strat = strategy as SelectionStrategy;
    } else if (accountsOrProviderId && typeof accountsOrProviderId === 'object') {
      if (Array.isArray(accountsOrProviderId.accounts)) accounts = accountsOrProviderId.accounts;
      if (typeof accountsOrProviderId.strategy === 'string') strat = accountsOrProviderId.strategy as SelectionStrategy;
      if (accountsOrProviderId.exclude) excl = accountsOrProviderId.exclude;
      if (typeof strategy === 'string') strat = strategy as SelectionStrategy;
    }
    const excludeIds = new Set<string>();
    const exArr = Array.isArray(excl) ? excl : (excl ? [excl] : []);
    for (const e of exArr) {
      if (typeof e === 'string') excludeIds.add(e);
      else if (e && typeof e === 'object') {
        const id = e.id ?? e.accountId ?? e.account;
        if (id) excludeIds.add(String(id));
      }
    }
    const active = accounts.filter((a) => a && this.isActiveAccount(a) && !excludeIds.has(String(a.id)));
    if (active.length === 0) return undefined;
    return this.selectAccount(active, strat) as AccountRecord;
  }

  async pickNextActiveAsync(accountsOrProviderId: any, strategy?: any, exclude?: any): Promise<AccountRecord | undefined> {
    if (typeof accountsOrProviderId === 'string') {
      const loaded = await this.listAccounts(accountsOrProviderId);
      return this.pickNextActive(loaded, strategy, exclude);
    }
    return this.pickNextActive(accountsOrProviderId, strategy, exclude);
  }

  async runWithAutoSwitch<T>(providerId: string, fn: (account: AccountRecord) => Promise<T>, options?: any): Promise<T> {
    const strategy = (options && options.strategy) || 'manual';
    const tried = new Set<string>();
    let lastErr: any;
    while (true) {
      const accounts = await this.listAccounts(providerId);
      const candidates = accounts.filter((a) => !tried.has(a.id));
      const next = this.pickNextActive(candidates, strategy);
      if (!next) {
        if (lastErr) throw lastErr;
        throw new Error('no active account available');
      }
      tried.add(next.id);
      try {
        return await fn(next as AccountRecord);
      } catch (e: any) {
        lastErr = e;
        const statusHint = e && (e.status || e.code) ? `${e.status ?? ''} ${e.code ?? ''}` : (e instanceof Error ? e.message : String(e));
        const isExhaustion = /429|rate|quota|exhaust|401|403|auth|unauthor|forbidden/i.test(String(statusHint));
        if (!isExhaustion) throw e;
        await this.markExhausted(next.id, providerId, statusHint);
        if (options && typeof options.onSwitch === 'function') {
          try { options.onSwitch(next, e); } catch { /* ignore */ }
        }
        if (options && typeof options.checkpoint === 'function') {
          try { await options.checkpoint(next, e); } catch { /* ignore */ }
        }
      }
    }
  }

  async resetAccount(accountOrId: any, providerId?: string): Promise<AccountRecord | undefined> {
    const res = await this.markExhausted(accountOrId, providerId, 'ok');
    if (res) (res as any).status = 'ok';
    return res;
  }

  async getSecret(accountOrKey: any): Promise<string | undefined> {
    if (typeof accountOrKey === 'string') {
      return this.storage.get(accountOrKey);
    }
    const ref = accountOrKey?.secretRef ?? accountOrKey?.secret_ref ?? accountOrKey?.key;
    if (typeof ref === 'string' && ref) return this.storage.get(ref);
    if (accountOrKey?.providerId || accountOrKey?.provider) {
      const pid = accountOrKey.providerId ?? accountOrKey.provider;
      const type = accountOrKey.type ?? 'api-key';
      const id = accountOrKey.id ?? accountOrKey.accountId;
      const key = id ? storageKey(pid, type, id) : storageKey(pid, type);
      return this.storage.get(key);
    }
    return undefined;
  }
}


const defaultManager = new AccountManager(new InMemorySecretStorage());

function findStorage(args: any[]): any {
  for (const a of args) {
    if (a && (typeof a.get === 'function' || typeof a.store === 'function') && typeof a.delete === 'function') return a;
    if (a && typeof a === 'object' && (a.storage?.get || a.storage?.store)) return a.storage;
  }
  return undefined;
}

function findObject(args: any[]): any {
  for (const a of args) {
    if (a && typeof a === 'object' && !Array.isArray(a) && !(typeof a.get === 'function' || typeof a.store === 'function')) return a;
  }
  return undefined;
}

function findArray(args: any[]): any[] | undefined {
  return args.find((a) => Array.isArray(a));
}

export async function addAccount(...args: any[]): Promise<AccountRecord> {
  const storage = findStorage(args);
  const mgr = storage ? new AccountManager(storage) : defaultManager;
  const strs = args.filter((a) => typeof a === 'string');
  const obj = findObject(args);
  let input: any = obj;
  if (!input && strs.length >= 1) {
    input = { providerId: strs[0], type: strs[1], secret: strs[2] };
    if (strs.length >= 4) input.label = strs[3];
  }
  if (storage && obj && obj.storage === storage) delete obj.storage;
  return mgr.addAccount(input ?? {});
}

export async function removeAccount(...args: any[]): Promise<boolean> {
  const storage = findStorage(args);
  const mgr = storage ? new AccountManager(storage) : defaultManager;
  const obj = findObject(args);
  const strs = args.filter((a) => typeof a === 'string');
  const target = obj ?? strs[0];
  const providerId = strs.length > 1 ? strs[1] : (obj?.providerId ?? obj?.provider);
  return mgr.removeAccount(target, providerId);
}

export async function listAccounts(...args: any[]): Promise<AccountRecord[]> {
  const storage = findStorage(args);
  const mgr = storage ? new AccountManager(storage) : defaultManager;
  const strs = args.filter((a) => typeof a === 'string');
  const providerId = strs[0];
  return mgr.listAccounts(providerId);
}

export function selectAccount(...args: any[]): AccountRecord | undefined {
  const arr = findArray(args);
  const strs = args.filter((a) => typeof a === 'string');
  if (arr) {
    const strat = strs[0] && ['manual','round-robin','least-used'].includes(strs[0]) ? strs[0] : (strs[1] ?? 'manual');
    return defaultManager.selectAccount(arr, strat as SelectionStrategy);
  }
  if (strs.length === 1 && ['manual','round-robin','least-used'].includes(strs[0])) {
    return defaultManager.selectAccount(strs[0] as SelectionStrategy);
  }
  if (strs.length >= 2 && ['manual','round-robin','least-used'].includes(strs[0])) {
    const cached = defaultManager['cache'].get(strs[1]);
    if (cached) return defaultManager.selectAccount(cached, strs[0] as SelectionStrategy);
    return undefined;
  }
  return defaultManager.selectAccount('manual');
}

export async function selectAccountAsync(...args: any[]): Promise<AccountRecord | undefined> {
  const storage = findStorage(args);
  const mgr = storage ? new AccountManager(storage) : defaultManager;
  const arr = findArray(args);
  const strs = args.filter((a) => typeof a === 'string');
  if (arr) {
    const strategy = (strs[0] && ['manual','round-robin','least-used'].includes(strs[0])) ? strs[0] : (strs[1] ?? 'manual');
    return mgr.selectAccount(arr, strategy as SelectionStrategy);
  }
  if (strs.length >= 2 && ['manual','round-robin','least-used'].includes(strs[0])) {
    const accounts = await mgr.listAccounts(strs[1]);
    return mgr.selectAccount(accounts, strs[0] as SelectionStrategy);
  }
  if (strs.length === 1 && ['manual','round-robin','least-used'].includes(strs[0])) {
    const accounts = await mgr.listAccounts();
    return mgr.selectAccount(accounts, strs[0] as SelectionStrategy);
  }
  return undefined;
}

export async function getSecret(...args: any[]): Promise<string | undefined> {
  const storage = findStorage(args);
  const mgr = storage ? new AccountManager(storage) : defaultManager;
  const objOrKey = args.find((a) => a !== storage && (typeof a === 'string' || (a && typeof a === 'object')));
  return mgr.getSecret(objOrKey);
}

export async function markExhausted(...args: any[]): Promise<AccountRecord | undefined> {
  const storage = findStorage(args);
  const mgr = storage ? new AccountManager(storage) : defaultManager;
  const obj = findObject(args);
  const strs = args.filter((a) => typeof a === 'string');
  const accountOrId = obj ?? strs[0];
  const providerId = strs.length > 1 ? strs[1] : obj?.providerId;
  const reason = strs.length > 2 ? strs[2] : (obj?.reason ?? obj?.error ?? obj?.status);
  return mgr.markExhausted(accountOrId, providerId, reason);
}
export const markAccountExhausted = markExhausted;
export async function markFailed(...args: any[]): Promise<AccountRecord | undefined> {
  const storage = findStorage(args);
  const mgr = storage ? new AccountManager(storage) : defaultManager;
  const obj = findObject(args);
  const strs = args.filter((a) => typeof a === 'string');
  const accountOrId = obj ?? strs[0];
  const providerId = strs.length > 1 ? strs[1] : obj?.providerId;
  const error = strs.length > 2 ? strs[2] : (obj?.error ?? obj?.reason);
  return mgr.markFailed(accountOrId, providerId, error);
}
export function pickNextActive(...args: any[]): AccountRecord | undefined {
  const arr = findArray(args);
  const strs = args.filter((a) => typeof a === 'string');
  if (arr) {
    const mgr = defaultManager;
    const strategy = strs[0] && ['manual','round-robin','least-used'].includes(strs[0]) ? strs[0] : (strs[1] ?? 'manual');
    const exclude = findObject(args)?.exclude;
    return mgr.pickNextActive(arr, strategy, exclude);
  }
  // providerId string path -> use cache (sync)
  if (strs.length >= 1 && !['manual','round-robin','least-used'].includes(strs[0])) {
    const providerId = strs[0];
    const strategy = strs[1] && ['manual','round-robin','least-used'].includes(strs[1]) ? strs[1] : 'manual';
    return defaultManager.pickNextActive(providerId, strategy);
  }
  if (strs.length >= 1 && ['manual','round-robin','least-used'].includes(strs[0])) {
    return defaultManager.pickNextActive(strs[0] as SelectionStrategy);
  }
  return defaultManager.pickNextActive('manual');
}
export async function pickNextActiveAsync(...args: any[]): Promise<AccountRecord | undefined> {
  const storage = findStorage(args);
  const mgr = storage ? new AccountManager(storage) : defaultManager;
  const arr = findArray(args);
  const strs = args.filter((a) => typeof a === 'string');
  if (arr) {
    const strategy = strs[0] && ['manual','round-robin','least-used'].includes(strs[0]) ? strs[0] : (strs[1] ?? 'manual');
    return mgr.pickNextActive(arr, strategy);
  }
  if (strs.length >= 2 && ['manual','round-robin','least-used'].includes(strs[1])) {
    return mgr.pickNextActiveAsync(strs[0], strs[1]);
  }
  if (strs.length === 1 && !['manual','round-robin','least-used'].includes(strs[0])) {
    return mgr.pickNextActiveAsync(strs[0]);
  }
  if (strs.length === 1 && ['manual','round-robin','least-used'].includes(strs[0])) {
    const accounts = await mgr.listAccounts();
    return mgr.pickNextActive(accounts, strs[0] as SelectionStrategy);
  }
  return undefined;
}
export function getActiveAccounts(...args: any[]): AccountRecord[] {
  const storage = findStorage(args);
  const mgr = storage ? new AccountManager(storage) : defaultManager;
  const arr = findArray(args);
  const strs = args.filter((a) => typeof a === 'string');
  if (arr) return mgr.getActiveAccounts(arr);
  if (strs[0]) return mgr.getActiveAccounts(strs[0]);
  return [];
}
export function isActiveAccount(...args: any[]): boolean {
  const mgr = defaultManager;
  const obj = findObject(args) ?? args.find((a) => a && typeof a === 'object' && !Array.isArray(a));
  return mgr.isActiveAccount(obj);
}

export async function markCoolingDown(...args: any[]): Promise<AccountRecord | undefined> {
  const storage = findStorage(args);
  const mgr = storage ? new AccountManager(storage) : defaultManager;
  const obj = findObject(args);
  const strs = args.filter((a) => typeof a === 'string');
  const accountOrId = obj ?? strs[0];
  const providerId = strs.length > 1 ? strs[1] : obj?.providerId;
  const cooldownMs = typeof obj?.cooldownMs === 'number' ? obj.cooldownMs : (strs.length > 2 ? Number(strs[2]) : undefined);
  return mgr.markCoolingDown(accountOrId, providerId, cooldownMs);
}

export default {
  InMemorySecretStorage,
  AccountManager,
  storageKey,
  maskKey,
  addAccount,
  removeAccount,
  listAccounts,
  selectAccount,
  selectAccountAsync,
  getSecret,
  markExhausted,
  markAccountExhausted,
  markFailed,
  markCoolingDown,
  pickNextActive,
  pickNextActiveAsync,
  getActiveAccounts,
  isActiveAccount,
};




