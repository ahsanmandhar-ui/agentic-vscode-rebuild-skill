// src/providers/model-config.ts
export interface ModelConfig {
  provider: 'openai' | 'anthropic' | 'ollama' | 'lmstudio' | 'custom';
  baseUrl: string;
  model: string;
  apiKey?: string;
}

export const DEFAULT_BASE_URLS: Record<ModelConfig['provider'], string> = {
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com/v1',
  ollama: 'http://localhost:11434/v1',
  lmstudio: 'http://localhost:1234/v1',
  custom: 'http://localhost:8000/v1',
};

export class ModelConfigStore {
  private config: ModelConfig | undefined;
  set(c: ModelConfig): void { this.config = { ...c }; }
  get(): ModelConfig | undefined { return this.config ? { ...this.config } : undefined; }
  clear(): void { this.config = undefined; }
  isConfigured(): boolean { return !!this.config?.model; }
}
