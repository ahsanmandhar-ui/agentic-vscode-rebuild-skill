// src/supervisor/streaming.ts
// Adapted from openai/swarm streaming delimiters (MIT).
export interface StreamChunk {
  delim?: 'start' | 'end';
  agent?: string;
  content?: string;
  response?: unknown;
}

export function startChunk(agent: string): StreamChunk { return { delim: 'start', agent }; }
export function endChunk(agent: string): StreamChunk { return { delim: 'end', agent }; }
export function contentChunk(agent: string, content: string): StreamChunk { return { agent, content }; }

export function formatChunk(c: StreamChunk): string {
  if (c.delim) return JSON.stringify({ delim: c.delim, agent: c.agent });
  if (c.response !== undefined) return JSON.stringify({ response: c.response });
  return JSON.stringify({ agent: c.agent, content: c.content });
}
