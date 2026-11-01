// src/supervisor/sandbox.ts
// Adapted from E2B/Modal/Docker sandbox patterns (MIT).
export interface SandboxResult { stdout: string; stderr: string; exitCode: number; durationMs: number; }

export interface CodeExecutor {
  run(code: string, language: string, timeoutMs?: number): Promise<SandboxResult>;
}

export class LocalSubprocessExecutor implements CodeExecutor {
  async run(code: string, language: string, timeoutMs = 10000): Promise<SandboxResult> {
    const { spawn } = await import('child_process');
    const cmd = language === 'python' ? 'python' : 'node';
    const args = language === 'python' ? ['-c', code] : ['-e', code];
    const start = Date.now();
    return new Promise((resolve) => {
      const proc = spawn(cmd, args, { shell: false });
      let stdout = '', stderr = '';
      const timer = setTimeout(() => { try { proc.kill(); } catch {} }, timeoutMs);
      proc.stdout.on('data', (d) => { stdout += d.toString(); });
      proc.stderr.on('data', (d) => { stderr += d.toString(); });
      proc.on('close', (code) => {
        clearTimeout(timer);
        resolve({ stdout, stderr, exitCode: code ?? -1, durationMs: Date.now() - start });
      });
      proc.on('error', (e) => {
        clearTimeout(timer);
        resolve({ stdout, stderr: String(e), exitCode: -1, durationMs: Date.now() - start });
      });
    });
  }
}
