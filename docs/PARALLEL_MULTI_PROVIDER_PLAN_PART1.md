# Parallel Multi-Provider Plan & Execution Architecture (Part 1)

## 0. Principles
- Quality over speed; a task may take longer. No simplification of required scope.
- Plan AI (planner) is the single source of truth for plan.md / progress.md.
- Execute AIs are stateless workers that follow the plan and report progress; they never redefine scope.
- All models may use skills; planner assigns which skills and instructions to each.
- Web search uses DuckDuckGo API (no browser scraping); results cited.
- System info check runs before planning to keep plans within machine limits.
- Multi-account per provider: auto-switch on free-tier exhaustion, resuming from progress.

## 1. Roles
### Plan AI (Planner)
- Runs system info check (OS, CPU, RAM, disk, installed runtimes, available CLIs, network).
- Inspects project (files, git status, package.json, tsconfig, tests).
- Asks user clarifying questions.
- Searches web (DuckDuckGo) for references/patterns; cites sources.
- Creates plan.md (phases, chunks, sub-chunks, acceptance criteria) and progress.md (state, changed files, tests, next action).
- Assigns skills + instructions to Execute AIs.
- Creates agents (subagents) for independent chunks; runs them in parallel.
- Reviews Execute reports; updates progress.md; decides retries/escalation.
- Honest evaluation: lists done/not-done/risks; never marks unverified as verified.

### Execute AI(s)
- Receive self-contained task prompts from planner (goal, constraints, files, skills, expected output).
- Follow plan; implement code/tests; run commands.
- Report in progress.md format: changed files, commands, test results, blockers.
- Use assigned skills; may request missing skill from planner.
- On free-tier exhaustion: switch account (multi-account) and resume from last progress checkpoint.

### Conflict-Avoidance Skill (built-in: `parallel-execution-guard`)
- File ownership: each Execute AI owns disjoint file sets; planner assigns ownership in plan.
- Locking: advisory lock file `.vibecode/locks/<path>.lock` with owner + timestamp; stale lock (>10 min) reclaimable.
- Merge protocol: Execute AI commits to a feature branch `exec/<task-id>`; planner merges after review; conflicts resolved by planner only.
- Shared state: progress.md is planner-only write; Execute AIs append to `progress.<task-id>.md` then planner folds in.
- Skill registry: planner is sole assigner; Execute AIs cannot install/activate skills without approval.
- Account rotation: per-provider account pool with usage tracking; only planner authorizes rotation (non-evasion).

## 2. System Info Check (before planning)
Plan AI runs (via terminal tool, argv arrays):
- OS/platform, arch, CPU cores, RAM, free disk.
- Installed: node, python, git, docker, vscode, CLIs (gemini, claude, codex, ollama).
- Network reachability (DuckDuckGo API, provider endpoints) with timeout.
- Project: repo root, git status, package manager, test command, tsconfig.
Output: `docs/SYSTEM_INFO.md` (masked secrets). Plan must fit within these limits.

## 3. Web Search (DuckDuckGo API)
- Use DuckDuckGo Instant Answer API or search endpoint; no scraping.
- Planner calls search for: library docs, patterns, license info, provider pricing.
- Results stored with citations in plan.md appendix.
- Execute AIs may search only if planner grants `webSearch: true` in task.

## 4. Multi-Account per Provider
- Account pool stored in SecretStorage under `vibecode.router.<provider>.accounts` (JSON list of authorized accounts).
- Each account has: id, label, secret (masked), status (active/exhausted), usageCount, lastUsedAt, quotaHint.
- Auto-switch: when a request returns 429/quota-exhausted or auth failure, mark account exhausted, pick next active account, retry from last checkpoint; if none, pause and ask user.
- Usage tracking: per-request token/latency recorded in telemetry; account-level aggregate.
- Applies to both Plan AI and Execute AIs.
- Non-evasion: rotation only across explicitly authorized accounts; never to bypass billing.

## 5. Conflict-Avoidance & Smooth Running
- Planner maintains a task DAG (dependsOn); independent tasks run in parallel.
- Each task gets: owner, file set, branch, skills, account pool, acceptance criteria.
- Progress reporting: Execute AI writes `progress.<task-id>.md`; planner polls/merges.
- Planner reviews diffs before merge; runs tests; on failure, reassigns or escalates.
- All models use the same plan.md/progress.md contract.
