// src/supervisor/roleAgent.ts
// Adapted from crewAI role-based agents (MIT).
import { AgentSpec, ToolSpec } from './types';

export interface RoleInput {
  id: string;
  role: string;
  goal: string;
  backstory?: string;
  tools?: ToolSpec[];
  capabilities?: string[];
  model?: string;
}

export function createRoleAgent(input: RoleInput): AgentSpec {
  return {
    id: input.id,
    role: input.role,
    goal: input.goal,
    backstory: input.backstory,
    tools: input.tools ?? [],
    capabilities: input.capabilities ?? [],
    model: input.model,
  };
}

export function buildSystemPrompt(agent: AgentSpec): string {
  const parts: string[] = [];
  parts.push(`You are ${agent.role}.`);
  parts.push(`Goal: ${agent.goal}.`);
  if (agent.backstory) parts.push(`Backstory: ${agent.backstory}`);
  if (agent.tools.length) parts.push(`Available tools: ${agent.tools.map(t => t.name).join(', ')}.`);
  return parts.join('\n');
}
