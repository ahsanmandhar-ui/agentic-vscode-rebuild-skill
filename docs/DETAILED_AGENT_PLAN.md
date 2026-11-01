# Detailed Agent Plan (for approval)

## Agents (7)
- A1 Backend Core (transport, registry, fallback, accounts, capabilities)
- A2 Search & System (search providers, cache, system info)
- A3 UI Renderers (router/cli/search/chat panels)
- A4 Webview & Protocol (webview.ts, messages.ts, extension.ts wiring)
- A5 Security & Permissions (PermissionEngine, confinePath, spawnArgv, SSRF)
- A6 Tests & QA (unit, smoke, property)
- A7 Docs & Release (plan/progress/structure, VSIX, honest eval)

## Chunks & Assignments

### C1 Foundations (A1, A2)
- C1.1 System info check (A2) — collectSystemInfo + writeSystemInfoMarkdown.
- C1.2 DuckDuckGo search + cache (A2) — 24h LRU, backoff.
- C1.3 Brave/SerpAPI adapters + registry (A2) — fallback + auto-switch.
- C1.4 Secret storage keys (A1) — vibecode.search.*.apiKey.
- Acceptance: compile + unit tests.

### C2 Router & Capabilities (A1)
- C2.1 Probe-driven capabilities (A1) — TTL cache, override, conservative defaults.
- C2.2 Capability refresh command (A1).
- C2.3 Multi-account auto-switch (A1).
- Acceptance: compile + unit tests.

### C3 Conflict & Multi-AI (A1, A5)
- C3.1 parallel-execution-guard skill (done).
- C3.2 Task DAG + file ownership (A1).
- C3.3 Progress reporting contract (A1).
- C3.4 Permission gates for file ops (A5).
- Acceptance: compile + tests.

### C4 Chat UI (A3, A4)
- C4.1 Chat panel renderer (A3) — timeline, bubbles, empty state.
- C4.2 Composer (A3) — multiline, send, attach, skill chips.
- C4.3 Streaming (A4) — aria-live, token append.
- C4.4 One-click invoke (A4) — Run button, context menu, command palette.
- Acceptance: compile + render tests.

### C5 Key Management UI (A3, A4)
- C5.1 Routers tab (A3) — provider cards, account pool.
- C5.2 Search tab (A3) — provider keys, test connection.
- C5.3 CLI tab (A3) — binary picker, env keys.
- C5.4 Wire message handlers (A4).
- Acceptance: compile + render tests.

### C6 File Access (A5, A4)
- C6.1 confinePath + spawnArgv (A5).
- C6.2 Out-of-dir confirmation (A4).
- C6.3 PermissionEngine gates (A5).
- Acceptance: security tests.

### C7 Tests & QA (A6)
- C7.1 Unit tests for all modules (A6).
- C7.2 SecretStorage round-trip (A6).
- C7.3 Webview render tests (A6).
- C7.4 Provider smoke tests (A6).
- Acceptance: 100% pass, 0 tsc errors.

### C8 Package & Release (A7)
- C8.1 Package VSIX (A7).
- C8.2 Isolated install/upgrade (A7).
- C8.3 Activation verification (A7).
- C8.4 Update docs (A7).
- Acceptance: VSIX exists, activation clean.

## Execution Order
C1 → C2 → C3 → C4/C5 (parallel) → C6 → C7 → C8.

## Agent Instructions (summary)
- A1: Implement backend modules; compile clean; unit-testable.
- A2: Search/system modules; cache/backoff; SSRF-safe.
- A3: HTML renderers; a11y; CSP-safe classes only.
- A4: Wire webview/protocol; message handlers; streaming.
- A5: Security controls in code + tests; no shell interpolation.
- A6: Tests for all; no weakened tests; honest counts.
- A7: Package, verify, docs, honest evaluation.

## Approval
Reply "approve" to start execution.