# Enterprise Admin Review — VibeCode Extension (task_0041)

Reviewer lens: enterprise admin. Scope: `src/observability/*` (audit, logger, crash), `src/security/*` (permissions, paths, spawn, ssrf, supply), `src/providers/accounts.ts`, `src/routing/*`, `src/memory/*`, `src/config/settings.ts`, `src/extension.ts`, `package.json`. No code changes.

## 1. Audit logs

- **In-memory only, no persistence.** `AuditLog` (`src/observability/audit.ts`) stores events in a `private events: AuditEvent[]` array with `recent(n)` and `clear()`. There is no disk write, no rotation, no export. On deactivation/reload all audit history is lost. An enterprise tenant cannot retain or review an audit trail.
- **Never wired to anything.** `activate()` constructs `const audit = new AuditLog()` and records a single `activate` event; no other command path calls `audit.record`. Provider switches, account add/remove, secret manage, permission grants/revokes, skill install/enable/activate, tool runs, webview messages are all unaudited.
- **No actor/identity.** `AuditEvent` has `userAgent`/`ip` fields but nothing populates them; no user id, workspace id, or tenant id. Multi-user/multi-workspace attribution is impossible.
- **No integrity protection.** Events are mutable in-memory arrays; `clear()` wipes history with no append-only guarantee, no hash chain, no tamper evidence.
- **Logger is also in-memory** (`Logger.max = 500`, ring buffer) and `showDiagnostics` only renders `logger.recent(50)` to a webview `<pre>`. No file sink, no level filtering config, no redaction of secrets beyond crash reporter's `sk-` regex.
- **Crash reporter redaction is narrow.** Only `sk-[A-Za-z0-9]{10,}` is masked; GitHub (`ghp_`), Google (`AIza`), Bearer tokens, and other provider key shapes (handled in telemetry) are not redacted in crash stacks. Crash reports are stored to `globalStorage/last-crash.json` unredacted for other patterns.
- **No audit UI/export.** There is no command to view/export audit log; diagnostics panel shows logs only.

## 2. Compliance

- **No data-retention policy or controls.** Memory files (`plan.md`, `progress.md`, `structure.md`), telemetry records, search cache, task journals, onboarding state, and skill storage persist indefinitely under `globalStorage`/workspace with no TTL, size cap (except logger 500 and telemetry capacity default unset), or purge command.
- **No data subject access / deletion flow.** There is no "export my data" or "delete all VibeCode data" command; secrets can be deleted individually via manageKeys, but memory, telemetry, audit, skill state, and task journals cannot be cleared from the UI.
- **Telemetry is opt-in by setting** (`telemetry: z.boolean().default(false)`), which is good, but there is no consent prompt, no documented data categories, no anonymization, and `TelemetryStore` keeps full error strings (redacted only for common secret patterns) and provider/model identifiers.
- **No compliance documentation.** No privacy policy reference, no data processing agreement, no SOC2/ISO controls mapping, no subprocessor list. `docs/` contains engineering plans only.
- **Migration registry mutates state silently.** `MigrationRegistry.migrate` applies transforms with no audit record and no rollback; failed migrations are caught and only logged as a warning.
- **Secret handling is sound in principle** (SecretStorage, `maskKey`, no plaintext in settings), but `adaptSecretStorage` accepts any object with get/store/delete, and `InMemorySecretStorage` is used in tests/non-host; production path uses `context.secrets`. No key rotation schedule, no expiry, no per-account scoping in UI.
- **No encryption at rest for non-secret data.** Memory, tasks, skills, telemetry are written as plaintext JSON/JSONL/MD to `globalStorage` and workspace. No at-rest encryption or OS-keychain option.
## 3. Multi-account governance

