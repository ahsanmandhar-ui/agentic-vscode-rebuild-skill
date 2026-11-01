// src/ui/context-viewer.ts
export function renderContextViewer(args: any = {}): string {
  const esc = (v: any) => String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const plan = args?.plan ?? args?.planContent ?? args?.planMarkdown ?? args?.planText ?? '';
  const progress = args?.progress ?? args?.progressContent ?? args?.progressMarkdown ?? args?.progressText ?? '';
  const structure = args?.structure ?? args?.structureContent ?? args?.structureMarkdown ?? args?.structureText ?? '';
  const drift = Array.isArray(args?.drift) ? args.drift : Array.isArray(args?.warnings) ? args.warnings : Array.isArray(args?.driftWarnings) ? args.driftWarnings : [];
  const planHtml = plan ? `<pre class="vc-context-plan plan-content context-plan" aria-label="Plan content" role="region">${esc(typeof plan==='string'?plan:JSON.stringify(plan))}</pre>` : '<div class="vc-empty context-plan-empty vc-card"><p class="vc-empty-msg">No plan loaded.</p></div>';
  const progressHtml = progress ? `<pre class="vc-context-progress progress-content context-progress" aria-label="Progress content" role="region">${esc(typeof progress==='string'?progress:JSON.stringify(progress))}</pre>` : '<div class="vc-empty context-progress-empty vc-card"><p class="vc-empty-msg">No progress recorded.</p></div>';
  const structureHtml = structure ? `<pre class="vc-context-structure structure-content context-structure" aria-label="Structure content" role="region">${esc(typeof structure==='string'?structure:JSON.stringify(structure))}</pre>` : '<div class="vc-empty context-structure-empty vc-card"><p class="vc-empty-msg">No structure recorded.</p></div>';
  const driftHtml = drift.length ? '<ul class="vc-context-drift drift-warnings context-drift" role="list" aria-label="Drift warnings">' + drift.map((w:any,i:number) => `<li class="vc-context-drift-item drift-item context-drift-item">${esc(typeof w==='string'?w:JSON.stringify(w))}</li>`).join('') + '</ul>' : '<div class="vc-empty context-drift-empty vc-card"><p class="vc-empty-msg">No drift detected.</p></div>';
  return [
    `<section class="vc-context-viewer context-viewer" aria-label="Context viewer">`,
    `  <header class="vc-context-viewer__header context-viewer-header"><h2>Context</h2></header>`,
    `  <div class="vc-context-plan-section context-plan-section" aria-label="Plan"><h3>Plan</h3>${planHtml}</div>`,
    `  <div class="vc-context-progress-section context-progress-section" aria-label="Progress"><h3>Progress</h3>${progressHtml}</div>`,
    `  <div class="vc-context-structure-section context-structure-section" aria-label="Structure"><h3>Structure</h3>${structureHtml}</div>`,
    `  <div class="vc-context-drift-section context-drift-section" aria-label="Drift"><h3>Drift</h3>${driftHtml}</div>`,
    `</section>`,
  ].join('\n');
}
export default renderContextViewer;
