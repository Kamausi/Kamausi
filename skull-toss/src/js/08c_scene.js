  // ───────────────────────── drawing: the play field ─────────────────────────
  // the ring's shadow on the ground, which is what says how deep the ring is (no line joins them: the shadow alone reads).
  // No rail, no chalked triangle, no marker for the next corner: where the ring goes next is yours to read.
  function drawTrackAndShadow() {
    const R = RINGS[cos.ring];
    ctx.lineCap = "round";
    const p = project(ring.x + shadowShift(ring.y), 0, ring.z);   // (it lies a little away from the map's key light)
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, ring.rc * p.s * 2.2);
    g.addColorStop(0, `rgba(${R.rgb},${0.1 + ring.flash * 0.18})`); g.addColorStop(1, `rgba(${R.rgb},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(p.x, p.y, ring.rc * p.s * 2.2, ring.rc * p.s * 0.45, 0, 0, TAU); ctx.fill();
    if (look().ambient.water) {   // over water the ring has a reflection where its shadow would be, rippling (the fog never hides it)
      const r = ring.rc * p.s, wob = Math.sin(game.time * 3.1) * 0.06;
      ctx.save(); ctx.globalAlpha = 0.38; ctx.translate(p.x, p.y + r * 0.18); ctx.scale(1 + wob, -0.26); drawRingShape(ctx, 0, 0, r, RING_TUBE * 2 * p.s, cos.ring, game.time, 0); ctx.restore();
    } else { ctx.fillStyle = `rgba(0,0,0,${BLUEPRINT.shadow.ring.opacity})`; ctx.beginPath(); ctx.ellipse(p.x, p.y, ring.rc * p.s * 0.95, 0.07 * p.s, 0, 0, TAU); ctx.fill(); }
  }
  // cartoon wings: the ring has shaken loose and flies the triangle on its own
  function drawRingWings(x, y, r, lw) {
    const flap = Math.sin(Math.floor(game.time * 12) / 12 * 14) * 0.5, grow = 1 - (ring.morph || 0);
    if (grow <= 0.02) return;
    ctx.save(); ctx.translate(x, y); ctx.lineJoin = "round"; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.5, lw * 0.35);
    for (const sd of [-1, 1]) {
      ctx.save(); ctx.scale(sd * grow, grow); ctx.rotate(-0.15 - flap * 0.5); ctx.translate(r * 0.92, 0);
      ctx.fillStyle = "#3A3240"; ctx.beginPath(); ctx.moveTo(0, -r * 0.1);
      ctx.bezierCurveTo(r * 0.3, -r * 0.8, r * 0.95, -r * 0.75, r * 1.05, -r * 0.35);
      ctx.quadraticCurveTo(r * 0.85, -r * 0.28, r * 0.88, -r * 0.05); ctx.quadraticCurveTo(r * 0.6, -r * 0.12, r * 0.6, r * 0.12); ctx.quadraticCurveTo(r * 0.35, -r * 0.02, 0, r * 0.1); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = "rgba(242,231,201,.25)"; ctx.beginPath(); ctx.moveTo(r * 0.1, -r * 0.05); ctx.lineTo(r * 0.9, -r * 0.5); ctx.stroke(); ctx.strokeStyle = INK;
      ctx.restore();
    }
    ctx.restore();
  }
  // v45: a hot streak sets the ring alight. It catches at ×3.5 (six in a row), burns hotter with every make, and roars
  // at the ×6 cap; a miss puts it out. The flames flare from behind the band, outward and up, and never cover the hole.
  const FIRE_FROM = 6, FIRE_FULL = 11;
  const ringHeatGoal = () => (inRun() || game.state === "over") && game.streak >= FIRE_FROM ? clamp(0.35 + 0.65 * (game.streak - FIRE_FROM) / (FIRE_FULL - FIRE_FROM), 0.35, 1) : 0;
  let ringHeat = 0, ringHeatAt = 0;
  function drawRingFire(x, y, r, lw, k, t) {   // drawn behind the ring: the band covers the roots and the flames flare out past it
    const tt = Math.floor(t * 12) / 12, n = 18;
    ctx.save();
    const E = ringOuter(r, lw, cos.ring), g = ctx.createRadialGradient(x, y, E * 0.6, x, y, E * (1.3 + 0.3 * k));   // the heat glow
    g.addColorStop(0, `rgba(255,140,40,${0.34 * k})`); g.addColorStop(1, "rgba(255,90,20,0)");
    ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, E * (1.3 + 0.3 * k), 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = "source-over"; ctx.lineJoin = "round";
    const edge = E, out = edge * 0.9;   // the tongues root under the ring's outer edge and lick outward and up, never in toward the hole
    for (const pass of [0, 1, 2]) {   // ink, then orange, then the yellow heart of each tongue
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + 0.08, ca = Math.cos(a), sa = Math.sin(a);
        if (sa > 0.55) continue;   // (none underneath: fire goes up)
        let dx = ca * 0.7, dy = sa * 0.7 - 0.85; const dl = Math.hypot(dx, dy); dx /= dl; dy /= dl;
        const bx = x + ca * out, by = y + sa * out, nx = -dy, ny = dx;   // the tongue's direction, and across it
        const flick = 0.62 + 0.38 * Math.sin(tt * 13 + i * 2.3) * Math.sin(tt * 7.1 + i * 1.1);
        const h = (edge - out + r * (0.3 + 0.5 * k)) * flick * (0.7 + 0.45 * Math.max(0, -sa)), w = Math.max(lw * 0.7, edge * 0.1) * (pass === 2 ? 0.55 : 1);
        const sway = Math.sin(tt * 9 + i) * w * 0.6, hh = pass === 2 ? h * 0.7 : h;
        const tx = bx + dx * hh + nx * sway, ty = by + dy * hh + ny * sway, mx = bx + dx * hh * 0.55, my = by + dy * hh * 0.55;
        ctx.beginPath(); ctx.moveTo(bx - nx * w, by - ny * w); ctx.quadraticCurveTo(mx - nx * w * 0.9, my - ny * w * 0.9, tx, ty); ctx.quadraticCurveTo(mx + nx * w * 0.9, my + ny * w * 0.9, bx + nx * w, by + ny * w);
        ctx.arc(bx, by, w, Math.atan2(ny, nx), Math.atan2(ny, nx) + Math.PI); ctx.closePath();
        if (pass === 0) { ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.5, lw * 0.3); ctx.stroke(); }
        else { ctx.fillStyle = pass === 1 ? (i % 3 ? "#F2702A" : "#E24A22") : "#FFD34A"; ctx.fill(); }
      }
    }
    for (let j = 0; j < 5 + Math.round(k * 5); j++) {   // embers drifting up off the top
      const ph = (t * 0.8 + j * 0.37) % 1, ex = x + Math.sin(j * 12.9) * E * 0.8 + Math.sin(t * 3 + j) * r * 0.12, ey = y - E * 0.6 - ph * r * (1 + k);
      ctx.globalAlpha = (1 - ph) * k; ctx.fillStyle = j % 2 ? "#FFD34A" : "#F2702A"; ctx.beginPath(); ctx.arc(ex, ey, Math.max(1.2, lw * 0.22) * (1 - ph * 0.5), 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  function drawRing() {
    const p = project(ring.x, ring.y, ring.z), T = VENT.ring || { t: game.time, sq: 0, dir: 0 };
    const wob = ring.wobble > 0 ? Math.sin(T.t * 38) * 0.035 * ring.wobble : 0, morph = ring.morph || 0;
    const r = ring.rc * p.s * (1 + wob + morph * 0.25 * Math.sin(morph * 18)), lw = RING_TUBE * 2 * p.s;
    drawAnchorHanger(p, r, lw);   // the ring belongs to the map: its rope, chain, rod, post or hand (07n_environment.js)
    if (ringFlies()) drawRingWings(p.x, p.y, r, lw);
    const cut = ring.mode === "jumpcut" ? RING_PATHS.jumpcut.tell(ring.phase) : 0;   // the Final Reel: the film flickers a beat before it cuts
    if (cut > 0 && Math.floor(game.time * 24) % 2) { ctx.save(); ctx.strokeStyle = `rgba(242,231,201,${0.7 * Math.max(0.3, flashK())})`; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.strokeRect(p.x - r * 1.5, p.y - r * 1.5, r * 3, r * 3); ctx.restore(); }
    if (powerOn("cursed")) { const g = ctx.createRadialGradient(p.x, p.y, r * 0.6, p.x, p.y, r * 1.6); g.addColorStop(0, "rgba(154,107,192,.5)"); g.addColorStop(1, "rgba(154,107,192,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, r * 1.6, 0, TAU); ctx.fill(); }
    const squashed = Math.abs(T.sq) > 0.003;   // a contact squashes the ring along the line of the hit, then it springs back
    if (squashed) { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(T.dir); ctx.scale(1 - T.sq, 1 + T.sq * 0.6); ctx.rotate(-T.dir); ctx.translate(-p.x, -p.y); }
    if (settings.contrast) contrastHalo(p.x, p.y, r, lw * 1.6 + 3);
    const now = performance.now() / 1000, dtH = clamp(now - ringHeatAt, 0, 0.1); ringHeatAt = now;
    ringHeat += (ringHeatGoal() - ringHeat) * Math.min(1, dtH * (ringHeatGoal() > ringHeat ? 4 : 2.5));
    if (ringHeat > 0.02) drawRingFire(p.x, p.y, r, lw, ringHeat, T.t);
    const rim = drawRingLight(p.x, p.y, r, lw);   // the backing that keeps it readable on any background, and its rim light
    drawRingShape(ctx, p.x, p.y, r, lw, cos.ring, T.t, ring.flash); rim();
    if (squashed) ctx.restore();
    if (powerOn("deadeye")) {          // Deadeye shows its doubled perfect window
      const pr = (ring.rc - RING_TUBE - SKULL_R) * 0.76 * p.s;
      ctx.strokeStyle = "rgba(227,182,75,.8)"; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(p.x, p.y, pr, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(p.x - pr * 0.3, p.y); ctx.lineTo(p.x + pr * 0.3, p.y); ctx.moveTo(p.x, p.y - pr * 0.3); ctx.lineTo(p.x, p.y + pr * 0.3); ctx.stroke();
    }
    if (morph > 0) { ctx.globalAlpha = morph; ctx.fillStyle = MUSTARD; for (let i = 0; i < 8; i++) { const a = i * 0.785 + game.time * 3; star(ctx, p.x + Math.cos(a) * r * 1.4, p.y + Math.sin(a) * r * 1.4, r * 0.14, 5, 0.45, a); ctx.fill(); } ctx.globalAlpha = 1; }
  }
  // Settings → High contrast: an inked, pale-yellow halo that lifts the ring and the skull off the scenery
  function contrastHalo(x, y, r, w, fill = false) {
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU);
    if (fill) { ctx.fillStyle = "rgba(255,243,176,.85)"; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke(); }
    else { ctx.lineWidth = w + 4; ctx.strokeStyle = INK; ctx.stroke(); ctx.lineWidth = w; ctx.strokeStyle = "#FFF3B0"; ctx.stroke(); }
    ctx.restore();
  }
  // the ring's post (a cosmetic: poles)
  function drawPole(x, top, bottom, pw, s, id = cos.pole, c = ctx, t = game.time, ringTop = top) {
    const P = POLES[id];
    if (P && P.draw) { c.save(); P.draw(c, x, top, bottom, pw, s, t, ringTop); c.restore(); return; }
    if (ASSETS.target && drawPost(c, x, top, bottom, pw)) return;
    c.fillStyle = INK; c.fillRect(x - pw / 2 - 1.5, top, pw + 3, bottom - top);
    c.fillStyle = "#6B4526"; c.fillRect(x - pw / 2, top, pw, bottom - top);
    c.fillStyle = "rgba(242,231,201,.18)"; c.fillRect(x - pw / 2, top, Math.max(1, pw * 0.3), bottom - top);
    const cw = 0.36 * s, ch = 0.1 * s;
    c.fillStyle = "#4A2F19"; c.strokeStyle = INK; c.lineWidth = 1.5; c.beginPath(); rr(c, x - cw / 2, bottom - ch, cw, ch * 1.25, ch * 0.4); c.fill(); c.stroke();
  }

  function buildPreview(AX, AY, guide) {
    const v = aimVelocity(AX, AY), front = [], back = [], zr = ring.z, tc = zr / v.z, wx = 0.5 * windNow();   // (the guide bends with the wind)
    const tg = (v.y + Math.sqrt(v.y * v.y + 2 * G * (START_Y - SKULL_R))) / G;
    const reaches = tg >= tc;
    if (guide === "off") return { front, back, cross: null, land: null };
    const tEnd = guide === "short" ? Math.min(tg, tc * 0.36) : Math.min(tg, tc + 0.7);
    if (obstacleForcesLive()) return forcedPreview(v, guide, tc, tEnd);   // fans and lodestones bend it (07m_obstacles.js)
    const rest = project(0, START_Y, 0), off = pullOffset(), kx = rest.x + off.x, ky = rest.y + off.y, kr = SKULL_R * rest.s * 1.35;
    let lx = null, ly = null, i = 0;
    for (let t = 0.004; t < tEnd; t += 0.004) {
      const q = { x: v.x * t + wx * t * t, y: START_Y + v.y * t - 0.5 * G * t * t, z: v.z * t, t, tc }, p = project(q.x, q.y, q.z);
      if (Math.hypot(p.x - kx, p.y - ky) < kr) continue;
      const r = clamp(SKULL_R * 0.2 * p.s, 1.4, 4.6);
      if (lx !== null && Math.hypot(p.x - lx, p.y - ly) < Math.max(9, r * 3.4)) continue;
      lx = p.x; ly = p.y; q.p = p; q.r = r; q.i = i++; q.fade = guide === "short" ? 1 - t / tEnd : 1;
      (q.z < zr ? front : back).push(q);
    }
    if (guide === "short") return { front, back, cross: null, land: null };
    return { front, back,
      cross: reaches ? { x: v.x * tc + wx * tc * tc, y: START_Y + v.y * tc - 0.5 * G * tc * tc, z: zr } : null,
      land: reaches ? null : { x: v.x * tg + wx * tg * tg, z: v.z * tg } };
  }
  function forcedPreview(v, guide, tc0, tEnd0) {
    const zr = ring.z, path = forcedPath(v, tc0 * 1.6 + 0.8), front = [], back = [];
    const k = path.findIndex(q => q.z >= zr), cross = k > 0 ? (() => { const a = path[k - 1], b = path[k], u = (zr - a.z) / (b.z - a.z); return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, z: zr, t: a.t + (b.t - a.t) * u }; })() : null;
    const land = cross ? null : path[path.length - 1], tc = cross ? cross.t : tc0, tEnd = guide === "short" ? Math.min(tEnd0, tc * 0.36) : cross ? tc + 0.7 : tEnd0;
    const rest = project(0, START_Y, 0), off = pullOffset(), kx = rest.x + off.x, ky = rest.y + off.y, kr = SKULL_R * rest.s * 1.35;
    let lx = null, ly = null, i = 0;
    for (const q0 of path) {
      if (q0.t > tEnd) break;
      const q = { ...q0, tc }, p = project(q.x, q.y, q.z);
      if (Math.hypot(p.x - kx, p.y - ky) < kr) continue;
      const r = clamp(SKULL_R * 0.2 * p.s, 1.4, 4.6);
      if (lx !== null && Math.hypot(p.x - lx, p.y - ly) < Math.max(9, r * 3.4)) continue;
      lx = p.x; ly = p.y; q.p = p; q.r = r; q.i = i++; q.fade = guide === "short" ? 1 - q.t / tEnd : 1;
      (q.z < zr ? front : back).push(q);
    }
    if (guide === "short") return { front, back, cross: null, land: null };
    return { front, back, cross, land: land && { x: land.x, z: land.z } };
  }
  function aimColorOf(A, i, t) {
    if (A.rainbow) return `hsl(${(i * 24 + t * 140) % 360},80%,66%)`;
    if (A.hue) return `hsl(${A.hue[0] + ((A.hue[1] - A.hue[0] + 360) % 360) * Math.min(1, i / 14)},85%,62%)`;
    if (A.alt) return i % 2 ? A.alt : A.color;
    return A.color;
  }
  const aimColor = i => aimColorOf(AIMS[cos.aim] || AIMS.bone, i, game.time);
  // one dot of an aim line: a dot, a little star, or a tiny bone
  function aimDot(c, A, x, y, r, col, i) {
    if (A.shape === "star") { c.fillStyle = INK; star(c, x, y, r * 1.9 + 1.4, 5, 0.5, -Math.PI / 2); c.fill(); c.fillStyle = col; star(c, x, y, r * 1.9, 5, 0.5, -Math.PI / 2); c.fill(); return; }
    if (A.shape === "bone") { c.save(); c.translate(x, y); c.rotate(i * 0.7); c.fillStyle = col; c.strokeStyle = INK; c.lineWidth = 1; c.beginPath(); rr(c, -r * 1.3, -r * 0.35, r * 2.6, r * 0.7, r * 0.3); for (const sx of [-1.3, 1.3]) for (const sy of [-0.35, 0.35]) { c.moveTo(sx * r + r * 0.4, sy * r); c.arc(sx * r, sy * r, r * 0.4, 0, TAU); } c.fill(); c.stroke(); c.restore(); return; }
    c.fillStyle = INK; c.beginPath(); c.arc(x, y, r + 1.4, 0, TAU); c.fill();
    c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  }
  function drawDots(list, behind) {
    const A = AIMS[cos.aim] || AIMS.bone;
    for (const q of list) {
      const a = (behind ? 0.25 : 0.98 - 0.45 * clamp(q.t / q.tc, 0, 1)) * q.fade * (A.ghost ? 0.35 + 0.35 * Math.sin(game.time * 6 - q.i * 0.6) : 1);
      ctx.globalAlpha = Math.max(0, a); aimDot(ctx, A, q.p.x, q.p.y, q.r, aimColor(q.i), q.i);
    }
    ctx.globalAlpha = 1;
  }
  function drawReticle(pv) {
    if (pv.cross) {
      const p = project(pv.cross.x, pv.cross.y, pv.cross.z), r = Math.max(4, SKULL_R * p.s), col = aimColor(pv.front.length);
      for (const [c, w] of [[INK, 3.8], [col, 1.8]]) {
        ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU);
        for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { ctx.moveTo(p.x + ax * (r + 3), p.y + ay * (r + 3)); ctx.lineTo(p.x + ax * (r + 3 + r * 0.75), p.y + ay * (r + 3 + r * 0.75)); }
        ctx.stroke();
      }
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, TAU); ctx.fill();
    } else if (pv.land) {
      const p = project(pv.land.x, 0, pv.land.z), s = Math.max(5, 0.12 * p.s);
      for (const [c, w] of [[INK, 4.5], [RED, 2.2]]) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(p.x - s, p.y - s * 0.4); ctx.lineTo(p.x + s, p.y + s * 0.4); ctx.moveTo(p.x + s, p.y - s * 0.4); ctx.lineTo(p.x - s, p.y + s * 0.4); ctx.stroke(); }
    }
  }
  // the launcher, from its SVG asset (src/art/launcher). sx, sy: where the skull rests; r: the skull's radius there;
  // off: where the pouch is (the pull, or the twang); fy: the frame's jump after a shot; sq: how hard the pull
  // squeezes the fork. The bands are drawn here because they stretch, tip to pouch, between the asset's anchors.
  function drawLauncher(sx, sy, r, off, fy = 0, sq = 0) {
    if (LAUNCHERS[cos.launcher]) { drawFrameLauncher(sx, sy, r, off, fy, cos.launcher); return; }   // a launcher from the Vault (08i_body.js)
    const A = ASSETS.launcher; if (!A) { drawSling(sx, sy, r, off, fy); return; }
    const M = A.meta, N = M.anchors, k = r / M.unit, [ax, ay] = N.seat, fx = k * (1 - sq), fyk = k * (1 + sq * 0.35);
    const onFrame = ([x, y]) => ({ x: sx + (x - ax) * fx, y: sy + fy + (y - ay) * fyk }), onPouch = ([x, y]) => ({ x: sx + off.x + (x - ax) * k, y: sy + off.y + (y - ay) * k });
    const frame = layer => { ctx.save(); ctx.translate(sx, sy + fy); ctx.scale(fx, fyk); ctx.translate(-ax, -ay); drawLayer(ctx, "launcher", layer); ctx.restore(); };
    const pouch = layer => { ctx.save(); ctx.translate(sx + off.x, sy + off.y); ctx.scale(k, k); ctx.translate(-ax, -ay); drawLayer(ctx, "launcher", layer); ctx.restore(); };
    frame("shadow"); frame("frame");
    const tl = onFrame(N.bandL), tr = onFrame(N.bandR), pl = onPouch(N.pouchL), pr = onPouch(N.pouchR), B = M.bands;
    drawBands(ctx, [[tl, pl], [tr, pr]], Math.max(3.5, B.width * k), Math.max(1.8, B.core * k), B, cos.band, game.time);
    frame("tips"); pouch("pouch");
  }
  // the band's look (the Vault's Bands, v29): colours, a stripe, a shine, a glow, or barbs along it
  const BANDS = { classic: {}, licorice: { core: "#3A1C1C", outline: "#0E0707" }, bone: { core: "#EDE3C8" }, candy: { core: "#F4ECDA", stripe: "#C0392B" },
    jester: { core: "#6B3FA0", stripe: "#E3B64B" }, gilded: { core: "#E3B64B", shine: "#FFF3C4" }, ghostly: { core: "#CFF3E8", glow: "rgba(170,240,220,.9)" }, barbed: { core: "#8A8A8A", barbs: true },
    soul: { core: "#B48CFF", glow: "rgba(180,140,255,.95)", shine: "#F2ECFF" }, aurora: { core: "#78F0BE", stripe: "#B48CFF", glow: "rgba(120,240,190,.8)" },
    matinee: { core: "#E8893A", stripe: "#3A1C1C" } };   // (Season One, v42)   // (the Soul Shop's, v30)
  function drawBands(c, segs, w, cw, B, id, t) {
    const S = BANDS[id] || BANDS.classic, core = S.core || B.color, line = (col, lw, dash) => {
      c.strokeStyle = col; c.lineWidth = lw; c.setLineDash(dash || []); c.beginPath(); for (const [a, b] of segs) { c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); } c.stroke(); };
    c.lineCap = "round";
    if (S.glow) { c.save(); c.shadowColor = S.glow; c.shadowBlur = 8 + 4 * Math.sin(t * 5); line(core, cw); c.restore(); }
    line(S.outline || B.outline, w); line(core, cw);
    if (S.stripe) { c.lineCap = "butt"; line(S.stripe, cw, [cw * 1.3, cw * 1.3]); c.lineCap = "round"; }
    if (S.shine) line(S.shine, Math.max(0.8, cw * 0.32));
    if (S.barbs) { c.strokeStyle = INK; c.lineWidth = Math.max(1, cw * 0.4); c.setLineDash([]);
      for (const [a, b] of segs) { const L = Math.hypot(b.x - a.x, b.y - a.y), n = Math.floor(L / (cw * 4)), nx = -(b.y - a.y) / (L || 1), ny = (b.x - a.x) / (L || 1);
        for (let i = 1; i < n; i++) { const x = a.x + (b.x - a.x) * i / n, y = a.y + (b.y - a.y) * i / n; c.beginPath(); c.moveTo(x - nx * cw * 1.2, y - ny * cw * 1.2); c.lineTo(x + nx * cw * 1.2, y + ny * cw * 1.2); c.stroke(); } } }
    c.setLineDash([]); c.lineCap = "butt";
  }
  function drawLauncherFront(sx, sy, r, off) {   // an optional pouch-front layer is drawn over the seated skull
    const A = ASSETS.launcher; if (!A || !A.layers["pouch-front"]) return;
    const M = A.meta, k = r / M.unit, [ax, ay] = M.anchors.seat;
    ctx.save(); ctx.translate(sx + off.x, sy + off.y); ctx.scale(k, k); ctx.translate(-ax, -ay); drawLayer(ctx, "launcher", "pouch-front"); ctx.restore();
  }
  // the ring's post, from the target asset: cap and foot drawn true, the shaft stretched from the ring to the ground
  function drawPost(c, x, top, bottom, pw) {
    const A = ASSETS.target, M = A && A.meta.post; if (!M || bottom <= top) return false;
    const k = pw / M.width;
    c.save(); c.translate(x, top); c.scale(k, (bottom - top) / (M.bottom - M.top)); c.translate(-M.x, -M.top); drawLayer(c, "target", "post"); c.restore();
    if (A.layers["post-foot"]) { c.save(); c.translate(x, bottom); c.scale(k, k); c.translate(-M.x, -M.bottom); drawLayer(c, "target", "post-foot"); c.restore(); }
    if (A.layers["post-cap"]) { c.save(); c.translate(x, top); c.scale(k, k); c.translate(-M.x, -M.top); drawLayer(c, "target", "post-cap"); c.restore(); }
    return true;
  }
  // a ring of light round the skull the moment a power-up is picked up, in the power-up's colour
  function drawPowerGlow(x, y, r) {
    if (powerGlow.t <= 0) return;
    const k = powerGlow.t / 0.7, R = r * (1.25 + (1 - k) * 0.9);
    ctx.save(); ctx.globalAlpha = k; ctx.strokeStyle = powerGlow.color; ctx.lineWidth = Math.max(2, r * 0.16 * k);
    ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.stroke(); ctx.restore();
  }
  // a wooden slingshot, inked, with a leather pouch: the coded stand-in when there's no launcher asset
  function drawSling(sx, sy, r, off, fy = 0) {
    const kx = sx + off.x, ky = sy + off.y; sy += fy;
    const aL = { x: sx - r * 1.6, y: sy - r * 0.15 }, aR = { x: sx + r * 1.6, y: sy - r * 0.15 }, fork = { x: sx, y: sy + r * 1.35 };
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    const wood = w => { ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(sx, sy + r * 2.8); ctx.lineTo(fork.x, fork.y); ctx.lineTo(aL.x, aL.y); ctx.moveTo(fork.x, fork.y); ctx.lineTo(aR.x, aR.y); ctx.stroke(); };
    ctx.strokeStyle = INK; wood(Math.max(6, r * 0.34)); ctx.strokeStyle = "#7A5230"; wood(Math.max(3.5, r * 0.22));
    ctx.strokeStyle = "rgba(242,231,201,.25)"; ctx.lineWidth = Math.max(1, r * 0.05); ctx.beginPath(); ctx.moveTo(sx - r * 0.05, sy + r * 2.7); ctx.lineTo(fork.x - r * 0.05, fork.y); ctx.lineTo(aL.x + 1, aL.y); ctx.stroke();
    const band = w => { ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(aL.x, aL.y); ctx.lineTo(kx - r * 0.8, ky + r * 0.35); ctx.moveTo(aR.x, aR.y); ctx.lineTo(kx + r * 0.8, ky + r * 0.35); ctx.stroke(); };
    ctx.strokeStyle = INK; band(Math.max(3.5, r * 0.16)); ctx.strokeStyle = RED; band(Math.max(1.8, r * 0.08));
    ctx.fillStyle = "#5A3A22"; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.5, r * 0.07);
    ctx.beginPath(); ctx.ellipse(kx, ky + r * 0.72, r * 0.85, r * 0.3, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = CREAM; for (const a of [aL, aR]) { ctx.beginPath(); ctx.arc(a.x, a.y, Math.max(2.5, r * 0.11), 0, TAU); ctx.fill(); ctx.stroke(); }
    ctx.lineCap = "butt";
  }
  function drawPower(x, y, r, p) {
    const R = r * 1.55, end = -Math.PI / 2 + TAU * Math.max(0.02, p);
    ctx.lineWidth = 5; ctx.strokeStyle = "rgba(23,19,15,.55)"; ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.stroke();
    ctx.lineCap = "round";
    ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(x, y, R, -Math.PI / 2, end); ctx.stroke();
    ctx.strokeStyle = cos.aim === "bone" ? (p > 0.85 ? GOLD : MUSTARD) : aimColor(p * 12); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x, y, R, -Math.PI / 2, end); ctx.stroke();
    ctx.lineCap = "butt";
  }
  function drawChevrons(x, y, r) {
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    for (let i = 0; i < 3; i++) {
      const cy = y + r * 3.1 + i * r * 0.42, a = 0.2 + 0.7 * Math.max(0, Math.sin(game.time * 4 - i * 0.9));
      ctx.globalAlpha = a;
      for (const [c, w] of [[INK, 4.5], [CREAM, 2.2]]) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x - r * 0.3, cy); ctx.lineTo(x, cy + r * 0.2); ctx.lineTo(x + r * 0.3, cy); ctx.stroke(); }
    }
    ctx.globalAlpha = 1; ctx.lineCap = "butt";
  }
  // the face the in-game skull is pulling right now
  function gameFace(t = game.time) { return poseFace(VPOSE.id, t); }   // the face of the pose now showing (the pose library is in 04d_visual.js)
  function drawFlyingSkull() {
    const s = skull, p = project(s.pos.x, s.pos.y, s.pos.z), r = SKULL_R * p.s * (1 + 0.85 * (s.take || 0));
    const recoil = Math.max(0, 1 - s.flightTime / 0.07), fade = game.result ? clamp(game.endTimer / 0.3, 0, 1) : 1;
    drawTrail(s, fade);
    const V = VENT.skull || { a: rig.a, dir: rig.dir, tilt: rig.tilt, jaw: rig.jaw, angle: s.angle, t: game.time, face: gameFace() }, hat = VENT.hat || hatState();
    const sink = V.a < 1 && Math.abs(V.dir - Math.PI / 2) < 0.3 ? r * (1 - V.a) * 0.9 : 0;   // squash onto the ground
    const x = p.x + s.pullOff.x * recoil, y = p.y + s.pullOff.y * recoil + sink;
    const ghostly = (powerOn("ghost") || s.ghosted) ? 0.5 + 0.12 * Math.sin(game.time * 20) : 1;
    if (s.alpha * fade > 0.05) { drawPowerGlow(x, y, r); drawAura(ctx, x, y, r, V.t, false); drawRushWings(ctx, x, y, r, V.t, V.angle); drawPowerAura(ctx, x, y, r, V.t); }
    if (settings.contrast && s.alpha * fade > 0.3) contrastHalo(x, y, r * 1.18, 0, true);
    if (V.smear > 0 && s.alpha * fade > 0.05) drawSmear(ctx, x, y, r, V.mdir == null ? V.dir : V.mdir, V.smear, s.alpha * fade * ghostly, V.t);
    drawSkull(ctx, x, y, r, { ang: V.angle + V.tilt, alpha: s.alpha * fade * ghostly, a: V.a, dir: V.dir, t: V.t, look: cos, face: V.face, jaw: V.jaw });
    if (s.alpha * fade > 0.05) { drawAura(ctx, x, y, r, V.t, true); drawHat(ctx, x, y, r, V.angle + V.tilt, V.t, hat, s.alpha * fade * ghostly, hatOf(cos), V.a, V.dir); voice.anchor = { x, y, r }; }
    if (rig.mood === "deadpan" && rig.dots > 0) drawThought(x, y, r, rig.dots * s.alpha * fade);
    if (rig.mood === "dizzy" && s.alpha * fade > 0.1) dizzyStars(x, y - r * 1.2, r);
  }
  // the smear: for a drawing or two after the release the skull is a streak, the old cartoons' way of drawing
  // speed. A tapered tail of the skull's own colour back along the line it came, dry-brush streaks through it,
  // and on the thinner drawings a few speed lines past the tail. k: 1 on the first smear drawing, less after.
  function drawSmear(c, x, y, r, dir, k, alpha, t) {
    const S = SKINS[cos.skull] || SKINS.bone, pal = (S.flick && S.flick(t)) || S, L = r * (1.2 + 2.3 * k), w = r * (0.62 + 0.3 * k);
    c.save(); c.globalAlpha *= alpha; c.translate(x, y); c.rotate(dir);
    c.beginPath(); c.moveTo(r * 0.15, -w); c.bezierCurveTo(-L * 0.3, -w * 0.98, -L * 0.72, -w * 0.4, -L, 0); c.bezierCurveTo(-L * 0.72, w * 0.4, -L * 0.3, w * 0.98, r * 0.15, w); c.closePath();
    c.fillStyle = pal.base; c.fill(); c.lineJoin = "round"; c.lineWidth = Math.max(1.4, r * 0.09); c.strokeStyle = pal.line || INK; c.stroke();
    c.lineCap = "round"; c.lineWidth = Math.max(1, r * 0.065);
    for (const [yy, len] of [[-0.55, 0.55], [-0.18, 0.88], [0.2, 0.72], [0.56, 0.42]]) { c.beginPath(); c.moveTo(-r * 0.25, yy * w); c.lineTo(-L * len, yy * w * (1 - len * 0.55)); c.stroke(); }
    if (k < 0.8) { c.globalAlpha *= 0.75; c.lineWidth = Math.max(1, r * 0.05); for (const yy of [-0.62, 0, 0.62]) { c.beginPath(); c.moveTo(-L * 1.08, yy * w * 0.55); c.lineTo(-L * (1.32 + 0.12 * Math.abs(yy)), yy * w * 0.55); c.stroke(); } }
    c.restore();
  }
  // strain lines at full draw: little ink dashes flicking off the cranium, two drawings swapped on twos
  function drawEffort(c, x, y, r, n) {
    const set = n === 1 ? [-2.5, -2.18, -0.64, -0.96] : [-2.36, -2.04, -0.78, -1.1], r0 = r * 1.18, r1 = r * (1.42 + 0.06 * (n - 1));
    c.save(); c.lineCap = "round"; c.beginPath();
    for (const a of set) { c.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); c.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); }
    c.strokeStyle = INK; c.lineWidth = Math.max(3, r * 0.13); c.stroke();      // inked, then cream inside, so they read on the night
    c.strokeStyle = CREAM; c.lineWidth = Math.max(1.5, r * 0.065); c.stroke(); c.restore();
  }
  function dizzyStars(x, y, r) {
    for (let i = 0; i < 3; i++) {
      const a = game.time * 6 + (i / 3) * TAU, px = x + Math.cos(a) * r * 1.1, py = y + Math.sin(a) * r * 0.35;
      ctx.fillStyle = MUSTARD; ctx.strokeStyle = INK; ctx.lineWidth = 1.2; star(ctx, px, py, Math.max(3, r * 0.3), 5, 0.45, a); ctx.fill(); ctx.stroke();
    }
  }
  // the skull's shadow (the blueprint's shadow system): the higher it flies, the smaller and fainter it is and the
  // further along the key light it lies; at landing the two meet
  function drawSkullShadow() {
    if (game.state !== "flying") return;
    const s = skull.pos, h = Math.max(0, s.y - SKULL_R), q = project(s.x + shadowShift(h), 0, s.z);
    if (q.y > H + 20 || skull.alpha <= 0) return;
    const B = BLUEPRINT.shadow.skull, k = 1 / (1 + h * B.height), sc = B.scale[0] + (B.scale[1] - B.scale[0]) * k, op = B.opacity[0] + (B.opacity[1] - B.opacity[0]) * k;
    ctx.fillStyle = `rgba(0,0,0,${op})`;
    ctx.beginPath(); ctx.ellipse(q.x, q.y, SKULL_R * q.s * 1.15 * sc, SKULL_R * q.s * 0.28, 0, 0, TAU); ctx.fill();
  }

  function draw() {
    const wv = gateWeave(); camBase = { x: wv.x || 0, y: wv.y || 0 };   // the projector's weave moves the whole print
    // the planes, back to front: each one sits at its own depth, so the camera slides them by different amounts
    const L = (P, zc, plane) => { planeXform(ctx, zc, plane); ctx.drawImage(P.c, P.x0, P.y0, P.w, P.h); };
    L(skyLayer, 400, "sky");
    drawSkyWorld();
    L(farLayer, 70, "far");
    if (sceneFX.wheel || sceneFX.clock) { planeXform(ctx, 70, "far"); drawFarFX(world.t); baseXform(ctx); }
    drawSkyLife();
    drawGroundPlane(ctx, groundLayer);
    if (midLayer) L(midLayer, 30, "world");
    drawGroundWorld();
    const tint = game.state !== "title" && stageDef().tint;   // each map's colour grade, washed over the graveyard (not the ring or the skull)
    if (tint) { ctx.save(); ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.globalCompositeOperation = "soft-light"; ctx.globalAlpha = 0.55; ctx.fillStyle = tint; ctx.fillRect(-20, -20, W + 40, H + 40); ctx.restore(); }
    if (game.mode === "feature" && game.state !== "title") {   // the season's Feature plays after dark: a night grade over the scenery, a lantern glow in the middle (07l_season.js)
      ctx.save(); ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.globalCompositeOperation = "multiply"; ctx.fillStyle = "#555A92"; ctx.fillRect(-20, -20, W + 40, H + 40);
      ctx.globalCompositeOperation = "source-over"; const g = ctx.createRadialGradient(W * 0.5, H * 0.58, U * 0.15, W * 0.5, H * 0.58, Math.max(W, H) * 0.75);
      g.addColorStop(0, "rgba(232,137,58,.12)"); g.addColorStop(1, "rgba(8,6,20,.38)"); ctx.fillStyle = g; ctx.fillRect(-20, -20, W + 40, H + 40); ctx.restore();
    }
    drawBossLight();   // a boss fight: the scenery dims and a spot finds the ring (07n_environment.js)
    drawAnchorSupport();   // the branch, arch, signpost, batten or rail the ring hangs from
    if (boss) boss.draw(false);
    drawSeeds(false); drawTargets(false); drawCans(); drawObstacles(false); drawHazards(false);
    const onStage = game.state !== "title";
    if (onStage) drawTrackAndShadow();
    drawPlayWorld();
    drawSkullShadow();
    drawImpactStars(ctx, true);   // a contact further off than the ring: its star goes behind the ring
    const flying = game.state === "flying" || (game.state === "over" && skull.flightTime > 0);
    const behind = flying && skull.pos.z > ring.z;
    const pv = aim.active && aim.valid && game.state === "ready" ? buildPreview(aim.AX, aim.AY, settings.guide) : null;
    if (pv) drawDots(pv.back, true);
    if (flying && behind) drawFlyingSkull();
    if (onStage) { drawRing(); drawPickup(); }
    if (boss) boss.draw(true);
    drawSeeds(true); drawTargets(true); drawObstacles(true); drawHazards(true);
    drawImpactStars(ctx, false);   // contact stars: over the ring they hit, behind the skull that hit it
    if (pv) { drawDots(pv.front, false); drawReticle(pv); }
    if (game.state === "ready" || game.state === "cine" || game.state === "continue") {
      const rest = project(0, START_Y, 0), r = SKULL_R * rest.s * 1.12;
      const V = VENT.skull || { a: rig.a, dir: rig.dir, tilt: rig.tilt, jaw: rig.jaw, t: game.time, face: gameFace() }, SL = VENT.sling || sling, hat = VENT.hat || hatState();
      let off = { x: SL.x, y: SL.y + Math.sin(V.t * 2.4) * r * 0.05 };
      if (aim.active) off = pullOffset();   // the pull follows your finger every frame; the drawings step on 24s
      drawLauncher(rest.x, rest.y, r, off, SL.fy, SL.sq);
      if (aim.active && aim.valid) drawPower(rest.x + off.x, rest.y + off.y, r, aim.ny);
      const tr = V.tremble || { x: 0, y: 0 };   // the full-draw shiver: the whole skull moves, it never changes shape
      const k = easeOutBack(skull.spawn), sx = rest.x + off.x + tr.x * r, sy = rest.y + off.y + tr.y * r, ang = V.tilt + (aim.active ? off.x / (r * 14) : 0);
      if (settings.contrast) contrastHalo(sx, sy, r * k * 1.18, 0, true);
      drawPowerGlow(sx, sy, r * k); drawAura(ctx, sx, sy, r * k, V.t, false); drawRushWings(ctx, sx, sy, r * k, V.t); drawPowerAura(ctx, sx, sy, r * k, V.t);
      drawSkull(ctx, sx, sy, r * k, { ang, a: V.a, dir: V.dir, t: V.t, look: cos, face: V.face, jaw: V.jaw, alpha: powerOn("ghost") ? 0.6 : 1 });
      drawLauncherFront(rest.x, rest.y, r, off);
      if (V.effort && aim.active) drawEffort(ctx, sx, sy, r * k, V.effort);
      drawAura(ctx, sx, sy, r * k, V.t, true); drawHat(ctx, sx, sy, r * k, ang, V.t, hat, powerOn("ghost") ? 0.6 : 1, hatOf(cos), V.a, V.dir);
      voice.anchor = { x: sx, y: sy, r };
      if (!aim.active && game.throws < 2 && skull.spawn >= 1 && game.state === "ready") drawChevrons(rest.x, rest.y, r);
    } else {
      if (onStage) { const rest = project(0, START_Y, 0), SL = VENT.sling || sling; drawLauncher(rest.x, rest.y, SKULL_R * rest.s * 1.12, SL, SL.fy, SL.sq); }   // empty now, still twanging
      if (flying && !behind) drawFlyingSkull();
    }

    drawContinueGhost();
    // the nearest planes: props on the ground at the frame's edges, then branches right by the lens
    drawNear();
    drawWeather();
    for (const P of fgLayer) L(P, 2.4, "fg");
    baseXform(ctx);
    if (voice.anchor) { drawSpeech(voice.anchor.x, voice.anchor.y, voice.anchor.r); voice.anchor = null; }
    drawParticles();
    const RC = RINGS[cos.ring].color;
    for (const w of waves) {
      if (w.t < 0) continue;
      const k = w.t / w.dur;
      ctx.globalAlpha = (1 - k) * 0.8; ctx.strokeStyle = w.big ? MUSTARD : RC; ctx.lineWidth = Math.max(1, (1 - k) * U * (w.big ? 0.035 : 0.02));
      ctx.beginPath(); ctx.arc(w.x, w.y, w.r * (1 + k * (w.big ? 3.5 : 0.9)), 0, TAU); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    drawBursts();
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const fa = flashAlpha();
    if (fa > 0) { ctx.fillStyle = `rgba(242,231,201,${fa * 0.2})`; ctx.fillRect(0, 0, W, H); }
    if (visualsOn()) drawVisualDebug();
  }
