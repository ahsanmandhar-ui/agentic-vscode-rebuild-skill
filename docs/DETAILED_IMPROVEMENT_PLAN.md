# Detailed Improvement Plan (Chunks & Subchunks)

## Phase I1 — Wire Renderers (foundation)
- I1.1 Import all 17 renderers into webview.ts.
- I1.2 Add client-side panelState listener that dispatches to renderers map.
- I1.3 Ensure getHtml emits panel containers for all 17 tabs.
- I1.4 Remove static shell no-op; make message listener functional.
- I1.5 Compile + render tests.
- Acceptance: tsc 0; render tests pass; panels render in host.

## Phase I2 — CSS & Layout
- I2.1 Create webview.css with theme tokens, typography, spacing.
- I2.2 Panel containers with min-height (no CLS).
- I2.3 Touch targets ≥44px, 8px spacing.
- I2.4 Tables/pre blocks: max-width + wrap, no horizontal scroll.
- I2.5 Reduced-motion media query.
- I2.6 Dark/light/high-contrast verification.
- Acceptance: visual check + a11y audit.

## Phase I3 — Keyboard & Focus
- I3.1 Tab order (logical, no traps).
- I3.2 Focus rings (outline 2px solid focusBorder).
- I3.3 Keyboard handlers (Enter/Space/Esc/Arrow).
- I3.4 contributes.keybindings in package.json.
- I3.5 Focus management on panel switch (move focus to heading).
- I3.6 Skip link to main content.
- Acceptance: full keyboard navigation without mouse.

## Phase I4 — Accessibility
- I4.1 aria-live regions for all dynamic updates.
- I4.2 Labels for all inputs/pre containers.
- I4.3 Roles: listitem, button, tab (not div).
- I4.4 aria-expanded/aria-current/aria-describedby.
- I4.5 Contrast 4.5:1 verification (axe or manual).
- I4.6 Screen reader announcements for state changes.
- Acceptance: screen reader announces all changes.

## Phase I5 — Security Hardening
- I5.1 Remove/export-guard __testSecretStorage.
- I5.2 Never pre-fill masked secrets in input.
- I5.3 Move SerpAPI key from URL to header.
- I5.4 SSRF guard on all search adapters + Gemini base URL.
- I5.5 confinePath: resolve symlinks, re-check root.
- I5.6 Expand secret patterns (OpenAI, Anthropic, GitHub, AWS).
- I5.7 Memory root validation.
- I5.8 Permission gates for TerminalSessionManager + system/info.
- I5.9 Escape innerHTML (or textContent) in webview.
- I5.10 new Function: per-invocation approval + sandbox.
- Acceptance: security tests pass; no high/critical findings.

## Phase I6 — Streaming & Performance
- I6.1 Streaming protocol (streamChunk messages).
- I6.2 Append tokens to last bubble.
- I6.3 Cancellation handling (abort signal).
- I6.4 Lazy loading (defer subsystem init).
- I6.5 Gate auto-open chat behind setting.
- I6.6 Bounded history (turnsByPanel cap).
- I6.7 panel-dispose cleanup.
- I6.8 PromptCache clearing on deactivate.
- I6.9 .vscodeignore trim (exclude src, tests, docs, maps).
- I6.10 Bundle with esbuild (single file).
- Acceptance: perf budget met; bundle <500KB.

## Phase I7 — Onboarding & UX Polish
- I7.1 Onboarding 4-step with persistence.
- I7.2 Empty/error states with actions everywhere.
- I7.3 Loading feedback + disabled states.
- I7.4 Clear error messages + retry/undo.
- I7.5 Status bar + command palette + CodeLens.
- I7.6 Approval cards with scope selector.
- I7.7 Destructive typed-confirmation.
- Acceptance: beginner completes onboarding.

## Phase I8 — Tests & Release
- I8.1 Render-output tests for all panels.
- I8.2 Host smoke test (activation, commands, webview).
- I8.3 Provider smoke (Brave/SerpAPI with keys).
- I8.4 Package VSIX + verify.
- I8.5 Update docs (plan/progress/structure).
- I8.6 Honest evaluation report.

## Agent Assignments
- A1 (Backend): I5.4, I5.5, I5.6, I5.7, I5.10, I6.4, I6.5
- A2 (UI): I1, I2, I3, I4, I7
- A3 (Webview): I1.4, I6.1, I6.2, I6.3
- A4 (Security): I5.1, I5.2, I5.3, I5.8, I5.9
- A5 (Perf): I6.6, I6.7, I6.8, I6.9, I6.10
- A6 (Tests): I8.1, I8.2, I8.3
- A7 (Release): I8.4, I8.5, I8.6

## Execution Order
I1 → I2 → I3 → I4 → I5 → I6 → I7 → I8 (sequential phases; within phase, parallel where independent).

## Next single action
Start I1.1 (import all renderers into webview.ts).