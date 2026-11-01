# Plan: Remaining Agent Supervisor / Master Work

## Remaining phases (from AGENT_SUPERVISOR_INTEGRATION_PLAN.md)

### R1 — Webview Panel UI (S8)
- R1.1 Add `src/ui/supervisor-panel.ts` renderer (task ledger, active agent, handoffs, approvals).
- R1.2 Add panel tab/id to `PanelId` in `src/ui/failure.ts` and EMPTY_STATES.
- R1.3 Wire `webview.ts` message handlers: `supervisor.status`, `supervisor.pause`, `supervisor.run`.
- R1.4 Render tests in `src/tests/render.test.ts`.
- Acceptance: tsc 0; render tests pass.

### R2 — Durable state in host (S7)
- R2.1 In `activate()`, create `FileDurableStore` under `context.globalStorageUri`.
- R2.2 Persist supervisor ledger + context variables on each step.
- R2.3 Restore on activation (resume in-progress tasks).
- R2.4 Tests (InMemory store already; add File store round-trip in host smoke).
- Acceptance: tsc 0; no data loss on reload.

### R3 — Human-in-the-loop approvals (S5)
- R3.1 Supervisor `askHuman` decision → show modal approval card.
- R3.2 Scope selector → permission grant via PermissionEngine.
- R3.3 Destructive typed-confirmation for dangerous tools.
- R3.4 Tests + render tests.

### R4 — Expected-output validation (S6)
- R4.1 Add `expectedOutput` schema (regex/JSON) to TaskSpec.
- R4.2 Validator in ledger.update; retry on failure up to N.
- R4.3 Tests.

### R5 — Security hardening (S9)
- R5.1 Remove `__testSecretStorage` from production export (verify).
- R5.2 SSRF guard on all adapters (use `isSafeUrl`).
- R5.3 SerpAPI key in header (no URL leak).
- R5.4 Redact secrets in logs/ledger (use `redactSecrets`).
- R5.5 Escape HTML in all renderers (use `escapeHtml`).
- R5.6 Permission gates on tool invocations.
- R5.7 `new Function` per-invocation approval.
- R5.8 Tests.

### R6 — Streaming end-to-end (G3)
- R6.1 Wire `streamChunk` protocol backend→webview (use streaming delimiters).
- R6.2 Cancellation (abort signal).
- R6.3 Append chunks to chat bubble.
- R6.4 Manual test.

### R7 — Packaging & release (S10 / G7)
- R7.1 Bump version to 0.1.15.
- R7.2 Package VSIX.
- R7.3 Isolated install + upgrade test.
- R7.4 Activation verification.
- R7.5 Update docs (plan/progress/structure, honest evaluation, THIRD_PARTY_NOTICES).

## Additional feature search (agents to run)
Spawn search agents to find more patterns:
- Agent orchestration frameworks (Temporal, Prefect, Dagster, Ray, Celery).
- Code execution sandboxes (E2B, Modal, Docker).
- Agent evaluation (LangSmith, Promptfoo, Ragas).
- Multi-agent communication protocols (A2A, MCP, FIPA).
- Role/persona libraries and prompt templates.

## Execution order
R1 → R2 → R3 → R4 → R5 → R6 → R7, with R5 parallel to R3/R4.

## Next single action
Start R1: create supervisor-panel renderer + add panel id + render tests.
