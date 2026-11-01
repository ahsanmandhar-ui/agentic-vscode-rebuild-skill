// src/ui/ask-vibecode.ts
// Editor CodeLens + command handler for "Ask VibeCode" (U16).
import * as vscode from 'vscode';

export class AskVibeCodeCodeLensProvider implements vscode.CodeLensProvider {
  public provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    const top = new vscode.Range(0, 0, 0, 0);
    return [
      new vscode.CodeLens(top, {
        title: 'Ask VibeCode',
        command: 'vibecode.askVibeCode',
        arguments: [document.uri],
      }),
    ];
  }
}

export async function askVibeCodeCommand(uri?: vscode.Uri): Promise<{ ok: boolean; prompt?: string }> {
  const editor = vscode.window.activeTextEditor;
  const selection = editor?.selection;
  const selectedText = selection && !selection.isEmpty ? editor!.document.getText(selection) : '';
  const file = uri?.fsPath ?? editor?.document.uri.fsPath ?? '';
  const prompt = selectedText
    ? `Explain/modify this code from ${file}:\n\n${selectedText}`
    : `Help me with ${file || 'this file'}.`;
  await vscode.commands.executeCommand('vibecode.chat', { prompt });
  vscode.window.showInformationMessage('Sent selection to VibeCode chat.');
  return { ok: true, prompt };
}
