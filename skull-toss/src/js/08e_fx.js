  // ───────────────────────── trails ─────────────────────────
  // line: how the path behind the skull is drawn · emit: particles it sheds · rate: particles per frame at 60 fps
  const TRAILS = {
    soul: { line: "ribbon", color: "#B48CFF", emit: "star", rate: 0.8 }, aurora: { line: "ribbon", color: "#78F0BE", emit: "spark", rate: 0.9 },   // (the Soul Shop's, v30)
    harvest: { line: "ribbon", color: "#E8893A", emit: "ember", rate: 1.1 },   // (Season One, v42)
    dust: { line: "dots", color: CREAM },            smoke: { line: "dots", color: "#8E8A7E", emit: "puff", rate: 0.5 },
    lines: { line: "speed" },                        sparks: { line: "dots", color: MUSTARD, emit: "spark", rate: 1.4 },
    bubbles: { line: "none", emit: "bubble", rate: 0.55 }, fire: { line: "dots", color: EMBER, emit: "ember", rate: 2 },
    confetti: { line: "none", emit: "confetti", rate: 1.1 }, notes: { line: "none", emit: "note", rate: 0.22 },
    news: { line: "none", emit: "scrap", rate: 0.28 },   splatter: { line: "dots", color: INK, emit: "drip", rate: 0.5 },
    wisps: { line: "ribbon", color: "#BFE3DA" },         stars: { line: "dots", color: MUSTARD, emit: "star", rate: 1 },
    lightning: { line: "bolt", color: "#FFF3C0" },       bats: { line: "dots", color: "#3A3F4A", emit: "bat", rate: 0.13 },
    film: { line: "film", len: 22 },                     ink: { line: "ink", len: 30 },
    ghost: { line: "ghost", len: 16 },                   comet: { line: "comet", emit: "star", rate: 0.7, len: 24 }
  };
  const CONFETTI = [RED, TEAL, MUSTARD, PURPLE, CREAM];
  function emitTrail(s, fade, dt) {
    const T = TRAILS[cos.trail]; if (!T || !T.emit) return;
    if (s.alpha * fade <= 0.05 || s.resting) return;
    const p = project(s.pos.x, s.pos.y, s.pos.z), r = SKULL_R * p.s;
    s.emit += T.rate * dt * 60;
    while (s.emit >= 1) { s.emit -= 1; spawnBit(T.emit, p.x + (Math.random() - 0.5) * r, p.y + (Math.random() - 0.5) * r, r); }
  }
  function spawnBit(kind, x, y, r, list = particles) {
    const base = { x, y, kind, rot: rand(0, TAU), vr: rand(-6, 6) };
    switch (kind) {
      case "ember": list.push({ ...base, kind: "dot", vx: rand(-0.05, 0.05) * U, vy: -U * rand(0.05, 0.2), life: rand(0.35, 0.65), max: 0.65, size: rand(0.8, 2.4), color: Math.random() < 0.5 ? EMBER : MUSTARD, glow: true, g: -0.1 }); break;
      case "spark": list.push({ ...base, kind: "spark", vx: rand(-0.3, 0.3) * U, vy: rand(-0.3, 0.1) * U, life: rand(0.2, 0.4), max: 0.4, size: rand(3, 6), color: "#FFF3C0", glow: true, g: 0.6 }); break;
      case "drip": list.push({ ...base, kind: "dot", y: y + r * 0.4, vx: 0, vy: U * 0.05, life: 0.6, max: 0.6, size: Math.max(1, r * 0.12 + Math.random()), color: INK, g: 1, a: 0.9 }); break;
      case "puff": list.push({ ...base, kind: "puff", vx: rand(-0.04, 0.04) * U, vy: -U * 0.03, life: rand(0.6, 1), max: 1, size: r * 0.35, grow: r * 1.2, color: "#8E8A7E", g: -0.05, a: 0.35 }); break;
      case "star": list.push({ ...base, kind: "star", vx: rand(-0.08, 0.08) * U, vy: rand(-0.08, 0.04) * U, life: rand(0.3, 0.6), max: 0.6, size: rand(2, 4), color: MUSTARD, g: 0, a: 1 }); break;
      case "bat": list.push({ ...base, kind: "bat", vx: rand(-0.3, 0.3) * U, vy: -U * rand(0.1, 0.3), life: rand(0.8, 1.2), max: 1.2, size: Math.max(3, r * 0.35), color: INK, g: -0.05, a: 1, ph: rand(0, TAU) }); break;
      case "bubble": list.push({ ...base, kind: "bubble", vx: rand(-0.05, 0.05) * U, vy: -U * rand(0.06, 0.14), life: rand(0.7, 1.1), max: 1.1, size: rand(2, 4) + r * 0.12, color: CREAM, g: -0.1, a: 0.9 }); break;
      case "confetti": list.push({ ...base, kind: "confetti", vx: rand(-0.2, 0.2) * U, vy: rand(-0.2, 0) * U, life: rand(0.6, 1), max: 1, size: rand(2.5, 4.5), color: CONFETTI[(Math.random() * 5) | 0], g: 0.5, a: 1 }); break;
      case "note": list.push({ ...base, kind: "note", vx: rand(-0.06, 0.06) * U, vy: -U * rand(0.08, 0.14), life: 1.1, max: 1.1, size: Math.max(5, r * 0.5), color: CREAM, g: -0.05, a: 1, ph: rand(0, TAU) }); break;
      case "scrap": list.push({ ...base, kind: "scrap", vx: rand(-0.1, 0.1) * U, vy: rand(-0.05, 0.05) * U, life: 1.2, max: 1.2, size: Math.max(5, r * 0.6), color: PAPER, g: 0.25, a: 1 }); break;
      case "feather": list.push({ ...base, kind: "feather", vx: rand(-0.1, 0.1) * U, vy: -U * rand(0, 0.08), life: 1.1, max: 1.1, size: Math.max(5, r * 0.5), color: "#3A3A46", g: 0.12, a: 1 }); break;
      default: if (BITS_X[kind]) { const b = BITS_X[kind].spawn(U, r); list.push({ ...base, kind, max: b.life, ph: Math.random(), ...b }); }
    }
  }
  function drawTrail(s, fade) {
    if (s.trail.length < 2) return;
    const pts = s.trail.map(q => { const p = project(q.x, q.y, q.z); return { x: p.x, y: p.y, r: SKULL_R * p.s }; });
    drawTrailPts(ctx, pts, cos.trail, fade * s.alpha, s.angle, game.time);
  }
  // pts: screen points oldest → newest, each with r = the skull's radius there
  function drawTrailPts(c, pts, id, A, ang, t) {
    const T = TRAILS[id] || TRAILS.dust, n = pts.length; if (n < 2) return;
    c.lineCap = "round"; c.lineJoin = "round";
    switch (T.line) {
      case "dots": c.fillStyle = T.color; for (let i = 0; i < n - 1; i++) { const k = i / n; c.globalAlpha = (T === TRAILS.dust ? 0.2 : 0.4) * k * A; c.beginPath(); c.arc(pts[i].x, pts[i].y, pts[i].r * (0.25 + 0.5 * k), 0, TAU); c.fill(); } break;
      case "ribbon": c.strokeStyle = T.color; for (let i = 1; i < n; i++) { const k = i / n, w = pts[i].r * (0.15 + 0.85 * k); c.globalAlpha = 0.35 * k * A; c.lineWidth = w * 1.6; c.beginPath(); c.moveTo(pts[i - 1].x, pts[i - 1].y); c.lineTo(pts[i].x, pts[i].y); c.stroke(); } break;
      case "speed": { const a = pts[n - 1], b = pts[Math.max(0, n - 6)], dx = a.x - b.x, dy = a.y - b.y, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, r = a.r;
        c.strokeStyle = CREAM; c.lineWidth = Math.max(1.2, r * 0.12);
        for (let i = -2; i <= 2; i++) { const ox = -uy * i * r * 0.5, oy = ux * i * r * 0.5, len = r * (2.2 - Math.abs(i) * 0.4) * Math.min(1, L / (r * 0.8)); c.globalAlpha = 0.75 * A; c.beginPath(); c.moveTo(a.x - ux * r * 1.3 + ox, a.y - uy * r * 1.3 + oy); c.lineTo(a.x - ux * (r * 1.3 + len) + ox, a.y - uy * (r * 1.3 + len) + oy); c.stroke(); } break; }
      case "bolt": { c.strokeStyle = INK; c.lineWidth = 4; const zig = (w, col) => { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); for (let i = 0; i < n; i += 2) { const q = pts[i], j = (i % 4 ? 1 : -1) * q.r * 0.5; i ? c.lineTo(q.x + j, q.y) : c.moveTo(q.x, q.y); } c.stroke(); };
        c.globalAlpha = 0.85 * A; zig(Math.max(3, pts[n - 1].r * 0.35), INK); zig(Math.max(1.5, pts[n - 1].r * 0.18), T.color); break; }
      case "film": for (let i = 0; i < n - 1; i += 3) { const q = pts[i], k = i / n, w = q.r * 1.8, h = w * 0.78; c.globalAlpha = 0.6 * k * A;
          c.fillStyle = INK; c.fillRect(q.x - w / 2, q.y - h / 2, w, h); c.fillStyle = PAPER; c.fillRect(q.x - w * 0.34, q.y - h * 0.36, w * 0.68, h * 0.72);
          c.fillStyle = PAPER; for (let j = 0; j < 3; j++) { c.fillRect(q.x - w * 0.46, q.y - h * 0.4 + j * h * 0.32, w * 0.07, h * 0.14); c.fillRect(q.x + w * 0.39, q.y - h * 0.4 + j * h * 0.32, w * 0.07, h * 0.14); } } break;
      case "ink": c.strokeStyle = INK; for (let i = 1; i < n; i++) { const k = i / n; c.globalAlpha = 0.9 * Math.min(1, k * 1.6) * A; c.lineWidth = Math.max(1.5, pts[i].r * (0.15 + 0.4 * k)); c.beginPath(); c.moveTo(pts[i - 1].x, pts[i - 1].y); c.lineTo(pts[i].x, pts[i].y); c.stroke(); } break;
      case "ghost": for (let i = 1; i < n - 1; i += 4) { const q = pts[i], k = i / n; drawSkull(c, q.x, q.y, q.r, { ang: ang - (n - i) * 0.08, alpha: 0.28 * k * A, t, look: cos, face: faceFor("fear", t), jaw: 0.5 }); } break;
      case "rainbow": { const cols = ["#E8505B", "#F5B83A", "#F5E84A", "#5BB86A", "#4A8FD8", "#8A6BC8"]; cols.forEach((col, j) => { c.strokeStyle = col; for (let i = 1; i < n; i++) { const k = i / n, w = pts[i].r * 0.3 * k, off = (j - 2.5) * w; c.globalAlpha = 0.8 * Math.min(1, k * 1.5) * A; c.lineWidth = w * 1.1; c.beginPath(); c.moveTo(pts[i - 1].x, pts[i - 1].y + off); c.lineTo(pts[i].x, pts[i].y + off); c.stroke(); } }); break; }
      case "tp": { c.strokeStyle = INK; for (const [w, col] of [[1, INK], [0.72, "#FBF9F4"]]) { c.strokeStyle = col; c.beginPath(); for (let i = 0; i < n; i++) { const q = pts[i], k = i / n, wv = Math.sin(i * 0.9 + t * 8) * q.r * 0.5 * (1 - k * 0.5); i ? c.lineTo(q.x + wv, q.y) : c.moveTo(q.x + wv, q.y); } c.globalAlpha = 0.95 * A; c.lineWidth = pts[n - 1].r * 0.55 * w; c.stroke(); } c.globalAlpha = 0.5 * A; c.strokeStyle = "#B8B4AA"; c.lineWidth = 1; for (let i = 2; i < n; i += 3) { const q = pts[i]; c.beginPath(); c.moveTo(q.x - q.r * 0.2, q.y - q.r * 0.2); c.lineTo(q.x + q.r * 0.2, q.y + q.r * 0.2); c.stroke(); } break; }
      case "comet": { const a = pts[n - 1]; for (const [w, col, al] of [[1.9, RED, 0.55], [1.2, MUSTARD, 0.8], [0.55, CREAM, 0.9]]) { c.strokeStyle = col; for (let i = 1; i < n; i++) { const k = i / n; c.globalAlpha = al * k * A; c.lineWidth = pts[i].r * w * k * 2; c.beginPath(); c.moveTo(pts[i - 1].x, pts[i - 1].y); c.lineTo(pts[i].x, pts[i].y); c.stroke(); } } c.globalAlpha = 0.9 * A; c.fillStyle = MUSTARD; star(c, a.x, a.y, a.r * 1.9, 8, 0.45, t * 3); c.fill(); break; }
    }
    c.globalAlpha = 1;
  }

  // ───────────────────────── impacts: comic bursts + a flourish per style ─────────────────────────
  const IMPACTS = {
    classic:  { word: "BONK!",   fill: MUSTARD, text: INK,   bits: "stars" },
    cartoon:  { word: "WHAM!",   fill: RED,     text: CREAM, bits: "stars" },
    vintage:  { word: "CLONK!",  fill: CREAM,   text: INK,   bits: "inkstars", shape: "rough" },
    confetti: { word: "POP!",    fill: TEAL,    text: CREAM, bits: "confetti" },
    ink:      { word: "SPLAT!",  fill: INK,     text: CREAM, bits: "ink", shape: "splat" },
    bones:    { word: "CRACK!",  fill: CREAM,   text: INK,   bits: "bones" },
    news:     { word: "EXTRA!",  fill: PAPER,   text: INK,   bits: "halftone", shape: "news" },
    ghost:    { word: "BOO!",    fill: PURPLE,  text: CREAM, bits: "ghost" },
    kaboom:   { word: "KABOOM!", fill: EMBER,   text: INK,   bits: "smoke", shape: "cloud", big: 1.25 }
  };
  // a scoring or bonking moment: the word in a burst, plus the equipped style's flourish
  function impact(word, x, y, o = {}) {
    const I = IMPACTS[o.style || cos.impact] || IMPACTS.classic;
    bursts.push(makeBurst(word, clamp(x, U * 0.26, W - U * 0.26), Math.max(y, H * 0.17), I, o, U));
    if (o.bits !== false) flourish(I.bits, x, y, o.scale || 1);
  }
  function makeBurst(word, x, y, I, o, S) {
    return { word, x, y, fill: o.fill || I.fill, text: o.text || I.text, shape: o.shape || I.shape || "burst",
      size: S * 0.085 * (o.scale || 1) * (I.big || 1), sub: o.sub || "", t: -(o.delay || 0), dur: o.dur || 1.05, rot: rand(-0.16, 0.16), seed: (Math.random() * 1e6) | 0 };
  }
  function caption(text, x, y) { bursts.push({ word: text, x: clamp(x, U * 0.22, W - U * 0.22), y: Math.max(y, H * 0.17), shape: "tag", fill: PAPER, text: INK, size: U * 0.042, sub: "", t: 0, dur: 1.1, rot: rand(-0.06, 0.06), seed: 1 }); }
  function flourish(kind, x, y, sc, list = particles, S = U) {
    const n = Math.round(14 * sc * QUALITY.particles), sp = S * 0.9;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, v = rand(0.3, 1) * sp, base = { x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - S * 0.2, rot: rand(0, TAU), vr: rand(-8, 8), g: 1, a: 1 };
      if (kind === "stars") list.push({ ...base, kind: "star", life: rand(0.4, 0.7), max: 0.7, size: rand(3, 6), color: i % 3 ? MUSTARD : CREAM });
      else if (kind === "inkstars") list.push({ ...base, kind: i % 2 ? "star" : "dot", life: rand(0.4, 0.7), max: 0.7, size: rand(2, 5), color: INK });
      else if (kind === "confetti") list.push({ ...base, kind: "confetti", life: rand(0.8, 1.3), max: 1.3, size: rand(3, 5.5), color: CONFETTI[i % 5], g: 0.6 });
      else if (kind === "ink") list.push({ ...base, kind: "dot", life: rand(0.5, 0.8), max: 0.8, size: rand(2, 6), color: INK, g: 1.2 });
      else if (kind === "bones") list.push({ ...base, kind: "bone", life: rand(0.6, 1), max: 1, size: rand(5, 9), color: CREAM });
      else if (kind === "halftone") list.push({ ...base, kind: "dot", vx: base.vx * 0.5, vy: base.vy * 0.5, life: rand(0.4, 0.7), max: 0.7, size: rand(1.5, 3.5), color: INK, g: 0 });
      else if (kind === "smoke") list.push({ ...base, kind: "puff", vx: base.vx * 0.35, vy: base.vy * 0.35 - S * 0.1, life: rand(0.6, 1), max: 1, size: S * 0.02, grow: S * 0.09, color: i % 2 ? "#8E8A7E" : CREAM, g: -0.1, a: 0.55 });
    }
    if (kind === "ghost") list.push({ x, y, vx: rand(-0.05, 0.05) * S, vy: -S * 0.22, rot: 0, vr: 0, g: -0.05, a: 1, kind: "ghost", life: 1.2, max: 1.2, size: S * 0.05, color: CREAM, ph: rand(0, TAU) });
    const EXTRA = { spark: ["spark", "#FFF3C0", [3, 6], 0.4], feather: ["feather", "#3A3A46", [6, 10], 1.1], chunk: ["chunk", "#E07B2C", [5, 9], 1] };
    if (EXTRA[kind]) for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = rand(0.3, 1) * sp, [k2, col, sz, life] = EXTRA[kind]; list.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - S * 0.2, rot: rand(0, TAU), vr: rand(-8, 8), g: 1, a: 1, kind: k2, life, max: life, size: rand(sz[0], sz[1]), color: col, glow: k2 === "spark" }); }
    else if (BITS_X[kind]) for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = rand(0.3, 1) * sp, b = BITS_X[kind].spawn(S, S * 0.05); list.push({ x, y, rot: rand(0, TAU), vr: rand(-8, 8), ph: Math.random(), ...b, vx: Math.cos(a) * v, vy: Math.sin(a) * v - S * 0.2, max: b.life, size: b.size * 1.3 }); }
  }
  function sparkle(at, perfect) {   // ring flourish on a make
    const R = RINGS[cos.ring], r = ring.rc * at.s, n = Math.round((perfect ? 34 : 20) * QUALITY.particles), cols = [R.color, CREAM, perfect ? MUSTARD : R.color];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, sp = (0.35 + Math.random() * 0.9) * U * (perfect ? 1.1 : 0.8);
      particles.push({ kind: "dot", x: at.x + Math.cos(a) * r, y: at.y + Math.sin(a) * r, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - U * 0.2, life: 0.5 + Math.random() * 0.45, max: 0.95, size: 1 + Math.random() * 2.2, color: cols[i % 3], glow: true, g: 1 });
    }
  }
  function sparks(at, n) {
    for (let i = 0; i < n; i++) { const a = Math.random() * TAU, sp = (0.3 + Math.random() * 0.8) * U; particles.push({ kind: "spark", x: at.x, y: at.y, rot: a, vr: 0, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - U * 0.3, life: 0.25 + Math.random() * 0.3, max: 0.55, size: rand(3, 6), color: "#FFE3C4", glow: true, g: 1 }); }
  }
  function dust(at, n) {
    for (let i = 0; i < n; i++) { const a = Math.PI + Math.random() * Math.PI, sp = (0.05 + Math.random() * 0.2) * U; particles.push({ kind: "puff", x: at.x, y: at.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.5, life: 0.4 + Math.random() * 0.4, max: 0.8, size: 1.5 + Math.random() * 2.5, grow: U * 0.02, color: "#8E8A7E", g: 0.2, a: 0.5 }); }
  }

  // ───────────────────────── drawing particles and bursts ─────────────────────────
  function drawBit(c, p) {
    const s = p.size;
    switch (p.kind) {
      case "star": c.fillStyle = p.color; star(c, p.x, p.y, s * 1.4, 5, 0.45, p.rot); c.fill(); if (p.color !== INK) { c.strokeStyle = INK; c.lineWidth = 1; c.stroke(); } break;
      case "spark": c.strokeStyle = p.color; c.lineWidth = 1.6; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - p.vx * 0.02, p.y - p.vy * 0.02); c.stroke(); break;
      case "bat": c.fillStyle = p.color; drawBat(c, p.x, p.y, s, Math.sin(game.time * 30 + p.ph)); break;
      case "bubble": c.strokeStyle = p.color; c.lineWidth = 1.3; c.beginPath(); c.arc(p.x, p.y, s, 0, TAU); c.stroke(); c.fillStyle = p.color; c.beginPath(); c.arc(p.x - s * 0.35, p.y - s * 0.35, s * 0.22, 0, TAU); c.fill(); break;
      case "confetti": c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.scale(1, Math.abs(Math.cos(p.rot * 1.7)) * 0.8 + 0.2); c.fillStyle = p.color; c.fillRect(-s / 2, -s * 0.3, s, s * 0.6); c.restore(); break;
      case "note": { const x = p.x + Math.sin(game.time * 5 + p.ph) * s * 0.4; c.fillStyle = p.color; c.strokeStyle = p.color; c.lineWidth = Math.max(1, s * 0.14); c.beginPath(); c.ellipse(x, p.y, s * 0.36, s * 0.26, -0.4, 0, TAU); c.fill(); c.beginPath(); c.moveTo(x + s * 0.3, p.y); c.lineTo(x + s * 0.3, p.y - s * 1.1); c.lineTo(x + s * 0.7, p.y - s * 0.8); c.stroke(); break; }
      case "scrap": c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.fillStyle = PAPER; c.fillRect(-s * 0.6, -s * 0.45, s * 1.2, s * 0.9); c.fillStyle = INK; for (let i = 0; i < 3; i++) c.fillRect(-s * 0.45, -s * 0.28 + i * s * 0.25, s * (i === 1 ? 0.6 : 0.9), Math.max(0.6, s * 0.08)); c.restore(); break;
      case "bone": c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.fillStyle = CREAM; c.strokeStyle = INK; c.lineWidth = 1; c.beginPath(); rr(c, -s * 0.5, -s * 0.12, s, s * 0.24, s * 0.1); for (const x of [-0.5, 0.5]) for (const y of [-0.14, 0.14]) { c.moveTo(x * s + s * 0.14, y * s); c.arc(x * s, y * s, s * 0.14, 0, TAU); } c.fill(); c.stroke(); c.restore(); break;
      case "ghost": { const x = p.x + Math.sin(game.time * 4 + p.ph) * s * 0.4, y = p.y; c.fillStyle = CREAM; c.strokeStyle = INK; c.lineWidth = Math.max(1, s * 0.08); c.beginPath(); c.moveTo(x - s * 0.5, y + s * 0.4); c.bezierCurveTo(x - s * 0.55, y - s * 0.9, x + s * 0.55, y - s * 0.9, x + s * 0.5, y + s * 0.4);
        for (let i = 1; i <= 4; i++) { const xx = x + s * 0.5 - (s * i) / 4; c.quadraticCurveTo(xx + s * 0.125, y + s * 0.62, xx, y + s * 0.4); } c.closePath(); c.fill(); c.stroke(); c.fillStyle = INK; c.beginPath(); c.ellipse(x - s * 0.17, y - s * 0.2, s * 0.09, s * 0.13, 0, 0, TAU); c.ellipse(x + s * 0.17, y - s * 0.2, s * 0.09, s * 0.13, 0, 0, TAU); c.fill(); break; }
      case "puff": c.fillStyle = p.color; c.beginPath(); c.arc(p.x, p.y, s, 0, TAU); c.fill(); break;
      default: if (BITS_X[p.kind]) { BITS_X[p.kind].draw(c, p); break; } c.fillStyle = p.color; c.beginPath(); c.arc(p.x, p.y, s, 0, TAU); c.fill(); break;
      case "feather": { const sw = Math.sin(game.time * 5 + p.rot) * 0.6; c.save(); c.translate(p.x + sw * s, p.y); c.rotate(p.rot * 0.3 + sw); c.fillStyle = p.color; c.strokeStyle = INK; c.lineWidth = 1;
        c.beginPath(); c.moveTo(0, -s); c.quadraticCurveTo(s * 0.45, 0, 0, s); c.quadraticCurveTo(-s * 0.45, 0, 0, -s); c.fill(); c.stroke(); c.beginPath(); c.moveTo(0, -s); c.lineTo(0, s * 1.2); c.stroke(); c.restore(); break; }
      case "chunk": c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.fillStyle = p.color; c.strokeStyle = INK; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-s * 0.6, -s * 0.3); c.lineTo(s * 0.5, -s * 0.5); c.lineTo(s * 0.6, s * 0.35); c.lineTo(-s * 0.3, s * 0.5); c.closePath(); c.fill(); c.stroke(); c.fillStyle = "#F4E6BE"; c.fillRect(-s * 0.15, -s * 0.1, s * 0.3, s * 0.2); c.restore(); break;
    }
  }
  function drawParticles() {
    ctx.globalCompositeOperation = "lighter";
    for (const p of particles) { if (!p.glow) continue; ctx.globalAlpha = clamp(p.life / p.max, 0, 1); drawBit(ctx, p); }
    ctx.globalCompositeOperation = "source-over";
    for (const p of particles) { if (p.glow) continue; ctx.globalAlpha = clamp(p.life / p.max, 0, 1) * (p.a == null ? 0.5 : p.a); drawBit(ctx, p); }
    ctx.globalAlpha = 1;
  }
  function burstShape(c, b, R, rnd) {
    c.beginPath();
    if (b.shape === "splat") { for (let i = 0; i <= 18; i++) { const a = (i / 18) * TAU, k = i % 2 ? 0.78 + rnd() * 0.12 : 1 + rnd() * 0.25; i ? c.lineTo(Math.cos(a) * R * k, Math.sin(a) * R * 0.8 * k) : c.moveTo(Math.cos(a) * R * k, Math.sin(a) * R * 0.8 * k); } c.closePath(); return; }
    if (b.shape === "cloud") { for (let i = 0; i < 9; i++) { const a = (i / 9) * TAU, x = Math.cos(a) * R * 0.72, y = Math.sin(a) * R * 0.5; c.moveTo(x + R * 0.42, y); c.arc(x, y, R * (0.36 + rnd() * 0.1), 0, TAU); } c.moveTo(R * 0.7, 0); c.ellipse(0, 0, R * 0.7, R * 0.45, 0, 0, TAU); return; }
    if (b.shape === "news") { const w = R * 1.1, h = R * 0.62; c.moveTo(-w, -h); for (let x = -w; x < w; x += R * 0.15) c.lineTo(x + R * 0.075, -h + (rnd() - 0.5) * R * 0.08); c.lineTo(w, -h); c.lineTo(w, h); for (let x = w; x > -w; x -= R * 0.15) c.lineTo(x - R * 0.075, h + (rnd() - 0.5) * R * 0.08); c.closePath(); return; }
    if (b.shape === "tag") { c.rect(-R, -R * 0.42, R * 2, R * 0.84); return; }
    const n = b.shape === "rough" ? 11 : 14;
    for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * TAU - Math.PI / 2, k = i % 2 ? 0.7 + rnd() * 0.06 : 1 + rnd() * 0.16; const x = Math.cos(a) * R * k * 1.1, y = Math.sin(a) * R * k * 0.78; i ? c.lineTo(x, y) : c.moveTo(x, y); }
    c.closePath();
  }
  function drawBursts() { drawBurstList(ctx, bursts, U); }
  function drawBurstList(c, list, S) {
    for (const b of list) {
      if (b.t < 0) continue;
      const k = b.t / b.dur, pop = k < 0.16 ? easeOutBack(k / 0.16) : 1, a = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
      c.save(); c.globalAlpha = clamp(a, 0, 1);
      c.translate(b.x, b.y - S * 0.05 * Math.min(1, k * 1.4)); c.rotate(b.rot + Math.sin(b.t * 18) * 0.03 * (1 - k)); c.scale(pop, pop);
      const font = b.shape === "tag" ? `800 ${Math.round(b.size)}px ${UIFONT}` : `${Math.round(b.size)}px ${COMIC}`;
      c.font = font; const tw = c.measureText(b.word).width, R = b.shape === "tag" ? tw * 0.5 + b.size * 0.7 : Math.max(tw * 0.58, b.size * 0.9);
      const rnd = mulberry32(b.seed);
      c.fillStyle = INK; c.save(); c.translate(b.size * 0.08, b.size * 0.1); burstShape(c, b, R, rnd); c.fill(); c.restore();   // drop shadow
      const rnd2 = mulberry32(b.seed); burstShape(c, b, R, rnd2); c.fillStyle = b.fill; c.fill(); c.lineWidth = Math.max(2, b.size * 0.08); c.strokeStyle = INK; c.lineJoin = "round"; c.stroke();
      if (b.shape === "rough") { c.lineWidth = Math.max(1, b.size * 0.04); for (let i = 0; i < 10; i++) { const an = (i / 10) * TAU; c.beginPath(); c.moveTo(Math.cos(an) * R * 1.25, Math.sin(an) * R * 0.95); c.lineTo(Math.cos(an) * R * 1.5, Math.sin(an) * R * 1.15); c.stroke(); } }
      if (b.shape === "news") { c.fillStyle = "rgba(23,19,15,.18)"; for (let y = -R * 0.5; y < R * 0.55; y += b.size * 0.16) for (let x = -R; x < R; x += b.size * 0.16) { c.beginPath(); c.arc(x, y, b.size * 0.03, 0, TAU); c.fill(); } }
      c.textAlign = "center"; c.textBaseline = "middle"; c.font = font; c.lineJoin = "round";
      if (b.shape !== "tag") { c.lineWidth = b.size * 0.16; c.strokeStyle = b.text === INK ? CREAM : INK; c.strokeText(b.word, 0, b.size * 0.04); }
      c.fillStyle = b.text; c.fillText(b.word, 0, b.size * 0.04);
      if (b.sub) {
        c.font = `800 ${Math.max(10, Math.round(b.size * 0.3))}px ${UIFONT}`; const sw = c.measureText(b.sub.toUpperCase()).width + b.size * 0.4, sy = R * 0.82 + b.size * 0.22;
        c.fillStyle = INK; c.fillRect(-sw / 2, sy - b.size * 0.2, sw, b.size * 0.4); c.fillStyle = CREAM; c.fillText(b.sub.toUpperCase(), 0, sy + 1);
      }
      c.restore();
    }
  }
  // ───────────────────────── contact drawings ─────────────────────────
  // The old cartoons' impact, three drawings on ones: a solid star, the star bursting open into a jagged ring, then
  // its rays flying off. A knockout gets five drawings. Sized by the moment (the director's intensity).
  function starPath(c, R, pts, rnd, inner = 0.55) {
    for (let i = 0; i < pts * 2; i++) {
      const a = (i / (pts * 2)) * TAU - Math.PI / 2, k = i % 2 ? inner * (0.88 + rnd() * 0.24) : 1 + rnd() * 0.2;
      i ? c.lineTo(Math.cos(a) * R * k, Math.sin(a) * R * k) : c.moveTo(Math.cos(a) * R * k, Math.sin(a) * R * k);
    }
    c.closePath();
  }
  function drawImpactStars(c, behind) {
    for (const s of inkStars) {
      if (!!s.behind !== behind) continue;
      const S = STAR_STYLE[s.style], d = Math.min(s.n - 1, Math.floor(s.t * 24)), last = s.n - 1;
      c.save(); c.translate(s.x, s.y); c.rotate(s.rot); if (S.flat) c.scale(1, S.flat);
      c.lineJoin = "round"; c.strokeStyle = INK; c.lineWidth = Math.max(1.5, s.r * 0.09);
      if (d === 0) {                       // the star, with a hot centre
        c.beginPath(); starPath(c, s.r, S.pts, mulberry32(s.seed)); c.fillStyle = S.fill; c.fill(); c.stroke();
        c.beginPath(); starPath(c, s.r * 0.46, S.pts, mulberry32(s.seed + 1), 0.62); c.fillStyle = CREAM; c.fill();
      } else if (d < last) {               // bursting open: a jagged ring
        const g = 1.28 + 0.22 * (d - 1);
        c.beginPath(); starPath(c, s.r * g, S.pts, mulberry32(s.seed)); starPath(c, s.r * g * 0.64, S.pts, mulberry32(s.seed + 2), 0.82);
        c.fillStyle = S.fill; c.fill("evenodd"); c.stroke();
      } else {                             // the rays flying off
        const rnd = mulberry32(s.seed + 3), g = 1.5 + 0.2 * (s.n - 3);
        c.fillStyle = S.fill; c.beginPath();
        for (let i = 0; i < S.pts; i++) {
          const a = (i / S.pts) * TAU + rnd() * 0.3, r0 = s.r * g * (0.95 + rnd() * 0.2), r1 = r0 + s.r * 0.5, hw = 0.12;
          c.moveTo(Math.cos(a - hw) * r0, Math.sin(a - hw) * r0); c.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); c.lineTo(Math.cos(a + hw) * r0, Math.sin(a + hw) * r0); c.closePath();
        }
        c.fill(); c.lineWidth *= 0.7; c.stroke();
      }
      c.restore();
    }
  }
  // the "..." a skull thinks when it knows it missed
  function drawThought(x, y, r, k) {
    if (k <= 0) return;
    const n = Math.min(3, Math.floor(k * 4)), s = Math.max(10, r * 1.1), bx = x + s * 0.2, by = y - s * 1.7;
    ctx.save(); ctx.fillStyle = CREAM; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.5, s * 0.08);
    ctx.beginPath(); ctx.ellipse(bx, by, s * 1.05, s * 0.6, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(bx - s * 0.5, by + s * 0.78, s * 0.14, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = INK; for (let i = 0; i < n; i++) { ctx.beginPath(); ctx.arc(bx + (i - 1) * s * 0.42, by, s * 0.12, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
