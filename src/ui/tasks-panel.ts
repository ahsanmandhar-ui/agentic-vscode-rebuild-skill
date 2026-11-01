// src/ui/tasks-panel.ts
// Pure HTML renderer for the "Tasks" panel (U11).

import { renderPlanViewer } from './plan-viewer';

export interface TaskItem {
  id?: string;
  title?: string;
  name?: string;
  status?: string;
  state?: string;
  branch?: string;
  description?: string;
  [key: string]: unknown;
}

export interface CheckpointItem {
  id?: string;
  name?: string;
  label?: string;
  createdAt?: string;
  ts?: string;
  [key: string]: unknown;
}

export interface DiffItem {
  id?: string;
  title?: string;
  branch?: string;
  from?: string;
  to?: string;
  diff?: string;
  patch?: string;
  content?: string;
  lines?: string[];
  [key: string]: unknown;
}

export interface RenderTasksPanelArgs {
  tasks?: TaskItem[] | null;
  items?: TaskItem[] | null;
  list?: TaskItem[] | null;
  plan?: unknown;
  planContent?: unknown;
  markdown?: unknown;
  content?: unknown;
  text?: unknown;
  body?: unknown;
  checkpoints?: CheckpointItem[] | null;
  diffs?: DiffItem[] | null;
  diff?: unknown;
  patch?: unknown;
  branches?: string[] | null;
  executeBranches?: string[] | null;
  emptyMessage?: string;
  [key: string]: unknown;
}

const esc = (v: unknown): string =>
  String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function statusOf(t: TaskItem): string {
  const s = String(t?.status ?? t?.state ?? '').toLowerCase();
  if (s === 'running' || s === 'in_progress' || s === 'in-progress' || s === 'active') return 'running';
  if (s === 'completed' || s === 'done' || s === 'success' || s === 'succeeded') return 'completed';
  if (s === 'failed' || s === 'error' || s === 'errored') return 'failed';
  if (s === 'pending' || s === '') return 'pending';
  return s || 'pending';
}

function taskTitle(t: TaskItem, i: number): string {
  return String(t?.title ?? t?.name ?? t?.id ?? `task-${i}`);
}

function taskId(t: TaskItem, i: number): string {
  return String(t?.id ?? `task-${i}`);
}

function renderTaskItem(t: TaskItem, i: number): string {
  const id = taskId(t, i);
  const title = taskTitle(t, i);
  const status = statusOf(t);
  const branch = t?.branch ? String(t.branch) : '';
  const desc = t?.description ? String(t.description) : '';
  return [
    '<li class="vc-task-item task-item task-' + esc(status) + '" data-task-id="' + esc(id) + '" data-status="' + esc(status) + '" aria-label="' + esc(title) + ' ' + esc(status) + '">',
    '  <span class="vc-task-status task-status task-status--' + esc(status) + '" role="status">' + esc(status) + '</span>',
    '  <span class="vc-task-title task-title">' + esc(title) + '</span>',
    branch ? '  <span class="vc-task-branch task-branch">' + esc(branch) + '</span>' : '',
    desc ? '  <span class="vc-task-desc task-desc">' + esc(desc) + '</span>' : '',
    '</li>',
  ].filter(Boolean).join('\\n');
}

function groupTasks(tasks: TaskItem[]): { running: TaskItem[]; completed: TaskItem[]; failed: TaskItem[]; other: TaskItem[] } {
  const groups = { running: [] as TaskItem[], completed: [] as TaskItem[], failed: [] as TaskItem[], other: [] as TaskItem[] };
  tasks.forEach((t) => {
    const s = statusOf(t);
    if (s === 'running') groups.running.push(t);
    else if (s === 'completed') groups.completed.push(t);
    else if (s === 'failed') groups.failed.push(t);
    else groups.other.push(t);
  });
  return groups;
}
function renderTaskList(tasks: TaskItem[]): string {
  if (tasks.length === 0) {
    return '<div class="vc-task-list-empty task-list-empty vc-card"><p class="vc-empty-msg">No tasks yet.</p></div>';
  }
  const g = groupTasks(tasks);
  const section = (label: string, items: TaskItem[]) => {
    if (items.length === 0) return '';
    return [
      '<section class="vc-task-group task-group task-group--' + esc(label.toLowerCase()) + '" aria-label="' + esc(label) + ' tasks">',
      '  <h3 class="vc-task-group__title task-group-title">' + esc(label) + ' (' + items.length + ')</h3>',
      '  <ul class="vc-task-group__list task-group-list">',
      items.map(renderTaskItem).join('\\n'),
      '  </ul>',
      '</section>',
    ].join('\\n');
  };
  return [
    '<div class="vc-task-list task-list" role="region" aria-live="polite" aria-label="Task list">',
    section('Running', g.running),
    section('Completed', g.completed),
    section('Failed', g.failed),
    section('Other', g.other),
    '</div>',
  ].filter((x) => x.trim() !== '').join('\\n');
}

