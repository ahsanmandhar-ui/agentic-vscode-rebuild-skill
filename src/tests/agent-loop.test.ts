import { describe, it, expect } from 'vitest';
import { runAgentLoop } from '../agent/agent-loop';

describe('agent: agent-loop', () => {
  it('returns final text when no tool calls', async () => {
    const model = { async call() { return { content: 'hello' }; } };
    const out = await runAgentLoop('hi', { model, tools: [], systemPrompt: 's', maxSteps: 5 });
    expect(out).toBe('hello');
  });
  it('executes tool calls and loops', async () => {
    let step = 0;
    const model = {
      async call(msgs: any, tools: any) {
        step++;
        if (step === 1) return { content: '', tool_calls: [{ id: '1', name: 't', arguments: '{}' }] };
        return { content: 'done' };
      },
    };
    const tools = [{ name: 't', description: 't', parameters: {}, execute: async () => 'tool result' }];
    const out = await runAgentLoop('hi', { model, tools, systemPrompt: 's', maxSteps: 5 });
    expect(out).toBe('done');
  });
  it('handles tool errors', async () => {
    let step = 0;
    const model = {
      async call() {
        step++;
        if (step === 1) return { content: '', tool_calls: [{ id: '1', name: 'bad', arguments: '{}' }] };
        return { content: 'recovered' };
      },
    };
    const tools = [{ name: 'bad', description: 'bad', parameters: {}, execute: async () => { throw new Error('boom'); } }];
    const out = await runAgentLoop('hi', { model, tools, systemPrompt: 's', maxSteps: 5 });
    expect(out).toBe('recovered');
  });
});
