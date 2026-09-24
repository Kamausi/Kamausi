#!/usr/bin/env python3
"""Assemble index.html from src/page.html + src/css/*.css + src/markup.html + src/js/*.js (filename order).

--dev adds the test hooks (js/99_dev_hooks.js) and writes index-dev.html; --with-music embeds the six loops."""
import pathlib, re, sys, json
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
# the server's shared rules and handlers (firebase/functions): the game embeds the same files the server runs, so the
# Soul Shop and the server always agree, and the dev build can stand a copy of the server up in the page for the spec
SERVER = root.parent / "firebase" / "functions"
server_js = [SERVER / "shared" / "economy.js", SERVER / "shared" / "runs.js", SERVER / "handlers.js"]
js = "\n".join(f.read_text() for f in server_js if f.exists()) + "\n" + js
# the Firebase project (src/firebase.config.json): a web app's config from the Firebase console. Left empty, the game
# runs without a server (a published claude.ai page still uses its own host); see firebase/README.md
fb = root / "firebase.config.json"
FB = json.loads(fb.read_text()) if fb.exists() else {}
FB = FB if isinstance(FB, dict) and FB.get("apiKey") and FB.get("projectId") else None
js = "  const FIREBASE_CONFIG = " + json.dumps(FB) + ";\n" + js
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
# ── maps: src/maps/NN-<id>.json, one per map, checked against the spatial blueprint and the registry of what the code
#    implements, then embedded as MAP_DATA (with TIER_DATA, BLUEPRINT and MAP_REGISTRY). See docs/SPATIAL_BLUEPRINT.md. ──
MAPDIR = root / "maps"
BLUEPRINT = json.loads((MAPDIR / "blueprint.json").read_text())
REG = json.loads((MAPDIR / "registry.json").read_text())
TIERS = json.loads((MAPDIR / "tiers.json").read_text())
HEX = re.compile(r"^#[0-9A-Fa-f]{6}$"); COLOR = re.compile(r"^(#[0-9A-Fa-f]{6}|rgba?\([\d.,\s]+\))$")
def map_problems(m, fname):
    bad = []
    need = lambda k, d=m: k in d or bad.append(f"missing \"{k}\"")
    for k in ["id", "n", "name", "reel", "premise", "identity", "look", "ring", "tiers", "mechanic", "bosses", "fragment", "target", "music", "blurb"]: need(k)
    if bad: return bad
    if fname != f"{m['n']:02d}-{m['id']}.json": bad.append(f"file should be named {m['n']:02d}-{m['id']}.json")
    for k in ["mechanic", "throw", "targets", "hazards", "camera", "ambient", "music", "sfx", "transition", "reward"]:
        if not str(m["identity"].get(k, "")).strip(): bad.append(f"identity.{k} is empty (the stage bible needs it)")
    L = m["look"]
    for k, n in [("sky", 4), ("ground", 4), ("hills", 3)]:
        if len(L.get(k, [])) != n or not all(HEX.match(c) for c in L.get(k, [])): bad.append(f"look.{k} must be {n} #rrggbb colours")
    if L.get("grass") and (len(L["grass"]) != 2 or not all(HEX.match(c) for c in L["grass"])): bad.append("look.grass must be empty or 2 #rrggbb colours")
    for k in ["silhouette", "moonColor"]:
        if not HEX.match(str(L.get(k, ""))): bad.append(f"look.{k} must be #rrggbb")
    for k in ["horizon", "haze", "light", "hillRim"]:
        if not COLOR.match(str(L.get(k, ""))): bad.append(f"look.{k} must be a colour")
    for k, reg in [("moon", "moon"), ("skyline", "skyline"), ("lane", "lane"), ("props", "props"), ("foreground", "foreground"), ("weather", "weather")]:
        if L.get(k) not in REG[reg]: bad.append(f"look.{k} \"{L.get(k)}\" isn't one the code draws ({', '.join(REG[reg])})")
    for wk in L.get("ambient", {}).get("walkers", []):
        if wk not in REG["walkers"]: bad.append(f"ambient walker \"{wk}\" doesn't exist")
    R, P = m["ring"], BLUEPRINT["ringPlane"]
    if not 0.8 <= R.get("speed", 0) <= 1.8: bad.append("ring.speed must be 0.8–1.8")
    T = R.get("tri", {}); a, up, near, far, skew = (T.get(k, 0) for k in ["a", "up", "near", "far", "skew"])
    bob = 0.16 if "bob" in R.get("mods", []) else 0
    for i, (x, y, z) in enumerate([(-a, P["y"] - 0.3, P["z"] - near), (a, P["y"] - 0.3 + skew * 0.4, P["z"] + far), (skew * a, P["y"] + up, P["z"] + 0.05)]):
        if abs(x) > P["xMax"] or y - bob < P["yMin"] or y + bob > P["yMax"] or not P["zMin"] <= z <= P["zMax"]:
            bad.append(f"ring triangle corner {i} ({x:.2f}, {y:.2f}, {z:.2f}) leaves the ring's playable space")
    for q in R.get("seqs", []):
        if len(q) < 3 or any(v not in (0, 1, 2) for v in q) or any(q[i] == q[(i + 1) % len(q)] for i in range(len(q))):
            bad.append(f"ring sequence {q} must visit corners 0–2, at least three legs, never a corner to itself")
    if any(md not in REG["mods"] for md in R.get("mods", [])): bad.append("ring.mods has an unknown modifier")
    if R.get("path") not in REG["path"]: bad.append(f"ring.path \"{R.get('path')}\" isn't one the code flies")
    if len(m["tiers"]) != 2 or any(t not in [x["id"] for x in TIERS] for t in m["tiers"]): bad.append("tiers must name two tiers (first half, second half)")
    if m["mechanic"].get("kind") not in REG["mechanic"]: bad.append(f"mechanic \"{m['mechanic'].get('kind')}\" isn't implemented")
    if m["bosses"].get("mini") not in REG["mini"] or m["bosses"].get("end") not in REG["end"]: bad.append("bosses must name a registered mini-boss and end boss")
    if m["fragment"] not in REG["fragment"]: bad.append(f"fragment \"{m['fragment']}\" isn't registered")
    if m.get("target") not in REG["target"]: bad.append(f"target \"{m.get('target')}\" isn't one the code draws ({', '.join(REG['target'])})")
    if not 0.85 <= m["music"].get("rate", 0) <= 1.15: bad.append("music.rate must be 0.85–1.15")
    return bad
