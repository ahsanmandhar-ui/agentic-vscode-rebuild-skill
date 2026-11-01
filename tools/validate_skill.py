#!/usr/bin/env python3
"""Validate the vibecode-engine-rebuild Cline skill package.

Checks structure, frontmatter, cross-references, non-placeholder content, required sections,
asset validity, and stray secrets. Exit code 1 on any FAIL.

Usage: python3 tools/validate_skill.py
"""
import json, os, re, struct, sys, xml.dom.minidom

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKILL_DIR = os.path.join(ROOT, ".cline", "skills", "vibecode-engine-rebuild")
SKILL = os.path.join(SKILL_DIR, "SKILL.md")

results = []  # (status, message)

def ok(m): results.append(("PASS", m))
def warn(m): results.append(("WARN", m))
def fail(m): results.append(("FAIL", m))

REQUIRED_REFS = ["ARCHITECTURE.md", "SECURITY.md", "SKILL_FORMAT.md",
                 "PROVIDER_ROUTING.md", "TESTING.md", "RELEASE.md"]
# The 17 deliverables the skill must cover (SKILL.md §3 of the master spec), matched by concept.
REQUIRED_CONCEPTS = {
    "name and description": r"^---\s*\nname:", 
    "activation triggers": r"[Aa]ctivat",
    "tools/environment checks": r"[Ee]nvironment",
    "repository inspection": r"[Rr]epository inspection|[Ii]nspect the actual repository|REPO_AUDIT",
    "system requirements": r"[Ss]ystem (&|and) environment assessment|Environment assessment",
    "architecture workflow": r"ARCHITECTURE\.md",
    "security-first install": r"security-first|Security & trust|security and trust",
    "skill discovery lifecycle": r"SKILL_FORMAT\.md",
    "agentic execution": r"state machine|State machine",
    "provider/account management": r"PROVIDER_ROUTING\.md",
    "context persistence": r"plan\.md",
    "UI requirements": r"UI_SPEC\.md",
    "logo instructions": r"LOGO_BRIEF\.md",
    "testing/verification": r"TESTING\.md",
    "VSIX packaging/upgrade": r"[Vv]six|VSIX",
    "failure recovery/rollback": r"[Rr]ollback|recovery",
    "completion criteria": r"[Cc]ompletion criteria",
}

def parse_frontmatter(text):
    if not text.startswith("---"):
        return None, text
    end = text.find("\n---", 3)
    if end == -1:
        return None, text
    fm = text[3:end].strip("\n")
    body = text[end + 4:]
    data, key = {}, None
    for line in fm.splitlines():
        m = re.match(r"^([a-zA-Z_][\w-]*):\s*(.*)$", line)
        if m:
            key = m.group(1); val = m.group(2).strip()
            data[key] = val
        elif line.strip().startswith("- ") and key:
            data.setdefault(key + "_list", []).append(line.strip()[2:].strip())
    return data, body

