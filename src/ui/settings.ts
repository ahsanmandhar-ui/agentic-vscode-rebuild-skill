// src/ui/settings.ts
import * as vscode from 'vscode';
import * as path from 'path';

export interface VibeSettings {
  provider: string;
  model: string;
  temperature: number;
  maxTokens: number;
  autoApproveSafe: boolean;
  requestTimeoutMs: number;
  retryCount: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  dataDir: string;
}

export const RECOMMENDED_SETTINGS: VibeSettings = {
  provider: 'local',
  model: 'default',
  temperature: 0.2,
  maxTokens: 4096,
  autoApproveSafe: false,
  requestTimeoutMs: 30000,
  retryCount: 2,
  logLevel: 'info',
  dataDir: '',
};

export const PROTECTED_SEGMENTS = ['node_modules', '.git', 'dist', 'out', 'build'];
export const PROTECTED_FILES = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'];

export function isProtectedPath(p: string): boolean {
  if (!p) return false;
  const norm = p.replace(/\\/g, '/').toLowerCase();
  const segments = norm.split('/').filter(Boolean);
  if (segments.some((s) => PROTECTED_SEGMENTS.includes(s))) return true;
  const base = path.basename(norm);
  return PROTECTED_FILES.includes(base);
}

export function isOutsideWorkspace(p: string, workspaceRoot?: string): boolean {
  if (!p || !workspaceRoot) return false;
  const resolved = path.resolve(p);
  const root = path.resolve(workspaceRoot);
  const rel = path.relative(root, resolved);
  return rel.startsWith('..') || path.isAbsolute(rel);
}

export function requiresTypedConfirmation(p: string, workspaceRoot?: string): boolean {
  return isProtectedPath(p) || isOutsideWorkspace(p, workspaceRoot);
}

export type ValidationError = { path: string; message: string };

export function validateSettings(raw: unknown): { ok: boolean; errors: ValidationError[]; value?: VibeSettings } {
  const errors: ValidationError[] = [];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, errors: [{ path: '$', message: 'settings must be an object' }] };
  }
  const o = raw as Record<string, unknown>;
  const out: VibeSettings = { ...RECOMMENDED_SETTINGS };

  if (o.provider !== undefined) {
    if (typeof o.provider !== 'string' || !o.provider.trim()) errors.push({ path: 'provider', message: 'must be non-empty string' });
    else out.provider = o.provider;
  }
  if (o.model !== undefined) {
    if (typeof o.model !== 'string' || !o.model.trim()) errors.push({ path: 'model', message: 'must be non-empty string' });
    else out.model = o.model;
  }
  if (o.temperature !== undefined) {
    if (typeof o.temperature !== 'number' || !Number.isFinite(o.temperature) || o.temperature < 0 || o.temperature > 2)
      errors.push({ path: 'temperature', message: 'must be number 0..2' });
    else out.temperature = o.temperature;
  }
  if (o.maxTokens !== undefined) {
    if (typeof o.maxTokens !== 'number' || !Number.isInteger(o.maxTokens) || o.maxTokens < 1 || o.maxTokens > 1000000)
      errors.push({ path: 'maxTokens', message: 'must be integer 1..1000000' });
    else out.maxTokens = o.maxTokens;
  }
  if (o.autoApproveSafe !== undefined) {
    if (typeof o.autoApproveSafe !== 'boolean') errors.push({ path: 'autoApproveSafe', message: 'must be boolean' });
    else out.autoApproveSafe = o.autoApproveSafe;
  }
  if (o.requestTimeoutMs !== undefined) {
    if (typeof o.requestTimeoutMs !== 'number' || !Number.isInteger(o.requestTimeoutMs) || o.requestTimeoutMs < 1000)
      errors.push({ path: 'requestTimeoutMs', message: 'must be integer >=1000' });
    else out.requestTimeoutMs = o.requestTimeoutMs;
  }
  if (o.retryCount !== undefined) {
    if (typeof o.retryCount !== 'number' || !Number.isInteger(o.retryCount) || o.retryCount < 0 || o.retryCount > 10)
      errors.push({ path: 'retryCount', message: 'must be integer 0..10' });
    else out.retryCount = o.retryCount;
  }
  if (o.logLevel !== undefined) {
    if (typeof o.logLevel !== 'string' || !['debug', 'info', 'warn', 'error'].includes(o.logLevel))
      errors.push({ path: 'logLevel', message: 'must be debug|info|warn|error' });
    else out.logLevel = o.logLevel as VibeSettings['logLevel'];
  }
  if (o.dataDir !== undefined) {
    if (typeof o.dataDir !== 'string') errors.push({ path: 'dataDir', message: 'must be string' });
    else out.dataDir = o.dataDir;
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true, errors: [], value: out };
}

export type DiffEntry = { path: string; from: unknown; to: unknown };

export function diffSettings(a: unknown, b: unknown, prefix = ''): DiffEntry[] {
  const out: DiffEntry[] = [];
  const aObj = a && typeof a === 'object' && !Array.isArray(a) ? (a as Record<string, unknown>) : undefined;
  const bObj = b && typeof b === 'object' && !Array.isArray(b) ? (b as Record<string, unknown>) : undefined;
  if (aObj && bObj) {
    const keys = new Set([...Object.keys(aObj), ...Object.keys(bObj)]);
    for (const k of keys) {
      const p = prefix ? `${prefix}.${k}` : k;
      if (!(k in aObj)) out.push({ path: p, from: undefined, to: bObj[k] });
      else if (!(k in bObj)) out.push({ path: p, from: aObj[k], to: undefined });
      else out.push(...diffSettings(aObj[k], bObj[k], p));
    }
    return out;
  }
  if (JSON.stringify(a) !== JSON.stringify(b)) out.push({ path: prefix || '$', from: a, to: b });
  return out;
}

export async function loadSettings(context: vscode.ExtensionContext): Promise<VibeSettings> {
  const cfg = vscode.workspace.getConfiguration('vibecode');
  const raw = cfg.get<unknown>('settings', {});
  const v = validateSettings(raw);
  if (v.ok && v.value) return v.value;
  return { ...RECOMMENDED_SETTINGS };
}

export async function saveSettings(context: vscode.ExtensionContext, raw: unknown): Promise<{ ok: boolean; errors: ValidationError[] }> {
  const v = validateSettings(raw);
  if (!v.ok || !v.value) return { ok: false, errors: v.errors };
  const cfg = vscode.workspace.getConfiguration('vibecode');
  await cfg.update('settings', v.value, vscode.ConfigurationTarget.Global);
  return { ok: true, errors: [] };
}

export async function resetSettings(context: vscode.ExtensionContext): Promise<{ diff: DiffEntry[]; recommended: VibeSettings }> {
  const current = await loadSettings(context);
  const diff = diffSettings(current, RECOMMENDED_SETTINGS);
  return { diff, recommended: RECOMMENDED_SETTINGS };
}

export async function applyReset(context: vscode.ExtensionContext): Promise<void> {
  const cfg = vscode.workspace.getConfiguration('vibecode');
  await cfg.update('settings', RECOMMENDED_SETTINGS, vscode.ConfigurationTarget.Global);
}
