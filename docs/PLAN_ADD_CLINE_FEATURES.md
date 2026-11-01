# Plan: Add Cline Reverse-Engineered Features into VibeCode Engine

## Decision (council): which features to add, in what order

### Features considered (from Cline reverse-engineering)
1. MCP support (Model Context Protocol) — tools, resources, prompts.
2. Browser automation (puppeteer) — web scraping, screenshots.
3. Terminal integration — shell sessions, command execution.
4. Task lifecycle — plan/act, checkpoints, restore.
5. Approval gates — per-action user approval with scope.
6. Memory/state — project memory, conversation history, compaction.
7. Telemetry — usage, crash, perf.
8. Provider routing — multi-provider, fallback, accounts.
9. Plugin system — skill bundles, trust, supply chain.

### Recommendation (ordered, quality over speed)
1. **Provider routing + accounts** (already in VibeCode; enhance with Cline patterns: cooldown, retry, circuit breaker). ✅ Mostly done.
2. **Task lifecycle + approval gates** (already in VibeCode; enhance with Cline's checkpoint/restore, scope selector). ✅ Partially done.
3. **Memory/state + compaction** (already in VibeCode; enhance with Cline's project memory). ✅ Partially done.
4. **MCP support** (new; high value, moderate risk). Implement MCP client (tools/resources/prompts) behind PermissionEngine.
5. **Telemetry** (already in VibeCode; enhance with crash reporting, audit trail). ✅ Partially done.
6. **Browser automation** (new; high risk — SSRF, sandboxing). Implement behind PermissionEngine + SSRF guard + sandbox.
7. **Terminal integration** (already in VibeCode; enhance with sessions, allowlist). ✅ Partially done.
8. **Plugin system** (already in VibeCode; enhance with trust/supply chain). ✅ Partially done.

### Licensing constraint
- Cline is Apache-2.0. No vendoring without license verification at pinned commit.
- We may implement equivalent functionality from scratch (clean-room), referencing Cline's design only.
- No code copy. No binary downloads. No install hooks.

### Security constraint
- All new features behind PermissionEngine (deny-by-default).
- SSRF guard on all network calls.
- Shell: spawn with argv arrays, program allowlist, workspace-confined paths.
- Secrets via SecretStorage only.
- Account rotation only for authorized accounts.

## Chunks (for agent execution)

### Chunk A — MCP Client (new)
- A1 MCP client (tools/resources/prompts) with permission gates.
- A2 MCP server registry + discovery.
- A3 UI: MCP servers panel (list/add/remove/test).
- Acceptance: compile + unit tests + host smoke.

### Chunk B — Browser Automation (new, high risk)
- B1 Browser tool (puppeteer) behind PermissionEngine + SSRF guard + sandbox.
- B2 Screenshot + DOM extraction.
- B3 UI: browser panel (URL input, screenshot preview).
- Acceptance: compile + security tests.

### Chunk C — Task Lifecycle Enhancement
- C1 Checkpoint/restore (already partial; wire to UI).
- C2 Scope selector for approvals (once/session/workspace).
- C3 Task list with running/completed/failed (already partial; wire to webview).
- Acceptance: compile + render tests.

### Chunk D — Memory/State Enhancement
- D1 Project memory (plan.md/progress.md/structure.md) sync.
- D2 Drift detection (already partial; wire).
- D3 Compaction pipeline (already; verify 80% reduction).
- Acceptance: compile + tests.

### Chunk E — Telemetry Enhancement
- E1 Crash reporter (already partial; wire to UI).
- E2 Audit trail (already partial; wire).
- E3 Perf budget (already partial; wire).
- Acceptance: compile + tests.

### Chunk F — Terminal Enhancement
- F1 Terminal sessions (already partial; wire).
- F2 Program allowlist + permission gates.
- F3 UI: terminal panel (already partial).
- Acceptance: compile + tests.

### Chunk G — Plugin/Skill System Enhancement
- G1 Skill trust (already partial; verify).
- G2 Supply chain (pinned hash + signature) (already partial; verify).
- G3 Bundle loading (already partial; verify).
- Acceptance: compile + tests.

### Chunk H — Provider Routing Enhancement
- H1 Cooldown + retry + circuit breaker (already partial; verify).
- H2 Multi-account auto-switch (already partial; verify).
- H3 Capability metadata (already partial; verify).
- Acceptance: compile + tests.

### Chunk I — UI Integration
- I1 Wire all renderers (already done in U8).
- I2 Add missing panels (Home, onboarding, etc.) (already done in U9-U16).
- I3 Status bar + commands (already done in U16).
- Acceptance: compile + visual check.

### Chunk J — Tests & Release
- J1 Render-output tests (done).
- J2 Host smoke (done).
- J3 Provider smoke (partial; needs keys).
- J4 Package VSIX (done).
- J5 Update docs (done).

## Agent Assignments
- Master: coordinate all.
- Backend lead: A, B, D, E, F, G, H.
- UI lead: C, I.
- Test lead: J.
- Security lead: review all (especially B).

## Execution Order
A → B → C → D → E → F → G → H → I → J.
Quality over speed; no simplification.

## Next single action
Start Chunk A (MCP Client) — implement MCP client behind PermissionEngine.