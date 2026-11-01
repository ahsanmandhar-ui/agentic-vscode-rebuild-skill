// src/supervisor/hierarchical-executor.ts
import { TaskLedger } from './ledger';
import { Flow } from './flow';

export interface Chunk {
  id: string;
  title: string;
  dependsOn?: string[];
  run: () => Promise<{ ok: boolean; detail?: string }>;
}

export interface ChunkResult { id: string; ok: boolean; detail?: string; error?: string; }

export class MasterAgent {
  private ledger = new TaskLedger();
  private maxParallel = 4;

  constructor(maxParallel = 4) { this.maxParallel = maxParallel; }

  async execute(chunks: Chunk[]): Promise<ChunkResult[]> {
    // register all in ledger
    for (const c of chunks) {
      this.ledger.add({ id: c.id, description: c.title, status: 'pending' });
    }
    const results: ChunkResult[] = [];
    const done = new Set<string>();
    const errors = new Map<string, string>();

    while (done.size < chunks.length) {
      const batch = chunks.filter(c =>
        !done.has(c.id) &&
        (c.dependsOn ?? []).every(d => done.has(d)) &&
        (c.dependsOn ?? []).every(d => !errors.has(d))
      );
      if (batch.length === 0) {
        for (const c of chunks) {
          if (!done.has(c.id) && !errors.has(c.id)) {
            errors.set(c.id, 'dependency failed or deadlock');
            this.ledger.update(c.id, { status: 'failed', error: 'dependency failed' });
            done.add(c.id);
            results.push({ id: c.id, ok: false, error: 'dependency failed' });
          }
        }
        break;
      }
      // limit parallelism
      const slice = batch.slice(0, this.maxParallel);
      const out = await Promise.all(slice.map(async (c) => {
        this.ledger.update(c.id, { status: 'running' });
        try {
          const r = await c.run();
          this.ledger.update(c.id, { status: r.ok ? 'done' : 'failed', result: r.detail, error: r.ok ? undefined : r.detail });
          done.add(c.id);
          return { id: c.id, ok: r.ok, detail: r.detail } as ChunkResult;
        } catch (e) {
          const msg = String(e);
          this.ledger.update(c.id, { status: 'failed', error: msg });
          errors.set(c.id, msg);
          done.add(c.id);
          return { id: c.id, ok: false, error: msg } as ChunkResult;
        }
      }));
      results.push(...out);
    }
    return results;
  }

  getLedger(): TaskLedger { return this.ledger; }
}
