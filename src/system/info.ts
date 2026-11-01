// src/system/info.ts
import { spawnSync } from 'child_process';
import * as os from 'os';
import * as fs from 'fs';

export interface SystemInfo {
  os: string; arch: string; cpuCores: number; ramMB: number; freeDiskMB: number;
  runtimes: { node?: string; python?: string; git?: string; docker?: string };
  clis: string[];
  network: { duckduckgo: boolean; brave: boolean };
  project: { root: string; gitStatus: string; packageManager: string; testCommand: string };
}

function run(cmd: string, args: string[]): string {
  try {
    const r = spawnSync(cmd, args, { encoding: 'utf8', timeout: 5000 });
    return (r.stdout || r.stderr || '').trim();
  } catch { return ''; }
}

export function collectSystemInfo(projectRoot: string = process.cwd()): SystemInfo {
  const clis = ['gemini','claude','codex','ollama'].filter(c => run(c, ['--version']) !== '');
  return {
    os: `${os.type()} ${os.release()}`,
    arch: os.arch(),
    cpuCores: os.cpus().length,
    ramMB: Math.round(os.totalmem() / 1024 / 1024),
    freeDiskMB: 0,
    runtimes: {
      node: run('node', ['--version']),
      python: run('python', ['--version']),
      git: run('git', ['--version']),
      docker: run('docker', ['--version']),
    },
    clis,
    network: { duckduckgo: false, brave: false },
    project: {
      root: projectRoot,
      gitStatus: run('git', ['-C', projectRoot, 'status', '--porcelain']),
      packageManager: fs.existsSync(projectRoot + '/package.json') ? 'npm' : 'unknown',
      testCommand: 'npm test',
    },
  };
}

export function writeSystemInfoMarkdown(info: SystemInfo, path: string): void {
  const lines = ['# System Info', '', `- OS: ${info.os}`, `- Arch: ${info.arch}`, `- CPU cores: ${info.cpuCores}`, `- RAM: ${info.ramMB} MB`, '', '## Runtimes', ...Object.entries(info.runtimes).map(([k,v]) => `- ${k}: ${v || 'not found'}`), '', '## CLIs', ...info.clis.map(c => `- ${c}`), '', '## Project', `- root: ${info.project.root}`, `- packageManager: ${info.project.packageManager}`, `- testCommand: ${info.project.testCommand}`];
  fs.writeFileSync(path, lines.join('\n'));
}