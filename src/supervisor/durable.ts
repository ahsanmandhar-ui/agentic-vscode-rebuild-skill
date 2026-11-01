// src/supervisor/durable.ts
// Adapted from microsoft/agent-framework durable task (MIT).
import * as fs from 'fs';
import * as path from 'path';

export interface DurableStore {
  save(key: string, data: unknown): void;
  load(key: string): unknown | undefined;
  remove(key: string): void;
  list(): string[];
}

export class FileDurableStore implements DurableStore {
  constructor(private dir: string) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
  private file(key: string): string { return path.join(this.dir, `${encodeURIComponent(key)}.json`); }
  save(key: string, data: unknown): void {
    fs.writeFileSync(this.file(key), JSON.stringify(data), 'utf8');
  }
  load(key: string): unknown | undefined {
    const f = this.file(key);
    if (!fs.existsSync(f)) return undefined;
    try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return undefined; }
  }
  remove(key: string): void {
    const f = this.file(key);
    if (fs.existsSync(f)) fs.unlinkSync(f);
  }
  list(): string[] {
    return fs.readdirSync(this.dir)
      .filter(n => n.endsWith('.json'))
      .map(n => decodeURIComponent(n.replace(/\.json$/, '')));
  }
}

export class InMemoryDurableStore implements DurableStore {
  private data = new Map<string, unknown>();
  save(key: string, data: unknown): void { this.data.set(key, data); }
  load(key: string): unknown | undefined { return this.data.get(key); }
  remove(key: string): void { this.data.delete(key); }
  list(): string[] { return [...this.data.keys()]; }
}
