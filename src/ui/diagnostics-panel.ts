// src/ui/diagnostics-panel.ts
// Pure HTML renderer for the "Diagnostics" panel (U14.2).

export interface HealthCheck {
  name?: string;
  label?: string;
  status?: string;
  state?: string;
  ok?: boolean;
  healthy?: boolean;
  detail?: string;
  message?: string;
  [key: string]: unknown;
}

export interface DiagLogEntry {
  ts?: string;
  level?: string;
  module?: string;
  message?: string;
  [key: string]: unknown;
}

export interface RenderDiagnosticsPanelArgs {
  healthChecks?: HealthCheck[] | null;
  checks?: HealthCheck[] | null;
  items?: HealthCheck[] | null;
  list?: HealthCheck[] | null;
  logs?: unknown;
  log?: unknown;
  entries?: unknown;
  perfBudget?: unknown;
  perf?: unknown;
  budget?: unknown;
  report?: string;
  perfReport?: string;
  exportAction?: string;
  emptyMessage?: string;
  [key: string]: unknown;
}

const esc = (v: unknown): string =>
  String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function pickChecks(args: RenderDiagnosticsPanelArgs): HealthCheck[] {
  const cands = [args.healthChecks, args.checks, args.items, args.list, (args as any).health, (args as any).results];
  for (const c of cands) if (Array.isArray(c)) return c as HealthCheck[];
  return [];
}

function pickLogs(args: RenderDiagnosticsPanelArgs): string[] {
  const cands = [args.logs, args.log, args.entries, (args as any).recent, (args as any).lines];
  for (const c of cands) {
    if (Array.isArray(c)) {
      return c.map((e: any) => {
        if (typeof e === 'string') return e;
        const ts = e?.ts ?? e?.timestamp ?? '';
        const level = e?.level ?? '';
        const mod = e?.module ?? e?.mod ?? '';
        const msg = e?.message ?? e?.msg ?? e?.detail ?? '';
        return [ts, level, mod, msg].filter(Boolean).join(' ');
      });
    }
    if (typeof c === 'string') return c.split('\n');
  }
  return [];
}

function pickPerf(args: RenderDiagnosticsPanelArgs): string {
  const cands = [args.perfBudget, args.perf, args.budget, args.perfReport, (args as any).performanceBudget, (args as any).report];
  for (const c of cands) {
    if (typeof c === 'string') return c;
    if (c && typeof c === 'object') {
      if (typeof (c as any).report === 'function') return (c as any).report();
      try { return JSON.stringify(c); } catch { /* noop */ }
    }
  }
  if (typeof args.report === 'string') return args.report;
  return '';
}

function checkName(c: HealthCheck, i: number): string {
  return String(c?.name ?? c?.label ?? c?.id ?? `check-${i}`);
}
function checkStatus(c: HealthCheck): string {
  if (typeof c?.ok === 'boolean') return c.ok ? 'ok' : 'fail';
  if (typeof c?.healthy === 'boolean') return c.healthy ? 'ok' : 'fail';
  const s = String(c?.status ?? c?.state ?? '').toLowerCase();
  if (s === 'ok' || s === 'pass' || s === 'healthy' || s === 'success') return 'ok';
  if (s === 'fail' || s === 'error' || s === 'unhealthy' || s === 'failed') return 'fail';
  return s || 'unknown';
}
function checkDetail(c: HealthCheck): string {
  return String(c?.detail ?? c?.message ?? c?.description ?? '');
}
export function renderDiagnosticsPanel(args: RenderDiagnosticsPanelArgs = {}): string {
  const checks = pickChecks(args);
  const logs = pickLogs(args);
  const perf = pickPerf(args);
  const emptyMessage = String(args?.emptyMessage ?? 'No diagnostics collected yet. Run a system check.');
  const exportAction = String(args?.exportAction ?? 'vibecode.diagnostics.export');

  const checksHtml = checks.length === 0
    ? `<div class="vc-empty diag-empty vc-card"><p class="vc-empty-msg diag-empty-msg">${esc(emptyMessage)}</p></div>`
    : `<ul class="vc-diag-checks diag-checks health-checks" role="list" aria-label="Health checks">
${checks.map((c, i) => {
  const name = checkName(c, i);
  const status = checkStatus(c);
  const detail = checkDetail(c);
  const cls = status === 'ok' ? 'ok' : status === 'fail' ? 'fail' : 'unknown';
  return `  <li class="vc-diag-check diag-check health-check" data-check="${esc(name)}">
    <span class="vc-diag-check-name diag-check-name check-name">${esc(name)}</span>
    <span class="vc-badge vc-diag-check-status diag-check-status health-badge ${cls}">${esc(status)}</span>
    ${detail ? `<span class="vc-diag-check-detail diag-check-detail check-detail">${esc(detail)}</span>` : ''}
  </li>`;
}).join('\n')}
</ul>`;

  const logsHtml = logs.length === 0
    ? `<pre class="vc-diag-logs diag-logs logs" aria-label="Logs" role="log" aria-live="polite">No logs yet.</pre>`
    : `<pre class="vc-diag-logs diag-logs logs" aria-label="Logs" role="log" aria-live="polite">${esc(logs.join('\n'))}</pre>`;

  const perfHtml = perf
    ? `<pre class="vc-diag-perf diag-perf perf-budget" aria-label="Performance budget">${esc(perf)}</pre>`
    : `<div class="vc-empty diag-perf-empty vc-card"><p class="vc-empty-msg">No performance data recorded.</p></div>`;

  return [
    `<section class="vc-diagnostics-panel diagnostics-panel diag-panel" aria-label="Diagnostics panel">`,
    `  <header class="vc-diagnostics-panel__header diag-header"><h2>Diagnostics</h2></header>`,
    `  <div class="vc-diagnostics-toolbar diag-toolbar">`,
    `    <button type="button" class="vc-btn vc-diag-export export" data-action="${esc(exportAction)}" aria-label="Export diagnostics">Export</button>`,
    `    <button type="button" class="vc-btn vc-diag-refresh refresh" data-action="vibecode.diagnostics.run" aria-label="Run system check">Run check</button>`,
    `  </div>`,
    `  <div class="vc-diagnostics-checks-section diag-checks-section">`,
    `    <h3>Health checks</h3>`,
    checksHtml,
    `  </div>`,
    `  <div class="vc-diagnostics-logs-section diag-logs-section">`,
    `    <h3>Logs</h3>`,
    logsHtml,
    `  </div>`,
    `  <div class="vc-diagnostics-perf-section diag-perf-section">`,
    `    <h3>Performance budget</h3>`,
    perfHtml,
    `  </div>`,
    `</section>`,
  ].join('\n');
}

export default renderDiagnosticsPanel;

