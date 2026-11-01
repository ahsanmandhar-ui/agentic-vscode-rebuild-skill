// src/agent/openai-model.ts
import { ModelCaller, ChatMsg } from './agent-loop';

export function createOpenAIModelCaller(config: { baseUrl: string; model: string; apiKey?: string }): ModelCaller {
  return {
    async call(messages, tools) {
      const url = `${config.baseUrl.replace(/\/$/, '')}/chat/completions`;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (config.apiKey) headers['Authorization'] = `Bearer ${config.apiKey}`;
      const toolDefs = tools.map(t => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.parameters } }));
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ model: config.model, messages, tools: toolDefs, tool_choice: 'auto', stream: false }),
      });
      if (!res.ok) throw new Error(`model call failed ${res.status}: ${await res.text()}`);
      const json = await res.json();
      const choice = json?.choices?.[0]?.message;
      const content = choice?.content ?? '';
      const tool_calls = (choice?.tool_calls ?? []).map((tc: any) => ({
        id: tc.id,
        name: tc.function?.name,
        arguments: tc.function?.arguments ?? '{}',
      }));
      return { content, tool_calls: tool_calls.length ? tool_calls : undefined };
    },
  };
}
