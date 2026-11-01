// src/agent/terminal.ts
import { spawn } from 'child_process';

export interface TerminalResult { stdout: string; stderr: string; exitCode: number; durationMs: number; }

export async function runTerminal(cmd: string, args: string[] = [], cwd?: string, timeoutMs = 30000): Promise<TerminalResult> {
  const start = Date.now();
  return new Promise((resolve) => {
    const proc = spawn(cmd, args, { cwd, shell: false });
    let stdout = '', stderr = '';
    const timer = setTimeout(() => { try { proc.kill(); } catch {} }, timeoutMs);
    proc.stdout.on('data', d => { stdout += d.toString(); });
    proc.stderr.on('data', d => { stderr += d.toString(); });
    proc.on('close', code => { clearTimeout(timer); resolve({ stdout, stderr, exitCode: code ?? -1, durationMs: Date.now() - start }); });
    proc.on('error', e => { clearTimeout(timer); resolve({ stdout, stderr: String(e), exitCode: -1, durationMs: Date.now() - start }); });
  });
}
