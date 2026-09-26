  // ───────────────────────── Moonshine Cemetery, rubber-hose edition ─────────────────────────
  // Every prop is an inked, flat-coloured cartoon (thick outlines, pie-cut eyes, white gloves) that bounces to
  // the beat of the waltz, stepping on twos like a 1930s short. Props are painted once per screen size into
  // sprites and drawn in the world with the camera, so they slide with the parallax like everything else.
  // The middle of the field (the throw lane and the boss's patch) stays clear.
  const twos = t => Math.floor(t * 12) / 12;
  const GY = { props: [], sprites: {}, digger: null, cat: null, S: 0 };
  // lay out the map's props (06d_props.js): painted back to front, in an order that never changes while the map is up
  function layOutProps() {
    const rnd = mulberry32(1933 + sceneMap * 101), P = [];
    const place = (kind, x, z, extra = {}) => { if (kind === "digger" || clearOfLane(x, z)) P.push({ kind, x, z, ph: rnd(), seed: (rnd() * 1e6) | 0, face: rnd() < 0.3, ...extra }); };
    if (!travelSetup(P)) { PROPSETS[look().props](place, rnd); P.sort((a, b) => b.z - a.z); }   // (a map that travels lays its props out along its track: 06g_travel.js)
    GY.props = P; GY.sprites = {}; travelApply();
  }

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
    const [base, lit] = STONE_PALS[k.pal || "grave"][k.col || 0], h = k.h || 0.9, w = 0.62, rnd = mulberry32(k.seed);
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
      g.fillStyle = look().grass[i % 2] || "#3E6A42"; g.beginPath(); g.moveTo(bx - 0.03 * s, 0); g.quadraticCurveTo(bx + Math.cos(a) * l * 0.4 - 0.02, Math.sin(a) * l * 0.5, bx + Math.cos(a) * l, Math.sin(a) * l); g.quadraticCurveTo(bx + Math.cos(a) * l * 0.4 + 0.03, Math.sin(a) * l * 0.5, bx + 0.03 * s, 0); g.closePath(); ink2(g); }
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
    const key = k.kind === "mausoleum" || k.kind === "crypt" || k.kind === "torch" || k.kind === "lantern" || k.kind === "lamppost" ? k.kind : k.kind + k.seed;   // (only the identical ones share a sprite)
    if (GY.sprites[key]) return GY.sprites[key];
    const S = projectBase(0, 0, k.z).s * 1.1;
    let sp;
    if (k.kind === "tree") sp = sprite(2.4 * k.size, 3.1 * k.size, 1.2 * k.size, 2.95 * k.size, S, g => paintTree(g, k));
    else if (k.kind === "crypt") sp = sprite(3.2, 2.7, 1.6, 2.6, S, paintCrypt);
    else if (k.kind === "tuft") sp = sprite(0.8 * k.size, 0.45 * k.size, 0.4 * k.size, 0.4 * k.size, S, g => paintTuft(g, k));
    else if (k.kind === "lantern") sp = sprite(0.8, 1.7, 0.2, 1.65, S, paintLantern);
    else if (k.kind === "fence") sp = sprite(3.6, 1.35, 1.8, 1.25, S, paintFence);
    else if (PROP_PAINT[k.kind]) { const [w, h, ax, ay] = PROP_SPRITES[k.kind], m = k.kind === "seats" || k.kind === "gear" ? 1 : k.size || 1; sp = sprite(w * m, h * m, ax * m, ay * m, S, g => PROP_PAINT[k.kind](g, k)); }
    else sp = sprite(1.0, 1.9, 0.5, 1.8, S, g => paintStone(g, k));
    return (GY.sprites[key] = sp);
  }
  function graveyardResize() { GY.sprites = {}; GY.S = projectBase(0, 0, 10).s; travelResize(); }

  // v54: each kind moves to the music in its own way (02f_music_clock.js), never all on every beat: grass and corn sway
  // all the time, trees sway over two beats, pumpkins, jack-o'-lanterns, hay and scarecrows hop on alternate beats
  // (half on the ones and threes, half on the twos and fours), some gravestones settle once a bar, lanterns swing every
  // two beats; the rest keep still
  const GROOVE_HOP = { pumpkin: 1, jack: 1, pumpkins: 1, hay: 1, haybale: 1, scarecrow: 1, balloons: 1 }, GROOVE_TREE = { tree: 1, bonetree: 1, cypress: 1, "tree-autumn": 1, pine: 1, "owl-tree": 1 };
  const GROOVE_GRASS = { tuft: 1, reeds: 1, corn: 1, cattails: 1, fern: 1 }, GROOVE_STONE = { stone: 1, cross: 1, slab: 1, obelisk: 1 }, GROOVE_SWING = { lantern: 1, "gas-lamp": 1, "mine-lamp": 1 };
  function propGroove(kind, ph, t) {
    if (GROOVE_HOP[kind]) return { bb: Groove.hop(ph), sway: kind === "scarecrow" || kind === "balloons" ? Groove.swing(ph) * 0.05 : 0 };
    if (GROOVE_TREE[kind]) return { bb: 0, sway: Groove.sway(ph) * 0.045 };
    if (GROOVE_GRASS[kind]) return { bb: 0, sway: Math.sin(twos(t) * 2 + ph * 9) * 0.1 + musicPulse(8) * 0.03 };
    if (GROOVE_STONE[kind]) return { bb: -Groove.settle(ph) * 0.5, sway: 0 };
    if (GROOVE_SWING[kind]) return { bb: 0, sway: Groove.swing(ph) * 0.06 };
    return { bb: 0, sway: 0 };
  }
  // ── drawing a prop in the world: squash on the beat, sway, and the odd wakeful headstone
  function drawProp(k) {
    if (k.kind === "digger") { drawDigger(); return; }
    const p = project(k.x, 0, k.z); if (p.x < -U * 1.2 || p.x > W + U * 1.2) return;
    const sp = spriteFor(k), sc = p.s / sp.S, t = world.t, G = propGroove(k.kind, k.ph, t), bb = G.bb, sway = G.sway;
    ctx.save(); ctx.translate(p.x, p.y); if (k.tilt) ctx.rotate(k.tilt);
    if (sway) ctx.transform(1, 0, sway, 1, 0, 0);
    reactXform(k);   // hit by a throw: it moves, bends, rotates, squeaks, shakes or falls (07n_environment.js)
    ctx.scale(sc * (1 - bb * 0.04), sc * (1 + bb * 0.06));
    const life = PROP_LIFE[k.kind]; if (life) { life(k, sp.S, t); const L = PROP_LIGHT[k.kind]; if (L) gpuLight(p.x + L[0] * p.s, p.y - L[1] * p.s * (k.size || 1), L[2] * p.s, L[3], 0.3); }   // light, drawn under the sprite so the prop stands in its own glow (and on the GPU: 08j_gpu.js)
    ctx.drawImage(sp.c, -sp.ax, -sp.ay, sp.w, sp.h); drawCrack(k, sp);
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
  // v54: the gravedigger works like a man with a shovel, not a toy. One dig takes a bar of the music (02f_music_clock.js)
  // and runs in eight phases, each with its own curve, and his parts don't all move together:
  //   1 anticipation · he leans back and lifts the shovel high     2 strike · he drops his weight and drives it down, fast
  //   3 contact · the blade stops in the dirt, a puff comes up, his knees give     4 scoop · he levers it, the load on the blade
  //   5 lift · his legs straighten, the shovel comes up            6 throw · his body turns away and the shovel sweeps back
  //   7 follow-through · the shovel carries on past his hands and settles     8 recovery · upright again, arms easy
  // The shovel isn't glued to his hands: its angle follows his grip on a spring, so it lags a swing and overshoots a stop.
  // What he throws is a clump of earth with a few loose bits and some dust, each flying and spinning under gravity until
  // it lands (the clumps on his mound). The moments are events (contact, throw), so the sound and the dirt happen exactly
  // then. And he isn't a loop: now and then a heavy one (a struggle, a bigger load), a tired one (he stops to wipe his
  // brow), a stuck one (two tugs before it comes free) or a quick pair of digs before the throw; every fifth bar he leans
  // on the shovel for a yawn. In the phrase the music gives him (bars 13–16) he digs big.
  const DIG = { x: -2.9, z: 12.5 };
  // his pose through a dig: [u, lean, crouch, blade angle (0 down, π/2 forward, π up, 3π/2 back), grip across, grip down]
  const DIG_KEYS = [[0, -0.02, 0, 0.45, 0.28, 0.3], [0.14, -0.18, 0, 2.55, 0.2, 0.04], [0.24, 0.32, 0.07, 0.25, 0.4, 0.42], [0.32, 0.34, 0.09, 0.2, 0.38, 0.45],
    [0.44, 0.2, 0.06, 0.65, 0.24, 0.36], [0.56, 0, 0, 1.05, 0.2, 0.2], [0.66, -0.22, 0, 3.75, -0.05, 0.02], [0.78, -0.12, 0.02, 4.05, -0.1, 0.08], [1, -0.02, 0, 0.45, 0.28, 0.3]];
  const sm = u => smooth(u), DIG_EASE = [sm, sm, u => u * u * u, u => u, sm, sm, u => 1 - (1 - u) * (1 - u), sm];   // (the strike accelerates; the throw bursts out)
  function digPose(u, big = 1) {
    let i = 0; while (i < DIG_KEYS.length - 2 && u >= DIG_KEYS[i + 1][0]) i++;
    const A = DIG_KEYS[i], B = DIG_KEYS[i + 1], k = DIG_EASE[i](clamp((u - A[0]) / (B[0] - A[0]), 0, 1)), m = j => A[j] + (B[j] - A[j]) * k;
    return { phase: i + 1, lean: m(1) * big, crouch: m(2) * big, blade: m(3), gx: m(4), gy: m(5) };
  }
  const digKind = bar => { const h = ((bar * 2654435761) >>> 0) % 97; return bar % 5 === 4 ? "rest" : h < 10 ? "heavy" : h < 18 ? "tired" : h < 24 ? "stuck" : h < 32 ? "double" : "normal"; };
  function updateDigger(dt) {
    const D = GY.digger || (GY.digger = { t: 0, dirt: [], dust: [], mound: 0.4, yawn: 0, u: 0, bar: -1, kind: "normal", sa: 0.45, sv: 0, load: 0, events: [], lastU: 0 });
    D.t += dt;
    const C = MusicClock, bar = C.bar, big = Groove.busy("digger") ? 1.35 : 1;
    if (bar !== D.bar) { D.bar = bar; D.kind = digKind(bar); D.lastU = 0; }
    let u = C.inBar;
    if (D.kind === "heavy") u = u < 0.2 ? u * 0.7 : u < 0.46 ? 0.14 + (u - 0.2) * 0.69 : u;   // (a longer wind-up and a struggle at the bottom)
    if (D.kind === "double") u = u < 0.5 ? (u * 2) % 0.56 : 0.56 + (u - 0.5) * 0.88;   // (two quick digs, one throw)
    D.u = u; D.big = big;
    D.yawn = D.kind === "rest" ? Math.sin(C.inBar * Math.PI) : 0;
    const P = digPose(D.kind === "rest" ? 0 : u, big);
    let target = P.blade;
    if ((D.kind === "stuck" || D.kind === "heavy") && u > 0.24 && u < 0.44) target += Math.sin((u - 0.24) * 70) * 0.06;   // (tugging it free)
    // the shovel on its spring
    D.sv += ((target - D.sa) * 190 - D.sv * 17) * dt; D.sa += D.sv * dt;
    // the events: contact and throw, once each dig
    const cross = x => D.lastU < x && u >= x && D.kind !== "rest";
    if (cross(0.24)) digContact(D);
    if (cross(0.62)) digThrow(D);
    if (u >= 0.3 && u < 0.62 && D.kind !== "rest") D.load = Math.min(1, D.load + dt * 6);
    D.lastU = u;
    for (const d of D.dirt) { d.t += dt; d.x += d.vx * dt; d.z += d.vz * dt; d.vy -= 9 * dt; d.y += d.vy * dt; d.rot += d.spin * dt; if (d.y <= 0 && !d.landed) { d.landed = true; if (d.clump && Math.abs(d.x - (DIG.x - 0.75)) < 0.8) D.mound = Math.min(1, D.mound + 0.03); for (let i = 0; i < 2; i++) D.dust.push({ x: d.x, y: 0.02, z: d.z, vx: (Math.random() - 0.5) * 0.4, vy: 0.3, t: 0, life: 0.4 }); } }
    D.dirt = D.dirt.filter(d => !d.landed);
    for (const q of D.dust) { q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy *= 1 - dt * 2; }
    D.dust = D.dust.filter(q => q.t < q.life);
    if (D.mound > 0.95 && u < 0.1) D.mound = 0.4;   // (someone keeps putting it back)
  }
  // where the blade's tip is, in the world (his hands are in metres from where he stands in the hole)
  function digBlade(D) {
    const P = digPose(D.kind === "rest" ? 0 : D.u, D.big || 1), ox = DIG.x + 0.4, torso = { x: Math.sin(P.lean) * 0.55, y: 0.95 - P.crouch - Math.cos(P.lean) * 0.05 };
    const grip = { x: torso.x + P.gx, y: torso.y - P.gy }, a = D.sa;
    return { x: ox + grip.x + Math.sin(a) * 0.75, y: grip.y - Math.cos(a) * 0.75, z: DIG.z - 0.1, a };
  }
  function digContact(D) {
    const B = digBlade(D);
    for (let i = 0; i < 5; i++) D.dust.push({ x: B.x + (Math.random() - 0.5) * 0.2, y: 0.05, z: B.z, vx: (Math.random() - 0.5) * 0.6, vy: 0.4 + Math.random() * 0.4, t: 0, life: 0.5 + Math.random() * 0.3 });
    D.sv -= 3;   // (the blade jars on the dirt)
    const p = project(DIG.x, 0, DIG.z); if (screen === "play" && !paused) Sound.toon("shovel", panX(p.x));
  }
  function digThrow(D) {
    const B = digBlade(D), big = D.kind === "heavy" ? 1.4 : 1;
    D.dirt.push({ clump: true, x: B.x, y: Math.max(0.3, B.y), z: B.z, vx: -1.3, vy: 2.2, vz: 0, r: 0.09 * big, rot: 0, spin: 5, t: 0 });   // the main load: bigger, slower
    const n = 3 + ((D.bar * 7) % 5);
    for (let i = 0; i < n; i++) D.dirt.push({ x: B.x, y: Math.max(0.3, B.y), z: B.z, vx: -0.8 - Math.random() * 0.9, vy: 1.8 + Math.random() * 1.1, vz: (Math.random() - 0.5) * 0.5, r: 0.03 + Math.random() * 0.025, rot: Math.random() * TAU, spin: (Math.random() - 0.5) * 16, t: 0 });
    D.load = 0;
  }
  function drawDigger() {
    const sh = landShift(DIG.x, DIG.z); if (sh) { ctx.save(); ctx.translate(sh.x, sh.y); drawDiggerHere(); ctx.restore(); } else drawDiggerHere();   // (v57: on the land, 06h_land.js)
  }
  function drawDiggerHere() {
    const D = GY.digger || { t: 0, dirt: [], dust: [], mound: 0.4, yawn: 0, u: 0, kind: "normal", sa: 0.45, load: 0 }, x0 = DIG.x, z0 = DIG.z, p = project(x0, 0, z0), s = p.s;
    if (p.x < -s * 2 || p.x > W + s * 2) return;
    const resting = D.kind === "rest";
    // the hole and the mound beside it
    const hp = project(x0 + 0.45, 0, z0 - 0.1), mp = project(x0 - 0.75, 0, z0 + 0.1);
    ctx.fillStyle = "#1A120C"; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.5, s * 0.02); ctx.beginPath(); ctx.ellipse(hp.x, hp.y, 0.45 * s, 0.1 * s, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#6A4A2E"; ctx.beginPath(); const mh = (0.2 + 0.25 * D.mound) * s; ctx.moveTo(mp.x - 0.5 * s, mp.y); ctx.quadraticCurveTo(mp.x - 0.3 * s, mp.y - mh, mp.x, mp.y - mh); ctx.quadraticCurveTo(mp.x + 0.3 * s, mp.y - mh, mp.x + 0.5 * s, mp.y); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#8A6A44"; ctx.beginPath(); ctx.ellipse(mp.x - 0.1 * s, mp.y - mh * 0.75, 0.12 * s, 0.04 * s, -0.2, 0, TAU); ctx.fill();
    // the digger himself, knee-deep in the hole: posed from the dig (screen units: L pixels a metre, y down)
    const P = digPose(resting ? 0 : D.u, D.big || 1), L = s, O = n => Math.max(1.5, L * n);
    const lean = resting ? -0.05 : P.lean, crouch = resting ? 0 : P.crouch;
    ctx.save(); ctx.translate(hp.x - 0.05 * s, hp.y + crouch * L); ctx.lineJoin = "round"; ctx.lineCap = "round";
    const torsoTop = { x: Math.sin(lean) * 0.55 * L, y: -0.95 * L + Math.cos(lean) * 0.05 * L }, hip = { x: 0, y: -0.25 * L };
    // body: a lanky stooped fellow in a patched coat; the coat's tail lags his lean a touch
    const tail = -D.sv * 0.004 * L;
    ctx.fillStyle = "#4A5A6E"; ctx.strokeStyle = INK; ctx.lineWidth = O(0.025);
    ctx.beginPath(); ctx.moveTo(hip.x - 0.16 * L + tail, hip.y + 0.12 * L); ctx.quadraticCurveTo(torsoTop.x - 0.22 * L, (hip.y + torsoTop.y) / 2, torsoTop.x - 0.12 * L, torsoTop.y); ctx.lineTo(torsoTop.x + 0.14 * L, torsoTop.y); ctx.quadraticCurveTo(torsoTop.x + 0.18 * L, (hip.y + torsoTop.y) / 2, hip.x + 0.16 * L + tail, hip.y + 0.12 * L); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#8A6A44"; ctx.fillRect(hip.x - 0.08 * L, hip.y - 0.25 * L, 0.1 * L, 0.08 * L); ctx.strokeRect(hip.x - 0.08 * L, hip.y - 0.25 * L, 0.1 * L, 0.08 * L);
    // head: a long nose, pie eyes, a flat cap; he yawns on his break; the cap bobs after a jolt
    const hx = torsoTop.x + 0.05 * L, hy = torsoTop.y - 0.16 * L, capLag = clamp(-D.sv * 0.006, -0.05, 0.05) * L;
    ctx.fillStyle = "#E8C8A0"; ctx.beginPath(); ctx.ellipse(hx, hy, 0.13 * L, 0.15 * L, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(hx + 0.13 * L, hy + 0.02 * L, 0.07 * L, 0.05 * L, 0.2, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = CREAM; ctx.beginPath(); ctx.ellipse(hx + 0.05 * L, hy - 0.05 * L, 0.045 * L, 0.06 * L, 0, 0, TAU); ctx.fill(); ctx.stroke();
    const strain = !resting && (P.phase === 3 || P.phase === 4) && (D.kind === "heavy" || D.kind === "stuck");
    ctx.fillStyle = INK; if (D.yawn > 0.5 || strain) { ctx.beginPath(); ctx.moveTo(hx + 0.02 * L, hy - 0.05 * L); ctx.lineTo(hx + 0.08 * L, hy - 0.05 * L); ctx.stroke(); } else { ctx.beginPath(); ctx.arc(hx + 0.065 * L, hy - 0.045 * L, 0.02 * L, 0, TAU); ctx.fill(); }
    if (D.yawn > 0.05) { ctx.fillStyle = "#3A1A14"; ctx.beginPath(); ctx.ellipse(hx + 0.04 * L, hy + 0.08 * L, 0.04 * L, 0.06 * L * D.yawn, 0, 0, TAU); ctx.fill(); ctx.stroke(); }
    if (castVariant("gravedigger") === "prospector") {   // (v58: the desert's own: a wide sun hat and a red bandana)
      ctx.fillStyle = "#B8422E"; ctx.beginPath(); ctx.moveTo(hx - 0.12 * L, hy + 0.1 * L); ctx.lineTo(hx + 0.12 * L, hy + 0.1 * L); ctx.lineTo(hx, hy + 0.2 * L); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#C8A060"; ctx.beginPath(); ctx.ellipse(hx, hy - 0.1 * L + capLag, 0.3 * L, 0.05 * L, -0.08, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(hx - 0.13 * L, hy - 0.11 * L + capLag); ctx.quadraticCurveTo(hx - 0.12 * L, hy - 0.3 * L + capLag, hx, hy - 0.3 * L + capLag); ctx.quadraticCurveTo(hx + 0.12 * L, hy - 0.3 * L + capLag, hx + 0.13 * L, hy - 0.11 * L + capLag); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#6A3A22"; ctx.fillRect(hx - 0.13 * L, hy - 0.16 * L + capLag, 0.26 * L, 0.035 * L);
    } else { ctx.fillStyle = "#6A5A48"; ctx.beginPath(); ctx.ellipse(hx, hy - 0.12 * L + capLag, 0.16 * L, 0.06 * L, -0.1, Math.PI, TAU); ctx.lineTo(hx + 0.2 * L, hy - 0.1 * L + capLag); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    if (strain) { ctx.fillStyle = "#9FD0E8"; ctx.beginPath(); ctx.ellipse(hx - 0.14 * L, hy - 0.06 * L, 0.018 * L, 0.03 * L, 0, 0, TAU); ctx.fill(); }   // (a drop of sweat)
    // the shovel: its angle is the spring's (it lags and overshoots his hands), the grip where his hands are
    const a = resting ? 0.1 : D.sa, grip = { x: torsoTop.x + (resting ? 0.3 : P.gx) * L, y: torsoTop.y + (resting ? 0.3 : P.gy) * L };
    const dir = { x: Math.sin(a), y: Math.cos(a) }, blade = { x: grip.x + dir.x * 0.75 * L, y: grip.y + dir.y * 0.75 * L }, end = { x: grip.x - dir.x * 0.35 * L, y: grip.y - dir.y * 0.35 * L };
    ctx.strokeStyle = INK; ctx.lineWidth = O(0.045); ctx.beginPath(); ctx.moveTo(end.x, end.y); ctx.lineTo(blade.x, blade.y); ctx.stroke(); ctx.strokeStyle = "#A87A48"; ctx.lineWidth = O(0.028); ctx.stroke();
    ctx.save(); ctx.translate(blade.x, blade.y); ctx.rotate(-a); ctx.fillStyle = "#9AA4AE"; ctx.strokeStyle = INK; ctx.lineWidth = O(0.02); ctx.beginPath(); ctx.moveTo(-0.09 * L, 0); ctx.lineTo(0.09 * L, 0); ctx.quadraticCurveTo(0.1 * L, 0.2 * L, 0, 0.26 * L); ctx.quadraticCurveTo(-0.1 * L, 0.2 * L, -0.09 * L, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    if (D.load > 0.05) { ctx.fillStyle = "#6A4A2E"; ctx.beginPath(); ctx.ellipse(0, 0.12 * L, 0.11 * L * D.load, 0.07 * L * D.load, 0, 0, TAU); ctx.fill(); ctx.stroke(); }   // the load on the blade
    ctx.restore();
    // arms (rubber hose) and gloves: both on the shovel, except when he stops to wipe his brow
    const wipe = D.kind === "tired" && D.u > 0.8, hands = [[grip.x, grip.y], wipe ? [hx - 0.02 * L, hy - 0.08 * L] : [grip.x - dir.x * 0.28 * L, grip.y - dir.y * 0.28 * L]];
    for (const [gx, gy] of hands) {
      ctx.strokeStyle = INK; ctx.lineWidth = O(0.06); ctx.beginPath(); ctx.moveTo(torsoTop.x, torsoTop.y + 0.08 * L); ctx.quadraticCurveTo((torsoTop.x + gx) / 2 + 0.05 * L, torsoTop.y + 0.3 * L, gx, gy); ctx.stroke(); ctx.strokeStyle = "#4A5A6E"; ctx.lineWidth = O(0.035); ctx.stroke();
      ctx.fillStyle = "#F7F1DF"; ctx.strokeStyle = INK; ctx.lineWidth = O(0.02); ctx.beginPath(); ctx.arc(gx, gy, 0.055 * L, 0, TAU); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
    // the near lip of the hole hides his legs
    ctx.fillStyle = "#2E221A"; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.5, s * 0.02); ctx.beginPath(); ctx.ellipse(hp.x, hp.y + 0.02 * s, 0.47 * s, 0.07 * s, 0, 0, Math.PI); ctx.fill(); ctx.stroke();
    if (resting && D.yawn > 0.3) { ctx.font = `${Math.round(s * 0.16)}px ${DISPLAY}`; ctx.fillStyle = CREAM; ctx.strokeStyle = INK; ctx.lineWidth = 3; const zx = hp.x + 0.35 * s, zy = hp.y - 1.3 * s - D.yawn * 0.2 * s; ctx.strokeText("z", zx, zy); ctx.fillText("z", zx, zy); }
    // the earth in the air: clumps and bits spinning as they fly, and the dust
    for (const d of D.dirt) { const q = project(d.x, d.y, d.z), r = Math.max(1.5, d.r * q.s); ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(d.rot); ctx.fillStyle = d.clump ? "#5E4128" : "#6A4A2E"; ctx.beginPath(); ctx.moveTo(-r, 0); ctx.quadraticCurveTo(-r * 0.6, -r, 0, -r * 0.8); ctx.quadraticCurveTo(r, -r * 0.6, r, 0); ctx.quadraticCurveTo(r * 0.5, r, -r * 0.3, r * 0.8); ctx.closePath(); ctx.fill(); if (d.clump) { ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.stroke(); } ctx.restore(); }
    for (const q0 of D.dust) { const q = project(q0.x, q0.y, q0.z), k = q0.t / q0.life; ctx.fillStyle = `rgba(140,110,80,${0.35 * (1 - k)})`; ctx.beginPath(); ctx.arc(q.x, q.y, Math.max(1.5, (0.05 + k * 0.08) * q.s), 0, TAU); ctx.fill(); }
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
    // v50: moonlight along its back and the top of its head, pink in the ears, a glint in each eye
    ctx.strokeStyle = "rgba(170,180,220,.45)"; ctx.lineWidth = O(0.012); ctx.beginPath();
    if (walk) ctx.ellipse(0, -0.17 * s - bob, 0.18 * s * puff, 0.065 * s * puff, 0, Math.PI * 1.15, Math.PI * 1.75); else ctx.ellipse(-0.02 * s, -0.16 * s, 0.095 * s, 0.145 * s, -0.2, Math.PI * 1.1, Math.PI * 1.6);
    ctx.stroke(); ctx.beginPath(); ctx.arc(hx, hy, 0.078 * s, Math.PI * 1.1, Math.PI * 1.6); ctx.stroke();
    ctx.fillStyle = "#8A4A5A"; for (const ex of [-0.055, 0.05]) { ctx.beginPath(); ctx.moveTo(hx + ex * s - 0.015 * s, hy - 0.07 * s); ctx.lineTo(hx + ex * s, hy - 0.125 * s); ctx.lineTo(hx + ex * s + 0.018 * s, hy - 0.065 * s); ctx.closePath(); ctx.fill(); }
    if (!blink) { ctx.fillStyle = "rgba(255,255,255,.85)"; for (const ex of [-0.035, 0.035]) { ctx.beginPath(); ctx.arc(hx + ex * s + (walk ? 0.02 * s : 0) - 0.008 * s, hy - 0.018 * s, Math.max(0.6, 0.007 * s), 0, TAU); ctx.fill(); } }
    ctx.strokeStyle = "rgba(242,231,201,.6)"; ctx.lineWidth = O(0.006); for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(hx + 0.04 * s, hy + 0.03 * s); ctx.lineTo(hx + 0.13 * s, hy + 0.02 * s + sd * 0.02 * s); ctx.stroke(); }
    ctx.restore();
  }

  // ── hooks for the rest of the game
  function updateGraveyard(dt) { const A = look().ambient; if (A.digger) updateDigger(dt); if (A.cat) updateCat(dt); else GY.cat = null; }
  function drawPlayWorld() { if (game.state === "title") drawCat(); }   // (v53: in play the cat is drawn by depth with the near wanderers, in front of the ring: drawNearWorld)
