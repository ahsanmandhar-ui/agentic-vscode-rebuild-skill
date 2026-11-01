// src/mcp/client.ts
import { spawn } from 'child_process';
import { MCPClient, MCPTool } from '../supervisor';

export class StdioMCPClient implements MCPClient {
  private proc: any;
  private buf = '';
  private pending = new Map<number, (v: any) => void>();
  private id = 0;

  constructor(private cmd: string, private args: string[] = []) {}

  async connect(): Promise<void> {
    this.proc = spawn(this.cmd, this.args, { stdio: ['pipe', 'pipe', 'pipe'] });
    this.proc.stdout.on('data', (d: Buffer) => {
      this.buf += d.toString();
      const lines = this.buf.split('\n');
      this.buf = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const msg = JSON.parse(line);
          if (msg.id != null && this.pending.has(msg.id)) {
            this.pending.get(msg.id)!(msg.result ?? msg);
            this.pending.delete(msg.id);
          }
        } catch { /* ignore */ }
      }
    });
  }

  private request(method: string, params: any = {}): Promise<any> {
    const id = ++this.id;
    return new Promise((resolve) => {
      this.pending.set(id, resolve);
      this.proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
    });
  }

  async listTools(): Promise<MCPTool[]> {
    const r = await this.request('tools/list');
    return (r.tools ?? []).map((t: any) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema }));
  }
  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    const r = await this.request('tools/call', { name, arguments: args });
    return r;
  }
  async listResources(): Promise<string[]> {
    const r = await this.request('resources/list');
    return (r.resources ?? []).map((x: any) => x.uri);
  }
  close(): void { try { this.proc.kill(); } catch {} }
}
