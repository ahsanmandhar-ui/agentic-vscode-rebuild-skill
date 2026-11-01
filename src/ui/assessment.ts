// src/ui/assessment.ts
// UI assessment: checks renderers for completeness, accessibility, action wiring.
export interface UiIssue { panel: string; severity: 'error' | 'warning' | 'info'; message: string; }

export interface UiCheck { name: string; pass: boolean; detail?: string; }

export function checkHtml(html: string, panel: string): UiIssue[] {
  const issues: UiIssue[] = [];
  if (!html || html.trim() === '') issues.push({ panel, severity: 'error', message: 'empty render output' });
  if (!/aria-/.test(html)) issues.push({ panel, severity: 'warning', message: 'no ARIA attributes' });
  if (!/role=/.test(html)) issues.push({ panel, severity: 'warning', message: 'no role attributes' });
  if (/<script/.test(html) && !/escapeHtml/.test(html)) issues.push({ panel, severity: 'warning', message: 'potential unescaped HTML' });
  return issues;
}

export function checkActionWiring(html: string, expectedIds: string[]): UiIssue[] {
  const issues: UiIssue[] = [];
  for (const id of expectedIds) {
    if (!html.includes(id)) issues.push({ panel: 'actions', severity: 'warning', message: `missing action id ${id}` });
  }
  return issues;
}

export function runUiAssessment(renderers: Record<string, () => string>, actionIds: string[] = []): { issues: UiIssue[]; checks: UiCheck[] } {
  const issues: UiIssue[] = [];
  const checks: UiCheck[] = [];
  for (const [panel, fn] of Object.entries(renderers)) {
    let html = '';
    try { html = fn(); } catch (e) { issues.push({ panel, severity: 'error', message: `render threw: ${String(e)}` }); checks.push({ name: panel, pass: false, detail: String(e) }); continue; }
    const pi = checkHtml(html, panel);
    issues.push(...pi);
    checks.push({ name: panel, pass: pi.filter(i => i.severity === 'error').length === 0 });
  }
  if (actionIds.length) {
    for (const id of actionIds) {
      // global check
    }
  }
  return { issues, checks };
}
