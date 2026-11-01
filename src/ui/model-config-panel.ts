// src/ui/model-config-panel.ts
import { escapeHtml } from '../supervisor';

export interface ModelConfigPanelArgs { provider?: string; baseUrl?: string; model?: string; hasKey?: boolean; }

export function renderModelConfigPanel(args: ModelConfigPanelArgs = {}): string {
  return [
    '<div class="vc-model-config">',
    '  <h2>Model Configuration</h2>',
    '  <label>Provider <select id="mc-provider">',
    '    <option value="openai">OpenAI</option>',
    '    <option value="anthropic">Anthropic</option>',
    '    <option value="ollama">Ollama (local)</option>',
    '    <option value="lmstudio">LM Studio (local)</option>',
    '    <option value="custom">Custom (OpenAI-compatible)</option>',
    '  </select></label>',
    `  <label>Base URL <input id="mc-baseurl" value="${escapeHtml(args.baseUrl ?? '')}" /></label>`,
    `  <label>Model <input id="mc-model" value="${escapeHtml(args.model ?? '')}" placeholder="gpt-4o-mini" /></label>`,
    '  <label>API Key <input id="mc-apikey" type="password" placeholder="sk-..." /></label>',
    '  <button id="mc-save">Save</button>',
    `  <p class="status">${args.hasKey ? 'Key stored' : 'No key stored'}</p>`,
    '</div>',
  ].join('\n');
}
