// src/supervisor/protocols.ts
// A2A + MCP adapter interfaces (ports). MIT.
export interface A2ATask { id: string; skill: string; input: unknown; status: 'submitted' | 'working' | 'completed' | 'failed'; output?: unknown; }

export interface A2AClient {
  submit(task: A2ATask): Promise<A2ATask>;
  get(id: string): Promise<A2ATask>;
  cancel(id: string): Promise<void>;
}

export interface MCPTool { name: string; description: string; inputSchema: unknown; }
export interface MCPClient {
  listTools(): Promise<MCPTool[]>;
  callTool(name: string, args: Record<string, unknown>): Promise<unknown>;
  listResources(): Promise<string[]>;
}
