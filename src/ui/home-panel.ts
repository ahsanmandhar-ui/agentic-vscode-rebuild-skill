// src/ui/home-panel.ts
// Pure HTML renderer for the "Home" panel (U9): welcome, workspace, readiness
// checklist, engine/model/account strip, quick task. CSS classes only.

export interface RenderHomePanelArgs {
  workspace?: string | null;
  workspaceName?: string | null;
  readiness?: Array<{ label: string; ok?: boolean; status?: string }> | null;
  engine?: { version?: string; status?: string } | null;
  model?: { name?: string; provider?: string; status?: string } | null;
  account?: { label?: string; provider?: string; status?: string } | null;
  quickTaskLabel?: string;
  quickTaskId?: string;
  [key: string]: unknown;
}

const esc = (v: unknown): string =>
  String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function renderHomePanel(args: RenderHomePanelArgs = {}): string {
  const workspace = String(args?.workspace ?? args?.workspaceName ?? 'Workspace');

  const readiness = Array.isArray(args?.readiness)
    ? args.readiness
    : [
        { label: 'Extension activated', ok: true },
        { label: 'Webview ready', ok: true },
        { label: 'Model connected', ok: false },
        { label: 'Context files present', ok: false },
      ];

  const checklist = readiness
    .map((r) => {
      const ok = r?.ok === true || r?.status === 'ok' || r?.status === 'ready';
      return `<li class="vc-home-checklist__item home-checklist-item${ok ? ' is-ok' : ' is-pending'}" aria-label="${esc(r?.label ?? '')}"><span class="vc-home-checklist__mark" aria-hidden="true">${ok ? '✓' : '○'}</span><span class="vc-home-checklist__label">${esc(r?.label ?? '')}</span></li>`;
    })
    .join('');

  const engine = args?.engine ?? {};
  const model = args?.model ?? {};
  const account = args?.account ?? {};
  const quickLabel = String(args?.quickTaskLabel ?? 'Quick task');
  const quickId = String(args?.quickTaskId ?? 'vibecode.agent.run');

  const strip = [
    `<div class="vc-home-strip__item home-strip-item home-engine-strip"><span class="vc-home-strip__label">Engine</span><span class="vc-home-strip__value">${esc((engine as any)?.version ?? 'dev')}</span><span class="vc-home-strip__status">${esc((engine as any)?.status ?? 'ready')}</span></div>`,
    `<div class="vc-home-strip__item home-strip-item home-model-strip"><span class="vc-home-strip__label">Model</span><span class="vc-home-strip__value">${esc((model as any)?.name ?? 'Not connected')}</span><span class="vc-home-strip__status">${esc((model as any)?.status ?? 'unknown')}</span></div>`,
    `<div class="vc-home-strip__item home-strip-item home-account-strip"><span class="vc-home-strip__label">Account</span><span class="vc-home-strip__value">${esc((account as any)?.label ?? 'None')}</span><span class="vc-home-strip__status">${esc((account as any)?.status ?? 'unknown')}</span></div>`,
  ].join('');

  return [
    `<section class="vc-home-panel home-panel" aria-label="Home panel">`,
    `  <header class="vc-home-welcome home-welcome">`,
    `    <h2 class="vc-home-welcome__title home-welcome-title">Welcome to VibeCode</h2>`,
    `    <p class="vc-home-welcome__subtitle home-welcome-subtitle">Your agentic coding engine. Run tasks, manage skills, and track progress from one place.</p>`,
    `  </header>`,
    `  <section class="vc-home-workspace home-workspace" aria-label="Workspace">`,
    `    <h3 class="vc-home-workspace__title">Workspace</h3>`,
    `    <p class="vc-home-workspace__name home-workspace-name">${esc(workspace)}</p>`,
    `  </section>`,
    `  <section class="vc-home-readiness home-readiness" aria-label="Readiness checklist">`,
    `    <h3 class="vc-home-readiness__title">Readiness</h3>`,
    `    <ul class="vc-home-checklist home-checklist readiness-checklist" role="list" aria-label="Readiness checklist">${checklist}</ul>`,
    `  </section>`,
    `  <section class="vc-home-strip home-strip engine-model-account-strip" aria-label="Engine, model and account">${strip}</section>`,
    `  <section class="vc-home-quicktask home-quicktask quick-task" aria-label="Quick task">`,
    `    <button type="button" class="vc-btn vc-home-quicktask__btn home-quicktask-btn quick-task-btn" data-action="${esc(quickId)}" aria-label="${esc(quickLabel)}">${esc(quickLabel)}</button>`,
    `  </section>`,
    `</section>`,
  ].join('\n');
}

export default renderHomePanel;
