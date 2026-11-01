// src/ui/diff-review.ts
import { escapeHtml } from '../supervisor';

export function renderDiffReview(diff: string): string {
  const lines = diff.split(/\n/).map(l => {
    if (l.startsWith('+')) return `<div class="diff-add">${escapeHtml(l)}</div>`;
    if (l.startsWith('-')) return `<div class="diff-del">${escapeHtml(l)}</div>`;
    return `<div class="diff-ctx">${escapeHtml(l)}</div>`;
  }).join('');
  return `<div class="vc-diff-review">${lines}</div>`;
}
