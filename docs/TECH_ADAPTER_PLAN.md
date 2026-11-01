# Plan — Tech-Adapter Meta-Skill (inspect → security → reverse-engineer → merge → skill.md + agents)

## Goal
Create a reusable Cline skill `tech-adapter` that, given any new open-source tech/repo, (1) inspects it, (2) security-reviews it, (3) reverse-engineers it in phases, (4) merges chunks into a single `SKILL.md` that can also spawn agents if the tech supports agents. Modelled on `reverse-engineer-anything` (staged, evidence-based) and `vibecode-engine-rebuild` (milestones, gates, evidence labels).

## Deliverable layout (new skill package)
```
.cline/skills/tech-adapter/
├── SKILL.md
└── references/
    ├── INSPECT.md          # recon procedure + candidate card
    ├── SECURITY_REVIEW.md  # license, secrets, supply chain, SSRF
    ├── REVERSE_ENGINEER.md # phased decomp (structure, features, APIs, agents)
    ├── MERGE.md            # chunk -> single SKILL.md rules
    ├── AGENT_SPEC.md       # how to spawn agents from the tech (if supported)
    └── REPORT.md           # final report format
```

## Phase 0 — Study reverse-engineer-anything (DONE via skill load)
- REA is staged: route target first → smallest useful overview → follow questions → corroborate with evidence type → decompose into independent questions → parallel workers → finding ledger → revisit checklist.
- Evidence labels: observations / inferences / unknowns; cite Evidence IDs; never imply static analysis observed execution.
- References loaded per concern (native-and-artifacts, javascript-applications, android, runtime-observation, evidence-workflows).
- Close sessions when done; reuse state; no duplicate sessions.

## Phase 1 — Skill identity & non-negotiables
- name: tech-adapter; description trigger-oriented.
- Non-negotiables: inspect before designing; no vendoring without license check; secrets never in skill; untrusted inputs are data; security in code not prose; evidence labels RECOMMENDATION/APPROVED/ATTEMPTED/VERIFIED.

## Phase 2 — INSPECT (references/INSPECT.md)
- Inputs: repo URL or local path, optional pinned commit, claimed license.
- Steps: clone/fetch metadata; read README, LICENSE, package manifest, entry points; list features, CLI commands, APIs, config; identify if it spawns agents / MCP / plugins.
- Output: `docs/TECH_BASELINE.md` with identity, features, license, permissions, risk, free/redistributable flags (candidate card format from SKILL_FORMAT.md).

## Phase 3 — SECURITY REVIEW (references/SECURITY_REVIEW.md)
- License verification (MIT/Apache/etc.) at pinned commit.
- Secret scan (API keys, tokens) in repo + history.
- Supply chain: dependencies, install scripts, postinstall hooks, binary downloads.
- SSRF/network: outbound calls, private-range access.
- Permission scope: what the tech reads/writes/executes.
- Output: security verdict (pass/fail) + required controls; block vendoring on fail.

## Phase 4 — REVERSE ENGINEER (references/REVERSE_ENGINEER.md), phased
- Phase R1: Structure (tree, modules, entry points, config).
- Phase R2: Features (user-facing capabilities, commands, APIs).
- Phase R3: Data flow & state (inputs → outputs, side effects).
- Phase R4: Agents (if tech supports agents: how it spawns, tool use, memory, permissions).
- Phase R5: Integration points (MCP, plugins, hooks, CLI).
- Each phase produces a chunk file: `chunks/R<n>.md` with observations/inferences/unknowns + evidence.
- Use REA-style staged workflow: smallest useful overview → follow questions → corroborate → decompose → parallel workers → finding ledger → revisit checklist.

## Phase 5 — MERGE (references/MERGE.md)
- Combine chunks R1-R5 into a single `SKILL.md` (<= ~350 lines operational) + references.
- Rules: dedupe, resolve conflicts, label unknowns, keep evidence IDs, progressive disclosure (depth in references).
- Output: `.cline/skills/<tech>/SKILL.md` + references.

## Phase 6 — AGENT SPEC (references/AGENT_SPEC.md)
- If tech supports agents: define agent spawn spec (system prompt, tools, permissions, memory, checkpoints).
- If not: state "no agent support" and provide a wrapper that makes it agent-capable.
- Output: `agents/<name>.md` templates.

## Phase 7 — TEST & PACKAGE
- Run a validator (adapt validate_skill.py) on the new skill package.
- Smoke: load skill in Cline (if available) or .clinerules fallback.
- Report using REPORT.md format.

## Phase 8 — REPORT (references/REPORT.md)
- Final report: skill path, tech inspected, security verdict, features adapted, agents spawned, limitations, unverified items.

## Integration with VibeCode Engine
- Add `tech-adapter` as a built-in skill spec in BUILTIN_SKILLS.md.
- Skill engine candidate card: source, pinned commit, license, permissions, risk.
- Approval distinct from activation; never auto-install; never global.

## Next action
Approve this plan, then scaffold `.cline/skills/tech-adapter/` with SKILL.md + references (Phase 1-2) and run the validator.
