// src/search/types.ts
// Pure search provider types. No vscode imports; unit-testable with fakes.

export interface SearchResult {
  title: string;
  url: string;
  snippet?: string;
  description?: string;
  source?: string;
  score?: number;
  publishedAt?: string;
  [key: string]: unknown;
}

export interface SearchOptions {
  maxResults?: number;
  limit?: number;
  signal?: AbortSignal;
  timeoutMs?: number;
  [key: string]: unknown;
}

export interface SearchQuery {
  query: string;
  options?: SearchOptions;
  [key: string]: unknown;
}

export interface SearchProvider {
  id: string;
  name?: string;
  label?: string;
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
  health?: () => Promise<{ ok: boolean; [key: string]: unknown }>;
  test?: (query?: string) => Promise<{ ok: boolean; count?: number; latencyMs?: number; [key: string]: unknown }>;
  [key: string]: unknown;
}

export class RateLimitError extends Error {
  code: string;
  status?: number;
  retryable: boolean;
  retryAfterMs?: number;
  provider?: string;
  constructor(message: string, opts: { code?: string; status?: number; retryable?: boolean; retryAfterMs?: number; provider?: string } = {}) {
    super(message);
    this.name = 'RateLimitError';
    this.code = opts.code ?? 'rate_limited';
    this.status = opts.status ?? 429;
    this.retryable = opts.retryable ?? true;
    this.retryAfterMs = opts.retryAfterMs;
    this.provider = opts.provider;
  }
}

export type SearchProviderFactory = (options?: Record<string, unknown>) => SearchProvider;

export default {
  // convenience re-export placeholder
};
