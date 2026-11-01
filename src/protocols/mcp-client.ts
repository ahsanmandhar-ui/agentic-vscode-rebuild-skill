// src/protocols/mcp-client.ts
// Clean-room MCP (Model Context Protocol) client.
// Covers tools / resources / prompts, all gated through PermissionEngine.
// No vendoring of third-party code (Apache-2.0 clean-room).

import { PermissionEngine, PermissionAction, PermissionRequest } from '../security/permissionEngine';
import { isPrivateOrReservedHost } from '../providers/transport';

export type McpTransportKind = 'http' | 'https';

export interface McpServerConfig {
  id: string;
  name?: string;
  url: string;
  headers?: Record<string, string>;
  apiKey?: string;
  allowPrivateHosts?: boolean;
  timeoutMs?: number;
}

export interface McpTool {
  name: string;
  description?: string;
  inputSchema?: unknown;
}

export interface McpResource {
  uri: string;
  name?: string;
  description?: string;
  mimeType?: string;
}

export interface McpPromptArgument {
  name: string;
  description?: string;
  required?: boolean;
}

export interface McpPrompt {
  name: string;
  description?: string;
  arguments?: McpPromptArgument[];
}

export interface McpToolResult {
  content: unknown[];
  isError?: boolean;
  [key: string]: unknown;
}

export interface McpInitializeResult {
  protocolVersion?: string;
  capabilities?: Record<string, unknown>;
  serverInfo?: { name?: string; version?: string };
  [key: string]: unknown;
}

export interface McpApprovalRequest extends PermissionRequest {}

export type McpApprover = (req: McpApprovalRequest) => Promise<boolean>;

export class McpError extends Error {
  code?: string | number;
  data?: unknown;
  constructor(message: string, code?: string | number, data?: unknown) {
    super(message);
    this.name = 'McpError';
    this.code = code;
    this.data = data;
  }
}

interface JsonRpcResponse {
  jsonrpc?: string;
  id?: number | string | null;
  result?: unknown;
  error?: { code?: number; message?: string; data?: unknown };
}

export class McpClient {
  private readonly servers = new Map<string, McpServerConfig>();
  private readonly permission: PermissionEngine;
  private readonly fetchFn: (input: any, init?: any) => Promise<any>;
  private readonly approver?: McpApprover;
  private rpcCounter = 0;

  constructor(options: {
    permissionEngine: PermissionEngine;
    fetch?: (input: any, init?: any) => Promise<any>;
    approver?: McpApprover;
  }) {
    this.permission = options.permissionEngine;
    this.fetchFn = options.fetch ?? ((i, init) => globalThis.fetch(i, init));
    this.approver = options.approver;
  }

  addServer(config: McpServerConfig): McpServerConfig {
    if (!config || typeof config.id !== 'string' || !config.id) {
      throw new McpError('server config must have a non-empty id');
    }
    if (typeof config.url !== 'string' || !config.url) {
      throw new McpError('server config must have a url');
    }
    let parsed: URL;
    try {
      parsed = new URL(config.url);
    } catch {
      throw new McpError(`invalid server url: ${config.url}`);
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new McpError(`unsupported protocol for MCP server: ${parsed.protocol}`);
    }
    this.servers.set(config.id, { ...config });
    return this.servers.get(config.id)!;
  }

  removeServer(id: string): boolean {
    return this.servers.delete(id);
  }

  getServer(id: string): McpServerConfig {
    const s = this.servers.get(id);
    if (!s) throw new McpError(`unknown MCP server: ${id}`);
    return s;
  }

  listServers(): McpServerConfig[] {
    return Array.from(this.servers.values()).map((s) => ({ ...s }));
  }

  private async gate(action: PermissionAction, target: string, reason: string): Promise<void> {
    const req: PermissionRequest = { action, target, reason, scope: 'once' };
    const verdict = this.permission.decide(req, () => false);
    if (verdict.decision === 'allow') return;
    if (verdict.decision === 'deny') {
      throw new McpError(`permission denied: ${action} ${target} (${verdict.reason})`);
    }
    if (this.approver) {
      const ok = await this.approver(req);
      if (ok) {
        this.permission.remember({ action, targetPattern: target, decision: 'allow', scope: 'once' });
        return;
      }
      throw new McpError(`permission denied by user: ${action} ${target}`);
    }
    throw new McpError(`permission required (ask): ${action} ${target}`);
  }

  private async rpc(server: McpServerConfig, method: string, params?: unknown): Promise<unknown> {
    if (!server.allowPrivateHosts) {
      let host = '';
      try { host = new URL(server.url).hostname; } catch { /* noop */ }
      if (host && isPrivateOrReservedHost(host)) {
        throw new McpError(`refusing private/reserved host for MCP server: ${host}`);
      }
    }
    await this.gate('network', server.url, `MCP rpc ${method}`);

    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(server.headers ?? {}) };
    if (server.apiKey) headers['Authorization'] = `Bearer ${server.apiKey}`;

