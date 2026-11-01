// src/ui/permissions-panel.ts
// Pure HTML renderer for the "Permissions" panel (U14.1).

export interface PermissionRule {
  action?: string;
  target?: string;
  targetPattern?: string;
  decision?: string;
  scope?: string;
  at?: string;
  [key: string]: unknown;
}

export interface PermissionDecisionEntry {
  ts?: string;
  kind?: string;
  detail?: string;
  [key: string]: unknown;
}

export interface RenderPermissionsPanelArgs {
  rules?: PermissionRule[] | null;
  remembered?: PermissionRule[] | null;
  decisions?: PermissionDecisionEntry[] | null;
  audit?: PermissionDecisionEntry[] | null;
  logs?: PermissionDecisionEntry[] | null;
  emptyMessage?: string;
  [key: string]: unknown;
}

const esc = (v: unknown): string =>
  String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function pickRules(args: RenderPermissionsPanelArgs): PermissionRule[] {
  const cands = [args.rules, args.remembered, (args as any).rememberedDecisions, (args as any).items, (args as any).list];
  for (const c of cands) if (Array.isArray(c)) return c as PermissionRule[];
  return [];
}

function pickDecisions(args: RenderPermissionsPanelArgs): PermissionDecisionEntry[] {
  const cands = [args.decisions, args.audit, args.logs, (args as any).recent, (args as any).recentDecisions, (args as any).entries];
  for (const c of cands) if (Array.isArray(c)) return c as PermissionDecisionEntry[];
  return [];
}

function ruleAction(r: PermissionRule, i: number): string {
  return String(r?.action ?? r?.name ?? `rule-${i}`);
}
function ruleTarget(r: PermissionRule): string {
  return String(r?.targetPattern ?? r?.target ?? r?.resource ?? r?.pattern ?? '');
}
function ruleDecision(r: PermissionRule): string {
  return String(r?.decision ?? r?.verdict ?? 'ask');
}
function ruleScope(r: PermissionRule): string {
  return String(r?.scope ?? 'once');
}

export function renderPermissionsPanel(args: RenderPermissionsPanelArgs = {}): string {
  const rules = pickRules(args);
  const decisions = pickDecisions(args);
  const emptyMessage = String(args?.emptyMessage ?? 'No remembered decisions yet. Run a task to create some.');

  const rulesHtml = rules.length === 0
    ? `<div class="vc-empty perms-empty vc-card"><p class="vc-empty-msg perms-empty-msg">${esc(emptyMessage)}</p></div>`
    : `<ul class="vc-perms-rules perms-rules rules-list" role="list" aria-label="Remembered rules">
${rules.map((r, i) => {
  const action = ruleAction(r, i);
  const target = ruleTarget(r);
  const decision = ruleDecision(r);
  const scope = ruleScope(r);
  const at = r?.at ? String(r.at) : '';
  return `  <li class="vc-perms-rule perms-rule rule-item" data-rule-index="${i}" aria-label="${esc(action)} ${esc(target)}">
    <span class="vc-perms-rule-action perms-rule-action rule-action">${esc(action)}</span>
    <span class="vc-perms-rule-target perms-rule-target rule-target">${esc(target)}</span>
    <span class="vc-badge vc-perms-rule-decision perms-rule-decision rule-decision">${esc(decision)}</span>
    <span class="vc-perms-rule-scope perms-rule-scope rule-scope">${esc(scope)}</span>
    ${at ? `<span class="vc-perms-rule-at perms-rule-at rule-at">${esc(at)}</span>` : ''}
    <button type="button" class="vc-btn vc-perms-clear-rule clear-rule" data-action="vibecode.perms.clear" data-index="${i}" aria-label="Clear rule">Clear</button>
  </li>`;
}).join('\n')}
</ul>`;

  const decisionsHtml = decisions.length === 0
    ? `<div class="vc-empty perms-decisions-empty vc-card"><p class="vc-empty-msg">No recent decisions.</p></div>`
    : `<ul class="vc-perms-decisions perms-decisions recent-decisions" role="list" aria-label="Recent decisions">
${decisions.map((d, i) => {
  const ts = String(d?.ts ?? d?.at ?? d?.timestamp ?? '');
  const kind = String(d?.kind ?? d?.type ?? 'decision');
  const detail = String(d?.detail ?? d?.message ?? d?.reason ?? '');
  return `  <li class="vc-perms-decision perms-decision decision-item" data-decision-index="${i}">
    ${ts ? `<span class="vc-perms-decision-ts perms-decision-ts decision-ts">${esc(ts)}</span>` : ''}
    <span class="vc-perms-decision-kind perms-decision-kind decision-kind">${esc(kind)}</span>
    <span class="vc-perms-decision-detail perms-decision-detail decision-detail">${esc(detail)}</span>
  </li>`;
}).join('\n')}
</ul>`;

  return [
    `<section class="vc-permissions-panel permissions-panel perms-panel" aria-label="Permissions panel">`,
    `  <header class="vc-permissions-panel__header perms-header"><h2>Permissions</h2></header>`,
    `  <div class="vc-permissions-toolbar perms-toolbar">`,
    `    <button type="button" class="vc-btn vc-perms-remember remember" data-action="vibecode.perms.remember" aria-label="Remember decision">Remember</button>`,
    `    <button type="button" class="vc-btn vc-perms-clear clear" data-action="vibecode.perms.clear" aria-label="Clear all rules">Clear</button>`,
    `  </div>`,
    `  <div class="vc-permissions-rules-section perms-rules-section">`,
    `    <h3>Rules</h3>`,
    rulesHtml,
    `  </div>`,
    `  <div class="vc-permissions-decisions-section perms-decisions-section">`,
    `    <h3>Recent decisions</h3>`,
    decisionsHtml,
    `  </div>`,
    `</section>`,
  ].join('\n');
}

export default renderPermissionsPanel;
