// src/ui/models-accounts.ts
// Pure HTML renderer for the "Models & Accounts" panel (U13).

import { maskKey } from '../providers/accounts';

export interface ModelsAccountRow {
  id?: string;
  label?: string;
  name?: string;
  provider?: string;
  providerId?: string;
  secretRef?: string;
  authKind?: string;
  status?: string;
  health?: string;
  authorizedForFallback?: boolean;
  cooldownUntil?: string;
  usageCount?: number;
  usage?: number | string;
  requests?: number;
  totalRequests?: number;
  count?: number;
  lastUsedAt?: string;
  lastUsed?: string;
  key?: string;
  apiKey?: string;
  token?: string;
  secret?: string;
  value?: string;
  [key: string]: unknown;
}

export interface RenderModelsAccountsArgs {
  accounts?: ModelsAccountRow[] | null;
  models?: ModelsAccountRow[] | null;
  items?: ModelsAccountRow[] | null;
  list?: ModelsAccountRow[] | null;
  rows?: ModelsAccountRow[] | null;
  data?: unknown;
  rotationStrategy?: string;
  strategy?: string;
  rotation?: string;
  selectionStrategy?: string;
  health?: unknown;
  providers?: unknown[] | null;
  keys?: Record<string, string> | null;
  maskedKeys?: Record<string, string> | null;
  refreshAction?: string;
  refreshLabel?: string;
  emptyMessage?: string;
  [key: string]: unknown;
}

const esc = (v: unknown): string =>
  String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function accountId(a: ModelsAccountRow, i: number): string {
  return String(a?.id ?? a?.label ?? a?.name ?? a?.provider ?? `account-${i}`);
}

function accountLabel(a: ModelsAccountRow): string {
  return String(a?.label ?? a?.name ?? a?.id ?? 'Unnamed account');
}

function accountProvider(a: ModelsAccountRow): string {
  return String(a?.provider ?? a?.providerId ?? a?.providerName ?? 'unknown');
}

function usageOf(a: ModelsAccountRow): string {
  const v = a?.usageCount ?? a?.usage ?? a?.requests ?? a?.totalRequests ?? a?.count;
  const last = a?.lastUsedAt ?? a?.lastUsed;
  const parts: string[] = [];
  if (v !== undefined && v !== null && v !== '') parts.push(String(v));
  if (last) parts.push(`last used ${String(last)}`);
  return parts.length ? parts.join(' · ') : 'not reported';
}

function maskedKeyFor(a: ModelsAccountRow, args: RenderModelsAccountsArgs, i: number): string {
  const id = accountId(a, i);
  const direct = a?.key ?? a?.apiKey ?? a?.token ?? a?.secret ?? a?.value;
  let value: string | undefined;
  if (typeof direct === 'string') value = direct;
  const keys = (args as any)?.keys ?? (args as any)?.maskedKeys ?? (args as any)?.secrets;
  if (!value && keys && typeof keys === 'object') {
    const map = keys as Record<string, string>;
    value = map[id] ?? map[a?.secretRef ?? ''] ?? map[a?.id ?? ''];
  }
  if (value) return maskKey(value);
  if (a?.secretRef) return '••••••••';
  return '—';
}

function isHealthLike(v: unknown): v is Record<string, unknown> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  const o = v as Record<string, unknown>;
  return 'status' in o || 'healthy' in o || 'ok' in o || 'health' in o;
}

function healthFor(args: RenderModelsAccountsArgs, id: string, provider: string): Record<string, unknown> | undefined {
  const health = (args as any)?.health;
  const providers = Array.isArray((args as any)?.providers) ? (args as any).providers : [];
  if (health && typeof health === 'object' && !Array.isArray(health)) {
    const map = health as Record<string, any>;
    if (map[id]) return map[id];
    if (map[provider]) return map[provider];
    for (const key of ['providers', 'byProvider', 'byAccount', 'health', 'accounts']) {
      const nested = (map as any)[key];
      if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
        if (nested[id]) return nested[id];
        if (nested[provider]) return nested[provider];
      }
    }
    const lower = id.toLowerCase();
    for (const k of Object.keys(map)) {
      if (k.toLowerCase() === lower) return map[k];
    }
  }
  if (Array.isArray(health)) {
    return health.find((h: any) => h && String(h?.id ?? h?.accountId ?? h?.provider ?? h?.providerId ?? '') === id) as any;
  }
  const p = providers.find((x: any) => x && String(x?.id ?? x?.provider ?? x?.name ?? '') === provider);
  if (p && (p as any).health) return (p as any).health;
  if (p && isHealthLike(p)) return p as any;
  return undefined;
}

function healthStatus(h: unknown, a: ModelsAccountRow): string {
  if (a?.status) return String(a.status);
  if (h && typeof h === 'object') {
    const o = h as Record<string, unknown>;
    if (o.status) return String(o.status);
    if (o.healthy === true || o.ok === true) return 'healthy';
    if (o.healthy === false || o.ok === false) return 'down';
    if (o.health) return String(o.health);
  }
  if (typeof h === 'string') return h;
  return 'unknown';
}

function healthBadgeClass(status: string): string {
  const s = status.toLowerCase();
  if (s === 'ok' || s === 'healthy' || s === 'ready') return 'vc-health-ok';
  if (s === 'degraded' || s === 'cooling_down' || s === 'cooling') return 'vc-health-degraded';
  if (s === 'down' || s === 'unhealthy' || s === 'error' || s === 'auth_expired' || s === 'quota_exhausted' || s === 'revoked') return 'vc-health-down';
  return 'vc-health-unknown';
}

