// src/tests/supervisor.test.ts
import { describe, it, expect } from 'vitest';
import {
  AgentRegistry, createRoleAgent, buildSystemPrompt, MiddlewarePipeline,
  createLoggingMiddleware, Supervisor, createContext, TaskLedger,
  makeHandoffResult, applyHandoff, forwardMessage,
} from '../supervisor';

describe('supervisor: registry', () => {
  it('registers and looks up agents', () => {
    const r = new AgentRegistry();
    const a = createRoleAgent({ id: 'a', role: 'Researcher', goal: 'research', capabilities: ['search'] });
    r.register(a);
    expect(r.get('a')?.role).toBe('Researcher');
    expect(r.findByCapability('search').length).toBe(1);
    expect(r.size()).toBe(1);
  });
  it('throws on duplicate register', () => {
    const r = new AgentRegistry();
    const a = createRoleAgent({ id: 'a', role: 'R', goal: 'g' });
    r.register(a);
    expect(() => r.register(a)).toThrow();
  });
});

describe('supervisor: role agent prompt', () => {
  it('builds system prompt from role/goal/backstory/tools', () => {
    const a = createRoleAgent({ id: 'x', role: 'Coder', goal: 'write code', backstory: 'expert', tools: [{ name: 'run', description: 'run code', execute: async () => 'ok' }], capabilities: [] });
    const p = buildSystemPrompt(a);
    expect(p).toContain('Coder');
    expect(p).toContain('write code');
    expect(p).toContain('expert');
    expect(p).toContain('run');
  });
});

describe('supervisor: middleware', () => {
  it('runs before/after hooks', async () => {
    const mw = new MiddlewarePipeline();
    const calls: string[] = [];
    mw.use({ name: 't', before: async () => { calls.push('before'); }, after: async () => { calls.push('after'); } });
    const ctx = createContext();
    await mw.runBefore(ctx, 'a');
    await mw.runAfter(ctx, 'a', 'res');
    expect(calls).toEqual(['before', 'after']);
  });
});

describe('supervisor: handoff', () => {
  it('applies handoff context updates and value', () => {
    const ctx = createContext();
    const h = makeHandoffResult('done', 'b', { foo: 42 });
    applyHandoff(ctx, h);
    expect(ctx.variables.foo).toBe(42);
    expect(ctx.messages.length).toBe(1);
  });
  it('forwardMessage returns last message from agent', () => {
    const ctx = createContext();
    ctx.messages.push({ role: 'assistant', content: 'hi', from: 'w' });
    expect(forwardMessage(ctx, 'w')).toBe('hi');
    expect(forwardMessage(ctx, 'x')).toBeUndefined();
  });
});

describe('supervisor: ledger', () => {
  it('tracks tasks', () => {
    const l = new TaskLedger();
    l.add({ id: 't1', description: 'do thing', status: 'pending' });
    expect(l.pending().length).toBe(1);
    l.update('t1', { status: 'done', result: 'ok' });
    expect(l.get('t1')?.status).toBe('done');
  });
});

describe('supervisor: supervisor loop', () => {
  it('delegates then finishes', async () => {
    const registry = new AgentRegistry();
    const agent = createRoleAgent({ id: 'worker', role: 'Worker', goal: 'work', capabilities: ['work'] });
    registry.register(agent);

    let step = 0;
    const sup = new Supervisor({
      registry,
      maxSteps: 5,
      decide: async (ctx) => {
        step++;
        if (step === 1) return { kind: 'delegate', agentId: 'worker', task: 'do it' };
        return { kind: 'finish', output: 'all done' };
      },
      runAgent: async (_agent, task) => `result: ${task}`,
    });

    const ctx = await sup.run('start');
    expect(ctx.messages.some(m => m.content === 'all done')).toBe(true);
  });

  it('handles unknown agent', async () => {
    const registry = new AgentRegistry();
    const sup = new Supervisor({
      registry,
      decide: async () => ({ kind: 'delegate', agentId: 'nope', task: 'x' }),
      runAgent: async () => 'x',
    });
    const ctx = await sup.run('start');
    expect(ctx.messages.some(m => m.content.includes('Unknown agent'))).toBe(true);
  });

  it('applies handoff from agent result', async () => {
    const registry = new AgentRegistry();
    const agent = createRoleAgent({ id: 'w', role: 'W', goal: 'g', capabilities: [] });
    registry.register(agent);
    const sup = new Supervisor({
      registry,
      decide: async (ctx) => {
        if (ctx.messages.length <= 1) return { kind: 'delegate', agentId: 'w', task: 't' };
        return { kind: 'finish', output: 'finished' };
      },
      runAgent: async () => makeHandoffResult('forwarded-value', undefined, { k: 7 }),
    });
    const ctx = await sup.run('go');
    expect(ctx.variables.k).toBe(7);
  });
});