MAP_DATA, problems = [], []
for f in sorted(MAPDIR.glob("[0-9][0-9]-*.json")):
    m = json.loads(f.read_text()); MAP_DATA.append(m)
    problems += [f"maps/{f.name}: {b}" for b in map_problems(m, f.name)]
if [m.get("n") for m in MAP_DATA] != list(range(1, len(MAP_DATA) + 1)): problems.append("maps must be numbered 1, 2, 3… with no gaps")
for key in ["id", "fragment"]:
    vals = [m.get(key) for m in MAP_DATA]
    if len(set(vals)) != len(vals): problems.append(f"two maps share a {key}")
bosses = [m["bosses"][k] for m in MAP_DATA for k in ("mini", "end") if "bosses" in m]
if len(set(bosses)) != len(bosses): problems.append("two maps share a boss")
if problems: sys.exit("build refused: the maps don't check out\n  " + "\n  ".join(problems))
js = ("  const MAP_DATA = " + json.dumps(MAP_DATA, separators=(",", ":"), ensure_ascii=False) + ";\n  const TIER_DATA = " + json.dumps(TIERS, separators=(",", ":")) +
      ";\n  const BLUEPRINT = " + json.dumps(BLUEPRINT, separators=(",", ":")) + ";\n  const MAP_REGISTRY = " + json.dumps(REG, separators=(",", ":")) + ";\n" + js)
# ── strings: every word the game shows has an ID (docs/LOCALIZATION.md). The code's text is src/strings/en.json;
#    the markup keeps its own English and marks it data-t="ui.…" (text), data-t-aria (aria-label) or data-t-ph
#    (placeholder). Other languages are src/strings/<lang>.json, overriding by ID. Refused: an ID the code uses that
#    doesn't exist, an ID nobody uses, a markup ID with two different texts, a translation whose {placeholders}
#    differ from the English. ──
STR_DIR = root / "strings"
EN = json.loads((STR_DIR / "en.json").read_text())
LOCALES = {f.stem: json.loads(f.read_text()) for f in sorted(STR_DIR.glob("*.json")) if f.stem != "en"}
sp = []
UI, INLINE = {}, r"(?:[^<]|<(?:b|i|br)\b[^>]*>|</(?:b|i)>)*"
def ui_def(k, v, where):
    v = re.sub(r"\s+", " ", v).strip()
    if not k.startswith("ui."): sp.append(f"markup {where} ID {k} must start with ui.")
    elif k in UI and UI[k] != v: sp.append(f"markup ID {k} has two texts: \"{UI[k]}\" and \"{v}\"")
    UI[k] = v
