import { describe, it, expect } from 'vitest';
import { Flow, MasterSupervisor, startChunk, endChunk, formatChunk } from '../supervisor';

describe('supervisor: flow', () => {
  it('runs steps in dependency order', async () => {
    const f = new Flow();
    f.add({ id: 'a', run: async () => 1 });
    f.add({ id: 'b', dependsOn: ['a'], run: async (ctx) => (ctx.a as number) + 1 });
    const r = await f.run();
    expect(r.outputs.a).toBe(1);
    expect(r.outputs.b).toBe(2);
    expect(Object.keys(r.errors).length).toBe(0);
  });
  it('records errors without crashing', async () => {
    const f = new Flow();
    f.add({ id: 'a', run: async () => { throw new Error('boom'); } });
    f.add({ id: 'b', dependsOn: ['a'], run: async () => 2 });
    const r = await f.run();
    expect(r.errors.a).toContain('boom');
    expect(r.outputs.b).toBeUndefined();
  });
});

describe('supervisor: hierarchical', () => {
  it('registers teams and filters by capability', () => {
    const m = new MasterSupervisor();
    m.registerTeam({ id: 't1', supervisor: {} as any, capabilities: ['code'] });
    m.registerTeam({ id: 't2', supervisor: {} as any, capabilities: ['search'] });
    expect(m.teamsFor('code').length).toBe(1);
    expect(m.asAgent(m.teamsFor('code')[0]).id).toBe('team:t1');
  });
});

describe('supervisor: streaming', () => {
  it('formats chunks', () => {
    expect(formatChunk(startChunk('a'))).toContain('start');
    expect(formatChunk(endChunk('a'))).toContain('end');
  });
});
