# Accessibility Review — VibeCode Engine Webview UI

Task: task_0041 (accessibility reviewer). Scope: `src/ui/*.ts`, `src/webview.ts`, `src/extension.ts`, `media/`. Review only — **no code changes**.

Method: static inspection of generated HTML/ARIA/CSS and VS Code webview shell. No runtime/host render, no automated axe/pa11y. No CSS bundle ships in `src/` (styling is class-based with no shipped stylesheet), so contrast and motion cannot be fully verified statically.

## Summary

- Reviewable UI is **pure HTML string renderers** with many ARIA labels, but **no CSS** ships in `src/` and the webview shell defines only a body style. Focus indicators, reduced-motion, spacing, and most contrast cannot be confirmed and are effectively unimplemented.
- **No JavaScript keyboard handling** exists anywhere in `src/ui` or `src/webview.ts` (frontend listener is a no-op except class toggling). No `keybindings` in `package.json`.
- Several WCAG 2.1 AA issues are evident; AAA/UX issues also noted.

## Findings

### A. Keyboard operability

1. **No keyboard interaction handlers.** No `keydown`/`keyup`/`keypress` in `src/ui` or `src/webview.ts`; composer has no Enter-to-send / Esc-to-cancel; fallback reorder is mouse drag only.  
   WCAG 2.1.1 Keyboard (A), 2.1.2 No Keyboard Trap (A). Severity: High.

2. **No `tabindex`/roving focus in lists.** Provider cards, task items, permission rules are `<li>`/`<article>` without focusability; only native buttons/inputs are tabbable.  
   WCAG 2.1.1, 2.4.3 Focus Order (A). Severity: Medium.

3. **No command keybindings.** `package.json` has no `contributes.keybindings`; all commands mouse/command-palette only.  
   WCAG 2.1.1 (A) (operability). Severity: Medium.

4. **No skip link / landmark bypass.** Multiple `<section>` landmarks but no skip-to-content.  
   WCAG 2.4.1 Bypass Blocks (A). Severity: Low.

### B. Focus visible

5. **No focus ring styles.** No `:focus`, `:focus-visible`, or `outline` anywhere in `src` (only body font/color/background). Webview default focus outline may be removed by browser defaults in some hosts.  
   WCAG 2.4.7 Focus Visible (AA), 2.4.11 Focus Not Obscured (AA). Severity: High.

6. **No focus management on panel switch.** Frontend only toggles classes/innerHTML; does not move focus or announce new panel.  
   WCAG 2.4.3 Focus Order (A), 4.1.3 Status Messages (AA). Severity: Medium.

### C. Contrast

7. **Contrast unverifiable / likely unstyled.** No stylesheet; badges use color classes (`vc-health-ok`, etc.) with no defined colors in repo. Status text is present, but visual contrast depends on undefined CSS.  
   WCAG 1.4.3 Contrast (Minimum) (AA), 1.4.6 Contrast (Enhanced) (AAA). Severity: High (unverified).

8. **No high-contrast verification.** UI_SPEC requires light/dark/high-contrast; no `@media (forced-colors)` or HC tokens.  
   WCAG 1.4.11 Non-text Contrast (AA). Severity: Medium.

### D. Use of color / status

9. **Mostly text + icons present** (health badges include status words; readiness uses ✓/○ plus labels; task status text). Lower risk. But color class names suggest intended color-only emphasis; without CSS, status may rely on class color.  
   WCAG 1.4.1 Use of Color (A). Severity: Low-Medium.

### E. Reduced motion

10. **No `prefers-reduced-motion` handling.** `chat-panel.ts` comment claims respect, but no media query exists anywhere in `src`.  
    WCAG 2.3.3 Animation from Interactions (AAA) and 2.2.2 Pause, Stop, Hide (A) if motion added. Severity: Medium.

### F. Screen reader / semantics

11. **Good:** many `aria-label`, `aria-live` regions (chat timeline `role="log"`, streaming status, search rate-limit banner `role="alert"`), form labels, table `scope="col"`, SVG `role="img"`.

12. **Missing status announcements for async updates.** Webview frontend message listener is a no-op except class toggling; dynamic state changes (loading/empty/error/ready) are not announced beyond existing live regions.  
    WCAG 4.1.3 Status Messages (AA). Severity: Medium.

13. **No `aria-expanded`/disclosure semantics** for advanced settings or details; advanced settings rendered as `<pre>` always visible.  
    WCAG 4.1.2 Name, Role, Value (A). Severity: Low.

14. **No `aria-current` except active provider**; active tab/panel not indicated.  
    WCAG 4.1.2. Severity: Low.

15. **Empty/error states buttons lack explicit association** to the message (no `aria-describedby`). Minor.  
    WCAG 1.3.1 Info and Relationships (A). Severity: Low.

### G. Text presentation / layout

16. **No measure constraint.** UI_SPEC requires ≤45-char measure for prose; no `max-width`/CSS.  
    WCAG 1.4.8 Visual Presentation (AAA). Severity: Low.

17. **No reflow/zoom handling.** No responsive CSS; fixed padding only.  
    WCAG 1.4.10 Reflow (AA), 1.4.4 Resize Text (AA). Severity: Medium.

18. **Touch/target size.** No min-size CSS for buttons/inputs.  
    WCAG 2.5.5 Target Size (AAA) / 2.5.8 Target Size (Minimum) (AA). Severity: Medium.

### H. Webview shell

19. **CSP correct** (`default-src 'none'`, nonce scripts, style-src cspSource). Good for security, not a11y.

20. **`<html lang="en">` present.** Good.

21. **No document title.** Webview `<head>` has no `<title>`.  
    WCAG 2.4.2 Page Titled (A). Severity: Low.

## Recommendations (no code applied)

- Ship a minimal stylesheet (or VS Code theme-aware CSS) defining focus rings (`:focus-visible { outline: 2px solid var(--vscode-focusBorder); }`), reduced-motion (`@media (prefers-reduced-motion: reduce)`), spacing, and reflow.
- Add keyboard handlers: Enter to send, Esc to cancel, arrow/Enter for lists and fallback reorder; roving tabindex.
- Add `contributes.keybindings` for primary commands.
- Add skip link and focus management on panel change.
- Verify contrast in light/dark/high-contrast via runtime; ensure badges meet 4.5:1.
- Add `aria-live`/`role="status"` wrappers for panel state changes; `aria-expanded` for disclosures.
- Add document title.

## Evidence labels

- Findings above are ATTEMPTED (static review). Contrast/motion require runtime verification.
- No code changes made.
