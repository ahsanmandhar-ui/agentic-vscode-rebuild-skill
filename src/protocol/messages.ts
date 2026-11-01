// src/protocol/messages.ts
// Webview ⇄ extension message protocol + typed handler registry.

export type PanelId =
  | 'skills' | 'settings' | 'models' | 'perms' | 'context' | 'diagnostics'
  | 'router' | 'cli' | 'search' | 'chat' | 'plan' | 'progress' | 'home' | 'tasks' | 'onboarding';

export type PanelStatus = 'loading' | 'empty' | 'error' | 'ready' | 'disabled';

export interface ExtToWebStateMessage {
  v: 1;
  kind: 'state' | 'panelState';
  panel: PanelId;
  status: PanelStatus;
  data?: unknown;
  updatedAt: string;
  empty?: { message: string; action: { label: string; id: string } };
  error?: { cause: string; impact: string; action: { label: string; id: string } };
}

export interface ExtToWebEventMessage { v: 1; kind: 'event'; taskId: string; event: unknown; }
export interface ExtToWebPermissionMessage { v: 1; kind: 'permission'; id: string; request: unknown; }
export interface ExtToWebToastMessage { v: 1; kind: 'toast'; level: 'info' | 'warn' | 'error'; message: string; action?: { label: string; id: string }; }
export interface ExtToWebStreamChunkMessage { v: 1; kind: 'streamChunk'; panel: PanelId; messageId: string; delta: string; done?: boolean; }
export type ExtToWebMessage = ExtToWebStateMessage | ExtToWebEventMessage | ExtToWebPermissionMessage | ExtToWebToastMessage | ExtToWebStreamChunkMessage;

export interface WebToExtCommandMessage { v: 1; kind: 'command'; id: string; payload?: unknown; }
export interface WebToExtPermissionDecisionMessage { v: 1; kind: 'permissionDecision'; id: string; decision: 'allow-once' | 'allow-session' | 'allow-workspace' | 'deny'; }
export interface WebToExtReadyMessage { v: 1; kind: 'ready'; }

export interface BaseWebviewMessage { v: 1; kind: string; payload?: unknown; [key: string]: unknown; }

export interface RouterSetActiveMessage extends BaseWebviewMessage { v: 1; kind: 'router/setActive'; providerId: string; }
export interface RouterAddCustomEndpointMessage extends BaseWebviewMessage { v: 1; kind: 'router/addCustomEndpoint'; endpoint?: unknown; }
export interface RouterTestConnectionMessage extends BaseWebviewMessage { v: 1; kind: 'router/testConnection'; providerId?: string; }
export interface RouterRefreshMessage extends BaseWebviewMessage { v: 1; kind: 'router/refresh'; }
export interface RouterSelectModelMessage extends BaseWebviewMessage { v: 1; kind: 'router/selectModel'; providerId: string; modelId: string; }
export interface RouterWebviewMessage extends BaseWebviewMessage { kind: `router/${string}`; }

export interface CliRunMessage extends BaseWebviewMessage { v: 1; kind: 'cli/run'; binary: string; args?: string; cwd?: string; multiRun?: string[]; }
export interface CliCancelMessage extends BaseWebviewMessage { v: 1; kind: 'cli/cancel'; }
export interface ChatCancelMessage extends BaseWebviewMessage { v: 1; kind: 'chat/cancel'; messageId?: string; }
export interface CliHistoryMessage extends BaseWebviewMessage { v: 1; kind: 'cli/history'; }
export interface SearchTestMessage extends BaseWebviewMessage { v: 1; kind: 'search/test'; providerId?: string; }
export interface SearchSaveFallbackOrderMessage extends BaseWebviewMessage { v: 1; kind: 'search/saveFallbackOrder'; order?: string[]; }
export interface CliWebviewMessage extends BaseWebviewMessage { kind: `cli/${string}`; }
export interface SearchTestMessage extends BaseWebviewMessage { v: 1; kind: 'search/test'; providerId?: string; }
export interface SearchSaveFallbackOrderMessage extends BaseWebviewMessage { v: 1; kind: 'search/saveFallbackOrder'; order?: string[]; }
export interface SearchWebviewMessage extends BaseWebviewMessage { kind: `search/${string}`; }

export interface PlanRefreshMessage extends BaseWebviewMessage { v: 1; kind: 'plan/refresh'; }
export interface PlanWebviewMessage extends BaseWebviewMessage { kind: `plan/${string}`; }
export type WebToExtMessage =
  | WebToExtCommandMessage
  | WebToExtPermissionDecisionMessage
  | WebToExtReadyMessage
  | RouterWebviewMessage
  | CliWebviewMessage
  | SearchWebviewMessage
  | PlanWebviewMessage;

