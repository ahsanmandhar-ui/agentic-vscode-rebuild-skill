import { describe, it, expect } from 'vitest';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { applyEdits, makeUnifiedDiff } from '../agent/inline-edit';
import { runTerminal } from '../agent/terminal';
import { CheckpointManager } from '../checkpoint/manager';
import { indexFile, searchChunks } from '../context/indexer';
import { renderDiffReview } from '../ui/diff-review';
import { renderGhostText } from '../ui/inline-completion';

describe('agent: inline-edit', () => {
  it('applies edits', () => {
    const out = applyEdits('a\nb\nc', [{ file: 'f', startLine: 2, endLine: 2, newText: 'B' }]);
    expect(out).toBe('a\nB\nc');
  });
  it('makes diff', () => {
    const d = makeUnifiedDiff('f', 'a\nb', 'a\nB');
    expect(d).toContain('-b');
    expect(d).toContain('+B');
  });
});

describe('agent: terminal', () => {
  it('runs echo', async () => {
    const r = await runTerminal(process.platform === 'win32' ? 'cmd' : 'echo', process.platform === 'win32' ? ['/c', 'echo hi'] : ['hi']);
    expect(r.stdout).toContain('hi');
    expect(r.exitCode).toBe(0);
  });
});

describe('checkpoint: manager', () => {
  it('save/restore', () => {
    const dir = path.join(os.tmpdir(), 'cp-' + Date.now());
    const m = new CheckpointManager(dir);
    const cp = m.save({ 'a.txt': 'hello' });
    expect(m.restore(cp.id)?.['a.txt']).toBe('hello');
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

describe('context: indexer', () => {
  it('indexes and searches', () => {
    const f = path.join(os.tmpdir(), 'idx-' + Date.now() + '.ts');
    fs.writeFileSync(f, 'function foo() {}\nfunction bar() {}\n');
    const chunks = indexFile(f, 1);
    expect(chunks.length).toBe(3);
    const hits = searchChunks(chunks, 'bar');
    expect(hits.length).toBe(1);
    fs.unlinkSync(f);
  });
});

describe('ui: diff-review', () => {
  it('renders', () => {
    const html = renderDiffReview('+a\n-b');
    expect(html).toContain('diff-add');
    expect(html).toContain('diff-del');
  });
});

describe('ui: inline-completion', () => {
  it('renders ghost', () => {
    expect(renderGhostText('x')).toContain('vc-ghost');
  });
});
