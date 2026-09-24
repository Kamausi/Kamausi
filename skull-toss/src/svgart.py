"""Skull Toss's vector art importer, used by build.py.

Every vector asset lives in its own folder, src/art/<asset>/, with an asset.json that names it, versions it and
lists its layers. The layers come either from one SVG with a named group per layer (<g id="pouch">, or an
Illustrator data-name / Inkscape layer label) or from one SVG file per layer. Each layer becomes a list of plain
shapes the game draws on its canvas: {d, fill, stroke, sw, m, op, cap, join, rule}.

It understands paths and the basic shapes (rect, circle, ellipse, line, polyline, polygon), nested groups with
transforms, <use>, inline styles, presentation attributes, the class rules Illustrator writes into <style>, the
game's palette (fill="ink" or fill="var(--ink)"), and gradients (flattened to their first colour). It refuses text
and embedded pictures, with a message saying what to do instead.
"""
import json, math, re, sys
import xml.etree.ElementTree as ET

NUM = r"[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?"
LABEL = "{http://www.inkscape.org/namespaces/inkscape}label"
XLINK = "{http://www.w3.org/1999/xlink}href"
IDENTITY = [1.0, 0.0, 0.0, 1.0, 0.0, 0.0]
INHERITED = ("fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "fill-rule", "fill-opacity", "stroke-opacity", "visibility")
SKIP = {"defs", "style", "title", "desc", "metadata", "clipPath", "mask", "linearGradient", "radialGradient", "symbol", "pattern", "filter", "marker", "namedview"}


def refuse(msg):
    sys.exit("build refused: " + msg)


def tag_of(el):
    return el.tag.split("}")[-1]


def mul(a, b):   # 2×3 affine matrices, [a b c d e f] as in SVG
    return [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1], a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3],
            a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]]


def parse_transform(s):
    m = IDENTITY[:]
    for name, args in re.findall(r"(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)", s or ""):
        v = [float(x) for x in re.findall(NUM, args)]
        if name == "matrix" and len(v) >= 6: t = v[:6]
        elif name == "translate": t = [1, 0, 0, 1, v[0], v[1] if len(v) > 1 else 0]
        elif name == "scale": t = [v[0], 0, 0, v[1] if len(v) > 1 else v[0], 0, 0]
        elif name == "rotate":
            a = math.radians(v[0]); c, s_ = math.cos(a), math.sin(a); t = [c, s_, -s_, c, 0, 0]
            if len(v) >= 3: t = mul(mul([1, 0, 0, 1, v[1], v[2]], t), [1, 0, 0, 1, -v[1], -v[2]])
        elif name == "skewX": t = [1, 0, math.tan(math.radians(v[0])), 1, 0, 0]
        elif name == "skewY": t = [1, math.tan(math.radians(v[0])), 0, 1, 0, 0]
        else: continue
        m = mul(m, t)
    return m


def num(el, key, default=0.0):
    v = el.get(key)
    if v is None or v == "": return default
    m = re.match(NUM, v.strip())
    return float(m.group(0)) if m else default


def shape_d(tag, el):
    if tag == "path": return el.get("d") or ""
    if tag == "rect":
        x, y, w, h = num(el, "x"), num(el, "y"), num(el, "width"), num(el, "height")
        rx, ry = el.get("rx"), el.get("ry")
        rx = num(el, "rx") if rx else (num(el, "ry") if ry else 0.0); ry = num(el, "ry") if ry else rx
        rx, ry = min(rx, w / 2), min(ry, h / 2)
        if w <= 0 or h <= 0: return ""
        if not rx: return f"M{x} {y}H{x + w}V{y + h}H{x}Z"
        return (f"M{x + rx} {y}H{x + w - rx}A{rx} {ry} 0 0 1 {x + w} {y + ry}V{y + h - ry}A{rx} {ry} 0 0 1 {x + w - rx} {y + h}"
                f"H{x + rx}A{rx} {ry} 0 0 1 {x} {y + h - ry}V{y + ry}A{rx} {ry} 0 0 1 {x + rx} {y}Z")
    if tag in ("circle", "ellipse"):
        cx, cy = num(el, "cx"), num(el, "cy")
        rx = num(el, "r") if tag == "circle" else num(el, "rx"); ry = num(el, "r") if tag == "circle" else num(el, "ry")
        if rx <= 0 or ry <= 0: return ""
        return f"M{cx - rx} {cy}A{rx} {ry} 0 1 0 {cx + rx} {cy}A{rx} {ry} 0 1 0 {cx - rx} {cy}Z"
    if tag == "line": return f"M{num(el, 'x1')} {num(el, 'y1')}L{num(el, 'x2')} {num(el, 'y2')}"
    if tag in ("polyline", "polygon"):
        p = re.findall(NUM, el.get("points") or "")
        pairs = [f"{p[i]} {p[i + 1]}" for i in range(0, len(p) - 1, 2)]
        return ("M" + "L".join(pairs) + ("Z" if tag == "polygon" else "")) if pairs else ""
    return ""