found = 0
for m in re.finditer(r'<(\w+)\b[^>]*?\sdata-t="([\w.-]+)"[^>]*>(' + INLINE + r')</\1>', markup): ui_def(m.group(2), m.group(3), "text"); found += 1
if found != markup.count('data-t="'): sp.append("a data-t element holds more than text and <b>/<i>/<br>; put the ID on the innermost element")
for tag in re.findall(r'<[^>]*\sdata-t-(?:aria|ph)="[^"]*"[^>]*>', markup):
    for kind, attr in (("aria", "aria-label"), ("ph", "placeholder")):
        k = re.search(rf'data-t-{kind}="([\w.-]+)"', tag)
        if not k: continue
        v = re.search(rf'\s{attr}="([^"]*)"', tag)
        if not v: sp.append(f"{k.group(1)}: data-t-{kind} without a {attr}"); continue
        ui_def(k.group(1), v.group(1), kind)
for k in UI:
    if k in EN: sp.append(f"{k} is defined in both the markup and en.json")
ALL = {**EN, **UI}
# what the code asks for: t("id"), t(`pre.${x}.post`) and lineIds("prefix.")
code = "\n".join(p.read_text() for p in parts if p.name != "99_dev_hooks.js")
lits = set(re.findall(r'\bt\(\s*"([\w.-]+)"', code))
pats = [re.compile("^" + re.sub(r"\\\$\\\{[^}]*\\\}", r"[\\w-]+", re.escape(x)) + "$") for x in re.findall(r"\bt\(\s*`([^`]+)`", code)]
pres = set(re.findall(r'\blineIds\(\s*[`"]([\w.-]+)', code))
for k in sorted(lits - set(ALL)): sp.append(f"the code uses string {k}, which isn't defined")
for pat in pats:
    if not any(pat.match(k) for k in ALL): sp.append(f"the code builds string IDs like {pat.pattern}, and none exist")
for pre in pres:
    if not any(k.startswith(pre) for k in ALL): sp.append(f"no lines start {pre}")
used = lambda k: k in lits or k in UI or any(p.match(k) for p in pats) or any(k.startswith(pre) for pre in pres)
for k in sorted(EN):
    if not used(k): sp.append(f"en.json's {k} is never used")
ph = lambda v: sorted(set(re.findall(r"\{(\w+)\}", v)))
for lang, L in LOCALES.items():
    for k, v in L.items():
        if k not in ALL: sp.append(f"{lang}.json translates {k}, which English doesn't have")
        elif ph(v) != ph(ALL[k]): sp.append(f"{lang}.json's {k} has placeholders {ph(v)}, English has {ph(ALL[k])}")
if sp: sys.exit("build refused: the strings don't check out\n  " + "\n  ".join(sp[:40]))
js = "  const STRINGS = " + json.dumps({"en": ALL, **LOCALES}, separators=(",", ":"), ensure_ascii=False) + ";\n" + js
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
# the performance budget (docs/PERFORMANCE.md): the light page may not outgrow PERF.lightKB (01_data.js)
budget = int(re.search(r"lightKB:\s*(\d+)", (root / "js" / "01_data.js").read_text()).group(1))
if not embed_music and len(out.encode()) > budget * 1024: sys.exit(f"build refused: the page is {len(out.encode()) // 1024} KB, over the {budget} KB budget in PERF.lightKB")
if not embed_music: (root.parent / f"index{suffix}.html").write_text(out)
art = out  # artifact build: no document wrapper, no test loader
for pat in [r'<!doctype html>\s*', r'<html lang="en">\s*', r'<head>\s*', r'</head>\s*', r'<body>\s*', r'</body>\s*', r'</html>\s*', r'<meta charset="utf-8">\s*', r'<meta name="viewport"[^>]*>\s*']:
    art = re.sub(pat, '', art, flags=re.I)
art = re.sub(r'\n\s*if \(/\[\?&\]test.*\n', '\n', art)
dest = pathlib.Path(args[0]) if args else (root.parent / (f"skull-toss-with-music{suffix}.html" if embed_music else f"index{suffix}.html"))
if embed_music or args: dest.write_text(out if embed_music else art)
print(f"{'with music: ' + dest.name if embed_music else 'index' + suffix + '.html'} {len(out)} bytes from {len(parts)} js parts{' (dev: test hooks in)' if dev else ''}")
