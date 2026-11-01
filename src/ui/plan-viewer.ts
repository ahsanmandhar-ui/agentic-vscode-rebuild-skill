// src/ui/plan-viewer.ts
// Pure HTML renderer for the "Plan" viewer (U4).
export function renderPlanViewer(args: any = {}): string {
  const t = (args && (args.plan || args.content || args.markdown || args.text || args.body)) || '';
  if (!t && !(args && Array.isArray(args.sections)) && !(args && Array.isArray(args.phases))) {
    return '<section class="vc-plan-viewer plan-viewer plan-panel" aria-label="Plan viewer"><div class="vc-empty plan-empty vc-card"><p class="vc-empty-msg plan-empty-msg">No plan loaded yet. Create plan.md to track progress.</p><button type="button" class="vc-btn vc-btn-primary" data-action="vibecode.plan.create">Create plan</button></div></section>';
  }
  const src = typeof t === 'string' ? t : JSON.stringify(t);
  const lines = src.split(/\r?\n/);
  const secs = [];
  let cur = null;
  for (const line of lines) {
    const m = line.match(/^(#{1,6})\s+(.+?)\s*$/);
    if (m) { if (cur) secs.push(cur); cur = { title: m[2], body: '' }; }
    else { if (!cur) cur = { title: 'Plan', body: '' }; cur.body += (cur.body ? '\n' : '') + line; }
  }
  if (cur) secs.push(cur);
  if (secs.length === 0) secs.push({ title: 'Plan', body: src });
  const chunks = Array.isArray(args?.chunks) ? args.chunks : [];
  const acceptance = Array.isArray(args?.acceptance) ? args.acceptance : [];
  const esc = (v: any) => String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const rendered = secs.map((s:any) => '<article class="vc-plan-section plan-section vc-card" aria-label="' + esc(s.title) + '"><header class="vc-plan-section__header"><h3 class="vc-plan-section__title">' + esc(s.title) + '</h3></header>' + (s.body.trim() ? '<pre class="vc-plan-section__body plan-section-body">' + esc(s.body.trim()) + '</pre>' : '') + '</article>').join('\n');
  return '<section class="vc-plan-viewer plan-viewer plan-panel" aria-label="Plan viewer"><header class="vc-plan-viewer__header plan-viewer-header"><h2>Plan</h2></header>' + (chunks.length ? '<ul class="vc-plan-chunks plan-chunks">' + chunks.map((c:any)=>'<li class="vc-plan-chunk">'+esc(c)+'</li>').join('') + '</ul>' : '') + (acceptance.length ? '<ul class="vc-plan-acceptance plan-acceptance">' + acceptance.map((x:any)=>'<li class="vc-plan-acceptance-item">'+esc(x)+'</li>').join('') + '</ul>' : '') + '<div class="vc-plan-sections plan-sections">' + rendered + '</div></section>';
}
export default renderPlanViewer;
