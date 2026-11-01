# Complete Full-Stack Implementation Plan (Cline + Kilo + OmniRoute patterns)

## 0. Research basis
- Cline (Apache-2.0): task lifecycle, approval gates, MCP, terminal, browser, memory, telemetry, provider routing, plugin/skill system.
- Kilo Code (MIT): client-of-CLI-runtime, shared server ownership, webview routing (sidebar/chat/agent-manager/diff), config split (VS Code settings vs CLI config), bundled resources, recovery (SSE reconnect, health poll).
- OmniRoute: provider registry, capability metadata, normalized errors, fallback chains, circuit breaker, account authorization, SSRF guard, health checks, telemetry, router selector UI.
- DigitalOcean: LLM router features (cost/speed/reliability, routing policies, fallback, load balancing).

## 1. Architecture decision (council)
- VibeCode Engine = VS Code extension (not client-of-CLI). Keep extension-host ownership.
- Add MCP client (tools/resources/prompts) behind PermissionEngine.
- Add browser automation (puppeteer) behind PermissionEngine + SSRF guard + sandbox.
- Add task lifecycle (plan/act, checkpoints, restore) with approval gates.
- Add memory/state (project memory + compaction + drift detection).
- Add telemetry (crash, audit, perf) wired to UI.
- Add provider routing (registry, capabilities, fallback, accounts, SSRF, health, telemetry).
- Add plugin/skill system (trust, supply chain, bundle loading).
- Add webview UI (sidebar + chat + agent manager + diff viewer + settings).
- Config split: VS Code settings (UI/integration) vs provider config (CLI-style, shared).

## 2. Phases & Chunks

### Phase F1 — Foundation (backend core)
- F1.1 Provider registry + adapters (Gemini, OpenRouter, LiteLLM, Ollama, DeepSeek, custom) — DONE (partial).
- F1.2 Capability metadata (probe-driven, TTL, override) — DONE (partial).
- F1.3 Multi-account + auto-switch — DONE (partial).
- F1.4 MCP client (tools/resources/prompts) + registry — NEW.
- F1.5 Terminal sessions + allowlist + permission gates — DONE (partial).
- F1.6 System info check + DuckDuckGo search + fallback providers — DONE.
- Acceptance: compile + unit tests.

### Phase F2 — Task lifecycle & approval
- F2.1 Task model (plan/act, checkpoints, restore) — DONE (partial).
- F2.2 Approval gates (scope selector, typed confirm) — DONE (partial).
- F2.3 Task list UI (running/completed/failed) — DONE (partial).
- F2.4 Diff viewer (Execute branches) — DONE (partial).
- Acceptance: compile + render tests.

### Phase F3 — Memory & state
- F3.1 Project memory (plan.md/progress.md/structure.md) sync — DONE (partial).
- F3.2 Drift detection — DONE (partial).
- F3.3 Compaction pipeline (80% reduction bench) — DONE (partial).
- F3.4 Conversation history (bounded, per-panel) — DONE (partial).
- Acceptance: compile + tests.

### Phase F4 — Telemetry & observability
- F4.1 Crash reporter — DONE (partial).
- F4.2 Audit trail — DONE (partial).
- F4.3 Perf budget — DONE (partial).
- F4.4 Wire to UI (diagnostics panel) — DONE (partial).
- Acceptance: compile + tests.

### Phase F5 — Browser automation (NEW, high risk)
- F5.1 Browser tool (puppeteer) behind PermissionEngine + SSRF guard + sandbox.
- F5.2 Screenshot + DOM extraction.
- F5.3 UI: browser panel (URL input, screenshot preview).
- Acceptance: compile + security tests.

### Phase F6 — MCP client (NEW)
- F6.1 MCP client (tools/resources/prompts).
- F6.2 MCP server registry + discovery.
- F6.3 UI: MCP servers panel (list/add/remove/test).
- Acceptance: compile + unit tests.

### Phase F7 — Plugin/skill system enhancement
- F7.1 Skill trust (inspect/approve) — DONE (partial).
- F7.2 Supply chain (pinned hash + signature) — DONE (partial).
- F7.3 Bundle loading — DONE (partial).
- Acceptance: compile + tests.

### Phase F8 — Webview UI (full)
- F8.1 Sidebar + chat + agent manager + diff viewer — DONE (partial).
- F8.2 Status bar + command palette + CodeLens — DONE (partial).
- F8.3 Settings (guided/advanced, CLI allowlist, skill trust, telemetry consent, backup/restore) — DONE (partial).
- F8.4 Onboarding 4-step — DONE (partial).
- Acceptance: compile + render tests + host smoke.

### Phase F9 — Security hardening (host-verified)
- F9.1 Remove __testSecretStorage, never pre-fill masked secrets.
- F9.2 SerpAPI key in header, SSRF guard on all adapters.
- F9.3 confinePath symlink resolution.
- F9.4 Expand secret patterns.
- F9.5 Permission gates for TerminalSessionManager + system/info.
- F9.6 Escape innerHTML.
- F9.7 new Function per-invocation approval.
- Acceptance: security tests pass.

### Phase F10 — Tests & release
- F10.1 Render-output tests for all panels — DONE (partial).
- F10.2 Host smoke (activation, commands, webview) — DONE (partial).
- F10.3 Provider smoke (live, if keys) — PARTIAL.
- F10.4 Package VSIX + verify — DONE.
- F10.5 Update docs — DONE.

## Agent assignments
- Master: coordinate all.
- Backend lead: F1, F3, F4, F5, F6, F7, F9.
- UI lead: F2, F8.
- Test lead: F10.
- Security lead: review all (especially F5, F6, F9).

## Execution order
F1 → F2 → F3 → F4 → F5 → F6 → F7 → F8 → F9 → F10.
Quality over speed; no simplification.

## Next single action
Start F1.4 (MCP client) — implement MCP client behind PermissionEngine. (F1.1-F1.3 and F1.5-F1.6 mostly done.)

## Licensing note
- Cline Apache-2.0: no vendoring without verification; clean-room implementation only.
- Kilo Code MIT: reference only; no vendoring.
- OmniRoute MIT: reference only; no vendoring.

## Security note
- All new features behind PermissionEngine (deny-by-default).
- SSRF guard on all network calls.
- Shell: spawn with argv arrays, program allowlist, workspace-confined paths.
- Secrets via SecretStorage only.
- Account rotation only for authorized accounts.