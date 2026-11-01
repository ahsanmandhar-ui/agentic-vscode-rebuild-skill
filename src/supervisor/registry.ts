// src/supervisor/registry.ts
import { AgentSpec } from './types';

export class AgentRegistry {
  private agents = new Map<string, AgentSpec>();

  register(agent: AgentSpec): void {
    if (this.agents.has(agent.id)) throw new Error(`Agent already registered: ${agent.id}`);
    this.agents.set(agent.id, agent);
  }

  unregister(id: string): void { this.agents.delete(id); }
  get(id: string): AgentSpec | undefined { return this.agents.get(id); }
  list(): AgentSpec[] { return [...this.agents.values()]; }

  findByCapability(cap: string): AgentSpec[] {
    return this.list().filter(a => a.capabilities.includes(cap));
  }

  size(): number { return this.agents.size; }
}
