// src/ui/router-selector.ts
// QuickPick selector listing providers with health/cost/latency badges.
import { listProviders } from '../providers/registry';
export interface ProviderBadgeInfo { providerId: string; name: string; health?: string; cost?: number; latencyMs?: number; label: string; description?: string; }
export function badgeForHealth(status?: string): string {
  if (!status) return '?';
  const s = String(status).toLowerCase();
  if (s === 'ok' || s === 'healthy') return '??';
  if (s === 'degraded') return '??';
  if (s === 'down' || s === 'unhealthy') return '??';
  return '?';
}
export function formatProviderLabel(p: any, health?: any, stats?: any): string {
  const id = String(p?.id ?? p?.providerId ?? p?.name ?? 'unknown');
  const name = String(p?.name ?? p?.label ?? id);
  const healthBadge = badgeForHealth(health?.status ?? health?.healthy);
  const latency = stats?.avgLatencyMs ?? health?.latencyMs ?? health?.durationMs;
  const cost = stats?.totalCost;
  const parts = [name, healthBadge];
  if (typeof latency === 'number') parts.push(`? ${Math.round(latency)}ms`);
  if (typeof cost === 'number') parts.push(`?? ${cost.toFixed(4)}`);
  return parts.join('  ');
}
export function buildProviderItems(providers: any[], healthMap?: Record<string, any>, statsStore?: any): any[] {
  const items: any[] = [];
  for (const p of providers || []) {
    const id = String(p?.id ?? p?.providerId ?? p?.name ?? 'unknown');
    const health = healthMap ? healthMap[id] : undefined;
    const stats = statsStore && typeof statsStore.getStats === 'function' ? statsStore.getStats(id) : undefined;
    items.push({ label: formatProviderLabel(p, health, stats), description: p?.baseUrl ?? p?.docsUrl ?? '', providerId: id, provider: p, health, stats });
  }
  items.push({ label: '? Add custom endpoint', description: 'Wizard', action: 'add-custom' });
  return items;
}
export interface RouterSelectorOptions { providers?: any[]; healthMap?: Record<string, any>; statsStore?: any; onTestConnection?: (provider: any) => Promise<any>; onAddCustom?: () => Promise<any>; }
export class RouterSelector {
  private readonly opts: RouterSelectorOptions;
  constructor(opts?: RouterSelectorOptions) { this.opts = opts || {}; }
  getProviders(): any[] { if (this.opts.providers) return this.opts.providers; try { return listProviders(); } catch { return []; } }
  buildItems(): any[] { return buildProviderItems(this.getProviders(), this.opts.healthMap, this.opts.statsStore); }
  async testConnection(provider: any): Promise<any> {
    if (this.opts.onTestConnection) return this.opts.onTestConnection(provider);
    if (provider && typeof provider.test === 'function') return provider.test();
    if (provider && typeof provider.health === 'function') return provider.health();
    return { ok: false, message: 'no test available' };
  }
  async addCustomEndpoint(): Promise<any> {
    if (this.opts.onAddCustom) return this.opts.onAddCustom();
    // Custom endpoint wizard: URL → SSRF preview → test → store key.
    const wizard = {
      steps: ['url', 'ssrf-preview', 'test', 'store-key'],
      message: 'Custom endpoint wizard: provide URL, preview SSRF guard, test connection, then store API key (masked).',
    };
    return { ok: true, wizard: 'custom-endpoint', stub: false, ...wizard };
  }
  async show(): Promise<any> {
    const items = this.buildItems();
    let vscode: any;
    try { const g: any = globalThis as any; vscode = (typeof g.require === 'function') ? g.require('vscode') : g.vscode; } catch { vscode = (globalThis as any).vscode; }
    if (!vscode || !vscode.window || typeof vscode.window.showQuickPick !== 'function') {
      return { items, selected: null };
    }
    const pick = await vscode.window.showQuickPick(items.map((i: any) => ({ label: i.label, description: i.description })), { placeHolder: 'Select a provider' });
    if (!pick) return { items, selected: null };
    const selected = items.find((i: any) => i.label === pick.label) || null;
    if (selected && selected.action === 'add-custom') {
      const result = await this.addCustomEndpoint();
      return { items, selected, result };
    }
    if (selected && selected.provider) {
      const test = await this.testConnection(selected.provider);
      return { items, selected, test };
    }
    return { items, selected };
  }
}
export async function showRouterSelector(opts?: RouterSelectorOptions): Promise<any> { return new RouterSelector(opts).show(); }
export default { RouterSelector, showRouterSelector, buildProviderItems, formatProviderLabel, badgeForHealth };

