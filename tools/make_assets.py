#!/usr/bin/env python3
"""Deterministic VibeCode Engine mark generator (see design/LOGO_BRIEF.md).

Authoring aid only: the shipped icons are the SVGs in media/logo plus the PNGs this emits.
Rerun after any geometry change: python3 tools/make_assets.py
"""
import math, os
from PIL import Image, ImageDraw, ImageFont

OUT = "media/logo"
SS = 8  # supersample factor
ENGINE = (47, 111, 237, 255)
SIGNAL = (15, 181, 166, 255)
INK_LIGHT = (234, 240, 255, 255)
INK_DARK = (15, 23, 42, 255)

HEX = [(64, 12), (109, 38), (109, 90), (64, 116), (19, 90), (19, 38)]
V = [(42, 48), (64, 88), (86, 48)]
DOT = (93, 40)
DOT_R = 9


def mark(size, stroke_engine, stroke_v, c_engine, c_v, c_dot, dot=True):
    """Render the mark at `size` px (supersampled), transparent background."""
    s = size * SS
    k = s / 128.0
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    hexp = [(x * k, y * k) for x, y in HEX]
    we = max(1, round(stroke_engine * k))
    d.line(hexp + [hexp[0]], fill=c_engine, width=we, joint="curve")
    vp = [(x * k, y * k) for x, y in V]
    wv = max(1, round(stroke_v * k))
    d.line(vp, fill=c_v, width=wv, joint="curve")
    r = wv / 2.0
    for (x, y) in (vp[0], vp[-1]):  # round caps
        d.ellipse([x - r, y - r, x + r, y + r], fill=c_v)
    if dot:
        cx, cy = DOT[0] * k, DOT[1] * k
        dr = DOT_R * k
        d.ellipse([cx - dr, cy - dr, cx + dr, cy + dr], fill=c_dot)
    return img.resize((size, size), Image.LANCZOS)


def save(img, name):
    p = os.path.join(OUT, name)
    img.save(p)
    print("wrote", p)


def main():
    os.makedirs(OUT, exist_ok=True)
    # Marketplace / manifest icon: colour mark on solid deep-navy plate (crisp in every theme).
    for size in (128, 256):
        base = Image.new("RGBA", (size, size), (11, 18, 32, 255))
        m = mark(int(size * 0.86), 8, 10, ENGINE, INK_LIGHT, SIGNAL)
        off = (size - m.width) // 2
        base.alpha_composite(m, (off, off))
        save(base, f"icon-{size}.png")
    # Transparent mark, for use inside the app on any background.
    save(mark(256, 8, 10, ENGINE, INK_LIGHT, SIGNAL), "mark-dark.png")
    save(mark(256, 8, 10, ENGINE, INK_DARK, SIGNAL), "mark-light.png")
    # Monochrome activity-bar raster reference (VS Code uses the SVG; this is for previews/QA).
    save(mark(96, 9, 11, INK_LIGHT, INK_LIGHT, INK_LIGHT), "activity-bar-mono.png")

    # Contact sheet = the reviewer's proof: 16/24/48/128 on light and dark.
    W, H = 800, 300
    sheet = Image.new("RGB", (W, H), (255, 255, 255))
    draw = ImageDraw.Draw(sheet)
    draw.rectangle([0, 0, W // 2 - 1, H - 1], fill=(255, 255, 255))
    draw.rectangle([W // 2, 0, W, H - 1], fill=(15, 23, 42))
    try:
        font = ImageFont.truetype("DejaVuSans.ttf", 14)
    except Exception:
        font = ImageFont.load_default()
    for i, size in enumerate((16, 24, 48, 128)):
        x = 20 + i * 80
        for dark, xoff in ((False, 0), (True, W // 2)):
            bg = (15, 23, 42, 255) if dark else (255, 255, 255, 255)
            m = mark(size, 8, 10,
                     (47, 111, 237, 255),
                     INK_LIGHT if dark else INK_DARK,
                     SIGNAL)
            tmp = Image.new("RGBA", (size, size), bg)
            tmp.alpha_composite(m, (0, 0))
            sheet.paste(tmp.convert("RGB"), (xoff + x, 70))
            draw.text((xoff + x, 70 + size + 12), f"{size}px", fill=(120, 120, 120) if not dark else (170, 180, 200), font=font)
    draw.text((20, 30), "VibeCode Engine — mark legibility test", fill=(15, 23, 42), font=font)
    draw.text((W // 2 + 20, 30), "dark theme", fill=(200, 210, 230), font=font)
    sheet.save("design/preview.png")
    print("wrote design/preview.png")


if __name__ == "__main__":
    main()
