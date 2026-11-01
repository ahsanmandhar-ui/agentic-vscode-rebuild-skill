# Assumptions, sources, and open questions

Everything below is either **verified from a source at the date shown** or **explicitly unresolved**. Nothing
here is invented; where the ecosystem is ambiguous the item stays open rather than being guessed.

## 1. Verified: how Cline loads skills

| Claim | Status | Source |
|---|---|---|
| Project skills live at `<workspace>/.cline/skills/<skill>/SKILL.md`; global at `~/.cline/skills/` (`%USERPROFILE%\.cline\skills\` on Windows) | verified | Cline 3.48 release notes and docs summaries (docs.cline.bot/features/skills) |
| Frontmatter requires `name` and `description`; description drives activation; full text loads on demand (progressive loading) | verified | same |
| Skills must be enabled: Settings → Features → Enable Skills; Skills tab in rules/workflows panel; `/skills` slash command; `use_skill` tool | verified | same |
| Global and project skills can share a name; global takes precedence | verified | same |
| `.clinerules/*` are always-on rules (a different mechanism from skills) | verified | same |

Consequences adopted: the skill lives at `.cline/skills/vibecode-engine-rebuild/` — **not** the proposed
`.clinerules/skills/...` path, which is not a Cline discovery location — and a condensed always-on
`.clinerules/vibecode-engine-rebuild.md` exists as a fallback.

**Not verified here:** behaviour on the user's exact Cline version. The skill's boot step asks the agent to
confirm loading and to state which mechanism it used.

## 2. "Ponytail" — identified, not vendored

- Public identification: an open-source agent skill by `DietrichGebert` (`github.com/DietrichGebert/ponytail`),
  described as MIT-licensed, distributing a **rules file** for Cline (`.clinerules/`) and a plugin for agents
  that support plugin marketplaces. Purpose: steer the agent toward the smallest working change (prefer
  existing code, the standard library, and platform features; question whether a dependency is needed).
- Star and benchmark figures reported in third-party write-ups (e.g. "180k stars", "54% fewer LOC") are
  **not independently verified** and are treated as marketing until measured.
- Status in this skill: **optional third-party quality/decision-making skill**, installable only after the
  user reviews a candidate card (source, pinned commit, license, permissions, risk). Never auto-installed,
  never installed globally, never with install-time hooks.
- If the user means a different "Ponytail" (an internal tool, a model, a product), it is recorded as an
  *unresolved dependency* in `plan.md` and the user is asked. No substitute product is silently chosen.

## 3. OmniRoute — router reference, not a dependency

- Reported: MIT-licensed, self-hosted, OpenAI-compatible gateway exposing many providers behind one local
  endpoint, with fallback/combo routing and quota tracking.
- Adopted as an **architectural reference** only: provider registry, normalized errors, fallback chains,
  capability metadata.
- Not adopted: bundling or redistributing it; relying on proprietary internals; any account-pooling behavior
  whose purpose is to bypass provider limits or billing. If a user wants it, it is configured as a
  user-supplied OpenAI-compatible base URL.
- License claims must be re-verified at a pinned commit before any code is copied — none is copied today.

## 4. Claude Code / Codex — workflow inspiration only

Their public documentation describes plan/act loops, tool-permission prompts, context compaction, and
project instruction files. This skill borrows **concepts** (state machine, approval separation, checkpoints,
context files). No proprietary source is copied, and the skill states explicitly that provider features are
not assumed interchangeable.

## 5. VS Code facts used

| Claim | Status |
|---|---|
| Extension identity is `publisher.name`; changing either creates a different extension | verified (VS Code extension manifest semantics) |
| Local `.vsix` install: Extensions view → "Install from VSIX…", or `code --install-extension <file>` | verified (VS Code docs) |
| `engines.vscode` gates compatibility; raising it drops older editors | verified |
| `SecretStorage` (`context.secrets`) is the supported credential store | verified |
| Marketplace icon should be at least 128×128 PNG | verified |

## 6. Open questions for the user (blocking or scope-affecting)

1. **Where is the extension source repo?** An installed extension copy is not a source tree. Without it,
   Milestone 1 cannot start.
2. **Is the current Marketplace version the baseline** to upgrade from, and can its `.vsix` be downloaded for
   the upgrade test?
3. **First release scope.** Recommendation: Release 1 = stable foundation (fixes, secure storage, context
   files, redesigned UI shell, reliable build). Skill engine and routing follow in later releases.
4. **Which providers** must be supported first (Anthropic / OpenAI / Gemini / local OpenAI-compatible / a
   router URL)? Each adds an adapter plus contract tests.
5. **Ponytail** — the project identified above, or something else?
6. **Distribution** — is Marketplace publishing intended, or is a manually installed `.vsix` enough?
7. **License** for the extension itself (needed before adding `THIRD_PARTY_NOTICES.md`).

## 7. Environment notes for this deliverable

- No VS Code / Cline binary exists in this sandbox → skill activation inside a live session is **unverified**;
  validation here is static (`tools/validate_skill.py`).
- Assets rasterised with Pillow; SVG rendering checked with `cairosvg` and ImageMagick during authoring. The
  shipped assets are deterministic geometry from `design/LOGO_BRIEF.md` §2.
