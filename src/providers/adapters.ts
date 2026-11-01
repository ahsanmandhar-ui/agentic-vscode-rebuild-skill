// src/providers/adapters.ts
// Adapter factories for built-in providers. Pure (no vscode). Each factory returns a
// RouterProvider with capability metadata per model.

import { RouterProvider, RouterProviderModel, ModelCapabilities } from './router-types';

export interface AdapterOptions {
  id?: string;
  name?: string;
  label?: string;
  baseUrl?: string;
  baseUrlDefault?: string;
  apiKey?: string;
  auth?: RouterProvider['auth'];
  pricing?: RouterProvider['pricing'];
  docsUrl?: string;
  models?: RouterProviderModel[];
  capabilities?: ModelCapabilities | ((model: string) => ModelCapabilities);
  allowlist?: string[];
  [key: string]: unknown;
}

const UPDATED_AT = '2026-10-31';

function cap(overrides: Partial<ModelCapabilities> = {}): ModelCapabilities {
  return {
    supportsTools: true,
    supportsStreaming: true,
    supportsJsonMode: true,
    supportsVision: false,
    supportsAudio: false,
    supportsFunctionCalling: true,
    contextWindow: 128000,
    maxOutputTokens: 4096,
    source: 'documentation',
    updatedAt: UPDATED_AT,
    ...overrides,
  };
}

function model(id: string, name: string, overrides: Partial<ModelCapabilities> = {}): RouterProviderModel {
  return { id, name, capabilities: cap(overrides) };
}

function lookupModel(models: RouterProviderModel[], modelId: string): RouterProviderModel | undefined {
  const needle = String(modelId ?? '').toLowerCase();
  return models.find((m) => String(m.id ?? m.name ?? '').toLowerCase() === needle);
}

function makeProvider(opts: {
  id: string;
  name: string;
  label?: string;
  baseUrl: string;
  auth: NonNullable<RouterProvider['auth']>;
  pricing: NonNullable<RouterProvider['pricing']>;
  docsUrl: string;
  models: RouterProviderModel[];
  capabilities?: ModelCapabilities | ((model: string) => ModelCapabilities);
}): RouterProvider {
  const capabilitiesFn = (m: string): ModelCapabilities => {
    if (typeof opts.capabilities === 'function') return (opts.capabilities as (x: string) => ModelCapabilities)(m);
    const found = lookupModel(opts.models, m);
    if (found?.capabilities) return found.capabilities as ModelCapabilities;
    if (opts.capabilities && typeof opts.capabilities === 'object') return opts.capabilities as ModelCapabilities;
    return cap({ source: 'unknown' });
  };

  const provider: RouterProvider = {
    id: opts.id,
    name: opts.name,
    label: opts.label ?? opts.name,
    baseUrl: opts.baseUrl,
    baseUrlDefault: opts.baseUrl,
    auth: opts.auth,
    pricing: opts.pricing,
    docsUrl: opts.docsUrl,
    models: async () => opts.models.map((m) => ({ ...m, capabilities: m.capabilities ?? cap() })),
    capabilities: (m: string) => capabilitiesFn(m),
    health: async () => ({ ok: true, status: 'ok', healthy: true, provider: opts.id, checkedAt: new Date().toISOString() }),
  };
  return provider;
}

export function createLiteLLMAdapter(options: AdapterOptions = {}): RouterProvider {
  const models: RouterProviderModel[] = options.models ?? [
    model('gpt-4o-mini', 'GPT-4o mini (via LiteLLM)', { contextWindow: 128000 }),
    model('claude-3-5-sonnet', 'Claude 3.5 Sonnet (via LiteLLM)', { contextWindow: 200000 }),
  ];
  return makeProvider({
    id: options.id ?? 'litellm',
    name: options.name ?? 'LiteLLM',
    label: options.label ?? 'LiteLLM',
    baseUrl: options.baseUrl ?? 'http://localhost:4000',
    auth: (options.auth as any) ?? 'api-key',
    pricing: (options.pricing as any) ?? 'own-key',
    docsUrl: options.docsUrl ?? 'https://docs.litellm.ai',
    models,
    capabilities: options.capabilities,
  });
}

export function createOpenRouterAdapter(options: AdapterOptions = {}): RouterProvider {
  const models: RouterProviderModel[] = options.models ?? [
    model('openai/gpt-4o-mini', 'GPT-4o mini', { contextWindow: 128000, supportsVision: true }),
    model('anthropic/claude-3.5-sonnet', 'Claude 3.5 Sonnet', { contextWindow: 200000, supportsVision: true }),
    model('google/gemini-2.0-flash-001', 'Gemini 2.0 Flash', { contextWindow: 1048576, supportsVision: true }),
  ];
  return makeProvider({
    id: options.id ?? 'openrouter',
    name: options.name ?? 'OpenRouter',
    label: options.label ?? 'OpenRouter',
    baseUrl: options.baseUrl ?? 'https://openrouter.ai/api/v1',
    auth: (options.auth as any) ?? 'api-key',
    pricing: (options.pricing as any) ?? 'paid',
    docsUrl: options.docsUrl ?? 'https://openrouter.ai/docs',
    models,
    capabilities: options.capabilities,
  });
}

