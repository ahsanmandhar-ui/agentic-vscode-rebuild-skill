# Plan: U4 Plan/Progress Viewer Wiring + Brave/SerpAPI Keys

## Phase U4 — Plan/Progress Viewer
- U4.1 Create `src/ui/plan-viewer.ts` rendering plan.md sections (phases, chunks, acceptance).
- U4.2 Create `src/ui/progress-viewer.ts` rendering progress.md (state, changed files, tests, next action).
- U4.3 Add 'plan' tab to PanelId/PANELS in failure.ts + webview.ts.
- U4.4 Wire message handlers in webview.ts for plan/refresh.
- U4.5 Add empty states + loading feedback.
- Acceptance: compile clean + render test.

## Phase Keys — Brave/SerpAPI
- K1 Add settings UI field for Brave/SerpAPI keys (Search tab already has input; verify wiring).
- K2 Store keys in SecretStorage under `vibecode.search.brave.apiKey` / `vibecode.search.serpapi.apiKey`.
- K3 Test connection button runs probe query.
- K4 Auto-switch on rate limit uses keys.
- Acceptance: compile + manual test with key.

## Next single action
Implement U4.1 + U4.2 (renderers) first, then wire tab. Set BRAVE_API_KEY env for smoke test.