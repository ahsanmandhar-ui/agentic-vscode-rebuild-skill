// src/context/semantic-indexer.ts
import * as fs from 'fs';
import * as path from 'path';

export interface DocChunk { file: string; startLine: number; content: string; tokens: string[]; }

function tokenize(s: string): string[] {
  return s.toLowerCase().split(/[^a-z0-9_]+/).filter(t => t.length > 2);
}

export function chunkFile(file: string, chunkSize = 30): DocChunk[] {
  const out: DocChunk[] = [];
  let content = '';
  try { content = fs.readFileSync(file, 'utf8'); } catch { return out; }
  const lines = content.split(/\n/);
  for (let i = 0; i < lines.length; i += chunkSize) {
    const slice = lines.slice(i, i + chunkSize).join('\n');
    out.push({ file, startLine: i + 1, content: slice, tokens: tokenize(slice) });
  }
  return out;
}

export class SemanticIndex {
  private chunks: DocChunk[] = [];
  private idf = new Map<string, number>();

  addChunks(chunks: DocChunk[]): void { this.chunks.push(...chunks); this.recomputeIdf(); }
  private recomputeIdf(): void {
    const df = new Map<string, number>();
    for (const c of this.chunks) {
      const seen = new Set(c.tokens);
      for (const t of seen) df.set(t, (df.get(t) ?? 0) + 1);
    }
    this.idf.clear();
    const N = this.chunks.length || 1;
    for (const [t, d] of df) this.idf.set(t, Math.log((N + 1) / (d + 1)) + 1);
  }
  search(query: string, topK = 5): DocChunk[] {
    const qTokens = tokenize(query);
    const scored = this.chunks.map(c => {
      let score = 0;
      const tf = new Map<string, number>();
      for (const t of c.tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
      for (const qt of qTokens) {
        const t = tf.get(qt) ?? 0;
        const idf = this.idf.get(qt) ?? 1;
        score += t * idf;
      }
      // cosine-ish normalization
      const norm = Math.sqrt(c.tokens.length) || 1;
      return { c, score: score / norm };
    });
    return scored.sort((a, b) => b.score - a.score).slice(0, topK).map(s => s.c);
  }
  size(): number { return this.chunks.length; }
  clear(): void { this.chunks = []; this.idf.clear(); }
}

export function indexDirectory(root: string, exts = ['.ts', '.js', '.md', '.py', '.json']): SemanticIndex {
  const idx = new SemanticIndex();
  const walk = (dir: string) => {
    let entries: fs.Dirent[];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.name === 'node_modules' || e.name === '.git' || e.name === 'dist' || e.name === 'out' || e.name === '.vscode') continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.isFile() && exts.includes(path.extname(e.name).toLowerCase())) {
        idx.addChunks(chunkFile(full));
      }
    }
  };
  walk(root);
  return idx;
}
