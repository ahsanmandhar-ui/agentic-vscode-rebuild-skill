// src/observability/audit.ts
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface AuditEvent {
  ts: string;
  command: string;
  phase: 'start' | 'success' | 'error';
  actor?: string;
  payload?: unknown;
  result?: unknown;
  error?: string;
}

const SECRET_PATTERNS: RegExp[] = [
  /sk-[A-Za-z0-9]{16,}/g,
  /Bearer\s+[A-Za-z0-9._-]{10,}/gi,
  /(api[_-]?key|access[_-]?token|refresh[_-]?token|secret|password|credential)\s*[:=]\s*['"]?[^'"\s]{6,}/gi,
];

export function redactSecrets(value: unknown): unknown {
  if (typeof value === 'string') {
    let s = value;
    for (const p of SECRET_PATTERNS) s = s.replace(p, '[REDACTED]');
    return s;
  }
  if (Array.isArray(value)) return value.map(redactSecrets);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (/secret|token|key|password|credential/i.test(k)) out[k] = '[REDACTED]';
      else out[k] = redactSecrets(v);
    }
    return out;
  }
  return value;
}

export class AuditLog {
  private file: string;
  private channel: vscode.OutputChannel;

  constructor(private context: vscode.ExtensionContext) {
    const dir = context.globalStorageUri.fsPath;
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    this.file = path.join(dir, 'audit.jsonl');
    this.channel = vscode.window.createOutputChannel('VibeCode Audit');
    context.subscriptions.push(this.channel);
  }

  async record(event: AuditEvent): Promise<void> {
    const safe: AuditEvent = {
      ...event,
      payload: redactSecrets(event.payload),
      result: redactSecrets(event.result),
      error: event.error ? String(redactSecrets(event.error)) : undefined,
    };
    const line = JSON.stringify(safe) + '\n';
    try { fs.appendFileSync(this.file, line, 'utf8'); } catch { /* ignore */ }
    this.channel.appendLine(`[${safe.ts}] ${safe.command} ${safe.phase}${safe.error ? ' :: ' + safe.error : ''}`);
  }

  async recent(n = 50): Promise<AuditEvent[]> {
    try {
      const raw = fs.readFileSync(this.file, 'utf8');
      const lines = raw.trim().split('\n').filter(Boolean);
      return lines.slice(-n).map((l) => JSON.parse(l) as AuditEvent);
    } catch {
      return [];
    }
  }
}
