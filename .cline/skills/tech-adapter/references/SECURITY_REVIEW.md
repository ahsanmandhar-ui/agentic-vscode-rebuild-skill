# SECURITY_REVIEW.md
- Verify license at pinned commit.
- Secret scan repo + history (API keys, tokens).
- Check install scripts, postinstall hooks, binary downloads.
- SSRF/network audit; permission scope (read/write/exec/network).
- Verdict pass/fail; block vendoring on fail.
- Output: security verdict + required controls.
