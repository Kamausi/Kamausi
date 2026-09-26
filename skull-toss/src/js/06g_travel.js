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
  // v58: what grows in water sways in the flow (06i_flow.js), each piece on its own, not to the music
  const FLOW_SWAY = { seaweed: 0.14, kelp: 0.12, "coral-fan": 0.04, anemone: 0.1, "lily-pads": 0.03, cattails: 0.08 };
  const flowSway = (k, t) => { const F = curl(k.x * 0.35 + k.d * 0.15, k.ph * 11, t * 0.3, 2.2, 2); return clamp(F.x * 0.9 + (aquaBiome() ? aquaDrift()[0] * 1.5 : 0), -1.4, 1.4); };
  const TRAVEL = { on: false, def: null, table: null, D: 0, goal: 0, v: 0, zones: [], near: [], sprites: {}, lastGoal: 0 };
  const TRAVEL_EASE = 4.2, TRAVEL_NEAR = -CAM_BACK + 0.6, TRAVEL_HAZE_Z = 45, TRAVEL_VECTOR = 0.85;   // (vectors once a canvas unit is this many pixels)
  // what an asset is: its canvas (units: 100 a metre), foot, layer and family, whichever kind of painter it has
  function travelKind(kind) {
    const A = TRAVEL_ASSETS[kind]; if (A) return A.meta;
    const C = TRAVEL_CANVAS[kind] || (PROP_PAINT[kind] && PROP_SPRITES[kind]); if (!C) return null;
    const tall = C[1] > 2.6 || C[0] > 2.8;
    return { canvas: [C[0] * 100, C[1] * 100], foot: [C[2] * 100, C[3] * 100], layer: tall ? "midground" : "gameplay", family: kind, canvasKind: true,
      sway: ["tree", "bonetree", "cypress"].includes(kind) ? 0.05 : ["tuft", "corn", "reeds"].includes(kind) ? 0.12 : ["scarecrow", "balloons"].includes(kind) ? 0.07 : FLOW_SWAY[kind] || 0 };
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
      if (!extra.landmark && TRAVEL.lairBlock && TRAVEL.lairBlock(d, x0, x1)) return;   // (v54: nothing in front of the boss's lair)
      P.push({ kind, d, x, z: d, mul, flip, ph: rnd(), seed: (rnd() * 4) | 0, face: false, size: 1, fam: K.family, tall: (K.canvas[1] / 100) * mul, travel: true, wakes: extra.wakes || null, lite: !!extra.lite, tilt: extra.tilt || 0, sink: extra.sink || 0 });
    };
    const end = table[STAGE_END] + Tv.far + 10;
    TRAVEL.lairBlock = (d, x0, x1) => (Tv.landmarks || []).some(L => { if (!L.wakes) return false; const K = travelKind(L.asset), ld = table[L.hit] + (L.ahead || 0), hw = K ? (K.canvas[0] / 200) * (L.mul || 1) * 1.15 + 1.5 : 0; return d > ld - 32 && d < ld + 8 && x1 > -hw && x0 < hw; });
    const start = -CROSS.lead;   // (the track begins before the map does: the Challenge Stage's road runs into it, 07q_crossing.js)
    for (let d = start; d < end; d += Tv.gap) for (const side of [-1, 1]) {   // the lane-side rows: small things near, bigger further out
      const Z = zoneAt(d); if (rnd() > Z.density) continue;
      const kind = pick(Z.mix), K = travelKind(kind); if (!K) continue;
      const big = K.canvas[1] > 250 || K.canvas[0] > 300, mul = 0.8 + rnd() * 0.45, reach = K.layer === "midground" || big ? 1.2 + rnd() * 7 : 0.25 + rnd() * 3.2;
      add(kind, d + rnd() * Tv.gap * 0.8, side * (half + reach + (K.canvas[0] / 200) * mul), { mul });
    }
    // v58: a zone can seat an audience: rows of one asset either side of the aisle, a row every so many metres, each
    // row a few seats deep going out from the lane and staggered back a little, the odd seat gone, turned over or half
    // buried in the sand (travel zone rows: asset, every, deep, from, stagger, gone, over, buried). Its own dice.
    for (const Z of TRAVEL.zones) {
      const R = Z.rows; if (!R) continue;
      const K = travelKind(R.asset); if (!K) continue;
      const r2 = mulberry32(777 + sceneMap * 5 + ((Z.at * 10) | 0)), zi = TRAVEL.zones.indexOf(Z), zEnd = zi + 1 < TRAVEL.zones.length ? TRAVEL.zones[zi + 1].at : end, wSeat = K.canvas[0] / 100;
      for (let d = Math.max(start, Z.at) + 1, row = 0; d < zEnd - 1; d += R.every, row++) for (const side of [-1, 1]) for (let i = 0; i < R.deep; i++) {
        const u = r2(); if (u < R.gone) continue;
        const x = side * (half + R.from + i * wSeat * 1.04 + wSeat / 2), dd = d + (i + (row % 2) * 0.5) * R.stagger;
        const over = r2() < R.over, buried = !over && r2() < R.buried;
        add(R.asset, dd, x, { mul: 1, flip: side < 0 ? 1 : -1, row: true, tilt: over ? (r2() < 0.5 ? -1 : 1) * (0.5 + r2() * 0.9) : (r2() - 0.5) * 0.08, sink: buried ? 0.3 + r2() * 0.35 : r2() * 0.08 });
      }
    }
    for (let d = start + 4; d < end; d += 7 + rnd() * 5) for (const side of [-1, 1]) {   // tree lines (or whatever the zone's backdrop is) further out, so the land has depth
      const Z = zoneAt(d), back = Z.backdrop || Tv.backdrop || []; if (!back.length || rnd() > 0.35 + Z.density * 0.4) continue;
      add(back[(rnd() * back.length) | 0], d, side * (13 + rnd() * 16), { mul: 1 + rnd() * 0.6 });
    }
    // v54: the land is a field, not a strip. Beyond the lane-side rows and the tree lines the zone's scenery also comes in
    // clusters (a knot of gravestones round a tree, a pumpkin patch, a dead copse, a woodpile): a few pieces of the zone's
    // own mix arranged round a centre, turned, scaled and nudged, set anywhere from just off the lane to well out in the
    // field. How many come, and where, follows a slow swell along the track, so there are open stretches between them:
    // empty ground on purpose, not where the generator ran dry. Further out still, big masses (the zone's backdrop, larger)
    // fill the far land, and nothing is placed where it would stand in front of the boss's lair.
    const sizeOf = kind => { const K = travelKind(kind); return K ? K.canvas[1] / 100 : 0; };
    const byRole = mix => { const R = { big: [], med: [], small: [] }; for (const [k, w] of Object.entries(mix)) { const h = sizeOf(k), r = h > 2.6 ? "big" : h > 1.15 ? "med" : "small"; for (let i = 0; i < w; i++) R[r].push(k); } return R; };
    const CLUSTERS = [   // [role, across, along] in metres round the centre
      [["big", 0, 0], ["med", -1.4, 0.9], ["small", 1.2, -0.7], ["small", 0.5, 1.6], ["small", -0.8, -1.4]],   // a copse, a stone, some undergrowth
      [["med", 0, 0], ["med", 1.3, 0.6], ["med", -1.2, 0.4], ["small", 0.2, -1.2], ["small", -0.4, 1.5]],      // a knot of stones (or bales, or posts)
      [["small", 0, 0], ["small", 0.9, 0.5], ["small", -0.8, 0.7], ["small", 0.3, -0.9], ["small", -0.5, -0.4], ["med", 1.6, -0.2]],   // a patch
      [["big", 0, 0], ["big", 2.4, 1.2], ["med", 1.1, -1.1], ["small", -1.2, 0.3]]                                  // a stand of trees
    ];
    const lairs = (Tv.landmarks || []).filter(L => L.wakes).map(L => { const K = travelKind(L.asset); return K ? { d: table[L.hit] + (L.ahead || 0), half: (K.canvas[0] / 200) * (L.mul || 1) * 1.15 + 1.5 } : null; }).filter(Boolean);
    const inFrontOfLair = (d, x) => lairs.some(L => d > L.d - 32 && d < L.d + 8 && Math.abs(x) < L.half);
    const swell = (() => { const a = rnd() * TAU, b = rnd() * TAU; return d => 0.55 + 0.45 * Math.sin(d * 0.031 + a) * Math.sin(d * 0.0137 + b); })();
    for (let d = start + 6; d < end; d += 11 + rnd() * 9) for (const side of [-1, 1]) {
      if (rnd() > swell(d) * 0.95) continue;
      const Z = zoneAt(d), R = byRole(Z.mix), T = CLUSTERS[(rnd() * CLUSTERS.length) | 0], cx = side * (half + 3.5 + rnd() * 12), cd = d + rnd() * 6, sc = 0.8 + rnd() * 0.6, flip = rnd() < 0.5 ? -1 : 1, rot = (rnd() - 0.5) * 0.9;
      for (const [role, ax, al] of T) {
        const pool = R[role].length ? R[role] : R.med.length ? R.med : R.small; if (!pool.length) continue;
        const kind = pool[(rnd() * pool.length) | 0], rx = (ax * Math.cos(rot) - al * Math.sin(rot)) * sc * flip + (rnd() - 0.5) * 0.4, rd = (ax * Math.sin(rot) + al * Math.cos(rot)) * sc + (rnd() - 0.5) * 0.4;
        if (inFrontOfLair(cd + rd, cx + rx)) continue;
        add(kind, cd + rd, cx + rx, { mul: (role === "big" ? 0.95 : 0.8) + rnd() * 0.4, lite: role === "small" });
      }
    }
    for (let d = start + 10; d < end; d += 8 + rnd() * 7) for (const side of [-1, 1]) {   // the far land: big dark masses
      const Z = zoneAt(d), back = Z.backdrop || Tv.backdrop || []; if (!back.length || rnd() > 0.5) continue;
      add(back[(rnd() * back.length) | 0], d, side * (30 + rnd() * 28), { mul: 1.5 + rnd() * 0.9 });
    }
    // the ground near the lane: low dressing (tufts, the odd small pumpkin or stone) scattered on both sides, so the land
    // Morty crosses isn't bare dirt, without ever standing in a throw's way
    for (let d = start + 2; d < end; d += 1.1 + rnd() * 1.4) for (const side of [-1, 1]) {
      if (rnd() > 0.28 + swell(d) * 0.3) continue;
      const Z = zoneAt(d), R = byRole(Z.mix), low = travelKind("tuft") && rnd() < 0.6 ? ["tuft"] : R.small; if (!low.length) continue;
      add(low[(rnd() * low.length) | 0], d, side * (half + 0.35 + rnd() * 2.4), { mul: 0.55 + rnd() * 0.35, lite: true });
    }
    // the arenas get a frame: big trees (the zone's backdrop) standing either side of where the fight will be, and a
    // pair of smaller pieces at their feet, so the boss's ground reads as a place you've arrived at
    for (const c of Tv.clear || []) {
      const at = table[c.hit], Z = zoneAt(at), back = Z.backdrop || Tv.backdrop || [], R = byRole(Z.mix);
      for (const side of [-1, 1]) {
        if (back.length) for (const k of [0.25, 0.7]) add(back[(rnd() * back.length) | 0], at + c.ahead * k, side * (c.x + 1.2 + rnd() * 1.6), { mul: 1.35 + rnd() * 0.45, flip: side });
        const small = R.med.length ? R.med : R.small; if (small.length) add(small[(rnd() * small.length) | 0], at + c.ahead * 0.45, side * (c.x + 0.5), { mul: 0.9 });
      }
    }
    for (const L of Tv.landmarks || []) {
      const d = table[L.hit] + (L.ahead || 0);
      if (L.asset === "digger") { P.push({ kind: "digger", d, x: L.x, z: d, travel: true, ph: 0, seed: 0, face: false }); continue; }
      add(L.asset, d, L.x, { landmark: true, mul: L.mul || 1, flip: L.flip || 1, wakes: L.wakes || null });
    }
    layOutDecals(start, end);
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
    landSetup(Tv);   // (v57: the land's hills and the road's bends, 06h_land.js)
    if (!Tv) return false;
    layOutTravel(Tv, P); return true;
  }
  // where the run has got to: the Adventure travels, on the map it's playing; anything else stands at the start
  // ── v58: the MapTravelController. Every mode that plays a map's lane travels it; one rule decides how far on the
  // camera stands, from the map's own travel profile (its step, its arrival, its land and sky: src/maps/*.json travel)
  // and the mode's movement profile (MAP_TRAVEL): the Adventure (and Adventure+) goes by the legs, standing still
  // through the bosses; Arcade, Practice, the Director's Challenge and the season's Feature go by the road, a step a
  // make with no bosses to stop for, slowing as the map's far end comes up and never quite stopping; Boss Rush stands
  // in each boss's arena; an attraction's booth stays where it is. No mode or map is special-cased: a new mode names
  // its profile here. The world, the music and the ambient life go on as it moves.
  const MAP_TRAVEL = { story: "legs", arcade: "road", practice: "road", director: "road", feature: "road", rush: "arena" };
  const travelProfile = () => (game.state === "title" ? "still" : MODES[game.mode] && MODES[game.mode].mini ? "still" : MAP_TRAVEL[game.mode] || "still");
  function roadAt(h) {   // the road profile: linear, then easing toward the far end (the slopes meet, so no lurch)
    const end = TRAVEL.table[STAGE_END], lin = Math.max(0, h) * TRAVEL.def.step * 0.8, knee = end * 0.8;
    return lin < knee ? lin : knee + (end - knee) * (1 - Math.exp(-(lin - knee) / (end - knee)));
  }
  function travelDistAt(h) {   // how far on the camera stands after h makes, in this mode
    if (!TRAVEL.on || !TRAVEL.table) return 0;
    const P = travelProfile();
    return P === "legs" ? travelAt(h) : P === "road" ? roadAt(h) : P === "arena" ? TRAVEL.table[game.phase === "mini" ? STAGE_MINI : STAGE_BOSS] : 0;
  }
  const travelMoves = () => TRAVEL.on && (travelProfile() === "legs" || travelProfile() === "road");   // (a make carries the world on: 08k_feel.js)
  function travelGoal() {
    if (TRAVEL.on && game.phase === "crossing" && game.mode === "story" && sceneMap === (game.stage || 1)) return crossingAt();   // the road into the next map (07q_crossing.js)
    if (!TRAVEL.on || sceneMap !== (game.stage || 1) - 1) return 0;
    return travelDistAt(game.stageHits || 0);
  }
  function updateTravel(dt) {
    if (!TRAVEL.on) return;
    updateAnticipation(dt);   // (v51: a make on its way starts the world moving before it lands, 08k_feel.js)
    const base = travelGoal(), goal = Math.max(base, anticipatedGoal()), was = TRAVEL.D, step = TRAVEL.def.step;
    if (base > TRAVEL.lastGoal + 0.01 && base - TRAVEL.lastGoal <= Math.max(step, CROSS.step) * 1.01) travelStepped(base);
    TRAVEL.lastGoal = base; TRAVEL.goal = goal;
    if (Math.abs(goal - TRAVEL.D) > Math.max(step, CROSS.step) * 2.5 || reduceMotion) TRAVEL.D = goal;   // a jump (a new run, a reload, a reduced-motion player): straight there
    else { TRAVEL.D += (goal - TRAVEL.D) * (1 - Math.exp(-dt * TRAVEL_EASE)); if (Math.abs(goal - TRAVEL.D) < 0.003) TRAVEL.D = goal; }
    const dD = TRAVEL.D - was; TRAVEL.v = dt > 0 ? dD / dt : 0;
    if (dD) {
      travelApply();
      for (let i = world.walkers.length - 1; i >= 0; i--) { const k = world.walkers[i]; k.z -= dD; if (k.z < 1.5) world.walkers.splice(i, 1); }   // (the wanderers are left behind too)
      if (GY.cat && Math.abs(dD) <= Math.max(step, CROSS.step) * 2.5) { GY.cat.z -= dD; if (GY.cat.z < 0.4) GY.cat = null; }   // (v53: the cat stays where it was in the world, and is passed by, like everything else; a jump, a new run or a reload, leaves it be)
    }
  }
  // v54: flat detail on the ground (a patch of dead grass, pebbles, a fallen twig, leaf litter, a darker scuff of earth),
  // across the lane as well as beside it. It's painted on the ground, so it travels with the world like everything else
  // but never stands in a throw's way (the lane is kept clear of anything upright). Its own dice, so it doesn't reshuffle
  // the rest of the track; none on the water maps.
  const DECALS = ["grass", "grass", "stones", "twig", "leaves", "leaves", "scuff"];
  function layOutDecals(start, end) {
    const rnd = mulberry32(9001 + sceneMap * 17); TRAVEL.decals = [];
    for (let d = start; d < end; d += 0.6 + rnd() * 0.8) {
      const n = 1 + (rnd() < 0.45);
      for (let i = 0; i < n; i++) TRAVEL.decals.push({ d: d + rnd() * 0.5, x: (rnd() * 2 - 1) * 5.2, kind: DECALS[(rnd() * DECALS.length) | 0], s: 0.5 + rnd() * 0.7, r: rnd() * TAU, ph: rnd() });
    }
  }
  function drawTravelDecals(zMin = 0, zMax = 1e9) {   // (v57: a depth band at a time, laid on the land between its slices)
    if (!TRAVEL.on || !TRAVEL.decals || look().ambient.water || QUALITY.level < 0.75) return;   // (the first thing to go when a phone's busy)
    const D = TRAVEL.D;
    for (const g of TRAVEL.decals) {
      const z = g.d - D; if (z < 0.6 || z > 36 || z < zMin || z >= zMax) continue;
      const Ld = landAt(g.x, z), p = project(g.x + Ld.dx, Ld.y, z); if (p.x < -40 || p.x > W + 40) continue;
      const q = project(g.x + Ld.dx, Ld.y, z + 0.25), sq = clamp((p.y - q.y) / 0.25 / p.s, 0.08, 1), u = p.s * 0.2 * g.s;   // (the ground's foreshortening, and a unit a fifth of a metre)
      if (u < 1.2) continue;
      const a = clamp((36 - z) / 10, 0, 1) * 0.9;
      ctx.save(); ctx.globalAlpha *= a; ctx.translate(p.x, p.y); ctx.lineCap = "round"; ctx.lineJoin = "round";
      if (g.kind === "grass") {   // a few short blades, standing (they're tiny)
        ctx.strokeStyle = "#5A5A2E"; ctx.lineWidth = Math.max(1, u * 0.09);
        ctx.beginPath(); for (let i = 0; i < 6; i++) { const bx = (i - 2.5) * u * 0.16, h = u * (0.35 + 0.25 * Math.sin(i * 2.3 + g.ph * 7)), lean = Math.sin(twos(world.t) * 1.6 + g.ph * 9 + i) * u * 0.05; ctx.moveTo(bx, 0); ctx.quadraticCurveTo(bx + lean, -h * 0.6, bx + lean * 2 + (i - 2.5) * u * 0.04, -h); } ctx.stroke();
      } else {
        ctx.scale(1, sq); ctx.rotate(g.r);
        if (g.kind === "stones") { ctx.fillStyle = "#6E665C"; ctx.strokeStyle = "rgba(23,19,15,.7)"; ctx.lineWidth = Math.max(1, u * 0.06); for (const [sx, sy, sr] of [[0, 0, 0.22], [0.32, 0.12, 0.14], [-0.25, 0.2, 0.11]]) { ctx.beginPath(); ctx.ellipse(sx * u, sy * u, sr * u * 1.2, sr * u, 0, 0, TAU); ctx.fill(); ctx.stroke(); } }
        else if (g.kind === "twig") { ctx.strokeStyle = "#4A3222"; ctx.lineWidth = Math.max(1, u * 0.07); ctx.beginPath(); ctx.moveTo(-u * 0.6, 0); ctx.lineTo(u * 0.6, 0); ctx.moveTo(u * 0.1, 0); ctx.lineTo(u * 0.35, -u * 0.22); ctx.moveTo(-u * 0.25, 0); ctx.lineTo(-u * 0.42, u * 0.18); ctx.stroke(); }
        else if (g.kind === "leaves") { for (const [lx, ly, c] of [[0, 0, "#9A4A1E"], [0.3, 0.2, "#B8662A"], [-0.28, 0.15, "#6E3A1C"]]) { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(lx * u, ly * u, u * 0.16, u * 0.08, lx * 3, 0, TAU); ctx.fill(); } }
        else { ctx.fillStyle = "rgba(20,12,6,.16)"; ctx.beginPath(); ctx.ellipse(0, 0, u * 0.9, u * 0.5, 0, 0, TAU); ctx.fill(); }   // a scuff
      }
      ctx.restore();
    }
  }
  // a step has just begun: in the harvest and the crows' country, the crows come up out of the trees
  function travelStepped(goal) {
    const Z = travelZone(goal + 10); if (!Z || !Z.flock) return;
    const fk = flockKind(); if (fk && Math.random() < Z.flock) spawnFlock(fk);   // (the crows, or the bats, come up as Morty passes; v58: only where they live)
  }
  function travelApply() {
    const D = TRAVEL.D;
    for (const k of GY.props) if (k.travel) k.z = k.d - D;
    const dg = GY.props.find(k => k.kind === "digger" && k.travel); if (dg) { DIG.x = dg.x; DIG.z = dg.z; }
  }
  const travelZone = d => { let Z = TRAVEL.zones[0] || null; for (const z of TRAVEL.zones) if (d >= z.at) Z = z; return Z; };
  const travelShows = k => !k.travel || (k.z > TRAVEL_NEAR && k.z < TRAVEL.def.far && !(k.lite && QUALITY.level < 0.75));   // (v54: the ground dressing and the clusters' small pieces go first under load)
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
  function paintTravel(g, kind, K, part = "body") {   // in canvas units, the foot at the foot (part: "reveal" for a landmark's near-only part)
    if (!K.canvasKind) { drawLayer(g, "travel/" + kind, part); return; }
    if (part !== "body") return;
    g.save(); g.translate(K.foot[0], K.foot[1]); g.scale(100, 100); g.lineJoin = "round"; g.lineCap = "round"; g.strokeStyle = INK; g.lineWidth = 0.03;
    const k = { kind, size: 1, seed: 7, ph: 0, col: 0, pal: (TRAVEL.def && TRAVEL.def.pal) || "grave", h: 0.9, side: 1, n: 5 };
    if (kind === "tree") paintTree(g, k); else if (kind === "tuft") paintTuft(g, k); else if (STONE_KINDS.includes(kind)) paintStone(g, k);
    else if (kind === "crypt") paintCrypt(g); else if (kind === "lantern") paintLantern(g); else if (kind === "fence") paintFence(g); else if (PROP_PAINT[kind]) PROP_PAINT[kind](g, k);
    g.restore();
  }
  function travelSprite(kind, r, sil = false, part = "body") {
    const key = `${kind}@${r}${sil ? "s" : ""}${part === "body" ? "" : ":" + part}`; if (TRAVEL.sprites[key]) return TRAVEL.sprites[key];
    const K = travelKind(kind), q = Math.min(DPR, 1.5), c = document.createElement("canvas");
    c.width = Math.max(2, Math.ceil(K.canvas[0] * r * q)); c.height = Math.max(2, Math.ceil(K.canvas[1] * r * q));
    const g = c.getContext("2d"); g.setTransform(r * q, 0, 0, r * q, 0, 0);
    paintTravel(g, kind, K, part);
    if (sil) { g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "source-atop"; g.fillStyle = sil === "haze" ? hazeInk() : "rgba(10,7,6,.82)"; g.fillRect(0, 0, c.width, c.height); }   // (the near edge: dark, like the frame's branches; a far landmark: the haze's own dark)
    return (TRAVEL.sprites[key] = { c, K });
  }
  function travelLights(K, t, ph) {   // lit windows and the like: a warm flicker (additive, drawn over the sprite)
    if (!K.lights) return;
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    for (const [x, y, rr] of K.lights) { const fl = 0.75 + 0.25 * Math.sin(t * 5 + ph * 9 + x) * Math.sin(t * 1.7 + y), g = ctx.createRadialGradient(x - K.foot[0], y - K.foot[1], 0, x - K.foot[0], y - K.foot[1], rr);
      g.addColorStop(0, `rgba(255,200,110,${0.32 * fl})`); g.addColorStop(1, "rgba(255,200,110,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x - K.foot[0], y - K.foot[1], rr, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  // v54: the boss's lair on the horizon is a landmark that reveals itself. It isn't simply its size at that distance: far
  // off it's drawn smaller still (a perspective pushed further, so the approach feels long and the arrival huge), and
  // it comes into view in stages as Morty nears it:
  //   beyond 120 m · a small dark shape in the haze (what's that, way out there?)
  //   120 → 75 m   · its colour comes up through the silhouette
  //   75 → 55 m    · its crown (or whatever its "reveal" part is) appears
  //   inside 45 m  · full size: the thing itself
  const LANDMARK = { full: 45, k: 0.95, min: 0.16, silFar: 120, silNear: 75, revFar: 75, revNear: 55 };
  const landmarkScale = z => clamp(Math.pow(LANDMARK.full / Math.max(1, z), LANDMARK.k), LANDMARK.min, 1);
  const landmarkSil = z => clamp((z - LANDMARK.silNear) / (LANDMARK.silFar - LANDMARK.silNear), 0, 1);
  const landmarkReveal = z => clamp((LANDMARK.revFar - z) / (LANDMARK.revFar - LANDMARK.revNear), 0, 1);
  const hazeInk = () => { const h = rgbaOf(look().haze); return `rgba(${(h[0] * 0.25) | 0},${(h[1] * 0.22) | 0},${(h[2] * 0.3) | 0},.9)`; };
  // one piece of scenery on the track, in the world, at the camera's distance from it
  function drawTravelProp(k) {
    if (k.kind === "digger") { if (k.z > TRAVEL_NEAR + 2) drawDigger(); return; }
    const lm = !!k.wakes, K = travelKind(k.kind), Ld = landAt(k.x, k.z), p = project(k.x + Ld.dx, Ld.y, k.z), sc = (p.s * k.mul * (lm ? landmarkScale(k.z) : 1)) / 100;
    if (K.canvas[1] * sc < 2.5) return;
    const hw = K.canvas[0] * sc; if (p.x + hw < -U * 0.2 || p.x - hw > W + U * 0.2) return;
    const a = travelFade(k.z) * wakeAlpha(k); if (a <= 0.01) return;
    const t = world.t, G = propGroove(K.family, k.ph, t), sway = FLOW_SWAY[k.kind] ? flowSway(k, t) * (K.sway || FLOW_SWAY[k.kind]) : K.sway ? (GROOVE_TREE[K.family] || GROOVE_TREE[k.kind] ? Groove.sway(k.ph) * K.sway : Math.sin(twos(t) * (K.family === "corn" ? 2 : 1.1) + k.ph * 6) * K.sway) : G.sway, bb = G.bb;   // (v54: to the music, 02f_music_clock.js)
    ctx.save(); ctx.globalAlpha *= a; ctx.translate(p.x, p.y);
    if (k.sink) { ctx.beginPath(); ctx.rect(-hw * 2, -K.canvas[1] * sc * 2, hw * 4, K.canvas[1] * sc * 2); ctx.clip(); ctx.translate(0, K.canvas[1] * sc * k.sink); }   // (v58: half buried: sunk into the floor, cut off at it)
    if (k.tilt) ctx.rotate(k.tilt);   // (v58: knocked over)
    if (sway) ctx.transform(1, 0, sway, 1, 0, 0);
    reactXform(k);   // hit by a throw: it bends, squeaks or shakes like the rest of the map's props (07n_environment.js)
    ctx.scale(sc * k.flip * (1 - bb * 0.04), sc * (1 + bb * 0.06));
    const life = PROP_LIFE[k.kind];   // (a glowing kind's light, under it; and on the GPU)
    if (life) { life({ ...k, size: 1 }, 100, t); const L = PROP_LIGHT[k.kind]; if (L) gpuLight(p.x + L[0] * 100 * sc * k.flip, p.y - L[1] * 100 * sc, L[2] * 100 * sc, L[3], 0.3); }
    const sil = lm ? landmarkSil(k.z) : 0, rev = lm ? landmarkReveal(k.z) : 1, hasRev = !K.canvasKind && ASSETS["travel/" + k.kind] && ASSETS["travel/" + k.kind].layers.reveal;
    if (sc > TRAVEL_VECTOR && !sil) {
      ctx.translate(-K.foot[0], -K.foot[1]); paintTravel(ctx, k.kind, K);
      if (hasRev && rev > 0) { const a0 = ctx.globalAlpha; ctx.globalAlpha = a0 * rev; paintTravel(ctx, k.kind, K, "reveal"); ctx.globalAlpha = a0; }
      ctx.translate(K.foot[0], K.foot[1]);
    } else {
      const r = TRAVEL_LODS.reduce((best, v) => (v >= sc ? v : best), TRAVEL_LODS[0]), S = travelSprite(k.kind, r);
      ctx.drawImage(S.c, -K.foot[0], -K.foot[1], K.canvas[0], K.canvas[1]);
      if (hasRev && rev > 0) { const a0 = ctx.globalAlpha; ctx.globalAlpha = a0 * rev; ctx.drawImage(travelSprite(k.kind, r, false, "reveal").c, -K.foot[0], -K.foot[1], K.canvas[0], K.canvas[1]); ctx.globalAlpha = a0; }
      if (sil > 0) { const a0 = ctx.globalAlpha; ctx.globalAlpha = a0 * sil; ctx.drawImage(travelSprite(k.kind, r, "haze").c, -K.foot[0], -K.foot[1], K.canvas[0], K.canvas[1]); ctx.globalAlpha = a0; }
    }
    if (sil < 0.99) travelLights(K, t, k.ph);
    ctx.restore();
    if (k.sink > 0.2) { ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = aquaBiome() ? "#9A8C6C" : "#8A7A5A"; ctx.beginPath(); ctx.ellipse(p.x, p.y, hw * 0.62, Math.max(1.5, hw * 0.1), 0, Math.PI, 0); ctx.fill(); ctx.restore(); }   // (the sand heaped where it went in)
    if (K.lights && sil < 0.99) for (const [lx, ly, lr] of K.lights) gpuLight(p.x + (lx - K.foot[0]) * sc * k.flip, p.y + (ly - K.foot[1]) * sc, lr * sc * 2.2, "255,196,110", 0.26 * a * wakeAlpha(k) * (1 - sil));   // lit windows, on the GPU
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
  // v54: a new run stands at the start of the track at once (it used to keep the last run's place until the next frame)
  function travelSnap() { if (!TRAVEL.on) return; TRAVEL.D = TRAVEL.goal = TRAVEL.lastGoal = 0; TRAVEL.v = 0; travelApply(); }
  const rgbaOf = s => { const m = String(s).match(/rgba?\(([^)]+)\)/); if (m) { const v = m[1].split(",").map(Number); return [v[0], v[1], v[2], v.length > 3 ? v[3] : 1]; } const h = String(s).replace("#", ""); return h.length === 6 ? [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 1] : [0, 0, 0, 0]; };
  // ── v58: the sky keeps time with the road. The further a map's track has carried Morty, the lower the moon has
  // gone: it sets on its own side of the sky (never across the ring's band, which nothing in the sky may compete with),
  // drifting outward and down until, by the boss, it is sinking behind the skyline. The night turns with it: the zenith
  // deepens and the horizon takes the map's late colour (travel.sky: arc, how far toward setting it gets; late; k).
  // Its halo, its light, the vignette's clearing and its road down the water all go with it. Looks only, worked out
  // from TRAVEL.D, so a reload or a replay puts the moon where the run left it. The picture-house screen and a
  // moonless cave stay put.
  function skyUpdate() {
    const S = TRAVEL.on && TRAVEL.def && TRAVEL.def.sky, end = S && TRAVEL.table ? TRAVEL.table[STAGE_END] : 0;
    const p = end > 0 ? clamp(TRAVEL.D / end, 0, 1) : 0, moves = S && moon.r && moon.kind !== "screen";
    SKY.p = p;
    const e = moves ? S.arc * (p * p * (3 - 2 * p)) : 0, side = moon.x < W / 2 ? -1 : 1;
    SKY.dx = e * side * Math.max(0, Math.min(U * 0.55, (side < 0 ? moon.x : W - moon.x) - moon.r * 1.3));
    SKY.dy = e * Math.max(0, HY - moon.r * 0.35 - moon.y);
    if (Math.round(SKY.dx / 3) + "," + Math.round(SKY.dy / 3) !== SKY.vig) buildVignette();
  }
  function drawSkyGrade() {   // (on the sky's plane, under the stars' twinkle, the clouds and the moon)
    const S = TRAVEL.on && TRAVEL.def && TRAVEL.def.sky, k = S ? SKY.p * S.k : 0;
    if (k > 0.004 && skyLayer) {
      const P = skyLayer, g = ctx.createLinearGradient(0, P.y0, 0, HY + U * 0.14);
      g.addColorStop(0, `rgba(${rgbOf(S.late[0])},${k})`); g.addColorStop(0.55, `rgba(${rgbOf(S.late[0])},${k * 0.45})`); g.addColorStop(1, `rgba(${rgbOf(S.late[1])},${k * 1.1})`);
      ctx.fillStyle = g; ctx.fillRect(P.x0, P.y0, P.w, P.h);
    }
    if (!moon.halo) return;
    const mx = moon.x + SKY.dx, my = moon.y + SKY.dy, gr = U * 0.39, rgb = rgbOf(look().moonColor), h = ctx.createRadialGradient(mx, my, moon.r * 0.8, mx, my, gr);
    h.addColorStop(0, `rgba(${rgb},.22)`); h.addColorStop(0.4, `rgba(${rgb},.07)`); h.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = h; ctx.beginPath(); ctx.arc(mx, my, gr, 0, TAU); ctx.fill();
  }
