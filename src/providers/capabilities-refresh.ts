// src/providers/capabilities-refresh.ts
// Refresh model capabilities by probing /models and a tiny completion, then updating the cache.

import { listModels, chatCompletions } from './transport';
import { Capability } from './router-types';
import {
  CapabilityCache,
  createCapabilityCache,
} from './capabilities';

export const REFRESH_CAPABILITIES_COMMAND_ID = 'vibecode.refreshCapabilities';
export const REFRESH_CAPABILITIES_COMMAND = REFRESH_CAPABILITIES_COMMAND_ID;
export const CAPABILITIES_REFRESH_COMMAND_ID = REFRESH_CAPABILITIES_COMMAND_ID;
export const CAPABILITIES_REFRESH_COMMAND = REFRESH_CAPABILITIES_COMMAND_ID;
export const COMMAND_ID = REFRESH_CAPABILITIES_COMMAND_ID;
export const commandId = REFRESH_CAPABILITIES_COMMAND_ID;

export interface RefreshCapabilitiesOptions {
  cache?: CapabilityCache;
  model?: string | { id?: string; model?: string; modelId?: string; name?: string };
  modelId?: string;
  messages?: unknown[];
  maxTokens?: number;
  ttlMs?: number;
  force?: boolean;
  [key: string]: unknown;
}

function providerIdOf(provider: any): string {
  if (typeof provider === 'string') return provider;
  return String(provider?.id ?? provider?.provider ?? provider?.providerId ?? provider?.name ?? '');
}

function modelIdOf(model: any): string {
  if (typeof model === 'string') return model;
  if (!model || typeof model !== 'object') return '';
  return String(model.id ?? model.model ?? model.modelId ?? model.name ?? '');
}

function extractModelIds(modelsResp: any, provider: any): string[] {
  if (Array.isArray(modelsResp?.data)) {
    return modelsResp.data.map((m: any) => String(m?.id ?? m?.model ?? m?.name ?? '')).filter(Boolean);
  }
  if (Array.isArray(modelsResp?.models)) {
    return modelsResp.models.map((m: any) => (typeof m === 'string' ? m : String(m?.id ?? m?.model ?? m?.name ?? ''))).filter(Boolean);
  }
  if (Array.isArray(modelsResp)) {
    return modelsResp.map((m: any) => (typeof m === 'string' ? m : String(m?.id ?? m?.model ?? m?.name ?? ''))).filter(Boolean);
  }
  if (typeof provider?.models === 'function') {
    try {
      // best-effort synchronous-ish; handled by caller if needed
    } catch { /* ignore */ }
  }
  return [];
}

export async function refreshCapabilities(provider: any, opts?: RefreshCapabilitiesOptions): Promise<any> {
  const options = opts ?? {};
  const pid = providerIdOf(provider);
  const cache: CapabilityCache =
    options.cache instanceof CapabilityCache ? options.cache : createCapabilityCache();

  // 1. Probe /models
  let modelsResp: any = null;
  try {
    if (typeof provider?.listModels === 'function') {
      modelsResp = await Promise.resolve(provider.listModels());
    } else {
      modelsResp = await listModels(provider);
    }
  } catch {
    modelsResp = null;
  }

  // Fallback to provider.models() if transport failed or empty
  let modelIds = extractModelIds(modelsResp, provider);
  if (modelIds.length === 0 && typeof provider?.models === 'function') {
    try {
      const r = await Promise.resolve(provider.models());
      modelIds = extractModelIds(r, provider);
    } catch {
      modelIds = [];
    }
  }

  // 2. Resolve target model
  let modelId = modelIdOf(options.model) || String(options.modelId ?? '');
  if (!modelId && modelIds.length > 0) modelId = modelIds[0];
  if (!modelId && typeof provider?.model === 'string') modelId = provider.model;
  if (!modelId && typeof provider?.defaultModel === 'string') modelId = provider.defaultModel;

  // 3. Tiny completion
  let completion: any = null;
  let completionOk = false;
  if (modelId) {
    try {
      if (typeof provider?.chatCompletions === 'function') {
        completion = await Promise.resolve(provider.chatCompletions({
          model: modelId,
          messages: options.messages ?? [{ role: 'user', content: 'hi' }],
          max_tokens: options.maxTokens ?? 1,
        }));
      } else {
        completion = await chatCompletions(provider, {
          model: modelId,
          messages: options.messages ?? [{ role: 'user', content: 'hi' }],
          max_tokens: options.maxTokens ?? 1,
        });
      }
      completionOk = true;
    } catch {
      completion = null;
      completionOk = false;
    }
  }

  // 4. Derive capability
  let base: any;
  if (typeof provider?.capabilities === 'function') {
    try { base = await Promise.resolve(provider.capabilities(modelId)); } catch { base = undefined; }
  }
  const capability: Capability = {
    tools: !!(base?.tools ?? base?.supportsTools ?? base?.supportsFunctionCalling),
    streaming: !!(base?.streaming ?? base?.supportsStreaming),
    jsonMode: !!(base?.jsonMode ?? base?.supportsJsonMode),
    contextWindow: Number(base?.contextWindow ?? base?.maxInputTokens ?? base?.maxTokens ?? 4096) || 4096,
    source: 'provider-api',
  };

  // 5. Update cache
  if (modelId) {
    try {
      cache.set(pid, modelId, capability, options.ttlMs);
    } catch {
      // ignore cache errors
    }
  }
  // Also update for all probed models with conservative defaults? Keep minimal.

  const result: any = {
    ok: modelsResp !== null || completionOk,
    modelsOk: modelsResp !== null,
    completionOk,
    providerId: pid,
    modelId,
    models: modelIds,
    completion,
    capability,
    capabilities: capability,
    tools: capability.tools,
    streaming: capability.streaming,
    jsonMode: capability.jsonMode,
    contextWindow: capability.contextWindow,
    source: capability.source,
  };
  return result;
}

export default {
  refreshCapabilities,
  REFRESH_CAPABILITIES_COMMAND_ID,
  REFRESH_CAPABILITIES_COMMAND,
  CAPABILITIES_REFRESH_COMMAND_ID,
  CAPABILITIES_REFRESH_COMMAND,
  COMMAND_ID,
  commandId,
};
