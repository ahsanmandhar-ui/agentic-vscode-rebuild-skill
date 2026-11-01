# Plan: Remaining Work to Full Industrial Standard

## Context
Extension is at 0.1.42. Sidebar, tabs, chat streaming, agent loop, model config, CSS, bundling all working. Remaining items below.

## Remaining (genuinely unimplemented)

### R1 — Native diff editor (preview exists; apply is silent)
- R1.1 `vibecode.edit.apply` should open native diff (original vs. proposed) BEFORE applying, with accept/reject.
- R1.2 Wire into agent loop: when agent proposes an edit, show diff and require approval.
- Acceptance: user sees diff, can accept/reject.

### R2 — MCP tool invocation in agent loop
- R2.1 Auto-wire MCP tools into agent tool set when `mcp.serverCommand` is set (currently only lists tools).
- R2.2 Add `createMCPTools` merge in webview chat handler (already imports mcpManager; needs getClient check — done, but getClient returns null until connect command run). Need auto-connect at activation (done in 0.1.38). Verify it works.
- Acceptance: agent can call MCP tools.

### R3 — Enterprise governance
- R3.1 Data classification labels persisted via settings (schema added; wire settings panel selector to `globalState`).
- R3.2 Telemetry consent prompt on first run (command exists; needs auto-prompt on activation if not set).
- R3.3 Backup/restore already implemented.
- R3.4 Deletion command already implemented.
- Acceptance: settings panel persists classification + consent.

### R4 — Inline completion
- R4.1 `provideInlineCompletionItems` calls model if configured (done).
- R4.2 Add caching + debounce to avoid blocking typing.
- R4.3 Respect `editor.inlineSuggest` setting.
- Acceptance: ghost text appears and accepts with Tab.

### R5 — Semantic indexing
- R5.1 Wire `search_semantic` tool into agent (done).
- R5.2 Add file watcher to rebuild index incrementally.
- R5.3 Respect .gitignore.
- Acceptance: search returns relevant chunks.

### R6 — Host activation verification
- R6.1 Close all VS Code instances, run `node out/test/runTest.js` in isolated profile.
- R6.2 Fix any activation errors.
- Acceptance: host smoke passes.

### R7 — Git integration beyond status/commit
- R7.1 Add `vibecode.git.push`, `vibecode.git.pull`, `vibecode.git.diff`.
- Acceptance: commands work.

## Execution order
R1 → R2 → R3 → R4 → R5 → R6 → R7, with R3/R4 parallel to R1/R2.

## Next single action
Start R1: native diff preview before apply (modify `vibecode.edit.apply` to call `vibecode.edit.preview` first, then apply on accept).
