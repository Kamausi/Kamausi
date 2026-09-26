  // ───────────────────────── v57: the land: hills, dips, and a road that bends ─────────────────────────
  // Looks only: within nine metres of the camera the land is flat and the road straight, so the play never changes.
  // Beyond, the road rises and falls (roll, over wave metres), hills lift either side of it (hills), and its middle
  // drifts left and right (curve, over bend metres); src/maps/<map>.json: travel.land. The land is painted in slices,
  // far to near, in among the scenery, so a crest hides what's beyond it. docs/WORLD-SYSTEMS.md (The land).
  const LAND = { hills: 0, roll: 0, wave: 90, curve: 0, bend: 150, ph: [0, 0, 0, 0, 0, 0], on: false, flat: true, slices: null };
  const LAND_NEAR = 9, LAND_H_FULL = 48, LAND_C_FULL = 22;   // (the hills ease in slowly, so the scenery coming toward you isn't walled off)
  const LAND_Z = [170, 140, 115, 96, 82, 70, 60, 52, 45, 39, 34, 30, 26.5, 23.5, 21, 18.8, 16.8, 15, 13.4, 12, 10.6, 9.6, LAND_NEAR];
  const PATH_HALF = 1.15;
  function landSetup(Tv) {
    const L = (Tv && Tv.land) || {}, rnd = mulberry32(5150 + sceneMap * 97);
    Object.assign(LAND, { hills: L.hills || 0, roll: L.roll || 0, wave: L.wave || 90, curve: L.curve || 0, bend: L.bend || 150, ph: [0, 0, 0, 0, 0, 0].map(() => rnd() * TAU) });
    LAND.on = !!Tv; LAND.flat = !(LAND.hills > 0 || LAND.roll > 0); LAND.slices = null;
  }
  // the land's height at a place on the track (d along it, u across it from the road's middle)
  function landH(d, u) {
    const P = LAND.ph, w = TAU / LAND.wave, au = Math.abs(u);
    let h = LAND.roll * 0.75 * (0.65 * Math.sin(d * w + P[0]) + 0.35 * Math.sin(d * w * 2.2 + P[1]));
    if (LAND.hills) {
      const side = smooth(clamp((au - 5) / 11, 0, 1)), far = smooth(clamp((au - 16) / 24, 0, 1));
      const lump = 0.55 + 0.45 * Math.sin(d * 0.045 + u * 0.11 + P[2]) * Math.sin(d * 0.019 - u * 0.05 + P[3]);
      h += LAND.hills * (side * lump + far * 0.45 * (0.6 + 0.4 * Math.sin(d * 0.012 + u * 0.03 + P[4])));
    }
    return h;
  }
  // the road's middle, across the track, at d
  const landCx = d => LAND.curve ? LAND.curve * 9 * (0.7 * Math.sin(d * TAU / LAND.bend + LAND.ph[4]) + 0.3 * Math.sin(d * TAU / (LAND.bend * 0.47) + LAND.ph[5])) : 0;
  const landKH = z => smooth(clamp((z - LAND_NEAR) / (LAND_H_FULL - LAND_NEAR), 0, 1));
  const landKC = z => smooth(clamp((z - (LAND_NEAR - 1)) / (LAND_C_FULL - LAND_NEAR + 1), 0, 1));
  const landD = () => (TRAVEL.on ? TRAVEL.D : 0);
  // where something at (x across its road, z from the camera) stands: how far the bend moves it, and how high the land is
  function landAt(x, z) {
    if (!LAND.on || z < LAND_NEAR - 1) return { dx: 0, y: 0 };
    const D = landD(), d = D + z, kc = landKC(z), dx = (landCx(d) - landCx(D)) * kc;
    const kh = LAND.flat ? 0 : landKH(z), y = kh ? (landH(d, x) - landH(D, 0)) * kh : 0;
    return { dx, y };
  }
  // the same as a nudge on the screen (for things drawn in one piece at their foot: the wanderers, the gravedigger)
  function landShift(x, z) {
    const L = landAt(x, z); if (!L.dx && !L.y) return null;
    const a = project(x, 0, z), b = project(x + L.dx, L.y, z); return { x: b.x - a.x, y: b.y - a.y };
  }
  // ── the slices, worked out once a frame: each one's skyline across the screen, and how far down it has to paint
  const landRgb = s => { const c = rgbaOf(s); return [c[0], c[1], c[2]]; };
  function landSlices() {
    const D = landD(), out = [], N = 26, base = LAND.flat ? 0 : landH(D, 0);
    for (const z of LAND_Z) {
      const s0 = projectBase(0, 0, z).s, half = (W / 2 + U * 0.3) / s0, cxz = (landCx(D + z) - landCx(D)) * landKC(z), kh = LAND.flat ? 0 : landKH(z);
      const pts = [], ys = []; let lo = 0, hi = 0;
      for (let i = 0; i <= N; i++) {
        const x = -half + (2 * half * i) / N, u = x - cxz, y = kh ? (landH(D + z, u) - base) * kh : 0;
        const p = project(x, y, z); pts.push(p); ys.push(y); lo = Math.min(lo, y); hi = Math.max(hi, y);
      }
      const path = [-PATH_HALF, PATH_HALF].map(u => { const y = kh ? (landH(D + z, u) - base) * kh : 0; return project(cxz + u, y, z); });
      out.push({ z, pts, ys, lo, hi, path, flatY: project(0, 0, z).y });
    }
    // how far down each slice must paint: to the highest point any nearer slice reaches at that x (below that, the
    // nearer slice's own curtain takes over), so nothing is painted twice more than it has to be
    let run = out[out.length - 1].pts.map(p => p.y);
    for (let i = out.length - 1; i >= 0; i--) { const S = out[i]; S.bottom = S.pts.map((p, j) => Math.max(p.y, run[j])); run = run.map((v, j) => Math.min(v, S.pts[j].y)); }
    let dipBeyond = false;   // a flat slice still has to paint if something beyond it dips (it hides the dip's near edge)
    for (const S of out) { S.skip = LAND.flat || (S.hi < 0.03 && S.lo > -0.03 && !dipBeyond); if (S.lo < -0.03) dipBeyond = true; }
    return (LAND.slices = out);
  }
  // ── drawing a slice: the ground's curtain, lit a little on the rise, its skyline rimmed; then the road over it
  function drawLandSlice(S, next, prev) {
    const L = look();
    if (!S.skip && S.pts.length) {
      const B = bleed(), n = S.pts.length;
      if (!LAND.grad || LAND.gradKey !== `${HY}|${H}|${sceneMap}`) {   // the ground plate's own gradient (05_layers.js), so flat land is exactly the painted ground
        LAND.gradKey = `${HY}|${H}|${sceneMap}`; const g = ctx.createLinearGradient(0, HY, 0, H + B);
        g.addColorStop(0, L.ground[0]); g.addColorStop(0.3, L.ground[1]); g.addColorStop(0.7, L.ground[2]); g.addColorStop(1, L.ground[3]); LAND.grad = g;
      }
      const poly = () => { ctx.beginPath(); S.pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); for (let i = n - 1; i >= 0; i--) ctx.lineTo(S.pts[i].x, S.bottom[i] + 0.8); ctx.closePath(); };
      poly(); ctx.fillStyle = LAND.grad; ctx.fill();
      if (S.hi > 0.15 && QUALITY.level >= 0.75) {   // where the land rises, the map's hill colour comes up through it, across the slice as the hills go
        const hill = landRgb(L.hills[0] || L.ground[0]), x0 = S.pts[0].x, x1 = S.pts[n - 1].x, g = ctx.createLinearGradient(x0, 0, x1, 0);
        S.ys.forEach((y, i) => g.addColorStop(clamp((S.pts[i].x - x0) / Math.max(1, x1 - x0), 0, 1), `rgba(${hill[0]},${hill[1]},${hill[2]},${(clamp(y / 3, 0, 1) * 0.5).toFixed(3)})`));
        poly(); ctx.fillStyle = g; ctx.fill();
      }
      if (prev && S.hi > 0.3 && QUALITY.level >= 0.75) {   // the skyline, only where this slice is a crest with land dropping away behind it: a rim of hill light and a faint ink line
        ctx.save(); ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.lineWidth = 1.3;
        const crest = i => S.ys[i] > 0.3 && prev.pts[i] && prev.pts[i].y > S.pts[i].y + 1.5;
        for (const [style, dy] of [[L.hillRim || "rgba(255,220,160,.12)", 0], ["rgba(23,19,15,.28)", 1]]) {
          ctx.strokeStyle = style; ctx.beginPath(); let on = false;
          for (let i = 0; i < n; i++) { if (crest(i)) { const p = S.pts[i]; if (on) ctx.lineTo(p.x, p.y + dy); else { ctx.moveTo(p.x, p.y + dy); on = true; } } else on = false; }
          ctx.stroke();
        }
        ctx.restore();
      }
    }
    if (next) drawLandPath(S, next);
  }
  // the road: a strip from this slice to the next nearer one, in the lane's own material, fading in beyond the ring
  function drawLandPath(S, N) {
    const kind = look().lane, a = clamp((N.z - LAND_NEAR) / 4, 0, 1) * clamp((150 - S.z) / 60, 0, 1);
    if (a <= 0.02 || kind === "none") return;
    const [l0, r0] = S.path, [l1, r1] = N.path;
    ctx.save(); ctx.globalAlpha *= a; ctx.beginPath(); ctx.moveTo(l0.x, l0.y); ctx.lineTo(r0.x, r0.y); ctx.lineTo(r1.x, r1.y); ctx.lineTo(l1.x, l1.y); ctx.closePath();
    const fill = { dirt: "rgba(120,92,62,.34)", flagstone: "rgba(150,146,150,.3)", boardwalk: "#5A3E26", sand: "rgba(236,196,140,.3)", rails: "rgba(40,30,24,.5)", void: "rgba(160,120,255,.16)" }[kind] || "rgba(120,92,62,.3)";
    ctx.fillStyle = fill; ctx.fill();
    ctx.lineWidth = 1; ctx.lineCap = "round";
    if (kind === "boardwalk") {   // planks across, and the edge boards
      ctx.strokeStyle = "rgba(23,19,15,.55)"; ctx.stroke();
      ctx.beginPath(); for (const k of [0.33, 0.66]) { ctx.moveTo(l0.x + (l1.x - l0.x) * k, l0.y + (l1.y - l0.y) * k); ctx.lineTo(r0.x + (r1.x - r0.x) * k, r0.y + (r1.y - r0.y) * k); } ctx.stroke();
    } else if (kind === "rails") {   // two rails on their ties
      ctx.strokeStyle = "rgba(200,190,170,.5)"; ctx.beginPath();
      for (const k of [0.3, 0.7]) { ctx.moveTo(l0.x + (r0.x - l0.x) * k, l0.y + (r0.y - l0.y) * k); ctx.lineTo(l1.x + (r1.x - l1.x) * k, l1.y + (r1.y - l1.y) * k); } ctx.stroke();
    } else if (kind === "flagstone") { ctx.strokeStyle = "rgba(23,19,15,.25)"; ctx.beginPath(); ctx.moveTo((l0.x + r0.x) / 2, (l0.y + r0.y) / 2); ctx.lineTo((l1.x + r1.x) / 2, (l1.y + r1.y) / 2); ctx.stroke(); }
    else if (kind === "void") { ctx.strokeStyle = "rgba(180,140,255,.3)"; ctx.beginPath(); ctx.moveTo((l0.x + r0.x) / 2, (l0.y + r0.y) / 2); ctx.lineTo((l1.x + r1.x) / 2, (l1.y + r1.y) / 2); ctx.stroke(); }
    ctx.restore();
  }
  // drawn in among the scenery (06b_world_draw.js): every slice further than z, each followed by the ground dressing
  // that lies on it
  const LANDQ = { i: 0 };
  function landBegin() { LANDQ.i = 0; if (LAND.on) landSlices(); }   // (once a frame, before the scenery: the camera and the track have moved)
  function landUpTo(z) {
    if (!LAND.on || !LAND.slices) return;
    const S = LAND.slices;
    while (LANDQ.i < S.length && S[LANDQ.i].z > z) {
      const cur = S[LANDQ.i], next = S[LANDQ.i + 1] || null;
      drawLandSlice(cur, next, S[LANDQ.i - 1] || null);
      drawTravelDecals(next ? next.z : 0, cur.z);
      LANDQ.i++;
    }
  }
