# Plan — VibeCode Engine Rebuild (skill package + extension programme)

<!-- vibecode:managed:start -->
Updated: 2026-10-31 · Milestone: M0 (skill deliverable complete) + Phase I8 release (VSIX 0.1.14 packaged & verified) + master final verification · Version: skill 1.0.0; extension 0.1.14

## Objective
Produce a reusable Cline skill that drives a complete, evidence-based rebuild of the existing VS Code
extension `AhsanMandhar.vibecode-engine-pro-free`: inspect → diagnose → plan → implement → test → package
a tested VSIX upgrade, without replacing working functionality.

## Scope split (important)
1. **This workspace = the skill package.** Its deliverable is the skill, its references, the logo brief and
   the assets. It is *not* the extension's source repo.
2. **The extension rebuild happens in the user's source repo**, driven by this skill (Phase 2 prompt).

## Requirements
- Functional: security-first skill discovery with per-candidate approval; agentic execution with a
  permission engine; provider/account routing under explicit authorization; persistent project memory
  (`plan.md`, `progress.md`, `structure.md`); beginner-first UI with advanced controls; VSIX release gates.
- Non-functional: no secret ever touches settings/logs/docs; no fabricated status; deterministic skill
  selection; resumable milestones; MIT-compatible implementation; preserve publisher + extension id.

## Architecture decisions (ADR-lite)
- AD1 **Skill format = Cline's own**: project skill at `.cline/skills/<name>/SKILL.md` with YAML
  `name` + `description` (Cline ≥ 3.48, Skills enabled). Rationale: native discovery, lazy loading, no
  custom loader. Rejected: `.clinerules/skills/` (not a Cline location) — kept `.clinerules/` only as an
  always-on fallback rule file.
- AD2 **Progressive disclosure**: SKILL.md stays operational (≤ ~350 lines); depth lives in
  `references/*.md` loaded per milestone. Rationale: context economy.
- AD3 **Evidence labels** (`RECOMMENDATION / APPROVED / ATTEMPTED / VERIFIED`) instead of free-form status.
- AD4 **Logo = hand-authored deterministic SVG** (hex + chevron + node), rasterised by
  `tools/make_assets.py`; no model-generated raster in the shipped asset.
- AD5 **Validation is scriptable**: `tools/validate_skill.py` gates the package (structure, frontmatter,
  links, placeholders, assets, secret patterns).
- AD6 Extension internals: ports-and-adapters so `security/skills/routing/agent` core has no `vscode`
  imports (`references/ARCHITECTURE.md` §1).

## Milestones
| # | Milestone | Status | Evidence |
|---|---|---|---|
| S1 | Research host mechanism (Cline skills) + referenced projects (Ponytail, OmniRoute) | done | sources cited in `docs/ASSUMPTIONS.md` |
| S2 | Write SKILL.md (workflow, gates, refusals) | done | `.cline/skills/vibecode-engine-rebuild/SKILL.md` |
| S3 | Write 9 reference documents | done | `references/*.md` |
| S4 | Fallback `.clinerules` rule | done | `.clinerules/vibecode-engine-rebuild.md` |
| S5 | Logo brief + assets | done | `design/LOGO_BRIEF.md`, `media/logo/*`, `design/preview.png` |
| S6 | Package validator + run | done | `tools/validate_skill.py` output in `progress.md` |
| E1 | Extension: recon + baseline | not started | requires the user's source repo |
| E2…E11 | Extension rebuild milestones M1–M11 | not started | see skill §3 |
| PA | Phase A — tooling (@types/vscode, @vscode/test-electron, tsconfig, scripts) | complete | task_0019: compile exit 0, 28 tests pass, smoke exit 0 (ATTEMPTED→verified in source repo 2026-10-31) |
| PB | Phase B — webview contract fixes | complete | tsc --noEmit exit 0 (2026-10-31) |
| PC | Phase C — tests (tsc, vitest/node test, SecretStorage round-trip, webview render) | partial | tsc exit 0; 28/28 node tests pass; render.test.ts covers 3 panels (agent/skills/onboarding) + getWebviewHtml; SecretStorage round-trip not exercised |
| PD | Phase D — provider smoke tests | partial | no live keys present; Brave/SerpAPI expected "key required"; DDG/capability refresh not re-run this cycle |
| PE | Phase E — package & verify VSIX | complete (package) | dist/vibecode-engine-pro-free-0.1.14.vsix: 210 files, 413 KB, archive verified (210 entries); install/upgrade in isolated profile previously exercised (vscode-phaseE-*) |
| PF | Phase F — docs checkpoints + final honest evaluation | complete | task_0049 (this) |

## Current priorities
1. Phases B–E remain to be executed in the extension source repo (`vibecode-engine-source`).
2. Reconcile webview contract (task_0020) before compile can be trusted.
3. Keep evidence labels honest: generated/reported results are ATTEMPTED until independently verified.

## Dependencies
- Runtime: Cline ≥ 3.48 with Features → Skills enabled (or the `.clinerules` fallback).
- Extension build: VS Code, Node (version per repo), `@vscode/vsce`, TypeScript toolchain from the repo.
- Optional external skills: none required. Ponytail (MIT, third-party) optional only.

## Acceptance criteria (skill package)
- Skill present at a Cline-supported path with valid frontmatter.
- All 17 required topics covered; 6 required references present and substantive.
- Validator: 0 failures. No placeholders, no secrets, links resolve.
- Logo assets valid and integrated per `design/LOGO_BRIEF.md`.

## Risks
- Cline skill discovery differs by version → fallback rules file + verification step in SKILL.md §2.
- "Ponytail" ambiguity → recorded as an open assumption, never guessed.
- Provider APIs/pricing drift → capability claims must carry source + date; `unknown` when unverified.
- Extension repo may be private/nonexistent → recon cannot start; user must point to it.
- Phase A result is reported by an agent, not independently re-run in this workspace; treat as ATTEMPTED until verified.

## Pending decisions (owner: user)
- Confirm "Ponytail" identity (`DietrichGebert/ponytail`, MIT rules file) vs something else.
- Confirm the extension source repo is available and is the right baseline (vs only the installed copy).
- Confirm whether the previous published `.vsix` can be obtained for the upgrade test.
- Confirm scope of the first release (recommended: Release 1 = foundation only).
<!-- vibecode:managed:end -->

