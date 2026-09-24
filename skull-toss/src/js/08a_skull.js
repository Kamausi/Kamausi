  // ───────────────────────── the skull: rubber rig ─────────────────────────
  // There is only one character: the skull. It has no body, so every feeling has to come from the skull
  // itself: squash and stretch, lean, jaw, sockets, lids, brows and pupils. A rig is a set of springs.
  function makeRig() { return { a: 1, va: 0, aT: 1, dir: -Math.PI / 2, k: 320, d: 11, jaw: 0, vj: 0, jawT: 0, tilt: 0, vt: 0, tiltT: 0, mood: "idle", moodAt: 0, dots: 0 }; }
  function stepRig(R, dt) {
    const n = Math.max(1, Math.ceil(dt / 0.008)), h = dt / n;
    for (let i = 0; i < n; i++) {
      R.va += (-R.k * (R.a - R.aT) - R.d * R.va) * h; R.a += R.va * h;
      R.vj += (-240 * (R.jaw - R.jawT) - 18 * R.vj) * h; R.jaw += R.vj * h;
      R.vt += (-170 * (R.tilt - R.tiltT) - 15 * R.vt) * h; R.tilt += R.vt * h;
    }
    R.a = clamp(R.a, 0.35, 1.9); R.jaw = clamp(R.jaw, 0, 1.1);
  }
  // squash (a < 1) or stretch (a > 1) along a screen direction, then let the spring boing it back
  function kick(R, a, va, dir, k = 320, d = 11) { R.a = a; R.va = va; if (dir != null) R.dir = dir; R.k = k; R.d = d; }
  function setMood(R, mood, now) { if (R.mood !== mood) { R.mood = mood; R.moodAt = now; } }
  function blinkAmt(t, seed) { const ph = (t + seed) % 3.9; return ph < 0.16 ? Math.sin((ph / 0.16) * Math.PI) : 0; }

  // every mood is a set of face targets
  function faceFor(mood, t, o = {}) {
    const f = { mood, lx: o.lx || 0, ly: o.ly || 0, blink: 0, jawT: 0.02, sockL: 1, sockR: 1, lidL: 0, lidR: 0, lowL: 0, lowR: 0, pupil: 1, brow: null, grin: 0, glyph: null, grit: false, skew: 0 };
    switch (mood) {
      case "idle": f.blink = blinkAmt(t, o.seed || 0); break;
      case "aim": { const k = o.ten || 0; f.lidL = f.lidR = 0.24 * k; f.brow = [-0.8 * k, -0.8 * k]; f.grit = k > 0.3; f.sockL = f.sockR = 1 - 0.08 * k; f.jawT = 0; break; }
      case "fear": f.sockL = f.sockR = 1.3; f.pupil = 0.42; f.jawT = 0.62; f.brow = [1, 1]; f.lx = 0; f.ly = -0.2; break;
      case "excited": f.sockL = f.sockR = 1.06; f.pupil = 1.25; f.jawT = 0.58; f.grin = 1; f.lowL = f.lowR = 0.3; break;
      case "perfect": f.glyph = "star"; f.sockL = f.sockR = 1.16; f.jawT = 0.9; f.grin = 1; f.lowL = f.lowR = 0.22; break;
      case "confused": f.lidR = 0.62; f.sockL = 1.14; f.brow = [0.9, -0.55]; f.jawT = 0.14; f.skew = 0.12; f.lx = -0.3; break;
      case "deadpan": f.lidL = f.lidR = 0.54; f.pupil = 0.72; f.lx = 0; f.ly = 0.05; f.jawT = 0; f.brow = [0, 0]; break;
      case "dizzy": f.glyph = "spiral"; f.jawT = 0.34; break;
      case "sleep": f.glyph = "closed"; f.jawT = 0.07; break;
      case "happy": f.glyph = "happy"; f.jawT = 0.5; f.grin = 1; break;
      case "smug": f.lidL = f.lidR = 0.44; f.lx = 0.6; f.jawT = 0.04; break;
      // the poses' own faces (see the pose library in 04d_visual.js)
      case "strain": { const k = 0.6 + 0.4 * clamp(o.ten == null ? 1 : o.ten, 0, 1); f.lidL = f.lidR = 0.4 * k; f.lowL = f.lowR = 0.2 * k; f.brow = [-1.25 * k, -1.25 * k]; f.grit = true; f.sockL = f.sockR = 0.86; f.pupil = 0.78; f.jawT = 0; break; }   // full draw: squint, brows down, teeth set
      case "ouch": f.glyph = "squeeze"; f.brow = [-0.9, -0.9]; f.jawT = 0.05; f.grit = true; break;      // the contact: eyes screwed shut
      case "gleeful": f.lidR = 0.72; f.lowR = 0.25; f.sockL = 1.16; f.pupil = 1.2; f.grin = 1; f.jawT = 0.72; f.brow = [0.9, -0.4]; break;   // a boss takes it: a wink and a cackle
      case "triumph": f.glyph = "happy"; f.brow = [1, 1]; f.grin = 1; f.jawT = 0.95; break;           // a boss is down
      case "ko": f.glyph = "x"; f.jawT = 0.66; f.sockL = f.sockR = 1.06; f.skew = 0.1; break;          // out cold
    }
    return f;
  }

  // ───────────────────────── the skull: artwork ─────────────────────────
  // The skull is drawn from layered SVG art (src/art/skull/*.svg, all on one 1000×1000 canvas): cranium,
  // jaw (with its mouth), nose, two sockets and two rows of teeth. The rig moves those layers: the jaw
  // drops, the sockets swell, and pupils, lids and brows are drawn inside your sockets in code.
  const isDark = col => {
    const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(col || ""); if (!m) return col === "black";
    let h = m[1]; if (h.length === 3) h = h.replace(/./g, ch => ch + ch);
    const v = parseInt(h, 16); return 0.3 * (v >> 16) + 0.59 * ((v >> 8) & 255) + 0.11 * (v & 255) < 90;
  };
  const ART = {};
  for (const [name, parts] of Object.entries(SKULL_ART)) ART[name] = parts.map(p => ({ ...artShape(p), dark: isDark(p.fill) }));   // artShape: the visual system's importer (04d)
  const shapeOf = (name, dark) => (ART[name].find(p => p.filled && p.dark === dark) || ART[name][0]).path;
  function artBox(path) {   // bounding box of a shape, found by rasterising it once at load
    const n = 250, cv = document.createElement("canvas"); cv.width = cv.height = n; const g = cv.getContext("2d");
    g.scale(n / 1000, n / 1000); g.fill(path);
    const d = g.getImageData(0, 0, n, n).data; let x0 = n, y0 = n, x1 = -1, y1 = -1;
    for (let yy = 0; yy < n; yy++) for (let xx = 0; xx < n; xx++) if (d[(yy * n + xx) * 4 + 3] > 40) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (yy < y0) y0 = yy; if (yy > y1) y1 = yy; }
    const k = 1000 / n; return { x0: x0 * k, y0: y0 * k, x1: (x1 + 1) * k, y1: (y1 + 1) * k };
  }
  const CRANIUM = shapeOf("cranium", false), JAW_BONE = shapeOf("jaw", false), MOUTH = shapeOf("jaw", true);
  const BOX = { cranium: artBox(CRANIUM), jaw: artBox(JAW_BONE), mouth: artBox(MOUTH), upper: artBox(shapeOf("teeth-upper", false)), lower: artBox(shapeOf("teeth-lower", false)) };
  // fit the whole skull into a height of 2.2 skull radii, pivoting on its middle
  const ART_TOP = BOX.cranium.y0 - 9, ART_BOT = Math.max(BOX.jaw.y1, BOX.cranium.y1) + 9;
  const ART_K = 2.2 / (ART_BOT - ART_TOP), ART_CX = 500, ART_CY = (ART_TOP + ART_BOT) / 2;
  const SKULL_BOTTOM = (ART_BOT - ART_CY) * ART_K;
  const toArt = c => { c.scale(ART_K, ART_K); c.translate(-ART_CX, -ART_CY); };
  const SOCK = ["socket-left", "socket-right"].map(n => {
    const p = shapeOf(n, true), b = artBox(p), cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
    return { path: p, x: (cx - ART_CX) * ART_K, y: (cy - ART_CY) * ART_K, rx: ((b.x1 - b.x0) / 2) * ART_K, ry: ((b.y1 - b.y0) / 2) * ART_K };
  });
  // where the teeth divide (taken from the divider strokes), so single teeth can be gilded, bent or pulled
  function toothEdges(name, box) {
    const xs = []; for (const p of ART[name]) if (!p.filled) for (const m of p.d.matchAll(/M\s*(-?[\d.]+)/g)) xs.push(+m[1]);
    return [box.x0, ...xs.sort((a, b) => a - b), box.x1];
  }
  const TEETH = { upper: toothEdges("teeth-upper", BOX.upper), lower: toothEdges("teeth-lower", BOX.lower) };
  const JAW_SHAPE = { tiny: [0.8, 0.8], jumbo: [1.2, 1.24], big: [1.12, 1.04] };   // teeth cosmetics reshape the jaw about its hinge
  const PAINT_ON_JAW = { mustard: 1, midnight: 1, purple: 1, red: 1, stripes: 1, pin: 1, checks: 1, dots: 1 };   // all-over paint jobs carry onto the jaw
  // paint one layer in the skin's colours: light fills become the skin, dark fills become socket-dark, strokes become ink
  function paintLayer(c, name, pal, minW, light, onLight) {
    for (const p of ART[name]) {
      if (p.filled) { c.fillStyle = p.dark ? pal.socket : light || pal.base; c.fill(p.path); if (!p.dark && onLight) onLight(p.path); }
      if (p.stroked) { c.strokeStyle = pal.line; c.lineWidth = Math.max(p.sw, minW); c.stroke(p.path); }
    }
  }

  // draw one skull. o: { ang, alpha, a (stretch), dir, t, look {skull, eyes, teeth, paint}, face, jaw }
  function drawSkull(c, x, y, r, o = {}) {
    const alpha = o.alpha == null ? 1 : o.alpha;
    if (alpha <= 0.01 || r < 0.6) return;
    const look = o.look || cos, S = SKINS[look.skull] || SKINS.bone, t = o.t || 0;
    const f = o.face || faceFor("idle", t), jaw = o.jaw == null ? f.jawT : o.jaw;
    const wax = look.skull === "wax" ? 1.35 : 1, along = clamp(1 + ((o.a == null ? 1 : o.a) - 1) * wax, 0.35, 1.9), perp = 1 / Math.pow(along, 0.62), dir = o.dir || 0;
    const pal = (S.flick && S.flick(t)) || S, flat = !!pal.flat || !!S.flat;
    const js = JAW_SHAPE[look.teeth] || [1, 1], dropA = (jaw * 0.42) / ART_K, skewA = (f.skew || 0) / ART_K, hinge = BOX.jaw.y0;
    const minW = 1.1 / Math.max(0.02, r * ART_K);   // outlines never thinner than about a pixel
    const paint = look.paint && look.paint !== "none" ? look.paint : null;
    c.save();
    c.globalAlpha *= alpha;
    c.translate(x, y); c.rotate(dir); c.scale(along, perp); c.rotate(-dir); c.rotate(o.ang || 0); c.scale(r, r);
    c.lineJoin = "round"; c.lineCap = "round";
    const U = c.getTransform();   // skull units: r = 1
    if (S.behind) S.behind(c, t);
    // cranium, with the skin's texture and any paint job clipped inside it
    c.save(); toArt(c);
    paintLayer(c, "cranium", pal, minW, null, path => {
      c.save(); c.clip(path); c.setTransform(U);
      if (!flat) { c.fillStyle = pal.shade; c.beginPath(); c.rect(-1.2, -1.3, 2.4, 2.6); c.arc(-0.1, -0.25, 0.86, 0, TAU, true); c.fill(); }
      if (S.detail) S.detail(c, t, pal);
      if (paint) drawPaint(c, paint, t);
      c.restore();
    });
    c.restore();
    if (!flat) { c.fillStyle = pal.hi; c.beginPath(); c.ellipse(-0.5, -0.8, 0.14, 0.08, -0.6, 0, TAU); c.fill(); }
    drawSockets(c, look, f, pal, t, S);
    c.save(); toArt(c); paintLayer(c, "nose", pal, minW); c.restore();
    // the open mouth: a dark hole from the upper teeth down to wherever the jaw has dropped to
    const mt = BOX.mouth.y0, mh = BOX.mouth.y1 - mt, mb = hinge + (BOX.mouth.y1 - hinge) * js[1] + dropA;
    c.save(); toArt(c); c.translate(ART_CX + skewA * 0.5, mt); c.scale(js[0], Math.max(0.2, (mb - mt) / mh)); c.translate(-ART_CX, -mt);
    c.fillStyle = pal.socket; c.fill(MOUTH); c.restore();
    // the jaw hangs in front, and carries the lower teeth with it
    c.save(); toArt(c); c.translate(ART_CX + skewA, hinge + dropA); c.scale(js[0], js[1]); c.translate(-ART_CX, -hinge);
    paintLayer(c, "jaw", pal, minW, null, path => {
      if (flat && !(paint && PAINT_ON_JAW[paint])) return;
      c.save(); c.clip(path); c.setTransform(U);
      if (!flat) { c.fillStyle = pal.shade; c.fillRect(0.2, -2, 2, 4); }
      if (paint && PAINT_ON_JAW[paint]) drawPaint(c, paint, t);
      c.restore();
    });
    drawTeeth(c, "teeth-lower", look.teeth, pal, minW);
    c.restore();
    c.save(); toArt(c);
    if (look.teeth === "big") { c.translate(ART_CX, BOX.upper.y0); c.scale(1.12, 1.04); c.translate(-ART_CX, -BOX.upper.y0); }
    drawTeeth(c, "teeth-upper", look.teeth, pal, minW);
    c.restore();
    if (S.jawTop) S.jawTop(c, t, dropA * ART_K, pal, (hinge + (BOX.jaw.y1 - hinge) * js[1] + dropA - ART_CY) * ART_K);
    if (pal.crack && !flat) { c.strokeStyle = pal.crack; c.lineWidth = 0.045; c.beginPath(); c.moveTo(0.22, -1.02); c.lineTo(0.3, -0.84); c.lineTo(0.2, -0.72); c.lineTo(0.32, -0.6); c.moveTo(0.3, -0.84); c.lineTo(0.46, -0.84); c.stroke(); }
    if (S.top) S.top(c, t, pal, f);
    c.restore();
  }

  // ───────────────────────── sockets, lids, brows, pupils ─────────────────────────
  function drawSockets(c, look, f, pal, t, S) {
    const eyes = look.eyes || "pie", sleepyLid = eyes === "sleepy" ? 0.42 : 0, U = c.getTransform();
    // a socket swells outward and upward from its inner edge, so the two never run into each other or the nose
    const socks = SOCK.map((s, i) => {
      const k = i ? f.sockR : f.sockL, kx = 1 + (k - 1) * 0.55, px = s.x + (i ? -1 : 1) * s.rx * 0.9, cx = px + (s.x - px) * kx;
      return { ...s, k, kx, px, x: cx, rx: s.rx * kx, ry: s.ry * k, lid: Math.max(i ? f.lidR : f.lidL, f.blink, sleepyLid), low: i ? f.lowR : f.lowL };
    });
    if (f.glyph === "closed" || f.glyph === "happy" || f.glyph === "squeeze") { // eyes shut: just ink curves (screwed shut: > <)
      c.strokeStyle = pal.socket; c.lineWidth = 0.08;
      socks.forEach((s, i) => {
        const w = s.rx * 0.62; c.beginPath();
        if (f.glyph === "squeeze") { const sd = i ? -1 : 1, h = s.ry * 0.42; c.moveTo(s.x - sd * w, s.y - h); c.lineTo(s.x + sd * w * 0.55, s.y + 0.02); c.lineTo(s.x - sd * w, s.y + h + 0.04); }
        else if (f.glyph === "closed") { c.moveTo(s.x - w, s.y + 0.04); c.quadraticCurveTo(s.x, s.y + 0.18, s.x + w, s.y + 0.04); }
        else { c.moveTo(s.x - w, s.y + 0.1); c.quadraticCurveTo(s.x, s.y - 0.16, s.x + w, s.y + 0.1); }
        c.stroke();
      });
      if (f.brow) drawBrows(c, socks, f, pal);
      return;
    }
    socks.forEach((s, i) => {
      c.save();
      c.translate(s.px, s.y); c.scale(s.kx, s.k); c.translate(-s.px, -s.y); toArt(c);
      c.fillStyle = pal.socket; c.fill(s.path); c.clip(s.path);
      c.setTransform(U);
      if (S.eyes) S.eyes(c, s, i, t, f, pal, eyes); else drawPupil(c, eyes, s, i, t, f, pal);
      // lids (skull-coloured) drop over the top; cheeks push up from the bottom
      if (s.lid > 0.01) { const ly = s.y - s.ry + s.lid * 2 * s.ry; c.fillStyle = pal.base; c.fillRect(s.x - 1, s.y - 1.4, 2, ly - (s.y - 1.4)); c.strokeStyle = pal.line; c.lineWidth = 0.06; c.beginPath(); c.moveTo(s.x - s.rx, ly); c.quadraticCurveTo(s.x, ly + 0.05, s.x + s.rx, ly); c.stroke(); }
      if (s.low > 0.01) { const ly = s.y + s.ry - s.low * 2 * s.ry; c.fillStyle = pal.base; c.beginPath(); c.ellipse(s.x, ly + s.ry * 1.1, s.rx * 1.3, s.ry * 1.1, 0, 0, TAU); c.fill(); }
      c.restore();
    });
    if (f.brow) drawBrows(c, socks, f, pal);
  }
  function drawBrows(c, socks, f, pal) {
    c.strokeStyle = pal.line; c.lineWidth = 0.09;
    socks.forEach((s, i) => {
      const b = f.brow[i], side = i ? 1 : -1, y = s.y - s.ry - 0.12, inner = s.x - side * 0.14, outer = s.x + side * 0.16;
      c.beginPath(); c.moveTo(inner, y - b * 0.1); c.lineTo(outer, y + b * 0.05); c.stroke();
    });
  }
  function star(c, x, y, r, n = 5, k = 0.45, rot = -Math.PI / 2) {
    c.beginPath();
    for (let i = 0; i < n * 2; i++) { const a = rot + (i * Math.PI) / n, rr2 = i % 2 ? r * k : r; i ? c.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2) : c.moveTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); }
    c.closePath();
  }
  function drawPupil(c, eyes, s, i, t, f, pal) {
    const g = f.glyph || ({ x: "x", star: "star", spiral: "spiral", heart: "heart", dollar: "dollar", hypno: "hypno" })[eyes] || null;
    let px = s.x + f.lx * s.rx * 0.38, py = s.y + 0.03 + f.ly * s.ry * 0.36;
    if (eyes === "crossed" && !f.glyph) px = s.x + (i ? -1 : 1) * s.rx * 0.36;
    const rp = 0.15 * f.pupil;
    c.lineWidth = 0.065;
    if (!g && EYES_X[eyes]) { EYES_X[eyes](c, px, py, rp, s, i, t, f, pal); return; }
    if (g === "x") { c.strokeStyle = pal.pupil; const k = 0.12; c.beginPath(); c.moveTo(px - k, py - k); c.lineTo(px + k, py + k); c.moveTo(px + k, py - k); c.lineTo(px - k, py + k); c.stroke(); return; }
    if (g === "star") { c.fillStyle = MUSTARD; star(c, px, py, 0.2, 5, 0.45, -Math.PI / 2 + Math.sin(t * 6) * 0.2); c.fill(); c.strokeStyle = pal.line === pal.socket ? CREAM : pal.line; c.lineWidth = 0.03; c.stroke(); return; }
    if (g === "spiral" || g === "hypno") {
      const spin = t * (g === "hypno" ? -5 : 7) * (i ? 1 : -1);
      if (g === "hypno") { for (let k = 3; k >= 1; k--) { c.fillStyle = k % 2 ? CREAM : PURPLE; c.beginPath(); c.arc(px, py, 0.075 * k + 0.02 * Math.sin(t * 6 + k), 0, TAU); c.fill(); } return; }
      c.strokeStyle = pal.pupil; c.lineWidth = 0.045; c.beginPath();
      for (let k = 0; k <= 40; k++) { const a = spin + k * 0.42, rr2 = 0.01 + k * 0.0048; const xx = px + Math.cos(a) * rr2, yy = py + Math.sin(a) * rr2; k ? c.lineTo(xx, yy) : c.moveTo(xx, yy); }
      c.stroke(); return;
    }
    if (g === "heart") { const k = 0.2 * (1 + 0.08 * Math.sin(t * 8)); c.fillStyle = "#C94A3C"; c.beginPath(); c.moveTo(px, py + k * 0.75); c.bezierCurveTo(px - k * 1.2, py - k * 0.1, px - k * 0.5, py - k * 0.9, px, py - k * 0.35); c.bezierCurveTo(px + k * 0.5, py - k * 0.9, px + k * 1.2, py - k * 0.1, px, py + k * 0.75); c.fill(); return; }
    if (g === "dollar") { c.strokeStyle = MUSTARD; c.lineWidth = 0.05; c.beginPath(); c.arc(px, py - 0.06, 0.07, Math.PI * 0.1, Math.PI * 1.5, true); c.arc(px, py + 0.06, 0.07, -Math.PI * 0.5, Math.PI * 0.9); c.moveTo(px, py - 0.18); c.lineTo(px, py + 0.18); c.stroke(); return; }
    if (eyes === "tiny") { c.fillStyle = pal.pupil; c.beginPath(); c.arc(px, py, rp * 0.45, 0, TAU); c.fill(); return; }
    if (eyes === "giant") { c.fillStyle = pal.pupil; c.beginPath(); c.ellipse(px, py, rp * 1.35, rp * 1.55, 0, 0, TAU); c.fill(); c.fillStyle = pal.socket; c.beginPath(); c.arc(px + f.lx * 0.03, py + f.ly * 0.03, rp * 0.5, 0, TAU); c.fill(); return; }
    // pie eyes: a cream oval with a wedge cut out of it
    c.fillStyle = pal.pupil; c.beginPath(); c.ellipse(px, py, rp * 0.78, rp, 0, 0, TAU); c.fill();
    c.fillStyle = pal.socket; c.beginPath(); c.moveTo(px, py); c.arc(px, py, rp * 1.05, -1.25, -0.55); c.closePath(); c.fill();
  }

  // ───────────────────────── teeth ─────────────────────────
  // Drawn in art space from the teeth layers; the cosmetics work on single teeth between the divider strokes.
  function drawTeeth(c, name, id, pal, minW) {
    if (id === "toothless") return;
    const upper = name === "teeth-upper", edges = TEETH[upper ? "upper" : "lower"], box = upper ? BOX.upper : BOX.lower, tooth = pal.tooth || pal.base;
    const draw = (fillCol) => { for (const p of ART[name]) { if (p.filled) { c.fillStyle = p.dark ? pal.socket : fillCol || tooth; c.fill(p.path); } if (p.stroked) { c.strokeStyle = pal.line; c.lineWidth = Math.max(p.sw, minW * 0.8); c.stroke(p.path); } } };
    const seg = (i, fn) => { c.save(); c.beginPath(); c.rect(edges[i] - 5, 0, edges[i + 1] - edges[i] + 10, 1000); c.clip(); fn(); c.restore(); };
    const n = edges.length - 1;
    if (TEETH_X[id] && TEETH_X[id](c, { draw, seg, n, edges, box, upper, pal, minW, tooth, mid: (box.y0 + box.y1) / 2 })) return;
    if (id === "one") { if (upper) seg(Math.floor((n - 1) / 2), () => draw()); return; }
    if (id === "crooked") {
      const tilts = [0.08, -0.1, 0.05, -0.07, 0.09, -0.05, 0.06];
      for (let i = 0; i < n; i++) { const cx = (edges[i] + edges[i + 1]) / 2, py = upper ? box.y0 : box.y1; c.save(); c.translate(cx, py); c.rotate(tilts[i % tilts.length]); c.translate(-cx, -py + (i % 2 ? 5 : -4)); seg(i, () => draw()); c.restore(); }
      return;
    }
    draw();
    if (id === "gold" && upper) seg(Math.min(1, n - 1), () => { draw(GOLD); c.fillStyle = "rgba(255,246,208,.85)"; c.fillRect(edges[1] + 12, (box.y0 + box.y1) / 2 - 14, 11, 20); });
    if (id === "fangs" && upper) for (const i of [1, n - 1]) {
      const fx = edges[i], fy = (box.y0 + box.y1) / 2;
      c.beginPath(); c.moveTo(fx - 26, fy); c.lineTo(fx + 26, fy); c.lineTo(fx, box.y1 + 72); c.closePath();
      c.fillStyle = tooth; c.fill(); c.strokeStyle = pal.line; c.lineWidth = Math.max(10, minW * 0.8); c.stroke();
    }
  }
