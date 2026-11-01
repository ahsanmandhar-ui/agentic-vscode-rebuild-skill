// src/supervisor/flow.ts
// Adapted from crewAI Flows + microsoft/agent-framework workflow DAG (MIT).

export interface FlowStep {
  id: string;
  dependsOn?: string[];
  run: (ctx: Record<string, unknown>) => Promise<unknown> | unknown;
}

export interface FlowResult {
  outputs: Record<string, unknown>;
  order: string[];
  errors: Record<string, string>;
}

export class Flow {
  private steps: FlowStep[] = [];

  add(step: FlowStep): void { this.steps.push(step); }

  async run(initial: Record<string, unknown> = {}): Promise<FlowResult> {
    const ctx: Record<string, unknown> = { ...initial };
    const outputs: Record<string, unknown> = {};
    const errors: Record<string, string> = {};
    const done = new Set<string>();
    const order: string[] = [];

    // topological execution with parallel batches
    while (done.size < this.steps.length) {
      const batch = this.steps.filter(s =>
        !done.has(s.id) &&
        (s.dependsOn ?? []).every(d => done.has(d)) &&
        (s.dependsOn ?? []).every(d => !(d in errors)) &&
        !(s.id in errors)
      );
      if (batch.length === 0) {
        // deadlock or all failed
        for (const s of this.steps) if (!done.has(s.id) && !(s.id in errors)) errors[s.id] = 'dependency not satisfied';
        break;
      }
      await Promise.all(batch.map(async s => {
        try {
          const r = await s.run(ctx);
          outputs[s.id] = r;
          ctx[s.id] = r;
        } catch (e) {
          errors[s.id] = String(e);
        } finally {
          done.add(s.id);
          order.push(s.id);
        }
      }));
    }
    return { outputs, order, errors };
  }
}
