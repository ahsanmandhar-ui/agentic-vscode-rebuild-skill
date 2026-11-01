# ARCHITECTURE — target design and preservation rules

Adapt to what M1 found. This is a **target shape**, not an instruction to rewrite every file. If the
existing layout is sound, extend it; put new code where the repo already expects it.

## 1. Layering rule

```
src/extension.ts            activation wiring only: construct, register, dispose
src/agent/                  task lifecycle, planner, executor, verifier (no vscode imports in core)
src/tools/                  tool registry + implementations (fs, search, terminal, git, test)
src/security/               permission engine, policy, secret store, path guard, redaction
src/skills/                 discovery, schema, inspector, store, registry, activation
src/providers/              ProviderAdapter implementations + capability metadata
src/accounts/               account records, authorization state, selection policy, cooldowns
src/context/                context files (plan/progress/structure), checkpoints, compaction
src/system/                 environment assessor, resource budgets
src/ui/                     webview providers, message protocol, state projection
src/shared/                 types, Result/errors, logger, constants, zod schemas
media/                      icons, webview assets
```

**Hard rule:** `src/security`, `src/skills`, `src/providers`, `src/accounts`, `src/context`, `src/agent`
must not import `vscode`. Inject capabilities through interfaces (`FilePort`, `SecretPort`, `ExecPort`,
`ClockPort`, `HttpPort`) so they can be unit-tested with fakes. VS Code-specific implementations live in
`src/adapters/vscode/*`. This is what makes the security matrix testable.

Avoid unnecessary abstraction. Add a port only where a test or a second implementation needs it.

## 2. Core types (starting point — refine, keep discriminated unions)

```ts
export type TaskState =
  | 'IDLE' | 'UNDERSTANDING_REQUEST' | 'ASSESSING_ENVIRONMENT' | 'DISCOVERING_SKILLS'
  | 'AWAITING_APPROVAL' | 'PLANNING' | 'EXECUTING' | 'AWAITING_TOOL_PERMISSION'
  | 'VERIFYING' | 'RECOVERING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export type ProviderErrorKind =
  | 'auth_expired' | 'rate_limited' | 'quota_exhausted' | 'context_length'
  | 'output_limit' | 'network' | 'server_transient' | 'model_unavailable' | 'unknown';

export interface Capability {               // never assume; record how you know
  tools: boolean; streaming: boolean; jsonMode: boolean;
  contextWindow?: number; source: 'provider-api' | 'config' | 'documentation' | 'unknown';
}

export interface ProviderAdapter {
  readonly id: string;                      // 'anthropic' | 'openai' | 'lmstudio' | 'openai-compatible:acme'
  readonly capabilities: Capability;
  send(req: AgentRequest, signal: AbortSignal): AsyncIterable<AgentEvent>;
  dispose(): void;
}

export type AgentEvent =
  | { kind: 'text'; delta: string }
  | { kind: 'tool_call'; id: string; name: string; args: unknown }
  | { kind: 'usage'; inputTokens?: number; outputTokens?: number }
  | { kind: 'error'; error: NormalizedProviderError }
  | { kind: 'done'; finishReason: 'stop' | 'length' | 'tool_calls' | 'aborted' | 'error' };

export interface PermissionRequest {
  action: 'read' | 'write' | 'delete' | 'exec' | 'network' | 'git' | 'install' | 'secret';
  target: string;                          // absolute path, command, host, or key name
  reason: string;
  scope: 'once' | 'session' | 'workspace'; // decided by policy, not by the model
}
```

## 3. Task state machine

Allowed transitions (anything else throws `IllegalTransition`):

```
IDLE → UNDERSTANDING_REQUEST
UNDERSTANDING_REQUEST → ASSESSING_ENVIRONMENT | PLANNING | FAILED | CANCELLED
ASSESSING_ENVIRONMENT → DISCOVERING_SKILLS | FAILED | CANCELLED
DISCOVERING_SKILLS → AWAITING_APPROVAL | PLANNING | FAILED | CANCELLED
AWAITING_APPROVAL → PLANNING | CANCELLED
PLANNING → EXECUTING | AWAITING_APPROVAL | FAILED | CANCELLED
EXECUTING → AWAITING_TOOL_PERMISSION | VERIFYING | RECOVERING | FAILED | CANCELLED
AWAITING_TOOL_PERMISSION → EXECUTING | CANCELLED
VERIFYING → COMPLETED | RECOVERING | FAILED | CANCELLED
RECOVERING → EXECUTING | PLANNING | FAILED | CANCELLED
COMPLETED|FAILED|CANCELLED → UNDERSTANDING_REQUEST   (new task; all resources released)
```

Invariants:
1. At most one mutating tool in flight; mutating tools queue.
2. `CANCELLED` aborts the AbortSignal, kills child process trees, and never leaves a half-written file
   (write via temp + rename).
3. Entering `VERIFYING` requires at least one verification action recorded; leaving it requires evidence.
4. Every state entry is appended to the task journal (`globalStorage/tasks/<id>.jsonl`) — cheap, append-only,
   secret-redacted. Journals are the resume substrate.

## 4. Preservation rules (anti-rewrite)

Preserve unless a documented security requirement or an explicitly approved decision says otherwise:

