import * as assert from "assert";
import * as vscode from "vscode";

export async function run(): Promise<void> {
  const ext = vscode.extensions.getExtension("AhsanMandhar.vibecode-engine-pro-free");
  assert.ok(ext, "extension not found");
  if (!ext.isActive) await ext.activate();
  assert.ok(ext.isActive, "extension not active");

  const cmds = await vscode.commands.getCommands(true);
  const expected = ["vibecode.chat", "vibecode.plan", "vibecode.cli.run", "vibecode.home.open", "vibecode.refreshModels"];
  for (const c of expected) {
    assert.ok(cmds.includes(c), "missing command " + c);
  }
}
