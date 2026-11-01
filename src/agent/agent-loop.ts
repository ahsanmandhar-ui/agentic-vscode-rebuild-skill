// src/agent/agent-loop.ts
// Agentic coding loop: model ↔ tools, streaming, multi-step.
// Adapted from Cline/Cursor agent patterns (MIT) + OpenAI function calling.

export interface ToolDef {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (args: any) => Promise<string>;
}

export interface ChatMsg { role: 'system' | 'user' | 'assistant' | 'tool'; content: string; name?: string; tool_call_id?: string; }

export interface ModelCaller {
  // Returns assistant message; may include tool_calls array: [{id, name, arguments}]
  call(messages: ChatMsg[], tools: ToolDef[]): Promise<{ content: string; tool_calls?: { id: string; name: string; arguments: string }[] }>;
}

export interface AgentLoopOptions {
  model: ModelCaller;
  tools: ToolDef[];
  systemPrompt: string;
  maxSteps?: number;
  onText?: (delta: string) => void;
  onTool?: (name: string, args: any) => void;
}

export async function runAgentLoop(userMessage: string, opts: AgentLoopOptions): Promise<string> {
  const messages: ChatMsg[] = [
    { role: 'system', content: opts.systemPrompt },
    { role: 'user', content: userMessage },
  ];
  const maxSteps = opts.maxSteps ?? 20;
  let finalText = '';
  for (let step = 0; step < maxSteps; step++) {
    const res = await opts.model.call(messages, opts.tools);
    if (res.content) { finalText += res.content; opts.onText?.(res.content); }
    if (!res.tool_calls || res.tool_calls.length === 0) {
      messages.push({ role: 'assistant', content: res.content || '' });
      return finalText;
    }
    messages.push({ role: 'assistant', content: res.content || '', tool_calls: res.tool_calls } as any);
    for (const tc of res.tool_calls) {
      let args: any = {};
      try { args = JSON.parse(tc.arguments || '{}'); } catch {}
      opts.onTool?.(tc.name, args);
      const tool = opts.tools.find(t => t.name === tc.name);
      let result = '';
      try {
        result = tool ? await tool.execute(args) : `Unknown tool: ${tc.name}`;
      } catch (e) {
        result = `Error: ${String(e)}`;
      }
      messages.push({ role: 'tool', content: result, name: tc.name, tool_call_id: tc.id });
    }
  }
  return finalText + '\n[max steps reached]';
}
