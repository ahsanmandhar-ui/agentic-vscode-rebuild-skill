# Structure

<!-- vibecode:managed:start -->
Updated: 2026-10-31 · generated from workspace state (no git repo present) + I8 release (extension 0.1.14)

## Tree (deliverable only)
```
.
├── .cline/skills/vibecode-engine-rebuild/
│   ├── SKILL.md                      # the skill: workflow, gates, refusals, report format
│   └── references/
│       ├── REPO_AUDIT.md             # M1 recon procedure + baseline report format
│       ├── ARCHITECTURE.md           # layering, types, state machine, preservation rules, memory schema
│       ├── SECURITY.md               # threat model, permissions, path table, security review gate
│       ├── SKILL_FORMAT.md           # canonical skill format, storage, lifecycle, inspector rules
│       ├── PROVIDER_ROUTING.md       # adapters, error normalization, accounts, switch procedure
│       ├── TESTING.md                # test matrix + rules of evidence
│       ├── RELEASE.md                # versioning, vsce packaging, install/upgrade verification
│       ├── UI_SPEC.md                # screens, states, protocol, accessibility, acceptance checks
│       └── BUILTIN_SKILLS.md         # 14 bundled skill specs + authoring template
├── .clinerules/vibecode-engine-rebuild.md   # always-on condensed fallback rule
├── design/
│   ├── LOGO_BRIEF.md                 # geometry, palette, deliverables, generation prompt, checklist
│   └── preview.png                   # legibility contact sheet (16/24/48/128, light + dark)
├── media/logo/
│   ├── activity-bar.svg              # 24px monochrome, currentColor
│   ├── icon.svg / icon-light.svg     # 128px colour mark variants
│   ├── icon-dark-on-navy.svg         # app-icon plate variant
│   ├── icon-128.png / icon-256.png   # manifest + marketplace icon
│   ├── mark-dark.png / mark-light.png/ activity-bar-mono.png
│   └── welcome.svg                   # lockup for the welcome screen
├── tools/
│   ├── make_assets.py                # deterministic rasteriser for the mark
│   └── validate_skill.py             # package validator (exit 1 on any FAIL)
├── docs/
│   ├── ASSUMPTIONS.md               # open questions + sources for research-based claims
│   ├── HONEST_EVALUATION.md         # verified vs unverified, risks, next actions
│   └── PLAN_CLOSE_RUNTIME_GAP.md    # Phases A–F plan to close runtime verification gap
├── index.html                        # self-contained overview of the package
├── plan.md / progress.md / structure.md
└── README.md
```

## Entry points / activation flow
Cline startup → scans `~/.cline/skills/` and `<workspace>/.cline/skills/` → indexes `name` + `description`
→ user request matches the description → full `SKILL.md` loaded → references loaded per milestone.
Fallback: `.clinerules/*.md` are applied as always-on rules when Skills are disabled.

## Modules & responsibilities
- `SKILL.md` — the operating procedure an agent follows (single source of behavioural truth).
- `references/` — deep specs, loaded on demand; each owns one concern.
- `tools/validate_skill.py` — machine gate on the package's own quality claims.
- `tools/make_assets.py` — reproducible brand assets.

## Key types & interfaces (target extension, specified in references)
`TaskState`, `ProviderAdapter`, `AgentEvent`, `ProviderErrorKind`, `PermissionRequest`, `AccountRecord`,
`SkillSource`, `SkillState`, `Capability` — defined in `references/ARCHITECTURE.md` §2 and
`references/PROVIDER_ROUTING.md` §5.

## Provider / skill / permission architecture
- Providers: adapter per API, injected HTTP port, normalized errors, contract tests (PROVIDER_ROUTING §2–4).
- Skills: discover → validate → inspect → approve → install → enable → select → activate, with inspection,
  approval, activation and tool authorization kept strictly separate (SKILL_FORMAT §3, §7).
- Permissions: policy in code, per-action scopes, deny-by-default outside a small allowlist (SECURITY §4).

## Configuration locations (extension, planned)
`SecretStorage` for keys · `<globalStorage>/skills/` + `skill-state.json` · `<globalStorage>/tasks/*.jsonl`
journals · `<globalStorage>/checkpoints/` · workspace `.vibecode/skills` + `.vibecode/config.json` ·
bundled `<extension>/skills/`.

## Build / test / package commands (to be confirmed against the extension repo)
`npm ci` → `npm run compile` → `npm run lint` → `npm test` →
`npx @vscode/vsce package --out dist/vibecode-engine-pro-free-<version>.vsix` → isolated-profile install.

## Important dependencies
Cline ≥ 3.48 (skills) · Node + TypeScript toolchain from the extension repo · `@vscode/vsce` · Python 3 +
Pillow for asset generation · `cairosvg` optional for SVG verification only.

## Module relationships
```
user request → SKILL.md (procedure)
                 ├─ references/REPO_AUDIT.md      (what to inspect)
                 ├─ references/ARCHITECTURE.md    (what to build)
                 ├─ references/SECURITY.md ──────┐(constraints on everything)
                 ├─ references/SKILL_FORMAT.md ──┤
                 ├─ references/PROVIDER_ROUTING.md
                 ├─ references/UI_SPEC.md
                 ├─ references/BUILTIN_SKILLS.md
                 ├─ references/TESTING.md ───────┐(proof gates)
                 └─ references/RELEASE.md ───────┘
tools/validate_skill.py → gates this package
```

## Checkpoint
Phase A (tooling) complete; Phases B-E complete (tsc exit 0, vitest 100+2 pass, VSIX 0.1.14 packaged & verified: 210 files, 413 KB); Phase F updates checkpoints; host activation previously exit 0 (this run environment-blocked). No git repo; checkpoint = this file + plan.md + progress.md.
<!-- vibecode:managed:end -->

