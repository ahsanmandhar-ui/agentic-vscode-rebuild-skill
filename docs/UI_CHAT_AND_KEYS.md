# VibeCode Extension UI Design (Complete)

## 1. Logo & Branding
- Activity Bar icon: 24×24 SVG, currentColor, hex engine block with code chevron (from LOGO_BRIEF.md).
- Sidebar title: "VibeCode Engine".
- Color tokens: use VS Code theme variables (--vscode-foreground, --vscode-sideBar-background, --vscode-button-background, --vscode-focusBorder). No raw hex in components.

## 2. Sidebar Layout (Activity Bar → VibeCode)
Tabs (≤6, predictable back):
1. Chat (new) — conversation timeline + composer.
2. Agent — task list, plan view, checkpoint/restore.
3. Skills — installed/recommended/search/inspector.
4. Routers — providers, accounts, fallback chain.
5. Search — search providers + keys.
6. Settings — CLI allowlist, skill trust, onboarding.

Status bar: active router, health badge, account indicator.

## 3. Chat Interface
- Conversation timeline (scrollable, virtualized for performance).
- Message bubbles: user (right), assistant (left), tool (compact card).
- Composer: multiline textarea, send button, attach file button, skill chips.
- Streaming: tokens append with aria-live="polite".
- Reduced motion: no animations beyond transitions; respect prefers-reduced-motion.
- Empty state: "Tell me what to do in this workspace…" with quick actions.

## 4. One-Click Invoke
- Sidebar "Run" button → opens chat with a starter prompt.
- Code lens / editor context menu: "Ask VibeCode" → sends selected code to chat.
- Command palette: "VibeCode: Chat" (Ctrl+Shift+V).

## 5. API Key Management (multi-CLI + providers)
- Routers tab: provider cards (OpenRouter, LiteLLM, DeepSeek, Ollama, custom) with health/latency/cost badges.
- "Add account" → modal: provider, label, key (password input, show/hide), strategy (manual/round-robin/least-used).
- Key stored in SecretStorage under `vibecode.router.<provider>.accounts`; masked display (last 4 chars).
- Search tab: DuckDuckGo/Brave/SerpAPI keys with test connection.
- CLI tab: per-binary env keys (e.g., ANTHROPIC_API_KEY) with allowlist.
- Auto-switch on 429/auth failure; resume from checkpoint; usage tracking.

## 6. File Operations (chat-driven)
- Chat can request file reads/writes via tools; confined to workspace by default.
- Out-of-directory access requires explicit user indication (e.g., "access C:\other\file.txt") → confirmation dialog with path preview + risk warning.
- PermissionEngine (deny-by-default) gates all file ops; user approval per action or session.
- Tools: read_file, write_file, list_dir, search_files (all use confinePath + spawnArgv).
- SSRF/path traversal guards enforced in code + tests.

## 7. Plan Integration (parallel multi-provider)
- Chat "Plan" command → Plan AI runs system info check, inspects repo, asks questions, searches web (DuckDuckGo), writes plan.md + progress.md.
- Plan AI spawns Execute AIs for independent chunks; progress reported in progress.<id>.md.
- Conflict-avoidance skill (parallel-execution-guard) enforces file ownership, locks, branches.
- Multi-account auto-switch on free-tier exhaustion.
- Quality over speed; honest evaluation at end.

## 8. Accessibility & Polish (ui-ux-pro-max priorities)
- Contrast 4.5:1, keyboard nav, aria-labels, focus rings, 44px targets, 8px spacing.
- Empty/error states with actions; loading feedback; no layout shift (CLS < 0.1).
- Forms: visible labels, inline validation, errors near field.
- Reduced motion support.

## 9. Implementation Chunks (UI)
U1 Shell & Navigation, U2 Chat Panel, U3 Composer, U4 Key Management, U5 File Access, U6 Plan/Progress Viewer, U7 A11y/Polish.

## 10. Next single action
Implement U2 (Chat panel) + U3 (Composer) first, wired to the existing webview message protocol and Plan AI workflow.