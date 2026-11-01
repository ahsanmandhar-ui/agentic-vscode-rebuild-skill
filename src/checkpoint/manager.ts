// src/checkpoint/manager.ts
import * as fs from 'fs';
import * as path from 'path';

export interface Checkpoint { id: string; ts: string; files: Record<string, string>; }

export class CheckpointManager {
  private dir: string;
  constructor(dir: string) { this.dir = dir; if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); }
  save(files: Record<string, string>): Checkpoint {
    const id = `cp-${Date.now()}`;
    const cp: Checkpoint = { id, ts: new Date().toISOString(), files };
    fs.writeFileSync(path.join(this.dir, `${id}.json`), JSON.stringify(cp));
    return cp;
  }
  load(id: string): Checkpoint | undefined {
    const f = path.join(this.dir, `${id}.json`);
    if (!fs.existsSync(f)) return undefined;
    try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return undefined; }
  }
  list(): string[] {
    return fs.readdirSync(this.dir).filter(n => n.endsWith('.json')).map(n => n.replace('.json', ''));
  }
  restore(id: string): Record<string, string> | undefined {
    const cp = this.load(id);
    return cp ? cp.files : undefined;
  }
}
