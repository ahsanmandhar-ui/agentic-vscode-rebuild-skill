// src/supervisor/tracing.ts
// Adapted from OpenAI Agents SDK tracing (MIT).
export interface Span { id: string; name: string; start: number; end?: number; parent?: string; attrs: Record<string, unknown>; }

export class Tracer {
  private spans: Span[] = [];
  private stack: string[] = [];

  start(name: string, attrs: Record<string, unknown> = {}): string {
    const id = `span-${this.spans.length + 1}`;
    const parent = this.stack.length ? this.stack[this.stack.length - 1] : undefined;
    this.spans.push({ id, name, start: Date.now(), parent, attrs });
    this.stack.push(id);
    return id;
  }
  end(id: string, attrs?: Record<string, unknown>): void {
    const s = this.spans.find(x => x.id === id);
    if (s) { s.end = Date.now(); if (attrs) Object.assign(s.attrs, attrs); }
    const idx = this.stack.lastIndexOf(id);
    if (idx >= 0) this.stack.splice(idx, 1);
  }
  async run<T>(name: string, fn: () => Promise<T> | T, attrs?: Record<string, unknown>): Promise<T> {
    const id = this.start(name, attrs ?? {});
    try {
      const r = await fn();
      this.end(id, { status: 'ok' });
      return r;
    } catch (e) {
      this.end(id, { status: 'error', error: String(e) });
      throw e;
    }
  }
  spans_list(): Span[] { return this.spans.map(s => ({ ...s })); }
  clear(): void { this.spans = []; this.stack = []; }
}
