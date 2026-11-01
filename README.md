# 🚀 Agentic VS Code Rebuild Skill

<p align="center">
  <img src="media/logo/icon-128.png" alt="logo" width="128" />
</p>

<p align="center">
  <strong>A Cline skill package that drives a secure, evidence-based rebuild of a VS Code extension.</strong><br/>
  INSPECT → DIAGNOSE → PLAN → APPROVE → IMPLEMENT → TEST → PACKAGE → VERIFY
</p>

<p align="center">
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/license-MIT-green" /></a>
  <img alt="Skills" src="https://img.shields.io/badge/bundled%20skills-14-blue" />
  <img alt="Mermaid" src="https://img.shields.io/badge/diagrams-Mermaid-ff3670" />
</p>

---

## 🔄 Rebuild Workflow

```mermaid
flowchart LR
    A[INSPECT] --> B[DIAGNOSE]
    B --> C[PLAN]
    C --> D{APPROVE}
    D -->|no| C
    D -->|yes| E[IMPLEMENT]
    E --> F[TEST]
    F --> G[PACKAGE]
    G --> H[VERIFY]
    H -->|fail| E
    H -->|pass| I[RELEASE]
```

---

## 🧠 Skill Activation Stages

```mermaid
flowchart TD
    S1[1. security-permission-inspector] --> S2[2. skill-inspector-validator]
    S2 --> S3[3. task-planner]
    S3 --> S4[4. context-recovery]
    S4 --> S5[5. resource-aware-execution]
    S5 --> R[Rest by task]
    R --> G1[git-change-review]
    R --> G2[dependency-license-audit]
    R --> G3[vsix-release]
    style G1 fill:#f96
    style G2 fill:#f96
    style G3 fill:#f96
```

> Red nodes are **review/release gates** — never auto-activate alongside an in-progress edit.

---

## 🏗️ Architecture

```mermaid
flowchart TB
    subgraph Core[Core - no vscode imports]
        SEC[security]
        SK[skills]
        RT[routing]
        AG[agent]
    end
    subgraph Adapters[Adapters]
        VS[vscode host]
        HTTP[http port]
        FS[fs port]
    end
    Core --> Adapters
    SEC --> SK
    SK --> RT
    RT --> AG
```

---

## 📦 Bundled Skills (14)

Each skill is an instruction bundle that runs inside the permission engine and grants no permissions.

### 1. security-permission-inspector
> **Audits a proposed action, skill, or dependency for security impact and explains it in plain language before approval.**
- needs: `read`, `network:docs` · risk: **low**

### 2. skill-inspector-validator
> **Validates a candidate skill's metadata and scans its content for dangerous patterns before installation.**
- needs: `read` · risk: **low**

### 3. task-planner
> **Decomposes a user request into verifiable steps with acceptance criteria and a checkpoint plan.**
- needs: `read` · risk: **low**

### 4. context-recovery
> **Rebuilds working state from plan.md/progress.md/structure.md, git state, and open errors after an interruption or provider switch.**
- needs: `read`, `git` · risk: **low**

### 5. structure-analyzer
> **Maps the repository layout, entry points, and build/test commands into structure.md.**
- needs: `read` · risk: **low**

### 6. codebase-explorer
> **Answers "where is X" questions with targeted searches instead of dumping files.**
- needs: `read` · risk: **low**


### 7. error-diagnoser
> **Diagnoses build/test/runtime failures; produces a reproduction before a fix.**
- needs: `read`, `exec:test` · risk: **medium**

### 8. test-verifier
> **Runs the project's test/lint/typecheck commands and reports evidence-backed results.**
- needs: `exec:test` · risk: **medium**

### 9. git-change-review
> **Reviews the diff for scope creep, accidental deletions, secrets, and untested paths.**
- needs: `read`, `git` · risk: **medium** · *review gate*

### 10. docs-maintainer
> **Updates README/CHANGELOG/context files to match actual behavior.**
- needs: `read`, `write:docs` · risk: **medium**

### 11. dependency-license-audit
> **Checks new/updated dependencies for license compatibility, size, maintenance, and postinstall risk.**
- needs: `read`, `network:registries` · risk: **medium** · *review gate*

### 12. vsix-release
> **Runs compile/lint/test, packages, inspects the archive, and documents install/upgrade verification.**
- needs: `exec:build`, `write:dist` · risk: **high** · *release gate*

### 13. provider-capability-assessor
> **Determines which provider/model can serve a task given detected capabilities, cost, and context needs.**
- needs: `read`, `network:provider` · risk: **low**

### 14. resource-aware-execution
> **Chooses the cheapest correct execution strategy given the system assessment and remaining budget.**
- needs: `read` · risk: **low**

---

## 🔌 Provider Routing

```mermaid
flowchart LR
    REQ[Request] --> CAP{Capability check}
    CAP -->|ok| P[Provider adapter]
    CAP -->|fail| FB[Fallback chain]
    FB --> P
    P --> NORM[Normalized error]
    NORM -->|retry| P
    NORM -->|done| RES[Result]
```

---

## 📥 Install the skill

```bash
mkdir -p <repo>/.cline/skills
cp -r .cline/skills/agentic-vscode-rebuild <repo>/.cline/skills/
```

Then in VS Code: **Settings → Features → Enable Skills**.

## 🧪 Validate

```bash
python tools/validate_skill.py   # exit 0 = OK
```

---

<p align="center">Built with care · <a href="https://github.com/ahsanmandhar-ui">ahsanmandhar-ui</a></p>