function accountsOf(args: RenderModelsAccountsArgs): ModelsAccountRow[] {
  const src = (args as any)?.accounts ?? (args as any)?.models ?? (args as any)?.items ?? (args as any)?.list ?? (args as any)?.rows ?? (args as any)?.data;
  if (Array.isArray(src)) return src.filter((x) => x != null) as ModelsAccountRow[];
  if (src && typeof src === 'object' && Array.isArray((src as any).accounts)) return (src as any).accounts;
  if (src && typeof src === 'object' && Array.isArray((src as any).models)) return (src as any).models;
  if (src && typeof src === 'object' && Array.isArray((src as any).items)) return (src as any).items;
  return [];
}

export function renderModelsAccounts(args: RenderModelsAccountsArgs = {}): string {
  const a = (Array.isArray(args) ? { accounts: args } : (args ?? {})) as RenderModelsAccountsArgs;
  const accounts = accountsOf(a);
  const rotationStrategy = String(
    (a as any)?.rotationStrategy ?? (a as any)?.strategy ?? (a as any)?.rotation ?? (a as any)?.selectionStrategy ?? 'manual',
  );
  const refreshAction = String((a as any)?.refreshAction ?? 'vibecode.models.refresh');
  const refreshLabel = String((a as any)?.refreshLabel ?? 'Refresh models');
  const emptyMessage = String((a as any)?.emptyMessage ?? 'No model providers configured. Connect one to start generating.');

  const rows = accounts.map((acc, i) => {
    const id = accountId(acc, i);
    const label = accountLabel(acc);
    const provider = accountProvider(acc);
    const h = healthFor(a, id, provider);
    const status = healthStatus(h, acc);
    const cls = healthBadgeClass(status);
    const usage = usageOf(acc);
    const masked = maskedKeyFor(acc, a, i);
    const fallback = acc?.authorizedForFallback === true ? 'enabled' : 'disabled';
    return [
      `<tr class="vc-models-account-row models-account-row account-row" data-account-id="${esc(id)}" data-provider="${esc(provider)}">`,
      `  <td class="vc-models-account-cell models-account-cell account-label">${esc(label)}</td>`,
      `  <td class="vc-models-account-cell models-account-cell account-provider">${esc(provider)}</td>`,
      `  <td class="vc-models-account-cell models-account-cell account-status"><span class="vc-badge vc-badge-health health-badge provider-health-badge ${cls}" aria-label="Health: ${esc(status)}">${esc(status)}</span></td>`,
      `  <td class="vc-models-account-cell models-account-cell account-rotation rotation-strategy">${esc(rotationStrategy)}</td>`,
      `  <td class="vc-models-account-cell models-account-cell account-usage usage">${esc(usage)}</td>`,
      `  <td class="vc-models-account-cell models-account-cell account-key masked-key">${esc(masked)}</td>`,
      `  <td class="vc-models-account-cell models-account-cell account-fallback">${esc(fallback)}</td>`,
      `</tr>`,
    ].join('\\n');
  }).join('\\n');

  const table = accounts.length === 0
    ? `<div class="vc-empty models-empty vc-card"><p class="vc-empty-msg models-empty-msg">${esc(emptyMessage)}</p><button type="button" class="vc-btn vc-btn-primary" data-action="vibecode.models.connect" aria-label="Connect provider">Connect provider</button></div>`
    : [
        `<div class="vc-rotation-strategy rotation-strategy" aria-label="Rotation strategy">Rotation strategy: <strong>${esc(rotationStrategy)}</strong></div>`,
        `<table class="vc-models-accounts-table models-accounts-table accounts-table" role="table" aria-label="Models and accounts">`,
        `  <thead><tr>`,
        `    <th scope="col">Account</th>`,
        `    <th scope="col">Provider</th>`,
        `    <th scope="col">Health</th>`,
        `    <th scope="col">Rotation</th>`,
        `    <th scope="col">Usage</th>`,
        `    <th scope="col">Key</th>`,
        `    <th scope="col">Fallback</th>`,
        `  </tr></thead>`,
        `  <tbody>${rows}</tbody>`,
        `</table>`,
      ].join('\\n');

  const healthBadges = accounts.length
    ? accounts.map((acc, i) => {
        const id = accountId(acc, i);
        const provider = accountProvider(acc);
        const h = healthFor(a, id, provider);
        const status = healthStatus(h, acc);
        const cls = healthBadgeClass(status);
        return `<span class="vc-badge vc-badge-health health-badge provider-health-badge ${cls}" data-provider="${esc(provider)}" aria-label="Provider health: ${esc(status)}">${esc(provider)}: ${esc(status)}</span>`;
      }).join(' ')
    : '';

  return [
    `<section class="vc-models-accounts models-accounts" aria-label="Models and accounts panel">`,
    `  <header class="vc-models-accounts__header models-header"><h2>Models &amp; Accounts</h2></header>`,
    `  <div class="vc-models-accounts__toolbar models-toolbar">`,
    `    <button type="button" class="vc-btn vc-refresh-models refresh-models refresh-button" data-action="${esc(refreshAction)}" aria-label="${esc(refreshLabel)}">${esc(refreshLabel)}</button>`,
    `  </div>`,
    `  <div class="vc-provider-health-badges provider-health-badges health-badges" aria-label="Provider health badges">${healthBadges}</div>`,
    `  <div class="vc-models-accounts__body models-body">${table}</div>`,
    `</section>`,
  ].join('\\n');
}

export default renderModelsAccounts;

