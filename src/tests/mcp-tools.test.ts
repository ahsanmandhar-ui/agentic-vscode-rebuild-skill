import { describe, it, expect } from 'vitest';
import { createMCPTools } from '../agent/mcp-tools';

describe('agent: mcp-tools', () => {
  it('converts MCP tools to agent tools', async () => {
    const client = {
      listTools: async () => [{ name: 'foo', description: 'foo tool', inputSchema: { type: 'object', properties: {} } }],
      callTool: async (name: string, args: any) => ({ result: 'ok' }),
      listResources: async () => [],
    };
    const tools = await createMCPTools(client as any);
    expect(tools.length).toBe(1);
    expect(tools[0].name).toBe('mcp_foo');
    const r = await tools[0].execute({});
    expect(r).toContain('ok');
  });
});
