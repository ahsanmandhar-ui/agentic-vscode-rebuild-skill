---
name: quality-execution
description: Use when a task is too large to complete in one pass — quality work that must be divided into chunks, each chunk into smaller chunks, until every chunk meets the standard demand. Also use when resuming interrupted quality work or when a previous attempt left partial results.
version: 0.1.0
license: MIT
---

# Quality Execution — chunk until standard met

Operational skill for delivering high-quality work by recursive chunking. No task is too large if divided
into verifiable chunks. Every chunk must meet the standard demand before the next begins.

## 0. Non-negotiables
- Quality over speed. A chunk that does not meet standard is not done.
- Every chunk has a verifiable acceptance criterion and evidence (VERIFIED label).
- If a chunk cannot be completed in one pass, divide it into sub-chunks; repeat until atomic.
- Never skip a gate. Never weaken a test to go green.
- Track progress in `progress.md` and plan in `plan.md` for every chunk.

## 1. Chunking method
1. Define the standard demand for the whole task (acceptance criteria, evidence).
2. Divide into top-level chunks (phases). Each chunk must be independently verifiable.
3. If a chunk is too large or uncertain, divide it into sub-chunks. Repeat until each sub-chunk is atomic (can be completed and verified in one pass).
4. Execute one chunk at a time: implement → test → verify → record evidence → commit.
5. If a chunk fails verification, do not proceed; fix or further divide.
6. Update `progress.md` after every chunk. Update `plan.md` when scope changes.

## 2. Chunk size guide
- Atomic chunk: completable + verifiable in one session, ≤ ~200 lines of change or one focused concern.
- If larger: split by concern (security, UX, tooling, protocols, etc.) or by file/module.
- If uncertain: split by risk (high-risk first, isolated).

## 3. Evidence labels
RECOMMENDATION / APPROVED / ATTEMPTED / VERIFIED. Generated code is never VERIFIED. A chunk is done only when VERIFIED.

## 4. Progress tracking
- `plan.md`: current chunk, remaining chunks, acceptance criteria.
- `progress.md`: completed chunks with evidence, blocked items, next action.
- `structure.md`: module map (update when structure changes).

## 5. Recovery
- On failure: preserve evidence (docs/incidents/), prefer revert-and-reapply-small, re-run failing check.
- Never `git reset --hard` on user changes; never delete node_modules/lockfiles/dist as first resort.

## 6. Final report (per chunk and whole)
```
CHUNK: <id> — <title>
STATUS: VERIFIED / BLOCKED / PARTIAL
EVIDENCE: <command output / test result>
NEXT: <single recommended next action>
```

## Reference loading table
| Concern | Reference |
|---|---|
| Chunking | this file |
| Quality gates | TESTING.md (from vibecode skill) |
| Security | SECURITY.md |
| Architecture | ARCHITECTURE.md |

## Completion criteria
- [ ] Every chunk VERIFIED or explicitly BLOCKED with reason.
- [ ] plan.md and progress.md reconciled.
- [ ] No weakened tests.
- [ ] Final report produced.
