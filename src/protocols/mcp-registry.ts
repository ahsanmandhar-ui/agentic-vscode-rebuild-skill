// src/protocols/mcp-registry.ts
// Clean-room MCP server registry + discovery.

import { McpClient, McpServerConfig, McpTool, McpResource, McpPrompt, McpInitializeResult, McpToolResult, McpError } from './mcp-client';
import { PermissionEngine } from '../security/permissionEngine';

export type McpApprover = (req: any) => Promise<boolean>;

export interface McpRegistryOptions {
  permissionEngine: PermissionEngine;
  fetch?: (input: any, init?: any) => Promise<any>;
  approver?: McpApprover;
}

export interface McpServerCapabilities {
  serverId?: string;
  initialized: boolean;
  protocolVersion?: string;
  serverInfo?: { name?: string; version?: string };
  capabilities?: Record<string, unknown>;
  tools: McpTool[];
  resources: McpResource[];
  prompts: McpPrompt[];
  discoveredAt: number;
  error?: string;
}

export interface McpDiscoveryResult {
  serverId: string;
  ok: boolean;
  capabilities?: McpServerCapabilities;
  error?: string;
}

export interface McpToolLocation {
  serverId: string;
  tool: McpTool;
}

export class McpRegistry {
  private readonly client: McpClient;
  private readonly capabilities = new Map<string, McpServerCapabilities>();

  constructor(options: McpRegistryOptions) {
    this.client = new McpClient(options as any);
  }

  get clientInstance(): McpClient { return this.client; }

  addServer(config: McpServerConfig): McpServerConfig {
    return this.client.addServer(config);
  }

  removeServer(id: string): boolean {
    this.capabilities.delete(id);
    return this.client.removeServer(id);
  }

  listServers(): McpServerConfig[] { return this.client.listServers(); }
  getServer(id: string): McpServerConfig { return this.client.getServer(id); }

  hasServer(id: string): boolean {
    try { this.client.getServer(id); return true; } catch { return false; }
  }

  getServerCount(): number { return this.listServers().length; }

  async discover(serverId: string): Promise<McpServerCapabilities> {
    const caps: McpServerCapabilities = {
      serverId,
      initialized: false,
      tools: [],
      resources: [],
      prompts: [],
      discoveredAt: Date.now(),
    };
    try {
      const init: McpInitializeResult = await this.client.initialize(serverId);
      caps.initialized = true;
      caps.protocolVersion = init?.protocolVersion;
      caps.serverInfo = init?.serverInfo;
      caps.capabilities = init?.capabilities;
      try { caps.tools = await this.client.listTools(serverId); } catch { caps.tools = []; }
      try { caps.resources = await this.client.listResources(serverId); } catch { caps.resources = []; }
      try { caps.prompts = await this.client.listPrompts(serverId); } catch { caps.prompts = []; }
      caps.discoveredAt = Date.now();
      caps.error = undefined;
    } catch (e: any) {
      caps.initialized = false;
      caps.error = e?.message ?? String(e);
      caps.discoveredAt = Date.now();
    }
    this.capabilities.set(serverId, caps);
    return caps;
  }

  async discoverServer(serverId: string): Promise<McpServerCapabilities> { return this.discover(serverId); }
  async discoverCapabilities(serverId: string): Promise<McpServerCapabilities> { return this.discover(serverId); }
  async inspect(serverId: string): Promise<McpServerCapabilities> { return this.discover(serverId); }
  async probe(serverId: string): Promise<McpServerCapabilities> { return this.discover(serverId); }
  async refresh(serverId: string): Promise<McpServerCapabilities> { return this.discover(serverId); }

  async discoverAll(): Promise<McpServerCapabilities[]> {
    const ids = this.listServers().map((s) => s.id);
    const out: McpServerCapabilities[] = [];
    for (const id of ids) out.push(await this.discover(id));
    return out;
  }
  async discoverAllServers(): Promise<McpServerCapabilities[]> { return this.discoverAll(); }

