import { describe, it, expect } from 'vitest';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { scanDirectory, extractFeatures } from '../supervisor';
import { combineFeatures, renderFeatureList } from '../supervisor';
import { renderProjectChat } from '../ui/project-chat';

describe('supervisor: file-scanner', () => {
  it('scans a temp dir', () => {
    const dir = path.join(os.tmpdir(), 'scan-' + Date.now());
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'agent.ts'), 'x');
    fs.writeFileSync(path.join(dir, 'README.md'), 'y');
    const files = scanDirectory(dir);
    expect(files.length).toBe(2);
    const feats = extractFeatures(files);
    expect(feats).toContain('agent-supervisor');
    expect(feats).toContain('docs');
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

describe('supervisor: feature-combiner', () => {
  it('combines and dedupes', () => {
    const r = combineFeatures([
      { source: 'a', features: ['x', 'y'] },
      { source: 'b', features: ['y', 'z'] },
    ]);
    expect(r.all).toEqual(['x', 'y', 'z']);
    expect(renderFeatureList(r.all)).toContain('- x');
  });
});

describe('ui: project-chat', () => {
  it('renders messages', () => {
    const html = renderProjectChat([{ role: 'user', content: 'hi' }, { role: 'assistant', content: 'hello' }], '/proj');
    expect(html).toContain('hi');
    expect(html).toContain('hello');
    expect(html).toContain('/proj');
  });
});
