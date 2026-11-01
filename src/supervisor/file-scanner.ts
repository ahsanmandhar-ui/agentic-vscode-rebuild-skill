// src/supervisor/file-scanner.ts
import * as fs from 'fs';
import * as path from 'path';

export interface ScannedFile { path: string; name: string; size: number; ext: string; }

export function scanDirectory(root: string, maxFiles = 200, exts?: string[]): ScannedFile[] {
  const out: ScannedFile[] = [];
  const allowed = exts ? new Set(exts) : null;
  const walk = (dir: string) => {
    if (out.length >= maxFiles) return;
    let entries: fs.Dirent[];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (out.length >= maxFiles) return;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === 'node_modules' || e.name === '.git' || e.name.startsWith('.')) continue;
        walk(full);
      } else if (e.isFile()) {
        const ext = path.extname(e.name).toLowerCase();
        if (allowed && !allowed.has(ext)) continue;
        try {
          const st = fs.statSync(full);
          out.push({ path: full, name: e.name, size: st.size, ext });
        } catch { /* skip */ }
      }
    }
  };
  walk(root);
  return out;
}

export function extractFeatures(files: ScannedFile[]): string[] {
  const features = new Set<string>();
  for (const f of files) {
    const base = f.name.toLowerCase();
    if (base.includes('test')) features.add('tests');
    if (base.includes('ui') || base.includes('panel')) features.add('ui-panel');
    if (base.includes('agent') || base.includes('supervisor')) features.add('agent-supervisor');
    if (base.includes('auth') || base.includes('secret')) features.add('auth-secrets');
    if (base.includes('search')) features.add('search');
    if (base.includes('router')) features.add('routing');
    if (base.includes('memory') || base.includes('plan')) features.add('memory-plan');
    if (base.includes('security') || base.includes('redact')) features.add('security');
    if (base.includes('flow')) features.add('flows');
    if (base.includes('trace')) features.add('tracing');
    if (f.ext === '.md') features.add('docs');
  }
  return [...features];
}
