# TESTING — levels, matrix, and the definition of "verified"

## 1. Establish a baseline first

```bash
cat package.json | node -e 'const p=require("./package.json");console.log(p.scripts)'
# then run the real script names, e.g.:
npm run compile   # or typecheck / build
npm run lint
npm test
```
Record: pass/fail counts, duration, and any pre-existing failures in `docs/BASELINE.md`. Pre-existing
failures are not your fault, but they must be named and must not grow.

## 2. Levels

| Level | Scope | Tool |
|---|---|---|
| Unit | pure core: permissions, path guard, redactor, skill schema/inspector, state machine, routing policy, context serialization | vitest/jest/mocha + fakes |
| Contract | provider adapters against mocked HTTP (nock/undici mock/msw) | same runner |
| Integration | activation, commands, webview messaging, SecretStorage round-trip | `@vscode/test-electron` + a temp profile |
| Package | VSIX builds, file list correct, installs, activates | scripted, see `references/RELEASE.md` |

Target: core security/skill/routing modules ≥ 80% line coverage; overall ≥ 60%. Coverage is a smoke
detector, not a goal — a security function with 100% coverage but no adversarial cases is worthless.

## 3. Required test matrix

Extension lifecycle
- activates with no workspace open; activates with an untrusted workspace; deactivate flushes checkpoints
- every contributed command runs and is registered in `package.json` (enumerate `contributes.commands` and
  assert each id executes without throwing)

State machine
- every allowed transition works; every disallowed transition throws; cancel from each active state;
  double-cancel is idempotent; no tool executes after cancel

Permissions
- each action kind hits its default decision; denial is sticky; `once` vs `session` vs `workspace` scopes;
  model cannot self-approve; audit entries written and redacted

Path guard
- the 12-case table in `references/SECURITY.md` §6, plus Windows-style paths and symlink fixtures

Secrets
- store/read/delete/rotate via the abstraction; nothing lands in globalState/settings/logs/context files;
  redactor strips every documented pattern; UI projection excludes values

Skills
- valid manifest parses; each invalid field rejected with a specific error
- inspector flags each rule in `references/SKILL_FORMAT.md` §6 (one fixture per rule)
- install of a script-bearing skill performs zero exec calls
- approval without activation, activation without permission grant, checksum mismatch → quarantine
- discovery precedence: workspace overrides user overrides bundled; name collision detection
- import from a Cline-format skill loses no instructions and reports dropped keys

Routing & accounts
- every error class maps to the right kind (realistic status+body fixtures)
- backoff is bounded and respects `Retry-After`; total retry budget enforced
- context_length triggers compaction before any switch
- unauthorized account is never selected; cooling-down account skipped; no eligible → explains why
- switch preserves task state: checkpoint written, context restored, resume point correct
- abort cancels the in-flight request; no unhandled rejection

Context persistence
- plan/progress/structure written atomically (simulate crash between temp write and rename)
- user sections preserved byte-for-byte; secrets never written; size caps enforced
- resume compares notes to repo and reports drift

Injection & robustness
- repo file containing an injection payload causes no privileged action and produces a warning
- provider returning malformed JSON / unexpected schema → structured error, no crash
- oversized tool output truncated; zombie process killed on cancel; unhandled-rejection guard active

Packaging
- `vsce package` succeeds; archive contains `extension.js`/entry, `package.json`, icon, media, no `src/`,
  no tests, no `.env`, no node_modules dev trees; `engines.vscode` satisfied by the test profile

## 4. Rules of evidence

- Paste the real command output tail in the milestone report. "Tests pass" without output is `ATTEMPTED`.
- Never delete/skip/weaken a test to get green. If a test is wrong, fix it and say why.
- Every M1-reproduced bug gets a regression test that fails before the fix (verify by reverting locally or
  by writing the test first).
- No real API keys in tests; no paid calls in CI. Mock providers; if a live check is genuinely needed, ask
  the user and use the cheapest possible request, and never in the automated suite.
- Flaky test → fix the flakiness source or quarantine with an issue note; don't retry-until-green.
- Tests must not depend on the developer's machine state (home dir, global settings, installed skills).

## 5. Manual smoke script (run after packaging)

1. Install into an isolated profile → reload → extension activates, no error notification.
2. Home screen renders with real detected values (no placeholder text).
3. Configure a provider key → key stored → status shows authenticated → restart VS Code → still authenticated
   and the key is not visible anywhere in the UI, settings, or logs.
4. Run a small task against a mocked or local provider: plan appears, an edit is proposed, permission prompt
   fires, approval executes, diff summary appears, verification step runs.
5. Cancel mid-task → nothing partial is left; task state is `CANCELLED`; journal written.
6. Skills: inspect a candidate → see source/license/permissions/risks → decline → verify nothing installed.
7. Switch provider mid-task with a checkpoint → context restored, work continues.
8. Upgrade path: install previous version first, then the new VSIX over it; settings, commands, and stored
   key survive; changelog visible.
9. Diagnostics screen shows real, redacted logs.