- `publisher`, `name`, `command` ids, `configuration` keys (add, don't rename; migrate if unavoidable).
- Working activation events and view ids.
- Existing user data: `globalState`/`workspaceState` keys, stored account labels, session history.
- Public behaviors README promises and users depend on (even if ugly).

Process: for each candidate removal, write
`REMOVE <thing> — reason — user impact — replacement — approval: <quote/time>` in `progress.md` before
removing it. Prefer adapters/deprecation shims over deletion in the first release.

## 5. Skill engine internals

```
SkillSource   = 'bundled' | 'workspace' | 'user' | 'git' | 'registry'
SkillState    = 'discovered' | 'inspected' | 'pending_approval' | 'installed'
              | 'enabled' | 'disabled' | 'quarantined' | 'failed'
```

Pipeline (each step separate, logged, and independently testable):
`discover → parse+validate (zod) → static inspect → risk score → present card → user approval →
install to store (checksum + provenance) → enable → select for task → activate (load instructions) →
validate outcome → record`.

Distinct concepts: **inspection** (characteristics) ≠ **approval** (user consent) ≠ **activation**
(loaded for this task) ≠ **tool authorization** (runtime permission). Approving a skill grants nothing at
runtime; the permission engine still gates every action.

Selection: filter by `enabled && trust ok && version compatible` → score by tag/keyword match against the
task + repo signals (file types, frameworks) → prefer more specific skill, then higher precedence
(workspace > user > bundled), then explicit user pin → cap at N=3 active skills per task → log scores.
Conflicts: if two skills declare incompatible `conflicts_with` or contradictory policies, prefer the
workspace skill and surface a notice. Dependencies: resolve within installed set; missing → recommend, never
auto-install.

## 6. Tool execution

Central `ToolExecutor`:
1. Validate args against schema (`zod`) — reject unknown fields.
2. Resolve and **canonicalize paths**; reject absolute paths outside the workspace, `..` escapes, and
   symlinks pointing outside (`fs.realpath` compare).
3. Map to `PermissionRequest`; ask the permission engine.
4. Execute through the port (`ExecPort` uses `spawn` with an argv array, never `shell: true`; allowlist of
   programs; no `sh -c` with interpolated model text).
5. Capture stdout/stderr (truncate), exit code, duration; redact secrets.
6. Return a structured result; write to the task journal.

Never "sanitize" a shell string with regex and call it safe. Structured argv + program allowlist + cwd
confinement is the control; the permission prompt is the backstop.

## 7. Context persistence schema

`plan.md`

```markdown
# Plan — <project>
<!-- vibecode:managed:start -->
Updated: <ISO date> · Version: <pkg version> · Milestone: M<n>
## Objective
## Requirements (functional / non-functional)
## Architecture decisions (ADR-lite: decision · why · alternatives rejected)
## Milestones (status: todo|in-progress|done + evidence link)
## Current priorities (ordered, max 5)
## Dependencies (runtime / dev / external services, with license + cost)
## Acceptance criteria
## Risks
## Pending decisions (owner: user|agent)
<!-- vibecode:managed:end -->
<!-- user: anything outside the managed markers is preserved verbatim -->
```

`progress.md`

```markdown
# Progress
<!-- vibecode:managed:start -->
Updated: <ISO> · Task: <id> · State: <TaskState> · Provider: <id>/<model> · Account: <label>
## Current task
## Completed steps (with evidence: command → result)
## Changed files (path · why)
## Commands executed (argv · exit code)
## Tests (suite · passed/failed · output tail)
## Known failures
## Pending tasks
## Next recommended action
## Checkpoint (commit sha | stash id | branch | dirty-file list)
<!-- vibecode:managed:end -->
```

`structure.md`

```markdown
# Structure
<!-- vibecode:managed:start -->
Updated: <ISO> · generated from <commit>
## Tree (depth-limited, generated: `git ls-files | head -200`)
## Entry points / activation flow
## Modules & responsibilities (one line each)
## Key types & interfaces (name · file · purpose)
## Provider architecture · Skill architecture · Permission architecture
## Configuration locations (files, settings keys)
## Build / test / package commands (verbatim from package.json)
## Important dependencies
## Module relationships (text diagram)
<!-- vibecode:managed:end -->
```

Rules: atomic writes (`.tmp` + `fs.rename`); redact before write (regex for common key shapes + any
registered secret value); never rewrite user sections; cap size (structure.md ≤ ~500 lines — truncate the
tree, not the prose); keep the last 3 versions in `globalStorage/checkpoints/`.

## 8. UI state projection

The webview receives a **projection**, never the whole model: `{setup, task, skills, accounts, perms,
context, logs}` with explicit `status: 'loading'|'empty'|'error'|'ready'` per panel and `updatedAt` per
value. Protocol: versioned messages, `vscode.setState/getState` for restore, strict CSP with nonce,
`localResourceRoots` limited to `media/`, no inline event handlers, no remote assets.

## 9. Disposal & async

Every registration goes into `context.subscriptions`. Every long-lived object implements `dispose()`.
All async paths: `try/catch`, no empty catches, no floating promises (`@typescript-eslint/no-floating-promises`),
AbortSignal threaded through providers/tools, timers cleared, `deactivate()` flushes checkpoints.

## 10. Dependencies policy

Prefer zero new runtime dependencies; the extension ships to users and every dep costs trust and bytes.
Justify each addition (why stdlib/VS Code API is insufficient), check license compatibility, and prefer
`devDependencies` + bundling with esbuild. Never add a dependency that phones home.
