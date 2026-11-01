# Plan: Incremental Full-Stack Implementation (No Destructive Packaging)

## Principle
- **Never remove existing working material.** Always build on top of the base structure (`out/` + `media/` + `package.json`).
- `main` stays `./out/extension.js`. Compile with `tsc` (outputs to `out/`).
- Package includes `out/` (base) + new modules. Do NOT switch to bundle-only packaging.
- Each chunk: implement → test (tsc + vitest) → package → install → verify. Never claim complete until verified.

## Phases & Skills (≤3 active per phase)

| Phase | Deliverables | Top skill | Runner-ups | Stop condition |
|---|---|---|---|---|
| P0 Inspect | baseline, gaps, audit stubs | vibecode-engine-rebuild | code-debugging | tsc/vitest baseline recorded |
| P1 Design | tabs layout, tokens, typography, animations | design-system | design, ui-ux-pro-max, pick-ui-library | design tokens + tab CSS applied |
| P2 UI tabs | chat/agent/models/skills/search/diag/settings/supervisor/context/plan panels wired | ui-styling | emil-design-eng, windows-app-builder | all panels render + tabs switch |
| P3 Motion | fade/slide/pulse, reduced-motion, hover/focus | animate | animation-vocabulary, improve-animations, review-animations | animations applied, a11y ok |
| P4 Backend | wire chat/agent/models/search/diag/settings/supervisor/context/plan to host | vibecode-engine-rebuild | code-debugging | commands functional |
| P5 Tests | unit + render + host smoke | test-scenarios | code-debugging | all pass |
| P6 Package | tsc compile, vsix (keep out/), install | vibecode-engine-rebuild | — | vsix installed, exit 0 |
| P7 Verify | host activation in isolated profile | vibecode-engine-rebuild | — | host smoke pass |

## Activation order
1. P0: vibecode-engine-rebuild (inspect).
2. P1: design-system (+ design, ui-ux-pro-max).
3. P2: ui-styling (+ emil-design-eng).
4. P3: animate (+ animation-vocabulary).
5. P4: vibecode-engine-rebuild.
6. P5: test-scenarios.
7. P6: vibecode-engine-rebuild (package).
8. P7: vibecode-engine-rebuild (verify).

## Conflicts
- Review/release-gate skills must NOT be active during P2–P5 edits.
- ≤3 skills active at once.

## Current state (verified 0.1.44)
- tsc exit 0; vitest 154 passed + 2 skipped (20 files).
- Sidebar + tabs + CSS + chat streaming + agent loop + model config + buttons wired.
- Packaged with out/ preserved (236 files, 437KB).

## Next single action
Start P1 (Design): apply design tokens + tab CSS + typography. Already partially done (0.1.25). Verify and refine.

**Awaiting your approval to proceed with P1. Say "approve" and I'll start.**
