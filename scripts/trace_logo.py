"""Trace the official MEON logo (the 3375 px "Meon Logo.jpg") into vector paths for the site.

Run: uv run --with potracer --with pillow --with numpy python scripts/trace_logo.py "Meon Logo.jpg" scripts/lib/logo-mixed.json

Output: {"size": S, "frame": {"outer", "inner"}, "word": [d per letter], "glyphs": [d per glyph], "wordBox", "glyphBox"},
coordinates in an S x S square (the full logo). Letters: m e o n. Glyphs: the mixed line under them
(Japanese, Thai, Chinese, Korean), exactly as in the logo. scripts/lib/art.mjs draws logoMark() and logoLockup() from it.
"""
import json, sys
import numpy as np
from PIL import Image
import potrace

SRC = sys.argv[1]
S = 1200  # trace resolution
img = Image.open(SRC).convert("RGB").resize((S, S), Image.LANCZOS)
a = np.asarray(img).astype(int)
white = (a[..., 0] > 200) & (a[..., 1] > 170) & (a[..., 2] > 170)

# Frame: find the white border lines, then mask them out (the frame is drawn as a rect for crisp edges).
rows = white.mean(axis=1)
cols = white.mean(axis=0)
frame_rows = np.where(rows > 0.8)[0]
frame_cols = np.where(cols > 0.8)[0]
top = frame_rows[frame_rows < S // 2]; bot = frame_rows[frame_rows > S // 2]
left = frame_cols[frame_cols < S // 2]; right = frame_cols[frame_cols > S // 2]
frame = {"outer": [int(left.min()), int(top.min()), int(right.max()), int(bot.max())],
         "inner": [int(left.max()), int(top.max()), int(right.min()), int(bot.min())]}
inner = white.copy()
m = 6
x0, y0, x1, y1 = frame["inner"]
inner[: y0 + m, :] = False; inner[y1 - m :, :] = False; inner[:, : x0 + m] = False; inner[:, x1 - m :] = False

# Split into the word band and the glyph band by the empty rows between them.
rows_on = np.where(inner.any(axis=1))[0]
gaps = np.where(np.diff(rows_on) > 5)[0]
assert len(gaps) >= 1, "expected a gap between the word and the glyph line"
g = gaps[0]
word_rows = (rows_on[0], rows_on[g])
glyph_rows = (rows_on[g + 1], rows_on[-1])

def col_groups(r0, r1, n):
    band = inner[r0 : r1 + 1]
    on = np.where(band.any(axis=0))[0]
    splits = np.where(np.diff(on) > 1)[0]
    runs, start = [], on[0]
    for s in splits:
        runs.append([start, on[s]]); start = on[s + 1]
    runs.append([start, on[-1]])
    # merge closest runs until n groups remain (glyphs like 哦 have internal gaps)
    while len(runs) > n:
        i = min(range(len(runs) - 1), key=lambda k: runs[k + 1][0] - runs[k][1])
        runs[i] = [runs[i][0], runs[i + 1][1]]; del runs[i + 1]
    return runs

def trace(r0, r1, c0, c1):
    bm = np.zeros_like(inner)
    bm[r0 : r1 + 1, c0 : c1 + 1] = inner[r0 : r1 + 1, c0 : c1 + 1]
    # potracer's Bitmap inverts its input (False = ink), so pass the complement.
    path = potrace.Bitmap(~bm).trace(turdsize=4, alphamax=1.0, opticurve=True, opttolerance=0.2)
    d = []
    for curve in path:
        sp = curve.start_point
        seg = [f"M{sp.x:.1f} {sp.y:.1f}"]
        for s in curve.segments:
            if s.is_corner:
                seg.append(f"L{s.c.x:.1f} {s.c.y:.1f}L{s.end_point.x:.1f} {s.end_point.y:.1f}")
            else:
                seg.append(f"C{s.c1.x:.1f} {s.c1.y:.1f} {s.c2.x:.1f} {s.c2.y:.1f} {s.end_point.x:.1f} {s.end_point.y:.1f}")
        d.append("".join(seg) + "Z")
    return "".join(d)

word = [trace(*word_rows, c0, c1) for c0, c1 in col_groups(*word_rows, 4)]
glyph_cols = col_groups(*glyph_rows, 4)
glyphs = [trace(*glyph_rows, c0, c1) for c0, c1 in glyph_cols]
wc = col_groups(*word_rows, 4)
out = {"size": S, "frame": frame, "word": word, "glyphs": glyphs,
       "wordBox": [int(wc[0][0]), int(word_rows[0]), int(wc[-1][1]) + 1, int(word_rows[1]) + 1],
       "glyphBox": [int(glyph_cols[0][0]), int(glyph_rows[0]), int(glyph_cols[-1][1]) + 1, int(glyph_rows[1]) + 1]}
json.dump(out, open(sys.argv[2], "w"))
print("frame", frame, "wordBox", out["wordBox"], "glyphBox", out["glyphBox"], "sizes", [len(w) for w in word], [len(x) for x in glyphs])
