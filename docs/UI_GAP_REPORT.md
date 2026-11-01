# UI Gap Report

**Task:** task_0029 (ui-auditor)  
**Scope:** Audit implemented `src/ui/*.ts` + `src/webview.ts` tabs vs planned UI features. No code written.  
**Sources of planned scope:** `.cline/skills/.../references/UI_SPEC.md`; `docs/FINAL_COMPLETE_PLAN.md`; `docs/DETAILED_AGENT_PLAN.md`; `docs/PARALLEL_MULTI_PROVIDER_PLAN_PART2.md`; `docs/UI_CHAT_AND_KEYS.md`; `docs/PLAN_U4_AND_KEYS.md`; `docs/PLAN_CLOSE_RUNTIME_GAP.md`.  
**Implemented scope inspected:** `src/ui/*` (11 files), `src/webview.ts`, `src/extension.ts`, `src/protocol/messages.ts`, `src/tests/webview.test.ts`.

## 1. Summary

- **Implemented renderers (pure HTML, no framework):** `chat-panel`, `cli-panel`, `context` (class, no HTML renderer), `failure` helpers, `models` (class, no HTML renderer), `plan-viewer`, `progress-viewer`, `router-panel`, `router-selector`, `search-panel`, `settings` (helpers only).  
- **Panel ids wired in `webview.ts` / `failure.ts`:** `skills, settings, models, perms, context, diagnostics, routers, cli, search, chat, plan` (11). `progress` is **not** a panel id, although `progress-viewer.ts` exists.  
- **Renderers actually imported anywhere:** **none**. `src/webview.ts` `getHtml()` emits a static shell (`<div id="app"></div>`) whose message listener is a no-op; no renderer is invoked.  
- **UI_SPEC planned top-level sections:** 9 (Home, Agent, Tasks & Plans, Skills, Models & Accounts, Permissions, Project Context, Settings, Diagnostics). Implemented panel set diverges (adds routers/cli/search/chat/plan; omits Home; Tasks/Agent partially).  
- **Status bar / command palette chat / onboarding / context menu / CodeLens / approval cards / destructive typed-confirmation UI:** not implemented.  
- **Duplicate webview provider registration** in `src/extension.ts` (`panel` and `webviewProvider`, both registered to `vibecode.panel`) — contract gap, not a render.

## 2. Panel id coverage (planned sections vs implemented)

| UI_SPEC section | Panel id(s) | Implemented? |
|---|---|---|
| Home | (none) | Missing entirely |
| Agent | `chat` | Panel id + renderer exist, but renderer not wired; no tool-status/approval UI |
| Tasks & Plans | `plan` (+ progress viewer) | `plan` panel id; `progress` missing as panel id; no task list/checkpoint UI |
| Skills | `skills` | Panel id + engine; no browser/filter/inspector/bulk-confirm UI |
| Models & Accounts | `models` (+ `routers`) | Backend classes + router renderer; no accounts table renderer |
| Permissions | `perms` | Panel id + data post; no renderer |
| Project Context | `context` | Backend class; no HTML viewer for plan/progress/structure; drift only backend |
| Settings | `settings` | Validation helpers; no guided/advanced UI |
| Diagnostics | `diagnostics` | Panel id + data post; no renderer |

## 3. Not-implemented UI functionality that should show (planned, no implementation)

