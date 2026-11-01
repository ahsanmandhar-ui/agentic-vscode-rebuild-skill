// src/supervisor/hierarchical.ts
// Adapted from langgraph-supervisor hierarchical composition (MIT).
import { AgentRegistry } from './registry';
import { Supervisor } from './supervisor';
import { createRoleAgent } from './roleAgent';
import { AgentSpec } from './types';

export interface SubTeam {
  id: string;
  supervisor: Supervisor;
  capabilities: string[];
}

export class MasterSupervisor {
  private registry: AgentRegistry;
  private teams: SubTeam[] = [];

  constructor(registry?: AgentRegistry) {
    this.registry = registry ?? new AgentRegistry();
  }

  registerTeam(team: SubTeam): void { this.teams.push(team); }
  teamsFor(cap: string): SubTeam[] { return this.teams.filter(t => t.capabilities.includes(cap)); }
  getRegistry(): AgentRegistry { return this.registry; }

  // Expose a team's supervisor as an agent-like entry for routing.
  asAgent(team: SubTeam): AgentSpec {
    return createRoleAgent({
      id: `team:${team.id}`,
      role: `Team Supervisor (${team.id})`,
      goal: `Coordinate sub-agents for capabilities: ${team.capabilities.join(', ')}`,
      capabilities: team.capabilities,
    });
  }
}
