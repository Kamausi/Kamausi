#!/usr/bin/env python3
"""Assemble index.html from src/page.html + src/css/*.css + src/markup.html + src/js/*.js (filename order).

--dev adds the test hooks (js/99_dev_hooks.js) and writes index-dev.html; --with-music embeds the six loops."""
import pathlib, re, sys
root = pathlib.Path(__file__).resolve().parent
page = (root / "page.html").read_text()
css = "\n".join(p.read_text() for p in sorted((root / "css").glob("*.css")))
# fonts are embedded so the page looks right offline and inside sandboxed hosts (all SIL OFL / Apache 2.0)
import base64
FACES = [("Luckiest Guy", "luckiest-guy-latin-400-normal.woff2", 400), ("Bangers", "bangers-latin-400-normal.woff2", 400),
         ("Bebas Neue", "bebas-neue-latin-400-normal.woff2", 400)] + [("Nunito Sans", f"nunito-sans-latin-{w}-normal.woff2", w) for w in (600, 700, 800, 900)]
faces = "".join(f'@font-face{{font-family:"{fam}";font-style:normal;font-weight:{w};font-display:swap;src:url(data:font/woff2;base64,{base64.b64encode((root / "fonts" / fn).read_bytes()).decode()}) format("woff2")}}\n'
                for fam, fn, w in FACES if (root / "fonts" / fn).exists())
css = faces + css
markup = (root / "markup.html").read_text()
# 99_dev_hooks.js holds the test hooks, which can change bones, stats and the leaderboard: only --dev builds carry it
dev = "--dev" in sys.argv
parts = [p for p in sorted((root / "js").glob("*.js")) if dev or p.name != "99_dev_hooks.js"]
js = "\n".join(p.read_text() for p in parts)
# ── vector assets: src/art/<asset>/asset.json + SVG, read by svgart.py (named layers, versions, anchors) ──
import json, xml.etree.ElementTree as ET
sys.path.insert(0, str(root))
import svgart
TOKENS = {k.lower(): v for k, v in re.findall(r"--([a-z][a-z0-9-]*):\s*(#[0-9A-Fa-f]{3,8})", (root / "css" / "01_tokens.css").read_text())}
VECTOR = ["skull", "launcher", "target"]   # the skull is required; the others fall back to coded drawing if their folder goes
ART_ASSETS = {}
for name in VECTOR:
    folder = root / "art" / name
    if not (folder / "asset.json").exists():
        if name == "skull": sys.exit("build refused: art/skull/asset.json is missing")
        continue
    ART_ASSETS[name] = svgart.load_asset(folder, TOKENS)
    if ART_ASSETS[name]["meta"]["id"] != name: sys.exit(f"build refused: art/{name}/asset.json says its id is \"{ART_ASSETS[name]['meta']['id']}\"")
# ── optional scene planes: src/art/scene/{sky,far,mid,near,foreground} — an SVG (viewBox 0 0 2000 1000) or a painted
#    plate as WebP/PNG at 2:1 (3200×1600 is a good size). Either way the horizon sits 35% of the way down. ──
def image_size(data, suffix):   # width, height of a PNG or WebP, read from its header (no imaging library needed)
    if suffix == ".png" and data[:8] == b"\x89PNG\r\n\x1a\n": return int.from_bytes(data[16:20], "big"), int.from_bytes(data[20:24], "big")
    if suffix == ".webp" and data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        kind = data[12:16]
        if kind == b"VP8X": return 1 + int.from_bytes(data[24:27], "little"), 1 + int.from_bytes(data[27:30], "little")
        if kind == b"VP8L": b = int.from_bytes(data[21:25], "little"); return 1 + (b & 0x3FFF), 1 + ((b >> 14) & 0x3FFF)
        if kind == b"VP8 ": return int.from_bytes(data[26:28], "little") & 0x3FFF, int.from_bytes(data[28:30], "little") & 0x3FFF
    return None
SCENE = {}
for name in ["sky", "far", "mid", "near", "foreground"]:
    f = root / "art" / "scene" / f"{name}.svg"
    painted = [p for p in (root / "art" / "scene" / f"{name}.webp", root / "art" / "scene" / f"{name}.png") if p.exists()]
    if f.exists() and painted: sys.exit(f"build refused: scene/{name} has both an SVG and a painted plate; keep one")
    if painted:
        p = painted[0]; data = p.read_bytes(); size = image_size(data, p.suffix)
        if not size: sys.exit(f"build refused: can't read scene/{p.name}; save it as a standard PNG or WebP")
        if abs(size[0] / size[1] - 2) > 0.02: sys.exit(f"build refused: scene/{p.name} is {size[0]}x{size[1]}; a painted plane must be twice as wide as it is tall (e.g. 3200x1600)")
        if len(data) > 1_500_000: print(f"note: scene/{p.name} is {len(data) // 1024} KB; the page carries it, so a smaller or more compressed plate loads faster")
        SCENE[name] = f"data:image/{p.suffix[1:]};base64," + base64.b64encode(data).decode()
        continue
    if not f.exists(): continue
    svg = ET.parse(f).getroot()
    if (svg.get("viewBox") or "").split() != ["0", "0", "2000", "1000"]: sys.exit(f"build refused: scene/{name}.svg must use viewBox=\"0 0 2000 1000\"")
    SCENE[name] = "data:image/svg+xml;base64," + base64.b64encode(f.read_bytes()).decode()
