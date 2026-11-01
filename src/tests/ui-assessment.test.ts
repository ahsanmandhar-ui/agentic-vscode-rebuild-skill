import { describe, it, expect } from 'vitest';
import { checkHtml, runUiAssessment } from '../ui/assessment';
import { runUiSupervisor } from '../ui/ui-supervisor';
import { cssVariables } from '../ui/design-tokens';
import { animationCss } from '../ui/animations';

describe('ui: assessment', () => {
  it('flags empty render', () => {
    const issues = checkHtml('', 'p');
    expect(issues.some(i => i.severity === 'error')).toBe(true);
  });
  it('passes reasonable html', () => {
    const issues = checkHtml('<div role="region" aria-label="x">hi</div>', 'p');
    expect(issues.filter(i => i.severity === 'error').length).toBe(0);
  });
  it('runUiAssessment reports counts', () => {
    const r = runUiAssessment({ a: () => '<div role="x" aria-label="y">ok</div>' });
    expect(r.checks[0].pass).toBe(true);
  });
});

describe('ui: supervisor', () => {
  it('summarizes', () => {
    const r = runUiSupervisor({ a: () => '<div role="x" aria-label="y">ok</div>' });
    expect(r.summary).toContain('panels pass');
  });
});

describe('ui: design tokens', () => {
  it('emits css vars', () => {
    const css = cssVariables();
    expect(css).toContain('--vc-primary');
  });
});

describe('ui: animations', () => {
  it('emits keyframes', () => {
    const css = animationCss();
    expect(css).toContain('@keyframes vc-fade-in');
  });
});