function renderCheckpoints(checkpoints: CheckpointItem[]): string {
  if (checkpoints.length === 0) {
    return '<div class="vc-checkpoint-empty checkpoint-empty vc-card"><p class="vc-empty-msg">No checkpoints saved yet.</p></div>';
  }
  const items = checkpoints.map((cp, i) => {
    const id = String(cp?.id ?? `cp-${i}`);
    const label = String(cp?.label ?? cp?.name ?? id);
    const ts = String(cp?.createdAt ?? cp?.ts ?? '');
    return [
      '<li class="vc-checkpoint-item checkpoint-item" data-checkpoint-id="' + esc(id) + '">',
      '  <span class="vc-checkpoint-label checkpoint-label">' + esc(label) + '</span>',
      ts ? '  <span class="vc-checkpoint-ts checkpoint-ts">' + esc(ts) + '</span>' : '',
      '  <button type="button" class="vc-btn vc-checkpoint-restore checkpoint-restore" data-action="vibecode.checkpoint.restore" data-checkpoint-id="' + esc(id) + '" aria-label="Restore checkpoint ' + esc(label) + '">Restore</button>',
      '</li>',
    ].filter(Boolean).join('\\n');
  }).join('\\n');
  return [
    '<section class="vc-checkpoint-panel checkpoint-panel" aria-label="Checkpoints">',
    '  <header class="vc-checkpoint-panel__header checkpoint-header"><h2>Checkpoints</h2></header>',
    '  <ul class="vc-checkpoint-list checkpoint-list">',
    items,
    '  </ul>',
    '  <button type="button" class="vc-btn vc-checkpoint-save checkpoint-save" data-action="vibecode.checkpoint.save" aria-label="Save checkpoint">Save checkpoint</button>',
    '</section>',
  ].join('\\n');
}

function normalizeDiffText(d: DiffItem | unknown): string {
  if (typeof d === 'string') return d;
  const o = d as any;
  if (o && typeof o === 'object') {
    if (typeof o.diff === 'string') return o.diff;
    if (typeof o.patch === 'string') return o.patch;
    if (typeof o.content === 'string') return o.content;
    if (Array.isArray(o.lines)) return o.lines.join('\\n');
  }
  return '';
}

function renderDiffViewer(diffs: DiffItem[], branches: string[]): string {
  const branchList = branches.length
    ? '<ul class="vc-branch-list branch-list">' + branches.map((b) => '<li class="vc-branch-item branch-item">' + esc(b) + '</li>').join('') + '</ul>'
    : '';
  if (diffs.length === 0 && branches.length === 0) {
    return '<section class="vc-diff-viewer diff-viewer" aria-label="Diff viewer"><div class="vc-empty diff-empty vc-card"><p class="vc-empty-msg">No diffs to display.</p></div></section>';
  }
  const diffBlocks = diffs.map((d, i) => {
    const title = String(d?.title ?? d?.branch ?? d?.id ?? `diff-${i}`);
    const from = d?.from ? String(d.from) : '';
    const to = d?.to ? String(d.to) : '';
    const text = normalizeDiffText(d);
    return [
      '<article class="vc-diff-block diff-block vc-card" aria-label="' + esc(title) + '">',
      '  <header class="vc-diff-block__header diff-header"><h3 class="vc-diff-title diff-title">' + esc(title) + '</h3>' + (from && to ? '<span class="vc-diff-range diff-range">' + esc(from) + ' to ' + esc(to) + '</span>' : '') + '</header>',
      '  <pre class="vc-diff-content diff-content" aria-label="diff">' + esc(text) + '</pre>',
      '</article>',
    ].join('\\n');
  }).join('\\n');
  return [
    '<section class="vc-diff-viewer diff-viewer" aria-label="Diff viewer">',
    '  <header class="vc-diff-viewer__header diff-viewer-header"><h2>Diff viewer</h2></header>',
    branchList,
    diffBlocks,
    '</section>',
  ].join('\\n');
}

export function renderTasksPanel(args: RenderTasksPanelArgs = {}): string {
  const tasks = Array.isArray(args?.tasks)
    ? args.tasks
    : Array.isArray(args?.items)
      ? args.items
      : Array.isArray(args?.list)
        ? args.list
        : [];

  const planArgs = {
    plan: args?.plan ?? args?.planContent ?? args?.markdown ?? args?.content ?? args?.text ?? args?.body,
    chunks: Array.isArray(args?.chunks) ? args.chunks : undefined,
    acceptance: Array.isArray(args?.acceptance) ? args.acceptance : undefined,
  };

  const checkpoints = Array.isArray(args?.checkpoints) ? args.checkpoints : [];
  const diffs = (Array.isArray(args?.diffs)
    ? args.diffs
    : (args?.diff || args?.patch)
      ? [{ diff: args?.diff ?? args?.patch }]
      : []) as DiffItem[];
  const branches = Array.isArray(args?.branches)
    ? args.branches.map(String)
    : Array.isArray(args?.executeBranches)
      ? args.executeBranches.map(String)
      : [];

  const emptyMessage = String(args?.emptyMessage ?? 'No tasks running yet. Start a task to see progress.');

  const taskListHtml = tasks.length === 0
    ? '<div class="vc-empty task-empty vc-card"><p class="vc-empty-msg task-empty-msg">' + esc(emptyMessage) + '</p><button type="button" class="vc-btn vc-btn-primary" data-action="vibecode.agent.run">Start task</button></div>'
    : renderTaskList(tasks);

  const planHtml = renderPlanViewer(planArgs as any);
  const checkpointHtml = renderCheckpoints(checkpoints);
  const diffHtml = renderDiffViewer(diffs, branches);

  return [
    '<section class="vc-tasks-panel tasks-panel" aria-label="Tasks panel">',
    '  <header class="vc-tasks-panel__header tasks-header"><h2>Tasks</h2></header>',
    '  <div class="vc-tasks-list-section tasks-list-section">',
    '    <h3 class="vc-tasks-section-title">Task list</h3>',
    taskListHtml,
    '  </div>',
    '  <div class="vc-tasks-plan-section tasks-plan-section">',
    '    <h3 class="vc-tasks-section-title">Plan</h3>',
    planHtml,
    '  </div>',
    '  <div class="vc-tasks-checkpoint-section tasks-checkpoint-section">',
    checkpointHtml,
    '  </div>',
    '  <div class="vc-tasks-diff-section tasks-diff-section">',
    diffHtml,
    '  </div>',
    '</section>',
  ].join('\\n');
}

export default renderTasksPanel;

