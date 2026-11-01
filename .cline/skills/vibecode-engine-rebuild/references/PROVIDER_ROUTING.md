# PROVIDER_ROUTING — adapters, capabilities, accounts, fallback

## 1. Ground rules

- Use official SDKs or documented HTTP APIs. Never reverse-engineer a private endpoint.
- Do not assume providers share an API. Anthropic Messages, OpenAI Chat/Responses, Gemini, and
  OpenAI-compatible local servers differ in tool-call format, streaming events, token accounting, and error
  bodies. Normalize *below* the agent, keep provider-specific code in its adapter.
- Never claim support until that adapter's contract tests pass (`references/TESTING.md` §3).
- Disclose costs: a provider that needs a paid plan, subscription, or own API key must be labeled as such
  in the UI. "Works with free tier" only if the provider documents a free tier.
- Local-first: core features must work without any always-on external server. A local
  OpenAI-compatible endpoint (LM Studio/Ollama/llama.cpp) is a first-class option.
- Router services (e.g. OmniRoute-style gateways) may be integrated **only** as a user-configured
  OpenAI-compatible base URL. Do not bundle or redistribute them; do not implement features that depend on
  their proprietary internals; verify their license before copying any code (OmniRoute is reported MIT, but
  re-verify the pinned version yourself). Do not implement or advertise account-pooling that exists to
  bypass provider limits.

## 2. Adapter interface

Implement `ProviderAdapter` from `references/ARCHITECTURE.md` §2, plus:

```ts
export interface ProviderMetadata {
  id: string; label: string; auth: 'api-key' | 'oauth' | 'none' | 'local';
  baseUrlDefault?: string; docsUrl: string;
  pricing: 'free' | 'free-tier' | 'paid' | 'own-key' | 'local' | 'unknown';
  models(): Promise<ModelInfo[]>;                 // cached, with a timestamp
  capabilities(model: string): Capability;
}
```

Contract tests per adapter (mocked HTTP; no paid calls in CI):
1. happy path text response, 2. streaming assembly equals non-streaming text, 3. tool-call round trip,
4. each error class mapped correctly (401/403→`auth_expired`, 429→`rate_limited` or `quota_exhausted` by
body inspection, 5xx→`server_transient`, network→`network`, context-length message→`context_length`),
5. abort signal cancels the request, 6. token usage parsed when present, else `unknown`,
7. response schema validation rejects malformed payloads instead of crashing.

## 3. Capability discovery — say how you know

`source: 'provider-api' | 'config' | 'documentation' | 'unknown'`. Context window and rate limits shown in
the UI must carry that source and a timestamp. Never invent percentages. If a provider exposes no quota
endpoint, display **"not reported by provider"** — not an estimate.

## 4. Error normalization → recovery strategy

| Kind | Detection | Strategy |
|---|---|---|
| `context_length` | provider error code/message | compact history (summarize older turns, keep system + last N + tool results digest) → retry same provider; only if still failing, consider a larger-context model |
| `output_limit` | finish_reason=length | continue/segment the response; reduce per-turn scope |
| `auth_expired` | 401/403, expired token | refresh via official flow / ask user to re-auth. No silent loop |
| `rate_limited` | 429 with retry-after | honor `Retry-After`; bounded backoff; queue the task; suggest waiting |
| `quota_exhausted` | 429/402 with quota body | do **not** retry; offer an authorized alternative or stop and explain |
| `server_transient` | 5xx, 529 overloaded | exponential backoff + jitter (base 1s, ×2, cap 30s, max 5, deadline) |
| `network` | DNS/ECONNRESET/timeout | short retries; then report with the failing host |
| `model_unavailable` | 404 model / deprecated | offer configured compatible fallback or let user choose |
| `unknown` | anything else | surface the redacted body + request id; do not guess |

Retry budget is per task, not per request: cap total retries and total wall time.

## 5. Account manager

Records (no secrets in them):
```ts
interface AccountRecord {
  id: string;                        // uuid
  providerId: string;
  label: string;                     // user-visible, e.g. "Work – Claude Pro"
  secretRef: string;                 // name in SecretStorage, never the value
  authKind: 'api-key' | 'oauth' | 'local';
  addedAt: string; authorizedForFallback: boolean;   // default FALSE
  status: 'ok' | 'auth_expired' | 'cooling_down' | 'quota_exhausted' | 'revoked' | 'unknown';
  cooldownUntil?: string;            // from Retry-After / reset headers only
  lastKnownLimits?: { source: 'provider-api' | 'header' | 'documentation'; at: string; note: string };
}
```

`authorizedForFallback` is set only by an explicit user action ("Allow this account as a fallback"),
persisted, and revocable. Presence of a secret is **never** authorization.

Selection: filter to same task-compatible capability (tools for agentic tasks) → status `ok` or expired-but-
refreshable → not cooling down → provider terms allow → user authorized → score by user priority →
**ask the user if the choice is not unambiguous**. Never select an account the user did not add.

Prohibited: rotating accounts to defeat rate limits, per-account free-tier caps, or billing enforcement;
creating accounts automatically; sharing one user's credentials across providers; storing one person's key
under another's label.

## 6. Switch procedure (state-preserving)

1. `CHECKPOINT`: write `progress.md` (state, plan, changed files, tests, next action) + record commit/dirty list.
2. `REASON`: record the normalized error kind + raw (redacted) message + provider request id.
3. `CANDIDATES`: enumerate eligible accounts/providers with capability match and consent state.
4. `DECIDE`: pick automatically only if policy allows and the user pre-authorized that fallback; otherwise ask.
5. `INIT`: create the adapter, verify auth with a cheap call, load model list.
6. `RESTORE`: system prompt + task plan + active skills + context files + relevant diff/state summary.
   Re-read files rather than trusting summaries.
7. `RESUME`: continue from the last verified step; state explicitly that context was rebuilt.
8. `VERIFY`: run the check that was pending.
Log every switch (from → to, reason, timestamp, consent reference) in the account audit log, no secrets.

If no eligible account exists: stop, explain the cause in user terms, offer options (wait, add a key, switch
to a local model, compact context, split the task).

## 7. Context management

- Budget: estimate `contextWindow` − reserved output − system/policy − skill text. Track with actual usage
  when reported; otherwise estimate with a transparent tokenizer heuristic and label it as an estimate.
- Compaction order: drop tool outputs beyond what the plan needs → summarize older turns → keep the plan,
  the current step, open errors, and file paths. Never drop user constraints or approval decisions.
- Persist a compaction summary in the task journal so a resumed session can rebuild context.
- Context exhaustion is a **context** problem: fix it with compaction/checkpoint, not by switching accounts
  (switching does not enlarge a window).

## 8. Provider integration checklist (per adapter)

- [ ] Adapter has zero `vscode` imports; HTTP injected via port.
- [ ] Error mapping table covered by tests with realistic bodies.
- [ ] Abort/cancel honored; no dangling streams.
- [ ] Timeouts set on every request; response size caps enforced.
- [ ] Keys read only through the secret store; never placed in URLs (query strings end up in logs/proxies).
- [ ] Auth flow documented in the UI with a link to the provider's own docs.
- [ ] Cost/pricing label shown (`free`/`free-tier`/`paid`/`own-key`/`local`), derived from the provider's docs
      at a stated date — and marked `unknown` if not verified.
- [ ] No provider-specific feature marketed as universal.