def decls(s):
    return {k.strip(): v.strip() for k, v in (kv.split(":", 1) for kv in (s or "").split(";") if ":" in kv)}


def norm(name):   # "Socket_x5F_left", "socket left", "SOCKET-LEFT" → "socket-left"
    return re.sub(r"[\s_]+", "-", re.sub(r"_x5f_", "_", (name or "").strip(), flags=re.I)).lower()


class Doc:
    def __init__(self, path, tokens):
        try: self.root = ET.parse(path).getroot()
        except ET.ParseError as e: refuse(f"{path.name} isn't valid SVG ({e})")
        self.path, self.tokens = path, tokens
        self.ids = {el.get("id"): el for el in self.root.iter() if el.get("id")}
        self.classes, self.grads = {}, {}
        for el in self.root.iter():
            if tag_of(el) == "style":
                for sels, body in re.findall(r"([^{}]+)\{([^}]*)\}", el.text or ""):
                    for sel in sels.split(","):
                        sel = sel.strip()
                        if re.fullmatch(r"\.[\w-]+", sel): self.classes.setdefault(sel[1:], {}).update(decls(body))
            if tag_of(el) in ("linearGradient", "radialGradient") and el.get("id"):
                stops = [s for s in el.iter() if tag_of(s) == "stop"]
                col = None
                if stops: col = decls(stops[0].get("style")).get("stop-color") or stops[0].get("stop-color")
                self.grads[el.get("id")] = col
        for gid, col in list(self.grads.items()):   # a gradient that borrows its stops from another
            if not col:
                ref = self.ids.get(gid); href = ref is not None and (ref.get("href") or ref.get(XLINK)) or ""
                self.grads[gid] = self.grads.get(href.lstrip("#")) or "#000"

    def viewbox(self):
        vb = (self.root.get("viewBox") or "").replace(",", " ").split()
        return [float(v) for v in vb] if len(vb) == 4 else None

    def colour(self, v):
        v = (v or "").strip()
        if not v or v == "none": return "none"
        m = re.fullmatch(r"var\(\s*--([\w-]+)\s*(?:,[^)]*)?\)", v)
        if m: return self.tokens.get(m.group(1).lower(), "#000")
        if v.lower() in self.tokens: return self.tokens[v.lower()]
        m = re.fullmatch(r"url\(\s*#([^)\s]+)\s*\)", v)
        if m: return self.colour(self.grads.get(m.group(1)) or "#000")
        if v == "currentColor": return self.tokens.get("ink", "#000")
        return v

    def style_of(self, el, inherited):
        s = {k: v for k, v in inherited.items() if k in INHERITED}
        for k in INHERITED + ("opacity", "display"):
            if el.get(k) is not None: s[k] = el.get(k)
        for c in (el.get("class") or "").split(): s.update(self.classes.get(c, {}))
        s.update(decls(el.get("style")))
        return s

    def find_layer(self, name):
        want = norm(name)
        for el in self.root.iter():
            if tag_of(el) in ("g", "svg", "symbol") and want in (norm(el.get("id")), norm(el.get("data-name")), norm(el.get(LABEL))):
                return el
        return None

    def shapes(self, el, ctm=None, inherited=None, opacity=1.0, out=None, depth=0):
        ctm = ctm or IDENTITY[:]; inherited = inherited or {}; out = [] if out is None else out
        if depth > 40: refuse(f"{self.path.name} nests <use> too deep")
        tag = tag_of(el)
        if tag in SKIP and depth > 0: return out
        style = self.style_of(el, inherited)
        if style.get("display") == "none" or style.get("visibility") == "hidden": return out
        m = mul(ctm, parse_transform(el.get("transform")))
        op = opacity * float(re.match(NUM, style.get("opacity", "1")).group(0))
        if tag in ("text", "tspan", "textPath"): refuse(f"{self.path.name} has text; convert it to outlines (Illustrator: Type → Create Outlines; Inkscape: Path → Object to Path)")
        if tag in ("image", "foreignObject"): refuse(f"{self.path.name} embeds a picture; vector layers must be shapes (paintings go in as WebP/PNG plates instead)")
        if tag == "use":
            ref = self.ids.get((el.get("href") or el.get(XLINK) or "").lstrip("#"))
            if ref is not None:
                mm = mul(m, [1, 0, 0, 1, num(el, "x"), num(el, "y")])
                if tag_of(ref) == "symbol":
                    for ch in ref: self.shapes(ch, mm, style, op, out, depth + 1)
                else: self.shapes(ref, mm, style, op, out, depth + 1)
            return out
        if tag in ("svg", "g", "a", "switch", "symbol") or depth == 0:
            for ch in el: self.shapes(ch, m, style, op, out, depth + 1)
            return out
        d = shape_d(tag, el)
        if not d.strip(): return out
        fill = self.colour(style.get("fill", "#000")); stroke = self.colour(style.get("stroke", "none"))
        sw = num({"sw": style.get("stroke-width", "1")}, "sw", 1.0)   # a dict answers .get() like an element does
        scale = math.sqrt(abs(m[0] * m[3] - m[1] * m[2])) or 1.0
        e = {"d": " ".join(d.replace(",", " ").split()), "fill": fill, "stroke": stroke, "sw": round(sw * scale, 3)}
        if any(abs(a - b) > 1e-9 for a, b in zip(m, IDENTITY)): e["m"] = [round(v, 6) for v in m]
        fo = float(re.match(NUM, style.get("fill-opacity", "1")).group(0)); so = float(re.match(NUM, style.get("stroke-opacity", "1")).group(0))
        if fo < 1: e["fill"] = with_alpha(e["fill"], fo)
        if so < 1: e["stroke"] = with_alpha(e["stroke"], so)
        if op < 1: e["op"] = round(op, 3)
        if style.get("stroke-linecap") in ("round", "square"): e["cap"] = style["stroke-linecap"]
        if style.get("stroke-linejoin") in ("round", "bevel"): e["join"] = style["stroke-linejoin"]
        if style.get("fill-rule") == "evenodd": e["rule"] = "evenodd"
        out.append(e)
        return out