def main():
    if not os.path.isfile(SKILL):
        fail(f"SKILL.md missing at {SKILL}"); return report()
    text = open(SKILL, encoding="utf-8").read()
    fm, body = parse_frontmatter(text)

    # Frontmatter
    if fm is None:
        fail("SKILL.md has no YAML frontmatter"); return report()
    if fm.get("name") == "vibecode-engine-rebuild":
        ok("frontmatter name matches directory (Cline discovers by dir + name)")
    else:
        fail(f"frontmatter name mismatch: {fm.get('name')!r} != 'vibecode-engine-rebuild'")
    desc = fm.get("description", "")
    if 40 <= len(desc) <= 500 and re.search(r"\bwhen\b|\bUse when\b", desc, re.I):
        ok(f"description present, trigger-oriented, {len(desc)} chars")
    else:
        fail(f"description must be 40-500 chars and state when to use it (got {len(desc)})")
    if fm.get("version"):
        ok(f"version {fm['version']}")
    else:
        warn("no version field")

    # Reference list in frontmatter vs directory
    listed = fm.get("references_list", [])
    on_disk = sorted(f for f in os.listdir(os.path.join(SKILL_DIR, "references")) if f.endswith(".md"))
    for r in listed:
        path = os.path.join(SKILL_DIR, r)
        if not os.path.isfile(path):
            fail(f"frontmatter lists missing file: {r}")
    for f in on_disk:
        if f"references/{f}" not in listed:
            warn(f"reference not listed in frontmatter: {f}")
    ok(f"{len(on_disk)} reference documents present, {len(listed)} listed")

    # Required references and content depth
    for r in REQUIRED_REFS:
        p = os.path.join(SKILL_DIR, "references", r)
        if not os.path.isfile(p):
            fail(f"required reference missing: references/{r}")
            continue
        lines = sum(1 for _ in open(p, encoding="utf-8"))
        if lines < 40:
            fail(f"references/{r} looks like a placeholder ({lines} lines)")
        else:
            ok(f"references/{r} ({lines} lines)")

    # Required concept coverage in SKILL.md
    missing = [k for k, pat in REQUIRED_CONCEPTS.items() if not re.search(pat, text, re.M)]
    if missing:
        fail("SKILL.md does not cover: " + ", ".join(missing))
    else:
        ok(f"SKILL.md covers all {len(REQUIRED_CONCEPTS)} required deliverables")

    # Placeholder / stub detection across the skill dir
    # Placeholder detection. Legitimate uses (status vocabularies, filenames, "no placeholder text" rules)
    # are whitelisted so the check stays meaningful instead of crying wolf.
    bad = re.compile(r"\b(TODO|TBD|FIXME|XXX|lorem ipsum|coming soon)\b")
    allow = ("`TODO.md`", "todo|in-progress|done", "no placeholder text", "TBD/")
    shots = []
    for dirpath, _, files in os.walk(SKILL_DIR):
        for f in files:
            if not f.endswith(".md"):
                continue
            p = os.path.join(dirpath, f)
            for i, line in enumerate(open(p, encoding="utf-8"), 1):
                if bad.search(line) and not any(a in line for a in allow):
                    shots.append(f"{os.path.relpath(p, ROOT)}:{i}: {line.strip()[:80]}")
    if shots:
        fail("placeholder markers found:\n    " + "\n    ".join(shots))
    else:
        ok("no placeholder markers in skill content")

    # Relative links resolve
    broken = []
    for dirpath, _, files in os.walk(SKILL_DIR):
        for f in files:
            if not f.endswith(".md"):
                continue
            p = os.path.join(dirpath, f)
            for link in re.findall(r"\]\(([^)#][^)]*)\)", open(p, encoding="utf-8").read()):
                if link.startswith(("http://", "https://", "mailto:")):
                    continue
                target = os.path.normpath(os.path.join(dirpath, link))
                if not os.path.exists(target):
                    broken.append(f"{os.path.relpath(p, ROOT)} -> {link}")
    if broken:
        fail("broken relative links:\n    " + "\n    ".join(broken))
    else:
        ok("all relative markdown links resolve")

    # Fallback rules file (kept in sync conceptually with SKILL.md)
    rule = os.path.join(ROOT, ".clinerules", "vibecode-engine-rebuild.md")
    if os.path.isfile(rule) and os.path.getsize(rule) > 1000:
        ok(".clinerules fallback rule present")
    else:
        fail(".clinerules fallback rule missing or too small")

    # Logo assets
    logo_dir = os.path.join(ROOT, "media", "logo")
    for f in ("activity-bar.svg", "icon.svg", "icon-128.png", "icon-256.png", "welcome.svg"):
        p = os.path.join(logo_dir, f)
        if not os.path.isfile(p):
            fail(f"logo asset missing: media/logo/{f}")
    for f in ("activity-bar.svg", "icon.svg", "icon-light.svg", "icon-dark-on-navy.svg", "welcome.svg"):
        p = os.path.join(logo_dir, f)
        if os.path.isfile(p):
            try:
                xml.dom.minidom.parse(p)
            except Exception as e:
                fail(f"invalid SVG media/logo/{f}: {e}")
    ok("SVG assets parse as valid XML")
    ab = open(os.path.join(logo_dir, "activity-bar.svg"), encoding="utf-8").read()
    if "currentColor" in ab:
        ok("activity-bar.svg is monochrome (currentColor) as VS Code requires")
    else:
        fail("activity-bar.svg must use currentColor for theme tinting")
    for f in ("icon-128.png", "icon-256.png"):
        d = open(os.path.join(logo_dir, f), "rb").read(33)
        w, h = struct.unpack(">II", d[16:24])
        if d[:8] == b"\x89PNG\r\n\x1a\n" and w == h and w >= 128:
            ok(f"{f} valid PNG {w}x{h}")
        else:
            fail(f"{f} invalid or wrong size")
    if os.path.isfile(os.path.join(ROOT, "design", "preview.png")):
        ok("design/preview.png contact sheet present")
    if os.path.isfile(os.path.join(ROOT, "design", "LOGO_BRIEF.md")):
        ok("design/LOGO_BRIEF.md present")
    else:
        fail("design/LOGO_BRIEF.md missing")

    # Secret-like strings anywhere in shipped docs
    secret = re.compile(r"(sk-[A-Za-z0-9]{16,}|sk-ant-[A-Za-z0-9\-_]{16,}|ghp_[A-Za-z0-9]{20,}|AIza[0-9A-Za-z\-_]{30,})")
    hits = []
    for dirpath, _, files in os.walk(ROOT):
        if any(seg in dirpath for seg in (".git", "node_modules")):
            continue
        for f in files:
            if not f.endswith((".md", ".ts", ".js", ".json", ".py", ".svg", ".txt", "")):
                continue
            p = os.path.join(dirpath, f)
            try:
                txt = open(p, encoding="utf-8", errors="ignore").read()
            except Exception:
                continue
            if secret.search(txt):
                hits.append(os.path.relpath(p, ROOT))
    if hits:
        fail("secret-like strings found in: " + ", ".join(hits))
    else:
        ok("no secret-like strings in the deliverable")

    # Project context files
    for f in ("plan.md", "progress.md", "structure.md"):
        p = os.path.join(ROOT, f)
        if not os.path.isfile(p):
            fail(f"missing context file {f}")
        elif sum(1 for _ in open(p, encoding="utf-8")) < 15:
            warn(f"{f} is very short")
    ok("context files checked")

    # Local HTML index renders without network (sanity: no external refs)
    idx = os.path.join(ROOT, "index.html")
    if os.path.isfile(idx):
        html = open(idx, encoding="utf-8").read()
        ext = re.findall(r'(?:src|href)="(https?://[^"]+)"', html)
        if ext:
            warn("index.html references external resources (preview will degrade): " + ", ".join(ext[:3]))
        else:
            ok("index.html is self-contained (no external assets)")
    report()

def report():
    fails = [m for s, m in results if s == "FAIL"]
    warns = [m for s, m in results if s == "WARN"]
    print("VibeCode Engine skill validation")
    print("=" * 60)
    for s, m in results:
        print(f"[{s}] {m}")
    print("=" * 60)
    print(f"{sum(1 for s,_ in results if s=='PASS')} passed · {len(warns)} warnings · {len(fails)} failed")
    sys.exit(1 if fails else 0)

if __name__ == "__main__":
    main()
