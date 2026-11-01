# Plan: Close Runtime Verification Gap

## Goal
Install @types/vscode + test harness in the real extension repo, fix 17 webview contract errors, run full compile+test, provider smoke tests, package VSIX, update plan/progress/structure.

## Phases
### Phase A — Tooling (P-A)
- A1 Install @types/vscode and @vscode/test-electron in vibecode-engine-source.
- A2 Add tsconfig paths/types for vscode.
- A3 Add npm scripts: compile, test, smoke.

### Phase B — Fix webview contract errors (P-B)
- B1 Reconcile VibeCodeWebviewProvider vs SkillsWebviewProvider (single class).
- B2 Add missing members: getHtml, handleModelsCommand, deps, postPanelState.
- B3 Remove duplicate getHtml; ensure one implementation.
- B4 Wire search panel message handlers.
- B5 Compile clean (0 errors).

### Phase C — Tests (P-C)
- C1 Run tsc --noEmit (0 errors).
- C2 Run vitest (all tests pass).
- C3 Add SecretStorage round-trip test.
- C4 Add webview render test.

### Phase D — Provider smoke tests (P-D)
- D1 DuckDuckGo search probe.
- D2 Brave search with key (if provided).
- D3 SerpAPI with key (if provided).
- D4 Capability refresh command.

### Phase E — Package & verify (P-E)
- E1 Package VSIX (npx vsce package).
- E2 Install in isolated profile (--user-data-dir/--extensions-dir).
- E3 Upgrade test (install over previous).
- E4 Verify activation + commands + webview.

### Phase F — Docs (P-F)
- F1 Update plan.md, progress.md, structure.md checkpoints.
- F2 Final honest evaluation report.

## Next single action
Phase A reported complete; next: Phase B (task_0020) — reconcile webview providers and add missing members, then compile clean.