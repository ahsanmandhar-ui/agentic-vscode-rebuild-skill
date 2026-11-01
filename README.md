# 🚀 VibeCode Engine Pro (Free)

<p align="center">
  <img src="media/logo/icon-128.png" alt="VibeCode logo" width="128" />
</p>

<p align="center">
  <strong>A beginner-friendly, security-first agentic coding extension for VS Code.</strong><br />
  Inspect · Plan · Implement · Test · Package — with persistent project memory and a secure skill engine.
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=AhsanMandhar.vibecode-engine-pro-free">
    <img alt="Version" src="https://img.shields.io/visual-studio-marketplace/v/AhsanMandhar.vibecode-engine-pro-free?label=version&color=blue" />
  </a>
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/license-MIT-green" /></a>
  <img alt="VS Code" src="https://img.shields.io/badge/VS%20Code-%5E1.85.0-007ACC?logo=visualstudiocode" />
  <img alt="Node" src="https://img.shields.io/badge/node-%3E%3D18-339933?logo=node.js" />
  <img alt="Tests" src="https://img.shields.io/badge/tests-133%2B%20passing-brightgreen" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript" />
</p>

---

## ✨ What is VibeCode Engine?

**VibeCode Engine Pro (Free)** is a VS Code extension that brings an agentic coding
workflow directly into your editor. Instead of a chat box that forgets everything,
VibeCode keeps a living project memory (`plan.md`, `progress.md`, `structure.md`),
runs a disciplined **INSPECT → DIAGNOSE → PLAN → APPROVE → IMPLEMENT → TEST → PACKAGE → VERIFY**
loop, and ships with a secure **skill-management engine** that lets you install,
inspect, approve, and activate reusable AI skills — without ever leaking secrets.

It is built for **beginners first**: plain-language UI, guided onboarding, and
advanced controls tucked behind an opt-in panel.

---

## 🧩 Feature Grid

| Area | Highlights |
|---|---|
| 🧠 **Agentic loop** | Plan/act cycles with persistent project context files that survive across sessions |
| 🛡️ **Security-first** | SecretStorage-only credentials, deny-by-default permissions, path confinement, argv-only spawning |
| 🧰 **Skill engine** | Discover → validate → inspect → approve → install → enable → select → activate (each step separate) |
| 🔌 **Provider routing** | Anthropic / OpenAI / Gemini / local OpenAI-compatible + optional router URL, with fallback chains |
| 🔄 **Account switching** | Explicit per-account authorization, reason-specific recovery, checkpoints before every switch |
| 📂 **Project chat** | Workspace-aware chat with file scanner and feature combiner |
| 🧪 **Tested** | TypeScript strict, Vitest suite (133+ passing), host-smoke + provider-smoke tests |
| 📦 **VSIX release** | Reproducible packaging via `@vscode/vsce`, isolated-profile install verified |

---

## 📥 Installation

### From a `.vsix` (recommended)

```bash
code --install-extension dist/vibecode-engine-pro-free-<version>.vsix
```

Or in VS Code: **Extensions view → `…` → Install from VSIX…**

### From source

```bash
git clone https://github.com/<your-org>/vibecode-engine-pro-free.git
cd vibecode-engine-pro-free
npm ci
npm run compile
```

Then press **F5** to launch the Extension Development Host.

---

## ⚡ Quick Start

1. Open a workspace folder in VS Code.
2. Run **VibeCode: Open Chat** from the Command Palette (`Ctrl/Cmd+Shift+P`).
3. The extension creates `plan.md`, `progress.md`, and `structure.md` in your workspace.
4. Ask it to plan a change — it will inspect, propose, and wait for your approval before editing.

Commands contributed:

| Command | Title |
|---|---|
| `vibecode.chat` | VibeCode: Open Chat |
| `vibecode.plan` | VibeCode: Plan |
| `vibecode.supervisor.status` | VibeCode: Supervisor Status |
| `vibecode.supervisor.pause` | VibeCode: Pause Supervisor |
| `vibecode.project.chat` | VibeCode: Project Chat |
| `vibecode.files.scan` | VibeCode: Scan Files |
## ⚙️ Configuration

