// src/providers/model-config-storage.ts
import * as vscode from 'vscode';
import { ModelConfig, ModelConfigStore } from './model-config';

const SECRET_KEY = 'vibecode.model.apiKey';
const STATE_KEY = 'vibecode.model.config';

export const modelConfigStore = new ModelConfigStore();

export async function loadModelConfig(context: vscode.ExtensionContext): Promise<void> {
  const stored = context.globalState.get<ModelConfig>(STATE_KEY);
  if (stored) {
    const apiKey = await context.secrets.get(SECRET_KEY);
    modelConfigStore.set({ ...stored, apiKey: apiKey ?? stored.apiKey });
  }
}

export async function saveModelConfig(context: vscode.ExtensionContext, config: ModelConfig): Promise<void> {
  const { apiKey, ...rest } = config;
  await context.globalState.update(STATE_KEY, rest);
  if (apiKey) await context.secrets.store(SECRET_KEY, apiKey);
  else await context.secrets.delete(SECRET_KEY);
  modelConfigStore.set(config);
}
