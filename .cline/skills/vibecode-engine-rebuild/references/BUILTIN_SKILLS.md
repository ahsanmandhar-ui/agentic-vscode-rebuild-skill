# BUILTIN_SKILLS — the 14 skills the extension ships (specs, not placeholders)

Ship these as bundled skills in `<extension>/skills/<name>/SKILL.md` using
`references/SKILL_FORMAT.md`. They are **instruction bundles only** — every one of them runs inside the
permission engine, and none of them may grant permissions. Keep each ≤ 120 lines; push detail into a
`references/` file inside the skill.

| # | name | description (drives activation) | needs | risk |
|---|---|---|---|---|
| 1 | `security-permission-inspector` | Audits a proposed action, skill, or dependency for security impact and explains it in plain language before approval. | read, network:docs | low |
| 2 | `skill-inspector-validator` | Validates a candidate skill's metadata and scans its content for dangerous patterns before installation. | read | low |
| 3 | `task-planner` | Decomposes a user request into verifiable steps with acceptance criteria and a checkpoint plan. | read | low |
| 4 | `context-recovery` | Rebuilds working state from plan.md/progress.md/structure.md, git state, and open errors after an interruption or provider switch. | read, git | low |
| 5 | `structure-analyzer` | Maps the repository layout, entry points, and build/test commands into structure.md. | read | low |
| 6 | `codebase-explorer` | Answers "where is X" questions with targeted searches instead of dumping files. | read | low |
| 7 | `error-diagnoser` | Diagnoses build/test/runtime failures; produces a reproduction before a fix. | read, exec:test | medium |
| 8 | `test-verifier` | Runs the project's test/lint/typecheck commands and reports evidence-backed results. | exec:test | medium |
| 9 | `git-change-review` | Reviews the diff for scope creep, accidental deletions, secrets, and untested paths. | read, git | medium |
| 10 | `docs-maintainer` | Updates README/CHANGELOG/context files to match actual behavior. | read, write:docs | medium |
| 11 | `dependency-license-audit` | Checks new/updated dependencies for license compatibility, size, maintenance, and postinstall risk. | read, network:registries | medium |
| 12 | `vsix-release` | Runs compile/lint/test, packages, inspects the archive, and documents install/upgrade verification. | exec:build, write:dist | high |
| 13 | `provider-capability-assessor` | Determines which provider/model can serve a task given detected capabilities, cost, and context needs. | read, network:provider | low |
| 14 | `resource-aware-execution` | Chooses the cheapest correct execution strategy given the system assessment and remaining budget. | read | low |

Activation notes:
- Stage order for onboarding: **1, 2** (security & trust) → **3, 4, 14** (decision-making) → the rest by task.
- Never auto-activate 9, 11, or 12 alongside an in-progress edit task; they are review/release gates.
- `provider-capability-assessor` must emit `source: provider-api | config | documentation | unknown` for
  every claim it makes.
- Every one of these must be implementable in a first release **without** any external download. If a
  bundled skill above is not written by the time of packaging, list it as "not shipped" in the README rather
  than shipping a stub.

## Authoring template

```markdown
---
name: <from table>
description: <from table>
version: 0.1.0
license: MIT
format_version: 1
tags: [<3–5 task words>]
permissions: { fs: [read:workspace], exec: false, network: [], secrets: false }
activation: auto
---

# Purpose
One paragraph: what this skill improves and what it refuses to do.

# Activation Conditions
When: <signals>. Not when: <counter-signals>.

# Workflow
1. <deterministic step with a stop condition>
2. …
# Validation
How the agent proves the work succeeded (command + expected output shape).
# Failure modes
What to do when each step fails (retry, ask, abort) — never "try harder".
# Report
The 3–6 line summary this skill must produce.
```