| # | Feature (planned) | Plan source | Expected surface | Status |
|---|---|---|---|---|
| 1 | Home: welcome, workspace, readiness checklist, engine/model/account strip, quick task | UI_SPEC §2 Home | `src/ui/home*.ts` + PanelId `home` | Not implemented |
| 2 | Onboarding 4 steps (Welcome, System check, Connect a model, Safety) with skippable flow | UI_SPEC §3; U5.4 | `src/ui/onboarding*.ts` + persisted state | Not implemented |
| 3 | Agent: tool status lines + inline approval card with scope selector (once/session/workspace) + expandable technical detail (argv/path/host) | UI_SPEC §3 Agent timeline | chat-panel extension / approval component | Not implemented (PermissionEngine exists, no UI) |
| 4 | Agent: progress as "steps completed of steps planned" derived from real state | UI_SPEC §3 | chat/agent renderer | Not implemented |
| 5 | Tasks & Plans: task list (running/completed/failed) | UI_SPEC §2; UI_CHAT_AND_KEYS §2 | panel + renderer | Not implemented |
| 6 | Tasks & Plans: checkpoint/restore controls | UI_SPEC §2; U4.4 | panel + commands | Not implemented |
| 7 | Skills browser: installed/recommended/search/filter | UI_SPEC §3; U1.1 | `src/ui/skills*.ts` renderer | Not implemented |
| 8 | Skills browser: trust badge/license/source/size/permissions icons | UI_SPEC §3 | skills renderer | Not implemented |
| 9 | Skills browser: detail pane with full inspector report + static-analysis disclaimer | UI_SPEC §3 | skills renderer | Not implemented |
| 10 | Skills: bulk install confirmation listing names | UI_SPEC §3 | skills renderer + confirm | Not implemented (engine has bulkInstall, no UI) |
| 11 | Skills: quarantine action UI | UI_SPEC §2 | skills renderer button | Not implemented (engine has quarantineSkill, webview handles action, no button) |
| 12 | Models & Accounts: accounts table (label, provider, auth state, fallback toggle, limits with source, actions Sign in/Replace key/Remove/Test) | UI_SPEC §3 Accounts | `src/ui/models*.ts` HTML renderer | Not implemented (backend `ModelsAccountsPanel` only) |
| 13 | Models & Accounts: fallback toggle explanation + "never bypasses limits" note | UI_SPEC §3 Accounts | accounts UI | Not implemented (backend `fallbackExplanation()` exists) |
| 14 | Permissions: default policy, remembered decisions, audit log, reset UI | UI_SPEC §2 Permissions | `src/ui/perms*.ts` renderer | Not implemented (data posted, no renderer) |
| 15 | Project Context: `plan.md`/`progress.md`/`structure.md` viewers | UI_SPEC §2 Project Context | context/plan/progress viewers | Partial (plan + progress renderers exist but not wired; structure viewer missing) |
| 16 | Project Context: last checkpoint + drift warnings UI | UI_SPEC §2 | context renderer | Not implemented (backend `checkDrift` exists) |
| 17 | Settings: guided basics + Advanced JSON-equivalent validated (disclosure) | UI_SPEC §2 Settings; U5.1–5.3 | settings UI | Not implemented (validation helpers exist) |
| 18 | Settings: CLI allowlist management UI | U5.2 | settings UI | Not implemented |
| 19 | Settings: skill trust/approval settings UI | U5.3 | settings UI | Not implemented |
| 20 | Diagnostics: environment assessment table (detected values + unknown) | UI_SPEC §3 (system check); UI_SPEC §2 Diagnostics | diagnostics renderer | Not implemented (backend `envAssessment` exists) |
| 21 | Diagnostics: version info UI | UI_SPEC §2 Diagnostics | diagnostics renderer | Not implemented (backend exists) |
| 22 | Diagnostics: redacted logs viewer | UI_SPEC §2 Diagnostics | diagnostics renderer | Not implemented (backend `redactedLogs` exists) |
| 23 | Diagnostics: export report button | UI_SPEC §2 Diagnostics | diagnostics renderer | Not implemented (backend `exportReport` exists) |
| 24 | Status bar: active router, health badge, account indicator | UI_CHAT_AND_KEYS §2; U1.2 | `src/extension.ts` statusBarItem | Not implemented |
| 25 | Command palette: "VibeCode: Chat" (Ctrl+Shift+V) + editor context menu "Ask VibeCode" + CodeLens | UI_CHAT_AND_KEYS §4 | `src/extension.ts` registrations | Not implemented |
| 26 | One-click invoke: sidebar Run button opens chat with starter prompt | UI_CHAT_AND_KEYS §4 | command + chat wiring | Not implemented (chat renderer has button but not wired) |
| 27 | Beginner safety: destructive-action typed confirmation (protected/outside workspace) | UI_SPEC §5 | settings helpers + dialog | Partial (logic `requiresTypedConfirmation` exists in `src/ui/settings.ts`, no UI dialog) |
| 28 | Beginner safety: Advanced-only settings disclosure + search | UI_SPEC §5 | settings UI | Not implemented |
| 29 | Beginner safety: "Explain this" in-panel explanation links | UI_SPEC §5 | components | Not implemented |
| 30 | Beginner safety: "What just happened" line with undo for auto decisions | UI_SPEC §5 | components | Not implemented |
| 31 | Message protocol validation with zod; unknown kinds logged/dropped | UI_SPEC §4 | `src/protocol/messages.ts` | Partial (manual guards only; documented "Zod-free") |
| 32 | CSP `localResourceRoots: [media]`, no inline handlers/remote fonts | UI_SPEC §4 | `src/webview.ts` getHtml | Present (CSP present; `localResourceRoots` set to extensionUri/media; script inline via nonce) |
| 33 | Persist UI state via `acquireVsCodeApi().setState()` + restore | UI_SPEC §4 | frontend script | Not implemented (frontend script is no-op) |
| 34 | Shell: ≤6 tabs, predictable back | U1.1; UI_CHAT_AND_KEYS §2 | navigation | Not implemented (no tab nav) |
| 35 | A11y: contrast/focus/aria/keyboard (a11y.ts) | UI_COVERAGE_AUDIT claims "a11y.ts + panels" | `src/ui/a11y.ts` | Not implemented (file does not exist) |
| 36 | Router: fallback chain editor (reorder/remove/test) | U2.3 | router-panel | Partial (placeholder only) |
| 37 | Router: add custom endpoint wizard (URL → SSRF preview → test → store key masked) | U2.4 | router-selector | Partial (stub returns `{ stub: true }`) |
| 38 | Router: account pool panel (list/add/remove, strategy selector, usage) | U2.5 | models/router UI | Not implemented |
| 39 | CLI: multi-run panel (parallel CLIs, merged output cards) | U3.3 | cli-panel | Partial (checkboxes exist, no merged output cards) |
| 40 | CLI: history list (exit code, duration) | U3.4 | cli-panel | Partial (empty `<ul>` only, no data wiring) |
| 41 | CLI: account/env key selector per CLI | U3.5 | cli-panel | Not implemented |
| 42 | Plan/Progress: diff viewer for Execute AI branches | U4.3 | plan/progress viewers | Not implemented |
| 43 | Plan/Progress: approval controls (approve/reject/retry) for planner | U4.4 | plan viewer | Not implemented |
| 44 | Search: auto-switch on rate limit uses keys | Keys K4 | search provider runtime | Partial (backend search exists; UI wiring unverified) |

