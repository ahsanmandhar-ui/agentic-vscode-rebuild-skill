# Complete Improvement Plan (from user review)

## Phase I1 — Wire Renderers (foundation)
- I1.1 Replace static webview shell with renderer dispatch (chat, home, plan, progress, router, search, cli, agent, tasks, skills, models, permissions, diagnostics, settings, context).
- I1.2 Add client-side panelState listener that calls the matching renderer.
- I1.3 Add 'progress' panel (already done) and 'home'/'agent'/'tasks'.
- Acceptance: tsc 0; render tests; visual check.

## Phase I2 — CSS & Layout
- I2.1 Ship a real stylesheet (webview.css) with VS Code theme tokens.
- I2.2 Fixed min-heights for panels; no CLS.
- I2.3 Touch targets ≥44px; 8px spacing.
- I2.4 Horizontal scroll fix for tables/pre blocks (max-width + wrap).
- I2.5 Reduced-motion media query.
- Acceptance: visual check + a11y.

## Phase I3 — Keyboard & Focus
- I3.1 Tab order + focus rings (outline 2px).
- I3.2 Keyboard handlers for all interactive elements.
- I3.3 Command palette entries + keybindings (contributes.keybindings).
- I3.4 Focus management on panel switch.
- I3.5 Skip link.
- Acceptance: keyboard-only navigation works.

## Phase I4 — Accessibility (aria/screen reader)
- I4.1 aria-live regions for all dynamic updates.
- I4.2 Labels for all inputs/pre containers.
- I4.3 Roles: listitem, button, tab (not div).
- I4.4 aria-expanded/aria-current/aria-describedby.
- I4.5 Contrast 4.5:1 verification.
- Acceptance: screen reader announces changes.

## Phase I5 — Security Hardening
- I5.1 Remove/export-guard __testSecretStorage.
- I5.2 Never pre-fill masked secrets.
- I5.3 Remove keys from URLs (Brave/SerpAPI use headers).
- I5.4 SSRF guard on all search adapters + Gemini base URL validation.
- I5.5 Resolve symlinks in confinePath.
- I5.6 Expand secret patterns; memory root validation.
- I5.7 Permission gates for TerminalSessionManager + system/info.
- I5.8 Escape webview innerHTML (or use textContent).
- I5.9 new Function tools require explicit per-invocation approval.
- Acceptance: security tests pass.

## Phase I6 — Streaming & Performance
- I6.1 Streaming protocol (streamChunk messages, append to last bubble).
- I6.2 Cancellation handling.
- I6.3 Lazy loading (defer subsystem init).
- I6.4 Gating auto-open chat behind setting.
- I6.5 Bounded history (turnsByPanel cap).
- I6.6 panel-dispose cleanup; PromptCache clearing.
- I6.7 Bundle optimization (.vscodeignore trim, drop maps, esbuild).
- Acceptance: perf budget met.

## Phase I7 — Onboarding & UX Polish
- I7.1 Onboarding 4-step with persistence.
- I7.2 Empty/error states with actions everywhere.
- I7.3 Loading feedback + disabled states.
- I7.4 Clear error messages + retry/undo.
- I7.5 Status bar + command palette + CodeLens.
- Acceptance: beginner can complete onboarding.

## Phase I8 — Tests & Release
- I8.1 Render-output tests for all panels.
- I8.2 Host smoke test (activation, commands, webview).
- I8.3 Provider smoke (Brave/SerpAPI with keys).
- I8.4 Package VSIX + verify.
- I8.5 Update docs (plan/progress/structure).

## Execution Order
I1 → I2 → I3 → I4 → I5 → I6 → I7 → I8.
Quality over speed; no simplification.

## Next single action
Start I1 (wire renderers).