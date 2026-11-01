// src/agent/chat.ts
// OpenAI-compatible streaming chat (works for OpenAI, Azure, Ollama, LM Studio, vLLM, etc.)
export interface ChatMessage { role: 'system' | 'user' | 'assistant'; content: string; }

export interface ChatConfig {
  baseUrl: string;
  model: string;
  apiKey?: string;
}

export async function streamChat(
  config: ChatConfig,
  messages: ChatMessage[],
  onChunk: (delta: string) => void,
  fetchImpl: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<string> {
  const url = `${config.baseUrl.replace(/\/$/, '')}/chat/completions`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (config.apiKey) headers['Authorization'] = `Bearer ${config.apiKey}`;
  const res = await fetchImpl(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ model: config.model, messages, stream: true }),
    signal,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`chat failed ${res.status}: ${text}`);
  }
  const reader = res.body?.getReader();
  if (!reader) throw new Error('no response body');
  const decoder = new TextDecoder();
  let full = '';
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const data = trimmed.slice(5).trim();
      if (data === '[DONE]') continue;
      try {
        const json = JSON.parse(data);
        const delta = json?.choices?.[0]?.delta?.content;
        if (delta) { full += delta; onChunk(delta); }
      } catch { /* ignore partial */ }
    }
  }
  return full;
}
