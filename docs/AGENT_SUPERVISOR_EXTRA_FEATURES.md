# Additional Agent Supervisor Features (from web research)

## Orchestration patterns (from comparison articles)
- Orchestrator-Worker, Supervisor, Hierarchical, Sequential, Parallel, Conditional (topologyindex.com).
- LangGraph StateGraph, CrewAI Crew+Flow, AutoGen Magentic-One ledger, OpenAI Agents SDK handoffs.

## OpenAI Agents SDK (successor to Swarm)
- Agents with tools, handoffs, guardrails, tracing, sessions.
- Guardrails: input/output validation functions.
- Tracing: built-in trace spans for debugging.

## Sandboxes (code execution for agents)
- E2B, Modal, Daytona, Docker, microVMs.
- Features: isolated execution, file I/O, network controls, timeouts, snapshots.
- Implement: pluggable `CodeExecutor` interface with local subprocess + optional sandbox adapter.

## Inter-agent protocols
- A2A (Agent-to-Agent): task lifecycle, artifacts, streaming, push notifications.
- MCP (Model Context Protocol): tool/resource/prompt servers.
- ACP, ANP: alternative protocols.
- Implement: `A2AAdapter` + `MCPClient` behind ports.

## Guardrails & safety
- Input/output guardrails, PII redaction, content filters, rate limits.
- Implement: middleware guardrails in pipeline.

## Evaluation
- LangSmith, Promptfoo, Ragas: eval suites, traces, datasets.
- Implement: eval harness running supervisor scenarios with expected outputs.

## Implementable additions to plan
- Add guardrails middleware (R5).
- Add code-execution sandbox adapter (new R8).
- Add A2A/MCP adapters (new R9).
- Add eval harness (new R10).
- Add tracing spans (new R11).
