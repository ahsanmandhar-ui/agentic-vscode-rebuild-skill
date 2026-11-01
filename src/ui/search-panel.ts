// src/ui/search-panel.ts
export interface SearchPanelProvider { id?: string; name?: string; label?: string; provider?: string; apiKey?: string; key?: string; configured?: boolean; hasKey?: boolean; cooling?: boolean; rateLimited?: boolean; [k: string]: unknown; }
export interface SearchPanelCacheStats { entries?: number; size?: number; maxSize?: number; capacity?: number; maxEntries?: number; hits?: number; misses?: number; [k: string]: unknown; }
export interface RenderSearchPanelArgs { providers?: SearchPanelProvider[] | null; status?: unknown; cacheStats?: SearchPanelCacheStats | null; }

const esc = (v: unknown) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function pid(p: SearchPanelProvider, i: number) { return String(p?.id ?? p?.provider ?? p?.name ?? p?.label ?? `provider-${i}`); }
function pname(p: SearchPanelProvider) { return String(p?.name ?? p?.label ?? p?.id ?? p?.provider ?? 'Unknown provider'); }
function hasKey(p: SearchPanelProvider) {
  if (typeof p?.hasKey === 'boolean') return p.hasKey;
  if (typeof p?.configured === 'boolean') return p.configured;
  const k = p?.apiKey ?? p?.key;
  return typeof k === 'string' && k.trim().length > 0;
}
function cooling(p: SearchPanelProvider) { return p?.cooling === true || p?.rateLimited === true; }
function rateLimited(status: unknown, list: SearchPanelProvider[]) {
  if (list.some(cooling)) return true;
  if (status == null) return false;
  if (typeof status === 'string') { const s = status.toLowerCase(); return s.includes('rate') || s === 'cooling' || s === 'limited'; }
  if (typeof status === 'object') { const o = status as any; if (o.rateLimited === true || o.cooling === true) return true; if (o.status && rateLimited(o.status, [])) return true; if (Array.isArray(o.coolingProviders) && o.coolingProviders.length) return true; }
  return false;
}
function cnum(s: any, ...keys: string[]) { for (const k of keys) { const v = s?.[k]; if (typeof v === 'number') return v; if (typeof v === 'string' && v.trim() !== '') { const n = Number(v); if (!Number.isNaN(n)) return n; } } return 0; }

export function renderSearchPanel({ providers, status, cacheStats }: RenderSearchPanelArgs = {}): string {
  const list = Array.isArray(providers) ? providers.filter((p) => p != null) : [];
  const rl = rateLimited(status, list);
  const cards = list.map((p, i) => {
    const id = pid(p, i); const name = pname(p); const k = hasKey(p); const c = cooling(p);
    return `<article class="vc-search-provider-card search-provider-card provider-card vc-card${c ? ' is-cooling rate-limited' : ''}" role="listitem" data-provider-id="${esc(id)}" aria-label="${esc(name)} search provider card">
  <header><h3 class="vc-search-provider-card__name">${esc(name)}</h3><span class="vc-search-provider-card__id">${esc(id)}</span></header>
  <div class="vc-search-provider-card__key"><label for="vc-search-key-${esc(id)}">API key</label><input id="vc-search-key-${esc(id)}" type="password" class="vc-masked-key-input masked-key-input" name="apiKey" data-provider-id="${esc(id)}" placeholder="••••••••" autocomplete="off" aria-label="Masked API key for ${esc(name)}" value="" /></div>
  <div class="vc-search-provider-card__actions"><button type="button" class="vc-btn vc-search-test-btn search-test-btn test-button" data-action="search-test" data-provider-id="${esc(id)}" aria-label="Test ${esc(name)} connection">Test</button></div>
  ${c ? '<div class="vc-rate-limit-chip rate-limit-chip" role="status">Rate limited</div>' : ''}
</article>`;
  }).join('\n');
  const fallback = list.map((p, i) => { const id = pid(p, i); const name = pname(p); return `<li class="vc-fallback-order-item fallback-order-item" data-provider-id="${esc(id)}"><span class="vc-fallback-order-handle" aria-hidden="true">☰</span> ${esc(name)} <span class="vc-fallback-order-id">${esc(id)}</span></li>`; }).join('');
  const entries = cnum(cacheStats, 'entries', 'size');
  const max = cnum(cacheStats, 'maxSize', 'capacity', 'maxEntries');
  const hits = (cacheStats as any)?.hits;
  const misses = (cacheStats as any)?.misses;
  const banner = rl ? `<div class="vc-rate-limit-banner rate-limit-banner" role="alert" aria-live="assertive"><strong>Rate limit:</strong> A search provider is cooling down. Requests will fall back to the next provider.</div>` : '';
  return [
    `<section class="vc-search-panel search-panel" aria-label="Search panel">`,
    banner,
    `<header class="vc-search-panel__header"><h2>Search providers</h2></header>`,
    `<div class="vc-search-provider-list search-provider-list" role="list">${cards || '<p class="vc-empty-msg">No search providers configured.</p>'}</div>`,
    `<section class="vc-fallback-order-editor fallback-order-editor" aria-label="Fallback order editor">`,
    `<h3>Fallback order</h3>`,
    `<p class="vc-fallback-order-hint">Drag or reorder providers; first available is tried first.</p>`,
    `<ol class="vc-fallback-order-list fallback-order-list">${fallback || '<li class="vc-empty-msg">No providers</li>'}</ol>`,
    `<div class="vc-fallback-order-actions"><button type="button" class="vc-btn vc-save-fallback-order save-fallback-order" data-action="search-save-fallback-order" aria-label="Save fallback order">Save order</button></div>`,
    `</section>`,
    `<section class="vc-cache-stats cache-stats" aria-label="Cache statistics">`,
    `<h3>Cache</h3>`,
    `<ul class="vc-cache-stats-list">`,
    `<li class="vc-cache-stat cache-stat-entries">Entries: ${esc(entries)}</li>`,
    `<li class="vc-cache-stat cache-stat-max">Max: ${esc(max)}</li>`,
    hits !== undefined ? `<li class="vc-cache-stat cache-stat-hits">Hits: ${esc(hits)}</li>` : '',
    misses !== undefined ? `<li class="vc-cache-stat cache-stat-misses">Misses: ${esc(misses)}</li>` : '',
    `</ul>`,
    `</section>`,
    `</section>`,
  ].filter(Boolean).join('\n');
}
export default renderSearchPanel;
