  // ───────────────────────── Moonshine Cemetery, rubber-hose edition ─────────────────────────
  // Every prop is an inked, flat-coloured cartoon (thick outlines, pie-cut eyes, white gloves) that bounces to
  // the beat of the waltz, stepping on twos like a 1930s short. Props are painted once per screen size into
  // sprites and drawn in the world with the camera, so they slide with the parallax like everything else.
  // The middle of the field (the throw lane and the boss's patch) stays clear.
  const BEAT_S = 60 / 92;
  const twos = t => Math.floor(t * 12) / 12;
  const beatBounce = (t, ph = 0) => { const b = ((twos(t) / BEAT_S + ph) % 1 + 1) % 1; return b < 0.18 ? -Math.sin((b / 0.18) * Math.PI) : 0; };   // a quick squash on every beat
  const GY = { props: [], sprites: {}, digger: null, cat: null, S: 0 };
  const STONE_COLS = [["#7C8798", "#98A3B4"], ["#8E849C", "#A89EB6"], ["#6F8A86", "#8AA6A2"], ["#8A8274", "#A69E8E"]];
  (function layOut() {
    const rnd = mulberry32(1933), P = GY.props;
    const place = (kind, x, z, extra = {}) => P.push({ kind, x, z, ph: rnd(), seed: (rnd() * 1e6) | 0, face: rnd() < 0.3, ...extra });
    // two banks of graves either side of the lane, getting sparser into the distance
    for (let z = 4.5; z < 36; z += 1.3 + z * 0.06) for (const side of [-1, 1]) {
      if (rnd() < 0.18) continue;
      const x = side * (3.1 + rnd() * (2 + z * 0.18));
      const k = rnd(); place(k < 0.5 ? "stone" : k < 0.68 ? "cross" : k < 0.82 ? "slab" : "obelisk", x, z + rnd() * 0.6, { col: (rnd() * STONE_COLS.length) | 0, tilt: (rnd() - 0.5) * 0.16, h: 0.75 + rnd() * 0.4 });
    }
    for (const [x, z] of [[-1.4, 18], [1.8, 21], [-2.2, 26], [0.4, 30], [2.6, 34]]) place("stone", x, z, { col: (rnd() * 4) | 0, tilt: (rnd() - 0.5) * 0.2, h: 0.8 + rnd() * 0.3 });
    for (const [x, z, s] of [[-7.2, 15, 1.1], [6.8, 19, 1.2], [-10, 27, 1.3], [10.5, 31, 1.4], [-4.8, 33, 1.2]]) place("tree", x, z, { size: s });
    place("crypt", 7.4, 26);
    for (const [x, z] of [[-4.2, 7.5], [4.4, 12], [-5.8, 20]]) place("lantern", x, z);
    for (const [x, z] of [[-6.5, 17.5], [5.8, 16.5]]) place("fence", x, z);
    for (let i = 0; i < 26; i++) { const side = rnd() < 0.5 ? -1 : 1, z = 3.2 + rnd() * 24, x = side * (2.4 + rnd() * (2 + z * 0.25)); place("tuft", x, z, { size: 0.7 + rnd() * 0.5 }); }
    P.push({ kind: "digger", x: -2.9, z: 12.5, ph: 0, face: false });
    P.sort((a, b) => b.z - a.z);           // painted back to front, and the order never changes
  })();

  // ── sprites (painted once per screen size, at the scale they'll usually be seen)
  function sprite(wM, hM, axM, ayM, S, paint) {
    const w = Math.max(2, Math.ceil(wM * S)), h = Math.max(2, Math.ceil(hM * S)), c = document.createElement("canvas");
    c.width = Math.ceil(w * DPR); c.height = Math.ceil(h * DPR); const g = c.getContext("2d");
    g.setTransform(DPR * S, 0, 0, DPR * S, axM * S * DPR, ayM * S * DPR); g.lineJoin = "round"; g.lineCap = "round"; g.strokeStyle = INK; g.lineWidth = Math.max(0.028, 1.6 / S);
    paint(g, S);
    return { c, w, h, ax: axM * S, ay: ayM * S, S };
  }
  const ink2 = g => { g.fill(); g.stroke(); };
  function paintStone(g, k) {
    const [base, lit] = STONE_COLS[k.col], h = k.h, w = 0.62, rnd = mulberry32(k.seed);
    g.fillStyle = "rgba(0,0,0,.3)"; g.beginPath(); g.ellipse(0.04, 0, w * 0.7, 0.07, 0, 0, TAU); g.fill();
    g.fillStyle = base; g.beginPath();
    if (k.kind === "cross") { const t = 0.16; g.moveTo(-t / 2, 0); g.lineTo(-t / 2, -h * 0.72); g.lineTo(-w * 0.42, -h * 0.72); g.lineTo(-w * 0.42, -h * 0.88); g.lineTo(-t / 2, -h * 0.88); g.lineTo(-t / 2, -h * 1.12); g.lineTo(t / 2, -h * 1.12); g.lineTo(t / 2, -h * 0.88); g.lineTo(w * 0.42, -h * 0.88); g.lineTo(w * 0.42, -h * 0.72); g.lineTo(t / 2, -h * 0.72); g.lineTo(t / 2, 0); g.closePath(); ink2(g); g.fillStyle = lit; g.fillRect(-t / 2 + 0.02, -h * 1.1, 0.035, h * 1.08); return; }
    if (k.kind === "obelisk") { g.moveTo(-0.2, 0); g.lineTo(-0.14, -h * 1.3); g.lineTo(0, -h * 1.5); g.lineTo(0.14, -h * 1.3); g.lineTo(0.2, 0); g.closePath(); ink2(g); g.fillStyle = lit; g.beginPath(); g.moveTo(-0.17, -0.02); g.lineTo(-0.12, -h * 1.28); g.lineTo(-0.06, -h * 1.34); g.lineTo(-0.1, -0.02); g.fill(); g.fillStyle = base; g.beginPath(); g.rect(-0.28, -0.12, 0.56, 0.12); ink2(g); return; }
    if (k.kind === "slab") { g.moveTo(-w / 2, 0); g.lineTo(-w / 2, -h * 0.85); g.lineTo(w * 0.2, -h * 0.9); g.lineTo(w * 0.28, -h * 0.72); g.lineTo(w / 2, -h * 0.76); g.lineTo(w / 2, 0); g.closePath(); ink2(g); }
    else { g.moveTo(-w / 2, 0); g.lineTo(-w / 2, -h * 0.6); g.bezierCurveTo(-w / 2, -h * 1.12, w / 2, -h * 1.12, w / 2, -h * 0.6); g.lineTo(w / 2, 0); g.closePath(); ink2(g); }
    g.fillStyle = lit; g.beginPath(); g.moveTo(-w / 2 + 0.03, -0.03); g.lineTo(-w / 2 + 0.03, -h * 0.6); g.quadraticCurveTo(-w / 2 + 0.05, -h * 0.9, -w * 0.15, -h * 0.97); g.lineTo(-w * 0.2, -h * 0.9); g.quadraticCurveTo(-w / 2 + 0.12, -h * 0.8, -w / 2 + 0.11, -h * 0.55); g.lineTo(-w / 2 + 0.11, -0.03); g.closePath(); g.fill();
    g.strokeStyle = "rgba(23,19,15,.55)"; g.lineWidth = 0.025;
    if (rnd() < 0.5 && !k.face) { g.font = "bold 0.16px Georgia, serif"; g.textAlign = "center"; g.fillStyle = "rgba(23,19,15,.5)"; g.fillText("R.I.P.", 0, -h * 0.55); }
    if (rnd() < 0.6) { g.beginPath(); g.moveTo(w * 0.25, -h * 0.85); g.lineTo(w * 0.15, -h * 0.66); g.lineTo(w * 0.24, -h * 0.55); g.stroke(); }
    g.fillStyle = "#5E7A36"; for (let i = 0; i < 3; i++) { g.beginPath(); g.ellipse(-w * 0.3 + rnd() * w * 0.6, -0.03, 0.09 + rnd() * 0.05, 0.05, 0, Math.PI, 0); g.fill(); }
    g.strokeStyle = INK; g.lineWidth = 0.028;
  }
  function paintTree(g, k) {
    const s = k.size, trunk = "#5A4A5E", lit = "#7C6A80";
    g.fillStyle = "rgba(0,0,0,.3)"; g.beginPath(); g.ellipse(0, 0, 0.9 * s, 0.1 * s, 0, 0, TAU); g.fill();
    // roots and a bendy trunk
    g.fillStyle = trunk; g.beginPath(); g.moveTo(-0.55 * s, 0); g.quadraticCurveTo(-0.25 * s, -0.1 * s, -0.22 * s, -0.6 * s); g.bezierCurveTo(-0.3 * s, -1.5 * s, 0.15 * s, -1.9 * s, -0.05 * s, -2.6 * s);
    g.lineTo(0.2 * s, -2.55 * s); g.bezierCurveTo(0.4 * s, -1.8 * s, 0.1 * s, -1.3 * s, 0.24 * s, -0.6 * s); g.quadraticCurveTo(0.28 * s, -0.1 * s, 0.6 * s, 0); g.closePath(); ink2(g);
    // arms with little three-fingered twig hands, flung up like a rubber-hose dancer
    for (const [sd, y0, len, up] of [[-1, 1.6, 1.0, 0.7], [1, 1.95, 0.9, 0.9], [-1, 2.3, 0.6, 1.0], [1, 1.2, 0.6, 0.3]]) {
      const x0 = 0.05 * s, ex = sd * len * s, ey = -(y0 + up * 0.6) * s;
      g.lineWidth = 0.19 * s; g.strokeStyle = INK; g.beginPath(); g.moveTo(x0, -y0 * s); g.quadraticCurveTo(sd * len * 0.6 * s, -(y0 - 0.1) * s, ex, ey); g.stroke();
      g.lineWidth = 0.12 * s; g.strokeStyle = trunk; g.stroke();
      g.lineWidth = 0.05 * s; g.strokeStyle = INK; for (const a of [-0.6, 0, 0.6]) { g.beginPath(); g.moveTo(ex, ey); g.lineTo(ex + Math.sin(a + sd * 0.5) * 0.22 * s * sd, ey - Math.cos(a) * 0.22 * s); g.stroke(); }
    }
    g.lineWidth = Math.max(0.03, 1.6 / GY.S); g.strokeStyle = INK;
    g.fillStyle = lit; g.beginPath(); g.moveTo(-0.16 * s, -0.5 * s); g.bezierCurveTo(-0.22 * s, -1.4 * s, 0.1 * s, -1.8 * s, -0.02 * s, -2.4 * s); g.lineTo(0.03 * s, -2.38 * s); g.bezierCurveTo(0.12 * s, -1.8 * s, -0.12 * s, -1.4 * s, -0.08 * s, -0.5 * s); g.closePath(); g.fill();
    // a sleepy knothole face
    g.fillStyle = "#2A1E2C"; for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(0.02 * s + sd * 0.12 * s, -1.25 * s, 0.07 * s, 0.1 * s, 0, 0, TAU); g.fill(); }
    g.fillStyle = "#F2E7C9"; for (const sd of [-1, 1]) { g.beginPath(); g.arc(0.03 * s + sd * 0.12 * s, -1.27 * s, 0.025 * s, 0, TAU); g.fill(); }
    g.fillStyle = "#2A1E2C"; g.beginPath(); g.ellipse(0.03 * s, -0.98 * s, 0.09 * s, 0.13 * s, 0, 0, TAU); g.fill();
    g.fillStyle = "#C8642A"; g.strokeStyle = INK; g.lineWidth = 0.025 * s; for (const [x, y] of [[-0.8, -2.0], [0.7, -2.55], [-0.45, -2.75]]) { g.beginPath(); g.ellipse(x * s, y * s, 0.08 * s, 0.05 * s, 0.6, 0, TAU); ink2(g); }
  }
  function paintCrypt(g) {
    g.fillStyle = "rgba(0,0,0,.3)"; g.beginPath(); g.ellipse(0, 0, 1.5, 0.15, 0, 0, TAU); g.fill();
    g.fillStyle = "#7C8798"; g.beginPath(); g.rect(-1.1, -1.7, 2.2, 1.7); ink2(g);
    g.fillStyle = "#98A3B4"; g.beginPath(); g.moveTo(-1.3, -1.7); g.lineTo(0, -2.5); g.lineTo(1.3, -1.7); g.closePath(); ink2(g);
    g.fillStyle = "#1E1826"; g.beginPath(); g.moveTo(-0.38, 0); g.lineTo(-0.38, -0.95); g.quadraticCurveTo(0, -1.35, 0.38, -0.95); g.lineTo(0.38, 0); g.closePath(); ink2(g);
    g.fillStyle = "#98A3B4"; for (const x of [-0.85, 0.85]) { g.beginPath(); g.rect(x - 0.1, -1.62, 0.2, 1.62); ink2(g); }
    g.fillStyle = "#FFD27A"; for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(sd * 0.14, -0.7, 0.05, 0.07, 0, 0, TAU); g.fill(); }
    g.fillStyle = "rgba(23,19,15,.6)"; g.font = "bold 0.2px Georgia, serif"; g.textAlign = "center"; g.fillText("FAMILY", 0, -1.45);
  }
  function paintTuft(g, k) {
    const n = 7, s = k.size;
    for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (i - (n - 1) / 2) * 0.22, l = (0.22 + ((i * 37) % 5) * 0.03) * s, bx = (i - (n - 1) / 2) * 0.03 * s;
      g.fillStyle = i % 2 ? "#4A7A4A" : "#3E6A42"; g.beginPath(); g.moveTo(bx - 0.03 * s, 0); g.quadraticCurveTo(bx + Math.cos(a) * l * 0.4 - 0.02, Math.sin(a) * l * 0.5, bx + Math.cos(a) * l, Math.sin(a) * l); g.quadraticCurveTo(bx + Math.cos(a) * l * 0.4 + 0.03, Math.sin(a) * l * 0.5, bx + 0.03 * s, 0); g.closePath(); ink2(g); }
  }
  function paintLantern(g) {
    g.fillStyle = "#2A2E36"; g.beginPath(); g.rect(-0.04, -1.5, 0.08, 1.5); ink2(g); g.beginPath(); g.moveTo(-0.04, -1.45); g.quadraticCurveTo(0.25, -1.55, 0.32, -1.4); g.lineWidth = 0.06; g.stroke(); g.lineWidth = 0.028;
    g.fillStyle = "#2A2E36"; g.beginPath(); g.rect(-0.12, -0.08, 0.24, 0.08); ink2(g);
  }
  function paintFence(g) {
    g.lineWidth = 0.09; for (let i = 0; i < 9; i++) { const x = -1.6 + i * 0.4, h = 1.0 + Math.sin(i * 1.7) * 0.08, bend = Math.sin(i * 2.3) * 0.08; g.strokeStyle = INK; g.beginPath(); g.moveTo(x, 0); g.quadraticCurveTo(x + bend, -h * 0.5, x, -h); g.stroke(); g.fillStyle = INK; g.beginPath(); g.moveTo(x - 0.07, -h + 0.02); g.lineTo(x, -h - 0.16); g.lineTo(x + 0.07, -h + 0.02); g.fill(); }
    g.lineWidth = 0.07; g.beginPath(); g.moveTo(-1.7, -0.8); g.quadraticCurveTo(0, -0.74, 1.7, -0.82); g.moveTo(-1.7, -0.2); g.quadraticCurveTo(0, -0.24, 1.7, -0.18); g.stroke();
    g.lineWidth = 0.035; g.strokeStyle = "#4A5060"; for (let i = 0; i < 9; i++) { const x = -1.6 + i * 0.4, h = 1.0 + Math.sin(i * 1.7) * 0.08; g.beginPath(); g.moveTo(x, -0.02); g.lineTo(x, -h + 0.04); g.stroke(); }
  }
  function spriteFor(k) {
    const key = k.kind === "stone" || k.kind === "cross" || k.kind === "slab" || k.kind === "obelisk" || k.kind === "tree" || k.kind === "tuft" ? k.kind + k.seed : k.kind;
    if (GY.sprites[key]) return GY.sprites[key];
    const S = projectBase(0, 0, k.z).s * 1.1;
    let sp;
    if (k.kind === "tree") sp = sprite(2.4 * k.size, 3.1 * k.size, 1.2 * k.size, 2.95 * k.size, S, g => paintTree(g, k));
    else if (k.kind === "crypt") sp = sprite(3.2, 2.7, 1.6, 2.6, S, paintCrypt);
    else if (k.kind === "tuft") sp = sprite(0.8 * k.size, 0.45 * k.size, 0.4 * k.size, 0.4 * k.size, S, g => paintTuft(g, k));
    else if (k.kind === "lantern") sp = sprite(0.8, 1.7, 0.2, 1.65, S, paintLantern);
    else if (k.kind === "fence") sp = sprite(3.6, 1.35, 1.8, 1.25, S, paintFence);
    else sp = sprite(1.0, 1.9, 0.5, 1.8, S, g => paintStone(g, k));
    return (GY.sprites[key] = sp);
  }
  function graveyardResize() { GY.sprites = {}; GY.S = projectBase(0, 0, 10).s; }

  // ── drawing a prop in the world: squash on the beat, sway, and the odd wakeful headstone
  function drawProp(k) {
    if (k.kind === "digger") { drawDigger(); return; }
    const p = project(k.x, 0, k.z); if (p.x < -U * 1.2 || p.x > W + U * 1.2) return;
    const sp = spriteFor(k), sc = p.s / sp.S, t = world.t, bb = beatBounce(t, k.ph);
    const sway = k.kind === "tree" ? Math.sin(twos(t) * 1.1 + k.ph * 6) * 0.05 : k.kind === "tuft" ? Math.sin(twos(t) * 2 + k.ph * 9) * 0.12 : 0;
    ctx.save(); ctx.translate(p.x, p.y); if (k.tilt) ctx.rotate(k.tilt);
    if (sway) ctx.transform(1, 0, sway, 1, 0, 0);
    ctx.scale(sc * (1 - bb * 0.04), sc * (1 + bb * 0.06));
    if (k.kind === "lantern") {   // a warm pool of light, flickering
      const fl = 0.75 + 0.25 * Math.sin(t * 13 + k.ph * 9) * Math.sin(t * 4.1);
      ctx.save(); ctx.globalCompositeOperation = "lighter"; const g = ctx.createRadialGradient(0.32 * sp.S, -1.25 * sp.S, 0, 0.32 * sp.S, -1.25 * sp.S, 1.4 * sp.S); g.addColorStop(0, `rgba(255,200,110,${0.32 * fl})`); g.addColorStop(1, "rgba(255,200,110,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0.32 * sp.S, -1.25 * sp.S, 1.4 * sp.S, 0, TAU); ctx.fill(); ctx.restore();
    }
    ctx.drawImage(sp.c, -sp.ax, -sp.ay, sp.w, sp.h);
    if (k.kind === "lantern") { const sw = Math.sin(twos(t) * 2 + k.ph) * 0.08; ctx.save(); ctx.translate(0.32 * sp.S, -1.38 * sp.S); ctx.rotate(sw); ctx.strokeStyle = INK; ctx.lineWidth = 0.03 * sp.S; ctx.fillStyle = `rgba(255,${190 + ((Math.sin(t * 13) * 30) | 0)},100,1)`; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 0.08 * sp.S); ctx.stroke(); ctx.beginPath(); ctx.ellipse(0, 0.2 * sp.S, 0.09 * sp.S, 0.13 * sp.S, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore(); }
    if (k.face && (k.kind === "stone" || k.kind === "slab")) drawStoneFace(k, sp, t);
    ctx.restore();
  }
  // some headstones are only pretending to sleep: they open their eyes to watch the skull fly
  function drawStoneFace(k, sp, t) {
    const S = sp.S, h = k.h, awake = game.state === "flying" || ((t + k.ph * 17) % 11) < 1.6, ey = -h * 0.55 * S;
    ctx.lineWidth = 0.03 * S; ctx.strokeStyle = INK;
    for (const sd of [-1, 1]) {
      const ex = sd * 0.12 * S;
      if (!awake) { ctx.beginPath(); ctx.arc(ex, ey - 0.02 * S, 0.06 * S, 0.2, Math.PI - 0.2); ctx.stroke(); continue; }
      ctx.fillStyle = CREAM; ctx.beginPath(); ctx.ellipse(ex, ey, 0.07 * S, 0.09 * S, 0, 0, TAU); ctx.fill(); ctx.stroke();
      const lx = clamp((skull.pos.x - k.x) * 0.2, -0.5, 0.5) * 0.03 * S, px = ex + lx, py = ey + 0.015 * S;
      ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(px, py, 0.035 * S, 0.05 * S, 0, 0, TAU); ctx.fill(); ctx.fillStyle = CREAM; ctx.beginPath(); ctx.moveTo(px, py); ctx.arc(px, py, 0.055 * S, -1.3, -0.6); ctx.closePath(); ctx.fill();
    }
    ctx.beginPath(); if (awake && game.state === "flying") ctx.ellipse(0, ey + 0.2 * S, 0.05 * S, 0.06 * S, 0, 0, TAU); else ctx.arc(0, ey + 0.12 * S, 0.07 * S, 0.3, Math.PI - 0.3); ctx.stroke();
  }

  // ── the gravedigger: dig, dig, toss, and every so often lean on the shovel for a yawn
  const DIG_CYCLE = 2.4, DIG = { x: -2.9, z: 12.5 };
  function updateDigger(dt) {
    const D = GY.digger || (GY.digger = { t: 0, dirt: [], mound: 0.4, lastChk: -1, yawn: 0 });
    D.t += dt;
    const cyc = D.t % (DIG_CYCLE * 5), ph = (D.t % DIG_CYCLE) / DIG_CYCLE, resting = cyc > DIG_CYCLE * 4;
    D.yawn = resting ? Math.sin(((cyc - DIG_CYCLE * 4) / DIG_CYCLE) * Math.PI) : 0;
    if (!resting && ph > 0.55 && D.lastChk < 0.55) {   // the toss: a spadeful of dirt flies onto the mound
      for (let i = 0; i < 5; i++) D.dirt.push({ x: DIG.x + 0.35, y: 0.5, z: DIG.z, vx: -0.9 - Math.random() * 0.5, vy: 1.8 + Math.random() * 0.6, vz: (Math.random() - 0.5) * 0.4, t: 0 });
      D.mound = Math.min(1, D.mound + 0.02);
      const p = project(DIG.x, 0, DIG.z); if (screen === "play" && !paused) Sound.toon("shovel", panX(p.x));
    }
    if (!resting && ph > 0.2 && D.lastChk < 0.2 && D.mound > 0.95) D.mound = 0.4;   // (someone keeps putting it back)
    D.lastChk = resting ? 0 : ph;
    for (const d of D.dirt) { d.t += dt; d.x += d.vx * dt; d.z += d.vz * dt; d.vy -= 9 * dt; d.y += d.vy * dt; }
    D.dirt = D.dirt.filter(d => d.y > 0);
  }
  function drawDigger() {
    const D = GY.digger || { t: 0, dirt: [], mound: 0.4, yawn: 0 }, t = D.t, x0 = DIG.x, z0 = DIG.z, p = project(x0, 0, z0), s = p.s;
    if (p.x < -s * 2 || p.x > W + s * 2) return;
    const cyc = t % (DIG_CYCLE * 5), resting = cyc > DIG_CYCLE * 4, ph = twos(t) % DIG_CYCLE / DIG_CYCLE;
    // the hole and the mound beside it
    const hp = project(x0 + 0.45, 0, z0 - 0.1), mp = project(x0 - 0.75, 0, z0 + 0.1);
    ctx.fillStyle = "#1A120C"; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.5, s * 0.02); ctx.beginPath(); ctx.ellipse(hp.x, hp.y, 0.45 * s, 0.1 * s, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#6A4A2E"; ctx.beginPath(); const mh = (0.2 + 0.25 * D.mound) * s; ctx.moveTo(mp.x - 0.5 * s, mp.y); ctx.quadraticCurveTo(mp.x - 0.3 * s, mp.y - mh, mp.x, mp.y - mh); ctx.quadraticCurveTo(mp.x + 0.3 * s, mp.y - mh, mp.x + 0.5 * s, mp.y); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#8A6A44"; ctx.beginPath(); ctx.ellipse(mp.x - 0.1 * s, mp.y - mh * 0.75, 0.12 * s, 0.04 * s, -0.2, 0, TAU); ctx.fill();
    // the digger himself, knee-deep in the hole
    const dig = resting ? 0 : ph < 0.45 ? ph / 0.45 : ph < 0.6 ? 1 - (ph - 0.45) / 0.15 * 1.3 : -0.3 + (ph - 0.6) / 0.4 * 0.3;   // shovel down, heave, toss
    const lean = resting ? -0.05 : 0.25 * dig, bob = beatBounce(t) * 0.02 * s;
    ctx.save(); ctx.translate(hp.x - 0.05 * s, hp.y + bob); ctx.lineJoin = "round"; ctx.lineCap = "round";
    const L = s, O = n => Math.max(1.5, L * n);
    const torsoTop = { x: Math.sin(lean) * 0.55 * L, y: -0.95 * L + Math.cos(lean) * 0.05 * L }, hip = { x: 0, y: -0.25 * L };
    // body: a lanky stooped fellow in a patched coat
    ctx.fillStyle = "#4A5A6E"; ctx.strokeStyle = INK; ctx.lineWidth = O(0.025);
    ctx.beginPath(); ctx.moveTo(hip.x - 0.16 * L, hip.y + 0.12 * L); ctx.quadraticCurveTo(torsoTop.x - 0.22 * L, (hip.y + torsoTop.y) / 2, torsoTop.x - 0.12 * L, torsoTop.y); ctx.lineTo(torsoTop.x + 0.14 * L, torsoTop.y); ctx.quadraticCurveTo(torsoTop.x + 0.18 * L, (hip.y + torsoTop.y) / 2, hip.x + 0.16 * L, hip.y + 0.12 * L); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#8A6A44"; ctx.fillRect(hip.x - 0.08 * L, hip.y - 0.25 * L, 0.1 * L, 0.08 * L); ctx.strokeRect(hip.x - 0.08 * L, hip.y - 0.25 * L, 0.1 * L, 0.08 * L);
    // head: a long nose, pie eyes, a flat cap; he yawns on his break
    const hx = torsoTop.x + 0.05 * L, hy = torsoTop.y - 0.16 * L;
    ctx.fillStyle = "#E8C8A0"; ctx.beginPath(); ctx.ellipse(hx, hy, 0.13 * L, 0.15 * L, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(hx + 0.13 * L, hy + 0.02 * L, 0.07 * L, 0.05 * L, 0.2, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = CREAM; ctx.beginPath(); ctx.ellipse(hx + 0.05 * L, hy - 0.05 * L, 0.045 * L, 0.06 * L, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = INK; if (D.yawn > 0.5) { ctx.beginPath(); ctx.moveTo(hx + 0.02 * L, hy - 0.05 * L); ctx.lineTo(hx + 0.08 * L, hy - 0.05 * L); ctx.stroke(); } else { ctx.beginPath(); ctx.arc(hx + 0.065 * L, hy - 0.045 * L, 0.02 * L, 0, TAU); ctx.fill(); }
    if (D.yawn > 0.05) { ctx.fillStyle = "#3A1A14"; ctx.beginPath(); ctx.ellipse(hx + 0.04 * L, hy + 0.08 * L, 0.04 * L, 0.06 * L * D.yawn, 0, 0, TAU); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = "#6A5A48"; ctx.beginPath(); ctx.ellipse(hx, hy - 0.12 * L, 0.16 * L, 0.06 * L, -0.1, Math.PI, TAU); ctx.lineTo(hx + 0.2 * L, hy - 0.1 * L); ctx.closePath(); ctx.fill(); ctx.stroke();
    // arms (rubber hose) and gloves on the shovel
    const shAng = resting ? 0.1 : -0.2 + dig * 1.1, grip = { x: torsoTop.x + 0.3 * L, y: torsoTop.y + 0.25 * L + dig * 0.15 * L };
    const blade = { x: grip.x + Math.sin(shAng + 0.5) * 0.75 * L, y: grip.y + Math.cos(shAng + 0.5) * 0.75 * L };
    ctx.strokeStyle = INK; ctx.lineWidth = O(0.045); ctx.beginPath(); ctx.moveTo(grip.x - Math.sin(shAng + 0.5) * 0.35 * L, grip.y - Math.cos(shAng + 0.5) * 0.35 * L); ctx.lineTo(blade.x, blade.y); ctx.stroke(); ctx.strokeStyle = "#A87A48"; ctx.lineWidth = O(0.028); ctx.stroke();
    ctx.save(); ctx.translate(blade.x, blade.y); ctx.rotate(-(shAng + 0.5)); ctx.fillStyle = "#9AA4AE"; ctx.strokeStyle = INK; ctx.lineWidth = O(0.02); ctx.beginPath(); ctx.moveTo(-0.09 * L, 0); ctx.lineTo(0.09 * L, 0); ctx.quadraticCurveTo(0.1 * L, 0.2 * L, 0, 0.26 * L); ctx.quadraticCurveTo(-0.1 * L, 0.2 * L, -0.09 * L, 0); ctx.fill(); ctx.stroke(); if (!resting && ph > 0.4 && ph < 0.6) { ctx.fillStyle = "#6A4A2E"; ctx.beginPath(); ctx.ellipse(0, 0.12 * L, 0.07 * L, 0.05 * L, 0, 0, TAU); ctx.fill(); } ctx.restore();
    for (const [gx, gy] of [[grip.x, grip.y], [grip.x - Math.sin(shAng + 0.5) * 0.28 * L, grip.y - Math.cos(shAng + 0.5) * 0.28 * L]]) {
      ctx.strokeStyle = INK; ctx.lineWidth = O(0.06); ctx.beginPath(); ctx.moveTo(torsoTop.x, torsoTop.y + 0.08 * L); ctx.quadraticCurveTo((torsoTop.x + gx) / 2 + 0.05 * L, torsoTop.y + 0.3 * L, gx, gy); ctx.stroke(); ctx.strokeStyle = "#4A5A6E"; ctx.lineWidth = O(0.035); ctx.stroke();
      ctx.fillStyle = "#F7F1DF"; ctx.strokeStyle = INK; ctx.lineWidth = O(0.02); ctx.beginPath(); ctx.arc(gx, gy, 0.055 * L, 0, TAU); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
    // the near lip of the hole hides his legs
    ctx.fillStyle = "#2E221A"; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.5, s * 0.02); ctx.beginPath(); ctx.ellipse(hp.x, hp.y + 0.02 * s, 0.47 * s, 0.07 * s, 0, 0, Math.PI); ctx.fill(); ctx.stroke();
    if (resting && D.yawn > 0.3) { ctx.font = `${Math.round(s * 0.16)}px ${DISPLAY}`; ctx.fillStyle = CREAM; ctx.strokeStyle = INK; ctx.lineWidth = 3; const zx = hp.x + 0.35 * s, zy = hp.y - 1.3 * s - D.yawn * 0.2 * s; ctx.strokeText("z", zx, zy); ctx.fillText("z", zx, zy); }
    for (const d of D.dirt) { const q = project(d.x, d.y, d.z); ctx.fillStyle = "#6A4A2E"; ctx.beginPath(); ctx.arc(q.x, q.y, Math.max(1.5, 0.04 * q.s), 0, TAU); ctx.fill(); }
  }

  // ── the black cat: now and then it strolls across between you and the ring, stops, stares, and moves on
  function spawnCat() {
    const dir = Math.random() < 0.5 ? 1 : -1, z = rand(2.6, 3.6), hw = halfWidthAt(z) + 0.8;
    GY.cat = { x: -dir * hw, z, dir, end: dir * hw, t: 0, state: "walk", sitAt: rand(-0.5, 0.5) * hw * 0.6, sat: false, sitT: 0, scare: 0, meowed: false };
  }
  function updateCat(dt) {
    const w = world;
    if (!GY.cat) { if (w.t >= w.next.cat) { spawnCat(); w.next.cat = w.t + rand(24, 42); } return; }
    const C = GY.cat; C.t += dt;
    if (C.scare > 0 && C.state !== "run") { C.state = "run"; Sound.toon("hiss", panX(project(C.x, 0, C.z).x)); }
    if (C.state === "walk") { C.x += C.dir * 0.75 * dt; if (!C.sat && C.dir * (C.x - C.sitAt) >= 0) { C.state = "sit"; C.sat = true; C.sitT = rand(2.2, 3.5); } }
    else if (C.state === "sit") { C.sitT -= dt; if (!C.meowed && C.sitT < 1.4) { C.meowed = true; Sound.toon("meow", panX(project(C.x, 0, C.z).x)); } if (C.sitT <= 0) C.state = "walk"; }
    else { C.x += C.dir * 4 * dt; C.scare = Math.max(0, C.scare - dt); }
    if (C.dir * (C.x - C.end) > 0) GY.cat = null;
  }
  function drawCat() {
    const C = GY.cat; if (!C) return;
    const p = project(C.x, 0, C.z), s = p.s, t = C.t, walk = C.state !== "sit", run = C.state === "run", ph = twos(t) * (run ? 22 : 9);
    ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.beginPath(); ctx.ellipse(p.x, p.y, 0.28 * s, 0.05 * s, 0, 0, TAU); ctx.fill();
    ctx.save(); ctx.translate(p.x, p.y); ctx.scale(C.dir, 1); ctx.lineJoin = "round"; ctx.lineCap = "round";
    const O = n => Math.max(1.2, s * n), body = "#1C1A22", bob = walk ? Math.abs(Math.sin(ph)) * 0.02 * s : 0, puff = run ? 1.25 : 1;
    ctx.strokeStyle = INK; ctx.fillStyle = body; ctx.lineWidth = O(0.018);
    // tail: up like a question mark, twitching
    const tw = Math.sin(twos(t) * 3) * 0.06 * s;
    ctx.lineWidth = O(0.05); ctx.beginPath(); ctx.moveTo(-0.16 * s, -0.16 * s - bob); ctx.bezierCurveTo(-0.32 * s, -0.25 * s, -0.24 * s, -0.5 * s, -0.3 * s + tw, -0.52 * s); ctx.stroke();
    ctx.strokeStyle = body; ctx.lineWidth = O(0.03); ctx.stroke(); ctx.strokeStyle = INK; ctx.lineWidth = O(0.018);
    // legs
    const legs = walk ? [[-0.1, Math.sin(ph)], [-0.06, -Math.sin(ph)], [0.1, -Math.sin(ph)], [0.14, Math.sin(ph)]] : [[-0.1, 0], [0.12, 0]];
    for (const [lx, sw] of legs) { ctx.lineWidth = O(0.04); ctx.strokeStyle = INK; ctx.beginPath(); ctx.moveTo(lx * s, -0.12 * s - bob); ctx.lineTo(lx * s + sw * 0.05 * s, 0); ctx.stroke(); ctx.strokeStyle = body; ctx.lineWidth = O(0.022); ctx.stroke(); }
    ctx.strokeStyle = INK; ctx.lineWidth = O(0.018);
    // body: sitting up, or a long bean when walking
    ctx.fillStyle = body; ctx.beginPath();
    if (walk) ctx.ellipse(0, -0.17 * s - bob, 0.2 * s * puff, 0.08 * s * puff, 0, 0, TAU); else ctx.ellipse(-0.02 * s, -0.16 * s, 0.11 * s, 0.16 * s, -0.2, 0, TAU);
    ctx.fill(); ctx.stroke();
    // head, ears, big pie eyes (it looks right at you when it sits)
    const hx = walk ? 0.2 * s : 0.06 * s, hy = walk ? -0.26 * s - bob : -0.36 * s;
    ctx.beginPath(); ctx.arc(hx, hy, 0.09 * s, 0, TAU); ctx.fill(); ctx.stroke();
    for (const ex of [-0.055, 0.05]) { ctx.beginPath(); ctx.moveTo(hx + ex * s - 0.03 * s, hy - 0.06 * s); ctx.lineTo(hx + ex * s, hy - 0.15 * s); ctx.lineTo(hx + ex * s + 0.035 * s, hy - 0.05 * s); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    const blink = ((t * 0.9) % 3) < 0.12;
    for (const ex of [-0.035, 0.035]) { const x = hx + ex * s + (walk ? 0.02 * s : 0), y = hy - 0.005 * s;
      if (blink) { ctx.strokeStyle = "#E8D84A"; ctx.beginPath(); ctx.moveTo(x - 0.02 * s, y); ctx.lineTo(x + 0.02 * s, y); ctx.stroke(); ctx.strokeStyle = INK; continue; }
      ctx.fillStyle = "#E8D84A"; ctx.beginPath(); ctx.ellipse(x, y, 0.028 * s, 0.035 * s, 0, 0, TAU); ctx.fill(); ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(x + (walk ? 0.008 * s : 0), y, 0.008 * s, 0.03 * s * (run ? 0.4 : 1), 0, 0, TAU); ctx.fill(); ctx.fillStyle = body; }
    ctx.strokeStyle = "rgba(242,231,201,.6)"; ctx.lineWidth = O(0.006); for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(hx + 0.04 * s, hy + 0.03 * s); ctx.lineTo(hx + 0.13 * s, hy + 0.02 * s + sd * 0.02 * s); ctx.stroke(); }
    ctx.restore();
  }

  // ── hooks for the rest of the game
  function updateGraveyard(dt) { updateDigger(dt); updateCat(dt); }
  function drawPlayWorld() { drawCat(); }
