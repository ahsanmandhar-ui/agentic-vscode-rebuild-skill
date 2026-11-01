// src/system/history.ts
// Bounded history (turnsByPanel cap) for chat/panel state.

export interface BoundedHistoryOptions { maxTurns?: number; maxPerPanel?: number; }

export class BoundedHistory<T = unknown> {
  private byPanel: Map<string, T[]> = new Map();
  private maxTurns: number;
  constructor(options: BoundedHistoryOptions | number = {}) {
    if (typeof options === 'number') this.maxTurns = options;
    else this.maxTurns = (options as BoundedHistoryOptions).maxTurns ?? (options as any).maxPerPanel ?? 50;
  }
  push(panel: string, item: T): void {
    const arr = this.byPanel.get(panel) ?? [];
    arr.push(item);
    while (arr.length > this.maxTurns) arr.shift();
    this.byPanel.set(panel, arr);
  }
  get(panel: string): T[] { return [...(this.byPanel.get(panel) ?? [])]; }
  clear(panel?: string): void {
    if (panel) this.byPanel.delete(panel); else this.byPanel.clear();
  }
  size(panel?: string): number {
    if (panel) return this.byPanel.get(panel)?.length ?? 0;
    let n = 0; for (const a of this.byPanel.values()) n += a.length; return n;
  }
  panels(): string[] { return [...this.byPanel.keys()]; }
}

export const turnsByPanel = new Map<string, number>();
export function capTurns(panel: string, turns: any[], cap: number = 50): any[] {
  const out = Array.isArray(turns) ? [...turns] : [];
  while (out.length > cap) out.shift();
  turnsByPanel.set(panel, out.length);
  return out;
}

export default BoundedHistory;