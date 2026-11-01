// src/ui/failure.ts
// Failure cards + empty-state helpers for the VibeCode webview state machine.
// Pure helpers (no vscode import) so they can be unit-tested in isolation.

export type PanelStatus = 'loading' | 'empty' | 'error' | 'ready' | 'disabled';

export type PanelId = 'skills' | 'settings' | 'models' | 'perms' | 'context' | 'diagnostics' | 'routers' | 'cli' | 'search' | 'chat' | 'plan' | 'progress' | 'home' | 'tasks' | 'onboarding' | 'supervisor' | 'agent';

export interface ActionRef {
  label: string;
  id: string; // command id
}

export interface EmptyStateSpec {
  message: string; // one sentence, teaches
  action: ActionRef;
}

export interface FailureCardSpec {
  cause: string;
  impact: string;
  action: ActionRef;
}

export interface PanelStatePayload {
  v: 1;
  kind: 'panelState' | 'state';
  panel: PanelId;
  status: PanelStatus;
  state?: PanelStatus;
  data?: unknown;
  empty?: EmptyStateSpec;
  error?: FailureCardSpec;
  updatedAt: string;
}

export const PANELS: PanelId[] = ['skills', 'settings', 'models', 'perms', 'context', 'diagnostics', 'search', 'chat', 'plan', 'progress', 'home', 'tasks', 'onboarding', 'supervisor', 'agent'];

export const EMPTY_STATES: Record<PanelId, EmptyStateSpec> = {
  skills: { message: 'No skills installed yet. Install a skill to extend the engine.', action: { label: 'Install a skill', id: 'vibecode.skills.install' } },
  settings: { message: 'Settings are using defaults. Open settings to customise.', action: { label: 'Open settings', id: 'vibecode.settings.open' } },
  models: { message: 'No model provider configured. Connect one to start generating.', action: { label: 'Connect provider', id: 'vibecode.models.connect' } },
  perms: { message: 'No remembered decisions yet. Run a task to create some.', action: { label: 'Run a task', id: 'vibecode.agent.run' } },
  context: { message: 'No project context files found. Create plan.md to track progress.', action: { label: 'Create context', id: 'vibecode.context.create' } },
  diagnostics: { message: 'No diagnostics collected yet. Run a system check.', action: { label: 'Run system check', id: 'vibecode.diagnostics.run' } },
  routers: { message: 'No routers configured yet. Add a provider or custom endpoint.', action: { label: 'Add router', id: 'vibecode.routers.add' } },
  cli: { message: 'No CLI runs yet. Run a CLI tool to see output.', action: { label: 'Run CLI', id: 'vibecode.cli.run' } },
  search: { message: 'No search providers configured. Add a provider or API key to start searching.', action: { label: 'Configure search', id: 'vibecode.search.configure' } },
  chat: { message: 'Tell me what to do in this workspace…', action: { label: 'Start chat', id: 'vibecode.chat.invoke' } },
  plan: { message: 'No plan loaded yet. Create plan.md to track progress.', action: { label: 'Create plan', id: 'vibecode.plan.create' } },
  progress: { message: 'No progress recorded yet. Run a task to update progress.md.', action: { label: 'Update progress', id: 'vibecode.progress.update' } },
  home: { message: 'Welcome to VibeCode. Open Home to get started.', action: { label: 'Open Home', id: 'vibecode.home.open' } },
  tasks: { message: 'No tasks running yet. Start a task to see progress.', action: { label: 'Start task', id: 'vibecode.agent.run' } },
  onboarding: { message: 'Welcome to VibeCode. Complete onboarding to get started.', action: { label: 'Start onboarding', id: 'vibecode.onboarding.start' } },
  supervisor: { message: 'No supervisor activity yet. Run an agent task to see progress.', action: { label: 'Run agent task', id: 'vibecode.agent.run' } },
  agent: { message: 'No agent tasks running. Start a task to see progress.', action: { label: 'Run agent task', id: 'vibecode.agent.run' } },
};
export const FAILURE_ACTIONS: Record<string, ActionRef> = {
  retry: { label: 'Retry', id: 'vibecode.retry' },
  undo: { label: 'Undo', id: 'vibecode.undo' },
  switchProvider: { label: 'Switch provider', id: 'vibecode.models.switchProvider' },
  compact: { label: 'Compact context', id: 'vibecode.context.compact' },
  openLogs: { label: 'Open logs', id: 'vibecode.logs.open' },
};

