// src/ui/progress-viewer.ts
// Pure HTML renderer for the "Progress" viewer (U4).
export function renderProgressViewer(args: any = {}): string {
  const t = (args && (args.progress || args.content || args.markdown || args.text || args.body)) || '';
  if (!t && !(args && Array.isArray(args.changedFiles)) && !(args && Array.isArray(args.tests))) {
    return '<section class="vc-progress-viewer progress-viewer progress-panel" aria-label="Progress viewer"><div class="vc-empty progress-empty vc-card"><p class="vc-empty-msg progress-empty-msg">No progress recorded yet. Run a task to create progress.md.</p><button type="button" class="vc-btn vc-btn-primary" data-action="vibecode.progress.create">Create progress</button></div></section>';
  }
  const src = typeof t === 'string' ? t : JSON.stringify(t);
  const esc = (v: any) => String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const state = args?.state || args?.status || '';
  const nextAction = args?.nextAction || args?.next || '';
  const changedFiles = Array.isArray(args?.changedFiles) ? args.changedFiles : [];
  const tests = Array.isArray(args?.tests) ? args.tests : [];
  const cf = changedFiles.length ? '<ul class="vc-progress-changed-files changed-files">' + changedFiles.map((f:any)=>'<li class="vc-progress-file">'+esc(f)+'</li>').join('') + '</ul>' : '';
  const ts = tests.length ? '<ul class="vc-progress-tests tests">' + tests.map((x:any)=>'<li class="vc-progress-test">'+esc(x)+'</li>').join('') + '</ul>' : '';
  return '<section class="vc-progress-viewer progress-viewer progress-panel" aria-label="Progress viewer"><header class="vc-progress-viewer__header progress-viewer-header"><h2>Progress</h2></header>' + (state ? '<div class="vc-progress-state progress-state">' + esc(state) + '</div>' : '') + (cf) + (ts) + (nextAction ? '<div class="vc-progress-next progress-next">' + esc(nextAction) + '</div>' : '') + '<pre class="vc-progress-content progress-content">' + esc(src) + '</pre></section>';
}
export default renderProgressViewer;
