// src/agent/inline-edit.ts
export interface TextEdit { file: string; startLine: number; endLine: number; newText: string; }

export function applyEdits(content: string, edits: TextEdit[]): string {
  const lines = content.split(/\n/);
  // apply from bottom to top to keep line numbers stable
  const sorted = [...edits].sort((a, b) => b.startLine - a.startLine);
  for (const e of sorted) {
    const start = Math.max(0, e.startLine - 1);
    const end = Math.max(start, e.endLine);
    lines.splice(start, end - start, ...e.newText.split(/\n/));
  }
  return lines.join('\n');
}

export function makeUnifiedDiff(file: string, before: string, after: string): string {
  const a = before.split(/\n/);
  const b = after.split(/\n/);
  const out: string[] = [`--- a/${file}`, `+++ b/${file}`];
  let i = 0;
  while (i < Math.max(a.length, b.length)) {
    if (a[i] === b[i]) { out.push(` ${a[i] ?? ''}`); i++; }
    else {
      if (i < a.length) out.push(`-${a[i]}`);
      if (i < b.length) out.push(`+${b[i]}`);
      i++;
    }
  }
  return out.join('\n');
}
