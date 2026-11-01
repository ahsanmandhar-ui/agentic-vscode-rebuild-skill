# Complete Plan: Download, Inspect, and Integrate Open-Source Code into VibeCode Engine

## 0. Licensing (updated)
- All 4 repos are Apache-2.0. VibeCode is MIT.
- Apache-2.0 is compatible with MIT for redistribution IF:
  - LICENSE file retained in vendored subtree.
  - NOTICE file preserved (or created) with attribution.
  - Modified files marked as derived.
  - No trademarks/logos reused.
- We will give credit in LICENSE/NOTICE. No vendoring without attribution.
- Commercial tiers (aisix Enterprise/Cloud) still out of scope.

## 1. Strategy
- Clone each repo into a separate folder under `C:\Users\Ahsan543\Desktop\os-repos\` (already inspected).
- Inspect code structure, extract reusable modules.
- Adapt (not copy verbatim) into VibeCode Engine's TypeScript/VS Code extension.
- Mark all derived files with header comment: `// Derived from <repo> (<license>) — see NOTICE`.
- Keep LICENSE/NOTICE in `third_party/` directory.
- Add attribution to README and package.json.

## 2. Repos to download
1. dirac-run/dirac → `os-repos/dirac-src/`
2. kodelydev/kodely → `os-repos/kodely-src/`
3. vllm-project/semantic-router → `os-repos/semantic-router-src/`
4. api7/aisix → `os-repos/aisix-src/`

## 3. Download & inspect phases

### Phase D1 — Download & pin
- D1.1 Clone each repo at a pinned commit.
- D1.2 Verify license (LICENSE + NOTICE) present.
- D1.3 Record commit hashes in `docs/THIRD_PARTY.md`.

### Phase D2 — Inspect & map
- D2.1 For each repo, map features to VibeCode modules (using CANDIDATES.md).
- D2.2 Identify reusable modules (hash-anchored edits, sliding window, MCP marketplace, guardrail chain, config snapshots, etc.).
- D2.3 Document adaptation plan per module.

### Phase D3 — Adapt & integrate (by chunk)
- Use the 47 VC chunks from CANDIDATES.md, prioritized P0→P3.
- Each chunk: adapt code, add attribution, compile, test.

### Phase D4 — Security & license audit
- D4.1 Secret scan all vendored/adapted code.
- D4.2 SSRF/network audit.
- D4.3 License attribution check (LICENSE/NOTICE present).
- D4.4 Trademark check (no logos reused).

### Phase D5 — Test & package
- D5.1 Unit tests for all adapted modules.
- D5.2 Host smoke test.
- D5.3 Provider smoke (if keys).
- D5.4 Package VSIX + verify.
- D5.5 Update docs.

## 4. Agent assignments
- Master: coordinate all.
- Download agent: clone repos, verify license.
- Inspect agent: map features to modules.
- Adapt agent (backend): adapt backend modules.
- Adapt agent (UI): adapt UI modules.
- Security agent: audit all.
- Test agent: tests + smoke.
- Docs agent: attribution, LICENSE/NOTICE, docs.

## 5. Execution order
D1 → D2 → D3 (by chunk priority P0→P3) → D4 → D5.

## 6. Licensing compliance checklist
- [ ] LICENSE file from each repo retained in `third_party/<repo>/LICENSE`.
- [ ] NOTICE file created/updated with attribution.
- [ ] Modified files marked `// Derived from <repo> (<license>)`.
- [ ] No trademarks/logos reused.
- [ ] No commercial-tier code vendored.
- [ ] Secret scan clean.
- [ ] SSRF/network audit pass.

## 7. Next single action
Start D1: clone the 4 repos at pinned commits and verify licenses.<|end|>