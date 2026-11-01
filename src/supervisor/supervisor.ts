// src/supervisor/supervisor.ts
import { AgentRegistry } from './registry';
import { MiddlewarePipeline } from './middleware';
import { createContext, addMessage } from './context';
import { applyHandoff, forwardMessage } from './handoff';
import {
  AgentSpec, SupervisorContext, SupervisorDecision, TaskSpec, HandoffResult,
} from './types';

export interface SupervisorOptions {
  registry: AgentRegistry;
  middleware?: MiddlewarePipeline;
  maxSteps?: number;
  decide: (ctx: SupervisorContext, registry: AgentRegistry) => Promise<SupervisorDecision>;
  runAgent: (agent: AgentSpec, task: string, ctx: SupervisorContext) => Promise<unknown>;
}

export class Supervisor {
  private registry: AgentRegistry;
  private middleware: MiddlewarePipeline;
  private maxSteps: number;
  private decide: SupervisorOptions['decide'];
  private runAgent: SupervisorOptions['runAgent'];

  constructor(opts: SupervisorOptions) {
    this.registry = opts.registry;
    this.middleware = opts.middleware ?? new MiddlewarePipeline();
    this.maxSteps = opts.maxSteps ?? 20;
    this.decide = opts.decide;
    this.runAgent = opts.runAgent;
  }

  async run(initialTask: string, initialCtx?: Partial<SupervisorContext>): Promise<SupervisorContext> {
    const ctx = createContext(initialCtx ?? {});
    addMessage(ctx, 'user', initialTask);

    let steps = 0;
    while (steps < this.maxSteps) {
      steps++;
      const decision = await this.decide(ctx, this.registry);

      if (decision.kind === 'finish') {
        addMessage(ctx, 'assistant', decision.output);
        return ctx;
      }
      if (decision.kind === 'askHuman') {
        addMessage(ctx, 'assistant', `HUMAN_INPUT_REQUIRED: ${decision.question}`);
        return ctx;
      }
      if (decision.kind === 'forward') {
        const out = forwardMessage(ctx, decision.agentId);
        if (out !== undefined) addMessage(ctx, 'assistant', out);
        return ctx;
      }
      // delegate
      const agent = this.registry.get(decision.agentId);
      if (!agent) {
        addMessage(ctx, 'assistant', `Unknown agent: ${decision.agentId}`);
        return ctx;
      }
      await this.middleware.runBefore(ctx, agent.id);
      let result: unknown;
      try {
        result = await this.runAgent(agent, decision.task, ctx);
      } catch (e) {
        await this.middleware.runError(ctx, agent.id, e);
        addMessage(ctx, 'assistant', `Agent ${agent.id} failed: ${String(e)}`);
        return ctx;
      }
      await this.middleware.runAfter(ctx, agent.id, result);

      // If agent returned a handoff, apply it.
      if (result && typeof result === 'object' && 'nextAgent' in (result as any)) {
        applyHandoff(ctx, result as HandoffResult);
      } else {
        addMessage(ctx, 'assistant', typeof result === 'string' ? result : JSON.stringify(result), agent.id);
        // tag last message from
        const last = ctx.messages[ctx.messages.length - 1];
        if (last) last.from = agent.id;
      }
    }
    addMessage(ctx, 'assistant', 'Max steps reached.');
    return ctx;
  }
}
