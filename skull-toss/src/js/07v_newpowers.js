  // ───────────────────────── v57: six power-ups with physics of their own ─────────────────────────
  // Vine Swing (woods on), Diving Skull (water maps), Clone Skull (marsh on), Rewind Bone (desert on), Homing Bone
  // (caves on), Gravity Flip (abyss). Each changes how the skull moves, in the flight's own steps (07_game.js), on the
  // run's time, so a replay plays it the same. What each does: docs/WORLD-SYSTEMS.md (Power-ups).
  const gNow = () => (powerOn("flip") ? -G : G);   // the gravity the next throw will fly under
  const skullG = s => (s.g != null ? s.g : G);

  // ── Homing Bone: proportional steering toward where the ring will be when the skull gets there
  const HOMING = { window: 0.75, reach: 1.5, gain: 0.85, max: 14 };
  function powerPush(s, dt) {
    if (!powerOn("homing") || s.resting || s.sub || s.vine || s.rew || s.hang > 0 || s.crossed || game.result || s.v0.z <= 0) return;
    const v = velAt(s, s.t), dz = ring.z - s.pos.z; if (dz < 0.05 || v.z <= 0) return;
    const tg = dz / v.z; if (tg > HOMING.window) return;
    const g = skullG(s), ax = s.ax || 0, rp = ring.frozen ? ringAt(ring.phase) : ringAt(ring.phase + ring.omega * tg);
    const px = s.pos.x + v.x * tg + 0.5 * ax * tg * tg, py = s.pos.y + v.y * tg - 0.5 * g * tg * tg, ex = rp.x - px, ey = rp.y - py, e = Math.hypot(ex, ey);
    if (e > HOMING.reach || e < 0.01) return;
    const k = HOMING.gain * (1 - e / HOMING.reach * 0.5), aX = clamp((2 * ex) / (tg * tg) * k, -HOMING.max, HOMING.max), aY = clamp((2 * ey) / (tg * tg) * k, -HOMING.max, HOMING.max);
    rebase(s, s.t); s.v0 = { x: s.v0.x + aX * dt, y: s.v0.y + aY * dt, z: s.v0.z };
    if (!s.homed) { s.homed = true; Sound.toon("tick"); }
  }

  // ── Vine Swing
  const VINE = { x: 0, pivotY: 5.6, z: 2.8, L: 3.4, grab: 0.42, sway: 0.75 };
  const vineOn = () => powerOn("vine") && (game.state === "ready" || game.state === "flying");
  function vineEnd(t = game.time) { const x = VINE.x + Math.sin(t * 1.1) * VINE.sway, a = Math.asin(clamp((x - VINE.x) / VINE.L, -1, 1)); return { x, y: VINE.pivotY - Math.cos(a) * VINE.L, z: VINE.z }; }
  function vineCheck(s) {
    if (!powerOn("vine") || s.vine || s.vined || s.crossed || game.result || s.sub || s.rew) return;
    const E = vineEnd(); if (Math.hypot(s.pos.x - E.x, s.pos.y - E.y, s.pos.z - E.z) > VINE.grab) return;
    const v = velAt(s, s.t), dz = s.pos.z - VINE.z, dy = VINE.pivotY - s.pos.y, L = Math.max(1.5, Math.hypot(dz, dy)), th = Math.atan2(dz, dy);
    const om = Math.max(1.6, (v.z * Math.cos(th) + v.y * Math.sin(th)) / L);
    s.vine = { th, om, L, t: 0 }; s.vined = true; s.resting = true; s.ax = 0; usePower("vine");
    Sound.toon("whistleUp"); const p = project(s.pos.x, s.pos.y, s.pos.z); caption(t("np.vine.grab"), p.x, p.y - U * 0.08);
  }
  function vineStep(s, dt) {
    const V = s.vine; V.t += dt;
    V.om += (-(G / V.L) * Math.sin(V.th)) * dt; V.th += V.om * dt;
    const E = vineEnd(), pos = { x: s.pos.x + (ring.x - s.pos.x) * Math.min(1, dt * 2.5), y: VINE.pivotY - Math.cos(V.th) * V.L, z: VINE.z + Math.sin(V.th) * V.L };
    s.pos = pos; s.angle += V.om * dt * 1.2; void E;
    // let go when the free flight from here would cross the ring's plane at the ring's height (or it's run out of swing)
    const vz = V.L * V.om * Math.cos(V.th), vy = V.L * V.om * Math.sin(V.th);
    let go = V.th > 1.15 || V.om < 0.25 || V.t > 2.5;
    if (!go && vz > 0.5 && V.th > 0) {
      const tc = (ring.z - pos.z) / vz, rp = ring.frozen ? ringAt(ring.phase) : ringAt(ring.phase + ring.omega * tc), yc = pos.y + vy * tc - 0.5 * G * tc * tc;
      if (tc > 0 && yc >= rp.y) go = true;
    }
    if (go) {
      const tc = vz > 0.3 ? (ring.z - pos.z) / vz : 1, rp = ring.frozen ? ringAt(ring.phase) : ringAt(ring.phase + ring.omega * Math.max(0, tc));
      s.vine = null; s.resting = false; s.p0 = { ...pos }; s.t = 0; s.v0 = { x: vz > 0.3 ? (rp.x - pos.x) / Math.max(0.15, tc) : 0, y: vy, z: Math.max(0.5, vz) };
      Sound.cue("whoosh", { pan: panOf(pos.x) }); s.swung = true;
    }
  }
  function drawVine() {
    if (!vineOn() && !(skull.vine)) return;
    const s = skull, end = s.vine ? s.pos : vineEnd(), top = project(end.x * 0.3, VINE.pivotY + 1.5, VINE.z), b = project(end.x, end.y, end.z);
    ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round";
    const mx = (top.x + b.x) / 2 + Math.sin(game.time * 1.3) * U * 0.03, my = (top.y + b.y) / 2;
    for (const [col, w] of [[INK, Math.max(4, b.s * 0.07)], ["#5E9E3A", Math.max(2, b.s * 0.045)]]) { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(top.x, top.y); ctx.quadraticCurveTo(mx, my, b.x, b.y); ctx.stroke(); }
    ctx.fillStyle = "#6FB84A"; ctx.strokeStyle = INK; ctx.lineWidth = 1.2;   // leaves along it
    for (let i = 1; i < 6; i++) { const u = i / 6, x = (1 - u) * (1 - u) * top.x + 2 * (1 - u) * u * mx + u * u * b.x, y = (1 - u) * (1 - u) * top.y + 2 * (1 - u) * u * my + u * u * b.y, sd = i % 2 ? 1 : -1, r = b.s * 0.08;
      ctx.beginPath(); ctx.ellipse(x + sd * r * 0.8, y, r, r * 0.45, sd * 0.6, 0, TAU); ctx.fill(); ctx.stroke(); }
    if (!s.vine) { ctx.strokeStyle = "rgba(242,231,201,.55)"; ctx.setLineDash([3, 4]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(b.x, b.y, VINE.grab * b.s, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }   // (its reach)
    ctx.restore();
  }

  // ── Diving Skull: short into the water, it dives, swims on, and leaps for the ring
  function diveCatch(s) {
    const p = s.p0; if (!powerOn("dive") || s.bounces || s.crossed || game.result || !overWater(p.x, p.z) || p.z > ring.z - 0.6) return false;
    usePower("dive"); waterRipple(p.x, p.z, 1.1); Sound.toon("splash", panOf(p.x));
    enterWater(s); s.sub.dive = true; s.sub.v = { x: s.sub.v.x * 0.5, y: Math.min(-1.2, s.sub.v.y), z: Math.max(3.2, s.sub.v.z) }; s.bounces = 1;
    const q = project(p.x, 0, p.z); caption(t("np.dive.go"), q.x, q.y - U * 0.08);
    return true;
  }
  function diveStep(s, dt) {
    const W2 = s.sub; W2.t += dt;
    W2.v.y += ((-0.55 - s.pos.y) * 6 - W2.v.y * 2.5) * dt;   // it settles at a swimming depth
    W2.v.x += ((ring.x - s.pos.x) * 1.5 - W2.v.x) * dt;      // and steers under the ring
    s.pos = { x: s.pos.x + W2.v.x * dt, y: s.pos.y + W2.v.y * dt, z: s.pos.z + W2.v.z * dt };
    s.alpha = 0.8; s.angle += dt * 3;
    W2.bub -= dt; if (W2.bub <= 0) { W2.bub = 0.05; const p = project(s.pos.x, s.pos.y, s.pos.z); spawnBit("bubble", p.x, p.y, SKULL_R * p.s); }
    if (s.pos.z >= ring.z - 1.6 || W2.t > 1.6) {   // the breach: up out of the water and on through the ring
      const tb = 0.45, rp = ring.frozen ? ringAt(ring.phase) : ringAt(ring.phase + ring.omega * tb), from = { x: s.pos.x, y: SKULL_R + 0.03, z: s.pos.z };   // (just clear of the surface)
      s.sub = null; s.resting = false; s.alpha = 1; s.p0 = from; s.t = 0; s.pos = { ...from };
      s.v0 = { x: (rp.x - from.x) / tb, y: (rp.y - from.y + 0.5 * G * tb * tb) / tb, z: Math.max(0.8, (ring.z - from.z) / tb) };
      waterRipple(from.x, from.z, 1.3); Sound.toon("splash", panOf(from.x)); const q = project(from.x, 0.2, from.z); impact(t("np.dive.breach"), q.x, q.y - U * 0.06, { fill: "#3A8FB8", text: CREAM, scale: 0.6, bits: false });
    }
  }

  // ── Clone Skull: two clones fanned out either side of every throw
  function cloneLaunch(s, v) {
    s.clones = powerOn("clones") ? [-1, 1].map(sd => ({ p0: { x: 0, y: START_Y, z: 0 }, v0: { x: v.x + sd * 0.75, y: v.y + sd * 0.18, z: v.z }, t: 0, ax: s.ax, g: s.g, resting: false, pos: { x: 0, y: START_Y, z: 0 }, alive: true, sd })) : null;
  }
  function clonesStep(s, dt) {
    for (const c of s.clones) { if (!c.alive) continue; c.t += dt; c.pos = posAt(c, c.t); if (c.pos.y < SKULL_R || c.pos.z > 40 || c.t > 4) c.alive = false; }
  }
  // at the ring's plane: if the skull itself is going to miss and a clone is through, the clone is the one that counts
  function cloneSwap(s, rp) {
    if (!s.clones || s.cloneJudged) return; s.cloneJudged = true;
    const inner = ring.rc - RING_TUBE - SKULL_R;
    if (Math.hypot(s.p0.x - rp.x, s.p0.y - rp.y) <= inner) return;
    for (const c of s.clones) {
      if (!c.alive) continue;
      const tc = (ring.z - c.p0.z) / c.v0.z, cp = posAt(c, tc);
      if (Math.hypot(cp.x - rp.x, cp.y - rp.y) > inner * 0.95) continue;
      const mine = { p0: { ...s.p0 }, v0: velAt(s, s.t), t: 0, ax: s.ax, g: s.g, resting: false, pos: { ...s.p0 }, alive: true, sd: 0 };
      s.p0 = { x: cp.x, y: cp.y, z: s.p0.z }; s.v0 = velAt(c, tc); s.t = 0; s.pos = { ...s.p0 };
      c.alive = false; s.clones.push(mine); s.cloned = true;
      const p = project(cp.x, cp.y, s.p0.z); caption(t("np.clone.took"), p.x, p.y - U * 0.1);
      return;
    }
  }
  function drawClones() {
    const s = skull; if (!s.clones || !(game.state === "flying" || game.state === "over")) return;
    const fade = game.result ? clamp(game.endTimer / 0.3, 0, 1) : 1;
    for (const c of s.clones) {
      if (!c.alive) continue;
      const p = project(c.pos.x, c.pos.y, c.pos.z), r = SKULL_R * p.s;
      drawSkull(ctx, p.x, p.y, r, { ang: s.angle + c.sd * 0.4 + (skullG(c) < 0 ? Math.PI : 0), alpha: 0.42 * fade, a: 1, dir: 0, t: game.time, look: cos, face: gameFace(), jaw: 0.2 });
    }
  }

  // ── Rewind Bone: the throw runs backwards and never happened
  const REWIND = { dur: 0.9 };
  function rewindMark(s) { s.path = []; s.rew0 = { phase: ring.phase, glide: ring.glide ? { ...ring.glide } : null }; }
  function rewindRecord(s) { if (s.path && s.path.length < 400 && !s.rew) s.path.push({ x: s.pos.x, y: s.pos.y, z: s.pos.z }); }
  // (resolve, 07_game.js): a miss with the Rewind Bone on is taken back
  const rewindTakes = () => powerOn("rewind") && game.state === "flying" && !!skull.rew0;
  function rewindBegin() {
    const s = skull; if (!game.result || !game.result.rewind || s.rew) return false;
    s.rew = { t: 0, phase1: ring.phase, path: s.path || [] }; s.alpha = 1; s.hang = 0; s.resting = true;
    Sound.toon("whistleDown"); caption(t("np.rewind.go"), W / 2, H * 0.22); return true;
  }
  function rewindStep(s, dt) {
    const R = s.rew; R.t += dt; const u = smooth(clamp(R.t / REWIND.dur, 0, 1)), P = R.path;
    if (P.length) { const i = Math.round((1 - u) * (P.length - 1)); s.pos = { ...P[Math.max(0, i)] }; }
    s.angle -= dt * 14;
    ring.phase = R.phase1 + (s.rew0.phase - R.phase1) * u;   // the ring swings back to where it was when the skull left
    if (R.t >= REWIND.dur) {
      ring.phase = s.rew0.phase; game.throws = Math.max(0, game.throws - 1); profile.throws = Math.max(0, profile.throws - 1);
      game.result = null; s.rew = null; Sound.flightStop();
      settleThrow();
    }
  }
  function drawRewindFx() {
    const s = skull; if (!s.rew) return;
    const k = Math.sin(clamp(s.rew.t / REWIND.dur, 0, 1) * Math.PI);
    ctx.save(); ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.globalCompositeOperation = "multiply"; ctx.fillStyle = `rgba(200,160,100,${0.35 * k})`; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "source-over"; ctx.strokeStyle = `rgba(242,231,201,${0.25 * k})`; ctx.lineWidth = 1;   // the film scratching as it runs back
    for (let i = 0; i < 6; i++) { const x = ((i * 137 + Math.floor(game.time * 24) * 53) % W); ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 3, H); ctx.stroke(); }
    ctx.fillStyle = `rgba(242,231,201,${0.9 * k})`; ctx.font = `${Math.round(U * 0.09)}px ${DISPLAY}`; ctx.textAlign = "center"; ctx.fillText("◀◀", W / 2, H * 0.14);
    ctx.restore();
  }

  // ── Homing Bone's lock: brackets closing round the ring once it's steering
  function drawHomingLock() {
    const s = skull; if (!s.homed || game.state !== "flying" || s.crossed) return;
    const p = project(ring.x, ring.y, ring.z), r = ring.rc * p.s * 1.25, k = 0.8 + 0.2 * Math.sin(game.time * 20);
    ctx.save(); ctx.strokeStyle = "#E85A5A"; ctx.lineWidth = 2.5; ctx.lineCap = "round";
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { ctx.beginPath(); ctx.moveTo(p.x + sx * r * k, p.y + sy * r * k * 0.6); ctx.lineTo(p.x + sx * r * k, p.y + sy * r * k); ctx.lineTo(p.x + sx * r * k * 0.6, p.y + sy * r * k); ctx.stroke(); }
    ctx.restore();
  }

  // ── the props, drawn like the rest (07c_power.js: drawPowerIcon hands these over)
  function drawNewPowerIcon(c, id, r, tt, lw) {
    const ink = () => { c.fill(); c.stroke(); };
    if (id === "vine") {         // a coil of vine with leaves, and a skull swinging on it
      c.strokeStyle = INK; c.lineWidth = lw * 2.4; c.beginPath(); c.moveTo(-r * 0.9, -r * 1.1); c.quadraticCurveTo(r * 0.2, -r * 0.4, r * 0.1, r * 0.4); c.stroke();
      c.strokeStyle = "#5E9E3A"; c.lineWidth = lw * 1.4; c.stroke(); c.lineWidth = lw; c.strokeStyle = INK;
      c.fillStyle = "#6FB84A"; for (const [x, y, a] of [[-0.55, -0.85, 0.5], [-0.1, -0.45, -0.6], [0.2, -0.05, 0.7]]) { c.beginPath(); c.ellipse(x * r, y * r, r * 0.22, r * 0.1, a, 0, TAU); ink(); }
      drawSkull(c, r * 0.15, r * 0.72, r * 0.42, { t: tt, look: { ...DEFAULT_COS }, face: faceFor("excited", tt), jaw: 0.3, ang: Math.sin(tt * 3) * 0.3 });
    } else if (id === "dive") {  // a skull in a brass diving helmet, bubbles going up
      c.fillStyle = "#C49A42"; c.beginPath(); c.arc(0, 0, r * 0.95, 0, TAU); ink();
      c.fillStyle = "#9FD8E8"; c.beginPath(); c.arc(0, r * 0.05, r * 0.6, 0, TAU); ink();
      drawSkull(c, 0, r * 0.1, r * 0.42, { t: tt, look: { ...DEFAULT_COS }, face: faceFor("idle", tt), jaw: 0.1 });
      c.fillStyle = "#8A6A2E"; for (const a of [0, 1.57, 3.14, 4.71]) { c.beginPath(); c.arc(Math.cos(a) * r * 0.78, Math.sin(a) * r * 0.78, r * 0.08, 0, TAU); ink(); }
      c.fillStyle = "rgba(200,240,255,.8)"; for (let i = 0; i < 3; i++) { const u = ((tt * 0.8 + i / 3) % 1); c.beginPath(); c.arc(r * (0.7 + i * 0.1), -r * (0.9 + u * 0.8), r * (0.08 + i * 0.03), 0, TAU); c.fill(); c.stroke(); }
    } else if (id === "clones") { // three skulls, the two behind ghostly
      for (const [dx, a] of [[-0.55, 0.45], [0.55, 0.45], [0, 1]]) { c.save(); c.globalAlpha *= a; drawSkull(c, dx * r, dx ? r * 0.1 : 0, r * (dx ? 0.5 : 0.62), { t: tt, look: { ...DEFAULT_COS }, face: faceFor("excited", tt), jaw: 0.2 }); c.restore(); }
    } else if (id === "rewind") { // a film reel with a rewind arrow
      c.rotate(-tt * 2); c.fillStyle = "#3A342E"; c.beginPath(); c.arc(0, 0, r * 0.95, 0, TAU); ink();
      c.fillStyle = "#D8B25A"; for (let i = 0; i < 5; i++) { const a = i * TAU / 5; c.beginPath(); c.arc(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, r * 0.2, 0, TAU); ink(); }
      c.fillStyle = "#D8B25A"; c.beginPath(); c.arc(0, 0, r * 0.14, 0, TAU); ink(); c.rotate(tt * 2);
      c.fillStyle = CREAM; c.beginPath(); for (const ox of [0, r * 0.45]) { c.moveTo(-r * 0.2 - ox + r * 0.3, -r * 0.35); c.lineTo(-r * 0.55 - ox + r * 0.3, 0); c.lineTo(-r * 0.2 - ox + r * 0.3, r * 0.35); c.closePath(); } ink();
    } else if (id === "homing") { // a bone with a red crosshair and a curling arrow
      c.save(); c.rotate(-0.6); c.fillStyle = "#F2E7C9"; c.beginPath(); rr(c, -r * 0.6, -r * 0.12, r * 1.2, r * 0.24, r * 0.1); for (const bx of [-0.6, 0.6]) for (const by of [-0.14, 0.14]) { c.moveTo(bx * r + r * 0.17, by * r); c.arc(bx * r, by * r, r * 0.17, 0, TAU); } ink(); c.restore();
      c.strokeStyle = "#E85A5A"; c.lineWidth = lw * 0.9; c.beginPath(); c.arc(0, 0, r * 1.05, 0, TAU); for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { c.moveTo(ax * r * 0.8, ay * r * 0.8); c.lineTo(ax * r * 1.3, ay * r * 1.3); } c.stroke();
    } else if (id === "flip") {   // an upside-down skull and an arrow pointing up
      drawSkull(c, 0, r * 0.2, r * 0.62, { t: tt, look: { ...DEFAULT_COS }, face: faceFor("fear", tt), jaw: 0.3, ang: Math.PI });
      c.fillStyle = "#7A6AE8"; c.beginPath(); c.moveTo(0, -r * 1.35); c.lineTo(r * 0.45, -r * 0.8); c.lineTo(r * 0.15, -r * 0.8); c.lineTo(r * 0.15, -r * 0.5); c.lineTo(-r * 0.15, -r * 0.5); c.lineTo(-r * 0.15, -r * 0.8); c.lineTo(-r * 0.45, -r * 0.8); c.closePath(); ink();
    } else return false;
    return true;
  }
