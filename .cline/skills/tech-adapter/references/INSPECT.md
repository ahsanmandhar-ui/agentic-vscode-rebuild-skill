# INSPECT.md — Recon procedure
- Inputs: repo URL/local path, pinned commit, claimed license.
- Steps: fetch metadata; read README, LICENSE, manifest, entry points; list features, CLI commands, APIs, config; detect agent/MCP/plugin support.
- Output: `docs/TECH_BASELINE.md` with identity, features, license, permissions, risk, free, redistributable (candidate card).
- Evidence: cite file paths + lines. Unknowns labeled `unknown`.
