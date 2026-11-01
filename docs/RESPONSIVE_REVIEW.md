# Responsive / Narrow-Layout Review — VibeCode Engine Webview UI

Task: task_0041 (reviewer-10-mobile). Scope: `src/ui/*.ts`, `src/webview.ts`, `index.html`, `media/`. Review only — **no code changes**.

Method: static inspection of generated HTML and the single shipped stylesheet (`index.html`). No runtime render, no device emulation, no automated viewport testing. VS Code webviews are typically rendered in a 280–400px sidebar column; findings are assessed against that constraint.

## Summary

- The webview shell (`src/webview.ts`) ships **no CSS at all** beyond `body { font-family; color; background; margin:0; padding:8px }`. Every panel relies on class names whose rules are undefined in-repo, so layout, overflow, and reflow behaviour cannot be confirmed and is effectively unimplemented.
- The only responsive CSS in the repo lives in `index.html` (skill-package overview page), which uses `auto-fit` grids with `minmax(300px,1fr)` and `flex-wrap` — reasonable, but its 300px floor can still force horizontal scroll below ~320px.
- Multiple panels emit wide, non-wrapping structures (7-column account table, `<pre>` blocks for diffs/logs/JSON/plan) with no scroll container or word-wrap, guaranteeing horizontal scroll in a narrow sidebar.
- No minimum touch-target sizing exists anywhere (`min-height`/`min-width` on buttons/inputs), so controls can fall below the 44×44 CSS-px (AAA) / 24×24 (AA) targets on dense layouts.
- No `@media` (including `prefers-reduced-motion`, `forced-colors`, or width-based breakpoints) exists in `src/`.

## Findings

### R1. No responsive CSS in the webview shell
- `src/webview.ts` `<style>` defines only body font/color/background/margin/padding. No breakpoints, no `flex-wrap`, no `overflow` handling, no `max-width` measure constraint.
- WCAG 1.4.10 Reflow (AA), 1.4.4 Resize Text (AA). Severity: Medium-High.

### R2. Account table will overflow horizontally
- `src/ui/models-accounts.ts` renders a 7-column `<table>` (Account, Provider, Health, Rotation, Usage, Key, Fallback) with no wrapping/scroll container. In a ~300px sidebar this overflows the viewport and forces page-level horizontal scroll.
- WCAG 1.4.10 Reflow (AA). Severity: High.

### R3. `<pre>` blocks do not constrain width / wrap long lines
- `src/ui/tasks-panel.ts` (diff `<pre>`), `src/ui/diagnostics-panel.ts` (logs/perf `<pre>`), `src/ui/cli-panel.ts` (CLI output `<pre>`), `src/ui/plan-viewer.ts`, `src/ui/progress-viewer.ts`, `src/ui/context-viewer.ts`, `src/ui/settings-panel.ts` (advanced JSON `<pre><code>`).
- No `overflow: auto`/`word-break`/`white-space: pre-wrap` is shipped for the webview, so long diffs/JSON/paths push the layout wider than the column; `index.html` does set `overflow:auto` on `pre`, but that rule does not apply to the webview.
- WCAG 1.4.10 Reflow (AA), 1.4.8 Visual Presentation (AAA). Severity: Medium-High.

### R4. No touch-target minimums
- Buttons/inputs across panels (`vc-btn`, chips, refresh, connect, start task, send, attach, invoke) have no `min-height`/`min-width`/padding floor in shipped CSS. Dense rows risk sub-44px targets.
- WCAG 2.5.5 Target Size (AAA) / 2.5.8 Target Size (Minimum) (AA). Severity: Medium.

### R5. index.html grid floor can overflow very narrow viewports
- `index.html` `.g2{grid-template-columns:repeat(auto-fit,minmax(300px,1fr))}` and `.g3{minmax(220px,1fr)}`. Below ~320px the 300px minimum cannot fit and the grid overflows horizontally instead of collapsing to one column.
- Severity: Low (skill-package overview page, not the extension UI).

### R6. No horizontal-scroll containment / `overflow-x: hidden` strategy
- Because no CSS ships, there is no `overflow-x: hidden` on `body`/`#app` and no per-component scroll containers; any wide child (table/pre) scrolls the whole document.
- Severity: Medium.

### R7. Long unbreakable tokens (URLs, paths, masked keys, ids)
- `esc()` does not insert break opportunities; provider URLs, file paths, masked keys, and task ids are rendered verbatim in cells/bubbles. Without `word-break: break-all`/`overflow-wrap: anywhere`, these force horizontal overflow.
- Severity: Medium.

### R8. Fixed 8px padding + no measure constraint
- Body padding is fixed 8px (fine), but prose blocks have no `max-width` (≤45-char measure per UI_SPEC §1.6), so lines run edge-to-edge in wide hosts and wrap unpredictably in narrow ones.
- WCAG 1.4.8 Visual Presentation (AAA). Severity: Low.

### R9. No `forced-colors` / high-contrast handling
- No `@media (forced-colors: active)` and no HC tokens; borders/focus may disappear in Windows High Contrast.
- WCAG 1.4.11 Non-text Contrast (AA). Severity: Medium (also tracked in ACCESSIBILITY_REVIEW.md #8).

### R10. Chat composer textarea fixed `rows="3"`
- `src/ui/chat-panel.ts` uses `<textarea rows="3">` with no responsive height; acceptable, but combined with no CSS it may not fit narrow columns gracefully.
- Severity: Low.

## Recommendations (no code applied)

- Ship a minimal webview stylesheet (VS Code theme-aware) defining: `body, #app { overflow-x: hidden; }`; responsive containers; `table { display: block; overflow-x: auto; }` or card-stacking below a breakpoint; `pre { overflow: auto; white-space: pre-wrap; word-break: break-word; }`; `overflow-wrap: anywhere` on cells/bubbles; `min-height: 32px` (or 44px for AAA) on `.vc-btn`, inputs, chips; `max-width: 45ch` on prose blocks; `@media (prefers-reduced-motion: reduce)` and `@media (forced-colors: active)`.
- Lower the `index.html` grid floor to `minmax(min(100%, 300px), 1fr)` so it collapses on very narrow viewports.
- Add `aria-describedby`/scroll-region roles to wide tables/pre blocks announcing horizontal scroll.
- Verify at 320px, 375px, 768px and in the VS Code sidebar (≈300px) with light/dark/high-contrast; capture screenshots as evidence.

## Evidence labels

- Findings above are ATTEMPTED (static review, no runtime/device verification).
- No code changes made. Contrast/reflow/touch sizes require runtime verification in a real webview host.
