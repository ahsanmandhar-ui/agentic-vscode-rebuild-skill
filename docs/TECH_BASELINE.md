# TECH_BASELINE.md — Phase 1 INSPECT (Cline extension)

Evidence labels: RECOMMENDATION / APPROVED / ATTEMPTED / VERIFIED. This document is ATTEMPTED (static inspection only; no runtime execution).

## Candidate card

- **Name / display**: Cline (VS Code extension "claude-dev")
- **Source**: Local installed VSIX copy at `C:\Users\Ahsan543\.vscode\extensions\saoudrizwan.claude-dev-4.1.26`; upstream `https://github.com/cline/cline` (package.json `repository.url`); marketplace id `saoudrizwan.claude-dev`. Inspected version **4.1.26**.
- **License**: Apache-2.0 (package.json `license: "Apache-2.0"`; `LICENSE.txt` Apache 2.0, copyright "2026 Cline Bot Inc."; readme badge "[Apache 2.0 © 2026 Cline Bot Inc.]"). Redistributable under Apache-2.0 terms (retain license/NOTICE, state changes); trademarks not granted (Apache §6). **Redistributable: YES-with-conditions** (license text present; NOTICE file not observed in installed copy — verify at pinned commit).
- **Publisher**: `saoudrizwan` (Cline Bot Inc.). ExtensionKind: `workspace`; target platform `undefined`; size 59,240,696 bytes (`__metadata.size`).
- **Pricing / free**: Free (`Microsoft.VisualStudio.Services.Content.Pricing: Free` in `.vsixmanifest`; VS Marketplace gallery).
- **Permissions / capabilities** (from `package.json` contributes + manifest):
  - Activation: `onLanguage`, `onUri`, `onStartupFinished` (broad, always-on after startup).
  - `ExecutesCode: true` (runs code).
  - Views: activity-bar webview `claude-dev.SidebarProvider` (workspace-scoped UI).
  - Commands (19): `cline.plusButtonClicked`, `cline.mcpButtonClicked`, `cline.marketplaceButtonClicked`, `cline.historyButtonClicked`, `cline.accountButtonClicked`, `cline.settingsButtonClicked`, `cline.dev.createTestTasks`, `cline.dev.expireMcpOAuthTokens`, `cline.addToChat`, `cline.addTerminalOutputToChat`, `cline.focusChatInput`, `cline.generateGitCommitMessage`, `cline.abortGitCommitMessage`, `cline.explainCode`, `cline.improveCode`, `cline.jupyterGenerateCell`, `cline.jupyterExplainCell`, `cline.jupyterImproveCell`, `cline.openWalkthrough`.
  - Keybindings, menus (editor/terminal/scm/notebook contexts), walkthroughs.
  - Configuration: `contributes.configuration` present but properties empty in this build (title only "Cline"); settings likely managed via webview/state, not VS Code settings schema. **Unknown** exact settings keys from manifest (verify in source).
  - Capabilities implied by README: file read/write/edit, terminal command execution (with approval), browser automation (headless), MCP server integration, git commit message generation, Jupyter cell ops, checkpoint/restore, API provider routing, telemetry (OpenTelemetry deps), analytics (posthog-node), machine-id usage.
- **Risk**: **HIGH**. Autonomous coding agent with file system + terminal + browser + MCP tool execution; broad activation; large dependency surface (89 runtime deps incl. puppeteer, better-sqlite3, simple-git, execa, axios); bundled 25.8 MB extension.js + 23 MB plugin-runtime; telemetry/analytics and machine-id code present in bundle. Requires permission gates, SSRF/path confinement, secret storage, and redaction (see SECURITY phase).
- **Free**: Yes.
- **Redistributable**: Yes-with-conditions (Apache-2.0; preserve license; check NOTICE/trademarks at pinned commit).
## Identity & entry points

- Manifest: `package.json` (name `claude-dev`, displayName `Cline`, version `4.1.26`, engines.vscode `^1.101.0`, author "Cline Bot Inc.", homepage cline.bot, repository https://github.com/cline/cline).
- VS Code manifest: `.vsixmanifest` (Identity Id `claude-dev`, Version `4.1.26`, Publisher `saoudrizwan`, `ExecutesCode true`, `ExtensionKind workspace`, pricing Free, source/GitHub/support links).
- Main entry: `./dist/extension.js` (25,798,083 bytes, esbuild bundle).
- Additional runtime: `dist/plugin-runtime/` (108 files, 23,063,058 bytes) + `plugin-sandbox-bootstrap.js`; `webview-ui/build` (UI assets) referenced by extension.
- Assets: `assets/icons/icon.png`, `assets/icons/cline-bot.woff`; walkthrough markdowns under `walkthrough/`.
- Skills lock: `skills-lock.json` pins `cline-sdk` from `cline/sdk-skill` (GitHub) with computed hash.

## Features (from README + manifest)

- Autonomous coding agent in IDE: file create/edit, terminal commands (with permission), browser automation, MCP tools.
- Context management: AST/regex search, file/folder ingestion, `@url`/`@problems`/`@file`/`@folder` context.
- Model/provider routing: OpenRouter, Anthropic, OpenAI, Gemini, AWS Bedrock, Azure, GCP Vertex, Cerebras, Groq, OpenAI-compatible, LM Studio/Ollama.
- MCP: create/install custom tools; OAuth token handling (dev command).
- Checkpoints: workspace snapshot, compare/restore.
- Git integration: generate commit messages.
- Jupyter: generate/explain/improve cells.
- Walkthrough onboarding; enterprise features advertised (SSO, audit, VPC).

## APIs / external services

- LLM providers listed above; telemetry via OpenTelemetry exporters; analytics posthog-node; machine-id; ripgrep download script; puppeteer/chromium for browser; simple-git; better-sqlite3 (local state); axios/undici HTTP.

## Config

- `contributes.configuration` present but `properties` empty in this installed build (title "Cline"). Exact settings keys: **unknown** from manifest; likely stored via webview/globalState/SecretStorage. Verify in source repo.

## Agent / MCP / plugin support

- MCP: yes (commands + dev OAuth expiry command; README MCP section).
- Agent capabilities: yes (core product).
- Plugin runtime: `dist/plugin-runtime` present (plugin sandbox bootstrap).

## Inspection notes / unknowns

- Pinned commit not available from installed copy; license verification at commit deferred to Phase 2 (SECURITY).
- No install/postinstall scripts in manifest `scripts` (build/dev only); however `download-ripgrep` script and bundled native deps warrant Phase 2 binary audit.
- Configuration properties empty in manifest; settings schema **unknown**.
- Telemetry/analytics endpoints and machine-id usage **unknown** until source audit (Phase 2/3).
- This is an installed (not source) copy; treat all findings as ATTEMPTED, not VERIFIED.

## Phase 1 completion

- Output produced: `docs/TECH_BASELINE.md` (this file).
- Next: Phase 2 SECURITY REVIEW (license at pinned commit, secret scan, install scripts, SSRF/network audit, permission scope).
