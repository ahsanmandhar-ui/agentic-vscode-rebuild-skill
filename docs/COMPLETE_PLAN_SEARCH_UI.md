# Complete Plan: Search Providers + UI + Recommendations

## A. Search Provider Management
### A.1 Providers
- DuckDuckGo (default, no key): primary search.
- Brave Search API: fallback (key required).
- SerpAPI: fallback (key required).
- Optional user-supplied provider (OpenAI-compatible search) via base URL + key.

### A.2 Auto-switch logic
- Try DuckDuckGo first.
- On 429/timeout/network error: mark provider "rate-limited" with cooldown (e.g., 5 min); try next enabled provider in order.
- If all exhausted: use cached/stale results (cite "stale"); if none, return empty with actionable error.
- Cache: normalize query (lowercase, trim, collapse spaces); 24h TTL; LRU eviction (max 500 entries).

### A.3 Secret storage
- Keys stored in SecretStorage under `vibecode.search.<provider>.apiKey`.
- Masked in UI/logs (last 4 chars).
- Never in settings/state/webview.

## B. UI Design (ui-ux-pro-max priorities)
### B.1 Search Settings Panel (new tab "Search")
- Provider list cards: name, status badge (active/rate-limited/error), last used, cached result count.
- "Set default" button per provider.
- Key input (password type) with show/hide toggle, save button, masked display after save.
- "Test connection" button → runs a probe query, shows latency + result count.
- Fallback order editor (drag/reorder) with enable/disable toggles.
- Cache stats: entries, hit rate, clear cache button.
- Rate-limit banner: "DuckDuckGo rate-limited; using Brave" with cooldown timer.

### B.2 Accessibility
- 4.5:1 contrast, keyboard nav, aria-labels on all buttons, focus rings, 44px targets.
- Reduced motion: no animations beyond transitions; respect prefers-reduced-motion.
- Empty/error states with actions.

### B.3 Forms
- Visible labels, inline validation (URL format, key non-empty), errors near field, helper text.

## C. Recommendations (ordered)
1. **No VS Code harness** → add @vscode/test-electron smoke test; keep host-independent unit tests (done).
2. **Capability metadata drift** → probe-driven capabilities with TTL + manual override + conservative defaults.
3. **DuckDuckGo rate limits** → cache + backoff + auto-switch to Brave/SerpAPI via SecretStorage keys + UI management.
4. **Latency** → parallelize independent chunks; cache probes; stream progress; fast/thorough mode.

## D. Implementation chunks
### D1: Search provider abstraction
- D1.1 Create `src/search/types.ts` (SearchProvider interface, SearchResult, RateLimitError).
- D1.2 Create `src/search/duckduckgo.ts`, `brave.ts`, `serpapi.ts` adapters.
- D1.3 Create `src/search/registry.ts` + fallback chain + cache (LRU, 24h TTL).
- D1.4 Add auto-switch logic with cooldown tracking.

### D2: Secret storage integration
- D2.1 Store keys under `vibecode.search.<provider>.apiKey`.
- D2.2 Mask in UI/logs; add `getSearchKey` accessor.

### D3: UI (Search tab)
- D3.1 Render provider cards + status badges.
- D3.2 Key input + save + test connection.
- D3.3 Fallback order editor.
- D3.4 Cache stats + clear.
- D3.5 Rate-limit banner with cooldown.

### D4: Webview wiring
- D4.1 Add 'search' to PanelId + PANELS.
- D4.2 loadPanel case + message handlers.
- D4.3 CSP-safe rendering.

### D5: Tests
- D5.1 Unit tests for cache, fallback, auto-switch.
- D5.2 SSRF guard on provider base URLs.
- D5.3 Secret masking tests.

### D6: Quality gates
- D6.1 Evidence for each chunk (commands, output).
- D6.2 Honest evaluation report.

## E. Next single action
Implement D1 (search provider abstraction + cache) first; then D2 (secret storage); then D3 (UI). Test each before proceeding.
