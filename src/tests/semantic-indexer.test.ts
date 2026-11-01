import { describe, it, expect } from 'vitest';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { indexDirectory, SemanticIndex } from '../context/semantic-indexer';

describe('context: semantic-indexer', () => {
  it('indexes and searches', () => {
    const dir = path.join(os.tmpdir(), 'sem-' + Date.now());
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'a.ts'), 'function hello() { return "world"; }\n');
    fs.writeFileSync(path.join(dir, 'b.ts'), 'class Foo { bar() {} }\n');
    const idx = indexDirectory(dir);
    expect(idx.size()).toBeGreaterThan(0);
    const hits = idx.search('hello world');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].file).toContain('a.ts');
    fs.rmSync(dir, { recursive: true, force: true });
  });
  it('SemanticIndex empty search returns empty', () => {
    const idx = new SemanticIndex();
    expect(idx.search('anything')).toEqual([]);
  });
});
