# Problems & Solution Report — VibeCode Extension (Industrial Standard)

## 1. Problem Inventory (verified against code)

### P1 — No live model response (CRITICAL)
- `streamChat()` implemented & tested with mock fetch, but never called at runtime.
- `vibecode.chat` / project chat are shells; webview `streamChunk` handler exists but backend never posts.
- `ModelConfigStore` in-memory only; `vibecode.models.configure` shows an info message.

### P2 — No edit application
- `applyEdits`/`makeUnifiedDiff` pure functions; nothing calls `workspace.applyEdit` or opens native diff.

### P3 — No terminal integration
- `runTerminal` spawns child process; not using `vscode.window.createTerminal`.

### P4 — No inline completions registered
- Ghost text renderer exists; no `CompletionItemProvider` registered.

### P5 — No native diff / git
- Diff review is HTML; no git commit/branch/PR commands.

### P6 — Codebase indexing naive
- Substring search only; no embeddings, file watcher, or ignore rules.

### P7 — MCP not launched
- `StdioMCPClient` interface exists; no server started, no tool discovery.

### P8 — Checkpoints not applied
- `CheckpointManager` stores snapshots; nothing restores to disk.

### P9 — Not bundled
- 575 files / 194 JS in VSIX; VS Code warns; esbuild not installed/used.

### P10 — Host activation unverified this cycle
- Blocked by VS Code instance mutex; last verified exit 0 earlier.

### P11 — Webview handlers partially wired
- Many panels render but don't refresh on actions; streamChunk never sent.

### P12 — Enterprise governance incomplete
- Data classification, backup/restore, deletion, consent — planned only.

## 2. Solution Architecture (Master → Supervisor → Agent)

### Master Agent
- Owns the full-stack goal; decomposes into supervisors (Runtime, Tools, Quality, UI).
- Aggregates results; decides completion; writes progress.md.

### Supervisors
- **Runtime Supervisor**: wires streamChat, model config persistence, chat panel streaming, edit application.
- **Tools Supervisor**: terminal integration, MCP launch, codebase indexer, git integration.
- **Quality Supervisor**: bundling, host verification, test coverage, security gates.
- **UI Supervisor**: native diff, inline completions, design tokens application, accessibility.

### Agents (atomic tasks)
- Each agent owns one file/feature change + its test.
- Reports `{ok, detail}` to its supervisor.
- Runs in parallel where independent (MasterAgent executor already built).

## 3. Execution Plan (ordered)

Phase R1 (Runtime) — parallel agents:
- R1.1 ModelConfigStorage (SecretStorage + globalState) + `vibecode.models.configure` prompts.
- R1.2 Wire `streamChat` into webview `chat/send` → post `streamChunk` messages.
- R1.3 Register `CompletionItemProvider` for ghost text.
- R1.4 `applyEditToDocument` command using `workspace.applyEdit` + diff editor.

Phase R2 (Tools):
- R2.1 Terminal integration via `createTerminal`.
- R2.2 Launch MCP server + discover tools at activation.
- R2.3 Semantic indexer + file watcher.
- R2.4 Git commands (commit/branch).

Phase R3 (Quality):
- R3.1 Install esbuild, bundle, update `main` + `.vscodeignore`.
- R3.2 Host activation verification (isolated profile).
- R3.3 Checkpoint restore to disk.
- R3.4 Security audit (SSRF on all adapters, secret redaction, permission gates).

Phase R4 (UI):
- R4.1 Native diff editor integration.
- R4.2 Apply design tokens + animations to all panels.
- R4.3 Accessibility audit (ARIA, keyboard, focus).
- R4.4 Enterprise governance.

## 4. Acceptance Criteria
- `vibecode.chat` streams a real model response into the webview bubble.
- `vibecode.models.configure` persists provider/model/key (key in SecretStorage).
- Inline edits apply to documents with native diff view.
- Terminal commands run in integrated terminal with output capture.
- Bundled VSIX (single file, <2MB), installs & activates in isolated profile.
- tsc exit 0; vitest all pass; host smoke pass.

## 5. What I'll do now
Start R1.1 + R1.2 (model config persistence + streaming chat wiring) as the first agent chunk. These are the highest-impact, unblocking everything else. Then R1.3/R1.4, then R2–R4 in order, packaging last.
