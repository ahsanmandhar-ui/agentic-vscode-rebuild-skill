# Agent Supervisor — Repo Inspection Report

## Download status
- openai/swarm: CLONED (shallow) into `research/agent-supervisor-candidates/openai-swarm/repo/`.
- langchain-ai/langgraph-supervisor-py, microsoft/agent-framework, microsoft/autogen, crewAIInc/crewAI: network blocked; inspected via GitHub web pages + README (see candidate READMEs).

## Inspected: openai/swarm core (`swarm/core.py`, `swarm/types.py`, `swarm/util.py`)

### Key concrete patterns
1. **Agent** = `{name, model, instructions (str|callable), functions[], tool_choice, parallel_tool_calls}`.
2. **Result** = `{value, agent?, context_variables}` — one return can update value, switch agent, and update shared state.
3. **Response** = `{messages, agent, context_variables}`.
4. **Context variables hidden from model**: `__CTX_VARS_NAME__` injected into tool function signature, then stripped from the JSON schema sent to the LLM. So tools can read/write context without exposing it to the model.
5. **Handoff**: if a function returns an `Agent`, it becomes a handoff (active_agent switches). If it returns a `Result`, extract value/agent/context_variables.
6. **Run loop**: while turns < max_turns and active_agent: get completion; if no tool_calls → break; else handle_tool_calls → update history/context/agent.
7. **Tool schema inference** from Python function signatures + docstrings (`function_to_json`).
8. **Streaming**: `run_and_stream` yields `{delim: start/end}` per agent turn + final `{response}`.

### Mapping to our TS implementation (already done)
- `AgentSpec` ≈ Agent (role/goal/backstory/tools/capabilities/model).
- `HandoffResult` ≈ Result (value/nextAgent/contextUpdates).
- `SupervisorContext.variables` ≈ context_variables.
- `Supervisor.run` loop ≈ run loop (decide → delegate → apply handoff).
- Still to add: context-variable hiding in tool schema, streaming delimiters, Result-as-return normalization in runAgent (already supports HandoffResult).

## Inspected (web): langgraph-supervisor
- `create_supervisor(agents, model, prompt, tools)`; handoff tools per worker; `create_forward_message_tool` forwards worker's last message unchanged; supports Functional + Graph API agents; hierarchical composition.

## Inspected (web): microsoft/agent-framework
- Agents with tools/middleware/providers; workflow DAG; hosting (A2A); durable task; declarative agents (YAML).

## Inspected (web): microsoft/autogen
- Core event-driven runtime; AgentChat group chats; Magentic-One task ledger + orchestrator; code execution sandbox; AutoGen Studio.

## Inspected (web): crewAI
- Role/goal/backstory agents; sequential/hierarchical process; Flows (event-driven); human-in-the-loop; expected-output contracts; telemetry opt-in.

## Updated integration plan
See `docs/AGENT_SUPERVISOR_INTEGRATION_PLAN.md` (S0–S10). Next concrete work:
- S2: add context-variable hiding in tool schema + Result normalization + streaming delimiters.
- S5: hierarchical supervisors + Flow engine.
- S6: task ledger + expected-output validation.
- S7: durable state persistence.
- S8: webview panel + commands.
- S9: security hardening.
- S10: package.
