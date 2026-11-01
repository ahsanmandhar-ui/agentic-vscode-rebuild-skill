# Parallel Multi-Provider Plan & Execution Architecture (Part 2)

## 6. UI Plan (detailed chunks & sub-chunks)
Use ui-ux-pro-max priorities (accessibility, touch, performance, style, layout, typography, animation, forms, navigation, charts).

### Chunk U1: Shell & Navigation
- U1.1 Tab bar: Skills, Routers, CLI, Models, Settings, Diagnostics (≤6 tabs, predictable back).
- U1.2 Status bar: active router, health badge, account indicator.
- U1.3 Command palette entries for all actions.
- U1.4 Reduced-motion + focus management (a11y).

### Chunk U2: Router Panel
- U2.1 Provider list cards (health/latency/cost badges).
- U2.2 Active router selector + set active.
- U2.3 Fallback chain editor (reorder/remove/test).
- U2.4 Add custom endpoint wizard (URL → SSRF preview → test → store key masked).
- U2.5 Account pool panel (list/add/remove, strategy selector, usage).

### Chunk U3: CLI Runner Panel
- U3.1 Binary picker (allowlisted), args input, cwd input.
- U3.2 Run button → stream output (aria-live).
- U3.3 Multi-run panel (parallel CLIs, merged output cards).
- U3.4 History list (exit code, duration).
- U3.5 Account/env key selector per CLI.

### Chunk U4: Plan/Progress Viewer
- U4.1 Render plan.md sections (phases, chunks, acceptance).
- U4.2 Render progress.md (state, changed files, tests, next action).
- U4.3 Diff viewer for Execute AI branches.
- U4.4 Approval controls (approve/reject/retry) for planner.

### Chunk U5: Settings & Onboarding
- U5.1 Provider/account management.
- U5.2 CLI allowlist management.
- U5.3 Skill trust/approval.
- U5.4 Onboarding 4-step (persist to disk).

### Chunk U6: Accessibility & Polish
- U6.1 Contrast 4.5:1, keyboard nav, aria labels.
- U6.2 Empty/error states with actions.
- U6.3 Loading feedback, no layout shift.

## 7. Execution Architecture (detailed)
### 7.1 Data flow
1. User triggers "Plan project" → Plan AI runs system info check → writes SYSTEM_INFO.md.
2. Plan AI inspects repo → asks user questions → searches web → writes plan.md + progress.md.
3. Plan AI creates task DAG with file ownership, skills, account pools.
4. Plan AI spawns Execute AIs (parallel where independent) with self-contained prompts.
5. Execute AIs implement → run tests → write progress.<id>.md → report.
6. Plan AI reviews → merges branches → updates progress.md → decides next wave.
7. On exhaustion: auto-switch account; resume from checkpoint.
8. At end: Plan AI honest evaluation + test results + risks.

### 7.2 Skill assignment
- Planner selects skills from installed set; includes skill name + usage instructions in task prompt.
- Execute AI loads skill via `skill` tool; if missing, requests from planner.
- Conflict skill (`parallel-execution-guard`) always included for multi-executor tasks.

### 7.3 Quality gates
- Each chunk has acceptance criteria; Execute AI must provide evidence (commands, output).
- Planner runs independent verification (read diff, run tests) before marking done.
- No weakened tests; security controls in code + tests.
- Final report lists verified vs unverified.

### 7.4 Persistence
- plan.md, progress.md, SYSTEM_INFO.md, progress.<id>.md stored in project root (or .vibecode/).
- Survives across sessions; planner resumes from progress.md.

## 8. Milestones (high level)
M1: System info check + DuckDuckGo search helper.
M2: Plan AI workflow (inspect/plan/ask/search/agents).
M3: Execute AI contract + progress reporting.
M4: Conflict-avoidance skill + file locks + branches.
M5: Multi-account auto-switch.
M6: UI chunks U1–U6.
M7: Integration + quality gates + honest evaluation report.

## 9. Risks & Assumptions
- No VS Code extension host harness → runtime verification blocked (documented).
- Provider APIs/pricing unverified → capability metadata may need updates.
- DuckDuckGo API rate limits → cache + retry.
- Quality over speed may increase latency; acceptable.

## 10. Next single action
Implement M1 (system info check) + DuckDuckGo search helper, then M2 (Plan AI workflow) before any Execute AI runs.
