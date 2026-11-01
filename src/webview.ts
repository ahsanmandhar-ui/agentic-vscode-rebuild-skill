// src/webview.ts
import * as vscode from 'vscode';
import * as crypto from 'crypto';
import { ModelsAccountsPanel } from './ui/models';
import { PermissionEngine } from './security/permissionEngine';
import { AccountRecord } from './routing/types';

import { SkillEngine } from './skills/engine';
import { CandidateCard } from './skills/types';
import { PanelId, PanelStatus, EMPTY_STATES, FAILURE_ACTIONS, panelStateMessage } from './ui/failure';
import { renderChatPanel } from './ui/chat-panel';
import { renderHomePanel } from './ui/home-panel';
import { renderOnboarding } from './ui/onboarding';
import { renderPlanViewer } from './ui/plan-viewer';
import { renderTasksPanel } from './ui/tasks-panel';
import { renderProgressViewer } from './ui/progress-viewer';
import { renderRouterPanel } from './ui/router-panel';
import { renderSearchPanel } from './ui/search-panel';
import { renderCliPanel } from './ui/cli-panel';
import { renderModelsAccounts } from './ui/models-accounts';
import { renderPermissionsPanel } from './ui/permissions-panel';
import { renderSettingsPanel } from './ui/settings-panel';
import { renderContextViewer } from './ui/context-viewer';
import { cssVariables } from './ui/design-tokens';
import { animationCss } from './ui/animations';
import { renderSupervisorPanel } from './ui/supervisor-panel';
import { renderDiagnosticsPanel } from './ui/diagnostics-panel';

import { handleWebviewMessage } from './protocol/messages';

export type { PanelId, PanelStatus };

export interface PanelState {
  panel: PanelId;
  status: PanelStatus;
  data?: unknown;
  empty?: { message: string; action: { label: string; id: string } };
  error?: { cause: string; impact: string; action: { label: string; id: string } };
  updatedAt: string;
}

const PANELS: PanelId[] = ['skills', 'settings', 'models', 'perms', 'context', 'diagnostics', 'routers', 'cli', 'search', 'chat', 'plan', 'progress', 'home', 'tasks', 'onboarding', 'supervisor', 'agent'];

export class VibeCodeWebviewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'vibecode.panel';

  private view?: vscode.WebviewView;
  private states: Record<PanelId, PanelState> = {} as any;
  private readonly emitter = new vscode.EventEmitter<PanelState>();
  public deps?: { modelsPanel?: ModelsAccountsPanel; permissionEngine?: PermissionEngine };
  private engine?: SkillEngine;
  private readonly streams = new Map<string, AbortController>();

  constructor(
    private readonly context: vscode.ExtensionContext,
    arg?: SkillEngine | { modelsPanel?: ModelsAccountsPanel; permissionEngine?: PermissionEngine },
  ) {
    if (arg && typeof arg === 'object' && typeof (arg as any).cards === 'function') {
      this.engine = arg as SkillEngine;
    } else {
      this.deps = arg as any;
    }
    for (const p of PANELS) {
      this.states[p] = { panel: p, status: 'loading', updatedAt: new Date().toISOString() };
    }
  }

  public readonly onPanelState = this.emitter.event;

  public dispose(): void {
    try { this.emitter.dispose(); } catch { /* noop */ }
    this.view = undefined;
    for (const p of PANELS) {
      this.states[p] = { panel: p, status: 'loading', updatedAt: new Date().toISOString() };
    }
  }

  public onPanelDispose(cb: () => void): vscode.Disposable {
    const v = this.view;
    if (v && typeof v.onDidDispose === 'function') {
      return v.onDidDispose(cb);
    }
    return { dispose: () => {} };
  }

  public resolveWebviewView(view: vscode.WebviewView): void {
    this.view = view;
    if (this.engine) {
      view.webview.options = { enableScripts: true, localResourceRoots: [this.context.extensionUri] };
      view.webview.html = this.getHtml(view.webview);
      view.webview.onDidReceiveMessage(async (msg: any) => {
        try {
          if (msg?.type === 'ready' || msg?.type === 'refresh') { await this.postState(); return; }
          if (msg?.type === 'action') {
            const id = String(msg.id);
            if (msg.action === 'inspect') await this.engine!.inspectSkill(id);
            else if (msg.action === 'install') await this.engine!.installSkill(id);
            else if (msg.action === 'skip') await this.engine!.skipSkill(id);
            else if (msg.action === 'quarantine') await this.engine!.quarantineSkill(id);
            await this.postState(); return;
          }
          if (msg?.type === 'bulkInstall' && Array.isArray(msg.ids)) {
            await this.engine!.bulkInstall(msg.ids.map(String)); await this.postState();
          }
        } catch (e) {
          view.webview.postMessage({ type: 'toast', level: 'error', message: (e as Error)?.message ?? String(e) });
        }
      });
      void this.postState();
      return;
    }

    view.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'media')],
    };
    view.webview.html = this.getHtml(view.webview);
    view.webview.onDidReceiveMessage((msg) => this.handleMessage(msg));
    void this.loadAll();
  }