  async discoverServers(candidates: Array<string | McpServerConfig>): Promise<McpDiscoveryResult[]> {
    const results: McpDiscoveryResult[] = [];
    for (const c of candidates ?? []) {
      let id: string;
      try {
        if (typeof c === 'string') {
          let parsed: URL;
          try { parsed = new URL(c); } catch { throw new McpError(`invalid server url: ${c}`); }
          const baseId = parsed.hostname || 'server';
          id = baseId;
          let n = 1;
          while (this.hasServer(id)) {
            try {
              const existing = this.getServer(id);
              if (existing.url === c) break;
            } catch { /* noop */ }
            id = `${baseId}-${n++}`;
          }
          if (!this.hasServer(id)) this.addServer({ id, url: c });
        } else {
          const added = this.addServer(c as McpServerConfig);
          id = added.id;
        }
        const caps = await this.discover(id);
        results.push({ serverId: id, ok: !caps.error, capabilities: caps, error: caps.error });
      } catch (e: any) {
        results.push({ serverId: (typeof c === 'string' ? c : (c as any)?.id ?? 'unknown'), ok: false, error: e?.message ?? String(e) });
      }
    }
    return results;
  }

  getCapabilities(serverId: string): McpServerCapabilities | undefined { return this.capabilities.get(serverId); }
  getDiscovered(serverId: string): McpServerCapabilities | undefined { return this.getCapabilities(serverId); }
  getServerCapabilities(serverId: string): McpServerCapabilities | undefined { return this.getCapabilities(serverId); }
  setCapabilities(serverId: string, caps: McpServerCapabilities): void { this.capabilities.set(serverId, caps); }
  clearCapabilities(serverId?: string): void {
    if (serverId) this.capabilities.delete(serverId); else this.capabilities.clear();
  }
  isDiscovered(serverId: string): boolean { return this.capabilities.has(serverId); }

  findTool(name: string): McpToolLocation[] {
    const out: McpToolLocation[] = [];
    for (const [serverId, caps] of this.capabilities.entries()) {
      for (const t of caps.tools ?? []) if (t.name === name) out.push({ serverId, tool: t });
    }
    return out;
  }
  searchTools(query: string): McpToolLocation[] {
    const q = (query ?? '').toLowerCase();
    const out: McpToolLocation[] = [];
    for (const [serverId, caps] of this.capabilities.entries()) {
      for (const t of caps.tools ?? []) {
        if ((t.name ?? '').toLowerCase().includes(q) || (t.description ?? '').toLowerCase().includes(q)) out.push({ serverId, tool: t });
      }
    }
    return out;
  }
  listAllTools(): McpToolLocation[] {
    const out: McpToolLocation[] = [];
    for (const [serverId, caps] of this.capabilities.entries()) for (const t of caps.tools ?? []) out.push({ serverId, tool: t });
    return out;
  }
  findServer(query: string): McpServerConfig[] {
    const q = (query ?? '').toLowerCase();
    return this.listServers().filter((s) => {
      const caps = this.capabilities.get(s.id);
      const name = (s.name ?? s.id ?? '').toLowerCase();
      const serverName = (caps?.serverInfo?.name ?? '').toLowerCase();
      return name.includes(q) || serverName.includes(q) || s.id.toLowerCase().includes(q);
    });
  }

  initialize(id: string): Promise<McpInitializeResult> { return this.client.initialize(id); }
  listTools(id: string): Promise<McpTool[]> { return this.client.listTools(id); }
  callTool(id: string, name: string, args?: Record<string, unknown>): Promise<McpToolResult> { return this.client.callTool(id, name, args); }
  listResources(id: string): Promise<McpResource[]> { return this.client.listResources(id); }
  readResource(id: string, uri: string): Promise<unknown> { return this.client.readResource(id, uri); }
  listPrompts(id: string): Promise<McpPrompt[]> { return this.client.listPrompts(id); }
  getPrompt(id: string, name: string, args?: Record<string, unknown>): Promise<unknown> { return this.client.getPrompt(id, name, args); }
}

export default McpRegistry;

