// src/providers/router-types.ts
// Pure provider/router types. No runtime dependencies; vscode is optional and not imported here
// so this module stays unit-testable with fakes.

export interface ModelCapabilities {
  id?: string;
  model?: string;
  modelId?: string;
  name?: string;
  provider?: string;
  providerId?: string;

  contextWindow?: number;
  maxInputTokens?: number;
  maxOutputTokens?: number;
  maxTokens?: number;

  supportsTools?: boolean;
  supportsStreaming?: boolean;
  supportsJsonMode?: boolean;
  supportsVision?: boolean;
  supportsAudio?: boolean;
  supportsFunctionCalling?: boolean;

  tools?: boolean;
  streaming?: boolean;
  jsonMode?: boolean;
  vision?: boolean;

  source?: 'provider-api' | 'config' | 'documentation' | 'unknown';
  updatedAt?: string;
  timestamp?: string;
  checkedAt?: string;

  [key: string]: unknown;
}

export interface Capability {
  tools: boolean;
  streaming: boolean;
  jsonMode: boolean;
  contextWindow?: number;
  source: 'provider-api' | 'config' | 'documentation' | 'unknown';
}

export enum RouterErrorCode {
  Unknown = 'unknown',
  unknown = 'unknown',
  UNKNOWN = 'unknown',

  Network = 'network',
  network = 'network',
  NETWORK = 'network',

  Timeout = 'timeout',
  timeout = 'timeout',
  TIMEOUT = 'timeout',

  Cancelled = 'cancelled',
  cancelled = 'cancelled',
  CANCELLED = 'cancelled',

  AuthExpired = 'auth_expired',
  auth_expired = 'auth_expired',
  AUTH_EXPIRED = 'auth_expired',

  Unauthorized = 'unauthorized',
  unauthorized = 'unauthorized',
  UNAUTHORIZED = 'unauthorized',

  Forbidden = 'forbidden',
  forbidden = 'forbidden',
  FORBIDDEN = 'forbidden',

  RateLimited = 'rate_limited',
  rate_limited = 'rate_limited',
  RATE_LIMITED = 'rate_limited',

  QuotaExhausted = 'quota_exhausted',
  quota_exhausted = 'quota_exhausted',
  QUOTA_EXHAUSTED = 'quota_exhausted',

  ContextLength = 'context_length',
  context_length = 'context_length',
  CONTEXT_LENGTH = 'context_length',

  OutputLimit = 'output_limit',
  output_limit = 'output_limit',
  OUTPUT_LIMIT = 'output_limit',

  ServerTransient = 'server_transient',
  server_transient = 'server_transient',
  SERVER_TRANSIENT = 'server_transient',

  ModelUnavailable = 'model_unavailable',
  model_unavailable = 'model_unavailable',
  MODEL_UNAVAILABLE = 'model_unavailable',

  NotFound = 'not_found',
  not_found = 'not_found',
  NOT_FOUND = 'not_found',

  BadRequest = 'bad_request',
  bad_request = 'bad_request',
  BAD_REQUEST = 'bad_request',

  Conflict = 'conflict',
  conflict = 'conflict',
  CONFLICT = 'conflict',

  InvalidResponse = 'invalid_response',
  invalid_response = 'invalid_response',
  INVALID_RESPONSE = 'invalid_response',

  Unsupported = 'unsupported',
  unsupported = 'unsupported',
  UNSUPPORTED = 'unsupported',
}

export const RouterErrorKind = RouterErrorCode;
export type RouterErrorKind = RouterErrorCode;
export const RouterErrorCodes = RouterErrorCode;
export type RouterErrorCodes = RouterErrorCode;

export interface RouterError {
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
}
// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export interface RouterProviderModel {
  id: string;
  name?: string;
  label?: string;
  capabilities?: ModelCapabilities;
}

export interface RouterProvider {
  id: string;
  name?: string;
  label?: string;
  baseUrl?: string;
  baseUrlDefault?: string;
  auth?: 'api-key' | 'oauth' | 'none' | 'local';
  pricing?: 'free' | 'free-tier' | 'paid' | 'own-key' | 'local' | 'unknown';
  docsUrl?: string;

  models?: () => Promise<RouterProviderModel[] | string[]>;
  capabilities?: (model: string) => ModelCapabilities | Capability | Promise<ModelCapabilities | Capability>;
  health?: () => Promise<HealthResult>;
  test?: (credential?: AccountCredential) => Promise<HealthResult>;

  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Account credential
// ---------------------------------------------------------------------------

export interface AccountCredential {
  id?: string;
  credentialId?: string;
  accountId?: string;
  account?: string;

  provider?: string;
  providerId?: string;

  secretRef?: string;
  keyName?: string;

  authKind?: 'api-key' | 'oauth' | 'local';
  kind?: 'api-key' | 'oauth' | 'local';

  value?: string;
  apiKey?: string;
  token?: string;
  accessToken?: string;
  refreshToken?: string;

  addedAt?: string;
  expiresAt?: string;

  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Routing context & profile
// ---------------------------------------------------------------------------

export interface RouterContext {
  requestId?: string;
  traceId?: string;

  taskKind?: 'chat' | 'agent' | 'completion';
  needsTools?: boolean;

  provider?: string;
  providerId?: string;
  model?: string;
  modelId?: string;

  account?: AccountCredential;
  accountId?: string;
  credential?: AccountCredential;

  profile?: RouteProfile;
  profileId?: string;

  signal?: AbortSignal;
  now?: () => Date;

  secrets?: {
    get(name: string): Promise<string | undefined>;
    set(name: string, value: string): Promise<void>;
    delete(name: string): Promise<void>;
  };

  [key: string]: unknown;
}

export interface RouteProfile {
  id?: string;
  name?: string;
  label?: string;

  provider?: string;
  providerId?: string;
  model?: string;
  modelId?: string;

  accountId?: string;
  account?: AccountCredential;

  priority?: number;
  weight?: number;
  enabled?: boolean;
  isDefault?: boolean;

  fallback?: boolean;
  authorizedForFallback?: boolean;

  capabilities?: ModelCapabilities;

  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

export interface HealthResult {
  ok: boolean;
  status?: 'ok' | 'degraded' | 'down' | 'unknown' | 'healthy' | 'unhealthy';
  healthy?: boolean;

  latencyMs?: number;
  durationMs?: number;

  message?: string;
  error?: RouterError | string;
  checkedAt?: string;
  timestamp?: string;
  at?: string;

  provider?: string;
  providerId?: string;
  model?: string;
  modelId?: string;

  [key: string]: unknown;
}

