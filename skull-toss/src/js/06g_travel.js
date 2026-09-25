  // ───────────────────────── perceptual travel (v47, the Crow Hollow pilot) ─────────────────────────
  // Morty doesn't walk anywhere: he's thrown. So instead of swapping backgrounds, the scenery comes to him. A map that
  // travels (src/maps/*.json: travel) is a long track of scenery laid out ahead of the lane, and every make before a
  // boss carries the camera a step further along it: the trees, the farmhouse, the corn and the fences approach,
  // grow, pass the edges of the frame and are gone, while new ones come up out of the distance. Aim → throw → hit →
  // the world advances → the next throw. Nothing moves while you aim, and the last few steps before each boss are
  // shorter, so the world slows and settles as Morty arrives. Through a boss fight the world stands still.
  //   The track is data: zones (the Hollow, the Haunted Farm, the Harvest Grove, crow territory, the Pumpkin Field)
  //   each with a mix of scenery, a density, a colour and a fog; landmarks placed by hand; and clearings where the
  //   boss arenas open up. The scenery is SVG (src/art/travel, imported by the build like the skull), drawn from
  //   sprites at the size it's seen (and as crisp vectors when it's close), mirrored, scaled and hazed for variety.
  //   How far on the camera stands is worked out from the hits alone, so a continue, a reload or a replay puts the
  //   world exactly where the run was. It's looks only: none of it ever touches a throw (the build refuses travel
  //   scenery with a collision, and none of it stands in the throw corridor).
  const TRAVEL_ASSETS = Object.fromEntries(Object.keys(ASSETS).filter(k => k.startsWith("travel/")).map(k => [k.slice(7), ASSETS[k]]));
  // the props the game already paints (06d_props.js) can go on the track too: their size in metres and their foot
  const TRAVEL_CANVAS = { pumpkin: [1.0, 0.8, 0.5, 0.75], jack: [1.1, 0.9, 0.55, 0.85], tuft: [0.8, 0.45, 0.4, 0.4], hay: [1.4, 0.8, 0.7, 0.75], corn: [1.2, 2.2, 0.6, 2.1],
    scarecrow: [1.8, 2.6, 0.9, 2.5], rail: [3.6, 1.2, 1.8, 1.1], tree: [2.4, 3.1, 1.2, 2.95],
    stone: [1.0, 1.9, 0.5, 1.8], cross: [1.0, 1.9, 0.5, 1.8], slab: [1.0, 1.9, 0.5, 1.8], obelisk: [1.0, 1.9, 0.5, 1.8], crypt: [3.2, 2.7, 1.6, 2.6], lantern: [0.8, 1.7, 0.2, 1.65], fence: [3.6, 1.35, 1.8, 1.25] };
  const STONE_KINDS = ["stone", "cross", "slab", "obelisk"];
  const TRAVEL = { on: false, def: null, table: null, D: 0, goal: 0, v: 0, zones: [], near: [], sprites: {}, lastGoal: 0 };
  const TRAVEL_EASE = 4.2, TRAVEL_NEAR = -CAM_BACK + 0.6, TRAVEL_HAZE_Z = 45, TRAVEL_VECTOR = 0.85;   // (vectors once a canvas unit is this many pixels)
  // what an asset is: its canvas (units: 100 a metre), foot, layer and family, whichever kind of painter it has
  function travelKind(kind) {
    const A = TRAVEL_ASSETS[kind]; if (A) return A.meta;
    const C = TRAVEL_CANVAS[kind] || (PROP_PAINT[kind] && PROP_SPRITES[kind]); if (!C) return null;
    const tall = C[1] > 2.6 || C[0] > 2.8;
    return { canvas: [C[0] * 100, C[1] * 100], foot: [C[2] * 100, C[3] * 100], layer: tall ? "midground" : "gameplay", family: kind, canvasKind: true,
      sway: ["tree", "bonetree", "cypress"].includes(kind) ? 0.05 : ["tuft", "corn", "reeds"].includes(kind) ? 0.12 : ["scarecrow", "balloons"].includes(kind) ? 0.07 : 0 };
  }
  // how far on the camera stands at each hit: a step a make through each leg that travels (acts I–III, then the
  // approach), the last few steps shorter as a boss comes up; nothing through the boss fights
  function travelTable(Tv) {
    const D = [0], arr = Tv.arrive; let d = 0;
    for (let h = 1; h <= STAGE_END; h++) {
      const leg = h <= STAGE_MINI ? STAGE_MINI : h > STAGE_LOOSE && h <= STAGE_BOSS ? STAGE_BOSS : 0;
      if (leg) { const left = leg - h; d += Tv.step * (left < arr.length ? arr[arr.length - 1 - left] : 1); }
      D.push(d);
    }
    return D;
  }
  const travelAt = h => (TRAVEL.table ? TRAVEL.table[clamp(h | 0, 0, STAGE_END)] : 0);
  // ── the track: the zones' scenery either side of the lane, the landmarks, and the clearings round the arenas
  function layOutTravel(Tv, P) {
    const rnd = mulberry32(4711 + sceneMap * 31), table = TRAVEL.table, half = BLUEPRINT.corridor.halfWidth;
    TRAVEL.zones = Tv.zones.map(Z => ({ ...Z, at: table[Z.from[0]] + Z.from[1], rgba: rgbaOf(Z.tone) }));
    const zoneAt = d => { let Z = TRAVEL.zones[0]; for (const z of TRAVEL.zones) if (d >= z.at) Z = z; return Z; };
    const clears = (Tv.clear || []).map(c => ({ from: table[c.hit] - c.back, to: table[c.hit] + c.ahead, x: c.x }));
    const cleared = (d, x0, x1) => clears.some(c => d >= c.from && d <= c.to && Math.min(Math.abs(x0), Math.abs(x1)) < c.x);
    const pick = mix => { const e = Object.entries(mix), tot = e.reduce((a, [, w]) => a + w, 0); let r = rnd() * tot; for (const [k, w] of e) { r -= w; if (r <= 0) return k; } return e[0][0]; };
    const add = (kind, d, x, extra = {}) => {
      const K = travelKind(kind); if (!K) return;
      const mul = extra.mul || 1, flip = extra.flip || (rnd() < 0.5 ? -1 : 1), fx = K.foot[0] / 100 * mul, fw = K.canvas[0] / 100 * mul;
      const x0 = flip > 0 ? x - fx : x - (fw - fx), x1 = x0 + fw;   // (the span it covers, mirrored or not)
      if (!extra.landmark && ((x1 > -half && x0 < half) || cleared(d, x0, x1))) return;   // never in the throw corridor; the arenas stay open
      P.push({ kind, d, x, z: d, mul, flip, ph: rnd(), seed: (rnd() * 4) | 0, face: false, size: 1, fam: K.family, tall: (K.canvas[1] / 100) * mul, travel: true, wakes: extra.wakes || null });
    };
    const end = table[STAGE_END] + Tv.far + 10;
    const start = -CROSS.lead;   // (the track begins before the map does: the Challenge Stage's road runs into it, 07q_crossing.js)
    for (let d = start; d < end; d += Tv.gap) for (const side of [-1, 1]) {   // the lane-side rows: small things near, bigger further out
      const Z = zoneAt(d); if (rnd() > Z.density) continue;
      const kind = pick(Z.mix), K = travelKind(kind); if (!K) continue;
      const big = K.canvas[1] > 250 || K.canvas[0] > 300, mul = 0.8 + rnd() * 0.45, reach = K.layer === "midground" || big ? 1.2 + rnd() * 7 : 0.25 + rnd() * 3.2;
      add(kind, d + rnd() * Tv.gap * 0.8, side * (half + reach + (K.canvas[0] / 200) * mul), { mul });
    }
    for (let d = start + 4; d < end; d += 7 + rnd() * 5) for (const side of [-1, 1]) {   // tree lines (or whatever the zone's backdrop is) further out, so the land has depth
      const Z = zoneAt(d), back = Z.backdrop || Tv.backdrop || []; if (!back.length || rnd() > 0.35 + Z.density * 0.4) continue;
      add(back[(rnd() * back.length) | 0], d, side * (13 + rnd() * 16), { mul: 1 + rnd() * 0.6 });
    }
    for (const L of Tv.landmarks || []) {
      const d = table[L.hit] + (L.ahead || 0);
      if (L.asset === "digger") { P.push({ kind: "digger", d, x: L.x, z: d, travel: true, ph: 0, seed: 0, face: false }); continue; }
      add(L.asset, d, L.x, { landmark: true, mul: L.mul || 1, flip: L.flip || 1, wakes: L.wakes || null });
    }
    // the near edge of the frame: a bush or a clump of corn at each side now and then, sweeping past as Morty goes
    TRAVEL.near = [];
    for (let d = start + 5, i = 0; d < end; d += 4.2 + rnd() * 2.6, i++) {
      const Z = zoneAt(d), kind = Z.near || Tv.near, K = kind && travelKind(kind);
      if (K && !cleared(d, half + 0.1, half + 0.2)) TRAVEL.near.push({ kind, d, side: i % 2 ? 1 : -1, mul: 0.55 + rnd() * 0.25, ph: rnd(), flip: rnd() < 0.5 ? -1 : 1, inset: 0.02 + rnd() * 0.05 });
    }
    P.sort((a, b) => b.d - a.d);
  }
  // dress the map for travel (called as its props are laid out); maps that don't travel lay out as they always have
  function travelSetup(P) {
    const Tv = mapData(sceneMap + 1).travel || null;
    TRAVEL.on = !!Tv; TRAVEL.def = Tv; TRAVEL.table = Tv ? travelTable(Tv) : null; TRAVEL.D = TRAVEL.goal = TRAVEL.lastGoal = 0; TRAVEL.sprites = {}; TRAVEL.near = []; TRAVEL.zones = [];
    if (!Tv) return false;
    layOutTravel(Tv, P); return true;
  }
  // where the run has got to: the Adventure travels, on the map it's playing; anything else stands at the start
  function travelGoal() {
    if (TRAVEL.on && game.phase === "crossing" && game.mode === "story" && sceneMap === (game.stage || 1)) return crossingAt();   // the road into the next map (07q_crossing.js)
    if (!TRAVEL.on || game.state === "title" || game.mode !== "story" || sceneMap !== (game.stage || 1) - 1) return 0;
    return travelAt(game.stageHits || 0);
  }
  function updateTravel(dt) {
    if (!TRAVEL.on) return;
    const goal = travelGoal(), was = TRAVEL.D, step = TRAVEL.def.step;
    if (goal > TRAVEL.lastGoal + 0.01 && goal - TRAVEL.lastGoal <= Math.max(step, CROSS.step) * 1.01) travelStepped(goal);
    TRAVEL.lastGoal = goal; TRAVEL.goal = goal;
    if (Math.abs(goal - TRAVEL.D) > Math.max(step, CROSS.step) * 2.5 || reduceMotion) TRAVEL.D = goal;   // a jump (a new run, a reload, a reduced-motion player): straight there
    else { TRAVEL.D += (goal - TRAVEL.D) * (1 - Math.exp(-dt * TRAVEL_EASE)); if (Math.abs(goal - TRAVEL.D) < 0.003) TRAVEL.D = goal; }
    const dD = TRAVEL.D - was; TRAVEL.v = dt > 0 ? dD / dt : 0;
    if (dD) {
      travelApply();
      for (let i = world.walkers.length - 1; i >= 0; i--) { const k = world.walkers[i]; k.z -= dD; if (k.z < 1.5) world.walkers.splice(i, 1); }   // (the wanderers are left behind too)
    }
  }
  // a step has just begun: in the harvest and the crows' country, the crows come up out of the trees
  function travelStepped(goal) {
    const Z = travelZone(goal + 10); if (!Z || !Z.flock) return;
    if (Math.random() < Z.flock) spawnFlock(look().ambient.crows ? "crow" : "bat");   // (the crows, or the bats, come up as Morty passes)
  }
  function travelApply() {
    const D = TRAVEL.D;
    for (const k of GY.props) if (k.travel) k.z = k.d - D;
    const dg = GY.props.find(k => k.kind === "digger" && k.travel); if (dg) { DIG.x = dg.x; DIG.z = dg.z; }
  }
  const travelZone = d => { let Z = TRAVEL.zones[0] || null; for (const z of TRAVEL.zones) if (d >= z.at) Z = z; return Z; };
  const travelShows = k => !k.travel || (k.z > TRAVEL_NEAR && k.z < TRAVEL.def.far);
  const travelFade = z => clamp((TRAVEL.def.far - z) / (TRAVEL.def.far * 0.22), 0, 1);
  // the Pumpkin King's lair on the horizon is the King: when he wakes (the end boss) it goes, and it doesn't come back
  function wakeAlpha(k) {
    if (!k.wakes) return 1;
    if (game.phase === "boss" && boss) return 1 - smooth(clamp(boss.t / 1.6, 0, 1));
    return game.phase === "A" || game.phase === "B" || game.phase === "mini" || game.state === "title" ? 1 : 0;
  }
  // ── sprites: painted once per size band (80, 40, 20, 10 and 5 pixels a metre), so nothing is ever shrunk more than
  // half; nearer than the top band a thing is drawn as vectors, crisp however close it comes
  const TRAVEL_LODS = [0.8, 0.4, 0.2, 0.1, 0.05];
  function paintTravel(g, kind, K) {   // in canvas units, the foot at the foot
    if (!K.canvasKind) { drawLayer(g, "travel/" + kind, "body"); return; }
    g.save(); g.translate(K.foot[0], K.foot[1]); g.scale(100, 100); g.lineJoin = "round"; g.lineCap = "round"; g.strokeStyle = INK; g.lineWidth = 0.03;
    const k = { kind, size: 1, seed: 7, ph: 0, col: 0, pal: (TRAVEL.def && TRAVEL.def.pal) || "grave", h: 0.9, side: 1, n: 5 };
    if (kind === "tree") paintTree(g, k); else if (kind === "tuft") paintTuft(g, k); else if (STONE_KINDS.includes(kind)) paintStone(g, k);
    else if (kind === "crypt") paintCrypt(g); else if (kind === "lantern") paintLantern(g); else if (kind === "fence") paintFence(g); else if (PROP_PAINT[kind]) PROP_PAINT[kind](g, k);
    g.restore();
  }
  function travelSprite(kind, r, sil = false) {
    const key = `${kind}@${r}${sil ? "s" : ""}`; if (TRAVEL.sprites[key]) return TRAVEL.sprites[key];
    const K = travelKind(kind), q = Math.min(DPR, 1.5), c = document.createElement("canvas");
    c.width = Math.max(2, Math.ceil(K.canvas[0] * r * q)); c.height = Math.max(2, Math.ceil(K.canvas[1] * r * q));
    const g = c.getContext("2d"); g.setTransform(r * q, 0, 0, r * q, 0, 0);
    paintTravel(g, kind, K);
    if (sil) { g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "source-atop"; g.fillStyle = "rgba(10,7,6,.82)"; g.fillRect(0, 0, c.width, c.height); }   // (the near edge: dark, like the frame's branches)
    return (TRAVEL.sprites[key] = { c, K });
  }
  function travelLights(K, t, ph) {   // lit windows and the like: a warm flicker (additive, drawn over the sprite)
    if (!K.lights) return;
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    for (const [x, y, rr] of K.lights) { const fl = 0.75 + 0.25 * Math.sin(t * 5 + ph * 9 + x) * Math.sin(t * 1.7 + y), g = ctx.createRadialGradient(x - K.foot[0], y - K.foot[1], 0, x - K.foot[0], y - K.foot[1], rr);
      g.addColorStop(0, `rgba(255,200,110,${0.32 * fl})`); g.addColorStop(1, "rgba(255,200,110,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x - K.foot[0], y - K.foot[1], rr, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  // one piece of scenery on the track, in the world, at the camera's distance from it
  function drawTravelProp(k) {
    if (k.kind === "digger") { if (k.z > TRAVEL_NEAR + 2) drawDigger(); return; }
    const K = travelKind(k.kind), p = project(k.x, 0, k.z), sc = (p.s * k.mul) / 100;
    if (K.canvas[1] * sc < 2.5) return;
    const hw = K.canvas[0] * sc; if (p.x + hw < -U * 0.2 || p.x - hw > W + U * 0.2) return;
    const a = travelFade(k.z) * wakeAlpha(k); if (a <= 0.01) return;
    const t = world.t, sway = K.sway ? Math.sin(twos(t) * (K.family === "corn" ? 2 : 1.1) + k.ph * 6) * K.sway : 0, bb = K.family === "pumpkin" || K.family === "scarecrow" || K.family === "jack" ? beatBounce(t, k.ph) : 0;
    ctx.save(); ctx.globalAlpha *= a; ctx.translate(p.x, p.y);
    if (sway) ctx.transform(1, 0, sway, 1, 0, 0);
    reactXform(k);   // hit by a throw: it bends, squeaks or shakes like the rest of the map's props (07n_environment.js)
    ctx.scale(sc * k.flip * (1 - bb * 0.04), sc * (1 + bb * 0.06));
    const life = PROP_LIFE[k.kind];   // (a glowing kind's light, under it; and on the GPU)
    if (life) { life({ ...k, size: 1 }, 100, t); const L = PROP_LIGHT[k.kind]; if (L) gpuLight(p.x + L[0] * 100 * sc * k.flip, p.y - L[1] * 100 * sc, L[2] * 100 * sc, L[3], 0.3); }
    if (sc > TRAVEL_VECTOR) { ctx.translate(-K.foot[0], -K.foot[1]); paintTravel(ctx, k.kind, K); ctx.translate(K.foot[0], K.foot[1]); }
    else { const r = TRAVEL_LODS.reduce((best, v) => (v >= sc ? v : best), TRAVEL_LODS[0]), S = travelSprite(k.kind, r); ctx.drawImage(S.c, -K.foot[0], -K.foot[1], K.canvas[0], K.canvas[1]); }
    travelLights(K, t, k.ph);
    ctx.restore();
    if (K.lights) for (const [lx, ly, lr] of K.lights) gpuLight(p.x + (lx - K.foot[0]) * sc * k.flip, p.y + (ly - K.foot[1]) * sc, lr * sc * 2.2, "255,196,110", 0.26 * a * wakeAlpha(k));   // lit windows, on the GPU
  }
  // the far haze: drawn once the scenery behind TRAVEL_HAZE_Z is down, so distance softens it (thicker as the fog rises)
  function drawTravelHaze() {
    const Z = travelZone(TRAVEL.D + 12), fog = Z ? Z.fog : 0, hz = rgbaOf(look().haze), y0 = HY - U * 0.28, y1 = HY + U * 0.08;
    ctx.save(); ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, `rgba(${hz[0]},${hz[1]},${hz[2]},0)`); g.addColorStop(0.7, `rgba(${hz[0]},${hz[1]},${hz[2]},${clamp(0.18 + fog * 1.2, 0, 0.6)})`); g.addColorStop(1, `rgba(${hz[0]},${hz[1]},${hz[2]},0)`);
    ctx.fillStyle = g; ctx.fillRect(0, y0, W, y1 - y0); ctx.restore();
  }
  // the zone's colour over the land (under the ring and the skull): the Hollow clear, the farm warm, the grove and the
  // crows' country darker, the Pumpkin Field burnt orange; blended over ten metres as one gives way to the next
  function drawTravelTone() {
    if (!TRAVEL.on || !TRAVEL.zones.length || game.state === "title") return;
    const d = TRAVEL.D + 12, Zs = TRAVEL.zones; let i = 0; for (let j = 0; j < Zs.length; j++) if (d >= Zs[j].at) i = j;
    const A = Zs[i].rgba, B = Zs[Math.max(0, i - 1)].rgba, k = i > 0 ? clamp((d - Zs[i].at) / 10, 0, 1) : 1;
    const c = [0, 1, 2, 3].map(j => B[j] + (A[j] - B[j]) * k); if (c[3] < 0.005) return;
    ctx.save(); ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.fillStyle = `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${c[3].toFixed(3)})`; ctx.fillRect(-20, -20, W + 40, H + 40); ctx.restore();
  }
  // the near edge of the frame (instead of the map's still near props): dark silhouettes, anchored to the screen's
  // edges however wide it is, that sweep outward and away as Morty goes on
  function drawTravelNear() {
    const D = TRAVEL.D, z0 = 7;
    for (const n of TRAVEL.near) {
      const z = n.d - D; if (z > z0 + 1.5 || z < TRAVEL_NEAR) continue;
      const K = travelKind(n.kind), s0 = F / (z0 + CAM_BACK), w0 = (K.canvas[0] / 100) * n.mul * s0, x = (n.side * (W / 2 - n.inset * W + w0 * 0.35)) / s0;
      const p = project(x, 0, z), sc = (p.s * n.mul) / 100, a = clamp((z0 + 1.5 - z) / 1.5, 0, 1);
      if (p.x + K.canvas[0] * sc < -40 || p.x - K.canvas[0] * sc > W + 40) continue;
      const sw = Math.sin(twos(world.t) * 1.6 + n.ph * 6) * 0.05;
      ctx.save(); ctx.globalAlpha *= a; ctx.translate(p.x, p.y); ctx.transform(1, 0, sw, 1, 0, 0); ctx.scale(sc * n.flip, sc);
      const S = travelSprite(n.kind, TRAVEL_LODS.reduce((best, v) => (v >= sc ? v : best), TRAVEL_LODS[0]), true);
      ctx.drawImage(S.c, -K.foot[0], -K.foot[1], K.canvas[0], K.canvas[1]); ctx.restore();
    }
  }
  function travelResize() { TRAVEL.sprites = {}; }
  const rgbaOf = s => { const m = String(s).match(/rgba?\(([^)]+)\)/); if (m) { const v = m[1].split(",").map(Number); return [v[0], v[1], v[2], v.length > 3 ? v[3] : 1]; } const h = String(s).replace("#", ""); return h.length === 6 ? [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 1] : [0, 0, 0, 0]; };
