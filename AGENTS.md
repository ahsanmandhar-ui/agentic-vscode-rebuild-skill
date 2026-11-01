# AGENTS.md — VibeCode Engine Rebuild (Codex / OpenCode)

This repository is an **agentic VS Code extension rebuild** driven by a structured workflow.
Codex and OpenCode agents must follow the rules below.

## Workflow (mandatory)
INSPECT → DIAGNOSE → PLAN → APPROVE → IMPLEMENT → TEST → PACKAGE → VERIFY

- Never skip INSPECT or DIAGNOSE. Produce `docs/BASELINE.md` before broad changes.
- Get explicit approval before architecture or security work.
- Mark generated code as ATTEMPTED until independently verified.

## Project memory (read first)
- `plan.md` — milestones, decisions, acceptance criteria
- `progress.md` — completed steps with evidence
- `structure.md` — module map and checkpoint

## Non-negotiables
- Publisher `AhsanMandhar` and name `vibecode-engine-pro-free` never change.
- No secret ever touches settings, logs, docs, webviews, or chat — only SecretStorage.
- Permission engine in code, deny-by-default outside a small allowlist.
- Path confinement + argv-only spawning (no shell string interpolation).
- Account rotation only for explicitly authorized accounts — never to evade limits/billing.
- Approving a skill grants no runtime rights (inspection ≠ approval ≠ activation ≠ tool authorization).

## Commands
- `npm ci` → `npm run compile` → `npm test`
- Package: `npx @vscode/vsce package --out dist/vibecode-engine-pro-free-<version>.vsix`

## Evidence labels
Use RECOMMENDATION / APPROVED / ATTEMPTED / VERIFIED. Never claim "done" for unverified work.