export interface WebviewMessageContext {
  view?: unknown;
  extensionContext?: unknown;
  modelsPanel?: unknown;
  permissionEngine?: unknown;
  logger?: { warn?: (msg: string) => void; error?: (msg: string) => void } & Record<string, unknown>;
  postMessage?: (msg: unknown) => void;
  [key: string]: unknown;
}
export type WebviewContext = WebviewMessageContext;

export function isWebviewMessage(msg: unknown): msg is BaseWebviewMessage {
  return !!msg && typeof msg === 'object' && (msg as any).v === 1 && typeof (msg as any).kind === 'string';
}
export function isRouterMessage(msg: unknown): msg is RouterWebviewMessage {
  return isWebviewMessage(msg) && String((msg as any).kind).startsWith('router/');
}
export function isCliMessage(msg: unknown): msg is CliWebviewMessage {
  return isWebviewMessage(msg) && String((msg as any).kind).startsWith('cli/');
}
export function isSearchMessage(msg: unknown): msg is SearchWebviewMessage {
  return isWebviewMessage(msg) && String((msg as any).kind).startsWith('search/');
}
export function isChatMessage(msg: unknown): msg is BaseWebviewMessage {
  return isWebviewMessage(msg) && String((msg as any).kind).startsWith('chat/');
}
export function isChatCancelMessage(msg: unknown): msg is ChatCancelMessage {
  return isWebviewMessage(msg) && (msg as any).kind === 'chat/cancel';
}
export function isStreamChunkMessage(msg: unknown): msg is ExtToWebStreamChunkMessage {
  return !!msg && typeof msg === 'object' && (msg as any).v === 1 && (msg as any).kind === 'streamChunk'
    && typeof (msg as any).messageId === 'string' && typeof (msg as any).delta === 'string';
}
export function streamChunkMessage(payload: { panel?: PanelId; messageId: string; delta: string; done?: boolean }): ExtToWebStreamChunkMessage {
  return { v: 1, kind: 'streamChunk', panel: payload.panel ?? 'chat', messageId: payload.messageId, delta: payload.delta, done: payload.done };
}
export function isPlanMessage(msg: unknown): msg is PlanWebviewMessage {
  return isWebviewMessage(msg) && String((msg as any).kind).startsWith('plan/');
}

export type MessageHandler<TMsg = unknown, TCtx = WebviewMessageContext> = (
  msg: TMsg,
  ctx: TCtx,
) => void | Promise<void>;

export interface HandlerRegistry {
  register(kind: string, handler: MessageHandler): this;
  unregister(kind: string): boolean;
  has(kind: string): boolean;
  get(kind: string): MessageHandler | undefined;
  handle(msg: unknown, ctx?: WebviewMessageContext): boolean;
  clear(): void;
  kinds(): string[];
}

export class WebviewMessageHandlerRegistry implements HandlerRegistry {
  private readonly handlers = new Map<string, MessageHandler>();

  register(kind: string, handler: MessageHandler): this {
    this.handlers.set(kind, handler);
    return this;
  }

  unregister(kind: string): boolean {
    return this.handlers.delete(kind);
  }

  has(kind: string): boolean {
    return this.handlers.has(kind);
  }

  get(kind: string): MessageHandler | undefined {
    return this.handlers.get(kind);
  }

  clear(): void {
    this.handlers.clear();
  }

  kinds(): string[] {
    return Array.from(this.handlers.keys());
  }

  handle(msg: unknown, ctx: WebviewMessageContext = {}): boolean {
    if (!isWebviewMessage(msg)) return false;
    const kind = (msg as BaseWebviewMessage).kind;

    let handler = this.handlers.get(kind);
    if (!handler) handler = this.handlers.get(kind.split('/')[0] + '/*');
    if (!handler) handler = this.handlers.get('*');

    if (!handler) return false;
    try {
      const r = handler(msg, ctx);
      if (r && typeof (r as any).then === 'function') {
        void (r as Promise<void>).catch((e) => {
          try { ctx.logger?.error?.(String(e?.message ?? e)); } catch { /* noop */ }
        });
      }
      return true;
    } catch (e) {
      try { ctx.logger?.error?.(String((e as Error)?.message ?? e)); } catch { /* noop */ }
      return false;
    }
  }
}

export const handlerRegistry = new WebviewMessageHandlerRegistry();
export const messageHandlers = handlerRegistry;
export const handlers = handlerRegistry;
export const registry = handlerRegistry;

export function createHandlerRegistry(): WebviewMessageHandlerRegistry {
  return new WebviewMessageHandlerRegistry();
}

export function registerHandler(kind: string, handler: MessageHandler): WebviewMessageHandlerRegistry {
  return handlerRegistry.register(kind, handler);
}

export function unregisterHandler(kind: string): boolean {
  return handlerRegistry.unregister(kind);
}

export function handleWebviewMessage(msg: unknown, ctx: WebviewMessageContext = {}): boolean {
  return handlerRegistry.handle(msg, ctx);
}

export default handleWebviewMessage;

