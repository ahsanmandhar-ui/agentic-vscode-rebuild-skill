import { describe, it, expect } from 'vitest';
import { vi } from 'vitest';

vi.mock('vscode', () => ({
  Uri: { joinPath: (...args: any[]) => ({ fsPath: args.join('/') }) },
  EventEmitter: class { event = () => {}; fire = () => {}; dispose = () => {}; },
  window: { showInformationMessage: () => {}, showQuickPick: async () => undefined, showInputBox: async () => undefined },
  workspace: { getConfiguration: () => ({ get: () => false }) },
  commands: { registerCommand: () => ({ dispose: () => {} }) },
}));

import { VibeCodeWebviewProvider } from '../webview';

describe('host smoke', () => {
  it('webview provider getHtml returns document', () => {
    const ctx: any = { extensionUri: { fsPath: '/ext' }, subscriptions: [] };
    const provider: any = new VibeCodeWebviewProvider(ctx);
    const webview: any = { cspSource: 'https://example' };
    const html = provider.getHtml(webview);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('id="app"');
  });

  it('extension module exports activate/deactivate', async () => {
    const mod: any = await import('../extension');
    expect(typeof mod.activate).toBe('function');
    expect(typeof mod.deactivate).toBe('function');
  });
});
