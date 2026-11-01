// src/supervisor/handoff.ts
// Adapted from openai/swarm + langchain-ai/langgraph-supervisor-py (MIT).
import { HandoffResult, SupervisorContext } from './types';

export function makeHandoffResult(value: unknown, nextAgent?: string, contextUpdates?: Record<string, unknown>): HandoffResult {
  return { value, nextAgent, contextUpdates };
}

export function applyHandoff(ctx: SupervisorContext, h: HandoffResult): void {
  if (h.contextUpdates) {
    for (const [k, v] of Object.entries(h.contextUpdates)) ctx.variables[k] = v;
  }
  if (h.value !== undefined) {
    ctx.messages.push({ role: 'assistant', content: typeof h.value === 'string' ? h.value : JSON.stringify(h.value) });
  }
}

export function forwardMessage(ctx: SupervisorContext, agentId: string): string | undefined {
  // Return the last message produced by agentId without re-summarization.
  for (let i = ctx.messages.length - 1; i >= 0; i--) {
    const m = ctx.messages[i];
    if (m.from === agentId) return m.content;
  }
  return undefined;
}
