# SKILL_FORMAT — canonical format, adapters, storage, inspection

## 1. Canonical format (v1)

A skill is a directory with `SKILL.md` (required). YAML frontmatter + Markdown body.

```markdown
---
name: typescript-debugger                 # required, ^[a-z0-9][a-z0-9-]{1,63}$, unique
description: Diagnoses and fixes TypeScript type errors and failing builds. Use when tsc/ts-node reports errors.   # required, ≤ 500 chars, trigger-rich
version: 1.0.0                            # required, semver
license: MIT                              # required, SPDX id (or "LicenseRef-proprietary")
source: https://github.com/acme/skills    # required for non-bundled
source_ref: 9f2c1ab                       # pinned commit/tag for anything downloaded
maintainer: Acme <acme@example.com>       # recommended
requires: [node]                          # capability tokens, not packages
permissions:                              # declared intent — NOT a grant
  fs: [read:workspace]
  exec: false
  network: []
  secrets: false
tags: [typescript, debugging, build]      # ≤ 10
activation: auto                          # auto | manual
precedence: 10                            # higher wins on ties; workspace/user/bundled also ordered
conflicts_with: []                        # skill names
min_vibecode: 1.4.0                       # optional compatibility floor
format_version: 1                         # REQUIRED for anything we store
---

# Purpose
# Activation Conditions
# Workflow        (numbered, deterministic, with stop conditions)
# Permissions     (each declared permission with the justification)
# Validation      (how the agent proves the skill's work succeeded)
# Failure modes   (what to do when a step fails)
# References      (which bundled reference files to read, and when)
```

Schema rules:
- Unknown top-level keys are **rejected** (they could smuggle behavior). Add fields deliberately.
- `description` drives activation — must name *what* + *when*, avoid marketing language.
- Body target ≤ 300 lines; long content goes to `references/*.md` mentioned from the body (progressive
  disclosure, matching how Cline loads skills: metadata first, full text on activation).
- No executable content inline. Scripts live in `scripts/` and run only after an `exec` permission prompt.

## 2. Storage layout

```
<globalStorageUri>/skills/
  <name>/SKILL.md  manifest.json  integrity.json  references/  scripts/  tests/
<globalStorageUri>/skill-state.json          # enabled/disabled/quarantine/approval records
<workspace>/.vibecode/skills/<name>/...      # committed, team-shared, trusted-workspace only
<workspace>/.vibecode/config.json            # workspace overrides, allowlist of sources
<extension>/skills/                          # bundled, read-only, shipped in the VSIX
```

`manifest.json` (written by the extension, not the skill author):
```json
{ "name":"typescript-debugger","version":"1.0.0","license":"MIT","source":"https://…","sourceRef":"9f2c1ab",
  "installedAt":"2026-10-31T…Z","installedBy":"user","sha256":"…","files":[{"path":"SKILL.md","sha256":"…"}],
  "validation":{"status":"passed","rules":[],"riskScore":0.12,"inspectedAt":"…"},
  "approval":{"by":"user","at":"…","scopesShown":["fs:read:workspace"]},
  "state":"enabled" }
```

`integrity.json`: `{ "algorithm":"sha256", "root": "…" }` over a deterministic file list (sorted paths,
path + sha256 + mode). Checksums detect drift only — they are **not** authenticity. Authenticity, when
available, comes from a pinned commit + verified signature/release asset; label it as such or say
`unverified`.

Safety on write: reject `..`, absolute paths, and names colliding after Unicode normalization; write to a
temp dir then rename into place; refuse to overwrite a bundled skill; refuse to follow symlinks out of the
store; `chmod` scripts non-executable until approved.

## 3. Lifecycle states

`discovered → inspected → pending_approval → installed → enabled|disabled → quarantined|failed`

Transitions requiring user action: `pending_approval→installed`, `disabled→enabled` (if it declares exec
or network), `quarantined→enabled` (explicit re-review with the diff that triggered quarantine).

## 4. Format adapters

External formats are **not** interchangeable. Support via explicit adapters, each with a documented loss
report:

| Source | Reality | Adapter behavior |
|---|---|---|
| Cline skill (`~/.cline/skills/<name>/SKILL.md`, project `.cline/skills/…`) | YAML `name`+`description`, optional `docs/`, `scripts/` | import as v1; drop unknown keys with a printed warning list |
| Claude Code skill / plugin marketplace | different distribution + hook semantics | import body + description only; **ignore hooks/commands unless reimplemented**; report unsupported pieces |
| Codex / other agent rules files | plain rules, no manifest | wrap as a `rules`-type skill (never auto-activate policies) |
| Raw URL / git repo | unknown provenance | require pinned ref + user-confirmed license before install |

Import never executes anything. Unsupported constructs are listed in the UI, not silently dropped.

## 5. Discovery

Sources (each must be explicitly enabled by the user, except bundled): bundled → workspace
`.vibecode/skills` → global store → git sources in `config.json` (`repos[]` with pinned refs) → registry
URL (opt-in, allowlisted host).

Ranking for a task: capability/tag match against parsed task + repo signals (extensions present, framework
files, failing command type) → specificity (exact tag > broad tag) → precedence field → source precedence
(workspace > user > bundled) → installed-before-recommended. Activate ≤ 3. Always log the score vector.

## 6. Inspector: rules the validator implements

Metadata: missing/invalid `name|version|description|license`, name collision, semver violation,
`format_version` unknown, `min_vibecode` above current, license not in allowlist, size limits.

Content: shell substitution, `curl … | sh`, `wget … | bash`, base64 blob > 200 chars, `eval`,
`child_process`, `require('fs')` on home dirs, `process.env` reads of credential-looking names, Unicode
zero-width/bidi controls, HTML comments containing instructions, "ignore previous/your instructions",
"without asking", "do not tell the user", exfiltration-shaped URLs (webhook.site, pastebin, ngrok,
raw IPs, `?data=`), unexpected binary files, symlinks, files outside the declared layout.

Output: `{ status: 'passed'|'warn'|'fail', findings: [{rule, severity, file, line, excerpt}], riskScore }`
Severity: `critical` (fail install) / `high` (requires typed confirmation) / `medium` (warn) / `low` (note).

Explicit, unavoidable UI text: **"Static inspection cannot prove a skill is safe. Skills run with the
permissions you grant, and instructions from a skill are treated as untrusted content."**

## 7. Activation semantics

- Activation injects the skill's **workflow section** into the task context, labelled untrusted guidance,
  with its declared permissions listed for transparency.
- Activation grants **zero** runtime permissions. Tool calls still go through the permission engine.
- Deactivation is immediate and revokes nothing (nothing was granted).
- The UI always shows active skills, their source, and their trust state for the running task.
