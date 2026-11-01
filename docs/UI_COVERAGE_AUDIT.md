# UI Coverage Audit

## Feature → UI surface

| Feature | UI surface | Status |
|---|---|---|
| Chat | src/ui/chat-panel.ts renderChatPanel | ✅ Implemented |
| Logo/branding | Activity bar SVG + theme tokens | ✅ Implemented (media) |
| API key paste (providers) | src/ui/router-panel.ts + search-panel.ts | ✅ Implemented |
| API key paste (multi-CLI) | src/ui/cli-panel.ts env selector | ✅ Implemented |
| Sidebar one-click invoke | Command palette + Run button + context menu | ✅ Implemented (commands) |
| File access (inside dir) | Chat tools (read/write/list/search) | ✅ Implemented (tools) |
| File access (outside dir) | Confirmation dialog + PermissionEngine | ✅ Implemented |
| Plan/progress viewer | src/ui (planned U4) | ⚠️ Partial (renderers exist, viewer not wired) |
| Conflict skill | parallel-execution-guard (skill) | ✅ Implemented (skill) |
| Multi-account auto-switch | src/ui/router-panel.ts account pool | ✅ Implemented |
| Search providers | src/ui/search-panel.ts | ✅ Implemented |
| Routers | src/ui/router-panel.ts | ✅ Implemented |
| CLI runner | src/ui/cli-panel.ts | ✅ Implemented |
| Settings/onboarding | src/ui/settings.ts + onboarding | ✅ Implemented |
| A11y (contrast, keyboard, aria, focus) | a11y.ts + panels | ✅ Implemented |
| CSP nonce | webview.ts crypto.randomUUID | ✅ Implemented |
| Reduced motion | CSS prefers-reduced-motion | ✅ Implemented |
| Empty/error states | failure.ts EMPTY_STATES | ✅ Implemented |

## Gaps
- Plan/progress viewer not wired to webview (U4 partial).
- Real host render test (webview.test.ts covers HTML/CSP only).
- Brave/SerpAPI keys not set in env (user action).

## Recommendation
- Wire U4 plan/progress viewer into webview (next).
- Set BRAVE_API_KEY/SERPAPI_API_KEY for live smoke.