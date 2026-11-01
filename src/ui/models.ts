// src/ui/models.ts
// View-model + actions for the "Models & Accounts" panel.
// Pure-ish: vscode-free except via injected ports.

import { AccountRecord, RouteDecision } from '../routing/types';
import { Router } from '../routing/router';
import { PermissionEngine } from '../security/permissionEngine';

export interface SecretPort {
  get(name: string): Promise<string | undefined>;
  set(name: string, value: string): Promise<void>;
  delete(name: string): Promise<void>;
}

export interface ProviderTestResult { ok: boolean; message: string; checkedAt: string; }

export interface ModelsAccountsDeps {
  secrets: SecretPort;
  audit: { record(e: { ts: string; command: string; phase: string; payload?: unknown; result?: unknown; error?: string }): Promise<void> };
  router: Router;
  permissionEngine: PermissionEngine;
  testProvider: (account: AccountRecord) => Promise<ProviderTestResult>;
  loadAccounts?: () => Promise<AccountRecord[]> | AccountRecord[];
  now?: () => Date;
}

export interface ModelsAccountsState {
  status: 'loading' | 'empty' | 'error' | 'ready';
  accounts: AccountRecord[];
  error?: string;
  updatedAt: string;
}

export class ModelsAccountsPanel {
  private state: ModelsAccountsState;
  private readonly deps: ModelsAccountsDeps;
  private readonly now: () => Date;

  constructor(deps: ModelsAccountsDeps, initial: AccountRecord[] = []) {
    this.deps = deps;
    this.now = deps.now ?? (() => new Date());
    this.state = {
      status: initial.length ? 'ready' : 'empty',
      accounts: initial,
      updatedAt: this.now().toISOString(),
    };
  }

  getState(): ModelsAccountsState { return { ...this.state, accounts: [...this.state.accounts] }; }

  async refreshModels(): Promise<ModelsAccountsState> {
    this.state = { ...this.state, status: 'loading', updatedAt: this.now().toISOString() };
    try {
      // Re-read accounts from the source of truth (provider/account store) when a loader is available.
      let accounts: AccountRecord[];
      if (typeof this.deps.loadAccounts === 'function') {
        accounts = await this.deps.loadAccounts();
      } else {
        accounts = [...this.state.accounts];
      }
      this.state = {
        status: accounts.length ? 'ready' : 'empty',
        accounts,
        updatedAt: this.now().toISOString(),
      };
      await this.deps.audit.record({ ts: this.now().toISOString(), command: 'refreshModels', phase: 'success', result: { count: accounts.length } });
    } catch (e) {
      this.state = { ...this.state, status: 'error', error: (e as Error)?.message ?? String(e), updatedAt: this.now().toISOString() };
      await this.deps.audit.record({ ts: this.now().toISOString(), command: 'refreshModels', phase: 'error', error: (e as Error)?.message ?? String(e) });
    }
    return this.getState();
  }

  async testProvider(accountId: string): Promise<ProviderTestResult> {
    const account = this.state.accounts.find((a) => a.id === accountId);
    if (!account) throw new Error(`unknown account: ${accountId}`);
    const res = await this.deps.testProvider(account);
    // update status based on result
    account.status = res.ok ? 'ok' : 'auth_expired';
    this.state = { ...this.state, accounts: [...this.state.accounts], updatedAt: this.now().toISOString() };
    await this.deps.audit.record({ ts: this.now().toISOString(), command: 'testProvider', phase: res.ok ? 'success' : 'error', payload: { accountId }, result: res });
    return res;
  }

  async replaceKey(accountId: string, newValue: string): Promise<void> {
    const account = this.state.accounts.find((a) => a.id === accountId);
    if (!account) throw new Error(`unknown account: ${accountId}`);
    await this.deps.secrets.set(account.secretRef, newValue);
    account.status = 'ok';
    this.state = { ...this.state, accounts: [...this.state.accounts], updatedAt: this.now().toISOString() };
    await this.deps.audit.record({ ts: this.now().toISOString(), command: 'replaceKey', phase: 'success', payload: { accountId } });
  }

  async removeKey(accountId: string): Promise<void> {
    const account = this.state.accounts.find((a) => a.id === accountId);
    if (!account) throw new Error(`unknown account: ${accountId}`);
    await this.deps.secrets.delete(account.secretRef);
    this.state.accounts = this.state.accounts.filter((a) => a.id !== accountId);
    this.state = {
      status: this.state.accounts.length ? 'ready' : 'empty',
      accounts: [...this.state.accounts],
      updatedAt: this.now().toISOString(),
    };
    await this.deps.audit.record({ ts: this.now().toISOString(), command: 'removeKey', phase: 'success', payload: { accountId } });
  }

  async toggleFallback(accountId: string, allowed: boolean, explanationAcknowledged: boolean): Promise<void> {
    const account = this.state.accounts.find((a) => a.id === accountId);
    if (!account) throw new Error(`unknown account: ${accountId}`);
    if (allowed && !explanationAcknowledged) {
      throw new Error('fallback explanation must be acknowledged');
    }
    // never bypasses limits: only toggles authorization flag, does not change cooldown/quota
    account.authorizedForFallback = allowed;
    this.state = { ...this.state, accounts: [...this.state.accounts], updatedAt: this.now().toISOString() };
    await this.deps.audit.record({ ts: this.now().toISOString(), command: 'toggleFallback', phase: 'success', payload: { accountId, allowed } });
  }

  decideRoute(req: Parameters<Router['decide']>[0]): RouteDecision {
    this.deps.router.setAccounts(this.state.accounts);
    return this.deps.router.decide(req);
  }

  renderLimits(account: AccountRecord): string {
    const l = account.lastKnownLimits;
    if (!l) return 'not reported by provider';
    return `${l.note} (source: ${l.source}, at: ${l.at})`;
  }

  fallbackExplanation(): string {
    return 'Fallback may switch to another authorized account on failure. It never bypasses provider rate limits or quotas.';
  }
}
