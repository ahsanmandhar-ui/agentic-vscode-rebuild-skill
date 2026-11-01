# UI_SPEC — beginner-first agentic interface

Implementation target: a `WebviewView` in a dedicated Activity Bar container (plus status bar item and
command-palette commands). No frontend framework unless the existing repo already uses one; plain TS +
semantic HTML + CSS with VS Code theme variables is sufficient and reviewable.

## 1. Design principles

1. **Two speeds, one app.** Default = guided, plain-language, safe defaults. Advanced controls always
   reachable but never required for setup.
2. **Never lie to the user.** No fake progress bars, no invented percentages, no simulated tool activity,
   no fabricated quota. Every number shows its source and timestamp or says "not reported".
3. **Show the plan, then act.** Multi-step work shows the plan and asks for approval; each tool action is
   visible as it happens.
4. **Explain, then offer.** Beginners see *why* a security prompt appeared, in one sentence, plus a
   "what happens if I say no" line.
5. **Recoverable.** Every error has a next action (retry, switch provider, compact context, open logs).
6. **Accessible by default.** Keyboard reachable, visible focus rings, ≤ 45-char measure for prose, labels on
   every control, no color-only status, `aria-live` for streaming/status, respects reduced motion.
7. **Native look.** Use `--vscode-*` variables only; no hard-coded palettes; works in light/dark/high
   contrast.

## 2. Shell

```
Sidebar (Activity Bar icon: media/logo/activity-bar.svg, 24×24, currentColor)
├── Home            welcome · workspace · readiness checklist · engine/model/account strip · quick task
├── Agent           conversation timeline · composer · active skills chips · tool status · approvals
├── Tasks & Plans   task list (running/completed/failed) · plan view · checkpoint/restore
├── Skills          installed · recommended · search/filter · inspector · install/skip · quarantine
├── Models & Accounts  providers · accounts · auth status · fallback config · limits
├── Permissions     default policy · remembered decisions · audit log · reset
├── Project Context plan.md/progress.md/structure.md viewers · last checkpoint · drift warnings
├── Settings        basics (guided) + Advanced (JSON-equivalent, validated)
└── Diagnostics     environment assessment · version info · redacted logs · export report
```

Every section is a state machine: `loading | empty | error | ready` (plus `disabled` when a precondition is
missing). Implement all four for every panel. Empty states teach (one sentence + primary action); error
states carry the cause, the impact, and a button.

## 3. Key screens

**Onboarding (first run, 4 steps, skippable to Home)**
1. *Welcome* — what the extension does in 2 sentences; nothing to configure.
2. *System check* — the environment table from the skill (§5), with detected values and "unknown" where a
   probe failed; button to re-run.
3. *Connect a model* — beginner path: "Use a local model (free, no key)" / "Use an API key" / "Later".
   Key input is `type="password"`, stored via SecretStorage, shown as `••••…abcd`.
4. *Safety* — permissions explained in 3 bullets; security skills offered first (Stage 1), each with
   [Inspect] [Install] [Skip]; declining never removes built-in safeguards.

**Agent timeline** — messages; for each tool: name, target, decision, result summary; inline approval card
with scope selector (Just this once / This session / Always in this workspace) and an expandable technical
detail (argv, path, host). Progress is expressed as *steps completed of steps planned*, derived from real
state.

**Skills browser** — list with trust badge (`bundled`, `verified`, `unverified`, `quarantined`), license,
source, size, permissions icons; detail pane with the full inspector report and the static-analysis
disclaimer; bulk install requires a confirmation listing names.

**Accounts** — table: label, provider, auth state, fallback allowed (toggle), limits (with source), actions
(Sign in / Replace key / Remove / Test). Never render secret values. Fallback toggle shows a one-line
explanation of what it does and that it never bypasses provider limits.

## 4. Message protocol (webview ⇄ extension)

```ts
type ExtToWeb = 
  | { v:1; kind:'state'; panel:PanelId; status:'loading'|'empty'|'error'|'ready'; data:unknown; updatedAt:string }
  | { v:1; kind:'event'; taskId:string; event:AgentEventView }
  | { v:1; kind:'permission'; request:PermissionRequestView; id:string }
  | { v:1; kind:'toast'; level:'info'|'warn'|'error'; message:string; action?:{label:string;id:string} };
type WebToExt =
  | { v:1; kind:'command'; id:string; payload?:unknown }
  | { v:1; kind:'permissionDecision'; id:string; decision:'allow-once'|'allow-session'|'allow-workspace'|'deny' }
  | { v:1; kind:'ready' };
```
Validate every inbound message with zod; unknown kinds are logged and dropped. CSP: `default-src 'none';
style-src ${webview.cspSource}; img-src ${webview.cspSource} data:; script-src 'nonce-<random>'`.
`localResourceRoots: [media]`. No inline handlers, no remote fonts/scripts, no `eval`.
Persist UI state with `acquireVsCodeApi().setState()`; restore on reload.

## 5. Beginner safety rails

- Destructive actions require typing the target name when the target is outside the workspace or matches a
  protected pattern (`node_modules`, `.git`, lockfiles, `dist`).
- Advanced-only settings hidden behind a disclosure, but discoverable via search.
- "Explain this" links open a short in-panel explanation, not a browser.
- Any automatic decision the app makes (skill auto-activation, provider fallback) is shown in a
  "What just happened" line with an undo.

## 6. Acceptance checks (M8 gate)

- [ ] All 9 sections reachable by keyboard; visible focus; screen-reader labels verified manually.
- [ ] loading/empty/error/ready implemented for each panel (grep for the four states, then click through).
- [ ] No hard-coded colors; renders in light, dark, high-contrast.
- [ ] No secrets in DOM (search the rendered HTML for key fragments; check the projection serializer).
- [ ] Approval flow: three scopes work; deny is respected; audit log updates.
- [ ] Cancel stops the run within one step and leaves state consistent.
- [ ] Onboarding completes in < 2 minutes with no JSON editing required.
