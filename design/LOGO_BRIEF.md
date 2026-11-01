# LOGO_BRIEF — VibeCode Engine visual identity

**Status:** active brief. If the repository already contains an approved brief or assets, that takes
precedence — read it first, back up existing assets to `media/_backup-<timestamp>/`, then follow this brief.

## 1. Concept

VibeCode Engine is a **local coding agent inside the editor**, driven by skills, with a provider
router behind it. The mark must read as *tooling*, not as a chatbot mascot.

Core idea: **a hex engine block holding a code chevron** — a machined shape (the "engine") with a single
"V"/chevron cut into it (the code), plus one small node dot (the agent/skill hooking into the flow).

Rejected directions: brains, sparkle clusters, robot faces, gradient blobs, lettering inside the glyph,
anything imitating Copilot/Claude/Cursor/ChatGPT marks.

## 2. Construction (geometry, not vibes)

- Canvas 128 × 128, live area inset 8 px.
- Pointy-top hexagon, stroke width 8, `stroke-linejoin: round`, no fill (outer "engine block").
- Inside: a chevron path `M42,48 L64,88 L86,48`, stroke 10, round caps — the "V" of VibeCode.
- One node: a 9 px-radius dot centered at `(93, 40)` — the agent hook sitting inside the upper-right quadrant
  of the hexagon, clear of the chevron.
- Hexagon coordinates (pointy-top, center 64,64, R=52):
  `(64,12) (109,38) (109,90) (64,116) (19,90) (19,38)`.

Nothing else. No shadows, no gradients, no bevels, no text.

## 3. Colour

| Token | Hex | Use |
|---|---|---|
| Engine | `#2F6FED` | hexagon stroke, light backgrounds |
| Signal | `#0FB5A6` | node dot |
| Ink | `#EAF0FF` | chevron on dark UI / icon fill variant |
| Ink-dark | `#0F172A` | chevron on light backgrounds |
| Mono | `currentColor` | Activity Bar variant — **single colour, no fills of different tones** |

Contrast: engine blue on `#FFFFFF` = 3.9:1 (graphic, fine); ink on `#0F172A` = 13.4:1. Verify with a contrast
checker before shipping; adjust lightness rather than adding effects.

Must remain legible: at 16 px, at 24 px (Activity Bar), at 128 px (Marketplace), on light, dark, and
high-contrast themes, and in greyscale.

## 4. Required deliverables

| File | Size | Notes |
|---|---|---|
| `media/logo/activity-bar.svg` | 24×24 viewBox | `fill="none" stroke="currentColor"`, strokes ≥ 2 px at 24 px, no background, no colour literals |
| `media/logo/icon.svg` | 128×128 | colour mark, transparent background |
| `media/logo/icon-128.png` | 128×128 | marketplace/`package.json` `icon`, transparent or solid `#0B1220` |
| `media/logo/icon-256.png` | 256×256 | crisp source for future sizes |
| `media/logo/welcome.svg` | 480×160 | mark + `VibeCode Engine` wordmark, outlined text or system-safe font, plus the mono tagline optional |
| `design/preview.png` | 800×300 | contact sheet: 16/24/48/128 px on light + dark — the reviewer's proof |

Formats: SVG for UI, PNG for manifest/marketplace. Do not ship a 512 px icon only; `icon` must resolve from
the packaged VSIX (check `.vscodeignore`).

## 5. Prompt for an image-generation model (if used)

> Design a flat vector logo for a developer tool named "VibeCode Engine". Composition: a pointy-top hexagon
> outline in medium blue (#2F6FED), stroke weight about 6% of the canvas, rounded joints; inside it a bold
> chevron shaped like the letter V drawn in off-white (#EAF0FF) with rounded caps; one small teal dot (#0FB5A6)
> inside the hexagon at its upper-right. Perfectly symmetric, geometric, no gradients, no
> shadows, no text, no 3D, transparent background, centered with equal margins, readable at 24 pixels.
> Professional engineering aesthetic, similar in spirit to compiler and terminal tooling iconography.
> Do not imitate the logos of GitHub Copilot, Claude, Cursor, OpenAI, or any other coding assistant.

Then: trace/redraw the winning concept as **hand-authored SVG** using §2 coordinates. The shipped asset must
be deterministic geometry, not a raster traced from a model output. If no image model is available, author the
SVG directly from §2 — the brief is complete enough that generation is optional, not required.

## 6. Integration checklist

- [ ] `package.json` `"icon": "media/logo/icon-128.png"` exists in the packaged VSIX (`vsce ls`).
- [ ] `contributes.viewsContainers.activitybar[].icon` points at `media/logo/activity-bar.svg`.
- [ ] Webview references icons via `webview.asWebviewUri` (never a hard-coded path).
- [ ] `localResourceRoots` includes `media/`.
- [ ] Checked in light, dark, high-contrast, and greyscale (screenshot in `docs/`).
- [ ] `design/preview.png` regenerated and committed.
- [ ] Previous assets backed up under `media/_backup-<timestamp>/`; nothing overwritten irrecoverably.
- [ ] No third-party marks or lookalike shapes.
