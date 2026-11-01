# Plan: Integrate Agent Supervisor / Master from Open-Source Frameworks

## Goal
Bring a production-grade "agent supervisor/master" into the VibeCode VS Code extension by adapting code
and patterns from the researched open-source frameworks, with full credit in LICENSE and attribution docs.

## Licensing & credit policy
- All source repos are MIT (langgraph-supervisor, microsoft-agent-framework, autogen, crewai, openai/swarm).
- We will NOT copy code verbatim without attribution. Each adapted module gets a header comment citing
  source repo + file + commit + license.
- Add a `THIRD_PARTY_NOTICES.md` (and `NOTICE` file in VSIX) listing each repo, license, and adapted files.
- Keep publisher/name/version rules: publisher `AhsanMandhar`, name `vibecode-engine-pro-free`, only bump version.
- No credential scraping, no OAuth bypass; reuse existing SecretStorage adapter.

## Candidate repos (already researched)
See `research/agent-supervisor-candidates/INDEX.md`.

## Phases

### Phase S0 — Legal/attribution prep (S)
- S0.1 Add `THIRD_PARTY_NOTICES.md` with repo URLs, licenses, adapted-file list.
- S0.2 Add license header template for adapted files.
- Acceptance: notices file present; validator checks for it.

### Phase S1 — Core supervisor skeleton (M)
- S1.1 Define types: `AgentSpec` (role, goal, backstory, tools, model), `TaskSpec` (description, expectedOutput, assignee), `SupervisorDecision` (nextAgent | finish | askHuman).
- S1.2 Implement `AgentRegistry` (register/unregister/lookup by capability).
- S1.3 Implement `Supervisor` class with `decide(context, agents, tasks)` returning a decision.
- S1.4 Unit tests for registry + decision parsing.
- Acceptance: tsc 0 errors; tests pass.

### Phase S2 — Handoff protocol (M)
- Adapt from Swarm + LangGraph: handoff-as-tool, context variables, forward-message.
- S2.1 `HandoffTool` interface: `name`, `targetAgent`, `execute(ctx)` returns `HandoffResult(value, nextAgent, contextUpdates)`.
- S2.2 `ContextVariables` shared mutable map passed between agents.
- S2.3 Forward-message shortcut: skip supervisor summarization.
- S2.4 Tests.
- Acceptance: handoff round-trip test passes.

### Phase S3 — Role-based agents (S)
- Adapt from CrewAI.
- S3.1 `RoleBasedAgent` with role/goal/backstory + tool list.
- S3.2 Prompt builder composing role/goal/backstory into system prompt.
- S3.3 Tests.

### Phase S4 — Middleware pipeline (M)
- Adapt from MAF.
- S4.1 `Middleware` interface: `before/after/error` hooks.
- S4.2 Built-in middleware: logging, retry, rate-limit, permission-check, redaction.
- S4.3 Wire into agent invocation.
- S4.4 Tests (permission deny-by-default).

### Phase S5 — Hierarchical supervisors + Flows (L)
- S5.1 Nested supervisors (sub-team supervisors report to master).
- S5.2 Event-driven Flow engine: steps with dependencies, parallel branches, state.
- S5.3 Human-in-the-loop pause/resume.
- S5.4 Tests.

### Phase S6 — Task ledger & expected outputs (M)
- Adapt from Magentic-One + CrewAI.
- S6.1 `TaskLedger` tracking sub-tasks, status, owner, result.
- S6.2 Expected-output contracts + validation.
- S6.3 Retry on validation failure.
- S6.4 Tests.

### Phase S7 — Durable state (M)
- Adapt from MAF.
- S7.1 Persist supervisor state (ledger + context) to `<globalStorage>/supervisor/*.json`.
- S7.2 Resume after restart.
- S7.3 Tests.

### Phase S8 — UI integration (M)
- S8.1 Add "Agent Supervisor" panel/tab in webview.
- S8.2 Show task ledger, active agent, handoffs, approvals.
- S8.3 Wire commands: `vibecode.agent.run` (already), add `vibecode.supervisor.status`, `vibecode.supervisor.pause`.
- S8.4 Render tests.

### Phase S9 — Security hardening (M)
- S9.1 Permission gates on every agent tool invocation.
- S9.2 SSRF guard on outbound agent HTTP.
- S9.3 Secret redaction in logs/ledger.
- S9.4 Escape HTML in supervisor UI.
- S9.5 Tests.

### Phase S10 — Packaging & release (S)
- S10.1 Bump version (e.g. 0.1.15).
- S10.2 Package VSIX, isolated install/upgrade test.
- S10.3 Update plan/progress/structure + honest evaluation.

## Execution order
S0 → S1 → S2 → S3 → S4 → S5 → S6 → S7 → S8 → S9 → S10.
Independent units (S3, S4) can run in parallel after S2.

## Acceptance (overall)
- tsc exit 0; vitest all pass + new tests.
- Supervisor can run a multi-agent task end-to-end in host.
- Attribution notices present; no uncredited copied code.
- VSIX packaged and verified.

## Next single action
Start S0: create THIRD_PARTY_NOTICES.md and license header template.
