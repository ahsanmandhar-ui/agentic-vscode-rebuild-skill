// src/observability/crash.ts
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { redactSecrets, AuditLog } from './audit';

export interface CrashReport {
  ts: string;
  kind: string;
  message: string;
  stack?: string;
  redacted: boolean;
}

export class CrashReporter {
  private channel: vscode.OutputChannel;
  private lastReportPath: string;
  private audit?: AuditLog;

  constructor(private context: vscode.ExtensionContext, audit?: AuditLog) {
    const dir = context.globalStorageUri.fsPath;
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    this.lastReportPath = path.join(dir, 'last-crash.json');
    this.channel = vscode.window.createOutputChannel('VibeCode Crash');
    context.subscriptions.push(this.channel);
    this.audit = audit;
  }

  install(): void {
    process.on('unhandledRejection', (reason) => {
      this.capture('unhandledRejection', reason);
    });
    process.on('uncaughtException', (err) => {
      this.capture('uncaughtException', err);
    });
  }

  capture(kind: string, reason: unknown): CrashReport {
    const err = reason instanceof Error ? reason : new Error(String(reason));
    const report: CrashReport = {
      ts: new Date().toISOString(),
      kind,
      message: String(redactSecrets(err.message)),
      stack: err.stack ? String(redactSecrets(err.stack)) : undefined,
      redacted: true,
    };
    try { fs.writeFileSync(this.lastReportPath, JSON.stringify(report, null, 2), 'utf8'); } catch { /* ignore */ }
    this.channel.appendLine(`[${report.ts}] ${kind}: ${report.message}`);
    if (report.stack) this.channel.appendLine(report.stack);
    this.audit?.record({
      ts: report.ts,
      command: 'crash',
      phase: 'error',
      error: report.message,
      payload: { kind },
    }).catch(() => { /* ignore */ });
    return report;
  }

  getLastReport(): CrashReport | undefined {
    try { return JSON.parse(fs.readFileSync(this.lastReportPath, 'utf8')) as CrashReport; } catch { return undefined; }
  }

  async show(): Promise<void> {
    const r = this.getLastReport();
    if (!r) {
      vscode.window.showInformationMessage('No crash report recorded.');
      return;
    }
    const doc = await vscode.workspace.openTextDocument({ content: JSON.stringify(r, null, 2), language: 'json' });
    await vscode.window.showTextDocument(doc);
  }
}
