# REPO_AUDIT — Reconnaissance procedure (Milestone 1)

Goal: a **baseline report of facts**, produced before any design or edit. Budget: targeted reads. Do not
dump the repo into context.

## 1. Read-only commands (run these first, in this order)

```bash
pwd && git rev-parse --show-toplevel && git branch --show-current && git status --short
git log --oneline -15
cat package.json
ls -la                      # lockfile present? .vscodeignore? tsconfig? bundler?
node -v; npm -v; (pnpm -v; yarn -v) 2>/dev/null
```

Then, only as needed:

```bash
rg -n '"engines"|"activationEvents"|"contributes"|"scripts"' package.json
rg --files -g '!node_modules' -g '!dist' -g '!out' | head -200
rg -n 'activate\(|deactivate\(' src --glob '*.ts' | head
rg -n 'SecretStorage|context\.secrets|globalState|workspaceState|settings\.json' src
rg -n 'apiKey|api_key|token|Authorization|Bearer' src --glob '*.ts' -l
rg -n 'child_process|exec\(|execSync|spawn\(|shell:|terminal\.sendText' src
rg -n 'acquireVsCodeApi|postMessage|onDidReceiveMessage|webview\.asWebviewUri|localResourceRoots' src
rg -n 'fetch\(|https?://' src --glob '*.ts' | head -40
rg -n 'skill|SKILL\.md|provider|router|model' src --glob '*.ts' -l
rg --files -g '*test*' -g '*spec*' -g '!node_modules'
```

If `rg` is unavailable, use `grep -rn`. Never run install/build commands in M1 until you know whether
they mutate lockfiles; record the baseline test result **before** any dependency change.

## 2. What to record for each area

| Area | Read | Record |
|---|---|---|
| Manifest | `package.json` | name, publisher, version, engines.vscode, main, activationEvents, contributes (commands, views, menus, config), icon, categories, dependencies vs devDependencies |
| Toolchain | lockfile, `tsconfig.json`, `esbuild`/`webpack`/`tsup` config, `.vscodeignore`, `.vscode/tasks.json`, `.github/workflows` | package manager + version, build command, out dir, packaging inclusions/exclusions, CI steps |
| Entry point | `src/extension.ts` (or `main`) | activation cost, subscriptions disposal, top-level try/catch, error surfaces |
| Webview | webview sources, HTML/CSS/JS, CSP | CSP present? `localResourceRoots`? inlined scripts? message protocol versioned? state persistence? |
| Providers | provider client modules | endpoints, auth style (key/OAuth/local), streaming, tool-calling, retries, error types, model lists (hard-coded?) |
| Accounts | switch/selection logic | what triggers a switch, whether authorization is recorded, whether context is preserved, whether it evades limits |
| Skills | any existing skill/manifest code | format, storage paths, validation, approval state, checksum, activation rules |
| Secrets | all credential reads/writes | storage mechanism per call site; any key in settings/state/logs → **finding** |
| Tools/agent | command execution, file edits, tool registry | argument handling, shell vs spawn, workspace containment, approval prompts, cancellation |
| Tests | test files + scripts | framework, runnable?, coverage areas, mocked providers |
| Docs | README, CHANGELOG | claimed features vs implemented features (mismatch = finding) |
| Assets | `media/`, `icon`, logo | current icon path referenced by manifest, dimensions, transparency, existing briefs |
| Licensing | `LICENSE`, dependency licenses | project license; copyleft/shared-source deps that affect redistribution (`references/RELEASE.md` §7) |

## 3. Reproduce failures

For each suspected bug: minimal reproduction (command, click path, or provider mock), expected vs actual,
and a classification:

- `REPRODUCED` — with exact steps + output.
- `SUSPECTED` — code evidence only (cite file:line).
- `NOT REPRODUCIBLE` — tried X, Y; environment differs.
- `BLOCKED` — needs credentials/hardware; state what is missing.

Never mark `REPRODUCED` from reading code. Never spend paid API budget to reproduce; mock the provider.

## 4. Baseline report (write to `docs/BASELINE.md`)

```markdown
# Baseline — <date> · commit <sha> · version <pkg version>
## Environment
## Architecture as found (3–10 bullets, factual)
## Confirmed bugs            (R-xx, symptom, evidence, severity)
## Likely bugs               (S-xx, evidence, what would confirm it)
## Security findings        (SEC-xx, file:line, impact, CWE/CVSS-ish severity)
## Missing features vs README claims
## Must-preserve functionality (user-visible behaviors + settings keys + command ids)
## Dependency & engine risks (outdated, deprecated, engines mismatch)
## Build/packaging problems
## Blocked / unknown items
```

**Preserve list is contractual.** Each entry: user-visible behavior, where implemented, how it will be
verified after changes. Removing one requires explicit approval quoted in `progress.md`.

## 5. Compatibility with the published version

Fetch the published version metadata (Marketplace API or the listing page) and record: published version,
`engines.vscode`, activation events, contributed command ids and settings keys. These are the upgrade
contract: existing users' settings keys and command ids must keep working (or be migrated in
`activation` with a documented `globalState` migration flag).

```bash
curl -s 'https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery' \
  -H 'Content-Type: application/json' -H 'Accept: application/json;api-version=7.2-preview.1' \
  -d '{"filters":[{"criteria":[{"filterType":7,"value":"AhsanMandhar.vibecode-engine-pro-free"}]}],"flags":103}' \
  | head -c 2000
```

Offline/marketplace-blocked → write `published version: unknown` and continue; do not guess.
