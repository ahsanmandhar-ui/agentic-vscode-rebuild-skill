// src/memory/manager.ts
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../shared/logger';
import { redactSecrets } from '../shared/redact';

export type ContextFile = 'plan.md' | 'progress.md' | 'structure.md';

export interface ContextSnapshot {
  file: ContextFile;
  path: string;
  exists: boolean;
  content: string;
  size: number;
  mtime?: string;
}

export interface DriftWarning {
  level: 'info' | 'warn' | 'error';
  code: string;
  message: string;
  file?: ContextFile;
}

export interface EnvAssessment {
  nodeVersion: string;
  platform: string;
  arch: string;
  cwd: string;
  workspaceRoot: string;
  files: Record<ContextFile, boolean>;
  packageVersion?: string;
  packageName?: string;
  timestamp: string;
}

export interface VersionInfo {
  name?: string;
  version?: string;
  publisher?: string;
  engine?: string;
  timestamp: string;
}

const MANAGED_START = '<!-- vibecode:managed:start -->';
const MANAGED_END = '<!-- vibecode:managed:end -->';
const SIZE_CAP: Record<ContextFile, number> = {
  'plan.md': 200000,
  'progress.md': 200000,
  'structure.md': 200000,
};

export class MemoryManager {
  constructor(
    private root: string,
    private logger: Logger,
    private audit?: { record: (e: any) => Promise<void> },
  ) {}

  filePath(file: ContextFile): string {
    return path.join(this.root, file);
  }

  async loadContext(file: ContextFile): Promise<ContextSnapshot> {
    const p = this.filePath(file);
    try {
      const stat = fs.statSync(p);
      const content = fs.readFileSync(p, 'utf8');
      this.logger.debug('loadContext', { file, size: content.length });
      return { file, path: p, exists: true, content, size: content.length, mtime: stat.mtime.toISOString() };
    } catch {
      this.logger.debug('loadContext missing', { file });
      return { file, path: p, exists: false, content: '', size: 0 };
    }
  }

  async saveContext(file: ContextFile, content: string): Promise<void> {
    const p = this.filePath(file);
    const dir = path.dirname(p);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const redacted = String(redactSecrets(content));
    const tmp = p + '.tmp';
    fs.writeFileSync(tmp, redacted, 'utf8');
    try { fs.renameSync(tmp, p); } catch { fs.copyFileSync(tmp, p); try { fs.unlinkSync(tmp); } catch { /* ignore */ } }
    this.logger.info('saveContext', { file, size: redacted.length });
    await this.audit?.record({
      ts: new Date().toISOString(),
      command: 'vibecode.saveContext',
      phase: 'success',
      payload: { file },
      result: { size: redacted.length },
    });
  }

  detectDrift(): DriftWarning[] {
    const warnings: DriftWarning[] = [];
    const files: ContextFile[] = ['plan.md', 'progress.md', 'structure.md'];
    for (const f of files) {
      const snap = this.loadContextSync(f);
      if (!snap.exists) {
        warnings.push({ level: 'warn', code: 'MISSING_FILE', message: `${f} not found in workspace root.`, file: f });
        continue;
      }
      if (!snap.content.includes(MANAGED_START) || !snap.content.includes(MANAGED_END)) {
        warnings.push({ level: 'warn', code: 'NO_MANAGED_BLOCK', message: `${f} has no vibecode managed markers.`, file: f });
      }
      if (snap.size > SIZE_CAP[f]) {
        warnings.push({ level: 'warn', code: 'OVERSIZE', message: `${f} exceeds size cap (${snap.size} > ${SIZE_CAP[f]}).`, file: f });
      }
      if (/(sk-[A-Za-z0-9]{16,}|Bearer\s+[A-Za-z0-9._-]{10,})/.test(snap.content)) {
        warnings.push({ level: 'error', code: 'SECRET_LEAK', message: `${f} appears to contain a secret.`, file: f });
      }
    }
    try {
      const plan = this.loadContextSync('plan.md').content;
      const progress = this.loadContextSync('progress.md').content;
      if (!plan.trim() && progress.trim()) {
        warnings.push({ level: 'info', code: 'PLAN_EMPTY', message: 'progress.md present but plan.md is empty.' });
      }
    } catch { /* ignore */ }
    this.logger.debug('detectDrift', { count: warnings.length });
    return warnings;
  }

