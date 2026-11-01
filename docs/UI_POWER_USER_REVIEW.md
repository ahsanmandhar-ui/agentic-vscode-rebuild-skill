# Power-User Review — VibeCode Extension (task_0041)

Reviewer lens: power user. Scope: `src/extension.ts`, `package.json` contributes, `src/ui/*` (status-bar, ask-vibecode, models-accounts, router-panel, failure), `src/providers/*` (fallback, accounts, router-types), webview protocol. No code changes.

## 1. Keyboard shortcuts

- **None defined.** `package.json` has no `contributes.keybindings` block at all. There is no way to invoke any VibeCode command without the mouse/command palette. Every registered command (`vibecodeEngine.*`, `vibecode.openChat`) is mouse-only.
- **No in-webview keyboard shortcuts.** No `keydown`/`keyup`/`keypress` handlers anywhere in `src/ui` or `src/webview.ts`; the only keyboard handling in the codebase is Escape-to-close in unrelated vite/vitest internals. Enter-to-send, Ctrl+Enter, Esc-to-cancel-generation, Tab/arrow navigation in panels are all absent.
- **No `aria-keyshortcuts` / `accesskey`** attributes anywhere in the renderers, so screen-reader/keyboard users get no advertised shortcuts.
- **CodeLens "Ask VibeCode" has no keybinding** and no default chord; it is only reachable via the inline CodeLens (mouse) or the command palette.
- **Status bar item** opens chat on click but has no keyboard equivalent; VS Code status-bar items are focusable, but no `command` shortcut is bound, and the item is not registered as a keybinding target.

Friction: a keyboard-first power user cannot drive the extension at all; every action requires pointer + palette round-trips.

## 2. Command palette

- **Two command namespaces, inconsistent.** `package.json` contributes only `vibecodeEngine.*` (11 commands). The newer U16 alias commands (`vibecode.chat`, `vibecode.plan`, `vibecode.cli.run`, `vibecode.askVibeCode`, `vibecode.models.connect`, `vibecode.settings.open`, `vibecode.context.create`, `vibecode.context.compact`, `vibecode.retry`, `vibecode.diagnostics.run`, `vibecode.logs.open`, `vibecode.agent.run`, `vibecode.skills.install`, `vibecode.search.configure`, `vibecode.plan.create`, `vibecode.progress.update`) are referenced by `EMPTY_STATES` action buttons and by `failure.ts`, but are **not registered in `extension.ts`** (only `vibecode.openChat` and the 11 `vibecodeEngine.*` commands exist). Clicking any empty-state action button therefore does nothing (no handler), and the commands never appear in the palette.
- **No `when` clauses / context keys.** Commands are always enabled, including destructive ones (`vibecode.cli.run`, `vibecode.context.compact`); there is no gating on workspace-open, webview-focused, or selection-non-empty.
- **No command categories / icons.** Titles are inconsistent ("VibeCode: Run Tool (demo)", "VibeCode: Show Diagnostics", "VibeCode: Onboarding") and none carry `icon` metadata, so palette entries are hard to scan.
- **`vibecode.askVibeCode`** is referenced by CodeLens but never registered, so the CodeLens click fails at runtime.
- **No recent/quick-switch commands** for "switch provider", "switch account", "switch model", or "next fallback" — all require opening the Models panel and clicking.

## 3. Multi-account

- **Backend exists, UI is read-only.** `src/providers/accounts.ts` supports `addAccount/removeAccount/listAccounts/selectAccount` with strategies `manual/round-robin/least-used`, and `models-accounts.ts` renders accounts, rotation strategy, usage, masked key, fallback flag. But `extension.ts` never instantiates an `AccountManager` or wires add/remove/select handlers; the panel is static HTML with a single "Connect provider" button whose `data-action` has no handler.
- **No account switch command** in the palette or status bar. Status bar click maps to `vibecode.models.switchProvider`, which is not registered, so the status bar is dead.
- **No per-account key management flow.** `manageKeys` only stores a single `vibecodeEngine.apiKey` (one key, no account id), despite accounts.ts storage keying `vibecode.router.<providerId>.<type>[.<accountId>]`. Multi-account secrets cannot be added/rotated/removed from the UI.
- **No "authorized for fallback" toggle** in the UI even though the column is rendered (`authorizedForFallback`); users cannot authorize an account for fallback chains.
- **No account health/cooldown surface** beyond a badge; no "re-authenticate" action when `auth_expired`.

## 4. Fallback chains

- **Backend is complete** (`selectWithFallback`, circuit breaker, health) but the UI `renderRouterPanel` shows a **placeholder** ("Fallback chain editor placeholder.") — no chain editing, reordering, enable/disable, or per-profile (chat/code/embeddings) view.
- **No visibility into active chain / tried providers.** When a request fails over, the user is not told which provider was tried or why; the chat panel only posts a failure card with `err.kind`.
- **No manual override** to force a provider or skip a circuit-open provider from the UI; only `set-active` button (unwired).
- **Circuit breaker state** (open/half-open/cooldown) is not surfaced anywhere; status bar shows only a single health string.
- **No "test fallback" / dry-run** action for power users to validate a chain.

