#!/usr/bin/env python3
"""Prepare the moon artwork:  python3 src/art/moon/prepare.py <your-moon.png|webp>

Takes a moon drawing on a transparent (or plain white) background and writes moon.webp and moon.json beside
this script. moon.json records where the moon's round disc sits in the picture (centre and radius), so the
game can put the disc exactly where its moon goes and let anything beyond the disc — a telescope, a nightcap —
hang out over the sky. Rebuild afterwards (python3 src/build.py) and the new moon is in."""
import json, pathlib, sys
import numpy as np
from PIL import Image
from scipy import ndimage

TARGET_R = 240          # disc radius in the saved picture, in pixels: sharp up to a 2x display with room to spare
here = pathlib.Path(__file__).parent
if len(sys.argv) < 2: sys.exit(__doc__)
im = Image.open(sys.argv[1]).convert("RGBA")
a = np.array(im).astype(np.float32)
rgb, al = a[..., :3], a[..., 3]

# 1. A picture with no transparency gets its white background keyed out: flood in from the border over
#    near-white paper, then let the anti-aliased rim fade out instead of leaving a pale halo on the dark sky.
if (al > 250).mean() > 0.995:
    paper = (rgb.min(axis=2) > 232) & (np.ptp(rgb, axis=2) < 20)
    lab, _ = ndimage.label(paper)
    edge = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    bg = np.isin(lab, edge[edge > 0])
    rim = ndimage.binary_dilation(bg, iterations=3) & ~bg
    keep = 1 - rgb.min(axis=2) / 255.0          # ink over white: how much ink is in this pixel
    al = np.where(bg, 0, np.where(rim, np.clip(keep * 255 * 1.4, 0, 255), 255))
    rgb = np.where(rim[..., None], np.clip((rgb - 255 * (1 - al[..., None] / 255)) / np.maximum(al[..., None] / 255, 1e-3), 0, 255), rgb)

# 2. Pinholes: any see-through patch not connected to the outside was a mistake in the cut-out. Fill it.
clear = al < 128
lab, n = ndimage.label(clear)
edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])).tolist())
for i in range(1, n + 1):
    if i in edge: continue
    hole = lab == i
    around = ndimage.binary_dilation(hole, iterations=3) & ~hole & (al >= 200)
    colour = np.median(rgb[around], axis=0) if around.any() else np.array([20, 16, 14])
    grow = ndimage.binary_dilation(hole, iterations=1)
    rgb[hole] = colour; al[grow] = 255

# 3. Find the disc: the drawing's outer edge is mostly one big circle plus whatever sticks out of it, so
#    try circles through random triples of edge points, keep the one most of the edge agrees with, then refine.
solid = al >= 128
solid = ndimage.binary_opening(solid, iterations=2)            # stray specks do not count as edge
ys, xs = np.nonzero(solid)
H, W = solid.shape
edge = solid & ndimage.binary_dilation(~solid)
ey, ex = np.nonzero(edge)
ex, ey = ex.astype(float), ey.astype(float)
def circle(px, py):
    A = np.c_[2 * px, 2 * py, np.ones(len(px))]
    s, *_ = np.linalg.lstsq(A, px ** 2 + py ** 2, rcond=None)
    return s[0], s[1], float(np.sqrt(max(s[2] + s[0] ** 2 + s[1] ** 2, 0)))
rng = np.random.default_rng(7)
tol = max(H, W) * 0.004
best, cx, cy, r = -1, 0, 0, 0
for _ in range(1500):
    i = rng.choice(len(ex), 3, replace=False)
    (x1, x2, x3), (y1, y2, y3) = ex[i], ey[i]
    d = 2 * (x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2))
    if abs(d) < 1e-6: continue
    ux = ((x1 * x1 + y1 * y1) * (y2 - y3) + (x2 * x2 + y2 * y2) * (y3 - y1) + (x3 * x3 + y3 * y3) * (y1 - y2)) / d
    uy = ((x1 * x1 + y1 * y1) * (x3 - x2) + (x2 * x2 + y2 * y2) * (x1 - x3) + (x3 * x3 + y3 * y3) * (x2 - x1)) / d
    rr = np.hypot(x1 - ux, y1 - uy)
    if rr < min(H, W) * 0.15 or rr > max(H, W): continue
    n = int((np.abs(np.hypot(ex - ux, ey - uy) - rr) < tol).sum())
    if n > best: best, cx, cy, r = n, ux, uy, rr
for _ in range(3):                                           # refine on the points that sit on the circle
    on = np.abs(np.hypot(ex - cx, ey - cy) - r) < tol
    cx, cy, r = circle(ex[on], ey[on])
res = np.hypot(ex[on] - cx, ey[on] - cy) - r
print(f"disc: centre ({cx:.1f}, {cy:.1f}), radius {r:.1f}px; {on.mean() * 100:.0f}% of the outline is the disc "
      f"(fit within {np.sqrt((res ** 2).mean()):.1f}px), the rest overhangs")

# 4. Crop to the drawing, scale so the disc is TARGET_R across the radius, save.
out = Image.fromarray(np.dstack([rgb, al]).clip(0, 255).astype(np.uint8), "RGBA")
x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
pad = int(r * 0.03)
x0, y0, x1, y1 = max(0, x0 - pad), max(0, y0 - pad), min(W, x1 + pad), min(H, y1 + pad)
k = TARGET_R / r
out = out.crop((x0, y0, x1, y1)).resize((round((x1 - x0) * k), round((y1 - y0) * k)), Image.LANCZOS)
out.save(here / "moon.webp", "WEBP", quality=90, method=6, alpha_quality=100)
w, h = out.size
meta = {"cx": round(float((cx - x0) * k / w), 4), "cy": round(float((cy - y0) * k / h), 4), "r": round(float(r * k / w), 4)}
(here / "moon.json").write_text(json.dumps(meta))
print(f"moon.webp {w}x{h}, {(here / 'moon.webp').stat().st_size // 1024} KB;", "moon.json", meta)
