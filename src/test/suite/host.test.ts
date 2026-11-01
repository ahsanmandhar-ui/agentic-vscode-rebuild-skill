import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Host Smoke', () => {
  test('extension activates', async () => {
    const ext = vscode.extensions.getExtension('AhsanMandhar.vibecode-engine-pro-free');
    assert.ok(ext, 'extension not found');
    if (!ext.isActive) await ext.activate();
    assert.ok(ext.isActive, 'extension not active');
  });

  test('commands are registered', async () => {
    const cmds = await vscode.commands.getCommands(true);
    const expected = ['vibecode.chat', 'vibecode.plan', 'vibecode.cli.run', 'vibecode.home.open', 'vibecode.refreshModels'];
    for (const c of expected) {
      assert.ok(cmds.includes(c), `missing command ${c}`);
    }
  });

  test('home command runs', async () => {
    await vscode.commands.executeCommand('vibecode.home.open');
  });
});