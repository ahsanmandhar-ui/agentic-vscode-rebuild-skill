# RELEASE — versioning, packaging, upgrade verification

## 1. Never change identity

`"publisher": "AhsanMandhar"`, `"name": "vibecode-engine-pro-free"` stay. Changing either publishes a new
extension and abandons existing installs, their settings, and their stored secrets. Only `version` moves.

## 2. Version bump

Semver for VS Code extensions carries a marketplace meaning:
- **patch** — fixes, no new behavior/settings.
- **minor** — additive features (new screens, skills, providers) that keep existing settings and commands.
- **major** — removals/renames, settings key changes, breaking provider config changes.

Rules: `version` in `package.json` is the single source of truth; the VSIX filename derives from it; the
CHANGELOG's top entry must match; never reuse a version already published (the marketplace rejects/reorders
it). Preserve `engines.vscode` unless you deliberately raise the floor — raising it drops users on older
VS Code, so state the impact in the changelog. Add a `globalState` migration flag for any settings-key
rename (e.g. `migrations.v1_5_settingsKeys = true`) and run it once in `activate()`.

## 3. Pre-package validation

```bash
npm ci                 # or pnpm i --frozen-lockfile — use what the lockfile says
npm run compile        # / typecheck / build  (real script name)
npm run lint
npm test
node -e 'const p=require("./package.json");const ok=["name","publisher","version","engines","main"].every(k=>k in p);console.log(ok?"manifest ok":"manifest MISSING FIELDS",p.version,p.engines.vscode)'
git status --short     # know exactly what is going into the build
```

Manifest checks: `main` path exists after build; `icon` path exists and is PNG ≥128×128 (marketplace wants
128×128; the file must be included by `.vscodeignore` rules); every `contributes.commands[].command` has a
handler registered; every referenced `media/` file exists; `activationEvents` correct (auto-generated for
`onCommand`/`onView` in modern VS Code, but check `engines.vscode` compatibility); `dependencies` are
production-only (bundle with esbuild to keep the VSIX small); no `postinstall` scripts that do network work.

## 4. Package

```bash
npx @vscode/vsce package --out dist/vibecode-engine-pro-free-<version>.vsix
# or, if the repo already has it:
npm run package
```
Rebuild the filename from the manifest, don't hardcode:
```bash
VER=$(node -p "require('./package.json').version")
npx @vscode/vsce package --out "dist/vibecode-engine-pro-free-$VER.vsix"
```

Verify the artifact rather than trusting the exit code:
```bash
ls -l "dist/vibecode-engine-pro-free-$VER.vsix"
unzip -l "dist/vibecode-engine-pro-free-$VER.vsix" | head -40
npx @vscode/vsce ls | head -40            # what vsce thinks it will ship
unzip -p "dist/…$VER.vsix" extension/package.json | head -20   # identity + version inside the package
```
Fail conditions: entry point missing, `src/` or tests included, the old version string inside the archive,
secret/`.env` files included, icon missing, size jumped unexpectedly (check for accidentally bundled
node_modules).

## 5. Install verification in an isolated profile

Do not touch the developer's real installation.

```bash
TMP=$(mktemp -d)
code --user-data-dir "$TMP/ud" --extensions-dir "$TMP/ext" --install-extension "dist/vibecode-engine-pro-free-$VER.vsix" --force
code --user-data-dir "$TMP/ud" --extensions-dir "$TMP/ext" --list-extensions --show-versions
```
Headless VS Code may not be installed in a sandbox: if `code` is unavailable, say `install test: BLOCKED
(no VS Code binary in this environment)` and instead validate structurally (archive listing + manifest
parse + `vsce ls`). Do not claim an install test you did not run.

## 6. Upgrade test (the one people skip)

1. Install the **previous** version into the isolated profile (download the published `.vsix` if available,
   or build from the previous tag).
2. Set a few settings and store a test API key.
3. Install the new VSIX over it (`--force`), start VS Code.
4. Verify: extension activates without errors; the stored key is still readable through SecretStorage;
   existing settings keys still apply (or were migrated); command ids unchanged; webview state restores;
   no duplicate extension folders; downgrade-to-old-version is possible if needed.

If the previous version cannot be obtained, record `upgrade test: PARTIAL — reason` and at minimum assert
that settings keys and command ids are a superset of the published manifest (`references/REPO_AUDIT.md` §5).

## 7. Licensing and notices

- Root `LICENSE` present and consistent with `package.json`. Add `THIRD_PARTY_NOTICES.md` generated from
  production dependencies (`npx license-checker --production --summary` or `licensee`).
- No GPL/AGPL/shared-source (SSPL, BUSL) code in a distributed VSIX without understanding the obligations —
  flag any such dependency to the user before packaging. Never copy code from Claude Code, Codex, OmniRoute,
  Ponytail, or any other project without verifying the license and keeping the required notices; ideas and
  independently written implementations are fine, copied source is not.
- Bundled skills carry their own `license` field; bundled third-party assets need attribution.

## 8. Publishing (only with explicit authorization)

Not part of the default workflow. If and only if the user says publish:
`npx @vscode/vsce publish --packagePath dist/<file>.vsix` with a PAT they provide out-of-band (never paste a
token into chat or a file). Before that: version already bumped, CHANGELOG entry written, README accurate,
`vsce ls` clean, install tested. Publishing is irreversible in practice — confirm the version number with
the user in writing.

## 9. Release report

```
ARTIFACT: dist/vibecode-engine-pro-free-<ver>.vsix (<size>)
MANIFEST: publisher AhsanMandhar · version <ver> · engines ^<x> · main <path>
CHECKS:  compile OK | lint OK | tests <n> passed <m> failed | vsce ls clean
INSTALL: tested in isolated profile (VS Code <ver>) → activation OK / BLOCKED (reason)
UPGRADE: previous <ver> → new <ver> → settings/secrets preserved: yes/no/partial (why)
NOTICES: LICENSE + THIRD_PARTY_NOTICES present
PUBLISHED: no (unauthorized)
LIMITATIONS: <explicit list>
```
