// src/supervisor/middleware.ts
// Adapted from microsoft/agent-framework middleware pipeline (MIT).
import { Middleware, SupervisorContext } from './types';

export class MiddlewarePipeline {
  private stack: Middleware[] = [];

  use(mw: Middleware): void { this.stack.push(mw); }
  list(): Middleware[] { return [...this.stack]; }

  async runBefore(ctx: SupervisorContext, agentId: string): Promise<void> {
    for (const mw of this.stack) if (mw.before) await mw.before(ctx, agentId);
  }
  async runAfter(ctx: SupervisorContext, agentId: string, result: unknown): Promise<void> {
    for (const mw of this.stack) if (mw.after) await mw.after(ctx, agentId, result);
  }
  async runError(ctx: SupervisorContext, agentId: string, err: unknown): Promise<void> {
    for (const mw of this.stack) if (mw.onError) await mw.onError(ctx, agentId, err);
  }
}

export function createLoggingMiddleware(log: (msg: string) => void): Middleware {
  return {
    name: 'logging',
    before: async (ctx, agentId) => log(`[supervisor] -> ${agentId} (msgs=${ctx.messages.length})`),
    after: async (_ctx, agentId, result) => log(`[supervisor] <- ${agentId}: ${JSON.stringify(result).slice(0, 120)}`),
    onError: async (_ctx, agentId, err) => log(`[supervisor] !! ${agentId}: ${String(err)}`),
  };
}
