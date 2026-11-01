# Hierarchical Agent Architecture (Master → Supervisor → Agent)

## Layers
- **Master Agent**: receives a high-level goal, decomposes into top-level chunks, assigns each to a Supervisor, aggregates results, decides completion.
- **Supervisor**: receives a chunk, decomposes into sub-tasks, assigns each to a specialized Agent, aggregates, reports to Master.
- **Agent**: executes a single atomic task (tool call / code edit / terminal run / search), reports result.

## Decomposition rules
- A chunk is splittable if it has ≥2 independent sub-tasks.
- Independent sub-tasks run in parallel (Promise.all).
- Dependent sub-tasks run sequentially (Flow DAG).
- Each level has a max depth (default 3) and max fan-out (default 5).
- Every chunk gets a ledger entry (TaskLedger) with status, owner, result, error.

## Full-stack work items (chunks)
Master divides into these supervisors:

### S-A: Core Runtime (supervisor: runtime-sup)
- A1: Wire streamChat into vibecode.chat + project chat webview (streamChunk messages)
- A2: Persist ModelConfig via SecretStorage; vibecode.models.configure opens config panel
- A3: Register CompletionItemProvider for inline ghost text
- A4: Apply inline edits via workspace.applyEdit + open diff editor
- A5: Terminal integration via createTerminal + onDidWriteTerminalData

### S-B: Indexing & Tools (supervisor: tools-sup)
- B1: Semantic codebase indexer (embeddings + file watcher)
- B2: MCP server launch + tool discovery at activation
- B3: Native diff editor integration
- B4: Git integration (commit/branch/PR commands)

### S-C: Packaging & Quality (supervisor: quality-sup)
- C1: Bundle with esbuild; update main + .vscodeignore
- C2: Host activation verification (isolated profile)
- C3: Undo/checkpoint applied to files
- C4: Enterprise governance (classification, backup/restore, deletion, consent)

### S-D: UI & Design (supervisor: ui-sup)
- D1: Wire all renderers to webview message handlers
- D2: Streaming end-to-end (backend → webview → bubble)
- D3: Accessibility audit + fixes (ARIA, keyboard, focus)
- D4: Apply design tokens + animations to all panels

## Execution
Master runs S-A, S-B, S-C, S-D. S-A and S-B independent → parallel. S-C depends on S-A/S-B (needs bundled output). S-D independent of code but depends on renderers.

## Acceptance
- Each chunk has a ledger entry with status done/failed.
- tsc exit 0; vitest all pass.
- VSIX packaged + installed.
- Host activation verified.
