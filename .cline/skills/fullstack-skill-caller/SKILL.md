---
name: fullstack-skill-caller
description: Inspects a task and the available skill catalog, then plans phases/chunks and assigns the best-fit skill to each portion (e.g. UI, backend, data, tests). Use when a task spans multiple domains and needs skill orchestration.
version: 0.1.0
license: MIT
source: local
maintainer: VibeCode <local>
requires: [read]
permissions:
  fs: [read:workspace]
  exec: false
  network: []
  secrets: false
tags: [orchestration, planning, skills, fullstack, phases]
activation: auto
precedence: 5
conflicts_with: []
format_version: 1
---

# Purpose

Decompose a multi-domain task into ordered phases/chunks and select the best-fit skill for each portion, so the agent activates only the skills that actually apply to that slice. This skill never grants permissions; it only recommends activations.

# Activation Conditions

When: a task touches more than one domain (UI + API + data + tests), or the user asks "which skills should I use", or planning a feature end-to-end. Not when: a single, clearly-scoped task that one skill already covers.

# Workflow

1. Parse the task into atomic deliverables (UI, data model, API, state, tests, docs, design).
2. Enumerate candidate skills from the catalog (built-in + workspace + user) whose tags/description match each deliverable.
3. Score each candidate per deliverable: tag overlap, description intent match, specificity (exact > broad), precedence, source trust (workspace > user > bundled).
4. Group deliverables into phases (e.g. Design → Scaffold → Implement → Verify) with stop conditions.
5. For each phase, pick the top skill (activate ≤ 3 total concurrently) and list the runner-up alternatives with rationale.
6. Emit a plan: phase list, skill per phase, activation order, and conflicts (skills that must not co-activate, e.g. review/release gates during edits).
7. On approval, activate the chosen skills in order; deactivate when a phase ends.

# Permissions

- fs: read:workspace — to inspect repo signals (framework files, extensions) for skill ranking. No writes, no exec, no network, no secrets.

# Validation

- Plan lists every deliverable with an assigned skill or an explicit "no skill — manual" note.
- No more than 3 skills active at once; review/release-gate skills excluded during in-progress edit phases.
- Score vector logged for each recommendation.

# Failure modes

- No matching skill for a deliverable → mark "manual / no skill" and continue; do not invent a skill.
- Catalog unavailable → fall back to keyword matching on skill names only; flag reduced confidence.
- Conflicting skills → prefer higher precedence + workspace source; note the conflict.

# References

- .cline/skills/vibecode-engine-rebuild/references/BUILTIN_SKILLS.md — bundled skill catalog and stage order.
- Skill scoring rules: .cline/skills/vibecode-engine-rebuild/references/SKILL_FORMAT.md §5 (Discovery/Ranking).

# Example segmentation (UI)

Design phase: design, design-system, pick-ui-library, ui-ux-pro-max, brand, banner-design
Implementation: ui-styling, mobile-native, windows-app-builder, apple-design, emil-design-eng
Motion: animate, animate-expo, animation-performance, animation-vocabulary, find-animation-opportunities, improve-animations, review-animations
Assets: figure-generation, slides, slide-generation, excalidraw-skill, break-ui
Verification: review-animations, ui-ux-pro-max
