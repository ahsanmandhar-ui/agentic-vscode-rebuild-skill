# SECURITY_REVIEW.md — Phase 2 (Cline extension)

Evidence labels: RECOMMENDATION / APPROVED / ATTEMPTED / VERIFIED. This document is ATTEMPTED (static inspection of installed copy + upstream commit; no runtime execution). Target: Cline VS Code extension `saoudrizwan.claude-dev` v4.1.26, installed at `C:\Users\Ahsan543\.vscode\extensions\saoudrizwan.claude-dev-4.1.26`. Review is read-only; no vendoring.

## 1. License verification at pinned commit

- **Pinned commit**: upstream tag `v4.1.26`, commit `a459f1d` (released 2026-10-26), repo `https://github.com/cline/cline`. Source: GitHub releases/tags page.
- **License at commit**: `apps/vscode/package.json` -> `"license": "Apache-2.0"`; root `LICENSE` -> Apache License 2.0, copyright `Copyright 2026 Cline Bot Inc.` (boilerplate in APPENDIX). Confirmed via raw fetch at `a459f1d`.
- **NOTICE file**: not present at root nor `apps/vscode/` (HTTP 404 both). Apache-2.0 section 4(d) requires retaining NOTICE if present; none exists, so nothing to carry. Trademarks not granted (section 6) — product name "Cline" and Cline Bot Inc. marks must not be used to imply endorsement.
- **Installed copy check**: `LICENSE.txt` in installed extension matches upstream Apache-2.0 text (head verified). `package.json` license field `Apache-2.0`, publisher `saoudrizwan`, version 4.1.26 — matches pinned commit metadata.
- **Verdict (license)**: VERIFIED-present / ATTEMPTED-match. Redistributable: YES-with-conditions (retain license text; state changes; no trademark use; no NOTICE file to propagate).

## 2. Secret scan (repo + history)

- **Scope**: installed extension tree (145 files). All `*.js`, `*.json`, `*.ts`, `*.mjs` scanned (117 files) for patterns: `sk-…`, `AKIA…`, `ghp_…`, `xox[baprs]-…`, `AIza…`, PEM private-key headers.
- **Result**: 15 raw regex hits, all false positives:
  - 14 hits = PEM header string literals (`-----BEGIN RSA/PRIVATE/OPENSSH PRIVATE KEY`) inside bundled crypto libraries (node-forge-style ASN.1/key parsers) in `dist/extension.js` and `dist/plugin-runtime/node_modules/@cline/core/...`.
  - 1 hit = base64 blob containing the substring `AKIA…` (not a credential; part of encoded data).