export function failureCardHtml(spec: FailureCardSpec): string {
  const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const id = 'vc-failure-' + Math.random().toString(36).slice(2, 9);
  return [
    '<div class="vc-card vc-failure" role="alert" aria-live="assertive" aria-atomic="true" id="' + id + '">',
    '  <div class="vc-failure-cause" id="' + id + '-cause"><strong>Cause:</strong> ' + esc(spec.cause) + '</div>',
    '  <div class="vc-failure-impact" id="' + id + '-impact"><strong>Impact:</strong> ' + esc(spec.impact) + '</div>',
    '  <button class="vc-btn vc-btn-primary" data-action="' + esc(spec.action.id) + '" aria-describedby="' + id + '-cause ' + id + '-impact">' + esc(spec.action.label) + '</button>',
    '</div>',
  ].join('\\n');
}

export function emptyStateHtml(spec: EmptyStateSpec): string {
  const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const id = 'vc-empty-' + Math.random().toString(36).slice(2, 9);
  return [
    '<div class="vc-card vc-empty" role="status" aria-live="polite" aria-atomic="true" id="' + id + '">',
    '  <p class="vc-empty-msg" id="' + id + '-msg">' + esc(spec.message) + '</p>',
    '  <button class="vc-btn vc-btn-primary" data-action="' + esc(spec.action.id) + '" aria-describedby="' + id + '-msg">' + esc(spec.action.label) + '</button>',
    '</div>',
  ].join('\\n');
}

export function loadingHtml(): string {
  return '<div class="vc-card vc-loading" aria-live="polite">Loading…</div>';
}

export function disabledHtml(reason?: string): string {
  const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return '<div class="vc-card vc-disabled" role="status" aria-live="polite">' + esc(reason || 'This section is disabled until its precondition is met.') + '</div>';
}
export function clearErrorHtml(): string {
  return '<div class="vc-card vc-clear-error" role="status" aria-live="polite">Error cleared.</div>';
}

export function retryUndoHtml(spec?: FailureCardSpec): string {
  const retry = FAILURE_ACTIONS.retry;
  const undo = FAILURE_ACTIONS.undo;
  const cause = spec?.cause ? escSimple(spec.cause) : '';
  const impact = spec?.impact ? escSimple(spec.impact) : '';
  return [
    '<div class="vc-card vc-retry-undo" role="alert" aria-live="assertive">',
    cause ? '  <div class="vc-failure-cause"><strong>Cause:</strong> ' + cause + '</div>' : '',
    impact ? '  <div class="vc-failure-impact"><strong>Impact:</strong> ' + impact + '</div>' : '',
    '  <div class="vc-retry-undo__actions">',
    '    <button type="button" class="vc-btn vc-btn-primary" data-action="' + retry.id + '">' + retry.label + '</button>',
    '    <button type="button" class="vc-btn" data-action="' + undo.id + '">' + undo.label + '</button>',
    '  </div>',
    '</div>',
  ].filter(Boolean).join('\\n');
}

