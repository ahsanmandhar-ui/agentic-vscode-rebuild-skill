# Beginner Developer Review — VibeCode Extension (task_0041)

Reviewer lens: beginner developer. Focus: clarity of instructions, helpfulness of
errors, sufficiency of onboarding. Scope: repository docs, skill package, `src/`,
webview, and `src/tests`. No code changes were made.

## 1. Clarity of instructions

- **Two different "products" in one repo with no boundary.** The README describes
  this workspace as a *skill package* that drives a rebuild in a *separate*
  extension source repo (`vibecode-engine-source`), yet the same workspace ships
  `src/`, tests, and a VS Code extension. A beginner cannot tell which files are
  the skill deliverable vs. the extension under construction. `plan.md` §"Scope
  split" explains it, but only after reading most of the README.
- **Setup commands are incomplete.** README says run `python3 tools/validate_skill.py`
  and `python3 tools/make_assets.py`, but there is no `npm ci` / `npm test`
  instruction for the `src/` side, no Node version, and no explanation that the
  extension cannot be built from this workspace alone (it references a different
  repo). `package.json` here has only devDependencies for the skill validator.
- **Skill activation steps assume prior knowledge.** README §"Install the skill"
  jumps to `mkdir -p`, `cp -r`, then "Settings → Features → Enable Skills" with
  no screenshot or verification that the skill actually loaded. There is no
  "how to know it worked" check beyond the `/skills` invocation.
- **Milestone vocabulary is dense.** Terms like `RECOMMENDATION / APPROVED /
  ATTEMPTED / VERIFIED`, `M0`, `Phase A–F`, and "evidence labels" appear before
  any plain-language explanation. A beginner has to read SKILL.md §1 to decode
  status lines, but nothing points them there from the README.
- **Conflicting status across docs.** `plan.md` says Phase F is "in progress"
  while `progress.md` lists Phase D as done and Phase B/C/E pending; `docs/
  UI_COVERAGE_AUDIT.md` overstates modules as "Implemented"; the UI gap report
  says renderers are "not imported anywhere." A beginner cannot tell what
  actually works.
- **No single "Start here" for the extension.** The suggested prompt in README
  ("Use the VibeCode Engine Rebuild skill...") is long and assumes the user
  already has their source repo open. There is no minimal "open folder → run one
  command → see the panel" path.

## 2. Error helpfulness

- **Raw error surfacing.** `src/webview.ts` posts `toast` with
  `(e as Error)?.message ?? String(e)` directly to the webview. There is no
  normalization, no cause/impact, and no suggested next action — the beginner
  sees a stack-ish string with no context.
- **Failure cards exist but are never produced.** `failureCardHtml()` and
  `FAILURE_ACTIONS` are defined in `src/ui/failure.ts`, but no code path builds a
  `FailureCardSpec` with cause/impact/action. The beginner never gets the
  "what broke / why / what to do" card the UI spec promises.
- **Empty states are inconsistent.** Some panels say "No logs yet." or "No
  settings." with no action; others use `EMPTY_STATES` with a button. Beginners
  cannot tell whether an empty panel is broken or just unused.
- **Status strings are ambiguous.** Home strip shows "Not connected" / "None"
  with status "unknown"; readiness defaults to two failures with no explanation.
  It is unclear whether the extension is broken or merely unconfigured.
- **Model/account errors are stored, not shown.** `ModelsAccountsPanel` records
  an `error` field in state, but the webview only posts `ready`/`empty`, so a
  failed provider test never reaches the user as a readable message.
- **No retry/undo affordance.** `FAILURE_ACTIONS` defines `retry`,
  `switchProvider`, `compact`, `openLogs`, but these are not wired to buttons in
  the rendered HTML, so a beginner has no recovery path after a failure.
## 3. Onboarding sufficiency

- **Onboarding renderer is unreachable.** `renderOnboarding` is imported and
  baked into `getHtml()` as `panel-onboarding`, but there is no `onboarding`
  `PanelId` and no state-machine entry, so it never transitions
  `loading → ready`. A new user never sees the 4-step flow; the first screen is
  Home with two failed readiness items.
- **No persistence/resume.** `RenderOnboardingArgs` accepts `step`/`currentStep`,
  but nothing reads or writes an "onboarding completed" flag, so the flow cannot
  be skipped-and-remembered.
- **System check step is decorative.** "Environment detected. Re-run the check
  any time." shows no detected values and no re-run button; the UI spec requires
  an environment table with detected values and `unknown` where a probe failed.
- **Safety step lacks controls.** "Security skills are offered first" is plain
  text with no [Inspect]/[Install]/[Skip] controls and no explanation of what
  happens if the user declines.
- **No discoverable entry point.** Status bar item and command-palette entries
  are mentioned in the UI spec but not activated in `extension.ts`; the only
  obvious surface is the webview panel, which may not open automatically.
- **Duplicate webview provider registration.** `extension.ts` registers both
  `panel` and `webviewProvider` to `vibecode.panel`, which can make the view
  appear twice or not at all on first run — confusing for a beginner.
- **Advanced controls are not gated.** Settings renders Guided + Advanced + CLI
  allowlist + skill trust on one flat page with no disclosure, exposing JSON and
  allowlist toggles with no explanation.
- **No "Start here" path.** There is no Welcome → System check → Connect a
  model → Safety flow that a beginner can follow end to end.

## 4. Top confusion points (ranked)

1. Nothing visible "does" anything: renderers exist but the webview is a static
   shell with a no-op listener, so clicks on `data-action` buttons do nothing.
2. Onboarding is rendered but unreachable and non-persistent.
3. `progress` is not a `PanelId`, so the progress viewer is orphaned.
4. Duplicate webview provider registration can break activation.
5. Empty/error/loading states are only partially implemented; most panels show a
   single hard-coded empty line.
6. Docs disagree about what is implemented, so a beginner cannot trust status.

## 5. Missing guidance

- A first-run "Start here" path with detected environment values and a re-run
  button.
- Per-panel empty states that always include one sentence + one primary action,
  consistently from `EMPTY_STATES`.
- A visible panel switcher/tabs so users discover all sections.
- Status-bar item + command-palette commands as a discoverable entry point.
- Masked key display and "stored via SecretStorage" messaging.
- "What just happened" + undo for automatic decisions (skill auto-activation,
  provider fallback).
- A single, authoritative "what works right now" status page.

## Evidence

- `src/webview.ts`: static shell; client listener only toggles classes and
  re-injects cached strings; no renderer invocation.
- `src/ui/failure.ts`: `EMPTY_STATES`, `emptyStateHtml`, `loadingHtml`,
  `disabledHtml`, `failureCardHtml`; `PANELS` omits `routers`/`cli`.
- `src/ui/onboarding.ts`: `DEFAULT_STEPS` are plain text; no controls.
- `src/extension.ts`: duplicate `vibecode.panel` registration; status bar not
  activated.
- `docs/UI_GAP_REPORT.md` and `docs/UI_NEW_USER_REVIEW.md` independently
  confirm the same gaps.
- `README.md` / `plan.md` / `progress.md`: conflicting status and incomplete
  setup guidance.

No code changes were made for this review.

- **Secrets handling is invisible.** Key inputs accept values with no visible
  masking or "stored in SecretStorage" messaging, so a beginner cannot tell
  whether their key was saved safely or at all.
