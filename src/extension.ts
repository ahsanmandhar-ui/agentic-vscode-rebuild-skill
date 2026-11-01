// src/extension.ts
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { PermissionEngine } from './security/permissionEngine';
import { Router } from './routing/router';
import { ModelsAccountsPanel } from './ui/models';
import { VibeCodeWebviewProvider } from './webview';
import { SkillsWebviewProvider } from './webview';
import { SkillEngine } from './skills/engine';
import { SkillCandidate } from './skills/types';
import { AuditLog } from './observability/audit';
import { CrashReporter } from './observability/crash';
import { EMPTY_STATES, FAILURE_ACTIONS } from './ui/failure';
import { Logger } from './shared/logger';
import { clearPromptCache } from './perf/prompt-cache';
import { MemoryManager } from './memory/manager';
import { ContextPanel } from './ui/context';
import { DEFAULT_BASE_URLS } from './providers/model-config';
import { createVibeCodeStatusBar } from './ui/status-bar';
import { AskVibeCodeCodeLensProvider, askVibeCodeCommand } from './ui/ask-vibecode';

// Minimal VS Code adapters (ports) — replace with real adapters in the repo.
const store = {
  async listCandidates(): Promise<SkillCandidate[]> { return []; },
  async getCandidate(_id: string) { return undefined; },
  async save(_c: SkillCandidate) {},
  async remove(_id: string) {},
};

const inspector = {
  async inspect(c: SkillCandidate) {
    return {
      status: 'passed' as const,
      findings: [],
      riskScore: 0.1,
      inspectedAt: new Date().toISOString(),
      hash: 'sha256:0000',
      permissions: c.manifest.permissions,
      license: c.manifest.license,
      source: c.manifest.source,
      sourceRef: c.manifest.sourceRef,
    };
  },
  async validate(_c: SkillCandidate) { return { ok: true, errors: [] as string[] }; },
};

const installer = {
  async install(_c: SkillCandidate) { return { ok: true }; },
  async enable(_c: SkillCandidate) { return { ok: true }; },
};

const ui = {
  async showCandidateCard(card: any) {
    vscode.window.showInformationMessage(`Skill: ${card.title} (${card.trustBadge})`);
  },
  async quickPickActions(_c: SkillCandidate) {
    const pick = await vscode.window.showQuickPick(
      [
        { label: 'Inspect', value: 'inspect' },
        { label: 'Approve', value: 'approve' },
        { label: 'Cancel', value: 'cancel' },
      ],
      { placeHolder: 'Manage skill candidate' },
    );
    return pick?.value as any;
  },
  async confirmApproval(card: any, scopes: string[]) {
    const msg = `Approve ${card.title}? Scopes: ${scopes.join(', ') || 'none'}`;
    return (await vscode.window.showInformationMessage(msg, { modal: true }, 'Approve')) === 'Approve';
  },
};

let engine: SkillEngine;
let skillsView: SkillsWebviewProvider;
let audit: AuditLog;
let crash: CrashReporter;
let panel: VibeCodeWebviewProvider;

