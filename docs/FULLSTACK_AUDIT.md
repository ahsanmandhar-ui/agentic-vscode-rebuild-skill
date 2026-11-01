# Full-Stack Audit — VibeCode Engine Pro Free (v0.1.16)

Date: 2026-11-01 · Scope: `vibecode-engine-source/src` (backend + frontend), `extension.ts` wiring, tests, VSIX. No code changes made by this audit. Evidence labels: VERIFIED / ATTEMPTED / UNVERIFIED / GAP.

## 1. Runtime (verified this cycle)

- TypeScript compile: `node node_modules/typescript/bin/tsc -p ./` → exit 0 (VERIFIED).
- Node tests: `node --test out/tests/*.test.js` → 28/28 pass, 0 fail (VERIFIED).
- VSIX archive: `dist/vibecode-engine-pro-free-0.1.16.vsix` → 2,145,207 bytes, 1,305 zip entries, opens cleanly (VERIFIED).
- Host activation (`@vscode/test-electron`): NOT re-run this cycle (ATTEMPTED/UNVERIFIED).

## 2. Backend

- Providers/adapters/registry present; Gemini + OpenRouter tested; capability refresh module present (live UNVERIFIED).
- Routing/fallback/circuit breaker unit-tested.
- Accounts/SecretStorage: InMemory only in tests; real host round-trip UNVERIFIED (GAP).
- Search adapters present with SSRF guard; live smoke not run (GAP).
- Security: confinePath/PermissionEngine/redaction tested; supply-chain signature bypassed (GAP); SSRF per-request safeFetch unused (GAP); secret pattern coverage UNVERIFIED.

## 3. Frontend

- webview.ts imports 17 renderers; CSP nonce via crypto.randomUUID (VERIFIED).
- A11y focus/reduced-motion/44px targets (VERIFIED code).
- Render tests cover only 3 panels (GAP: 14 untested).
- Plan/progress viewer not wired to webview (GAP).
- innerHTML escaping uniformity UNVERIFIED (GAP).

## 4. Integration (extension.ts)

- All 15 package.json commands registered (VERIFIED).
- 16 empty-state alias command IDs unregistered (GAP).
- CodeLens "Ask VibeCode" unregistered (GAP).
- Duplicate webview provider registration (GAP).
- Status bar exists; health/account badges UNVERIFIED (GAP).
- AuditLog/CrashReporter/PerformanceBudget created; event wiring PARTIAL (GAP).

## 5. Tests

- 28 node tests pass (VERIFIED).
- Host smoke not run this cycle (UNVERIFIED).
- SecretStorage round-trip uses InMemory (GAP).
- Provider smoke not live (GAP).
- Render coverage partial (GAP).

## 6. VSIX

- 0.1.16 packaged, 1,305 entries, 2.1 MB, archive opens (VERIFIED).
- Isolated install/upgrade not re-run this cycle (UNVERIFIED).

## 7. Gaps summary (highest impact)

1. SecretStorage round-trip not exercised against real VS Code SecretStorage.
2. Host smoke test not run under @vscode/test-electron this cycle.
3. Provider smoke tests not live (no keys).
4. Render tests cover only 3 of ~17 panels.
5. 16 empty-state alias command IDs unregistered.
6. CodeLens "Ask VibeCode" command unregistered.
7. Plan/progress viewer not wired to webview.
8. Supply-chain signature verification bypassed (hash vs itself).
9. SSRF per-request `safeFetch` unused.
10. Secret pattern coverage not verified.
11. Data classification labels not implemented.
12. Streaming not wired into chat turn loop.
13. Duplicate webview provider registration not reconciled.

## 8. Verified vs unverified

- Verified this cycle: compile (exit 0), 28/28 node tests, VSIX archive integrity.
- Unverified this cycle: host activation, live provider probes, isolated install/upgrade, SecretStorage round-trip against host, render coverage for 14 panels.
- No code changes made. Deliverable for task_0072.
