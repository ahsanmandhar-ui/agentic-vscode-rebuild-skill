// src/supervisor/types.ts
// Adapted patterns from openai/swarm, langchain-ai/langgraph-supervisor-py,
// crewAIInc/crewAI, microsoft/agent-framework (all MIT). See THIRD_PARTY_NOTICES.md.

export interface ToolSpec {
  name: string;
  description: string;
  parameters?: Record<string, unknown>;
  execute: (args: Record<string, unknown>, ctx: SupervisorContext) => Promise<unknown>;
}

export interface AgentSpec {
  id: string;
  role: string;
  goal: string;
  backstory?: string;
  tools: ToolSpec[];
  capabilities: string[];
  model?: string;
}

export interface TaskSpec {
  id: string;
  description: string;
  expectedOutput?: string;
  assignee?: string;
  status: 'pending' | 'running' | 'done' | 'failed' | 'blocked';
  result?: unknown;
  error?: string;
}

export interface SupervisorContext {
  variables: Record<string, unknown>;
  messages: Array<{ role: string; content: string; from?: string }>;
  tasks: TaskSpec[];
}

export type SupervisorDecision =
  | { kind: 'delegate'; agentId: string; task: string }
  | { kind: 'forward'; agentId: string }
  | { kind: 'finish'; output: string }
  | { kind: 'askHuman'; question: string };

export interface HandoffResult {
  value: unknown;
  nextAgent?: string;
  contextUpdates?: Record<string, unknown>;
}

export interface Middleware {
  name: string;
  before?: (ctx: SupervisorContext, agentId: string) => Promise<void> | void;
  after?: (ctx: SupervisorContext, agentId: string, result: unknown) => Promise<void> | void;
  onError?: (ctx: SupervisorContext, agentId: string, err: unknown) => Promise<void> | void;
}
