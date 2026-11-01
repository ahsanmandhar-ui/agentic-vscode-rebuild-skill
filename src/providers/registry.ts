// src/providers/registry.ts
// ProviderRegistry singleton. Built-in adapters are registered on first access.

import { RouterProvider } from './router-types';
import * as adapters from './adapters';

export class ProviderRegistry {
  private static instance: ProviderRegistry | null = null;
  private providers: Map<string, RouterProvider> = new Map();
  private builtinsRegistered = false;

  private constructor() {}

  private registerBuiltins(): void {
    if (this.builtinsRegistered) return;
    const builtins: RouterProvider[] = [
      adapters.createOpenRouterAdapter(),
      adapters.createLiteLLMAdapter(),
      adapters.createGeminiAdapter(),
      adapters.createOllamaAdapter(),
      adapters.createCustomAdapter(),
    ];
    for (const p of builtins) {
      if (!this.providers.has(p.id)) this.providers.set(p.id, p);
    }
    this.builtinsRegistered = true;
  }

  static getInstance(): ProviderRegistry {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry();
      ProviderRegistry.instance.registerBuiltins();
    }
    return ProviderRegistry.instance;
  }

  register(provider: RouterProvider): RouterProvider {
    if (!provider || typeof provider.id !== 'string' || !provider.id) {
      throw new Error('provider must have a non-empty id');
    }
    this.providers.set(provider.id, provider);
    return provider;
  }

  get(id: string): RouterProvider | undefined {
    return this.providers.get(id);
  }

  has(id: string): boolean {
    return this.providers.has(id);
  }

  list(): RouterProvider[] {
    return Array.from(this.providers.values());
  }

  unregister(id: string): boolean {
    return this.providers.delete(id);
  }

  // Convenience aliases
  registerProvider(provider: RouterProvider): RouterProvider {
    return this.register(provider);
  }

  getProvider(id: string): RouterProvider | undefined {
    return this.get(id);
  }

  listProviders(): RouterProvider[] {
    return this.list();
  }

  static reset(): void {
    ProviderRegistry.instance = null;
  }
}

function ensureRegistry(): ProviderRegistry {
  return ProviderRegistry.getInstance();
}

export function getRegistry(): ProviderRegistry {
  return ensureRegistry();
}

export function registerProvider(...args: any[]): RouterProvider {
  const registry = ensureRegistry();
  const first = args[0];

  if (typeof first === 'function') {
    const created = (first as (opts?: any) => RouterProvider)({});
    return registry.register(created);
  }

  if (typeof first === 'string') {
    const second = args[1];
    if (second && typeof second === 'object' && typeof (second as any).id === 'string') {
      const p = { ...(second as any), id: (second as any).id || first } as RouterProvider;
      return registry.register(p);
    }
    if (typeof second === 'function') {
      const created = (second as (opts?: any) => RouterProvider)({ id: first });
      if (created && typeof created.id === 'string' && !created.id) (created as any).id = first;
      return registry.register(created);
    }
    // default: create a custom adapter with that id
    const created = adapters.createCustomAdapter({ id: first });
    return registry.register(created);
  }

  if (first && typeof first === 'object') {
    return registry.register(first as RouterProvider);
  }

  throw new Error('registerProvider expects a provider, id, or factory');
}

export function listProviders(): RouterProvider[] {
  return ensureRegistry().list();
}

// Re-export adapters for convenience
export * from './adapters';

export default ProviderRegistry;