Settings (under **VibeCode**):

| Key | Type | Default | Description |
|---|---|---|---|
| `vibecode.mcp.serverCommand` | string | `""` | MCP server command to auto-connect at activation (e.g. `npx`) |
| `vibecode.mcp.serverArgs` | string | `""` | Space-separated arguments for the MCP server command |
| `vibecode.dataClassification` | enum | `internal` | Data classification label: `public` / `internal` / `confidential` / `restricted` |

Credentials are stored **only** in VS Code `SecretStorage` — never in settings, logs, or webviews.

---

## 🏗️ Architecture (at a glance)

```
src/
├── extension.ts            # activation, command registration
├── webview.ts              # panel renderer
├── agent/                  # agent loop, chat, tools, terminal, MCP tools
├── providers/              # adapters, router, accounts, capabilities, fallback
├── routing/                # request routing
├── context/                # indexer + semantic indexer + watcher
├── memory/                 # project memory manager
├── checkpoint/             # checkpoints before risky actions
├── observability/          # audit log + crash reporter
├── perf/                   # budget + prompt cache
└── tests/                  # vitest suites
```

Core has **no `vscode` imports** in `security/`, `skills/`, `routing/`, `agent/` — ports-and-adapters so
the logic is testable without the editor host.

---

## 🧪 Development

```bash
npm ci
npm run compile          # tsc --noEmit (strict)
npm test                 # vitest
```

Lint / type-check before committing:

```bash
npx tsc -p ./tsconfig.build.json
```

### Packaging a VSIX

```bash
npx @vscode/vsce package --out dist/vibecode-engine-pro-free-<version>.vsix
```

Verify the archive and install into an isolated profile:

```bash
code --user-data-dir /tmp/vscode-profile --extensions-dir /tmp/vscode-exts \
     --install-extension dist/vibecode-engine-pro-free-<version>.vsix
```

---

## 🛡️ Security Guarantees

- **No secret ever touches** settings, logs, docs, webviews, or chat — only `SecretStorage`.
- **Permission engine in code**, not in prose: deny-by-default outside a small allowlist.
- **Path confinement** + **argv-only spawning** (no shell string interpolation).
- **Prompt-injection resistance** for skill content and web results.
- **Account rotation only** for explicitly authorized accounts — never to evade limits/billing.
- Every security control has a **regression test**; generated code is never marked "verified".

---

## 📚 Documentation

| File | Purpose |
|---|---|
| `plan.md` | Milestones, decisions, acceptance criteria |
| `progress.md` | Completed steps with evidence |
| `structure.md` | Module map + checkpoint |
| `docs/ASSUMPTIONS.md` | Verified claims + open questions |
| `docs/HONEST_EVALUATION.md` | Verified vs. unverified, risks, next actions |
| `.cline/skills/vibecode-engine-rebuild/SKILL.md` | The reusable Cline skill driving the rebuild |
| `design/LOGO_BRIEF.md` | Brand geometry + asset checklist |

---

## 🤝 Contributing

1. Fork and create a feature branch.
2. Keep changes **small and focused** (prefer existing code, standard library, platform features).
3. Run `npm run compile && npm test` — both must pass.
4. Update `plan.md` / `progress.md` / `structure.md` for non-trivial changes.
5. Open a PR with a clear description and evidence (test output).

Please do not commit build artifacts (`out/`, `dist/`, `node_modules/`) — see `.gitignore`.

---

## 📄 License

MIT for this skill package and extension source. Third-party skills (e.g. Ponytail) keep their own
licenses and are never redistributed here. See `LICENSE` and `THIRD_PARTY_NOTICES.md`.

---

<p align="center">
  Built with care · <a href="https://github.com/AhsanMandhar">AhsanMandhar</a>
</p>

