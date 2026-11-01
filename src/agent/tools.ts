// src/agent/tools.ts
import * as fs from 'fs';
import * as path from 'path';
import { ToolDef } from './agent-loop';
import { runTerminal } from './terminal';

export function createAgentTools(workspaceRoot: string, semanticIndex?: { search: (q: string, k?: number) => any[] }): ToolDef[] {
  const resolve = (p: string) => path.isAbsolute(p) ? p : path.join(workspaceRoot, p);
  return [
    {
      name: 'read_file',
      description: 'Read the contents of a file in the workspace.',
      parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] },
      execute: async (args) => {
        try { return fs.readFileSync(resolve(args.path), 'utf8'); }
        catch (e) { return `Error reading file: ${String(e)}`; }
      },
    },
    {
      name: 'write_file',
      description: 'Write content to a file (creates or overwrites).',
      parameters: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path', 'content'] },
      execute: async (args) => {
        try { const full = resolve(args.path); fs.mkdirSync(path.dirname(full), { recursive: true }); fs.writeFileSync(full, args.content, 'utf8'); return `Wrote ${args.path}`; }
        catch (e) { return `Error writing file: ${String(e)}`; }
      },
    },
    {
      name: 'list_directory',
      description: 'List files and folders in a directory.',
      parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] },
      execute: async (args) => {
        try {
          const entries = fs.readdirSync(resolve(args.path), { withFileTypes: true });
          return entries.map(e => (e.isDirectory() ? e.name + '/' : e.name)).join('\n');
        } catch (e) { return `Error listing: ${String(e)}`; }
      },
    },
    {
      name: 'run_command',
      description: 'Run a shell command in the workspace and return stdout/stderr/exit code.',
      parameters: { type: 'object', properties: { command: { type: 'string' }, args: { type: 'array', items: { type: 'string' } } }, required: ['command'] },
      execute: async (args) => {
        const r = await runTerminal(args.command, args.args ?? [], workspaceRoot);
        return `exit=${r.exitCode}\nstdout:\n${r.stdout}\nstderr:\n${r.stderr}`;
      },
    },
    {
      name: 'search_codebase',
      description: 'Search for a text pattern across files in the workspace.',
      parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
      execute: async (args) => {
        const results: string[] = [];
        const walk = (dir: string) => {
          let entries: fs.Dirent[];
          try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
          for (const e of entries) {
            if (e.name === 'node_modules' || e.name === '.git') continue;
            const full = path.join(dir, e.name);
            if (e.isDirectory()) walk(full);
            else if (e.isFile() && e.name.match(/\.(ts|js|tsx|jsx|py|md|json)$/)) {
              try {
                const content = fs.readFileSync(full, 'utf8');
                if (content.includes(args.query)) results.push(full.replace(workspaceRoot, '.'));
              } catch {}
            }
          }
        };
        walk(workspaceRoot);
        return results.slice(0, 50).join('\n') || 'No matches';
      },
    },
    ...(semanticIndex ? [{
      name: 'search_semantic',
      description: 'Semantic (TF-IDF) search over indexed codebase chunks.',
      parameters: { type: 'object', properties: { query: { type: 'string' }, topK: { type: 'number' } }, required: ['query'] },
      execute: async (args: any) => {
        const hits = semanticIndex.search(args.query, args.topK ?? 5);
        return hits.map((h: any) => `${h.file}:${h.startLine}\n${h.content}`).join('\n---\n') || 'No matches';
      },
    }] : []),
  ];
}