    const id = ++this.rpcCounter;
    const body = { jsonrpc: '2.0', id, method, params: params ?? {} };

    const controller = new AbortController();
    const timeoutMs = Number(server.timeoutMs ?? 30000) || 30000;
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let res: any;
    try {
      res = await this.fetchFn(server.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (e: any) {
      clearTimeout(timer);
      throw new McpError(`MCP request failed: ${e?.message ?? String(e)}`);
    }
    clearTimeout(timer);

    let json: JsonRpcResponse;
    try {
      const text = typeof res?.text === 'function' ? await res.text() : await res?.json?.();
      json = typeof text === 'string' ? JSON.parse(text) : text;
    } catch {
      throw new McpError('MCP invalid JSON response');
    }
    if (!res?.ok && res?.status) {
      throw new McpError(`MCP HTTP ${res.status}`, res.status);
    }
    if (json?.error) {
      throw new McpError(json.error.message ?? 'MCP error', json.error.code, json.error.data);
    }
    return json?.result;
  }


  async initialize(serverId: string): Promise<McpInitializeResult> {
    const server = this.getServer(serverId);
    const result = await this.rpc(server, 'initialize', {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {}, resources: {}, prompts: {} },
      clientInfo: { name: 'vibecode-engine', version: '0.1.0' },
    });
    try { await this.rpc(server, 'notifications/initialized', {}); } catch { /* noop */ }
    return (result ?? {}) as McpInitializeResult;
  }

  async listTools(serverId: string): Promise<McpTool[]> {
    const server = this.getServer(serverId);
    const result: any = await this.rpc(server, 'tools/list', {});
    const tools = Array.isArray(result?.tools) ? result.tools : Array.isArray(result) ? result : [];
    return tools.map((t: any) => ({
      name: String(t?.name ?? ''),
      description: t?.description,
      inputSchema: t?.inputSchema ?? t?.input_schema,
    })).filter((t: McpTool) => t.name);
  }

  async callTool(serverId: string, name: string, args: Record<string, unknown> = {}): Promise<McpToolResult> {
    if (!name) throw new McpError('tool name required');
    const server = this.getServer(serverId);
    await this.gate('exec', `mcp:${serverId}:tool:${name}`, `invoke MCP tool ${name}`);
    const result: any = await this.rpc(server, 'tools/call', { name, arguments: args ?? {} });
    return {
      content: Array.isArray(result?.content) ? result.content : (result?.content ? [result.content] : []),
      isError: !!result?.isError,
      ...result,
    };
  }

  async listResources(serverId: string): Promise<McpResource[]> {
    const server = this.getServer(serverId);
    const result: any = await this.rpc(server, 'resources/list', {});
    const resources = Array.isArray(result?.resources) ? result.resources : Array.isArray(result) ? result : [];
    return resources.map((r: any) => ({
      uri: String(r?.uri ?? ''),
      name: r?.name,
      description: r?.description,
      mimeType: r?.mimeType ?? r?.mime_type,
    })).filter((r: McpResource) => r.uri);
  }

  async readResource(serverId: string, uri: string): Promise<unknown> {
    if (!uri) throw new McpError('resource uri required');
    const server = this.getServer(serverId);
    await this.gate('read', uri, `read MCP resource ${uri}`);
    const result: any = await this.rpc(server, 'resources/read', { uri });
    return result;
  }

  async listPrompts(serverId: string): Promise<McpPrompt[]> {
    const server = this.getServer(serverId);
    const result: any = await this.rpc(server, 'prompts/list', {});
    const prompts = Array.isArray(result?.prompts) ? result.prompts : Array.isArray(result) ? result : [];
    return prompts.map((p: any) => ({
      name: String(p?.name ?? ''),
      description: p?.description,
      arguments: Array.isArray(p?.arguments) ? p.arguments : undefined,
    })).filter((p: McpPrompt) => p.name);
  }

  async getPrompt(serverId: string, name: string, args: Record<string, unknown> = {}): Promise<unknown> {
    if (!name) throw new McpError('prompt name required');
    const server = this.getServer(serverId);
    await this.gate('read', `mcp:${serverId}:prompt:${name}`, `get MCP prompt ${name}`);
    const result: any = await this.rpc(server, 'prompts/get', { name, arguments: args ?? {} });
    return result;
  }
}

// McpRegistry moved to src/protocols/mcp-registry.ts
export { McpRegistry } from './mcp-registry';
export * from './mcp-registry';

export default McpClient;

