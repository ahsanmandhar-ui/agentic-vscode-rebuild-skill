import { describe, it, expect } from 'vitest';
import { streamChat } from '../agent/chat';
import { ModelConfigStore } from '../providers/model-config';

describe('agent: chat streaming', () => {
  it('parses SSE chunks', async () => {
    const encoder = new TextEncoder();
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n'));
        controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":" world"}}]}\n\n'));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });
    const mockFetch = async () => ({ ok: true, status: 200, body, text: async () => '' }) as any;
    const chunks: string[] = [];
    const full = await streamChat({ baseUrl: 'http://x/v1', model: 'm' }, [{ role: 'user', content: 'hi' }], (d) => chunks.push(d), mockFetch as any);
    expect(full).toBe('Hello world');
    expect(chunks).toEqual(['Hello', ' world']);
  });
});

describe('providers: model-config', () => {
  it('stores and clears', () => {
    const s = new ModelConfigStore();
    s.set({ provider: 'openai', baseUrl: 'u', model: 'm', apiKey: 'k' });
    expect(s.isConfigured()).toBe(true);
    expect(s.get()?.apiKey).toBe('k');
    s.clear();
    expect(s.isConfigured()).toBe(false);
  });
});