- **No hardcoded API keys, tokens, passwords, or private keys found.** Credentials are expected to be entered by the user at runtime and stored via VS Code SecretStorage (per Cline's design); none shipped.
- **History**: not available in installed copy (no `.git`). Upstream history not cloned; cannot scan commits. Noted as limitation. Recommend scanning upstream with gitleaks/trufflehog if vendoring were ever considered (it is not).
- **Verdict (secrets)**: PASS (no secrets found; all hits explained as library constants).

## 3. Install scripts / postinstall hooks / binary downloads

- **package.json scripts**: no `install`, `postinstall`, `preinstall`, or `prepare` hooks in the shipped `apps/vscode/package.json`. Scripts present are build/dev/test only (`vscode:prepublish`, `compile`, `package`, `download-ripgrep`, `postprotos`, `postcompile-standalone`). None run on end-user install.
- **.vsixmanifest**: no `<Dependencies>` or install-time hooks; `ExecutesCode: true` (declared, expected for an agent).
- **Binary downloads**:
  - `download-ripgrep` script is a build-time script (not shipped in VSIX; absent from installed tree). Ripgrep binary is bundled, not fetched at runtime.
  - `puppeteer-chromium-resolver` / `puppeteer-core` are runtime deps and may fetch a Chromium build on first browser use (network + binary). This is a runtime download risk (supply-chain/availability) but not an install hook.
  - Native modules: `better-sqlite3`, `grpc-tools` (listed in monorepo `trustedDependencies`) ship prebuilt binaries; loaded at runtime.
- **Verdict (install/binary)**: PASS for install-time (no hooks). Runtime binary fetch (Chromium via puppeteer) is a residual risk to document; recommend disabling browser tool or pinning Chromium in any adaptation.
## 4. SSRF / network audit

- **Network surface**: very large. Bundle contains hundreds of provider base URLs (OpenAI-compatible gateways, Anthropic, OpenAI, Gemini/Vertex, Bedrock, Azure, Cerebras, Groq, etc.), telemetry (OpenTelemetry OTLP exporters), analytics (posthog-node), machine-id, and MCP endpoints. Representative samples captured in scan (234 interesting URLs).
- **Telemetry/analytics**: OpenTelemetry exporters (grpc/http/proto) and posthog-node present; machine-id (`node-machine-id`) used. Endpoints and opt-out behavior are **unknown** from the bundle without source audit (Phase 3).
- **SSRF exposure**: Cline supports `@url` context ingestion, browser automation, and MCP servers, all of which can be pointed at arbitrary URLs. No evidence of SSRF hardening (allowlists, DNS rebinding protection, private-IP blocking) observed in the minified bundle, but the bundle is opaque; treat as **unknown/unverified**. This is the primary network risk.
- **Permission scope for network**: extension declares `ExecutesCode: true`; runs in workspace extension host with full Node network access. No VS Code-level network restriction.
- **Verdict (SSRF/network)**: CONDITIONAL — no malicious endpoints found, but broad and unaudited network surface; SSRF controls not verifiable from installed copy. Treat as HIGH risk; required controls listed below.

## 5. Permission scope (read/write/exec/network)

- **Activation**: `onLanguage`, `onUri`, `onStartupFinished` — always-on after startup (broad).
- **Execution**: `ExecutesCode: true`; terminal command execution, file read/write/edit, browser automation, MCP tool invocation — all gated by user approval in product design, but the capability surface is large.
- **Filesystem**: workspace-scoped extension kind, but agent can operate across the workspace and (via commands) potentially beyond; path confinement not verifiable from bundle.
- **Secrets**: expected to use VS Code SecretStorage for provider keys (not shipped). Redaction of secrets in logs/telemetry: unknown.
- **Verdict (permissions)**: HIGH capability scope; acceptable for a coding agent product but requires user-approval gates and path/network confinement in any adaptation.

## 6. Overall verdict

**VERDICT: PASS (conditional) — skill-only adaptation allowed; NO VENDORIZING.**

Rationale:
- License verified at pinned commit `a459f1d` (Apache-2.0, (c) 2026 Cline Bot Inc.); redistributable with conditions; no NOTICE file.
- No hardcoded secrets (all regex hits are library constants).
- No install-time hooks; no runtime binary fetch except optional Chromium via puppeteer.
- Broad but legitimate network/permission surface; SSRF and telemetry controls not verifiable from installed copy (opaque bundle).

Blocking conditions for any future vendoring (not performed here): re-verify license + NOTICE at pinned commit, run gitleaks on upstream history, audit SSRF/path confinement in source, confirm telemetry opt-out. None of these are required for skill-only adaptation, which does not copy code.

## 7. Required controls (for any adaptation / wrapper)

1. No code vendoring without license re-verification at a pinned commit (done here: a459f1d, Apache-2.0).
2. Treat Cline as an external, high-risk agent: never auto-invoke; require explicit user approval for file writes, terminal commands, browser, MCP.
3. Confining paths: workspace-root confinement; reject path traversal and absolute paths outside workspace.
4. SSRF guard: allowlist/block private, loopback, link-local, and metadata IPs; validate redirects; pin DNS.
5. Secret handling: store keys in SecretStorage only; mask in logs/UI; never commit.
6. Telemetry: document endpoints and provide opt-out; no machine-id collection without consent in any wrapper.
7. Binary/runtime downloads (Chromium): disable or pin; verify integrity if enabled.
8. Evidence honesty: all findings here are ATTEMPTED (static inspection of an opaque bundle); runtime behavior unverified.

## 8. Limitations / unverified

- No `.git` in installed copy -> no history scan; upstream not cloned.
- Bundle is minified/esbuilt -> SSRF/path/telemetry controls cannot be confirmed; source audit needed (Phase 3).
- Chromium download behavior not executed.
- Telemetry endpoints and opt-out not confirmed.
- This review covers installed v4.1.26 only; other versions not assessed.

