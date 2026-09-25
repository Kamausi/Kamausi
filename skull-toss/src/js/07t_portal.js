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
  const RIFT = { dur: 1.9, exit: 0.65, open: 0.6 };
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
    cine("rift", RIFT.dur + RIFT.exit, null, 0, [RIFT.dur, portalArrive]);
  }
  // the far end of the rift: the destination is set up behind it, then the picture comes up on it
  function portalArrive() {
    PORTAL.phase = "exit"; PORTAL.exitAt = game.time;
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
    if (PORTAL.phase === "exit" && game.time - PORTAL.exitAt > RIFT.exit) PORTAL.phase = null;
  }
  function portalReset() { Object.assign(PORTAL, { phase: null, t: 0, dest: null, then: null, miss: 0 }); game.ringHidden = false; }

  // ── drawing. The portal: a black hole in the air, its rim a thin ring of cold light, arms of violet turning in it.
  function drawPortalRing(p, r) {
    const k = easeOutBack(clamp(PORTAL.t / RIFT.open, 0, 1)), R = r * k, t = PORTAL.spin; if (R < 1) return;
    ctx.save(); ctx.translate(p.x, p.y);
    const glow = ctx.createRadialGradient(0, 0, R * 0.9, 0, 0, R * 1.45); glow.addColorStop(0, "rgba(150,110,255,.35)"); glow.addColorStop(1, "rgba(150,110,255,0)");
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, 0, R * 1.45, 0, TAU); ctx.fill();
    const hole = ctx.createRadialGradient(0, 0, 0, 0, 0, R); hole.addColorStop(0, "#000"); hole.addColorStop(0.75, "#0B0614"); hole.addColorStop(1, "#1C0F33");
    ctx.fillStyle = hole; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.clip(); ctx.lineCap = "round";
    for (let i = 0; i < 5; i++) {   // the arms, turning inward
      const a0 = t * 1.6 + i * (TAU / 5); ctx.strokeStyle = `rgba(${i % 2 ? "120,90,220" : "90,200,210"},.5)`; ctx.lineWidth = Math.max(1.5, R * 0.05);
      ctx.beginPath(); for (let j = 0; j <= 24; j++) { const u = j / 24, rr = R * (1 - u) * 0.95, a = a0 + u * 3.2; const x = Math.cos(a) * rr, y = Math.sin(a) * rr; j ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = INK; ctx.lineWidth = Math.max(3, R * 0.11); ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.stroke();
    ctx.strokeStyle = `rgba(200,180,255,${0.75 + 0.2 * Math.sin(t * 5)})`; ctx.lineWidth = Math.max(1.5, R * 0.045); ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.stroke();
    ctx.restore();
    gpuLight(p.x, p.y, R * 2.6, "150,110,255", 0.28);
  }
  // the rift: the camera goes in with him. A tunnel of rings rushing out past the lens, streaks, and Morty in the middle,
  // tumbling on; near the end the far opening grows until it fills the screen, and the new place is behind it.
  function drawRift() {
    if (PORTAL.phase !== "rift" && PORTAL.phase !== "exit") return;
    const rift = PORTAL.phase === "rift", u = rift ? clamp(PORTAL.t / RIFT.dur, 0, 1) : 1, fade = rift ? clamp(PORTAL.t / 0.22, 0, 1) : 1 - clamp((game.time - PORTAL.exitAt) / RIFT.exit, 0, 1);
    if (fade <= 0.01) return;
    const cx = W / 2, cy = H * 0.46, M = Math.hypot(W, H) * 0.62, t = PORTAL.spin, still = reduceMotion;
    ctx.save(); ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.globalAlpha = fade;
    const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, M); bg.addColorStop(0, "#2A1450"); bg.addColorStop(0.5, "#120822"); bg.addColorStop(1, "#040208");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    if (rift) {
      const speed = still ? 0.6 : 2.2, n = 14;
      for (let i = 0; i < n; i++) {   // the rings of the tunnel, coming at you
        const z = 1 - ((i / n + t * speed * 0.25) % 1), r = (U * 0.08) / Math.max(0.04, z), a = clamp((1 - z) * 1.6, 0, 1) * 0.8;
        if (r > M * 1.3) continue;
        ctx.strokeStyle = i % 3 === 0 ? `rgba(90,200,210,${a})` : `rgba(150,110,255,${a})`; ctx.lineWidth = Math.max(1, r * 0.05);
        ctx.beginPath(); ctx.ellipse(cx + Math.sin(t * 2 + i) * r * 0.04, cy, r, r * 0.92, t * 0.3, 0, TAU); ctx.stroke();
      }
      ctx.strokeStyle = "rgba(220,210,255,.25)"; ctx.lineWidth = 1.5;   // the streaks
      for (let i = 0; i < 26; i++) { const a = i * 2.4 + t * 0.5, s0 = ((i * 0.37 + t * speed) % 1), r0 = M * s0 * s0, r1 = r0 + M * 0.12 * s0; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); ctx.stroke(); }
      // the far end: it opens in the last stretch, warm, and fills the frame
      const open = smooth(clamp((u - 0.62) / 0.38, 0, 1));
      if (open > 0) { const R = M * 1.2 * open * open, g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(1, R)); g.addColorStop(0, "rgba(255,244,214,1)"); g.addColorStop(0.7, "rgba(255,214,150,.9)"); g.addColorStop(1, "rgba(255,214,150,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, Math.max(1, R), 0, TAU); ctx.fill(); }
      // Morty, flying on, tumbling a little, the camera right behind him
      const r = U * (0.1 + 0.02 * Math.sin(t * 3)), sx = cx + Math.sin(t * 2.1) * U * 0.02, sy = cy + U * 0.1 + Math.cos(t * 1.7) * U * 0.015, V = VENT.skull || { a: rig.a, dir: rig.dir, t: game.time, jaw: 0 };
      for (let i = 3; i >= 1; i--) { ctx.globalAlpha = fade * 0.12 * (4 - i); drawSkull(ctx, sx, sy + i * r * 0.35, r * (1 - i * 0.06), { ang: -0.2 + Math.sin(t * 4 - i * 0.3) * 0.25, t: V.t, look: cos, face: faceFor("excited", V.t), jaw: 0.4, alpha: 1 }); }
      ctx.globalAlpha = fade * (1 - open * 0.85);
      drawSkull(ctx, sx, sy, r, { ang: -0.2 + Math.sin(t * 4) * 0.25, a: V.a, dir: V.dir, t: V.t, look: cos, face: faceFor("excited", V.t), jaw: 0.4 });
      drawHat(ctx, sx, sy, r, -0.2 + Math.sin(t * 4) * 0.25, V.t, hatState(), 1, hatOf(cos), V.a, V.dir);
    } else { ctx.fillStyle = `rgba(255,244,214,${fade})`; ctx.fillRect(0, 0, W, H); }   // (out the far end: the light, clearing off the new place)
    ctx.restore();
  }
