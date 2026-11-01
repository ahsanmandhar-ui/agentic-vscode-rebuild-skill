import { describe, it, expect } from 'vitest';
import { MasterAgent } from '../supervisor';

describe('supervisor: hierarchical-executor', () => {
  it('runs independent chunks in parallel', async () => {
    const m = new MasterAgent(4);
    const chunks = [
      { id: 'a', title: 'A', run: async () => ({ ok: true, detail: 'a-done' }) },
      { id: 'b', title: 'B', run: async () => ({ ok: true, detail: 'b-done' }) },
    ];
    const res = await m.execute(chunks);
    expect(res.every(r => r.ok)).toBe(true);
    expect(m.getLedger().list().length).toBe(2);
  });
  it('respects dependencies', async () => {
    const m = new MasterAgent(4);
    const order: string[] = [];
    const chunks = [
      { id: 'a', title: 'A', run: async () => { order.push('a'); return { ok: true }; } },
      { id: 'b', title: 'B', dependsOn: ['a'], run: async () => { order.push('b'); return { ok: true }; } },
    ];
    const res = await m.execute(chunks);
    expect(res.every(r => r.ok)).toBe(true);
    expect(order).toEqual(['a', 'b']);
  });
  it('records failures', async () => {
    const m = new MasterAgent(4);
    const chunks = [
      { id: 'a', title: 'A', run: async () => { throw new Error('boom'); } },
    ];
    const res = await m.execute(chunks);
    expect(res[0].ok).toBe(false);
    expect(m.getLedger().get('a')?.status).toBe('failed');
  });
});
