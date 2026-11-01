// src/agent/mcp-tools.ts
import { ToolDef } from './agent-loop';
import { MCPClient } from '../supervisor';

export async function createMCPTools(client: MCPClient): Promise<ToolDef[]> {
  const tools = await client.listTools();
  return tools.map(t => ({
    name: `mcp_${t.name}`,
    description: t.description || `MCP tool ${t.name}`,
    parameters: (t.inputSchema as any) ?? { type: 'object', properties: {} },
    execute: async (args: any) => {
      try {
        const r = await client.callTool(t.name, args ?? {});
        return typeof r === 'string' ? r : JSON.stringify(r);
      } catch (e) {
        return `Error: ${String(e)}`;
      }
    },
  }));
}
