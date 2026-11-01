# Plan: Implement Missing UI (Chunks)

## Chunk U8 — Wire Existing Renderers (foundation)
- U8.1 Import renderers in webview.ts; call in getHtml/render switch.
- U8.2 Add 'progress' PanelId + panel; wire renderProgressViewer.
- U8.3 Remove duplicate VibeCodeWebviewProvider registration in extension.ts.
- U8.4 Add client-side message listener to invoke renderers on panelState.
- Acceptance: tsc 0; render tests.

## Chunk U9 — Home & Onboarding
- U9.1 Home panel: welcome, workspace, readiness checklist, engine/model/account strip, quick task.
- U9.2 Onboarding 4-step (Welcome, System check, Connect model, Safety) with persistence.
- U9.3 Empty/error states with actions.
- Acceptance: compile + render test.

## Chunk U10 — Agent Timeline & Approval Cards
- U10.1 Tool status lines + inline approval card (scope selector: once/session/workspace).
- U10.2 Expandable technical detail (argv/path/host).
- U10.3 Progress "steps completed of planned".
- U10.4 Destructive typed-confirmation dialog.
- Acceptance: compile + a11y check.

## Chunk U11 — Tasks & Plans
- U11.1 Task list (running/completed/failed).
- U11.2 Plan view (renderPlanViewer wired).
- U11.3 Checkpoint/restore.
- U11.4 Diff viewer for Execute branches.
- Acceptance: compile + render test.

## Chunk U12 — Skills Browser
- U12.1 Search/filter, inspector, install/skip, quarantine.
- U12.2 Bulk confirm dialog.
- U12.3 Recommended skills cards.
- Acceptance: compile + render test.

## Chunk U13 — Models & Accounts
- U13.1 Accounts table renderer (rotation strategy, usage, mask key).
- U13.2 Refresh models (re-read accounts).
- U13.3 Provider health badges.
- Acceptance: compile + render test.

## Chunk U14 — Permissions & Diagnostics
- U14.1 Rules list, recent decisions, remember/clear.
- U14.2 Health checks, logs, perf budget, export.
- Acceptance: compile + render test.

## Chunk U15 — Settings & Context
- U15.1 Guided/advanced sections, CLI allowlist, skill trust.
- U15.2 Context viewer (plan/progress/structure + drift).
- Acceptance: compile + render test.

## Chunk U16 — Status Bar & Commands
- U16.1 Status bar item (active router, health, account).
- U16.2 Command palette entries (chat, plan, run CLI, switch provider).
- U16.3 Editor context menu + CodeLens "Ask VibeCode".
- Acceptance: compile + manual check.

## Chunk U17 — Tests & Release
- U17.1 Render-output tests for all panels.
- U17.2 Host smoke test (activation, commands, webview).
- U17.3 Package VSIX + verify.
- U17.4 Update docs.

## Execution Order
U8 → U9 → U10 → U11 → (U12, U13, U14, U15 parallel) → U16 → U17.

## Next single action
Start U8 (wire existing renderers).