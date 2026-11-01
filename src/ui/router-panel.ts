// src/ui/router-panel.ts
// Pure HTML renderer for the "Router / Providers" panel.

export interface RouterPanelProvider {
  id?: string;
  name?: string;
  label?: string;
  baseUrl?: string;
  pricing?: string;
  cost?: number;
  latencyMs?: number;
  [key: string]: unknown;
}

export interface RouterPanelHealth {
  status?: string;
  healthy?: boolean;
  ok?: boolean;
  latencyMs?: number;
  durationMs?: number;
  avgLatencyMs?: number;
  cost?: number;
  totalCost?: number;
  avgCost?: number;
  message?: string;
  [key: string]: unknown;
}

export interface RenderRouterPanelArgs {
  providers?: RouterPanelProvider[] | null;
  activeId?: string | null;
  health?: RouterPanelHealth | Record<string, RouterPanelHealth> | RouterPanelHealth[] | null;
  fallbackChain?: string[] | null;
}

const esc = (v: unknown): string =>
  String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function providerId(p: RouterPanelProvider, i: number): string {
  return String(p?.id ?? p?.name ?? p?.label ?? `provider-${i}`);
}

function providerName(p: RouterPanelProvider): string {
  return String(p?.name ?? p?.label ?? p?.id ?? 'Unknown provider');
}

function isHealthLike(v: unknown): v is RouterPanelHealth {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  const o = v as Record<string, unknown>;
  return (
    'status' in o || 'healthy' in o || 'ok' in o ||
    'latencyMs' in o || 'durationMs' in o || 'avgLatencyMs' in o ||
    'cost' in o || 'totalCost' in o || 'avgCost' in o
  );
}

function healthFor(health: RenderRouterPanelArgs['health'], id: string, activeId?: string | null): RouterPanelHealth | undefined {
  if (!health) return undefined;
  if (Array.isArray(health)) {
    return health.find((h) => h && String((h as any).provider ?? (h as any).providerId ?? (h as any).id ?? '') === id) as RouterPanelHealth | undefined;
  }
  if (isHealthLike(health)) {
    if (activeId && id === activeId) return health as RouterPanelHealth;
    if (!activeId) return health as RouterPanelHealth;
    return undefined;
  }
  if (typeof health === 'object') {
    const map = health as Record<string, RouterPanelHealth>;
    if (map[id]) return map[id];
    for (const key of ['providers', 'byProvider', 'health']) {
      const nested = (map as any)[key];
      if (nested && typeof nested === 'object' && !Array.isArray(nested) && nested[id]) return nested[id];
    }
    const lower = id.toLowerCase();
    for (const k of Object.keys(map)) {
      if (k.toLowerCase() === lower) return map[k];
    }
  }
  return undefined;
}

function healthStatus(h?: RouterPanelHealth): string {
  if (!h) return 'unknown';
  if (h.status) return String(h.status);
  if (h.healthy === true || h.ok === true) return 'healthy';
  if (h.healthy === false || h.ok === false) return 'down';
  return 'unknown';
}

function healthBadgeClass(status: string): string {
  const s = status.toLowerCase();
  if (s === 'ok' || s === 'healthy') return 'vc-health-ok';
  if (s === 'degraded') return 'vc-health-degraded';
  if (s === 'down' || s === 'unhealthy' || s === 'error') return 'vc-health-down';
  return 'vc-health-unknown';
}

function latencyValue(h?: RouterPanelHealth, p?: RouterPanelProvider): number | undefined {
  const v = h?.latencyMs ?? h?.durationMs ?? h?.avgLatencyMs ?? p?.latencyMs;
  return typeof v === 'number' ? v : (typeof v === 'string' && (v as string).trim() !== '' ? Number(v) : undefined);
}

