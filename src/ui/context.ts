// src/ui/context.ts
import { MemoryManager, ContextFile } from '../memory/manager';
import { Logger } from '../shared/logger';

export interface ContextPanelDeps {
  memory: MemoryManager;
  logger: Logger;
  audit: { record(e: { ts: string; command: string; phase: string; payload?: unknown; result?: unknown; error?: string }): Promise<void> };
}

export interface ContextPanelState {
  status: 'loading' | 'empty' | 'error' | 'ready';
  file?: ContextFile;
  content?: string;
  size?: number;
  warnings?: unknown[];
  diagnostics?: unknown;
  updatedAt: string;
}

export class ContextPanel {
  private state: ContextPanelState;
  private readonly deps: ContextPanelDeps;
  private readonly now: () => Date;

  constructor(deps: ContextPanelDeps, now: () => Date = () => new Date()) {
    this.deps = deps;
    this.now = now;
    this.state = { status: 'empty', updatedAt: this.now().toISOString() };
  }

  getState(): ContextPanelState { return { ...this.state }; }

  async loadContext(file: ContextFile): Promise<ContextPanelState> {
    this.state = { ...this.state, status: 'loading', updatedAt: this.now().toISOString() };
    try {
      const snap = await this.deps.memory.loadContext(file);
      this.state = {
        status: snap.exists ? 'ready' : 'empty',
        file,
        content: snap.content,
        size: snap.size,
        updatedAt: this.now().toISOString(),
      };
      await this.deps.audit.record({ ts: this.now().toISOString(), command: 'loadContext', phase: 'success', payload: { file }, result: { size: snap.size, exists: snap.exists } });
    } catch (e) {
      this.state = { ...this.state, status: 'error', updatedAt: this.now().toISOString() };
      await this.deps.audit.record({ ts: this.now().toISOString(), command: 'loadContext', phase: 'error', error: (e as Error)?.message ?? String(e) });
    }
    return this.getState();
  }

  async saveContext(file: ContextFile, content: string): Promise<ContextPanelState> {
    this.state = { ...this.state, status: 'loading', updatedAt: this.now().toISOString() };
    try {
      await this.deps.memory.saveContext(file, content);
      const snap = await this.deps.memory.loadContext(file);
      this.state = { status: 'ready', file, content: snap.content, size: snap.size, updatedAt: this.now().toISOString() };
      await this.deps.audit.record({ ts: this.now().toISOString(), command: 'saveContext', phase: 'success', payload: { file }, result: { size: snap.size } });
    } catch (e) {
      this.state = { ...this.state, status: 'error', updatedAt: this.now().toISOString() };
      await this.deps.audit.record({ ts: this.now().toISOString(), command: 'saveContext', phase: 'error', error: (e as Error)?.message ?? String(e) });
    }
    return this.getState();
  }

  checkDrift(): ContextPanelState {
    const warnings = this.deps.memory.detectDrift();
    this.state = { ...this.state, warnings, updatedAt: this.now().toISOString() };
    return this.getState();
  }

  envAssessment(): unknown { return this.deps.memory.envAssessment(); }
  versionInfo(): unknown { return this.deps.memory.versionInfo(); }
  redactedLogs(n = 100): string[] { return this.deps.logger.redactedLogs(n); }

  async exportReport(): Promise<string> {
    const report = await this.deps.memory.exportReport();
    await this.deps.audit.record({ ts: this.now().toISOString(), command: 'exportReport', phase: 'success', result: { size: report.length } });
    return report;
  }
}
