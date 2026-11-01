import { describe, it, expect, vi } from 'vitest';
vi.mock('vscode', () => ({
  Uri: { joinPath: (...args: any[]) => ({ fsPath: args.join('/') }) },
  EventEmitter: class { event = () => {}; fire = () => {}; dispose = () => {}; },
}));
import { VibeCodeWebviewProvider } from '../webview';

describe('webview render', () => {
  it('renders html document with CSP and app container', () => {
    const ctx: any = { extensionUri: { fsPath: '/ext' } };
    const provider: any = new VibeCodeWebviewProvider(ctx);
    const webview: any = { cspSource: 'https://example' };
    const html = provider.getHtml(webview);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('id="app"');
    expect(html).toContain("default-src 'none'");
    expect(html).toContain('nonce-');
  });
});

