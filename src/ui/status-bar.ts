// src/ui/status-bar.ts
// Status bar item: active router, health badge, account indicator (U16.1).
import * as vscode from 'vscode';
import { ModelsAccountsPanel } from './models';

export interface StatusBarHandle {
  item: vscode.StatusBarItem;
  update: () => Promise<void>;
  dispose: () => void;
}

export function createVibeCodeStatusBar(
  context: vscode.ExtensionContext,
  modelsPanel: ModelsAccountsPanel,
): StatusBarHandle {
  const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  item.name = 'VibeCode Status';

  let timer: NodeJS.Timeout | undefined;

  const update = async (): Promise<void> => {
    try {
      const state = modelsPanel.getState();
      const accounts = state.accounts ?? [];
      let provider = 'none';
      let health = 'unknown';
      let account = '—';
      if (accounts.length > 0) {
        const decision = modelsPanel.decideRoute({ taskKind: 'chat', needsTools: false });
        provider = decision.provider || (accounts[0]?.provider ?? 'none');
        const chosen = decision.account ?? accounts[0];
        account = chosen?.label ?? chosen?.id ?? '—';
        health = chosen?.status ?? 'unknown';
      }
      const icon = health === 'ok' || health === 'healthy' ? '$(check)' : health === 'down' || health === 'unhealthy' ? '$(error)' : '$(info)';
      item.text = `${icon} VibeCode: ${provider} · ${health} · ${account}`;
      item.tooltip = `VibeCode — active router: ${provider}, health: ${health}, account: ${account}`;
      item.command = 'vibecode.models.switchProvider';
      item.backgroundColor = (health === 'down' || health === 'unhealthy' || health === 'auth_expired')
        ? new vscode.ThemeColor('statusBarItem.errorBackground')
        : undefined;
    } catch {
      item.text = '$(rocket) VibeCode';
      item.tooltip = 'VibeCode status';
    }
    item.show();
  };

  void update();
  timer = setInterval(() => { void update(); }, 30000);

  const dispose = () => {
    if (timer) clearInterval(timer);
    item.dispose();
  };
  context.subscriptions.push(item);
  context.subscriptions.push({ dispose });

  return { item, update, dispose };
}
