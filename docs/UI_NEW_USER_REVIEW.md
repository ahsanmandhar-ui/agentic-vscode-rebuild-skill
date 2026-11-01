# New-User Review — VibeCode Extension UI (task_0041)

Reviewer lens: first-time user. Scope: `src/ui/*` and `src/webview.ts`, plus the
intended UX in `.cline/skills/.../references/UI_SPEC.md`. No code changes.

## 1. Onboarding

- **Renderer exists but is not reachable.** `renderOnboarding` (U9.2) is imported in
  `webview.ts` and baked into `getHtml()` as `panel-onboarding`, but there is no
  `onboarding` PanelId and no state machine entry for it, so it never transitions
  `loading → ready`. A new user never sees the 4-step flow; the first screen is
  Home with a readiness checklist that already marks two items failed.
- **No persistence / resume.** `RenderOnboardingArgs` accepts `step`/`currentStep`,
  but nothing in `webview.ts` or `extension.ts` reads/writes a "onboarding
  completed" flag, so the flow (if shown) cannot be skipped-and-remembered.
- **System check step is decorative.** "Environment detected. Re-run the check
  any time." gives no detected values and no re-run button; UI_SPEC §3 requires
  the environment table with detected values and "unknown" where a probe failed.
- **Safety step lacks the security-skill offers.** DEFAULT_STEPS says "Security
  skills are offered first", but the renderer only renders title+body paragraphs;
  there are no [Inspect]/[Install]/[Skip] controls, and no explanation of what
  happens if the user declines.

## 2. Empty states

- **Empty-state helpers are defined but mostly orphaned.** `EMPTY_STATES` covers
  all 14 PanelIds and `emptyStateHtml()` exists, yet `webview.ts` `loadPanel`
  posts empty states only for a few panels; most renderers hard-code their own
  empty copy (e.g. settings "No settings.", diagnostics "No logs yet."),
  producing inconsistent wording and no action button in several places.
- **Inconsistent action labels.** `EMPTY_STATES.chat` says "Tell me what to do
  in this workspace…" with action "Start chat", while the chat renderer's own
  empty copy differs; `home` empty state says "Welcome to VibeCode. Open Home to
  get started." which is circular when Home is already open.
- **No loading/error states wired for most panels.** `PanelStatus` includes
  `loading`/`error`/`disabled`, and `loadingHtml()`/`disabledHtml()`/`failureCardHtml()`
  exist, but `webview.ts` only ever posts `ready`/`empty`; there is no path that
  surfaces a failure card with cause/impact/action (UI_SPEC §2 requires all
  four states per panel).
- **`progress` is not a PanelId** even though `renderProgressViewer` exists and
  is rendered into `getHtml()`; its empty state ("No progress recorded yet…")
  can therefore never be driven by `postPanelState`.

## 3. Discoverability

- **Renderers are imported but never invoked at runtime.** `webview.ts` builds
  one static HTML shell with all panels' initial HTML, then the client-side
  message listener only toggles CSS classes and re-injects the *same* cached
  renderer strings from `renderers`. There is no navigation/switcher UI, so a
  new user cannot tell that Home, Onboarding, Chat, Plan, Tasks, Routers, Search,
  CLI, Models, Perms, Diagnostics, Settings, Context all exist.
- **No status bar item / command palette entries wired** (UI_SPEC §2 shell
  mentions them; `status-bar.ts` exists but is not activated in `extension.ts`
  per the gap report). A new user has no obvious entry point to "Ask VibeCode"
  or to switch providers.
- **Duplicate provider registration** in `extension.ts` (`panel` and
  `webviewProvider` both registered to `vibecode.panel`) means the view may
  appear twice or not at all; confusing for a first run.
- **Advanced controls are not visibly gated.** Settings panel renders Guided +
  Advanced + CLI allowlist + skill trust in one flat page with no disclosure;
  beginners see JSON and allowlist toggles with no explanation of what they do.
## 4. Clarity

- **Readiness checklist defaults to two failures** ("Model connected ✗",
  "Context files present ✗") with no next step beyond the empty-state button;
  nothing explains *why* context files matter or how to create them.
- **Model/account strip says "Not connected"/"None" with status "unknown"** —
  ambiguous whether the extension is broken or just unconfigured.
- **Empty states teach inconsistently.** Some are one sentence + action (good),
  others are bare ("No logs yet.", "No settings.") with no guidance.
- **Secrets handling is invisible to the user.** UI_SPEC requires key input
  `type="password"` and masked display `••••…abcd`, but the router/search panels
  accept keys with no visible masking affordance in the rendered HTML.
- **No "what just happened" / undo** for automatic decisions (skill
  auto-activation, provider fallback) despite UI_SPEC §5 requiring it.

## 5. Top confusion points (ranked)

1. Nothing appears to "do" anything: renderers exist but the webview is a static
   shell with a no-op listener, so clicks on data-action buttons do nothing.
2. Onboarding is rendered but unreachable and non-persistent.
3. `progress` panel id mismatch makes the progress viewer orphaned.
4. Duplicate webview provider registration can break activation.
5. Empty/error/loading states are only partially implemented; most panels show
   a single hard-coded empty line.

## 6. Missing guidance

- A first-run "Start here" path: Welcome → System check (with values) → Connect
  a model (local/API key/later) → Safety (with skill offers).
- Per-panel empty states that always include one sentence + one primary action,
  consistently from `EMPTY_STATES`.
- A visible panel switcher / tabs so users discover all sections.
- Status-bar item + command-palette commands as a discoverable entry point.
- Masked key display and storage-via-SecretStorage messaging.
- "What just happened" line + undo for automatic decisions.
- Host render smoke test so these gaps are caught (currently only CSP/container
  is tested).

## Evidence

- `src/webview.ts` imports renderers but `getHtml()` emits static shell; client
  listener only toggles classes and re-injects cached strings.
- `src/ui/failure.ts` defines `EMPTY_STATES`, `emptyStateHtml`, `loadingHtml`,
  `disabledHtml`, `failureCardHtml`; `EMPTY_STATES` omits `routers`/`cli` from
  the `PANELS` array exported in the same file (mismatch).
- `src/ui/onboarding.ts` DEFAULT_STEPS are plain text; no controls.
- `docs/UI_GAP_REPORT.md` (task_0029) independently confirms renderers are
  "not imported anywhere" / orphaned and lists the same gaps.
- `docs/UI_COVERAGE_AUDIT.md` currently overstates status as "Implemented".

No code changes were made for this review.

