// src/supervisor/context.ts
import { SupervisorContext } from './types';

export function createContext(initial: Partial<SupervisorContext> = {}): SupervisorContext {
  return {
    variables: initial.variables ?? {},
    messages: initial.messages ?? [],
    tasks: initial.tasks ?? [],
  };
}

export function addMessage(ctx: SupervisorContext, role: string, content: string, from?: string): void {
  ctx.messages.push({ role, content, from });
}

export function setVariable(ctx: SupervisorContext, key: string, value: unknown): void {
  ctx.variables[key] = value;
}

export function getVariable(ctx: SupervisorContext, key: string): unknown {
  return ctx.variables[key];
}