def with_alpha(col, a):
    m = re.fullmatch(r"#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})", col or "")
    if not m: return col
    h = m.group(1); h = "".join(c * 2 for c in h) if len(h) == 3 else h
    return f"rgba({int(h[0:2], 16)},{int(h[2:4], 16)},{int(h[4:6], 16)},{round(a, 3)})"


def load_asset(folder, tokens):
    """Read src/art/<asset>/asset.json and its SVG(s). Returns {"meta": {...}, "layers": {name: [shape, ...]}}."""
    mf = folder / "asset.json"
    if not mf.exists(): refuse(f"art/{folder.name} has no asset.json")
    meta = json.loads(mf.read_text())
    for k in ("id", "version", "layers"):
        if k not in meta: refuse(f"art/{folder.name}/asset.json needs \"{k}\"")
    if not re.fullmatch(r"\d+\.\d+\.\d+", str(meta["version"])): refuse(f"art/{folder.name}/asset.json: version must look like 1.0.0")
    canvas = meta.get("canvas", [1000, 1000]); need, opt = list(meta["layers"]), list(meta.get("optional", []))
    def check_box(doc, label):
        vb = doc.viewbox()
        if not vb or vb[0] != 0 or vb[1] != 0 or vb[2] != canvas[0] or vb[3] != canvas[1]:
            refuse(f"art/{folder.name}/{label} must use viewBox=\"0 0 {canvas[0]:g} {canvas[1]:g}\"")
    layers = {}
    if meta.get("file"):
        f = folder / meta["file"]
        if not f.exists(): refuse(f"art/{folder.name}/{meta['file']} is missing")
        doc = Doc(f, tokens); check_box(doc, meta["file"])
        for name in need + opt:
            g = doc.find_layer(name)
            if g is None:
                if name in need: refuse(f"art/{folder.name}/{meta['file']} has no layer group named \"{name}\" (a <g id=\"{name}\">)")
                continue
            layers[name] = doc.shapes(g)
    else:
        for name in need + opt:
            f = folder / f"{name}.svg"
            if not f.exists():
                if name in need: refuse(f"missing layer art/{folder.name}/{name}.svg")
                continue
            doc = Doc(f, tokens); check_box(doc, f.name)
            layers[name] = doc.shapes(doc.root)
    for name in need:
        if not layers.get(name): refuse(f"art/{folder.name}: layer \"{name}\" has no shapes in it")
    def resolve(v):   # palette names inside asset.json too ("color": "red")
        if isinstance(v, str) and v.lower() in tokens: return tokens[v.lower()]
        if isinstance(v, dict): return {k: resolve(x) for k, x in v.items()}
        if isinstance(v, list): return [resolve(x) for x in v]
        return v
    meta = resolve({k: v for k, v in meta.items() if k != "file"})
    meta["shapes"] = sum(len(v) for v in layers.values())
    return {"meta": meta, "layers": layers}
