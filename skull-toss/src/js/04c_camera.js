  // ───────────────────────── the rostrum camera ─────────────────────────
  // Moonshine Cemetery is a stack of flat, inked planes at different depths, shot by one camera. When the
  // camera moves, near planes slide further than far ones, and that difference is the parallax. Depth is
  // compressed a little, as on a multiplane rig, so the far planes still move. The camera doesn't glide like
  // a modern game camera: its springs overshoot and settle, and it only "exposes" a new position 24 times a
  // second, so it steps like a rostrum camera photographing painted cels.
  //
  // Five moves, in order of importance:
  //   1. lean with the aim  - the main interactive parallax, scaled by how far you pull
  //   2. follow the throw   - a gentle pan and push-in that tracks the skull
  //   3. anticipation       - dolly back as the band stretches, then SNAP forward on release
  //   4. jolts              - impacts knock the planes against each other (instead of shaking the screen)
  //   5. idle drift         - almost nothing: just enough that the painting feels alive
  const CAM = {
    lean: { x: 0.2, y: 0.1 },                 // metres of camera travel at a full pull
    back: 0.32,                               // anticipation dolly at a full pull
    follow: { x: 0.22, y: 0.045, z: 0.5 },
    drift: { x: 0.03, y: 0.014, z: 0.05 },
    fps: 24                                   // exposures per second
  };
  const PLANES = ["sky", "far", "ground", "world", "play", "near", "fg"];
  const cam = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, t: 0, stepT: 0, snapT: 0, slip: {} };
  const camS = { x: 0, y: 0, z: 0, slip: {} };            // what the camera shows: the last exposure
  for (const p of PLANES) { cam.slip[p] = { x: 0, y: 0, vx: 0, vy: 0 }; camS.slip[p] = { x: 0, y: 0 }; }
  let camOn = false, camBase = { x: 0, y: 0 };             // camBase: the projector's gate weave, applied to every plane
  const camAmp = () => (settings.camera === "still" ? 0 : settings.camera === "gentle" ? 0.45 : 1);

  // parallax depth: distances are compressed toward the ring's (a multiplane rig exaggerates separation)
  const PARALLAX = 0.6;
  const effZ = zc => (RING_Z + CAM_BACK) * Math.pow(Math.max(0.3, zc) / (RING_Z + CAM_BACK), PARALLAX);
  function camAt(zc, plane) {            // how a plane at camera distance zc sits in the current exposure
    const ze = effZ(zc), d = Math.max(0.6, ze - camS.z), sl = plane ? camS.slip[plane] : null;
    return { k: ze / d, ox: -camS.x * F / d + (sl ? sl.x : 0), oy: camS.y * F / d + (sl ? sl.y : 0) };
  }
  const planeOf = zc => (zc < 5 ? "near" : zc < 13 ? "play" : "world");
  function projectBase(x, y, z) {        // the locked-off camera: layout, physics helpers and the painted layers use this
    const zc = Math.max(0.3, z + CAM_BACK), s = F / zc;
    return { x: W / 2 + x * s, y: HY + (CAMY - y) * s, s };
  }
  function project(x, y, z) {            // everything drawn in the world goes through the camera
    const zc = Math.max(0.3, z + CAM_BACK), s = F / zc, bx = W / 2 + x * s, by = HY + (CAMY - y) * s;
    if (!camOn) return { x: bx + camBase.x, y: by + camBase.y, s };
    const c = camAt(zc, planeOf(zc));
    return { x: W / 2 + (bx - W / 2) * c.k + c.ox + camBase.x, y: HY + (by - HY) * c.k + c.oy + camBase.y, s: s * c.k };
  }
  // put a flat, screen-sized layer at distance zc (snapped to whole device pixels, like a registered cel)
  function planeXform(g, zc, plane) {
    const c = camOn ? camAt(zc, plane) : { k: 1, ox: 0, oy: 0 }, k = Math.abs(c.k - 1) < 0.004 ? 1 : c.k, snap = v => Math.round(v * DPR);   // no rescale for a hair's-breadth zoom
    g.setTransform(DPR * k, 0, 0, DPR * k, snap(W / 2 * (1 - k) + c.ox + camBase.x), snap(HY * (1 - k) + c.oy + camBase.y));
  }
  const baseXform = g => g.setTransform(DPR, 0, 0, DPR, 0, 0);   // screen space; world things add camBase through project()
  // the floor recedes, so it is drawn in strips, each sliding by the depth of the ground it shows
  function groundAt(y) {
    const v = y - HY;
    if (!camOn || v < 1) { const c = camOn ? camAt(600, "ground") : { k: 1, ox: 0, oy: 0 }; return { y: HY + v * c.k + c.oy, k: c.k, ox: c.ox }; }
    const c = camAt((CAMY * F) / v, "ground");
    return { y: HY + v * c.k + c.oy, k: c.k, ox: c.ox };
  }
  function drawGroundPlane(g, L) {
    baseXform(g);
    if (!camOn) { g.drawImage(L.c, L.x0 + camBase.x, L.y0 + camBase.y, L.w, L.h); return; }
    const top = L.y0, bot = L.y0 + L.h, cuts = [top, HY + 1];
    for (let i = 1; i <= 12; i++) cuts.push(HY + 1 + (bot - HY - 1) * Math.pow(i / 12, 1.35));
    const sy = L.c.height / L.h;
    for (let i = 0; i < cuts.length - 1; i++) {
      const a = cuts[i], b = cuts[i + 1]; if (b <= a) continue;
      const A = groundAt(a), B = groundAt(b), M = groundAt((a + b) / 2), ya = Math.round(A.y + camBase.y), yb = Math.round(B.y + camBase.y);
      if (yb <= ya) continue;
      g.drawImage(L.c, 0, (a - top) * sy, L.c.width, (b - a) * sy, W / 2 + (L.x0 - W / 2) * M.k + M.ox + camBase.x, ya, L.w * M.k, yb - ya);
    }
  }

  // ── the moves
  function updateCamera(dt) {
    const A = camAmp();
    camOn = A > 0;
    if (!camOn) { cam.x = cam.y = cam.z = cam.vx = cam.vy = cam.vz = 0; camS.x = camS.y = camS.z = 0; for (const p of PLANES) { Object.assign(cam.slip[p], { x: 0, y: 0, vx: 0, vy: 0 }); camS.slip[p].x = camS.slip[p].y = 0; } return; }
    cam.t += dt;
    const t = cam.t;
    // 5. idle drift: a slow, uneven breath of a move
    let tx = CAM.drift.x * (Math.sin(t * 0.23) * 0.7 + Math.sin(t * 0.61 + 1) * 0.3), ty = CAM.drift.y * Math.sin(t * 0.31 + 2), tz = CAM.drift.z * Math.sin(t * 0.17 + 0.5);
    let k = 60, d = 10;
    if (game.state === "ready" && aim.active && aim.valid) {
      // 1. lean with the aim (toward the pull, so away from the throw) and 3. anticipation: dolly back as it stretches
      const off = pullOffset(), L = U * 0.2, px = clamp(off.x / L, -1, 1), py = clamp(off.y / L, 0, 1), ten = clamp(aim.tension, 0, 1);
      tx += px * CAM.lean.x; ty -= py * CAM.lean.y; tz -= CAM.back * Math.pow(ten, 1.4);
      k = 95; d = 13;
    } else if (game.state === "flying" || (game.state === "over" && skull.flightTime > 0 && skull.alpha > 0)) {
      // 2. follow the throw: pan after the skull, push in as it reaches the ring
      const s = skull.pos, prog = clamp(s.z / Math.max(1, ring.z), 0, 1);
      tx += clamp(s.x, -3, 3) * CAM.follow.x; ty += clamp(s.y - START_Y, -1, 4) * CAM.follow.y; tz += CAM.follow.z * Math.sin(prog * Math.PI / 2);
      k = 50; d = 9;
    }
    if (game.cine && game.cine.pull) { const c = game.cine, u = clamp(c.t / c.dur, 0, 1); tz -= c.pull * Math.sin(Math.min(1, u * 1.6) * Math.PI / 2) * (u > 0.8 ? (1 - u) / 0.2 : 1); ty += c.pull * 0.08; k = 26; d = 8; }   // cut-scenes: pull back to show the change
    if (cam.snapT > 0) { cam.snapT -= dt; k = 180; d = 15; }   // the snap after release: stiff, with overshoot
    ty = clamp(ty, -0.13, 0.1);                                   // never lift so far that the branches swing into the play
    // the blueprint's camera limits (src/maps/blueprint.json, and each map's sheet): inside the map's camera bounds, and
    // never so far that the ring leaves its safe box on the screen (a move that would is scaled back until it doesn't)
    if (game.state !== "title" && typeof mapData === "function") {
      const Cb = mapData(game.stage || 1).sheet.camera; tx = clamp(tx, Cb.x[0], Cb.x[1]); ty = clamp(ty, Cb.y[0], Cb.y[1]); tz = clamp(tz, Cb.z[0], Cb.z[1]);
      const S = BLUEPRINT.camera.ringSafe, p = project(ring.x, ring.y, ring.z), out = p.x < W * S.margin || p.x > W * (1 - S.margin) || p.y < H * S.top || p.y > H * S.bottom;
      cam.safe = clamp((cam.safe == null ? 1 : cam.safe) + (out ? -dt * 3 : dt * 1.5), 0.35, 1); tx *= cam.safe; ty *= cam.safe; tz *= cam.safe;
    }
    if (ATTR.on) { tz -= ATTR.pull; if (ATTR.shake) { tx += Math.sin(cam.t * 37) * 0.02 * ATTR.shake; ty += Math.sin(cam.t * 29 + 1) * 0.012 * ATTR.shake; } }   // (v56: Longshot eases back; Sudden Death shakes)
    tx *= A; ty *= A; tz *= A;
    const n = Math.max(1, Math.ceil(dt / 0.008)), h = dt / n;
    for (let i = 0; i < n; i++) {
      cam.vx += (-k * (cam.x - tx) - d * cam.vx) * h; cam.x += cam.vx * h;
      cam.vy += (-k * (cam.y - ty) - d * cam.vy) * h; cam.y += cam.vy * h;
      cam.vz += (-k * (cam.z - tz) - d * cam.vz) * h; cam.z += cam.vz * h;
      for (const p of PLANES) { const s = cam.slip[p]; s.vx += (-520 * s.x - 20 * s.vx) * h; s.x += s.vx * h; s.vy += (-520 * s.y - 20 * s.vy) * h; s.y += s.vy * h; }
    }
    cam.z = clamp(cam.z, -1, 1.2);
    // expose a new frame on the visual system's clock (24 a second), the same beat the characters' drawings change on
    if (VCLOCK.fresh || !camS.exposed) {
      camS.exposed = true; camS.n = (camS.n || 0) + 1;
      camS.x = cam.x; camS.y = cam.y; camS.z = cam.z;
      for (const p of PLANES) { camS.slip[p].x = cam.slip[p].x; camS.slip[p].y = cam.slip[p].y; }
    }
  }
  // RELEASE: the camera has been leaning back; now it snaps forward, overshooting toward the throw
  function camRelease() {
    if (!camOn) return;
    const A = camAmp();
    cam.snapT = 0.3; cam.vz += 2.8 * A; cam.vx += -cam.x * 9; cam.vy += -cam.y * 6;
  }
  // 4. jolts knock the planes against each other: each plane slips a different way, then settles
  const JOLTS = {
    bonk:    { v: [0.9, 0.45, -0.8], slip: 1 },
    thud:    { v: [0.35, 0.9, -0.3], slip: 0.75 },
    perfect: { v: [0, 0.25, 1.9], slip: 0.55 },
    swish:   { v: [0, 0.12, 0.7], slip: 0 },
    thunder: { v: [0.08, 0.35, 0], slip: 0.6, planes: ["sky", "far"] },
    boss:    { v: [0.7, 0.6, 1.5], slip: 1.1 },           // the big ones are kept for bosses and knockouts
    ko:      { v: [0.4, 1.1, -2.2], slip: 1.5 }
  };
  function camJolt(kind, strength = 1) {   // strength: how hard the hit was (1 = a normal throw); the visual system scales it
    if (!camOn || !settings.shake) return;
    const J = JOLTS[kind], A = camAmp() * clamp(strength, 0.4, 1.6), side = Math.random() < 0.5 ? -1 : 1;
    cam.vx += J.v[0] * side * A; cam.vy += J.v[1] * A; cam.vz += J.v[2] * A;
    const kick = J.slip * U * 0.3 * A;
    if (kick) for (const p of J.planes || PLANES) { const s = cam.slip[p]; s.vx += rand(-1, 1) * kick; s.vy += rand(-0.6, 1) * kick; }
  }
