# Third-Party Notices

This project adapts ideas and (in limited cases) code patterns from the following
open-source projects. All are MIT-licensed. Full license texts are available in
their respective repositories.

## Adapted sources

| Source | URL | License | Adapted modules |
|---|---|---|---|
| openai/swarm | https://github.com/openai/swarm | MIT | src/supervisor/handoff.ts, src/supervisor/supervisor.ts (handoff-as-tool, context variables, forward-message) |
| langchain-ai/langgraph-supervisor-py | https://github.com/langchain-ai/langgraph-supervisor-py | MIT | src/supervisor/supervisor.ts (supervisor routing, forward_message tool) |
| crewAIInc/crewAI | https://github.com/crewAIInc/crewAI | MIT | src/supervisor/roleAgent.ts, src/supervisor/ledger.ts (role-based agents, task expected outputs) |
| microsoft/agent-framework | https://github.com/microsoft/agent-framework | MIT | src/supervisor/middleware.ts (middleware pipeline) |
| microsoft/autogen | https://github.com/microsoft/autogen | MIT | src/supervisor/ledger.ts (Magentic-One task ledger pattern) |

## Attribution in source
Each adapted file carries a header comment naming the source repo(s). No code is
copied verbatim without attribution; patterns are re-implemented in TypeScript
for this extension.

## Publisher / identity
Publisher and extension name are unchanged: `AhsanMandhar` / `vibecode-engine-pro-free`.
