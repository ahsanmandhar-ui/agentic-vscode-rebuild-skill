# Screen-Reader Review — VibeCode Extension UI (task_0041)

Reviewer lens: screen-reader user (NVDA/JAWS/VoiceOver mental model). Scope: `src/ui/*.ts`,
`src/webview.ts`, `src/extension.ts`. Focus: **aria-live regions, labels, roles, announcements**.
No code changes. Evidence: static inspection of generated HTML strings only.

## 1. aria-live regions

Present (good): webview status `role="status" aria-live="polite"`; chat timeline `role="log" aria-live="polite"` with `aria-relevant="additions text"`; streaming `role="status" aria-live="polite" aria-atomic="true"`; search rate-limit banner `role="alert" aria-live="assertive"`; CLI output `<pre aria-live="polite" aria-atomic="true">`; agent tool-status `role="status" aria-live="polite"`; task status `role="status"`.

Issues:
1. Panel state changes are not announced — `panelState` handler only toggles CSS classes. WCAG 4.1.3. High.
2. No live region for diagnostics/permissions/models/context updates. Medium.
3. Chat empty state is a plain `<p>` inside a live region; transitions to empty not announced. Low.
4. CLI output live region is never updated by host (no wiring). Medium.
5. Onboarding progress `<div id="progress">` has no `aria-live`. Medium.
6. Streaming indicator renders empty `<span aria-live="polite">` when not streaming. Low.
## 3. Roles

Present (good): tablist/tabs/tabpanels, lists, tables with `scope="col"`, dialogs/alertdialogs, progressbar with valuenow/min/max, articles for messages, region for inspector.

Issues:
17. Provider list container `role="list"` but children are `<article>` without `role="listitem"`. High. (router-panel.ts)
18. Search provider list `role="list"` with `<article>` cards lacking `role="listitem"`. High. (search-panel.ts)
19. Settings allowlist/trust lists use `<li>` (correct) but containers are `<ul role="list">` — redundant but acceptable.
20. Skills browser skill rows use `role="listitem"` on `<div>` inside `role="list"` — correct, but only some rows have `tabindex="0"`. Medium.
21. Onboarding `<ul id="steps">` has no `role`/`aria-label`. Low.
22. Approval card uses `role="dialog"` but is inline, not modal — should be `role="group"`/`region`. Medium. (agent-panel.ts)
23. Destructive confirm `role="alertdialog"` and bulk confirm `role="alertdialog"` are inline without focus management. Medium.
24. Task status `<span role="status">` inside `<li>`; the `<li>` has `aria-label="title status"` duplicating visible text. Low.
25. Chat messages `<article aria-label="role message">` — SR reads label then content; verbose but acceptable. Low.

## 4. Announcements (dynamic updates)

26. No announcement when a skill is inspected/approved/rated. Medium.
27. No announcement when provider active state changes (Set active). Medium.
28. No announcement when a task status changes (running to completed/failed). Medium.
29. No announcement for model/account refresh results. Low.
30. No `aria-live` for composer send/cancel outcome; errors appear as failure cards (not announced, see #14). High.
31. Webview message listener is effectively a no-op for announcements beyond class toggling (confirmed in `src/webview.ts`); all dynamic updates rely on DOM mutation without live regions. WCAG 4.1.3. High.

## 5. Screen-reader-specific structural gaps

32. No skip link / landmark bypass; multiple `<section>` landmarks but no skip-to-content. Low.
33. No document `<title>` in webview `<head>`. WCAG 2.4.2. Low.
34. Tabs are `<div role="tab">` not `<button>`; SR may not announce them as activatable without keyboard handlers (none exist). High.
35. No `aria-current` on active tab (only active provider card has `aria-current="true"`). Low.
36. Onboarding step buttons "Mark done" give no completion announcement beyond visual change. Medium.

## Summary (screen-reader lens)

- aria-live coverage is decent for chat/search/CLI/agent, but missing for panel state, diagnostics, permissions, models, context, tasks, and failures.
- Labels mostly present on inputs/buttons, but missing on context textarea, diagnostics/models pre, messages/skills containers, tabs' selected state, and approval/failure subjects.
- Roles mostly correct, but list containers declare `role="list"` while children are `<article>` (not listitems) in router and search panels; tabs are divs not buttons.
- Announcements for dynamic updates are largely absent because the webview message listener only toggles classes.

## Top issues to fix (ranked)

1. Make tabs real `<button>` (or add keyboard handlers) + `aria-selected`/`aria-controls` + `aria-labelledby` on panels.
2. Add `role="alert"`/`aria-live` to failure cards and panel state changes.
3. Add labels to context textarea, diagnostics/models pre, messages container.
4. Fix `role="list"`/`listitem` mismatch in router + search panels.
5. Add `aria-live` to onboarding progress and task/permission/model refresh results.

No code changes were made for this review.
Evidence labels: findings are ATTEMPTED (static review); SR behavior requires runtime verification with an actual screen reader.


## 2. Labels

Present (good): prompt input `aria-label="Prompt"`; chat textarea has both `<label for>` and `aria-label`; provider/search buttons carry `aria-label`; badges carry `aria-label`; onboarding step number `aria-hidden="true"`.

Issues:
7. Context textarea has no label/`aria-label`. High.
8. Diagnostics `<pre id="diag">` and Models `<pre id="models">` have no accessible name. Medium.
9. Messages container `<div id="messages">` has no label/role. Medium.
10. Skills list container `<div id="skills-list">` has no name/role. Low.
11. Tabs have visible text but no `aria-selected`/`aria-controls`; active state CSS-only. High.
12. Tab panels (`role="tabpanel"`) have no `aria-labelledby`. Medium.
13. Approval card buttons "Approve"/"Deny" have no `aria-label` referencing subject. Medium.
14. Failure card has no `role="alert"` and no `aria-live`. High.
15. Home readiness checklist `<ul role="list">` has no `aria-label`. Low.
16. `aria-label` duplication on chat textarea (both label and aria-label) redundant. Low.
