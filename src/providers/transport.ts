// src/providers/transport.ts
import { RouterError, RouterErrorCode, RouterProvider } from './router-types';

export class TransportError extends Error implements RouterError {
  code: RouterErrorCode;
  message: string;
  retryable?: boolean;
  status?: number;
  provider?: string;
  model?: string;
  requestId?: string;
  retryAfterMs?: number;
  details?: unknown;
  cause?: unknown;
  [key: string]: unknown;
  constructor(code: RouterErrorCode, message: string, opts: Partial<RouterError> = {}) {
    super(message);
    this.name = 'TransportError';
    this.code = code;
    this.message = message;
    Object.assign(this, opts);
  }
}

export function isPrivateOrReservedHost(host: string): boolean {
  const h = String(host || '').trim().toLowerCase();
  if (!h) return true;
  // strip trailing dot
  const hostName = h.replace(/\.$/, '');
  if (hostName === 'localhost' || hostName.endsWith('.localhost') || hostName === '0.0.0.0' || hostName === '::' || hostName === '::1' || hostName === '[::1]') return true;
  if (hostName === '169.254.169.254' || hostName.endsWith('.169.254.169.254')) return true;
  if (hostName.includes('metadata') || hostName === 'metadata.google.internal') return true;
  if (hostName.endsWith('.internal') || hostName.endsWith('.local') || hostName.endsWith('.home') || hostName.endsWith('.lan')) return true;

  // IPv4
  const m = hostName.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const [a,b] = [Number(m[1]), Number(m[2])];
    if (m.slice(1).some((x) => Number(x) > 255)) return true; // invalid octet -> treat reserved
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 0) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a === 192 && b === 0 && Number(m[3]) === 0) return true; // 192.0.0.0/24
    if (a === 192 && b === 0 && Number(m[3]) === 2) return true; // TEST-NET
    if (a === 198 && (b === 18 || b === 19)) return true; // TEST-NET
    if (a === 198 && b === 51 && Number(m[3]) === 100) return true;
    if (a === 203 && b === 0 && Number(m[3]) === 113) return true;
    if (a >= 224) return true; // multicast/reserved
  }

  // IPv4-mapped IPv6 / IPv4-compatible
  const mapped = hostName.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (mapped) return isPrivateOrReservedHost(mapped[1]);
  const compat = hostName.match(/^::(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (compat) return isPrivateOrReservedHost(compat[1]);

  // IPv6
  if (hostName.includes(':')) {
    const v = hostName.replace(/^\[|\]$/g, '');
    if (v === '::' || v === '::1') return true;
    // link-local fe80::/10
    if (/^fe[89ab][0-9a-f]?:/.test(v) || /^fe[89ab][0-9a-f]?$/.test(v)) return true;
    // unique local fc00::/7
    if (/^f[cd][0-9a-f]{2}:/.test(v)) return true;
    // multicast ff00::/8
    if (/^ff[0-9a-f]{2}:/.test(v)) return true;
    // IPv4-mapped already handled; IPv4-compatible ::/96
    // site-local fec0::/10 (deprecated)
    if (/^fec[0-9a-f]:/.test(v)) return true;
  }
  return false;
}

export function validateUrl(url: string, provider?: any): boolean {
  let parsed: URL;
  try { parsed = new URL(url); } catch {
    throw new TransportError(RouterErrorCode.BadRequest, `invalid url`, { provider: provider?.id });
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new TransportError(RouterErrorCode.BadRequest, `unsupported protocol: ${parsed.protocol}`, { provider: provider?.id });
  }
  const host = parsed.hostname.toLowerCase();
  // Always apply base SSRF policy (cannot be disabled by provider).
  if (isPrivateOrReservedHost(host)) {
    throw new TransportError(RouterErrorCode.Forbidden, 'host is not allowed (SSRF guard)', { provider: provider?.id });
  }
  const p = (provider && typeof provider === 'object') ? provider : {};
  const raw = p.allowlist ?? p.allowedHosts ?? p.allowlistHosts ?? p.allowed_hosts ?? p.allowedUrls;
  const allowlist = Array.isArray(raw) ? raw.map((x: any) => String(x).toLowerCase()) : [];
  const custom = String(p.id ?? p.type ?? p.providerType ?? p.kind ?? '').toLowerCase() === 'custom' || p.custom === true || p.type === 'custom' || p.providerType === 'custom' || p.kind === 'custom' || allowlist.length > 0;
  if (custom) {
    if (allowlist.length === 0) {
      throw new TransportError(RouterErrorCode.Forbidden, 'custom provider requires an allowlist', { provider: provider?.id });
    }
    const allowed = allowlist.some((entry: string) => entry === host || entry === parsed.host.toLowerCase() || entry === parsed.origin.toLowerCase());
    if (!allowed) {
      throw new TransportError(RouterErrorCode.Forbidden, `host not in allowlist: ${host}`, { provider: provider?.id });
    }
  }
  // Provider-supplied validateUrl runs as additional check, never as replacement.
  if (typeof p.validateUrl === 'function' && p.validateUrl !== validateUrl) {
    try { p.validateUrl(url, provider); } catch (e) {
      throw e instanceof TransportError ? e : new TransportError(RouterErrorCode.Forbidden, (e as Error)?.message ?? 'invalid url', { provider: provider?.id });
    }
  }
  return true;
}


export interface TransportProvider extends RouterProvider {
  baseUrl?: string; baseUrlDefault?: string; base_url?: string; url?: string; endpoint?: string; host?: string;
  apiKey?: string; api_key?: string; token?: string; accessToken?: string; access_token?: string; value?: string; secret?: string; key?: string;
  credential?: Record<string, unknown> | null; account?: Record<string, unknown> | null;
  custom?: boolean; type?: string; providerType?: string; kind?: string;
  allowlist?: string[]; allowedHosts?: string[]; allowlistHosts?: string[]; allowed_hosts?: string[]; allowedUrls?: string[];
  timeoutMs?: number; timeout?: number; signal?: AbortSignal;
  fetch?: (input: any, init?: any) => Promise<any>;
  validateUrl?: (url: string, provider?: any) => boolean | void;
  model?: string; [key: string]: unknown;
}
export interface ChatCompletionRequest { model: string; messages: unknown[]; [key: string]: unknown; }
export interface EmbeddingRequest { model: string; input: any; [key: string]: unknown; }

const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_BASE_URL = 'https://api.openai.com/v1';

function asRecord(v: unknown): Record<string, unknown> | undefined {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined;
}

export function getBaseUrl(provider: any): string {
  const p = asRecord(provider) ?? {};
  const candidate = p.baseUrl ?? p.baseUrlDefault ?? p.base_url ?? p.url ?? p.endpoint ?? p.host;
  if (typeof candidate === 'string' && candidate.trim()) return candidate.trim().replace(/\/+$/, '');
  return DEFAULT_BASE_URL;
}

export function getApiKey(provider: any): string | undefined {
  const p = asRecord(provider) ?? {};
  const direct = p.apiKey ?? p.api_key ?? p.token ?? p.accessToken ?? p.access_token ?? p.value ?? p.secret ?? p.key;
  if (typeof direct === 'string' && direct) return direct;
  for (const nested of [p.credential, p.account]) {
    const r = asRecord(nested);
    if (!r) continue;
    const v = r.value ?? r.apiKey ?? r.api_key ?? r.token ?? r.accessToken ?? r.access_token ?? r.secret ?? r.key;
    if (typeof v === 'string' && v) return v;
  }
  return undefined;
}

function resolveValidateUrl(provider: any) {
  const p = (provider && typeof provider === 'object') ? provider : {};
  if (typeof p.validateUrl === 'function') return p.validateUrl;
  return validateUrl;
}


function normalizeStatus(status: number, body: any, provider: any, model?: string): TransportError {
  const msg = (body && (body.error?.message || body.message || body.detail)) || `HTTP ${status}`;
  const requestId = body?.request_id ?? body?.requestId ?? body?.id;
  const baseOpts: any = { status, provider: provider?.id ?? provider?.provider, model, requestId, details: { status, requestId } };
  if (status === 401) return new TransportError(RouterErrorCode.AuthExpired, msg, { ...baseOpts, retryable: false });
  if (status === 403) return new TransportError(RouterErrorCode.Forbidden, msg, { ...baseOpts, retryable: false });
  if (status === 404) return new TransportError(RouterErrorCode.NotFound, msg, { ...baseOpts, retryable: false });
  if (status === 400) {
    const lower = String(msg).toLowerCase();
    if (lower.includes('context') && lower.includes('length')) return new TransportError(RouterErrorCode.ContextLength, msg, { ...baseOpts, retryable: false });
    return new TransportError(RouterErrorCode.BadRequest, msg, { ...baseOpts, retryable: false });
  }
  if (status === 402) return new TransportError(RouterErrorCode.QuotaExhausted, msg, { ...baseOpts, retryable: false });
  if (status === 429) {
    const lower = String(msg).toLowerCase();
    if (lower.includes('quota') || lower.includes('insufficient')) return new TransportError(RouterErrorCode.QuotaExhausted, msg, { ...baseOpts, retryable: false });
    return new TransportError(RouterErrorCode.RateLimited, msg, { ...baseOpts, retryable: true });
  }
  if (status >= 500) return new TransportError(RouterErrorCode.ServerTransient, msg, { ...baseOpts, retryable: true });
  return new TransportError(RouterErrorCode.Unknown, msg, { ...baseOpts, retryable: false });
}

async function doRequest(provider: any, path: string, body: any, method = 'POST', model?: string): Promise<any> {
  const baseUrl = getBaseUrl(provider);
  const url = `${baseUrl}/${path.replace(/^\/+/, '')}`;
  const v = resolveValidateUrl(provider);
  try { v(url, provider); } catch (e) {
    throw e instanceof TransportError ? e : new TransportError(RouterErrorCode.Forbidden, (e as Error)?.message ?? 'invalid url', { provider: provider?.id });
  }

  const apiKey = getApiKey(provider);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

  const controller = new AbortController();
  const timeoutMs = Number(provider?.timeoutMs ?? provider?.timeout ?? DEFAULT_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);

  const externalSignal: AbortSignal | undefined = provider?.signal ?? (body && body.signal);
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort();
    else externalSignal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  const fetchFn = (typeof provider?.fetch === 'function' ? provider.fetch : globalThis.fetch) as any;

  // remove signal from body
  const payload = body && typeof body === 'object' ? { ...body } : body;
  if (payload && typeof payload === 'object') delete (payload as any).signal;

  try {
    const res = await fetchFn(url, {
      method,
      headers,
      body: payload == null ? undefined : JSON.stringify(payload),
      signal: controller.signal,
      redirect: 'manual',
    });
    clearTimeout(timer);
    if (res.status >= 300 && res.status < 400) {
      throw new TransportError(RouterErrorCode.Forbidden, 'redirects are not allowed (SSRF guard)', { status: res.status, provider: provider?.id, model });
    }
    const text = await res.text();
    let json: any = null;
    if (text) {
      try { json = JSON.parse(text); } catch {
        throw new TransportError(RouterErrorCode.InvalidResponse, 'invalid JSON response', { status: res.status, provider: provider?.id, model });
      }
    }
    if (!res.ok) throw normalizeStatus(res.status, json, provider, model);
    return json;
  } catch (e: any) {
    clearTimeout(timer);
    if (e instanceof TransportError) throw e;
    if (e && (e.name === 'AbortError' || e.code === 'ABORT_ERR')) {
      if (timedOut) throw new TransportError(RouterErrorCode.Timeout, `request timed out after ${timeoutMs}ms`, { provider: provider?.id, model });
      throw new TransportError(RouterErrorCode.Cancelled, 'request cancelled', { provider: provider?.id, model });
    }
    throw new TransportError(RouterErrorCode.Network, e?.message ?? String(e), { provider: provider?.id, model, cause: e });
  }
}

export async function chatCompletions(provider: any, request: any): Promise<any> {
  const model = request?.model;
  return doRequest(provider, 'chat/completions', { ...request }, 'POST', model);
}

export async function listModels(provider: any): Promise<any> {
  return doRequest(provider, 'models', null, 'GET');
}

export async function embeddings(provider: any, request: any): Promise<any> {
  const model = request?.model;
  return doRequest(provider, 'embeddings', { ...request }, 'POST', model);
}

const transport = { chatCompletions, listModels, embeddings, validateUrl, getBaseUrl, getApiKey };
export default transport;