function escSimple(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function approvalCardHtml(args: {
  title?: string;
  message?: string;
  scopes?: string[];
  technicalDetail?: string;
  approveLabel?: string;
  denyLabel?: string;
} = {}): string {
  const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const title = esc(String(args?.title ?? 'Approval required'));
  const message = esc(String(args?.message ?? 'Review and approve this action.'));
  const scopes = Array.isArray(args?.scopes) && args.scopes.length ? args.scopes : ['once', 'session', 'workspace'];
  const scopeLabels: Record<string, string> = { once: 'Just this once', session: 'This session', workspace: 'Always in this workspace' };
  const scopeOptions = scopes.map((s) => '<option value="' + esc(s) + '">' + esc(scopeLabels[s] ?? s) + '</option>').join('');
  const detail = args?.technicalDetail ? esc(String(args.technicalDetail)) : '';
  const approveLabel = esc(String(args?.approveLabel ?? 'Approve'));
  const denyLabel = esc(String(args?.denyLabel ?? 'Deny'));
  const id = 'vc-approval-' + Math.random().toString(36).slice(2, 9);
  return [
    '<div class="vc-card vc-approval-card approval-card" role="group" aria-label="Approval card" id="' + id + '">',
    '  <header class="vc-approval-card__header approval-header"><h3 class="vc-approval-card__title">' + title + '</h3></header>',
    '  <p class="vc-approval-card__message approval-message">' + message + '</p>',
    '  <div class="vc-approval-card__scopes approval-scopes scope-selector">',
    '    <label for="' + id + '-scope">Scope</label>',
    '    <select id="' + id + '-scope" class="vc-approval-card__scope-select approval-scope-select" aria-label="Approval scope">' + scopeOptions + '</select>',
    '  </div>',
    detail ? '  <details class="vc-approval-card__detail approval-technical-detail"><summary>Technical details</summary><pre class="vc-approval-card__detail-pre">' + detail + '</pre></details>' : '',
    '  <div class="vc-approval-card__actions approval-actions">',
    '    <button type="button" class="vc-btn vc-btn-primary approval-approve" data-action="vibecode.approve" aria-label="' + approveLabel + '">' + approveLabel + '</button>',
    '    <button type="button" class="vc-btn approval-deny" data-action="vibecode.deny" aria-label="' + denyLabel + '">' + denyLabel + '</button>',
    '  </div>',
    '</div>',
  ].filter(Boolean).join('\\n');
}

export function renderApprovalCard(args: any = {}): string {
  return approvalCardHtml(args);
}

export function destructiveConfirmHtml(args: {
  target?: string;
  expected?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
} = {}): string {
  const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const target = String(args?.target ?? args?.expected ?? '');
  const expected = String(args?.expected ?? args?.target ?? '');
  const message = esc(String(args?.message ?? 'This action is destructive. Type the target name to confirm.'));
  const confirmLabel = esc(String(args?.confirmLabel ?? 'Confirm'));
  const cancelLabel = esc(String(args?.cancelLabel ?? 'Cancel'));
  const id = 'vc-destructive-' + Math.random().toString(36).slice(2, 9);
  return [
    '<div class="vc-card vc-destructive-confirm destructive-confirm" role="alertdialog" aria-modal="true" aria-label="Destructive confirmation" id="' + id + '">',
    '  <p class="vc-destructive-confirm__message destructive-message">' + message + '</p>',
    '  <p class="vc-destructive-confirm__target destructive-target">Target: <strong>' + esc(target) + '</strong></p>',
    '  <div class="vc-destructive-confirm__field destructive-field">',
    '    <label for="' + id + '-input">Type "' + esc(expected) + '" to confirm</label>',
    '    <input id="' + id + '-input" type="text" class="vc-destructive-confirm__input destructive-input typed-confirmation" data-expected="' + esc(expected) + '" aria-label="Typed confirmation" />',
    '  </div>',
    '  <div class="vc-destructive-confirm__actions destructive-actions">',
    '    <button type="button" class="vc-btn destructive-confirm-btn" data-action="vibecode.destructive.confirm" aria-label="' + confirmLabel + '">' + confirmLabel + '</button>',
    '    <button type="button" class="vc-btn destructive-cancel" data-action="vibecode.destructive.cancel" aria-label="' + cancelLabel + '">' + cancelLabel + '</button>',
    '  </div>',
    '</div>',
  ].join('\\n');
}

export function renderDestructiveConfirm(args: any = {}): string {
  return destructiveConfirmHtml(args);
}


export function panelStateMessage(payload: PanelStatePayload): PanelStatePayload {
  return { ...payload, state: payload.state ?? payload.status };
}
