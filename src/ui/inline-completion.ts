// src/ui/inline-completion.ts
import { escapeHtml } from '../supervisor';

export function renderGhostText(text: string): string {
  return `<span class="vc-ghost" style="opacity:.5;font-style:italic;">${escapeHtml(text)}</span>`;
}
