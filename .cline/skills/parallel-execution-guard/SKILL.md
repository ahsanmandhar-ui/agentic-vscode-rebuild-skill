---
name: parallel-execution-guard
description: Built-in skill to prevent conflicts when multiple AI executors run in parallel. Use when more than one Execute AI is active on a project. Enforces file ownership, locking, branch-per-task, progress reporting, and planner-only merges.
---

# Parallel Execution Guard

## Purpose
Prevent conflicts and ensure smooth multi-AI execution under a single Plan AI.

## Rules
1. **File ownership**: Planner assigns disjoint file sets per task; no two executors edit the same file.
2. **Locking**: Advisory lock at `.vibecode/locks/<path>.lock` (owner, timestamp). Stale >10 min reclaimable.
3. **Branches**: Each executor commits to `exec/<task-id>`; planner merges after review.
4. **Progress**: Executors write `progress.<task-id>.md`; planner folds into `progress.md`. Only planner writes `progress.md`.
5. **Skills**: Planner is sole assigner; executors cannot install/activate skills without approval.
6. **Accounts**: Planner authorizes account rotation; executors request via progress report.
7. **Merge**: Only planner merges; conflicts resolved by planner.
8. **Quality**: Executors provide evidence (commands/output); planner verifies independently.

## Checklist (executor)
- [ ] Read assigned plan.md section.
- [ ] Confirm file ownership; no overlap.
- [ ] Acquire locks for owned files.
- [ ] Implement + tests.
- [ ] Write progress.<task-id>.md with changed files, commands, results.
- [ ] Commit to exec/<task-id>.
- [ ] Release locks.

## Checklist (planner)
- [ ] Define task DAG with dependsOn.
- [ ] Assign owners, file sets, skills, account pools.
- [ ] Spawn executors in parallel where independent.
- [ ] Review diffs + run tests.
- [ ] Merge approved branches.
- [ ] Update progress.md.
- [ ] Honest evaluation at end.
