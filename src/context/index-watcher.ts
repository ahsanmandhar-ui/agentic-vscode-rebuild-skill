// src/context/index-watcher.ts
import * as vscode from 'vscode';
import { indexManager } from './index-manager';

let watcher: vscode.FileSystemWatcher | null = null;

export function startIndexWatcher(root: string): vscode.Disposable {
  if (watcher) watcher.dispose();
  watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(root, '**/*.{ts,js,md,py,json}'));
  const shouldIgnore = (uri: vscode.Uri) => uri.fsPath.includes('node_modules') || uri.fsPath.includes('.git') || uri.fsPath.includes('dist') || uri.fsPath.includes('out');
  const rebuild = (uri: vscode.Uri) => { if (shouldIgnore(uri)) return; try { indexManager.build(root); } catch {} };
  watcher.onDidChange(rebuild);
  watcher.onDidCreate(rebuild);
  watcher.onDidDelete(rebuild);
  return watcher;
}

export function stopIndexWatcher(): void {
  if (watcher) { watcher.dispose(); watcher = null; }
}