export function createGeminiAdapter(options: AdapterOptions = {}): RouterProvider {
  const models: RouterProviderModel[] = options.models ?? [
    model('gemini-2.0-flash', 'Gemini 2.0 Flash', { contextWindow: 1048576, supportsVision: true }),
    model('gemini-1.5-pro', 'Gemini 1.5 Pro', { contextWindow: 2097152, supportsVision: true }),
    model('gemini-1.5-flash', 'Gemini 1.5 Flash', { contextWindow: 1048576, supportsVision: true }),
  ];
  return makeProvider({
    id: options.id ?? 'gemini',
    name: options.name ?? 'Gemini',
    label: options.label ?? 'Gemini',
    baseUrl: options.baseUrl ?? 'https://generativelanguage.googleapis.com/v1beta/openai/',
    auth: (options.auth as any) ?? 'api-key',
    pricing: (options.pricing as any) ?? 'paid',
    docsUrl: options.docsUrl ?? 'https://ai.google.dev/gemini-api/docs/openai',
    models,
    capabilities: options.capabilities,
  });
}

export function createOllamaAdapter(options: AdapterOptions = {}): RouterProvider {
  const models: RouterProviderModel[] = options.models ?? [
    model('llama3.1', 'Llama 3.1', { contextWindow: 128000 }),
    model('qwen2.5', 'Qwen 2.5', { contextWindow: 32768 }),
  ];
  return makeProvider({
    id: options.id ?? 'ollama',
    name: options.name ?? 'Ollama',
    label: options.label ?? 'Ollama',
    baseUrl: options.baseUrl ?? 'http://localhost:11434/v1',
    auth: (options.auth as any) ?? 'local',
    pricing: (options.pricing as any) ?? 'local',
    docsUrl: options.docsUrl ?? 'https://ollama.com',
    models,
    capabilities: options.capabilities,
  });
}

export function createLMStudioAdapter(options: AdapterOptions = {}): RouterProvider {
  const models: RouterProviderModel[] = options.models ?? [
    model('local-model', 'Local model (LM Studio)', { contextWindow: 32768 }),
  ];
  return makeProvider({
    id: options.id ?? 'lmstudio',
    name: options.name ?? 'LM Studio',
    label: options.label ?? 'LM Studio',
    baseUrl: options.baseUrl ?? 'http://localhost:1234/v1',
    auth: (options.auth as any) ?? 'local',
    pricing: (options.pricing as any) ?? 'local',
    docsUrl: options.docsUrl ?? 'https://lmstudio.ai',
    models,
    capabilities: options.capabilities,
  });
}

export function createCustomAdapter(options: AdapterOptions = {}): RouterProvider {
  const models: RouterProviderModel[] = options.models ?? [];
  const allowlist = Array.isArray(options.allowlist) ? options.allowlist : [];
  const provider = makeProvider({
    id: options.id ?? 'custom',
    name: options.name ?? 'Custom',
    label: options.label ?? 'Custom',
    baseUrl: options.baseUrl ?? 'http://localhost:8000/v1',
    auth: (options.auth as any) ?? 'api-key',
    pricing: (options.pricing as any) ?? 'unknown',
    docsUrl: options.docsUrl ?? '',
    models,
    capabilities: options.capabilities,
  });
  (provider as any).allowlist = allowlist;
  (provider as any).allowedHosts = allowlist;
  (provider as any).custom = true;
  (provider as any).type = 'custom';
  (provider as any).kind = 'custom';
  return provider;
}

export const createOpenRouterProvider = createOpenRouterAdapter;
export const createLiteLlmAdapter = createLiteLLMAdapter;
export const createLiteLLMProvider = createLiteLLMAdapter;
export const createLiteLlmProvider = createLiteLLMAdapter;
export const createOllamaProvider = createOllamaAdapter;
export const createOllamaLmStudioAdapter = createOllamaAdapter;
export const createLmStudioAdapter = createLMStudioAdapter;
export const createLMStudioProvider = createLMStudioAdapter;
export const createLmStudioProvider = createLMStudioAdapter;
export const createCustomProvider = createCustomAdapter;
export const createGeminiProvider = createGeminiAdapter;

export default {
  createOpenRouterAdapter,
  createLiteLLMAdapter,
  createGeminiAdapter,
  createOllamaAdapter,
  createLMStudioAdapter,
  createCustomAdapter,
};