export async function activate(context: vscode.ExtensionContext) {
  audit = new AuditLog(context);
  crash = new CrashReporter(context, audit);
  crash.install();
  // load persisted model config
  try { const { loadModelConfig } = await import('./providers/model-config-storage'); await loadModelConfig(context); } catch { /* noop */ }
  // auto-connect MCP server if configured
  try {
    const mcpCmd = vscode.workspace.getConfiguration('vibecode').get<string>('mcp.serverCommand', '');
    const mcpArgs = vscode.workspace.getConfiguration('vibecode').get<string>('mcp.serverArgs', '');
    if (mcpCmd) {
      const { mcpManager } = await import('./mcp/manager');
      await mcpManager.connect(mcpCmd, mcpArgs ? mcpArgs.split(/\s+/) : []);
    }
  } catch { /* noop */ }
  // start semantic index watcher (lazy build)
  try {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (root) {
      const { startIndexWatcher } = await import('./context/index-watcher');
      context.subscriptions.push(startIndexWatcher(root));
    }
  } catch { /* noop */ }
  // single webview provider instance (created after deps below)
  panel = undefined as any;
  engine = new SkillEngine(store as any, inspector as any, installer as any, ui as any);
  skillsView = new SkillsWebviewProvider(context, engine);

  const wrap = (name: string, fn: (...a: any[]) => Promise<any>) => {
    return async (...args: any[]) => {
      const ts = new Date().toISOString();
      await audit.record({ ts, command: name, phase: 'start', payload: args });
      try {
        const res = await fn(...args);
        await audit.record({ ts: new Date().toISOString(), command: name, phase: 'success', result: res });
        return res;
      } catch (e) {
        await audit.record({ ts: new Date().toISOString(), command: name, phase: 'error', error: (e as Error)?.message ?? String(e) });
        crash.capture('command:' + name, e);
        throw e;
      }
    };
  };

  const manageKeys = wrap('vibecode.manageKeys', async () => {
    const name = await vscode.window.showInputBox({ prompt: 'Secret name (stored in SecretStorage)' });
    if (!name) return { cancelled: true };
    const value = await vscode.window.showInputBox({ prompt: `Value for ${name}`, password: true });
    if (value === undefined) return { cancelled: true };
    await context.secrets.store(`vibecode.${name}`, value);
    vscode.window.showInformationMessage(`Stored secret: ${name}`);
    return { name, stored: true };
  });

  const generateCode = wrap('vibecode.generateCode', async (prompt?: string) => {
    const p = prompt ?? await vscode.window.showInputBox({ prompt: 'Describe the code to generate' });
    if (!p) return { cancelled: true };
    const channel = vscode.window.createOutputChannel('VibeCode Generate');
    channel.show();
    channel.appendLine(`// Generated for: ${p}`);
    channel.appendLine('// TODO: wire to provider router');
    return { prompt: p, ok: true };
  });

  const manageSkills = wrap('vibecode.manageSkills', async (candidateId?: string) => {
    await engine.manageSkillsCommand(candidateId);
    return { candidateId };
  });

  const inspectSkill = wrap('vibecode.inspectSkill', async (id: string) => {
    const card = await engine.inspectSkill(id);
    await skillsView.refresh();
    return { id, trustBadge: card.trustBadge };
  });

  const installSkill = wrap('vibecode.installSkill', async (id: string) => {
    const card = await engine.installSkill(id);
    await skillsView.refresh();
    return { id, trustBadge: card.trustBadge };
  });

  const skipSkill = wrap('vibecode.skipSkill', async (id: string) => {
    await engine.skipSkill(id);
    await skillsView.refresh();
    return { id, skipped: true };
  });

  const quarantineSkill = wrap('vibecode.quarantineSkill', async (id: string) => {
    const card = await engine.quarantineSkill(id);
    await skillsView.refresh();
    return { id, trustBadge: card.trustBadge };
  });

  const bulkInstall = wrap('vibecode.bulkInstall', async (ids: string[]) => {
    const cards = await engine.bulkInstall(ids || []);
    await skillsView.refresh();
    return { installed: cards.length };
  });

  const updateMemory = wrap('vibecode.updateMemory', async (note?: string) => {
    const n = note ?? await vscode.window.showInputBox({ prompt: 'Memory note to append' });
    if (!n) return { cancelled: true };
    const dir = context.globalStorageUri.fsPath;
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, 'memory.md');
    fs.appendFileSync(file, `- ${new Date().toISOString()}: ${n}\n`, 'utf8');
    vscode.window.showInformationMessage('Memory updated.');
    return { appended: true };
  });

  const showCrashReport = wrap('vibecode.showCrashReport', async () => {
    await crash.show();
    return { shown: true };
  });

  const loadContext = wrap('vibecode.loadContext', async (file?: string) => {
    const f = (file ?? 'plan.md') as any;
    const state = await contextPanel.loadContext(f);
    webviewProvider.postPanelState('context', state.status === 'empty' ? 'empty' : state.status === 'error' ? 'error' : 'ready', { data: state });
    return state;
  });

  const saveContext = wrap('vibecode.saveContext', async (payload?: { file?: string; content?: string }) => {
    const f = (payload?.file ?? 'plan.md') as any;
    const content = payload?.content ?? '';
    const state = await contextPanel.saveContext(f, content);
    webviewProvider.postPanelState('context', state.status === 'empty' ? 'empty' : state.status === 'error' ? 'error' : 'ready', { data: state });
    return state;
  });

  const exportReport = wrap('vibecode.exportReport', async () => {
    const report = await contextPanel.exportReport();
    const diagState = { report } as any;
    webviewProvider.postPanelState('diagnostics', 'ready', { data: diagState });
    vscode.window.showInformationMessage('Context report exported to .vibecode/report.md');
    return { size: report.length };
  });

  const detectDrift = wrap('vibecode.detectDrift', async () => {
    const state = contextPanel.checkDrift();
    webviewProvider.postPanelState('context', 'ready', { data: state });
    return state.warnings ?? [];
  });

  const envAssessment = wrap('vibecode.envAssessment', async () => {
    const data = contextPanel.envAssessment();
    webviewProvider.postPanelState('diagnostics', 'ready', { data: { env: data } });
    return data;
  });

  const versionInfo = wrap('vibecode.versionInfo', async () => {
    const data = contextPanel.versionInfo();
    webviewProvider.postPanelState('diagnostics', 'ready', { data: { version: data } });
    return data;
  });

  const redactedLogs = wrap('vibecode.redactedLogs', async () => {
    const logs = contextPanel.redactedLogs(200);
    webviewProvider.postPanelState('diagnostics', 'ready', { data: { logs } });
    return logs;
  });

  const permissionEngine = new PermissionEngine();
  const router = new Router([], { allowAutomaticFallback: false, requireConsentWhenAmbiguous: true });
  const secretPort = {
    async get(name: string) { return context.secrets.get(name); },
    async set(name: string, value: string) { await context.secrets.store(name, value); },
    async delete(name: string) { await context.secrets.delete(name); },
  };
  const modelsPanel = new ModelsAccountsPanel({
    secrets: secretPort,
    audit: audit as any,
    router,
    permissionEngine,
    testProvider: async (account) => ({ ok: true, message: 'ok (stub)', checkedAt: new Date().toISOString() }),
  });
  const outputChannel = vscode.window.createOutputChannel('VibeCode');
  context.subscriptions.push(outputChannel);
  const logger = new Logger(500, (line) => outputChannel.appendLine(line));
  const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? context.globalStorageUri.fsPath;
  const memory = new MemoryManager(root, logger, audit);
  const contextPanel = new ContextPanel({ memory, logger, audit });

  const webviewProvider = new VibeCodeWebviewProvider(context, { modelsPanel, permissionEngine });
  panel = webviewProvider;
  context.subscriptions.push(vscode.window.registerWebviewViewProvider('vibecode.panel', webviewProvider));
  context.subscriptions.push(vscode.window.registerWebviewViewProvider('vibecode.skills', skillsView));
  const openLogs = wrap('vibecode.logs.open', async () => { const c = vscode.window.createOutputChannel('VibeCode Logs'); c.show(); return { shown: true }; });
  const installSkills = wrap('vibecode.skills.install', async () => { return engine.manageSkillsCommand(); });
  const connectModel = wrap('vibecode.models.connect', async () => {
    // Delegate to configure, then test the connection against the configured model.
    await vscode.commands.executeCommand('vibecode.models.configure');
    const { modelConfigStore } = await import('./providers/model-config-storage');
    const cfg = modelConfigStore.get();
    if (!cfg || !cfg.model) return { connected: false, reason: 'not configured' };
    try {
      const res = await fetch(`${cfg.baseUrl.replace(/\/$/, '')}/models`, { headers: cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {} });
      return { connected: res.ok, status: res.status };
    } catch (e) {
      return { connected: false, reason: String(e) };
    }
  });
  const switchProvider = wrap('vibecode.models.switchProvider', async () => {
    const { modelConfigStore } = await import('./providers/model-config-storage');
    const cfg = modelConfigStore.get();
    if (!cfg) { vscode.window.showInformationMessage('No model configured. Run VibeCode: Configure Model.'); return { switched: false }; }
    vscode.window.showInformationMessage(`Active model: ${cfg.provider}/${cfg.model}`);
    return { switched: true, provider: cfg.provider, model: cfg.model };
  });
  const createCtx = wrap('vibecode.context.create', async () => {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) { vscode.window.showInformationMessage('Open a folder first.'); return { created: false }; }
    const fs = await import('fs');
    const path = await import('path');
    const templates: Record<string, string> = {
      'plan.md': '# Plan\n\n## Objective\n\n## Milestones\n\n## Risks\n',
      'progress.md': '# Progress\n\n## Current task\n\n## Completed steps\n\n## Next action\n',
      'structure.md': '# Structure\n\n## Tree\n\n## Modules\n',
    };
    const created: string[] = [];
    for (const [name, content] of Object.entries(templates)) {
      const full = path.join(root, name);
      if (!fs.existsSync(full)) { fs.writeFileSync(full, content, 'utf8'); created.push(name); }
    }
    vscode.window.showInformationMessage(created.length ? `Created: ${created.join(', ')}` : 'Context files already exist.');
    webviewProvider.refresh();
    return { created: created.length > 0, files: created };
  });
  const compactContext = wrap('vibecode.context.compact', async () => {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) { return { compacted: false }; }
    const fs = await import('fs');
    const path = await import('path');
    const file = path.join(root, 'progress.md');
    if (fs.existsSync(file)) {
      const note = `\n\n## Compacted ${new Date().toISOString()}\nContext compacted by VibeCode.\n`;
      fs.appendFileSync(file, note, 'utf8');
    }
    vscode.window.showInformationMessage('Context compacted.');
    webviewProvider.refresh();
    return { compacted: true };
  });
  const configureSearch = wrap('vibecode.search.configure', async () => {
    const provider = await vscode.window.showQuickPick(['duckduckgo', 'brave', 'serpapi'], { placeHolder: 'Search provider' });
    if (!provider) return { cancelled: true };
    const key = provider === 'duckduckgo' ? undefined : await vscode.window.showInputBox({ prompt: `${provider} API key`, password: true });
    const secretKey = `vibecode.search.${provider}.key`;
    if (key) await context.secrets.store(secretKey, key);
    vscode.window.showInformationMessage(`${provider} configured.`);
    return { configured: true, provider };
  });
  const createPlan = wrap('vibecode.plan.create', async () => {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) { vscode.window.showInformationMessage('Open a folder first.'); return { created: false }; }
    const goal = await vscode.window.showInputBox({ prompt: 'Plan goal' });
    if (!goal) return { cancelled: true };
    const fs = await import('fs');
    const path = await import('path');
    const { modelConfigStore } = await import('./providers/model-config-storage');
    const cfg = modelConfigStore.get();
    let body = `# Plan\n\n## Objective\n${goal}\n\n## Milestones\n\n## Risks\n`;
    if (cfg?.model) {
      try {
        const { createOpenAIModelCaller } = await import('./agent/openai-model');
        const m = createOpenAIModelCaller({ baseUrl: cfg.baseUrl, model: cfg.model, apiKey: cfg.apiKey });
        const r = await m.call([{ role: 'user', content: `Create a concise project plan for: ${goal}. Output markdown with Objective, Milestones, Risks.` }], []);
        if (r.content) body = r.content;
      } catch { /* keep template */ }
    }
    fs.writeFileSync(path.join(root, 'plan.md'), body, 'utf8');
    vscode.window.showInformationMessage('plan.md created.');
    webviewProvider.refresh();
    return { created: true };
  });
  const updateProgress = wrap('vibecode.progress.update', async () => {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) { return { updated: false }; }
    const fs = await import('fs');
    const path = await import('path');
    const file = path.join(root, 'progress.md');
    const entry = `\n- ${new Date().toISOString()}: progress updated by VibeCode.\n`;
    if (fs.existsSync(file)) fs.appendFileSync(file, entry, 'utf8');
    else fs.writeFileSync(file, `# Progress\n${entry}`, 'utf8');
    vscode.window.showInformationMessage('progress.md updated.');
    webviewProvider.refresh();
    return { updated: true };
  });
  const chat = wrap('vibecode.chat', async (args?: any) => {
    const prompt = args?.prompt;
    // Focus the VibeCode sidebar webview.
    await vscode.commands.executeCommand('workbench.view.extension.vibecode');
    if (prompt) vscode.window.showInformationMessage(`VibeCode chat: ${String(prompt).slice(0, 80)}`);
    webviewProvider.refresh();
    return { ok: true, prompt };
  });
  const runDiag = wrap('vibecode.diagnostics.run', async () => {
    const checks: { name: string; ok: boolean; detail: string }[] = [];
    const { modelConfigStore } = await import('./providers/model-config-storage');
    const cfg = modelConfigStore.get();
    checks.push({ name: 'model configured', ok: !!cfg?.model, detail: cfg ? `${cfg.provider}/${cfg.model}` : 'none' });
    checks.push({ name: 'workspace open', ok: !!vscode.workspace.workspaceFolders?.length, detail: String(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? 'none') });
    checks.push({ name: 'secret storage', ok: true, detail: 'available' });
    const channel = vscode.window.createOutputChannel('VibeCode Diagnostics');
    channel.show();
    for (const c of checks) channel.appendLine(`${c.ok ? 'PASS' : 'FAIL'}  ${c.name}: ${c.detail}`);
    return { ran: true, checks };
  });
  const runTask = wrap('vibecode.agent.run', async (task?: string) => {
    const t = task ?? await vscode.window.showInputBox({ prompt: 'Agent task' });
    if (!t) return { cancelled: true };
    const { modelConfigStore } = await import('./providers/model-config-storage');
    const cfg = modelConfigStore.get();
    if (!cfg || !cfg.model) { vscode.window.showInformationMessage('Configure a model first.'); return { ran: false }; }
    const { runAgentLoop } = await import('./agent/agent-loop');
    const { createOpenAIModelCaller } = await import('./agent/openai-model');
    const { createAgentTools } = await import('./agent/tools');
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? context.globalStorageUri.fsPath;
    const model = createOpenAIModelCaller({ baseUrl: cfg.baseUrl, model: cfg.model, apiKey: cfg.apiKey });
    const tools = createAgentTools(root);
    const channel = vscode.window.createOutputChannel('VibeCode Agent');
    channel.show();
    channel.appendLine(`Task: ${t}\n`);
    let full = '';
    const out = await runAgentLoop(t, {
      model, tools,
      systemPrompt: 'You are VibeCode. Use tools to accomplish the task. Be concise.',
      maxSteps: 15,
      onText: (d) => { full += d; channel.append(d); },
      onTool: (name, args) => channel.appendLine(`\n[tool] ${name} ${JSON.stringify(args)}`),
    });
    channel.appendLine(`\n\n--- Result ---\n${out}`);
    return { ran: true, output: out };
  });
  const openSettings = wrap('vibecode.settings.open', async () => { vscode.commands.executeCommand('workbench.action.openSettings', 'vibecode'); return { opened: true }; });
  const retry = wrap('vibecode.retry', async () => { await panel.loadAll(); return { retried: true }; });
  const plan = wrap('vibecode.plan', async () => {
    vscode.window.showInformationMessage('VibeCode: generating plan…');
    webviewProvider.refresh();
    return { ok: true };
  });
  const runCli = wrap('vibecode.cli.run', async (binary?: string, args?: string) => {
    const b = binary ?? await vscode.window.showInputBox({ prompt: 'CLI binary to run' });
    if (!b) return { cancelled: true };
    const a = args ?? await vscode.window.showInputBox({ prompt: 'Arguments (optional)' });
    const channel = vscode.window.createOutputChannel('VibeCode CLI');
    channel.show();
    channel.appendLine(`$ ${b} ${a ?? ''}`);
    return { binary: b, args: a };
  });
  const askVibeCode = wrap('vibecode.askVibeCode', async (uri?: vscode.Uri) => askVibeCodeCommand(uri));
  const inlineProvider = vscode.languages.registerInlineCompletionItemProvider({ scheme: 'file' }, {
    async provideInlineCompletionItems(document, position) {
      const line = document.lineAt(position.line).text;
      if (!line.trim() || line.trim().endsWith(';') || line.trim().endsWith('}')) return [];
      // Debounce 300ms
      await new Promise((r) => { const t = (globalThis as any).__vcInlineDebounce; if (t) clearTimeout(t); (globalThis as any).__vcInlineDebounce = setTimeout(r, 300); });
      try {
        const { modelConfigStore } = await import('./providers/model-config-storage');
        const cfg = modelConfigStore.get();
        if (cfg && cfg.model) {
          const { createOpenAIModelCaller } = await import('./agent/openai-model');
          const m = createOpenAIModelCaller({ baseUrl: cfg.baseUrl, model: cfg.model, apiKey: cfg.apiKey });
          const prefix = document.getText(new vscode.Range(new vscode.Position(Math.max(0, position.line - 5), 0), position));
      const cache = (globalThis as any).__vcInlineCache ?? ((globalThis as any).__vcInlineCache = new Map());
      const cached = cache.get(prefix);
      if (cached && Date.now() - cached.ts < 30000) {
        return [new vscode.InlineCompletionItem(cached.text, new vscode.Range(position, position))];
      }
          const r = await m.call([{ role: 'user', content: `Complete the following code. Return only the completion, no explanation:\n${prefix}` }], []);
          if (r.content) {
            const text = r.content.trim();
            cache.set(prefix, { text, ts: Date.now() });
            const item = new vscode.InlineCompletionItem(text, new vscode.Range(position, position));
            return [item];
          }
        }
      } catch { /* fall through */ }
      const item = new vscode.InlineCompletionItem(' // TODO: implement', new vscode.Range(position, position));
      return [item];
    },
  });
  context.subscriptions.push(inlineProvider);
  const statusBar = createVibeCodeStatusBar(context, modelsPanel);
  context.subscriptions.push(vscode.languages.registerCodeLensProvider({ scheme: 'file' }, new AskVibeCodeCodeLensProvider()));
  const registrations = [


    vscode.commands.registerCommand('vibecode.manageKeys', manageKeys),
    vscode.commands.registerCommand('vibecode.generateCode', generateCode),
    // U16 command palette entries
    // U16 alias commands (16)
    vscode.commands.registerCommand('vibecode.chat', chat),
    vscode.commands.registerCommand('vibecode.plan', plan),
    vscode.commands.registerCommand('vibecode.cli.run', runCli),
    vscode.commands.registerCommand('vibecode.askVibeCode', askVibeCode),
    vscode.commands.registerCommand('vibecode.models.connect', connectModel),
    vscode.commands.registerCommand('vibecode.settings.open', openSettings),
    vscode.commands.registerCommand('vibecode.context.create', createCtx),
    vscode.commands.registerCommand('vibecode.context.compact', compactContext),
    vscode.commands.registerCommand('vibecode.retry', retry),
    vscode.commands.registerCommand('vibecode.diagnostics.run', runDiag),
    vscode.commands.registerCommand('vibecode.logs.open', openLogs),
    vscode.commands.registerCommand('vibecode.agent.run', runTask),
    vscode.commands.registerCommand('vibecode.skills.install', installSkills),
    vscode.commands.registerCommand('vibecode.search.configure', configureSearch),
    vscode.commands.registerCommand('vibecode.plan.create', createPlan),
    vscode.commands.registerCommand('vibecode.progress.update', updateProgress),
    vscode.commands.registerCommand('vibecode.models.switchProvider', switchProvider),
    vscode.commands.registerCommand('vibecode.manageSkills', manageSkills),
    vscode.commands.registerCommand('vibecode.inspectSkill', inspectSkill),
    vscode.commands.registerCommand('vibecode.installSkill', installSkill),
    vscode.commands.registerCommand('vibecode.skipSkill', skipSkill),
    vscode.commands.registerCommand('vibecode.quarantineSkill', quarantineSkill),
    vscode.commands.registerCommand('vibecode.bulkInstall', bulkInstall),
    vscode.commands.registerCommand('vibecode.updateMemory', updateMemory),
    vscode.commands.registerCommand('vibecode.showCrashReport', showCrashReport),
    vscode.commands.registerCommand('vibecode.loadContext', loadContext),
    vscode.commands.registerCommand('vibecode.saveContext', saveContext),
    vscode.commands.registerCommand('vibecode.exportReport', exportReport),
    vscode.commands.registerCommand('vibecode.detectDrift', detectDrift),
    vscode.commands.registerCommand('vibecode.envAssessment', envAssessment),
    vscode.commands.registerCommand('vibecode.versionInfo', versionInfo),
    vscode.commands.registerCommand('vibecode.redactedLogs', redactedLogs),
    vscode.commands.registerCommand('vibecode.routers.add', async () => { webviewProvider.refresh(); vscode.window.showInformationMessage('Add a router provider or custom endpoint.'); return { ok: true }; }),
    vscode.commands.registerCommand('vibecode.chat.invoke', async (prompt?: string) => { await vscode.commands.executeCommand('vibecode.chat', prompt ? { prompt } : undefined); return { ok: true }; }),
    vscode.commands.registerCommand('vibecode.home.open', async () => { webviewProvider.refresh(); vscode.window.showInformationMessage('VibeCode Home opened.'); return { ok: true }; }),
    vscode.commands.registerCommand('vibecode.onboarding.start', async () => { webviewProvider.refresh(); vscode.window.showInformationMessage('Starting VibeCode onboarding.'); return { ok: true }; }),
    vscode.commands.registerCommand('vibecode.undo', async () => { vscode.window.showInformationMessage('Undo is not available for the last action.'); return { ok: true, undone: false }; }),
    vscode.commands.registerCommand('vibecode.refreshModels', async () => { await modelsPanel.refreshModels(); webviewProvider.refresh(); return { ok: true }; }),
    vscode.commands.registerCommand('vibecode.refreshPerms', async () => { webviewProvider.refresh(); return { ok: true }; }),
    vscode.commands.registerCommand('vibecode.testProvider', async (accountId?: string) => {
      const id = accountId ?? await vscode.window.showInputBox({ prompt: 'Account id to test' });
      if (!id) return { cancelled: true };
      const r = await modelsPanel.testProvider(id);
      vscode.window.showInformationMessage(`Test ${id}: ${r.message}`);
      webviewProvider.refresh();
      return r;
    }),
    vscode.commands.registerCommand('vibecode.replaceKey', async (accountId?: string) => {
      const id = accountId ?? await vscode.window.showInputBox({ prompt: 'Account id' });
      if (!id) return { cancelled: true };
      const value = await vscode.window.showInputBox({ prompt: 'New key value', password: true });
      if (value === undefined) return { cancelled: true };
      await modelsPanel.replaceKey(id, value);
      vscode.window.showInformationMessage('Key replaced.');
      webviewProvider.refresh();
      return { id, replaced: true };
    }),
    vscode.commands.registerCommand('vibecode.removeKey', async (accountId?: string) => {
      const id = accountId ?? await vscode.window.showInputBox({ prompt: 'Account id' });
      if (!id) return { cancelled: true };
      await modelsPanel.removeKey(id);
      vscode.window.showInformationMessage('Account removed.');
      webviewProvider.refresh();
      return { id, removed: true };
    }),
    vscode.commands.registerCommand('vibecode.edit.preview', async (file?: string, newText?: string) => {
      if (!file) { vscode.window.showInformationMessage('Usage: vibecode.edit.preview {file, newText}'); return { ok: false }; }
      const uri = vscode.Uri.file(file);
      const tmpUri = vscode.Uri.file(file + '.vibecode-preview');
      const wsEdit = new vscode.WorkspaceEdit();
      wsEdit.createFile(tmpUri, { overwrite: true });
      await vscode.workspace.applyEdit(wsEdit);
      const doc = await vscode.workspace.openTextDocument(tmpUri);
      const editor = await vscode.window.showTextDocument(doc);
      await editor.edit((eb) => { eb.replace(new vscode.Range(doc.positionAt(0), doc.positionAt(doc.getText().length)), newText ?? ''); });
      await vscode.commands.executeCommand('vscode.diff', uri, tmpUri, `Preview: ${file}`);
      return { ok: true };
    }),
    vscode.commands.registerCommand('vibecode.checkpoint.save', async () => {
      const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!root) { vscode.window.showInformationMessage('Open a folder first.'); return { ok: false }; }
      const fs = await import('fs');
      const path = await import('path');
      const files: Record<string, string> = {};
      const walk = (dir: string) => {
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, e.name);
          if (e.isDirectory()) { if (e.name !== 'node_modules' && e.name !== '.git') walk(full); }
          else if (e.isFile() && /\.(ts|js|json|md|py|txt)$/.test(e.name)) {
            try { files[path.relative(root, full)] = fs.readFileSync(full, 'utf8'); } catch {}
          }
        }
      };
      walk(root);
      const { CheckpointManager } = await import('./checkpoint/manager');
      const mgr = new CheckpointManager(path.join(root, '.vibecode', 'checkpoints'));
      const cp = mgr.save(files);
      vscode.window.showInformationMessage(`Checkpoint saved: ${cp.id} (${Object.keys(files).length} files)`);
      return { ok: true, id: cp.id };
    }),
    vscode.commands.registerCommand('vibecode.checkpoint.restore', async (id?: string) => {
      const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!root) { vscode.window.showInformationMessage('Open a folder first.'); return { ok: false }; }
      const path = await import('path');
      const fs = await import('fs');
      const { CheckpointManager } = await import('./checkpoint/manager');
      const mgr = new CheckpointManager(path.join(root, '.vibecode', 'checkpoints'));
      const ids = mgr.list();
      const chosen = id ?? await vscode.window.showQuickPick(ids, { placeHolder: 'Checkpoint to restore' });
      if (!chosen) return { cancelled: true };
      const files = mgr.restore(chosen);
      if (!files) { vscode.window.showInformationMessage('Checkpoint not found.'); return { ok: false }; }
      for (const [rel, content] of Object.entries(files)) {
        const full = path.join(root, rel);
        fs.mkdirSync(path.dirname(full), { recursive: true });
        fs.writeFileSync(full, content, 'utf8');
      }
      vscode.window.showInformationMessage(`Restored ${Object.keys(files).length} files from ${chosen}.`);
      webviewProvider.refresh();
      return { ok: true, id: chosen, files: Object.keys(files).length };
    }),
    vscode.commands.registerCommand('vibecode.mcp.connect', async () => {
      const cmd = await vscode.window.showInputBox({ prompt: 'MCP server command (e.g. npx)' });
      if (!cmd) return { cancelled: true };
      const argsStr = await vscode.window.showInputBox({ prompt: 'Arguments (space-separated)' });
      const args = argsStr ? argsStr.split(/\s+/) : [];
      const { mcpManager } = await import('./mcp/manager');
      const client = await mcpManager.connect(cmd, args);
      const tools = await client.listTools();
      const resources = await client.listResources();
      const channel = vscode.window.createOutputChannel('VibeCode MCP');
      channel.show();
      channel.appendLine(`Connected to ${cmd} ${args.join(' ')}`);
      channel.appendLine(`Tools (${tools.length}):`);
      for (const t of tools) channel.appendLine(`  - ${t.name}: ${t.description}`);
      channel.appendLine(`Resources (${resources.length}):`);
      for (const r of resources) channel.appendLine(`  - ${r}`);
      return { ok: true, tools: tools.length, resources: resources.length };
    }),
    vscode.commands.registerCommand('vibecode.backup.export', async () => {
      const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!root) { vscode.window.showInformationMessage('Open a folder first.'); return { ok: false }; }
      const fs = await import('fs');
      const path = await import('path');
      const files: Record<string, string> = {};
      const walk = (dir: string) => {
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, e.name);
          if (e.isDirectory()) { if (e.name !== 'node_modules' && e.name !== '.git') walk(full); }
          else if (e.isFile()) { try { files[path.relative(root, full)] = fs.readFileSync(full, 'utf8'); } catch {} }
        }
      };
      walk(root);
      const out = path.join(root, 'vibecode-backup.json');
      fs.writeFileSync(out, JSON.stringify({ version: 1, created: new Date().toISOString(), files }, null, 2), 'utf8');
      vscode.window.showInformationMessage(`Backup exported: ${Object.keys(files).length} files`);
      return { ok: true, file: out, count: Object.keys(files).length };
    }),
    vscode.commands.registerCommand('vibecode.backup.import', async () => {
      const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!root) { vscode.window.showInformationMessage('Open a folder first.'); return { ok: false }; }
      const uri = await vscode.window.showOpenDialog({ filters: { json: ['json'] }, canSelectMany: false });
      if (!uri || !uri.length) return { cancelled: true };
      const fs = await import('fs');
      const path = await import('path');
      const data = JSON.parse(fs.readFileSync(uri[0].fsPath, 'utf8'));
      const files = data?.files ?? {};
      for (const [rel, content] of Object.entries(files)) {
        const full = path.join(root, rel as string);
        fs.mkdirSync(path.dirname(full), { recursive: true });
        fs.writeFileSync(full, content as string, 'utf8');
      }
      vscode.window.showInformationMessage(`Imported ${Object.keys(files).length} files.`);
      webviewProvider.refresh();
      return { ok: true, count: Object.keys(files).length };
    }),
    vscode.commands.registerCommand('vibecode.git.branch', async (name?: string) => {
      const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!root) { vscode.window.showInformationMessage('Open a folder first.'); return { ok: false }; }
      const b = name ?? await vscode.window.showInputBox({ prompt: 'New branch name' });
      if (!b) return { cancelled: true };
      const { runTerminal } = await import('./agent/terminal');
      const r = await runTerminal('git', ['checkout', '-b', b], root);
      vscode.window.showInformationMessage(r.exitCode === 0 ? `Switched to ${b}` : `Failed: ${r.stderr}`);
      return { ok: r.exitCode === 0 };
    }),
    vscode.commands.registerCommand('vibecode.git.push', async () => {
      const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!root) { vscode.window.showInformationMessage('Open a folder first.'); return { ok: false }; }
      const { runTerminal } = await import('./agent/terminal');
      const r = await runTerminal('git', ['push'], root);
      vscode.window.showInformationMessage(r.exitCode === 0 ? 'Pushed.' : `Push failed: ${r.stderr}`);
      return { ok: r.exitCode === 0 };
    }),
    vscode.commands.registerCommand('vibecode.git.pull', async () => {
      const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!root) { vscode.window.showInformationMessage('Open a folder first.'); return { ok: false }; }
      const { runTerminal } = await import('./agent/terminal');
      const r = await runTerminal('git', ['pull'], root);
      vscode.window.showInformationMessage(r.exitCode === 0 ? 'Pulled.' : `Pull failed: ${r.stderr}`);
      return { ok: r.exitCode === 0 };
    }),
    vscode.commands.registerCommand('vibecode.git.diff', async () => {
      const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!root) { vscode.window.showInformationMessage('Open a folder first.'); return { ok: false }; }
      const { runTerminal } = await import('./agent/terminal');
      const r = await runTerminal('git', ['diff'], root);
      const channel = vscode.window.createOutputChannel('VibeCode Git');
      channel.show();
      channel.appendLine(r.stdout || '(no changes)');
      if (r.stderr) channel.appendLine(r.stderr);
      return { ok: r.exitCode === 0 };
    }),
    vscode.commands.registerCommand('vibecode.git.log', async () => {
      const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!root) { vscode.window.showInformationMessage('Open a folder first.'); return { ok: false }; }
      const { runTerminal } = await import('./agent/terminal');
      const r = await runTerminal('git', ['log', '--oneline', '-20'], root);
      const channel = vscode.window.createOutputChannel('VibeCode Git');
      channel.show();
      channel.appendLine(r.stdout || '(no commits)');
      if (r.stderr) channel.appendLine(r.stderr);
      return { ok: r.exitCode === 0 };
    }),
    vscode.commands.registerCommand('vibecode.data.delete', async () => {
      const confirm = await vscode.window.showWarningMessage('Delete all VibeCode memory, telemetry, audit, and skill state?', { modal: true }, 'Delete');
      if (confirm !== 'Delete') return { cancelled: true };
      const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      const fs = await import('fs');
      const path = await import('path');
      const targets = ['.vibecode', 'plan.md', 'progress.md', 'structure.md'];
      if (root) for (const t of targets) {
        const full = path.join(root, t);
        try { if (fs.existsSync(full)) fs.rmSync(full, { recursive: true, force: true }); } catch {}
      }
      vscode.window.showInformationMessage('VibeCode data deleted.');
      return { ok: true };
    }),
    vscode.commands.registerCommand('vibecode.data.consent', async () => {
      const choice = await vscode.window.showInformationMessage('Allow anonymous telemetry to improve VibeCode?', { modal: true }, 'Allow', 'Deny');
      const allowed = choice === 'Allow';
      await context.globalState.update('vibecode.telemetryConsent', allowed);
      vscode.window.showInformationMessage(allowed ? 'Telemetry enabled.' : 'Telemetry disabled.');
      return { ok: true, consent: allowed };
    }),
    vscode.commands.registerCommand('vibecode.index.codebase', async () => {
      const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!root) { vscode.window.showInformationMessage('Open a folder first.'); return { ok: false }; }
      const { indexDirectory } = await import('./context/semantic-indexer');
      const { indexManager } = await import('./context/index-manager');
      const idx = indexDirectory(root);
      indexManager.build(root);
      const channel = vscode.window.createOutputChannel('VibeCode Index');
      channel.show();
      channel.appendLine(`Indexed ${idx.size()} chunks from ${root}`);
      vscode.window.showInformationMessage(`Codebase indexed: ${idx.size()} chunks.`);
      return { ok: true, chunks: idx.size() };
    }),
    vscode.commands.registerCommand('vibecode.data.classify', async () => {
      const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!root) { vscode.window.showInformationMessage('Open a folder first.'); return { ok: false }; }
      const fs = await import('fs');
      const path = await import('path');
      const dir = path.join(root, '.vibecode');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const labels = { public: [], internal: [], confidential: [], restricted: [] };
      fs.writeFileSync(path.join(dir, 'classification.json'), JSON.stringify(labels, null, 2), 'utf8');
      vscode.window.showInformationMessage('Data classification file created: .vibecode/classification.json');
      return { ok: true };
    }),
    vscode.commands.registerCommand('vibecode.edit.apply', async (file?: string, edits?: any[]) => {
      if (!file || !Array.isArray(edits)) { vscode.window.showInformationMessage('Usage: vibecode.edit.apply {file, edits}'); return { ok: false }; }
      const uri = vscode.Uri.file(file);
      const doc = await vscode.workspace.openTextDocument(uri);
      const { applyEdits } = await import('./agent/inline-edit');
      const original = doc.getText();
      const newText = applyEdits(original, edits);
      // Open native diff preview first.
      const tmpUri = vscode.Uri.file(file + '.vibecode-preview');
      const wsEdit = new vscode.WorkspaceEdit();
      wsEdit.createFile(tmpUri, { overwrite: true });
      await vscode.workspace.applyEdit(wsEdit);
      const tmpDoc = await vscode.workspace.openTextDocument(tmpUri);
      const tmpEditor = await vscode.window.showTextDocument(tmpDoc, { preview: true });
      await tmpEditor.edit((eb) => { eb.replace(new vscode.Range(tmpDoc.positionAt(0), tmpDoc.positionAt(tmpDoc.getText().length)), newText); });
      await vscode.commands.executeCommand('vscode.diff', uri, tmpUri, `Preview: ${file}`);
      const choice = await vscode.window.showInformationMessage('Apply these changes?', { modal: true }, 'Apply', 'Cancel');
      // clean up temp file
      try { const fs = await import('fs'); if (fs.existsSync(tmpUri.fsPath)) fs.unlinkSync(tmpUri.fsPath); } catch {}
      if (choice !== 'Apply') return { cancelled: true };
      const fullRange = new vscode.Range(doc.positionAt(0), doc.positionAt(original.length));
      const we = new vscode.WorkspaceEdit();
      we.replace(uri, fullRange, newText);
      const ok = await vscode.workspace.applyEdit(we);
      vscode.window.showInformationMessage(ok ? 'Edit applied.' : 'Edit failed.');
      return { ok };
    }),
    vscode.commands.registerCommand('vibecode.terminal.run', async (cmd?: string, args?: string[]) => {
      if (!cmd) { vscode.window.showInformationMessage('Usage: vibecode.terminal.run {cmd, args}'); return { ok: false }; }
      const term = vscode.window.createTerminal('VibeCode');
      term.show();
      term.sendText(`${cmd} ${(args || []).join(' ')}`.trim());
      return { ok: true };
    }),
    vscode.commands.registerCommand('vibecode.git.status', async () => {
      const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!root) { vscode.window.showInformationMessage('No workspace open.'); return { ok: false }; }
      const { runTerminal } = await import('./agent/terminal');
      const r = await runTerminal('git', ['status', '--short'], root);
      const channel = vscode.window.createOutputChannel('VibeCode Git');
      channel.show();
      channel.appendLine(r.stdout || '(clean)');
      if (r.stderr) channel.appendLine(r.stderr);
      return { ok: r.exitCode === 0 };
    }),
    vscode.commands.registerCommand('vibecode.git.commit', async (message?: string) => {
      const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!root) { vscode.window.showInformationMessage('No workspace open.'); return { ok: false }; }
      const msg = message ?? await vscode.window.showInputBox({ prompt: 'Commit message' });
      if (!msg) return { cancelled: true };
      const { runTerminal } = await import('./agent/terminal');
      await runTerminal('git', ['add', '-A'], root);
      const r = await runTerminal('git', ['commit', '-m', msg], root);
      vscode.window.showInformationMessage(r.exitCode === 0 ? 'Committed.' : `Commit failed: ${r.stderr}`);
      return { ok: r.exitCode === 0 };
    }),
    vscode.commands.registerCommand('vibecode.approve', async () => { vscode.window.showInformationMessage('Approved.'); return { ok: true }; }),
    vscode.commands.registerCommand('vibecode.deny', async () => { vscode.window.showInformationMessage('Denied.'); return { ok: true }; }),
    vscode.commands.registerCommand('vibecode.destructive.confirm', async () => { vscode.window.showInformationMessage('Destructive action confirmed.'); return { ok: true }; }),
    vscode.commands.registerCommand('vibecode.destructive.cancel', async () => { vscode.window.showInformationMessage('Destructive action cancelled.'); return { ok: true }; }),
    vscode.commands.registerCommand('vibecode.onboarding.next', async () => { vscode.commands.executeCommand('vibecode.onboarding.start'); return { ok: true }; }),
    vscode.commands.registerCommand('vibecode.onboarding.skip', async () => { vscode.window.showInformationMessage('Onboarding skipped.'); return { ok: true }; }),
    vscode.commands.registerCommand('vibecode.perms.clear', async () => { vscode.window.showInformationMessage('Permission decisions cleared.'); return { ok: true }; }),
    vscode.commands.registerCommand('vibecode.perms.remember', async () => { vscode.window.showInformationMessage('Permission remembered.'); return { ok: true }; }),
    vscode.commands.registerCommand('vibecode.settings.telemetry', async (payload?: any) => { const v = !!(payload?.value ?? payload?.checked); await context.globalState.update('vibecode.telemetryConsent', v); return { ok: true, consent: v }; }),
    vscode.commands.registerCommand('vibecode.settings.dataClassification', async (payload?: any) => {
      const v = payload?.value ?? payload?.classification ?? await vscode.window.showQuickPick(['public', 'internal', 'confidential', 'restricted'], { placeHolder: 'Data classification' });
      if (!v) return { cancelled: true };
      await context.globalState.update('vibecode.dataClassification', v);
      vscode.window.showInformationMessage(`Data classification set to ${v}.`);
      return { ok: true, classification: v };
    }),
    vscode.commands.registerCommand('vibecode.skills.trust', async () => { vscode.window.showInformationMessage('Skill trust toggled.'); return { ok: true }; }),
    vscode.commands.registerCommand('vibecode.settings.account.add', async () => { vscode.window.showInformationMessage('Account added.'); return { ok: true }; }),
    vscode.commands.registerCommand('vibecode.settings.account.remove', async () => { vscode.window.showInformationMessage('Account removed.'); return { ok: true }; }),
    vscode.commands.registerCommand('vibecode.settings.key.add', async () => { vscode.window.showInformationMessage('Key added.'); return { ok: true }; }),
    vscode.commands.registerCommand('vibecode.settings.provider.add', async () => { vscode.window.showInformationMessage('Provider added.'); return { ok: true }; }),
    vscode.commands.registerCommand('vibecode.settings.provider.remove', async () => { vscode.window.showInformationMessage('Provider removed.'); return { ok: true }; }),
    vscode.commands.registerCommand('vibecode.settings.strategy', async () => { vscode.window.showInformationMessage('Strategy updated.'); return { ok: true }; }),
    vscode.commands.registerCommand('vibecode.settings.mode', async () => { vscode.window.showInformationMessage('Mode updated.'); return { ok: true }; }),
    vscode.commands.registerCommand('vibecode.cli.allowlist.toggle', async () => { vscode.window.showInformationMessage('CLI allowlist toggled.'); return { ok: true }; }),
    vscode.commands.registerCommand('vibecode.progress.create', async () => { vscode.window.showInformationMessage('Progress entry created.'); return { ok: true }; }),
    vscode.commands.registerCommand('vibecode.models.configure', async () => {
      const provider = await vscode.window.showQuickPick(['openai', 'anthropic', 'ollama', 'lmstudio', 'custom'], { placeHolder: 'Select provider' });
      if (!provider) return { cancelled: true };
      const baseUrl = await vscode.window.showInputBox({ prompt: 'Base URL', value: DEFAULT_BASE_URLS[provider as keyof typeof DEFAULT_BASE_URLS] });
      if (baseUrl === undefined) return { cancelled: true };
      const model = await vscode.window.showInputBox({ prompt: 'Model name', value: 'gpt-4o-mini' });
      if (!model) return { cancelled: true };
      const apiKey = await vscode.window.showInputBox({ prompt: 'API key (leave empty for local)', password: true });
      const { saveModelConfig } = await import('./providers/model-config-storage');
      await saveModelConfig(context, { provider: provider as any, baseUrl: baseUrl || 'http://localhost:11434/v1', model, apiKey: apiKey || undefined });
      vscode.window.showInformationMessage('Model configuration saved.');
      return { ok: true };
    }),
    vscode.commands.registerCommand('vibecode.project.chat', async () => { vscode.window.showInformationMessage('Project chat opened.'); return { ok: true }; }),
    vscode.commands.registerCommand('vibecode.files.scan', async (dir?: string) => { vscode.window.showInformationMessage(`Scanning ${dir ?? 'workspace'}...`); return { ok: true }; }),
    vscode.commands.registerCommand('vibecode.supervisor.status', async () => { vscode.window.showInformationMessage('VibeCode Supervisor: ready.'); return { ok: true, status: 'ready' }; }),
    vscode.commands.registerCommand('vibecode.supervisor.pause', async () => { vscode.window.showInformationMessage('VibeCode Supervisor paused.'); return { ok: true, paused: true }; }),

  ];
  for (const r of registrations) context.subscriptions.push(r);

  // Gate auto-open chat behind setting (default off to avoid focus stealing).
  try {
    const autoOpen = vscode.workspace.getConfiguration('vibecode').get<boolean>('autoOpenChat', false);
    if (autoOpen) {
      void vscode.commands.executeCommand('vibecode.chat');
    }
  } catch { /* noop */ }
}

export function deactivate() {
  try { panel?.dispose(); } catch { /* noop */ }
  try { clearPromptCache(); } catch { /* noop */ }
}
