// src/supervisor/ledger.ts
// Adapted from microsoft/autogen Magentic-One task ledger + crewAI tasks (MIT).
import { TaskSpec } from './types';

export class TaskLedger {
  private tasks: TaskSpec[] = [];

  add(task: TaskSpec): void { this.tasks.push({ ...task }); }
  get(id: string): TaskSpec | undefined { return this.tasks.find(t => t.id === id); }
  list(): TaskSpec[] { return this.tasks.map(t => ({ ...t })); }
  update(id: string, patch: Partial<TaskSpec>): void {
    const t = this.get(id);
    if (t) Object.assign(t, patch);
  }
  pending(): TaskSpec[] { return this.tasks.filter(t => t.status === 'pending'); }
  clear(): void { this.tasks = []; }
}
