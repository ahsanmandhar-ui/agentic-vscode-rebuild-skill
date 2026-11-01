# FINAL COMPLETE PLAN (for approval)

## 0. Principles
- Quality over speed; no simplification of required scope.
- Plan AI is single source of truth for plan.md/progress.md.
- Execute AIs follow plan; report progress; never redefine scope.
- All models may use skills; planner assigns.
- Web search uses DuckDuckGo API (+ Brave/SerpAPI fallback) with cache/backoff.
- System info check before planning.
- Multi-account per provider with auto-switch on exhaustion.
- Parallel multi-AI with conflict-avoidance skill.

## 1. Risks & Mitigations (with evidence)
1. No VS Code test harness → add @vscode/test-electron smoke test (https://www.npmjs.com/package/%40vscode/test-electron); keep host-independent unit tests; document gap.
2. Capability drift → probe-driven capabilities with TTL + manual override + conservative defaults.
3. DuckDuckGo rate limits → cache + backoff + auto-switch to Brave/SerpAPI via SecretStorage keys (https://scavio.dev/blog/duckduckgo-api-unreliable-alternatives-2026, https://cors.dev/guides/free-web-search-api, https://serpdive.com/free-web-search-api) with UI to add keys.
4. Latency → parallelism + caching + fast/thorough mode.

## 2. Roles
- Plan AI: system info, inspect, ask, search, plan.md/progress.md, assign skills, spawn agents, review, merge, evaluate.
- Execute AI: follow plan, implement, test, report progress.<id>.md, use assigned skills, account switch on exhaustion.
- Conflict skill (parallel-execution-guard): ownership, locks, branches, progress, planner-only merges.

## 3. System Info Check (before planning)
OS, CPU, RAM, disk, runtimes, CLIs, network, project state → docs/SYSTEM_INFO.md.

## 4. Multi-Account
SecretStorage pool; auto-switch on 429/auth failure; resume from checkpoint; non-evasion.

## 5. UI Plan (chunks/subchunks)
U1 Shell, U2 Router, U3 CLI, U4 Search (providers, keys, fallback, cache, rate-limit banner), U5 Plan/Progress viewer, U6 Settings/Onboarding, U7 A11y/Polish.

## 6. Search Provider Management
DuckDuckGo default; Brave/SerpAPI fallback; keys in SecretStorage (masked); UI to add/test; auto-switch on rate limit; cache 24h LRU.

## 7. Execution Architecture
Data flow: Plan AI system info → inspect → ask → search → plan.md/progress.md → task DAG → spawn Execute AIs → review → merge → update → evaluate. Quality gates + honest evaluation.

## 8. Milestones
M1 system info + search helper; M2 Plan AI workflow; M3 Execute contract; M4 conflict skill; M5 multi-account; M6 UI; M7 verification.

## 9. Implementation Order (approved recommendation)
1. P0 foundations (system info, search helper, secret keys)
2. P1 reliability (probe capabilities, search providers, multi-account)
3. P2 multi-AI (conflict skill, DAG, progress)
4. P3 Plan AI workflow
5. P4 UI (U1→U2→U4→U3→U5→U6→U7)
6. P5 verification (smoke test, unit tests, security tests, evaluation)

## 10. Next single action
Implement P0 (system info check + DuckDuckGo search helper with cache/backoff + Brave/SerpAPI fallback) and P0.3 secret keys. Then proceed to P1.

---
APPROVE? Reply "approve" to start implementation.