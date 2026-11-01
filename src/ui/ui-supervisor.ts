// src/ui/ui-supervisor.ts
import { runUiAssessment, UiIssue } from './assessment';

export interface UiSupervisorReport {
  issues: UiIssue[];
  summary: string;
  passCount: number;
  failCount: number;
}

export function runUiSupervisor(renderers: Record<string, () => string>): UiSupervisorReport {
  const { issues, checks } = runUiAssessment(renderers);
  const passCount = checks.filter(c => c.pass).length;
  const failCount = checks.length - passCount;
  const summary = `UI assessment: ${passCount}/${checks.length} panels pass, ${issues.length} issues found.`;
  return { issues, summary, passCount, failCount };
}
