# Plan: Fill Remaining Gaps

## Phase G1 — Host Runtime Verification
- G1.1 Run @vscode/test-electron host smoke (activation, commands, webview render, SecretStorage round-trip).
- G1.2 Fix any host-only failures (missing deps, webview contract).
- G1.3 Verify all tabs render and buttons respond in live host.
- Acceptance: host smoke 100% pass; no console errors.

## Phase G2 — Complete Stubbed UI
- G2.1 Implement fallback chain editor (reorder/remove/test) — replace placeholder.
- G2.2 Implement "Add custom endpoint" wizard (URL → SSRF preview → test → store key).
- G2.3 Implement CLI history (exit code, duration, output).
- G2.4 Implement `refreshModels` (re-read accounts, update UI).
- G2.5 Implement plan/progress viewer with real file loading.
- Acceptance: compile + render tests + manual click-through.

## Phase G3 — Streaming & Interactions
- G3.1 Wire streamChunk protocol end-to-end (backend → webview → append to bubble).
- G3.2 Implement cancellation (abort signal → stop generation).
- G3.3 Implement approval card flow (scope selector → permission grant).
- G3.4 Implement destructive typed-confirmation.
- Acceptance: manual test streaming + approval.

## Phase G4 — Provider Smoke (live)
- G4.1 Set BRAVE_API_KEY / SERPAPI_API_KEY (user action).
- G4.2 Run live DuckDuckGo, Brave, SerpAPI probes.
- G4.3 Run capability refresh against real provider.
- G4.4 Multi-account auto-switch test (simulate 429).
- Acceptance: all probes pass or documented skip.

## Phase G5 — Security Hardening (host-verified)
- G5.1 Remove __testSecretStorage from production export.
- G5.2 Never pre-fill masked secrets (verify in host).
- G5.3 SerpAPI key in header (verify no URL leak).
- G5.4 SSRF guard on all adapters (host test).
- G5.5 confinePath symlink resolution (host test).
- G5.6 Expand secret patterns (verify redaction).
- G5.7 Permission gates (verify deny-by-default).
- G5.8 Escape innerHTML (verify no XSS).
- G5.9 new Function per-invocation approval (verify).
- Acceptance: security tests pass; no high/critical.

## Phase G6 — Enterprise Governance
- G6.1 Data classification labels in settings schema.
- G6.2 Backup/restore (export/import).
- G6.3 Data subject access/deletion flow.
- G6.4 Telemetry consent prompt + anonymization.
- Acceptance: compile + manual test.

## Phase G7 — Release
- G7.1 Package VSIX (bump version).
- G7.2 Isolated install + upgrade test.
- G7.3 Activation verification.
- G7.4 Update docs (plan/progress/structure, honest evaluation).

## Execution Order
G1 → G2 → G3 → G4 → G5 → G6 → G7.

## Next single action
Start G1 (host runtime verification) — run @vscode/test-electron smoke test.