  private loadContextSync(file: ContextFile): ContextSnapshot {
    const p = this.filePath(file);
    try {
      const stat = fs.statSync(p);
      const content = fs.readFileSync(p, 'utf8');
      return { file, path: p, exists: true, content, size: content.length, mtime: stat.mtime.toISOString() };
    } catch {
      return { file, path: p, exists: false, content: '', size: 0 };
    }
  }

  envAssessment(): EnvAssessment {
    let packageVersion: string | undefined;
    let packageName: string | undefined;
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(this.root, 'package.json'), 'utf8'));
      packageVersion = pkg.version;
      packageName = pkg.name;
    } catch { /* ignore */ }
    const files: Record<ContextFile, boolean> = {
      'plan.md': fs.existsSync(this.filePath('plan.md')),
      'progress.md': fs.existsSync(this.filePath('progress.md')),
      'structure.md': fs.existsSync(this.filePath('structure.md')),
    };
    const assessment: EnvAssessment = {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      cwd: process.cwd(),
      workspaceRoot: this.root,
      files,
      packageVersion,
      packageName,
      timestamp: new Date().toISOString(),
    };
    this.logger.debug('envAssessment', assessment);
    return assessment;
  }

  versionInfo(): VersionInfo {
    let name: string | undefined;
    let version: string | undefined;
    let publisher: string | undefined;
    let engine: string | undefined;
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(this.root, 'package.json'), 'utf8'));
      name = pkg.name;
      version = pkg.version;
      publisher = pkg.publisher;
      engine = pkg.engines?.vscode;
    } catch { /* ignore */ }
    return { name, version, publisher, engine, timestamp: new Date().toISOString() };
  }

  async exportReport(): Promise<string> {
    const snaps = await Promise.all(['plan.md', 'progress.md', 'structure.md'].map((f) => this.loadContext(f as ContextFile)));
    const drift = this.detectDrift();
    const env = this.envAssessment();
    const ver = this.versionInfo();
    const logs = this.logger.redactedLogs(100);
    const lines: string[] = [];
    lines.push('# VibeCode Context & Diagnostics Report');
    lines.push('');
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push('');
    lines.push('## Version info');
    lines.push(`- Name: ${ver.name ?? 'unknown'}`);
    lines.push(`- Version: ${ver.version ?? 'unknown'}`);
    lines.push(`- Publisher: ${ver.publisher ?? 'unknown'}`);
    lines.push(`- VS Code engine: ${ver.engine ?? 'unknown'}`);
    lines.push('');
    lines.push('## Environment assessment');
    lines.push(`- Node: ${env.nodeVersion}`);
    lines.push(`- Platform: ${env.platform} (${env.arch})`);
    lines.push(`- Workspace: ${env.workspaceRoot}`);
    lines.push(`- Context files: ${JSON.stringify(env.files)}`);
    lines.push('');
    lines.push('## Drift warnings');
    if (drift.length === 0) lines.push('_none_');
    else for (const w of drift) lines.push(`- [${w.level}] ${w.code}: ${w.message}`);
    lines.push('');
    for (const s of snaps) {
      lines.push(`## ${s.file}`);
      lines.push(s.exists ? '```markdown\n' + s.content.slice(0, 8000) + '\n```' : '_missing_');
      lines.push('');
    }
    lines.push('## Redacted logs (tail)');
    lines.push('```');
    lines.push(...logs);
    lines.push('```');
    const report = lines.join('\n');
    try {
      const dir = path.join(this.root, '.vibecode');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'report.md'), report, 'utf8');
    } catch { /* ignore */ }
    this.logger.info('exportReport', { size: report.length });
    await this.audit?.record({
      ts: new Date().toISOString(),
      command: 'vibecode.exportReport',
      phase: 'success',
      result: { size: report.length },
    });
    return report;
  }
}
