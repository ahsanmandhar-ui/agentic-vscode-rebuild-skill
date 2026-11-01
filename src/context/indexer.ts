// src/context/indexer.ts
import * as fs from 'fs';
import * as path from 'path';

export interface CodeChunk { file: string; startLine: number; content: string; }

export function indexFile(file: string, chunkSize = 40): CodeChunk[] {
  const chunks: CodeChunk[] = [];
  let content = '';
  try { content = fs.readFileSync(file, 'utf8'); } catch { return chunks; }
  const lines = content.split(/\n/);
  for (let i = 0; i < lines.length; i += chunkSize) {
    chunks.push({ file, startLine: i + 1, content: lines.slice(i, i + chunkSize).join('\n') });
  }
  return chunks;
}

export function searchChunks(chunks: CodeChunk[], query: string): CodeChunk[] {
  const q = query.toLowerCase();
  return chunks.filter(c => c.content.toLowerCase().includes(q));
}