// CHUNK1_END
  public postPanelState(panel: PanelId, status: PanelStatus, extra: Partial<PanelState> = {}): void {
    const payload: PanelState = {
      panel,
      status,
      updatedAt: new Date().toISOString(),
      ...extra,
    };
    this.states[panel] = payload;
    const msg = panelStateMessage({
      v: 1,
      kind: 'panelState',
      panel,
      status,
      state: status,
      data: extra.data,
      empty: extra.empty,
      error: extra.error,
      updatedAt: payload.updatedAt,
    });
    this.view?.webview.postMessage(msg);
    this.view?.webview.postMessage({ ...msg, kind: 'state' });
    this.emitter.fire(payload);
  }

public startStream(messageId: string): AbortController {
    const ac = new AbortController();
    this.streams.set(messageId, ac);
    return ac;
  }
  public cancelStream(messageId?: string): void {
    if (messageId) {
      const ac = this.streams.get(messageId);
      if (ac) ac.abort();
      this.streams.delete(messageId);
    } else {
      for (const ac of this.streams.values()) ac.abort();
      this.streams.clear();
    }
  }
  public finishStream(messageId: string): void {
    this.streams.delete(messageId);
  }
  public postStreamChunk(panel: PanelId = 'chat', messageId: string, delta: string, done = false): void {
    this.view?.webview.postMessage({ v: 1, kind: 'streamChunk', panel, messageId, delta, done });
    if (done) this.finishStream(messageId);
  }

  private getOnboardingPersisted(): { step: number; completed: boolean; completedSteps: number[] } {
    const gs: any = (this.context as any)?.globalState;
    const v = gs && typeof gs.get === 'function' ? gs.get('vibecode.onboarding', {}) : {};
    const step = Math.max(1, Number((v && (v.step ?? v.currentStep ?? v.persistedStep)) || 1));
    const completed = !!(v && (v.completed === true || v.done === true || v.persisted === true));
    const completedSteps = Array.isArray(v?.completedSteps) ? v.completedSteps.map((n: any) => Number(n)) : [];
    return { step, completed, completedSteps };
  }

  private async persistOnboarding(step: number, completed: boolean, completedSteps: number[]): Promise<void> {
    const gs: any = (this.context as any)?.globalState;
    if (gs && typeof gs.update === 'function') {
      try { await gs.update('vibecode.onboarding', { step, completed, completedSteps, updatedAt: new Date().toISOString() }); } catch { /* noop */ }
    }
  }

  public getState(panel: PanelId): PanelState { return this.states[panel]; }
  public refresh(): Promise<void> {
    if (this.engine) return this.postState();
    return this.loadAll();
  }

  public async loadAll(): Promise<void> {
    for (const p of PANELS) { await this.loadPanel(p); }
  }

  public async loadPanel(panel: PanelId): Promise<void> {
    this.postPanelState(panel, 'loading');
    try {
      await new Promise((r) => setTimeout(r, 10));
      switch (panel) {
        case 'skills': this.postPanelState(panel, 'empty', { empty: EMPTY_STATES.skills }); break;
        case 'settings': this.postPanelState(panel, 'ready', { data: { advanced: false } }); break;
        case 'models': this.postPanelState(panel, 'empty', { empty: EMPTY_STATES.models }); break;
        case 'perms': this.postPanelState(panel, 'ready', { data: { policy: 'deny-by-default' } }); break;
        case 'context': this.postPanelState(panel, 'empty', { empty: EMPTY_STATES.context }); break;
        case 'routers': this.postPanelState(panel, 'ready', { data: { providers: [], activeId: null } }); break;
        case 'cli': this.postPanelState(panel, 'ready', { data: { binaries: [] } }); break;
        case 'diagnostics': this.postPanelState(panel, 'ready', { data: { version: 'dev' } }); break;
        case 'search': this.postPanelState(panel, 'ready', { data: { providers: [], status: null, cacheStats: { entries: 0, maxSize: 0 } } }); break;
case 'plan': this.postPanelState(panel, 'empty', { empty: EMPTY_STATES.plan }); break;
case 'progress': this.postPanelState(panel, 'empty', { empty: EMPTY_STATES.progress }); break;
case 'home': this.postPanelState(panel, 'ready', { data: { onboarding: false } }); break;
case 'onboarding': { const op = this.getOnboardingPersisted(); this.postPanelState(panel, op.completed ? 'ready' : 'empty', { data: { step: op.step, completed: op.completed, completedSteps: op.completedSteps, persisted: op.completed } }); break; }
        default: this.postPanelState(panel, 'ready');
      }
    } catch (e: any) {
      this.postPanelState(panel, 'error', {
        error: { cause: String(e?.message ?? e), impact: 'This section could not be loaded.', action: FAILURE_ACTIONS.retry },
      });
    }
  }

  public setError(panel: PanelId, cause: string, impact: string, action = FAILURE_ACTIONS.retry): void {
    this.postPanelState(panel, 'error', { error: { cause, impact, action } });
  }

  public setDisabled(panel: PanelId, reason?: string): void {
    this.postPanelState(panel, 'disabled', { data: { reason } });
  }

  private async handleMessage(msg: any): Promise<void> {
    if (!msg || msg.v !== 1) return;
if (msg.kind === 'chat/cancel' || (typeof msg.type === 'string' && msg.type === 'chat/cancel')) {
      this.cancelStream(msg?.messageId);
      return;
    }
    if (msg.kind === 'ready') { await this.loadAll(); return; }
    if (msg.kind === 'chat' || msg.kind === 'chat/send' || msg.kind === 'chat/invoke') {
      const text = String(msg.text ?? msg.prompt ?? msg.payload?.prompt ?? '');
      if (!text) return;
      const { modelConfigStore } = await import('./providers/model-config-storage');
      const cfg = modelConfigStore.get();
      if (!cfg || !cfg.model) {
        this.view?.webview.postMessage({ v: 1, kind: 'toast', level: 'error', message: 'Configure a model first (VibeCode: Configure Model).' });
        return;
      }
      const ac = this.startStream('chat-' + Date.now());
      const messageId = 'm-' + Date.now();
      try {
        const { runAgentLoop } = await import('./agent/agent-loop');
        const { createOpenAIModelCaller } = await import('./agent/openai-model');
        const { createAgentTools } = await import('./agent/tools');
        const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? this.context.globalStorageUri.fsPath;
        const { indexManager } = await import('./context/index-manager');
        let idx = indexManager.get();
        if (!idx) { try { idx = indexManager.build(root); } catch {} }
        const model = createOpenAIModelCaller({ baseUrl: cfg.baseUrl, model: cfg.model, apiKey: cfg.apiKey });
        const tools = createAgentTools(root, idx ?? undefined);
        const { mcpManager } = await import('./mcp/manager');
        const mcpClient = mcpManager.getClient();
        if (mcpClient) {
          const { createMCPTools } = await import('./agent/mcp-tools');
          const mcpTools = await createMCPTools(mcpClient);
          tools.push(...mcpTools);
        }
        await runAgentLoop(text, {
          model,
          tools,
          systemPrompt: 'You are VibeCode, an AI coding assistant. You can read/write files, list directories, run commands, and search the codebase. Use tools to accomplish tasks. Be concise.',
          maxSteps: 15,
          onText: (delta) => this.postStreamChunk('chat', messageId, delta),
          onTool: (name) => this.view?.webview.postMessage({ v: 1, kind: 'toast', level: 'info', message: `Tool: ${name}` }),
        });
        this.postStreamChunk('chat', messageId, '', true);
      } catch (e) {
        this.view?.webview.postMessage({ v: 1, kind: 'toast', level: 'error', message: String((e as Error)?.message ?? e) });
        this.postStreamChunk('chat', messageId, '', true);
      } finally {
        this.finishStream(messageId.replace('m-', 'chat-'));
      }
      return;
    }
    if (msg.kind === 'onboarding/next' || msg.kind === 'onboarding/skip' || msg.kind === 'onboarding/complete' || (typeof msg.type === 'string' && msg.type.startsWith('onboarding/'))) {
      const op = this.getOnboardingPersisted();
      const completedSteps = [...op.completedSteps];
      let step = op.step;
      const total = 4;
      const skip = (msg.kind === 'onboarding/skip' || String(msg.type || '').endsWith('skip'));
      const complete = (msg.kind === 'onboarding/complete' || String(msg.type || '').endsWith('complete'));
      if (skip || complete) {
        if (!completedSteps.includes(step)) completedSteps.push(step);
        await this.persistOnboarding(step, true, completedSteps);
      } else {
        if (!completedSteps.includes(step)) completedSteps.push(step);
        step = Math.min(total + 1, step + 1);
        const completed = step > total;
        await this.persistOnboarding(step, completed, completedSteps);
      }
      await this.loadPanel('onboarding');
      await this.loadPanel('home');
      return;
    }
if (msg.kind === 'home' || msg.kind === 'onboarding' || (typeof msg.type === 'string' && (msg.type.startsWith('home/') || msg.type.startsWith('onboarding/')))) { await this.loadPanel('home'); return; }
if (msg.kind === 'plan' || msg.kind === 'plan/refresh' || (typeof msg.type === 'string' && msg.type.startsWith('plan/'))) { await this.loadPanel('plan'); return; }
    if (msg.kind === 'search' || msg.kind === 'router' || msg.kind === 'cli' || (typeof msg.type === 'string' && (msg.type.startsWith('search/') || msg.type.startsWith('router/') || msg.type.startsWith('cli/')))) {
      try { await handleWebviewMessage(msg, { postMessage: (m:any) => this.view?.webview.postMessage(m), loadPanel: (p:any) => this.loadPanel(p) }); } catch {}
      return;
    }
    if (msg.kind === 'command') {
      const id = String(msg.id);
      if (['refreshModels','refreshPerms','testProvider','replaceKey','removeKey'].includes(id)) {
        await this.handleModelsCommand(id, msg.payload);
        return;
      }
      await this.handleCommand(id, msg.payload);
      return;
    }
    if (msg.kind === 'settings' || (typeof msg.type === 'string' && msg.type.startsWith('settings/'))) { await this.loadPanel('settings'); return; }
    if (msg.kind === 'panelState' || msg.kind === 'state') { if (msg.panel) await this.loadPanel(msg.panel as PanelId); return; }
  }

  private async handleCommand(id: string, payload?: unknown): Promise<void> {
    switch (id) {
      case 'vibecode.skills.retry':
      case 'vibecode.retry':
        await this.loadPanel('skills'); break;
      case 'vibecode.models.switchProvider':
        vscode.commands.executeCommand('vibecode.models.switchProvider'); break;
      case 'vibecode.context.compact':
        vscode.commands.executeCommand('vibecode.context.compact'); break;
      case 'vibecode.logs.open':
        vscode.commands.executeCommand('vibecode.logs.open'); break;
      default:
        try { await vscode.commands.executeCommand(id, payload); }
        catch { vscode.window.showInformationMessage(`VibeCode: ${id}`); }
    }
  }
