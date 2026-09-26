  // ───────────────────────── portals (v54) ─────────────────────────
  // The way from one place to the next is a throw, not a cut. When the end boss goes down, the ring, its pole and the
  // targets go at once (only the defeat is left on stage); the reward, the body part and the shard follow; then a black
  // portal ring opens where the ring was and the game hands you the launcher again. Throw Morty through it and the camera
  // goes with him: the arena is gone, there's only the rift, a tunnel of rings rushing past with Morty in the middle of
  // it, until the far end opens and the next place is there, and the picture comes up on it. The same again from Can
  // Alley (the bonus round) to the next map. It's one state, used for every hand-over:
  //   PORTAL_OPEN → (throw) → RIFT_TRAVEL → RIFT_EXIT → the destination (its set-up runs behind the rift) → play
  // A throw that misses the portal costs nothing: the skull comes back and you throw again. The portal is bigger than
  // any ring. In the spec's older tests (sandbox) the hand-over is instant unless a test asks for portals.
  const PORTAL = { phase: null, t: 0, dest: null, then: null, r: 1.02, y: RING_Y + 0.15, miss: 0, exitAt: 0, spin: 0 };
  const RIFT = { dur: 2.3, exit: 0.6, open: 0.6, arrive: 0.52 };   // (arrive: how far into the rift the destination is set up, far ahead)
  const portalsOn = () => !(sandbox && !sandbox.portalsOn);
  const portalOpen = () => PORTAL.phase === "open";
  // the stage empties the moment a boss is beaten: no ring, no pole, no targets (the defeat plays on its own)
  function clearStageForDefeat() { game.ringHidden = true; targets.length = 0; clearPickups(); }
  function portalTo(dest, then) {
    if (!portalsOn()) { game.ringHidden = false; then(); return; }
    Object.assign(PORTAL, { phase: "open", t: 0, dest, then, miss: 0 }); game.phase = "portal";
    game.ringHidden = true; targets.length = 0; clearPickups(); clearDirectors();
    setRingMode("static", false); ring.morph = 0; ring.frozen = { x: 0, y: PORTAL.y, z: RING_Z }; ring.x = 0; ring.y = PORTAL.y; ring.z = RING_Z; ring.rc = PORTAL.r;
    game.cine = null; game.state = "ready"; resetSkull();
    const where = dest === "bonus" ? t("portal.bonus") : t("portal.map", { map: mapData(Math.min(MAP_COUNT, (game.stage || 1) + 1)).name });
    stageCard(t("portal.k"), where, t("portal.s"), 2.4, "gold"); setHint(t("portal.hint"));
    Sound.toon("whistleUp"); Telemetry.emit("portal_open", { dest }); updateHud();
  }
  // what the ring's size and speed are while a portal's open (07b_stage.js asks)
  const portalRingSpec = () => (portalOpen() ? { rc: PORTAL.r, omega: 0, amp: 0, bob: 0 } : null);
  // a throw reaches the portal's plane (07_game.js's resolve asks first)
  function portalResolve(kind, R) {
    game.result = { kind, make: !!R.make, at: game.time, bonked: false, pts: 0, portal: true };
    if (R.make) { portalEnter(); return; }
    PORTAL.miss++; skull.missed = true; game.endTimer = 1.1;
    caption(t("portal.again"), W / 2, H * 0.3); Sound.toon("boing");
  }
  function portalEnter() {
    PORTAL.phase = "rift"; PORTAL.t = 0; game.endTimer = 1e9; Sound.flightStop(); Sound.toon("iris"); buzz([12, 40, 12]);   // (the throw doesn't end: it goes on through the rift)
    hideStageCard(); setHint("");   // (nothing of the arena's comes with him: not its card, not its hint)
    Telemetry.emit("portal_enter", { dest: PORTAL.dest, tries: PORTAL.miss + 1 });
    PORTAL.arrived = false; PORTAL.entry = portalSnap(PORTAL.entry); PORTAL.at = project(ring.x, ring.y, ring.z);   // (the last frame of the old place, for the camera to be pulled into)
    cine("rift", RIFT.dur + RIFT.exit, null, 0, [RIFT.dur * RIFT.arrive, portalArrive]);
  }
  // a copy of what's on the screen now (the frame as drawn so far)
  function portalSnap(into) {
    const c = into || document.createElement("canvas"); if (c.width !== cvs.width || c.height !== cvs.height) { c.width = cvs.width; c.height = cvs.height; }
    const g = c.getContext("2d"); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height); g.drawImage(cvs, 0, 0); return c;
  }
  // partway down the rift the destination is set up, so it's there far ahead of him, small, growing as he nears it
  // (its cards and hint wait under the rift: body.rifting hides them until the camera's out)
  function portalArrive() {
    PORTAL.arrived = true;
    game.ringHidden = false; ring.frozen = null; resetSkull();
    const f = PORTAL.then; PORTAL.then = null;
    if (f) f();
    Sound.toon("xylo");
  }
  // a missed throw at the portal comes back like any throw, but nothing's lost and nothing moves on
  function portalEndThrow() {
    if (!portalOpen()) return false;
    Sound.flightStop(); game.state = "ready"; resetSkull(); setHint(t("portal.hint")); return true;
  }
  function updatePortal(dt) {
    if (!PORTAL.phase) return;
    PORTAL.t += dt; PORTAL.spin += dt;
    if (PORTAL.phase === "rift" && PORTAL.t >= RIFT.dur) { PORTAL.phase = "exit"; PORTAL.exitAt = game.time; }
    if (PORTAL.phase === "exit" && game.time - PORTAL.exitAt > RIFT.exit) PORTAL.phase = null;
    document.body.classList.toggle("rifting", PORTAL.phase === "rift");
    if (PORTAL.phase === "open") portalMotes(dt);
  }
  function portalReset() { Object.assign(PORTAL, { phase: null, t: 0, dest: null, then: null, miss: 0 }); game.ringHidden = false; }

  // ── drawing (v55: a rupture in space, not a black cartoon tunnel). Cartoon world, convincing phenomenon: the portal's
  // depth, the way it bends the scenery round it, its light, and the camera's pull through the rift sell the travel.
  //   The portal: the scenery round the rim is lensed (a copy of it, magnified and turned, in rings); the opening falls
  //   away inward in receding layers to a far dark; the rim writhes (it's never a true circle); motes are drawn in off
  //   the surroundings; and it throws violet light on the ground under it.
  const LENS = document.createElement("canvas");
  function portalMotes(dt) {
    const P = PORTAL; P.motes = P.motes || [];
    if (P.motes.length < 26 && Math.random() < dt * 30) { const a = Math.random() * TAU; P.motes.push({ a, d: 1.7 + Math.random() * 0.9, v: 0.35 + Math.random() * 0.4, s: 0.6 + Math.random() * 0.8, hue: Math.random() < 0.3 }); }
    for (const m of P.motes) { m.d -= m.v * dt * (1 + (2 - m.d)); m.a += dt * (1.4 / Math.max(0.3, m.d)); }
    P.motes = P.motes.filter(m => m.d > 0.95);
  }
  const rimR = (a, t) => 1 + 0.045 * Math.sin(a * 5 + t * 3.1) + 0.03 * Math.sin(a * 11 - t * 5.3) + 0.02 * Math.sin(a * 17 + t * 7.7);
  function drawPortalRing(p, r) {
    const k = easeOutBack(clamp(PORTAL.t / RIFT.open, 0, 1)), R = r * k, t = PORTAL.spin; if (R < 1) return;
    // the light it throws on the ground below it
    const gp = project(ring.x, 0, ring.z), gl = ctx.createRadialGradient(gp.x, gp.y, 0, gp.x, gp.y, R * 2.2);
    gl.addColorStop(0, `rgba(150,110,255,${0.22 * k})`); gl.addColorStop(1, "rgba(150,110,255,0)");
    ctx.save(); ctx.fillStyle = gl; ctx.beginPath(); ctx.ellipse(gp.x, gp.y, R * 2.2, R * 0.5, 0, 0, TAU); ctx.fill(); ctx.restore();
    // the lensing: the scenery just round the rim, copied, magnified and turned, in three rings
    const L = Math.ceil(R * 2 * 1.9), ox = p.x - L / 2, oy = p.y - L / 2;
    if (!reduceMotion && QUALITY.level >= 0.5 && L > 4) {
      if (LENS.width !== Math.ceil(L * DPR)) { LENS.width = Math.ceil(L * DPR); LENS.height = LENS.width; }
      const lg = LENS.getContext("2d"); lg.setTransform(1, 0, 0, 1, 0, 0); lg.clearRect(0, 0, LENS.width, LENS.height);
      lg.drawImage(cvs, ox * DPR, oy * DPR, L * DPR, L * DPR, 0, 0, LENS.width, LENS.height);
      ctx.save(); ctx.translate(p.x, p.y);
      for (const [r0, r1, mag, rot] of [[R * 1.55, R * 1.9, 1.05, 0.03], [R * 1.25, R * 1.55, 1.13, 0.08], [R * 0.98, R * 1.25, 1.24, 0.16]]) {
        ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r1, 0, TAU); ctx.arc(0, 0, r0, 0, TAU, true); ctx.clip();
        ctx.rotate(rot * Math.sin(t * 0.7) + rot); ctx.scale(mag, mag); ctx.globalAlpha = 0.9; ctx.drawImage(LENS, -L / 2, -L / 2, L, L); ctx.restore();
      }
      ctx.restore();
    }
    ctx.save(); ctx.translate(p.x, p.y);
    // the opening: a writhing rim, and inside it the depth, layer after layer falling away to a far dark
    const rim = () => { ctx.beginPath(); for (let i = 0; i <= 64; i++) { const a = (i / 64) * TAU, rr = R * rimR(a, t); i ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); };
    ctx.save(); rim(); ctx.clip();
    const deep = ctx.createRadialGradient(R * 0.08, -R * 0.06, 0, 0, 0, R); deep.addColorStop(0, "#05030A"); deep.addColorStop(0.55, "#170A2C"); deep.addColorStop(0.9, "#3A1E6A"); deep.addColorStop(1, "#6A4AB8");
    ctx.fillStyle = deep; ctx.fillRect(-R * 1.2, -R * 1.2, R * 2.4, R * 2.4);
    for (let i = 0; i < 7; i++) {   // the receding layers, each smaller and further, drifting inward
      const z = ((i / 7 + t * 0.18) % 1), rr = R * (1 - z) * 0.95, off = z * R * 0.1;
      ctx.strokeStyle = `rgba(${i % 2 ? "150,110,255" : "90,200,210"},${0.35 * (1 - z)})`; ctx.lineWidth = Math.max(1, R * 0.03 * (1 - z));
      ctx.beginPath(); ctx.ellipse(off * 0.6, -off * 0.4, rr, rr * 0.94, t * 0.2 + i, 0, TAU); ctx.stroke();
    }
    for (let i = 0; i < 4; i++) {   // arms of light spiralling in
      const a0 = t * 1.2 + i * (TAU / 4); ctx.strokeStyle = "rgba(190,170,255,.28)"; ctx.lineWidth = Math.max(1, R * 0.035); ctx.beginPath();
      for (let j = 0; j <= 20; j++) { const u = j / 20, rr = R * (1 - u) * 0.92, a = a0 + u * 3.6; j ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.stroke();
    }
    ctx.restore();
    // the rim: energy, not a clean line (a cartoon ink edge that breaks, over a glow that flickers)
    ctx.shadowColor = "rgba(170,140,255,.9)"; ctx.shadowBlur = R * 0.25;
    ctx.strokeStyle = `rgba(200,185,255,${0.75 + 0.2 * Math.sin(t * 7)})`; ctx.lineWidth = Math.max(2, R * 0.07); rim(); ctx.stroke();
    ctx.shadowBlur = 0; ctx.setLineDash([R * 0.35, R * 0.12, R * 0.12, R * 0.08]); ctx.lineDashOffset = -t * R * 0.8;
    ctx.strokeStyle = INK; ctx.lineWidth = Math.max(2, R * 0.05); rim(); ctx.stroke(); ctx.setLineDash([]);
    // the motes, drawn in off the surroundings
    for (const m of PORTAL.motes || []) { const rr = R * m.d, x = Math.cos(m.a) * rr, y = Math.sin(m.a) * rr, a = clamp((m.d - 0.95) * 3, 0, 1) * clamp((2.4 - m.d) * 2, 0, 1);
      ctx.fillStyle = m.hue ? `rgba(120,230,240,${a})` : `rgba(230,220,255,${a})`; ctx.beginPath(); ctx.ellipse(x, y, R * 0.03 * m.s, R * 0.012 * m.s, m.a + Math.PI / 2, 0, TAU); ctx.fill(); }
    ctx.restore();
    gpuLight(p.x, p.y, R * 3, "150,110,255", 0.3);
  }
  // the rift. The camera goes with him, and it's the camera's journey you feel:
  //   · it's pulled in: the last frame of the old place rushes out past the lens, stretched (zoom-smeared)
  //   · it accelerates down a tube that curves away ahead, walls in layers at different depths moving at different
  //     speeds, haze in bands, streaks close by and specks far off, fragments of the old place stretching behind him
  //   · the new place is there far ahead, tiny, and grows faster and faster until it fills the frame
  //   · the camera comes out behind Morty, he flies on into it, and the picture settles
  const RIFT_BUF = document.createElement("canvas");
  function drawRift() {
    if (PORTAL.phase !== "rift" && PORTAL.phase !== "exit") return;
    const rift = PORTAL.phase === "rift", u = rift ? clamp(PORTAL.t / RIFT.dur, 0, 1) : 1, out = rift ? 0 : clamp((game.time - PORTAL.exitAt) / RIFT.exit, 0, 1);
    const cx = W / 2, cy = H * 0.46, M = Math.hypot(W, H) * 0.62, t = PORTAL.spin, still = reduceMotion, speed = still ? 0.5 : 0.6 + 2.6 * smooth(clamp(u / 0.4, 0, 1));
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    const dest = PORTAL.arrived ? portalSnap(RIFT_BUF) : null;   // (the new place, as drawn under the rift this frame)
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (!rift) {   // out behind him: the new place, the camera easing back from a touch too close
      const z = 1 + 0.1 * (1 - smooth(out)); ctx.globalAlpha = 1;
      if (dest) { ctx.save(); ctx.translate(cx, cy); ctx.scale(z, z); ctx.translate(-cx, -cy); ctx.drawImage(dest, 0, 0, W, H); ctx.restore(); }
      ctx.fillStyle = `rgba(255,244,214,${0.5 * (1 - out)})`; ctx.fillRect(0, 0, W, H);
      ctx.restore(); return;
    }
    // the tube's far end drifts: the rift curves away ahead of the camera
    const bend = (z, k = 1) => ({ x: cx + Math.sin(t * 0.9 + z * 2.2) * W * 0.12 * z * k, y: cy + Math.cos(t * 0.7 + z * 1.7) * H * 0.06 * z * k });
    const bg = ctx.createRadialGradient(bend(1).x, bend(1).y, 0, cx, cy, M); bg.addColorStop(0, "#3A1E6A"); bg.addColorStop(0.45, "#170A2C"); bg.addColorStop(1, "#040208");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    // the walls, three layers at different depths and speeds (the far ones slow, the near ones rushing)
    for (const [layer, vel, col, n] of [[0, 0.35, "90,70,160", 10], [1, 0.7, "150,110,255", 12], [2, 1.25, "90,200,210", 9]]) {
      for (let i = 0; i < n; i++) {
        const z = 1 - ((i / n + t * speed * vel * 0.18 + layer * 0.13) % 1), r = (U * (0.05 + layer * 0.03)) / Math.max(0.035, z);
        if (r > M * 1.6) continue;
        const c0 = bend(z), a = clamp((1 - z) * 1.5, 0, 1) * (0.25 + layer * 0.2);
        ctx.strokeStyle = `rgba(${col},${a})`; ctx.lineWidth = Math.max(1, r * (0.02 + layer * 0.02));
        ctx.beginPath(); for (let j = 0; j <= 40; j++) { const q = (j / 40) * TAU, rr = r * (1 + 0.06 * Math.sin(q * 6 + t * 4 + i)); j ? ctx.lineTo(c0.x + Math.cos(q) * rr, c0.y + Math.sin(q) * rr * 0.9) : ctx.moveTo(c0.x + Math.cos(q) * rr, c0.y + Math.sin(q) * rr * 0.9); } ctx.stroke();
      }
    }
    // haze in bands (volumes at depth), then the streaks: long and bright near, short specks far
    for (let i = 0; i < 4; i++) { const z = 1 - ((i / 4 + t * speed * 0.08) % 1), c0 = bend(z), rr = M * (1 - z) * 0.9 + U * 0.1, g = ctx.createRadialGradient(c0.x, c0.y, rr * 0.6, c0.x, c0.y, rr);
      g.addColorStop(0, "rgba(120,90,200,0)"); g.addColorStop(0.7, `rgba(120,90,200,${0.08 * (1 - z)})`); g.addColorStop(1, "rgba(120,90,200,0)"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    ctx.lineCap = "round";
    for (let i = 0; i < 40; i++) {
      const a = i * 2.39996 + t * 0.2, s0 = (i * 0.618 + t * speed * 0.55) % 1, near = i % 3 === 0, r0 = M * s0 * s0 * (near ? 1.1 : 0.7), len = M * (near ? 0.16 : 0.04) * s0 * speed * 0.5, c0 = bend(1 - s0, 0.4);
      ctx.strokeStyle = `rgba(${near ? "230,220,255" : "170,150,240"},${0.15 + 0.5 * s0})`; ctx.lineWidth = near ? 2 : 1;
      ctx.beginPath(); ctx.moveTo(c0.x + Math.cos(a) * r0, c0.y + Math.sin(a) * r0); ctx.lineTo(c0.x + Math.cos(a) * (r0 + len), c0.y + Math.sin(a) * (r0 + len)); ctx.stroke();
    }
    // pulled in: the old place rushing out past the lens, smeared, and pieces of it stretching behind him a while
    const E = PORTAL.entry, pull = 1 - smooth(clamp(u / 0.22, 0, 1));
    if (E && u < 0.45) {
      const at = PORTAL.at || { x: cx, y: cy };
      for (let i = 0; i < 4; i++) {
        const z = 1 + (1 - pull) * (3 + i * 1.6) + i * 0.08, a = (u < 0.22 ? pull : 0.35 * (1 - u / 0.45)) * (i ? 0.28 : 0.9);
        if (a < 0.01) continue; ctx.globalAlpha = a; ctx.save(); ctx.translate(at.x, at.y); ctx.scale(z, z * (1 + i * 0.12)); ctx.translate(-at.x, -at.y); ctx.drawImage(E, 0, 0, W, H); ctx.restore();
      }
      ctx.globalAlpha = 1;
    }
    // the new place, far ahead: tiny, then faster and faster, until it's all there is
    if (dest) {
      const v = clamp((u - RIFT.arrive) / (1 - RIFT.arrive), 0, 1), s = 0.04 + 0.96 * Math.pow(v, 2.6), c0 = bend(1 - v, 1 - v);
      const w = W * s, h = H * s, rr = Math.hypot(w, h) * 0.5;
      ctx.save(); ctx.beginPath(); ctx.ellipse(c0.x, c0.y, w * 0.5 + 2, h * 0.5 + 2, 0, 0, TAU); ctx.clip();
      ctx.drawImage(dest, c0.x - w / 2 - (cx - W / 2) * s, c0.y - h / 2 - (cy - H * 0.46) * s, w, h); ctx.restore();
      const g = ctx.createRadialGradient(c0.x, c0.y, rr * 0.35, c0.x, c0.y, rr * 1.1); g.addColorStop(0, "rgba(255,240,210,0)"); g.addColorStop(0.8, `rgba(255,240,210,${0.35 * (1 - v)})`); g.addColorStop(1, "rgba(255,240,210,0)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    // Morty: the focal point, the camera right behind him; at the end he flies on ahead into the new place
    const onward = smooth(clamp((u - 0.82) / 0.18, 0, 1)), r = U * (0.105 + 0.015 * Math.sin(t * 3)) * (1 - 0.8 * onward), c1 = bend(0.15 + onward * 0.8, 0.5);
    const sx = c1.x + Math.sin(t * 2.1) * U * 0.02, sy = c1.y + U * 0.12 * (1 - onward) + Math.cos(t * 1.7) * U * 0.012, V = VENT.skull || { a: rig.a, dir: rig.dir, t: game.time, jaw: 0 }, ang = -0.2 + Math.sin(t * 4) * 0.25;
    ctx.globalAlpha = clamp(u / 0.12, 0, 1) * (1 - onward * 0.6);
    for (let i = 3; i >= 1; i--) { const f = ctx.globalAlpha; ctx.globalAlpha = f * 0.14 * (4 - i); drawSkull(ctx, sx, sy + i * r * 0.4, r * (1 - i * 0.07), { ang: ang - i * 0.05, t: V.t, look: cos, face: faceFor("excited", V.t), jaw: 0.4 }); ctx.globalAlpha = f; }
    drawSkull(ctx, sx, sy, r, { ang, a: V.a, dir: V.dir, t: V.t, look: cos, face: faceFor("excited", V.t), jaw: 0.4 });
    drawHat(ctx, sx, sy, r, ang, V.t, hatState(), 1, hatOf(cos), V.a, V.dir);
    ctx.restore();
  }