# ── optional ring art: src/art/rings/<id>.(webp|png) plus <id>.json from measure.py ──
RING_ART = {}
for f in sorted((root / "art" / "rings").glob("*")):
    if f.suffix not in (".webp", ".png"): continue
    meta = f.with_suffix(".json")
    if not meta.exists(): sys.exit(f"build refused: art/rings/{f.name} has no {meta.name}; run src/art/rings/measure.py")
    m = json.loads(meta.read_text())
    mime = "image/webp" if f.suffix == ".webp" else "image/png"
    RING_ART[f.stem] = {"src": f"data:{mime};base64," + base64.b64encode(f.read_bytes()).decode(), "inner": m["inner"], "outer": m["outer"]}
js = "  const RING_ART = " + json.dumps(RING_ART, separators=(",", ":")) + ";\n" + js
# ── optional moon art: src/art/moon/moon.(webp|png) plus moon.json, both written by src/art/moon/prepare.py ──
MOON_ART = None
for ext, mime in ((".webp", "image/webp"), (".png", "image/png")):
    f = root / "art" / "moon" / ("moon" + ext)
    if not f.exists(): continue
    meta = f.with_suffix(".json")
    if not meta.exists(): sys.exit(f"build refused: art/moon/{f.name} has no moon.json; run src/art/moon/prepare.py")
    m = json.loads(meta.read_text())
    MOON_ART = {"src": f"data:{mime};base64," + base64.b64encode(f.read_bytes()).decode(), "cx": m["cx"], "cy": m["cy"], "r": m["r"]}
    break
js = "  const MOON_ART = " + json.dumps(MOON_ART, separators=(",", ":")) + ";\n" + js

# ── optional: carry the music loops (four acts, pause and shop) inside the file itself, for a copy that plays offline on its own ──
embed_music = "--with-music" in sys.argv
MUSIC = {}
if embed_music:
    for key, fn in [("menu", "menu.mp3"), ("A", "a.mp3"), ("B", "b.mp3"), ("boss", "boss.mp3"), ("pause", "pause.mp3"), ("shop", "shop.mp3")]:
        f = root.parent / "music" / fn
        if not f.exists(): sys.exit(f"build refused: --with-music but music/{fn} is missing")
        MUSIC[key] = base64.b64encode(f.read_bytes()).decode()
js = "  const MUSIC_EMBED = " + (json.dumps(MUSIC, separators=(",", ":")) if MUSIC else "null") + ";\n" + js
# ── the recorded sound effects are small, so every build carries them (src/sfx/<name>.mp3 → SFX_EMBED[name]) ──
SFX = {}
for f in sorted((root / "sfx").glob("*.mp3")):
    if f.stat().st_size > 200_000: sys.exit(f"build refused: sfx/{f.name} is over 200 KB; keep sound effects short")
    SFX[f.stem] = base64.b64encode(f.read_bytes()).decode()
js = "  const SFX_EMBED = " + (json.dumps(SFX, separators=(",", ":")) if SFX else "null") + ";\n" + js
js = "  const SCENE_ART = " + json.dumps(SCENE) + ";\n" + js
js = "  const ART_ASSETS = " + json.dumps(ART_ASSETS, separators=(",", ":")) + ";\n  const SKULL_ART = ART_ASSETS.skull.layers;\n" + js
# All JS parts share one scope: a repeated top-level name silently replaces the earlier one. Refuse to build.
names = re.findall(r"^\s{2}(?:async\s+)?function\s+([A-Za-z0-9_]+)|^\s{2}(?:const|let)\s+([A-Za-z0-9_]+)", js, flags=re.M)
seen, dupes = set(), set()
for a, b in names:
    n = a or b
    (dupes if n in seen else seen).add(n)
if dupes: sys.exit("build refused: duplicate top-level names across parts: " + ", ".join(sorted(dupes)))
out = page.replace("/*__STYLE__*/", css).replace("<!--__MARKUP__-->", markup).replace("/*__SCRIPT__*/", '"use strict";\n(() => {\n' + js + "\n})();")
args = [a for a in sys.argv[1:] if not a.startswith("--")]
if dev and args and not embed_music: sys.exit("build refused: the published build never carries the test hooks; drop --dev")
suffix = "-dev" if dev else ""
if not embed_music: (root.parent / f"index{suffix}.html").write_text(out)
art = out  # artifact build: no document wrapper, no test loader
for pat in [r'<!doctype html>\s*', r'<html lang="en">\s*', r'<head>\s*', r'</head>\s*', r'<body>\s*', r'</body>\s*', r'</html>\s*', r'<meta charset="utf-8">\s*', r'<meta name="viewport"[^>]*>\s*']:
    art = re.sub(pat, '', art, flags=re.I)
art = re.sub(r'\n\s*if \(/\[\?&\]test.*\n', '\n', art)
dest = pathlib.Path(args[0]) if args else (root.parent / (f"skull-toss-with-music{suffix}.html" if embed_music else f"index{suffix}.html"))
if embed_music or args: dest.write_text(out if embed_music else art)
print(f"{'with music: ' + dest.name if embed_music else 'index' + suffix + '.html'} {len(out)} bytes from {len(parts)} js parts{' (dev: test hooks in)' if dev else ''}")
