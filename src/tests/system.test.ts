import { describe, it, expect } from 'vitest';
import { collectSystemInfo, writeSystemInfoMarkdown } from '../system/info';
import { CapabilityCache, normalizeCapabilities } from '../providers/capabilities';
import { refreshCapabilities } from '../providers/capabilities-refresh';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

describe('system info', () => {
  it('collects info', () => {
    const info = collectSystemInfo(process.cwd());
    expect(info.os).toBeTruthy();
    expect(info.cpuCores).toBeGreaterThan(0);
    expect(info.ramMB).toBeGreaterThan(0);
  });
  it('writes markdown', () => {
    const info = collectSystemInfo(process.cwd());
    const p = path.join(os.tmpdir(), 'sysinfo.md');
    writeSystemInfoMarkdown(info, p);
    const content = fs.readFileSync(p, 'utf8');
    expect(content).toContain('# System Info');
  });
});

describe('capabilities', () => {
  it('normalizes capability', () => {
    const c = normalizeCapabilities({ tools: true, streaming: true, contextWindow: 8000 });
    expect(c.tools).toBe(true);
    expect(c.contextWindow).toBe(8000);
  });
  it('cache set/get', () => {
    const cache = new CapabilityCache();
    cache.set('p', 'm', { tools: true, streaming: false, jsonMode: false, contextWindow: 4000, source: 'provider-api' });
    const v = cache.get('p', 'm');
    expect(v?.tools).toBe(true);
  });
  it('refreshCapabilities returns result', async () => {
    const fakeProvider = { id: 'p', listModels: async () => ({ data: [{ id: 'm1' }] }), chatCompletions: async () => ({ choices: [{ message: { content: 'ok' } }] }) };
    const res = await refreshCapabilities(fakeProvider as any);
    expect(res.ok).toBe(true);
  });
});