## 5. Efficiency

- **No quick actions / chords** for the most common power-user flows: send prompt, cancel generation, regenerate, open chat, switch model, run CLI, compact context, open diagnostics. Each requires palette + Enter.
- **No command history / reuse** in the chat composer (no up-arrow recall, no saved prompts).
- **No batch/multi-file operations** exposed; tools run one at a time with informational toasts.
- **No "run in background" / async task tracking** UI despite `tasks-panel` existing; tasks list is static.
- **Webview is a static shell** (per new-user review) — every panel re-render re-injects cached HTML; no incremental updates, so switching panels is expensive and loses input state.
- **Auto-open chat on activation** (`vscode.commands.executeCommand('vibecode.openChat')`) runs unconditionally, stealing focus on every window open; no setting to disable.
- **Status bar polls every 30s** (`setInterval` 30000) even when no accounts are configured, wasting cycles; no dispose on window blur.
- **No keyboard-driven provider switch** from the status bar or palette; the status bar command (`vibecode.models.switchProvider`) is unregistered, so the primary efficiency affordance is broken.

## 6. Missing shortcuts (concrete list)

Recommended default keybindings (none exist today):

| Action | Suggested chord | Command (must be registered first) |
|---|---|---|
| Open VibeCode chat | `Ctrl+Shift+V` (Win) / `Cmd+Shift+V` (Mac) | `vibecode.openChat` |
| Send prompt in composer | `Ctrl+Enter` | `vibecode.chat.send` |
| Cancel generation | `Esc` | `vibecode.chat.cancel` |
| Regenerate last | `Ctrl+Shift+R` | `vibecode.chat.regenerate` |
| Ask VibeCode on selection | `Ctrl+Shift+A` | `vibecode.askVibeCode` |
| Switch provider/account | `Ctrl+Shift+P` (scoped) | `vibecode.models.switchProvider` |
| Run CLI tool | `Ctrl+Shift+T` | `vibecode.cli.run` |
| Compact context | `Ctrl+Shift+C` | `vibecode.context.compact` |
| Open diagnostics | `Ctrl+Shift+D` | `vibecode.showDiagnostics` |
| Open settings | `Ctrl+,` scoped | `vibecode.settings.open` |
| Next/prev panel | `Ctrl+Tab` / `Ctrl+Shift+Tab` | `vibecode.panel.next` / `.prev` |
| Toggle advanced mode | `Ctrl+Shift+M` | `vibecode.settings.toggleAdvanced` |

## 7. Top friction points (ranked)

1. **No keybindings at all** — extension is pointer-only.
2. **U16 alias commands referenced but not registered** — empty-state buttons, CodeLens, and status bar are all dead.
3. **Status bar command points at unregistered `vibecode.models.switchProvider`** — primary efficiency affordance broken.
4. **Multi-account UI is static** — cannot add/remove/select/authorize accounts.
5. **Fallback chain editor is a placeholder** — no editing or visibility.
6. **Chat composer has no send/cancel/regenerate shortcuts** and no history.
7. **Auto-open chat on activation** steals focus with no opt-out.
8. **No `when` clauses** — commands always enabled, including destructive ones.

## 8. Evidence

- `package.json` `contributes`: only `commands` (11 `vibecodeEngine.*`); no `keybindings`, no `menus`, no `views`/`viewsContainers`.
- `src/extension.ts` registers 11 `vibecodeEngine.*` + `vibecode.openChat` + `vibecodeEngine.__testSecretRoundtrip`; none of the `vibecode.*` aliases used by `EMPTY_STATES`/`failure.ts`/status-bar.
- `grep keydown/keyup/keypress` across `src/` (excluding node_modules) returns zero hits; no `accesskey`/`aria-keyshortcuts` either.
- `src/ui/status-bar.ts` line 39 sets `item.command = 'vibecode.models.switchProvider'` (unregistered); `src/ui/ask-vibecode.ts` line 26 calls `vscode.commands.executeCommand('vibecode.chat', ...)` (unregistered).
- `src/ui/router-panel.ts` lines 148-153 render the fallback chain as a placeholder paragraph.
- `src/ui/models-accounts.ts` renders account rows + rotation + fallback flag but no action handlers; only a "Connect provider" button with `data-action="vibecode.models.connect"` (unregistered).
- `src/providers/fallback.ts` implements `selectWithFallback`, circuit breaker, health probes; `src/providers/accounts.ts` implements `AccountManager` with strategies — both backend-only, no UI wiring.

No code changes were made for this review.