## 4. Implemented-but-unwired / wired-but-not-rendered gaps

| Implemented module | Used in webview/extension? | Gap |
|---|---|---|
| `src/ui/chat-panel.ts` `renderChatPanel` | Not imported anywhere | Renderer never called; `chat` panel posts only default `ready` with no data |
| `src/ui/plan-viewer.ts` `renderPlanViewer` | Not imported anywhere | `plan` panel posts empty state only; no render call |
| `src/ui/progress-viewer.ts` `renderProgressViewer` | Not imported anywhere; no `progress` PanelId | Renderer orphaned; no panel to host it |
| `src/ui/router-panel.ts` `renderRouterPanel` | Not imported anywhere | `routers` panel posts `ready` with `{ providers:[], activeId:null }` but no HTML render |
| `src/ui/search-panel.ts` `renderSearchPanel` | Not imported anywhere | `search` panel posts ready data but no HTML render |
| `src/ui/cli-panel.ts` `renderCliPanel` | Not imported anywhere | `cli` panel posts ready `{ binaries:[] }` but no HTML render |
| `src/ui/models.ts` `ModelsAccountsPanel` | Instantiated in `extension.ts` (`modelsPanel`) and wired to commands | No HTML renderer; data posted to `models` panel is state object, never rendered |
| `src/ui/context.ts` `ContextPanel` | Instantiated in `extension.ts` (`contextPanel`) | No HTML renderer; `context` panel empty state only |
| `src/ui/settings.ts` helpers | Used by `loadSettings`/validation | No UI; settings panel posts `{ advanced:false }` only |
| `src/ui/failure.ts` helpers | Imported by `webview.ts` | Used for empty states; OK |
| `src/webview.ts` `getHtml` | Used | Static shell; frontend message listener is no-op; never calls renderers or `setState` restore |
| `src/webview.ts` `postPanelState` | Used by extension | Posts to webview, but no frontend to consume/render |
| `src/extension.ts` duplicate provider | Both `panel` and `webviewProvider` registered to `vibecode.panel` | Contract bug: two providers for same view type |
| `src/ui/router-selector.ts` `RouterSelector` | Not wired to webview | QuickPick helper unused in extension activation |

## 5. Partial / placeholder implementations

- `src/ui/router-panel.ts`: fallback chain editor rendered as placeholder text ("Fallback chain editor placeholder.").  
- `src/ui/router-selector.ts`: "Add custom endpoint" returns `{ stub: true }`.  
- `src/ui/cli-panel.ts`: history list is an empty `<ul>`; no exit code/duration.  
- `src/webview.ts` `loadPanel`: `skills` always posts empty state (never reads engine cards in the non-engine branch); `models` always empty.  
- `src/ui/context.ts`: `envAssessment`/`versionInfo` return raw backend data; no formatting for UI.  
- `src/ui/models.ts`: `refreshModels` is a no-op projection (does not re-read accounts).  

## 6. Test coverage gaps (UI)

- `src/tests/webview.test.ts` covers HTML/CSP/container only. No render-output tests for chat/plan/progress/router/search/cli panels.  
- No tests for `ModelsAccountsPanel`, `ContextPanel` render integration, settings guided/advanced UI, onboarding.  
- No host render test (`@vscode/test-electron`) verifying actual webview render.  

## 7. Recommended next actions (no code in this report)

1. Reconcile the duplicate webview provider registration (Phase B) before trusting any render wiring.  
2. Add a `progress` PanelId + panel, and wire `renderProgressViewer`/`renderPlanViewer` into `getHtml` or a client-side render switch.  
3. Implement missing renderers for Home, Skills browser, Accounts table, Permissions, Settings, Diagnostics, and wire their backend classes.  
4. Implement status bar item + command palette/chat/context menu/CodeLens entries.  
5. Implement onboarding flow + destructive typed-confirmation dialog + approval card with scopes.  
6. Add render-output tests for each panel and a host smoke test.  
7. Update `docs/UI_COVERAGE_AUDIT.md` status column to reflect this audit (currently overstates "Implemented").  

## 8. Evidence labels

- Implemented modules above are ATTEMPTED (code exists, not independently verified wired).  
- "Not implemented" items are VERIFIED absent by file/import search.  
- No secrets or credentials included.

