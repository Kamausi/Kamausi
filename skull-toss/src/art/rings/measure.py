#!/usr/bin/env python3
"""Measure a ring's hole and outer edge so the game can scale the art to the play hole.
Drop <id>.png (or .webp) in this folder, run this, and it writes <id>.json beside it.
The art must be square, centred on the ring's middle, with the hole fully transparent."""
import json, pathlib, sys
from PIL import Image
import numpy as np
here = pathlib.Path(__file__).parent
for f in sorted(list(here.glob("*.png")) + list(here.glob("*.webp"))):
    im = Image.open(f).convert("RGBA")
    al = np.array(im)[..., 3]; n = al.shape[0]; c = n / 2
    inner, outer = [], []
    for t in np.linspace(0, 2 * np.pi, 720, endpoint=False):
        rs = np.arange(0, n / 2 - 1, 0.5)
        v = al[(c + np.sin(t) * rs).astype(int), (c + np.cos(t) * rs).astype(int)] > 40
        if not v.any(): continue
        inner.append(rs[np.argmax(v)]); outer.append(rs[len(v) - 1 - np.argmax(v[::-1])])
    m = {"inner": round(float(np.median(inner)) / (n / 2), 4), "outer": round(float(np.median(outer)) / (n / 2), 4)}
    (here / (f.stem + ".json")).write_text(json.dumps(m))
    print(f.name, m)
