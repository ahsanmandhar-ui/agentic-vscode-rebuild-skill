import { describe, it, expect } from 'vitest';
import { InMemoryDurableStore, isSafeUrl, redactSecrets, escapeHtml } from '../supervisor';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { FileDurableStore } from '../supervisor';

describe('supervisor: durable', () => {
  it('in-memory store round-trips', () => {
    const s = new InMemoryDurableStore();
    s.save('k', { a: 1 });
    expect(s.load('k')).toEqual({ a: 1 });
    expect(s.list()).toContain('k');
    s.remove('k');
    expect(s.load('k')).toBeUndefined();
  });
  it('file store round-trips', () => {
    const dir = path.join(os.tmpdir(), 'vs-durable-' + Date.now());
    const s = new FileDurableStore(dir);
    s.save('x', { v: 42 });
    expect(s.load('x')).toEqual({ v: 42 });
    s.remove('x');
    expect(s.load('x')).toBeUndefined();
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

describe('supervisor: security', () => {
  it('blocks private hosts', () => {
    expect(isSafeUrl('http://127.0.0.1/x').ok).toBe(false);
    expect(isSafeUrl('http://10.0.0.1/x').ok).toBe(false);
    expect(isSafeUrl('file:///etc/passwd').ok).toBe(false);
  });
  it('allows public https', () => {
    expect(isSafeUrl('https://example.com/api').ok).toBe(true);
  });
  it('redacts secrets', () => {
    const t = 'key sk-abcdefghijklmnopqrstuvwxyz123456 end';
    expect(redactSecrets(t)).toContain('[REDACTED]');
    expect(redactSecrets(t)).not.toContain('sk-');
  });
  it('escapes html', () => {
    expect(escapeHtml('<script>alert(1)</script>')).not.toContain('<script>');
  });
});
