# REVERSE_ENGINEER.md
Phases (each writes chunks/R<n>.md with observations/inferences/unknowns + evidence):
- R1 Structure: tree, modules, entry points, config.
- R2 Features: user-facing capabilities, commands, APIs.
- R3 Data flow: inputs → outputs, side effects.
- R4 Agents: if supported — spawn, tool use, memory, permissions.
- R5 Integration: MCP, plugins, hooks, CLI.
Staged workflow: smallest useful overview → follow questions → corroborate → decompose → parallel workers → finding ledger → revisit checklist. Use REA for shipped artifacts; normal repo tools for source.