// CHUNK2_END
  public async handleModelsCommand(id: string, payload?: any): Promise<void> {
    const mp = this.deps?.modelsPanel;
    const pe = this.deps?.permissionEngine;
    try {
      switch (id) {
        case 'refreshModels':
          if (mp) { await mp.refreshModels(); this.postPanelState('models', mp.getState().status, { data: mp.getState() }); }
          break;
        case 'refreshPerms':
          if (pe) this.postPanelState('perms', 'ready', { data: { policy: pe.getPolicy(), remembered: pe.getRemembered(), audit: pe.getAuditLog().slice(-20) } });
          break;
        case 'testProvider':
          if (mp) {
            const r = await mp.testProvider(payload?.accountId);
            vscode.window.showInformationMessage(`Test ${payload?.accountId}: ${r.message}`);
            this.postPanelState('models', mp.getState().status, { data: mp.getState() });
          }
          break;
        case 'replaceKey':
          if (mp) {
            await mp.replaceKey(payload?.accountId, payload?.value);
            vscode.window.showInformationMessage('Key replaced.');
            this.postPanelState('models', mp.getState().status, { data: mp.getState() });
          }
          break;
        case 'removeKey':
          if (mp) {
            await mp.removeKey(payload?.accountId);
            vscode.window.showInformationMessage('Account removed.');
            this.postPanelState('models', mp.getState().status, { data: mp.getState() });
          }
          break;
      }
    } catch (e: any) {
      vscode.window.showErrorMessage(String(e?.message ?? e));
    }
  }

  private async postState(): Promise<void> {
    if (!this.view || !this.engine) return;
    const cards = await this.engine.cards();
    this.view.webview.postMessage({ type: 'state', cards: cards.map((c: CandidateCard) => this.project(c)) });
  }

  private project(card: CandidateCard) {
    const c = card.candidate; const m = c.manifest;
    return { id: c.id, title: card.title, trustBadge: card.trustBadge, summary: card.summary };
  }

  public getHtml(webview: vscode.Webview): string {
    const nonce = crypto.randomBytes(16).toString('hex');
    const csp = `default-src 'none'; style-src ${webview.cspSource} 'nonce-${nonce}'; img-src ${webview.cspSource} data:; script-src 'nonce-${nonce}';`;
    const chatHtml = renderChatPanel({});
    const homeHtml = renderHomePanel({});
    const onboardingPersisted = this.getOnboardingPersisted();
    const onboardingHtml = renderOnboarding({ step: onboardingPersisted.step, completed: onboardingPersisted.completed, completedSteps: onboardingPersisted.completedSteps, persisted: onboardingPersisted.completed });
    const planHtml = renderPlanViewer({});
    const progressHtml = renderProgressViewer({});
    const supervisorHtml = renderSupervisorPanel({});
    const agentHtml = renderChatPanel({});
    const tasksHtml = renderTasksPanel({});

    const routerHtml = renderRouterPanel({});
    const searchHtml = renderSearchPanel({ providers: [], status: null, cacheStats: { entries: 0, maxSize: 0 } } as any);
    const cliHtml = renderCliPanel({ binaries: [] } as any);
const modelsHtml = renderModelsAccounts({});
const permsHtml = renderPermissionsPanel({});
const diagHtml = renderDiagnosticsPanel({});

const settingsHtml = renderSettingsPanel({});
const contextHtml = renderContextViewer({});
    return `<!DOCTYPE html>
<html lang="en">
<head>
<title>VibeCode Engine</title>
<meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy" content="${csp}" />
<style nonce="${nonce}">
  ${cssVariables()}
  ${animationCss()}
  body { font-family: var(--vscode-font-family, 'Segoe UI', system-ui, sans-serif); color: var(--vscode-foreground); background: var(--vscode-sideBar-background); margin: 0; padding: var(--vc-space-md); line-height: 1.5; }
  :focus-visible { outline: 2px solid var(--vscode-focusBorder, var(--vc-primary)); outline-offset: 2px; border-radius: var(--vc-radius-sm); }
  a:focus-visible, button:focus-visible, [tabindex]:focus-visible, input:focus-visible, textarea:focus-visible, select:focus-visible { outline: 2px solid var(--vscode-focusBorder, var(--vc-primary)); outline-offset: 2px; }
  .skip-link { position: absolute; left: -9999px; top: 8px; z-index: 1000; padding: 8px 12px; background: var(--vscode-button-background, var(--vc-primary)); color: var(--vscode-button-foreground, #fff); border-radius: var(--vc-radius-sm); text-decoration: none; transition: left 150ms ease; }
  .skip-link:focus { left: 8px; }
  .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
  main#main-content { display: block; }
  .panel { min-height: 240px; transition: opacity 200ms ease; }
  .vc-card { background: var(--vc-surface); border: 1px solid var(--vc-border); border-radius: var(--vc-radius-md); padding: var(--vc-space-md); box-shadow: var(--vc-shadow-sm); transition: box-shadow 150ms ease, transform 150ms ease; }
  .vc-card:hover { box-shadow: var(--vc-shadow-md); }
  h1, h2, h3 { font-weight: 600; letter-spacing: -0.01em; }
  h2 { font-size: var(--vc-font-heading); }
  h3 { font-size: var(--vc-font-body); }
  p, span, label, td, th { color: var(--vc-text); }
  .status { color: var(--vc-text-muted); font-size: var(--vc-font-body); }
  button, .vc-btn { transition: background 150ms ease, color 150ms ease, transform 100ms ease, box-shadow 150ms ease; }
  button:active, .vc-btn:active { transform: scale(0.98); }
  input, select, textarea { transition: border-color 150ms ease, box-shadow 150ms ease; }
  input:focus, select:focus, textarea:focus { border-color: var(--vc-primary); box-shadow: 0 0 0 2px rgba(79,70,229,.25); }
  .vc-chat-timeline { scroll-behavior: smooth; }
  .vc-chat-bubble { transition: opacity 200ms ease, transform 200ms ease; }
  .vc-fade-in { animation: vc-fade-in 200ms ease-out; }
  @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }
  @media (max-width: 480px) { body { padding: var(--vc-space-sm); } .vc-chat-bubble { max-width: 95%; } }
  :focus-visible { outline: 2px solid var(--vscode-focusBorder, #007acc); outline-offset: 2px; }
  a:focus-visible, button:focus-visible, [tabindex]:focus-visible, input:focus-visible, textarea:focus-visible, select:focus-visible { outline: 2px solid var(--vscode-focusBorder, #007acc); outline-offset: 2px; }
  .skip-link { position: absolute; left: -9999px; top: 8px; z-index: 1000; padding: 8px 12px; background: var(--vscode-button-background, #0e639c); color: var(--vscode-button-foreground, #ffffff); border-radius: 4px; text-decoration: none; }
  .skip-link:focus { left: 8px; }
  .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
  main#main-content { display: block; }
  .vc-chat-panel { display: flex; flex-direction: column; gap: var(--vc-space-md); }
  .vc-chat-timeline { display: flex; flex-direction: column; gap: var(--vc-space-sm); max-height: 60vh; overflow-y: auto; padding: var(--vc-space-sm); }
  .vc-chat-bubble { padding: var(--vc-space-sm) var(--vc-space-md); border-radius: var(--vc-radius-md); max-width: 85%; word-wrap: break-word; }
  .vc-chat-bubble--user { background: var(--vc-primary); color: #fff; align-self: flex-end; }
  .vc-chat-bubble--assistant { background: var(--vc-surface); border: 1px solid var(--vc-border); align-self: flex-start; }
  .vc-chat-bubble__content { white-space: pre-wrap; }
  .vc-chat-composer { display: flex; flex-direction: column; gap: var(--vc-space-sm); margin-top: var(--vc-space-md); }
  .vc-chat-composer textarea, .vc-chat-composer input { width: 100%; padding: var(--vc-space-sm); border-radius: var(--vc-radius-sm); border: 1px solid var(--vc-border); background: var(--vc-surface); color: var(--vc-text); font-family: inherit; }
  .vc-chat-composer__actions { display: flex; gap: var(--vc-space-sm); }
  .vc-btn { padding: var(--vc-space-sm) var(--vc-space-md); border-radius: var(--vc-radius-sm); border: 1px solid var(--vc-border); background: var(--vc-surface-alt); color: var(--vc-text); cursor: pointer; }
  .vc-btn:hover { background: var(--vc-primary); color: #fff; }
  .vc-btn-primary { background: var(--vc-primary); color: #fff; }
  .vc-supervisor-panel, .vc-model-config { display: flex; flex-direction: column; gap: var(--vc-space-md); }
  .vc-supervisor-panel table { width: 100%; border-collapse: collapse; }
  .vc-supervisor-panel th, .vc-supervisor-panel td { padding: var(--vc-space-sm); border: 1px solid var(--vc-border); text-align: left; }
  .vc-supervisor-panel th { background: var(--vc-surface-alt); }
  .vc-diff-review { font-family: monospace; font-size: 12px; }
  .diff-add { color: var(--vc-success); }
  .diff-del { color: var(--vc-danger); }
  .vc-ghost { opacity: 0.5; font-style: italic; }
  h2 { font-size: var(--vc-font-heading); margin: 0; color: var(--vc-text); }
  p, span { color: var(--vc-text); }
  .status { color: var(--vc-text-muted); font-size: var(--vc-font-body); }
  input, select, textarea { background: var(--vc-surface); color: var(--vc-text); border: 1px solid var(--vc-border); border-radius: var(--vc-radius-sm); padding: var(--vc-space-sm); }
  label { display: flex; flex-direction: column; gap: var(--vc-space-xs); color: var(--vc-text-muted); font-size: var(--vc-font-body); }
  @media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }
  @media (forced-colors: active) { * { forced-color-adjust: auto; } }
</style>
</head>
<body>
  <a class="skip-link" href="#main-content">Skip to main content</a>
  <div id="vc-announcer" class="sr-only" role="status" aria-live="polite" aria-atomic="true"></div>
  <div id="vc-announcer-assertive" class="sr-only" role="alert" aria-live="assertive" aria-atomic="true"></div>
  <div id="app">
    <nav class="vc-tabs" role="tablist" aria-label="Panels" style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px;">
    <button type="button" class="vc-tab vc-btn" data-panel="home" role="tab" aria-selected="true">Home</button>
    <button type="button" class="vc-tab vc-btn" data-panel="chat" role="tab">Chat</button>
    <button type="button" class="vc-tab vc-btn" data-panel="agent" role="tab">Agent</button>
    <button type="button" class="vc-tab vc-btn" data-panel="models" role="tab">Models</button>
    <button type="button" class="vc-tab vc-btn" data-panel="skills" role="tab">Skills</button>
    <button type="button" class="vc-tab vc-btn" data-panel="search" role="tab">Search</button>
    <button type="button" class="vc-tab vc-btn" data-panel="diagnostics" role="tab">Diagnostics</button>
    <button type="button" class="vc-tab vc-btn" data-panel="settings" role="tab">Settings</button>
    <button type="button" class="vc-tab vc-btn" data-panel="supervisor" role="tab">Supervisor</button>
    <button type="button" class="vc-tab vc-btn" data-panel="context" role="tab">Context</button>
    <button type="button" class="vc-tab vc-btn" data-panel="plan" role="tab">Plan</button>
    <button type="button" class="vc-tab vc-btn" data-panel="progress" role="tab">Progress</button>
  </nav>
  <main id="main-content" tabindex="-1">
    <div class="panel" id="panel-skills"></div>
    <div class="panel" id="panel-home">${homeHtml}</div>
    <div class="panel" id="panel-onboarding">${onboardingHtml}</div>
    <div class="panel" id="panel-chat">${chatHtml}</div>
    <div class="panel" id="panel-plan">${planHtml}</div>
    <div class="panel" id="panel-tasks">${tasksHtml}</div>

    <div class="panel" id="panel-progress">${progressHtml}</div>
    <div class="panel" id="panel-routers">${routerHtml}</div>
    <div class="panel" id="panel-search">${searchHtml}</div>
    <div class="panel" id="panel-cli">${cliHtml}</div>
    <div class="panel" id="panel-models">${modelsHtml}</div>
    <div class="panel" id="panel-perms">${permsHtml}</div>
    <div class="panel" id="panel-diagnostics">${diagHtml}</div>

    <div class="panel" id="panel-settings">${settingsHtml}</div>
    <div class="panel" id="panel-context">${contextHtml}</div>
    <div class="panel" id="panel-supervisor">${supervisorHtml}</div>
    <div class="panel" id="panel-agent">${agentHtml}</div>
  </main>
  </div>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const renderers = {
      home: ${JSON.stringify(homeHtml)},
      onboarding: ${JSON.stringify(onboardingHtml)},
      chat: ${JSON.stringify(chatHtml)},
      plan: ${JSON.stringify(planHtml)},
      progress: ${JSON.stringify(progressHtml)},
      tasks: ${JSON.stringify(tasksHtml)},

      routers: ${JSON.stringify(routerHtml)},
      search: ${JSON.stringify(searchHtml)},
      cli: ${JSON.stringify(cliHtml)},
       models: ${JSON.stringify(modelsHtml)},
        perms: ${JSON.stringify(permsHtml)},
        diagnostics: ${JSON.stringify(diagHtml)},
       settings: ${JSON.stringify(settingsHtml)},
       context: ${JSON.stringify(contextHtml)},
       supervisor: ${JSON.stringify(supervisorHtml)},
      agent: ${JSON.stringify(agentHtml)},
    };
      const m = e.data; if (!m || m.v !== 1) return;
      if (m.kind === 'toast') {
        const tl = document.querySelector('.vc-chat-timeline');
        if (tl) {
          const art = document.createElement('article');
          art.className = 'vc-chat-message vc-chat-bubble vc-chat-bubble--system is-system';
          art.innerHTML = '<div class="vc-chat-bubble__content">' + String(m.message || '').replace(/&/g,'&amp;').replace(/</g,'&lt;') + '</div>';
          tl.appendChild(art);
        }
        return;
      }
      if (m.kind === 'streamChunk') {
        const panel = document.getElementById('panel-' + (m.panel || 'chat'));
        if (panel) {
          let content = null;
          if (m.messageId) {
            content = panel.querySelector('[data-message-id="' + String(m.messageId).replace(/"/g, '') + '"] .vc-chat-bubble__content');
          }
          if (!content) {
            const all = panel.querySelectorAll('.vc-chat-bubble__content');
            content = all.length ? all[all.length - 1] : null;
          }
          if (content) { content.textContent = (content.textContent || '') + String(m.delta || ''); }
          if (m.done) {
            const ind = panel.querySelector('.vc-chat-streaming-indicator');
            if (ind && ind.parentNode) ind.parentNode.removeChild(ind);
          }
        }
        return;
      }
      }
      if (m.kind === 'panelState' || m.kind === 'state') {
        const p = document.getElementById('panel-' + (m.panel || ''));
        if (p) { p.classList.remove('loading','empty','error','ready'); p.classList.add(m.state || m.status || 'ready'); p.setAttribute('tabindex','-1'); p.setAttribute('aria-busy', (m.state || m.status) === 'loading' ? 'true' : 'false'); }
        const announcer = document.getElementById('vc-announcer');
        if (announcer && m.panel) { announcer.textContent = m.panel + ' panel ' + (m.state || m.status || 'ready'); }
        if (m.panel && renderers[m.panel]) {
          const target = document.getElementById('panel-' + m.panel);
          if (target) { target.innerHTML = renderers[m.panel]; target.setAttribute('tabindex','-1'); try { target.focus(); } catch (err) {} }
        } else if (m.panel) {
          const target = document.getElementById('panel-' + m.panel);
          if (target) { target.setAttribute('tabindex','-1'); try { target.focus(); } catch (err) {} }
        }
      }
    });
    // Keyboard handlers: Enter/Space activate role=button/tab; Escape blurs.
    document.addEventListener('keydown', (e) => {
      const t = e.target;
      if (e.key === 'Escape') { if (t && typeof t.blur === 'function') t.blur(); return; }
      if ((e.key === 'Enter' || e.key === ' ') && t && t.getAttribute && (t.getAttribute('role') === 'button' || t.getAttribute('role') === 'tab')) {
        e.preventDefault();
        if (typeof t.click === 'function') t.click();
      }
    });
    // Delegate select changes with data-action to the host.
    document.addEventListener('change', (e) => {
      const t = e.target;
      if (!t || !t.getAttribute || !t.getAttribute('data-action')) return;
      const action = t.getAttribute('data-action');
      vscode.postMessage({ v: 1, kind: 'command', id: action, payload: { value: t.value } });
    });
    // Delegate button clicks with data-action to the host.
    document.addEventListener('click', (e) => {
      const t = e.target && (e.target.closest ? e.target.closest('[data-action]') : null);
      if (!t) return;
      const action = t.getAttribute('data-action');
      if (!action) return;
      e.preventDefault();
      vscode.postMessage({ v: 1, kind: 'command', id: action });
    });
    // Tab switching.
    document.addEventListener('click', (e) => {
      const t = e.target && (e.target.closest ? e.target.closest('.vc-tab[data-panel]') : null);
      if (!t) return;
      const panel = t.getAttribute('data-panel');
      if (!panel) return;
      e.preventDefault();
      document.querySelectorAll('.vc-tab').forEach((b) => b.setAttribute('aria-selected', b === t ? 'true' : 'false'));
      vscode.postMessage({ v: 1, kind: 'state', panel });
    });
    // Toast handling: show in chat timeline.
    // (handled in message listener below)
    vscode.postMessage({ v: 1, kind: 'ready' });
    // Wire chat input form to host.
    const chatForm = document.querySelector('form.vc-chat-composer');
    if (chatForm) {
      chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = chatForm.querySelector('textarea, input[type="text"]');
        const text = input ? String(input.value).trim() : '';
        if (!text) return;
        if (input) input.value = '';
        const timeline = document.querySelector('.vc-chat-timeline');
        if (timeline) {
          const art = document.createElement('article');
          art.className = 'vc-chat-message vc-chat-bubble vc-chat-bubble--assistant is-assistant';
          art.innerHTML = '<div class="vc-chat-bubble__content"></div><span class="vc-chat-streaming-indicator" aria-live="polite">…</span>';
          timeline.appendChild(art);
        }
        vscode.postMessage({ v: 1, kind: 'chat', text });
      });
    }
  </script>
</body>
</html>`;
  }
}

export { VibeCodeWebviewProvider as SkillsWebviewProvider };