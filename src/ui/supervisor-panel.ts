// src/ui/supervisor-panel.ts
// Pure renderer for the Agent Supervisor panel.
import { escapeHtml } from '../supervisor';

export interface SupervisorPanelArgs {
  tasks?: Array<{ id: string; description: string; status: string; assignee?: string }>;
  activeAgent?: string;
  status?: string;
}

export function renderSupervisorPanel(args: SupervisorPanelArgs = {}): string {
  const tasks = args.tasks ?? [];
  const rows = tasks.map(t =>
    `<tr><td>${escapeHtml(t.id)}</td><td>${escapeHtml(t.description)}</td><td>${escapeHtml(t.status)}</td><td>${escapeHtml(t.assignee ?? '-')}</td></tr>`
  ).join('');
  return [
    '<div class="vc-supervisor-panel">',
    `  <header><h2>Agent Supervisor</h2><span class="status">${escapeHtml(args.status ?? 'idle')}</span></header>`,
    `  <p class="active">Active agent: ${escapeHtml(args.activeAgent ?? 'none')}</p>`,
    '  <table class="tasks"><thead><tr><th>ID</th><th>Task</th><th>Status</th><th>Assignee</th></tr></thead>',
    `  <tbody>${rows}</tbody></table>`,
    '</div>',
  ].join('\n');
}