- **Backend exists, governance is not enforced.** `AccountManager` supports add/remove/list/select with strategies and `authorized`/`authorizedForFallback` flags, but `extension.ts` never instantiates it or wires handlers; the Models panel is static HTML. There is no runtime enforcement of authorization before a provider call beyond `routing/accounts.isAuthorized` (which is unused in the router path).
- **Router ignores authorization for fallback.** `ProviderRouter.decide` filters accounts by `authorized` and cooldown, but does not check `authorizedForFallback` when `reason === 'fallback'`. An account not authorized for fallback can still be selected during fallback.
- **No allowlist governance.** `switchAccount` requires an `allowlist: Set<string>` of account ids, but no allowlist is constructed anywhere; authorization is a boolean on the record with no central policy source or admin override.
- **No audit of account lifecycle.** Add/remove/select/exhaust/cool-down/mark-failed are not audited or attributed; no change history.
- **No tenant/org boundary.** Accounts are stored per-extension-installation in SecretStorage with keys `vibecode.router.<provider>.<type>[.<account>]`; there is no workspace-vs-global scoping choice, no shared team account store, no role-based access.
- **No quota/budget governance.** `usageCount`/`lastUsedAt` are tracked, but there is no per-account quota, spend cap, or alerting; `TelemetryStore` aggregates cost but is not linked to account governance.
- **Cooldown/exhaustion state is in-memory-ish.** Account metadata is persisted to SecretStorage, but cooldown timestamps and circuit-breaker state (`ProviderRouter.circuit` Map) are in-memory and reset on reload, so governance decisions are not durable.

## 4. Data handling

- **Workspace confinement is implemented but inconsistently applied.** `confinePath` guards memory root and fs tools, but `extension.ts` reads/writes `onboarding.json`, skill storage, and crash reports under `globalStorageUri.fsPath` without confinement checks; `runTool` uses `workspaceFolders?.[0]?.uri.fsPath ?? '.'` which falls back to CWD (path traversal / wrong-root risk).
- **Path traversal helper is incomplete.** `isTraversal` only checks `..` and `\0`; does not handle URL-encoded traversal, symlink escape, or absolute paths; `confinePath` uses `path.resolve` which follows `..` but not symlinks.
- **SSRF/transport.** `src/security/ssrf.ts` and `spawn.ts` exist (not reviewed in depth here); telemetry redacts secrets; but tool `web.ts`/`websearch-real.ts` may fetch arbitrary URLs—need verification of allowlists.
- **Data minimization gaps.** Telemetry records store provider/model/error text up to 200 chars; crash stacks stored; memory files may contain user prompts/context; no minimization or hashing.
- **No data classification labels.** Nothing distinguishes public/internal/confidential/secret; settings schema has no sensitivity metadata.
- **Backup/restore.** No export/import of VibeCode state; migration between machines is manual file copy.
- **Cross-process concurrency.** File writes (`fs.writeFileSync` for memory, onboarding, skill state) are not atomic (no temp+rename) and have no locking; concurrent VS Code windows can corrupt state.
- **Logging of prompts.** `turnsByPanel` keeps conversation history in memory only (good), but `logger` calls in extension may include prompt snippets in `data`—not verified; potential PII in logs.

## 5. Top gaps (ranked)

1. **Audit log is non-persistent and unwired** — no durable, tamper-evident audit trail for any privileged action.
2. **No account authorization enforcement in the live router** — `authorizedForFallback` not honored; allowlist never constructed.
3. **No data lifecycle controls** — no retention, export, or deletion of VibeCode state; compliance blocker.
4. **No at-rest protection for non-secret state** and non-atomic file writes.
5. **Crash redaction incomplete** (only `sk-` keys).
6. **Path confinement gaps** (`.` fallback, symlink, traversal variants).
7. **No governance UI** — admins cannot manage accounts/permissions/audit from VS Code.
8. **Telemetry consent lacks transparency** (no categories/notice).

## 6. Evidence

- `src/observability/audit.ts`: in-memory `events[]`, `clear()`; no persistence.
- `src/extension.ts`: `audit` constructed and single `activate` record; no other `audit.record` calls; `runTool` uses `?? '.'`.
- `src/providers/accounts.ts`: `AccountManager` exists but not instantiated in `extension.ts` (grep shows no `new AccountManager`).
- `src/routing/router.ts`: `decide` filters by `authorized` only; no `authorizedForFallback` check.
- `src/routing/accounts.ts`: `switchAccount` takes `allowlist` but no caller constructs one.
- `src/memory/manager.ts`: `write` uses `fs.writeFileSync` directly; no atomic write.
- `src/observability/crash.ts`: regex only `sk-[A-Za-z0-9]{10,}`.
- `src/security/paths.ts`: `isTraversal` limited.
- `src/config/settings.ts`: only `telemetry: boolean`.

No code changes were made for this review.