function costValue(h?: RouterPanelHealth, p?: RouterPanelProvider): number | undefined {
  const v = h?.cost ?? h?.totalCost ?? h?.avgCost ?? p?.cost;
  return typeof v === 'number' ? v : (typeof v === 'string' && (v as string).trim() !== '' ? Number(v) : undefined);
}
export function renderRouterPanel(args: RenderRouterPanelArgs = {}): string {
  const providers = Array.isArray(args?.providers) ? args.providers : [];
  const activeId = args?.activeId != null ? String(args.activeId) : null;
  const health = args?.health ?? null;

  const cards = providers.map((p, i) => {
    const id = providerId(p, i);
    const name = providerName(p);
    const isActive = activeId !== null && id === activeId;
    const h = healthFor(health, id, activeId);
    const status = healthStatus(h);
    const lat = latencyValue(h, p);
    const cost = costValue(h, p);

    const badges = [
      `<span class="vc-badge vc-badge-health health-badge ${healthBadgeClass(status)}" aria-label="Health: ${esc(status)}">${esc(status)}</span>`,
    ];
    if (typeof lat === 'number' && !Number.isNaN(lat)) {
      badges.push(`<span class="vc-badge vc-badge-latency latency-badge" aria-label="Latency: ${Math.round(lat)} milliseconds">${esc(Math.round(lat))} ms</span>`);
    } else {
      badges.push(`<span class="vc-badge vc-badge-latency latency-badge" aria-label="Latency: not reported">latency: not reported</span>`);
    }
    if (typeof cost === 'number' && !Number.isNaN(cost)) {
      badges.push(`<span class="vc-badge vc-badge-cost cost-badge" aria-label="Cost: ${cost}">${esc(cost.toFixed ? cost.toFixed(4) : cost)}</span>`);
    } else {
      badges.push(`<span class="vc-badge vc-badge-cost cost-badge" aria-label="Cost: not reported">cost: not reported</span>`);
    }

    return [
      `<article class="vc-provider-card provider-card vc-card${isActive ? ' vc-provider-card--active is-active' : ''}" role="listitem" aria-label="${esc(name)} provider card"${isActive ? ' aria-current="true"' : ''}>`,
      `  <header class="vc-provider-card__header">`,
      `    <h3 class="vc-provider-card__name">${esc(name)}</h3>`,
      `    <span class="vc-provider-card__id">${esc(id)}</span>`,
      `  </header>`,
      `  <div class="vc-badge-row" role="group" aria-label="Provider badges">${badges.join('')}</div>`,
      `  <div class="vc-provider-card__actions">`,
      `    <button type="button" class="vc-btn vc-set-active set-active" data-action="set-active" data-provider-id="${esc(id)}" aria-label="Set ${esc(name)} as active provider"${isActive ? ' disabled' : ''}>Set active</button>`,
      `  </div>`,
      `</article>`,
    ].join('\n');
  }).join('\n');

  const fallbackChain = Array.isArray(args?.fallbackChain) ? args.fallbackChain.filter((x) => x != null).map(String) : [];

  const fallbackItems = fallbackChain.length
    ? fallbackChain.map((id, i) => [
        `<li class="vc-fallback-item fallback-item" data-provider-id="${esc(id)}" data-index="${i}">`,
        `  <span class="vc-fallback-item__handle" aria-hidden="true">⋮⋮</span>`,
        `  <span class="vc-fallback-item__name">${esc(id)}</span>`,
        `  <span class="vc-fallback-item__pos">${i + 1}</span>`,
        `  <button type="button" class="vc-btn vc-fallback-up" data-action="fallback-up" data-provider-id="${esc(id)}" aria-label="Move ${esc(id)} up" ${i === 0 ? 'disabled' : ''}>↑</button>`,
        `  <button type="button" class="vc-btn vc-fallback-down" data-action="fallback-down" data-provider-id="${esc(id)}" aria-label="Move ${esc(id)} down" ${i === fallbackChain.length - 1 ? 'disabled' : ''}>↓</button>`,
        `  <button type="button" class="vc-btn vc-fallback-remove" data-action="fallback-remove" data-provider-id="${esc(id)}" aria-label="Remove ${esc(id)} from chain">Remove</button>`,
        `  <button type="button" class="vc-btn vc-fallback-test" data-action="fallback-test" data-provider-id="${esc(id)}" aria-label="Test ${esc(id)}">Test</button>`,
        `</li>`,
      ].join('\n')).join('\n')
    : '<li class="vc-fallback-empty fallback-empty"><p class="vc-empty-msg">No fallback providers in chain.</p></li>';

  const fallbackEditor = [
    `<section class="vc-fallback-chain-editor fallback-chain-editor" aria-label="Fallback chain editor">`,
    `  <h3>Fallback chain</h3>`,
    `  <ol class="vc-fallback-list fallback-list" aria-label="Fallback provider order">${fallbackItems}</ol>`,
    `  <div class="vc-fallback-actions fallback-actions">`,
    `    <button type="button" class="vc-btn vc-fallback-add" data-action="fallback-add" aria-label="Add provider to chain">Add</button>`,
    `    <button type="button" class="vc-btn vc-fallback-test-all" data-action="fallback-test-all" aria-label="Test all providers in chain">Test all</button>`,
    `  </div>`,
    `</section>`,
  ].join('\n');

  return [
    `<section class="vc-router-panel router-panel" aria-label="Router panel">`,
    `  <header class="vc-router-panel__header">`,
    `    <h2>Providers</h2>`,
    `  </header>`,
    `  <div class="vc-provider-list" role="list">${cards || '<p class="vc-empty-msg">No providers configured.</p>'}</div>`,
    `  ${fallbackEditor}`,
    `  <div class="vc-router-panel__actions">`,
    `    <button type="button" class="vc-btn vc-add-custom-endpoint add-custom-endpoint" data-action="add-custom-endpoint" aria-label="Add custom endpoint">Add custom endpoint</button>`,
    `  </div>`,
    `</section>`,
  ].join('\n');
}

export default renderRouterPanel;

