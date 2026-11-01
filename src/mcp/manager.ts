// src/mcp/manager.ts
import { StdioMCPClient } from './client';
import { MCPClient } from '../supervisor';

let client: StdioMCPClient | null = null;

export const mcpManager = {
  async connect(cmd: string, args: string[]): Promise<MCPClient> {
    if (client) { try { client.close(); } catch {} }
    client = new StdioMCPClient(cmd, args);
    await client.connect();
    return client;
  },
  getClient(): MCPClient | null { return client; },
  disconnect(): void { if (client) { try { client.close(); } catch {} client = null; } },
  isConnected(): boolean { return client !== null; },
};
