  // ───────────────────────── the directors: tier, ring path, targets and hazards ─────────────────────────
  // Map = environment, Tier = intensity. A map's JSON names its ring (speed, triangle, patterns, path) and its
  // mechanic; the Tier Director (src/maps/tiers.json) turns the dials within it: how fast, how small, how often a
  // hazard comes, how many bonus targets hang behind the ring. The throw itself never changes.

  // ── the run's dice: everything random in a run's play (targets, hazards, power-ups) comes from one seeded stream,
  // so the same seed and the same throws make the same run. Looks-only randomness (particles, jolts) stays apart.
  let runRand = mulberry32(1);
  function seedRun(seed) { game.seed = seed >>> 0; runRand = mulberry32(game.seed); }
  const rrIn = (a, b) => a + runRand() * (b - a);

  // ── the Tier Director: the first half of a map runs at its first tier, after the mini-boss its second. Arcade
  // keeps climbing past 50 hits, a tier every 25.
  function tierNow() {
    const M = mapData(game.stage || 1);
    let i = TIER_DATA.indexOf(tierData(M.tiers[game.phase === "A" ? 0 : 1]));
    if (arcadeLike() && (game.stageHits || 0) >= 75) i += Math.floor(((game.stageHits || 0) - 50) / 25);
    return TIER_DATA[clamp(i, 0, TIER_DATA.length - 1)];
  }

  // ── the Ring Path Director: every way the ring can move, by mode. flat: it keeps to one depth; post: it stands on
  // its pole. The first half of a map slides ("line"); after the mini-boss the map's path takes over (a triangle
  // through depth, the carousel's circle, or the Final Reel's jump cuts). The rest are for modes and challenges.
  function triAt(p) {
    const seq = ring.tri.seq, n = seq.length, i = Math.floor(p), f = smooth(p - i), V = triVerts();
    const A = V[seq[((i % n) + n) % n]], B = V[seq[(((i + 1) % n) + n) % n]];
    return { x: A.x + (B.x - A.x) * f, y: A.y + (B.y - A.y) * f, z: A.z + (B.z - A.z) * f };
  }
  const JUMP_TELL = 0.28;   // the last part of each hold: the film flickers before the cut
  const RING_PATHS = {
    line:     { flat: true, post: true, at: p => ({ x: ring.amp * Math.sin(p), y: RING_Y + ring.bob * Math.sin(p * 1.7), z: ringZ0() }) },
    static:   { flat: true, post: true, at: () => ({ x: 0, y: RING_Y, z: ringZ0() }) },
    vertical: { flat: true, at: p => ({ x: 0, y: RING_Y + 0.55 * Math.sin(p), z: ringZ0() }) },
    diagonal: { flat: true, at: p => ({ x: ring.amp * Math.sin(p), y: RING_Y + 0.42 * Math.sin(p), z: ringZ0() }) },
    figure8:  { flat: true, at: p => ({ x: ring.amp * Math.sin(p), y: RING_Y + 0.38 * Math.sin(p * 2), z: ringZ0() }) },
    tri:      { at: triAt },
    circle:   { lap: TAU / 3, at: p => ({ x: ring.tri.a * Math.sin(p), y: RING_Y + 0.25 + 0.14 * Math.sin(p * 2), z: RING_Z + 0.55 + 1.35 * Math.cos(p) }) },
    jumpcut:  { at: p => {   // it holds on a corner, then the film cuts it to the next one; depth barely changes, so every cut is fair
      const seq = ring.tri.seq, n = seq.length, i = Math.floor(p), V = triVerts(), A = V[seq[((i % n) + n) % n]];
      return { x: A.x, y: A.y + 0.05 * Math.sin(p * TAU), z: RING_Z + (A.z - RING_Z) * 0.25 };
    }, tell: p => { const f = p - Math.floor(p); return f > 1 - JUMP_TELL ? (f - (1 - JUMP_TELL)) / JUMP_TELL : 0; } }
  };
  const PATH_MODE = { triangle: "tri", circle: "circle", jumpcut: "jumpcut" };
  const bMode = () => PATH_MODE[stageDef().path] || "tri";
  const ringFlies = () => !!RING_PATHS[ring.mode] && !RING_PATHS[ring.mode].flat;   // the second half's ring, wings and all

  // ── bonus targets: after a make the skull flies on through the ring, and anything hanging behind it can be clipped
  // for bonus points and bones. Each map has its own (a wisp, a brazier, a jack-o'-lantern, a hanging bone, a frog,
  // a gallery duck, a bell, a film can). How many hang there at once is the tier's.
  const targets = [];
  const TARGET_R = 0.26;
  const TARGET_WORD = { wisp: "WHOOSH!", brazier: "FWOOSH!", jack: "SPLAT!", bonefruit: "CLACK!", frog: "RIBBIT!", duck: "QUACK!", bell: "DONG!", filmcan: "CLUNK!" };
  const TARGET_SOUND = { frog: "ribbit", duck: "quack", bell: "clang", bonefruit: "bonk" };
  // v44 (the corrected roadmap's V19): nine kinds of target, on the map's target zone (its production sheet). Standard ones
  // hang and bob; swinging ones swing on a rope; runaways scuttle to and fro; pop-ups duck under and come back up (a
  // rustle first); shielded ones need two hits (the first knocks the lid off); split ones burst into two smaller ones;
  // golden ones are rare, worth five times as much and bones besides, and don't stay long; secret ones are all but
  // invisible until hit. Decoys are the odd ones out: painted fakes hung IN FRONT of the ring, and hitting one on the
  // way is a miss. The map says which kinds each half uses; the tier says how often gold and secrets turn up.
  const tgR = T => TARGET_R * (T.sz || 1);
  function targetPos(T) {
    const t = T.t + T.ph;
    if (T.type === "swinging") { const a = 0.55 * Math.sin(t * 1.8); return { x: T.x + Math.sin(a) * 1.1, y: T.y + (1 - Math.cos(a)) * 1.1, z: T.z, rope: { x: T.x, y: T.y + 1.1, z: T.z } }; }
    if (T.type === "runaway") return { x: clamp(T.x + 1.1 * Math.sin(t * 1.3) + (T.flee || 0), -2.2, 2.2), y: T.y + Math.abs(Math.sin(t * 7)) * 0.06, z: T.z };
    if (T.type === "popup") { const u = ((t % 3.4) + 3.4) % 3.4, up = u < 1.9 ? 1 : u < 2.2 ? 1 - (u - 1.9) / 0.3 : u > 3.1 ? (u - 3.1) / 0.3 : 0; return { x: T.x, y: T.y - (1 - up) * 1.3, z: T.z, up, tell: u > 2.8 && u <= 3.1 }; }
    return { x: T.x, y: T.y + (T.kind === "frog" ? 0 : Math.sin(T.t * 2 + T.ph) * 0.08), z: T.z };
  }
  const targetLive = T => !T.pop && (T.type !== "popup" || targetPos(T).up > 0.6);
  function targetTypesNow() { const M = mapData(game.stage || 1); return (M.targetTypes && M.targetTypes[game.phase === "A" ? "A" : "B"]) || ["standard"]; }
  function spawnTarget(forceType) {
    const M = mapData(game.stage || 1), kind = M.target, Z = M.sheet.zones.targets, H = M.sheet.zones.hazards, T0 = tierNow();
    const pool = targetTypesNow().filter(ty => ty !== "golden" && ty !== "secret"), has = ty => targets.some(T => T.type === ty && !T.pop);
    let type = forceType || pool[(runRand() * pool.length) | 0] || "standard";
    if (!forceType) { const r = runRand(); if (r < (T0.golden || 0) || (targetTypesNow().includes("golden") && r < 0.12)) type = "golden"; else if (r < (T0.golden || 0) + (T0.secret || 0) || (targetTypesNow().includes("secret") && r > 0.86)) type = "secret"; }
    if (type === "decoy" && has("decoy")) type = "standard";
    sawIt("target", type);
    const low = kind === "frog", decoy = type === "decoy";
    const x = rrIn(Z.x[0], Z.x[1]), y = low && !decoy ? 0.22 : rrIn(Z.y[0], Z.y[1]), z = decoy ? rrIn(Math.max(H.z[0], 3.2), H.z[1] - 0.4) : rrIn(Z.z[0], Z.z[1]);
    targets.push({ kind, type, x: decoy ? rrIn(-1.0, 1.0) : x, y: decoy ? rrIn(2.0, 3.0) : type === "swinging" ? Math.min(y, Z.y[1] - 0.3) : y, z, t: 0, left: type === "golden" ? 3 : 6, pop: 0, ph: rrIn(0, TAU), shield: type === "shielded", sz: type === "secret" ? 0.9 : 1 });
  }
  function refillTargets() {
    const want = boss || game.state === "title" || game.phase === "crossing" ? 0 : tierNow().targets * directorTargets();
    for (let i = targets.length - 1; i >= 0; i--) if (targets[i].pop || --targets[i].left <= 0) targets.splice(i, 1);
    while (targets.filter(T => T.type !== "half").length < want) spawnTarget();
  }
  function updateTargets(dt) { for (const T of targets) { T.t += dt; if (T.pop) T.pop += dt; if (T.type === "half") { T.x += T.vx * dt; T.vx *= 1 - dt * 2; } } }
  const TARGET_VALUE = { golden: 5, secret: 4, shielded: 1.5, runaway: 1.5, swinging: 1.25, popup: 1.25, half: 0.75 };
  function hitTarget(T) {
    const P = targetPos(T), p = project(P.x, P.y, P.z);
    if (T.shield) {   // the lid comes off: CLANG, a few points, and it's there for the next throw
      T.shield = false; const pts = Math.max(5, Math.round((50 * stageMult()) / 5) * 5); game.score += pts; profile.scoreTotal += pts;
      impact("CLANG!", p.x, p.y - U * 0.05, { fill: CREAM, text: INK, scale: 0.5, bits: false }); flyPoints(`+${fmtN(pts)}`, p.x, p.y, false); Sound.toon("clang", panOf(P.x));
      return;
    }
    T.pop = 0.001;
    const k = TARGET_VALUE[T.type] || 1, pts = Math.max(5, Math.round((200 * k * stageMult()) / 5) * 5);
    game.score += pts; profile.scoreTotal += pts; profile.targetHits++; game.run.targets = (game.run.targets || 0) + 1; addBones(T.type === "golden" ? 25 : T.type === "secret" ? 15 : 3);
    const word = T.type === "golden" ? "JACKPOT!" : T.type === "secret" ? t("target.secret.found") : TARGET_WORD[T.kind] || "DING!";
    impact(word, p.x, p.y - U * 0.05, { fill: T.type === "secret" ? PURPLE : GOLD, text: T.type === "secret" ? CREAM : INK, scale: T.type === "golden" || T.type === "secret" ? 0.75 : 0.55, bits: T.type === "golden" });
    flyPoints(`+${fmtN(pts)}`, p.x, p.y, T.type === "golden"); Sound.toon(T.type === "golden" ? "fanfare" : TARGET_SOUND[T.kind] || "ding", panOf(P.x));
    if (T.type === "secret") { profile.secretTargets = (profile.secretTargets || 0) + 1; }
    if (T.type === "split") for (const sd of [-1, 1]) targets.push({ kind: T.kind, type: "half", x: P.x, y: P.y, z: P.z + 0.2, vx: sd * 1.4, t: 0, left: 2, pop: 0, ph: T.ph + sd, sz: 0.65 });
    Telemetry.emit("target", { kind: T.kind, type: T.type, stage: game.stage }); challenge("targets", 1);
    targetShot(p.x, p.y);   // a make that flew on into it: Two for One (07h_shots.js)
  }
  // ── hazards: each map's mechanic (src/maps: mechanic.kind), tuned by the tier. Wind blows through the flight; fog
  // hides the ring; bats, falling bones, balloons and the pendulum can knock the skull out of the air. Every hazard
  // gives a tell first (a screech, a shadow, a tick) and none of them run during a boss fight except the wind.
  const HZ = { kind: "none", wind: 0, fog: 0, fogT: 0, list: [], since: 0, pendT: 0, lastTick: 0 };
  // the map's hazards (wind included) sit out the mini-games, the encore, and Practice with them switched off
  const hazardsAllowed = () => !MODES[game.mode].mini && game.phase !== "encore" && game.phase !== "crossing" && !(game.mode === "practice" && !practice.hazards);
  const hazardsLive = () => !boss && game.state !== "title" && game.state !== "cine" && hazardsAllowed();
  function hazardsReset() {
    HZ.kind = mapData(game.stage || 1).mechanic.kind; HZ.wind = 0; HZ.windMul = 1; HZ.fog = 0; HZ.fogT = 0; HZ.list = []; HZ.since = 0; HZ.pendT = 0; HZ.lastTick = 0;
    if (HZ.kind === "balloons") for (let i = 0; i < 2; i++) HZ.list.push(newBalloon(rrIn(0.3, 3.8)));
    renderWind(); obstaclesReset();
  }
  const newBalloon = y => ({ kind: "balloon", x: rrIn(-2.2, 2.2), y, z: rrIn(2.4, 4.8), vy: rrIn(0.28, 0.42), col: ["#A94332", "#C49A42", "#356B68", "#F2E7C9"][(runRand() * 4) | 0], r: 0.24 });
  const windNow = () => (HZ.kind === "wind" && hazardsAllowed() ? HZ.wind : 0);   // m/s² across the throw (positive pushes right)
  // the pendulum: a pivot high over the lane, swinging across it; its bob is what hits
  const PEND = { x: 0, y: 5.4, z: 3.1, L: 3.1, A: 0.86, r: 0.32 };
  function pendPeriod() { return 2.7 / tierNow().speed; }
  function pendBob(t = HZ.pendT) { const a = PEND.A * Math.sin((TAU * t) / pendPeriod()); return { x: PEND.x + Math.sin(a) * PEND.L, y: PEND.y - Math.cos(a) * PEND.L, z: PEND.z, a }; }
  // after every throw: the wind turns, and the scheduled hazards (bats, bones, fog) come round every so many throws
  function hazardsAfterThrow() {
    const T = tierNow(), M = mapData(game.stage || 1).mechanic;
    if (HZ.kind !== "none" && hazardsLive()) sawIt("hazard", HZ.kind);   // the Codex notes the map's hazard (09k_codex.js)
    if (HZ.kind === "wind" && hazardsAllowed()) { HZ.wind = Math.round(rrIn(-1, 1) * (M.max || 1.5) * (HZ.windMul || 1) * (0.4 + 0.6 * T.hazard) * 10) / 10; renderWind(); if (Math.abs(HZ.wind) > 0.6) Sound.toon("gust"); }
    if (!hazardsLive() || !T.hazardEvery) return;
    if (++HZ.since < T.hazardEvery) return;
    HZ.since = 0;
    const d = rrIn(0.6, 1.8);   // it comes a moment after the skull is back in the pouch, so there's time to see the tell
    if (HZ.kind === "bats") { const dir = runRand() < 0.5 ? 1 : -1; HZ.list.push({ kind: "bat", at: d, t: 0, dir, y: rrIn(1.6, 2.4), z: rrIn(3.0, 4.2), r: 0.28, x: -dir * 4.4 }); }
    else if (HZ.kind === "bonefall") HZ.list.push({ kind: "bone", at: d, t: 0, x: rrIn(-1.4, 1.4), z: rrIn(2.8, 4.6), y: 4.4, r: 0.2 });
    else if (HZ.kind === "fog") HZ.fogT = 3.6;
  }
  function updateHazards(dt) {
    if (HZ.kind === "none") return;
    const live = hazardsLive();
    if (HZ.kind === "pendulum" && live) {
      const was = Math.sin((TAU * HZ.pendT) / pendPeriod()); HZ.pendT += dt; const now = Math.sin((TAU * HZ.pendT) / pendPeriod());
      if ((was < 0.98 && now >= 0.98) || (was > -0.98 && now <= -0.98)) Sound.toon("tick", now > 0 ? 0.6 : -0.6);   // a tick at each end of the swing
    }
    if (HZ.fogT > 0) HZ.fogT = Math.max(0, HZ.fogT - dt);
    const f = HZ.fogT > 0 ? Math.min(1, (3.6 - HZ.fogT) / 0.7, HZ.fogT / 0.7) : 0; HZ.fog += (f - HZ.fog) * Math.min(1, dt * 4);
    for (const h of HZ.list) {
      h.ox = h.x; h.oy = h.y; h.oz = h.z;
      if (h.fixed) continue;   // (the spec plants hazards that hold still)
      // (a balloon drifts on the run's time, not the clock's: a replay starts at another hour)
      if (h.kind === "balloon") { if (!live) continue; h.y += h.vy * dt; h.x += Math.sin((game.time - (game.run.t0 || 0)) * 0.9 + h.z) * 0.1 * dt; if (h.y > 4.6) Object.assign(h, newBalloon(0.2)); continue; }
      h.t += dt;
      if (h.kind === "bat") {   // it screeches off to the side first, then crosses the lane in about 1.3 s
        if (h.t < h.at) continue;
        const u = (h.t - h.at - 0.55) / 1.3;
        if (!h.tell && h.t >= h.at) { h.tell = 1; const p = project(-h.dir * 2.2, h.y, h.z); caption("SCREE!", clamp(p.x, U * 0.2, W - U * 0.2), p.y - U * 0.05); Sound.toon("screech", -h.dir * 0.8); }
        h.x = -h.dir * 4.4 + h.dir * 8.8 * clamp(u, 0, 1); h.yy = h.y + Math.sin(h.t * 9) * 0.08;
        if (u > 1.05) h.done = true;
      } else if (h.kind === "bone") {   // its shadow grows for 0.9 s, then it drops
        const u = h.t - h.at - 0.9;
        if (u > 0) { h.y = Math.max(0.12, 4.4 - 0.5 * 14 * u * u); if (h.y <= 0.12 && !h.landed) { h.landed = true; Sound.toon("bonk", panOf(h.x)); } }
        if (u > 1.6) h.done = true;
      }
    }
    HZ.list = HZ.list.filter(h => !h.done);
  }
  // the hazards in the skull's way (as the seeds: a swept test, since both move fast)
  function hazardBodies() {
    const out = [];
    if (HZ.kind === "pendulum" && hazardsLive()) { const b = pendBob(), o = pendBob(HZ.pendT - 1 / 120); out.push({ kind: "pendulum", x: b.x, y: b.y, z: b.z, ox: o.x, oy: o.y, oz: o.z, r: PEND.r }); }
    for (const h of HZ.list) {
      if (h.fixed) out.push(h);
      else if (h.kind === "bat" && h.t >= h.at + 0.55) out.push({ ...h, y: h.yy || h.y, oy: h.yy || h.y });
      else if (h.kind === "bone" && h.t > h.at + 0.9 && !h.landed) out.push(h);
      else if (h.kind === "balloon" && hazardsLive()) out.push(h);
    }
    return out;
  }
  function sweptDist(prev, pos, h) {
    const a = { x: prev.x - (h.ox == null ? h.x : h.ox), y: prev.y - (h.oy == null ? h.y : h.oy), z: prev.z - (h.oz == null ? h.z : h.oz) }, b = { x: pos.x - h.x, y: pos.y - h.y, z: pos.z - h.z };
    const e = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z }, ee = e.x * e.x + e.y * e.y + e.z * e.z;
    const u = ee > 1e-9 ? clamp(-(a.x * e.x + a.y * e.y + a.z * e.z) / ee, 0, 1) : 1;
    return Math.hypot(a.x + e.x * u, a.y + e.y * u, a.z + e.z * u);
  }
  function hazardCheck(s, prev) {
    for (const h of hazardBodies()) {
      const dd = sweptDist(prev, s.pos, h);
      if (dd > SKULL_R + h.r) { if (dd < SKULL_R + h.r + NEAR_PASS && !game.result) s.close = true; continue; }   // a near pass (Thread the Needle)
      if (powerOn("ghost")) { if (!h.ghosted) { h.ghosted = true; usePower("ghost"); s.ghosted = 1; const p = project(h.x, h.y, h.z); caption(t("result.ghost.caption"), p.x, p.y - U * 0.06); Sound.toon("poof"); } continue; }
      const p = project(s.pos.x, s.pos.y, s.pos.z);
      s.p0 = { ...s.pos }; s.t = 0; s.v0 = { x: (s.pos.x - h.x) * 6 + (h.kind === "bat" ? h.dir * 2 : 0), y: 2.4, z: -2 }; s.crossed = true; s.spin *= -2; s.ax = 0;
      if (h.kind === "balloon") { h.y = 9; Sound.toon("pop", panOf(h.x)); }
      if (h.kind === "pendulum") Sound.toon("clang", panOf(h.x));
      VisualSystem.triggerImpact("seed", { at: project(ring.x, ring.y, ring.z), hit: p, strength: 1, pan: panOf(s.pos.x) });
      resolve(h.kind === "bat" ? "bat" : h.kind === "bone" ? "bone" : h.kind === "balloon" ? "balloon" : "pendulum", project(ring.x, ring.y, ring.z), p);
      profile.hazardHits++;
      return true;
    }
    return false;
  }
  function targetCheck(s, prev) {
    for (const T of targets) {
      if (!targetLive(T)) continue;
      const P = targetPos(T), d = sweptDist(prev, s.pos, { ...P, ox: P.x, oy: P.y, oz: P.z });
      if (T.type === "decoy") {   // a decoy in the way: a miss, before the ring
        if (!game.result && !s.crossed && d <= SKULL_R + tgR(T)) { T.pop = 0.001; const p = project(s.pos.x, s.pos.y, s.pos.z); s.p0 = { ...s.pos }; s.t = 0; s.v0 = { x: (s.pos.x - P.x) * 5, y: 2, z: -1.6 }; s.crossed = true; s.ax = 0;
          Sound.toon("poof", panOf(P.x)); resolve("decoy", project(ring.x, ring.y, ring.z), p); profile.hazardHits++; return; }
        continue;
      }
      if (!game.result || !game.result.make) continue;
      if (T.type === "runaway" && d < 1.2 && !T.fled) { T.fled = true; T.flee = (T.flee || 0) + (P.x > s.pos.x ? 0.7 : -0.7); }   // it sees the skull coming and scuttles
      if (d <= SKULL_R + tgR(T)) hitTarget(T);
    }
  }
  function clearDirectors() { targets.length = 0; HZ.list = HZ.list.filter(h => h.kind === "balloon"); HZ.fogT = 0; HZ.since = 0; }
  function directorsAfterThrow() { refillTargets(); hazardsAfterThrow(); }
  // the wind's HUD sign: which way and how hard (shown only where the wind blows)
  function renderWind() {
    const el = $("wind"); if (!el) return;
    const on = HZ.kind === "wind" && game.state !== "title" && hazardsAllowed(); el.hidden = !on; if (!on) return;
    const w = HZ.wind, n = Math.min(3, Math.ceil(Math.abs(w) / 0.6));
    el.querySelector(".arr").textContent = w === 0 ? "·" : (w > 0 ? "→" : "←").repeat(Math.max(1, n));
    el.querySelector("b").textContent = Math.abs(w).toFixed(1);
    el.setAttribute("aria-label", w === 0 ? t("hud.wind.none") : w > 0 ? t("hud.wind.right", { w: Math.abs(w).toFixed(1) }) : t("hud.wind.left", { w: Math.abs(w).toFixed(1) }));
  }

  // ── drawing: targets and hazards on either side of the ring (front: nearer than it)
  function drawTargets(front) {
    if (boss) return;
    for (const T of targets) {
      const P = targetPos(T); if ((P.z < ring.z) !== front) continue;
      const p = project(P.x, P.y, P.z), r = tgR(T) * p.s, pop = T.pop ? clamp(T.pop / 0.4, 0, 1) : 0;
      if (pop >= 1) continue;
      if (P.rope) { const q = project(P.rope.x, P.rope.y, P.rope.z); ctx.strokeStyle = "rgba(20,14,8,.8)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(p.x, p.y - r); ctx.stroke(); }
      if (T.type === "popup") { if (P.up < 0.05) { if (P.tell) { ctx.fillStyle = "rgba(242,231,201,.7)"; ctx.fillRect(p.x - r, p.y + r * 1.4 * 1.3, r * 2, 2); } continue; } }
      const secret = T.type === "secret" && !T.pop;
      ctx.save(); ctx.translate(p.x, p.y); ctx.globalAlpha = (1 - pop) * (secret ? 0.1 + 0.08 * Math.sin(T.t * 3) : 1); ctx.scale(1 + pop * 0.8, 1 + pop * 0.8);
      ctx.lineWidth = Math.max(1.5, r * 0.12); ctx.strokeStyle = INK; ctx.lineJoin = "round";
      if (T.type === "golden") { const g = ctx.createRadialGradient(0, 0, r * 0.3, 0, 0, r * 2.2); g.addColorStop(0, "rgba(255,220,110,.6)"); g.addColorStop(1, "rgba(255,220,110,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r * 2.2, 0, TAU); ctx.fill(); ctx.filter = "sepia(1) saturate(4) brightness(1.15)"; }
      if (T.type === "decoy") { ctx.fillStyle = "#C8B28A"; ctx.beginPath(); ctx.rect(-r * 0.06, r * 0.8, r * 0.12, r * 1.2); ctx.fill(); ctx.stroke(); }
      drawTargetKind(T.kind, r, T.t + T.ph);
      ctx.filter = "none";
      if (T.type === "decoy") { ctx.strokeStyle = "rgba(60,40,20,.7)"; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(0, 0, r * 1.15, 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = INK; ctx.font = `900 ${Math.max(8, Math.round(r * 0.8))}px ${UIFONT}`; ctx.textAlign = "center"; ctx.fillText("?", r * 0.9, -r * 0.8); }
      if (T.shield) { ctx.fillStyle = "#8A8E96"; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.5, r * 0.1); ctx.beginPath(); ctx.arc(0, -r * 0.1, r * 1.05, Math.PI * 1.05, Math.PI * 1.95); ctx.lineTo(r * 0.9, -r * 0.1); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      ctx.restore();
      if (!T.pop && P.y > 0.4 && !secret) { const g = project(P.x + shadowShift(P.y), 0, P.z); ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.beginPath(); ctx.ellipse(g.x, g.y, r * 0.8, r * 0.18, 0, 0, TAU); ctx.fill(); }
    }
  }
  function drawTargetKind(kind, r, t) {
    const fill = (c) => { ctx.fillStyle = c; ctx.fill(); ctx.stroke(); };
    if (kind === "wisp") { const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.8); g.addColorStop(0, "rgba(200,255,230,.8)"); g.addColorStop(1, "rgba(200,255,230,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r * 1.8, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(0, -r); ctx.quadraticCurveTo(r * 0.9, 0, 0, r * 0.7); ctx.quadraticCurveTo(-r * 0.9, 0, 0, -r); fill("#D8FFF0"); }
    else if (kind === "brazier") { ctx.beginPath(); ctx.moveTo(-r * 0.7, 0); ctx.lineTo(r * 0.7, 0); ctx.lineTo(r * 0.45, r * 0.6); ctx.lineTo(-r * 0.45, r * 0.6); ctx.closePath(); fill("#4A3A30");
      ctx.beginPath(); ctx.moveTo(-r * 0.5, 0); ctx.quadraticCurveTo(-r * 0.4, -r * 0.8, Math.sin(t * 8) * r * 0.2, -r * 1.2); ctx.quadraticCurveTo(r * 0.4, -r * 0.8, r * 0.5, 0); ctx.closePath(); fill("#E8893A"); }
    else if (kind === "jack") { ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.85, 0, 0, TAU); fill("#E8803A"); ctx.fillStyle = "#FFD04A"; for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sd * r * 0.45, -r * 0.3); ctx.lineTo(sd * r * 0.15, -r * 0.15); ctx.lineTo(sd * r * 0.45, -r * 0.05); ctx.fill(); }
      ctx.beginPath(); ctx.ellipse(0, r * 0.35, r * 0.45, r * 0.16, 0, 0, Math.PI); ctx.fill(); ctx.strokeStyle = "#5E7A36"; ctx.beginPath(); ctx.moveTo(0, -r * 0.85); ctx.lineTo(0, -r * 2.6); ctx.stroke(); }
    else if (kind === "bonefruit") { ctx.strokeStyle = "rgba(30,30,20,.8)"; ctx.beginPath(); ctx.moveTo(0, -r * 0.6); ctx.lineTo(0, -r * 3); ctx.stroke(); ctx.strokeStyle = INK; ctx.save(); ctx.rotate(Math.sin(t * 1.5) * 0.2);
      ctx.beginPath(); rr(ctx, -r * 0.18, -r * 0.6, r * 0.36, r * 1.2, r * 0.15); fill("#E4DAC4"); for (const e of [-1, 1]) { ctx.beginPath(); ctx.arc(-r * 0.2, e * r * 0.6, r * 0.2, 0, TAU); ctx.arc(r * 0.2, e * r * 0.6, r * 0.2, 0, TAU); fill("#E4DAC4"); } ctx.restore(); }
    else if (kind === "frog") { ctx.beginPath(); ctx.ellipse(0, r * 0.2, r * 1.3, r * 0.35, 0, 0, TAU); fill("#3E6A42"); ctx.beginPath(); ctx.ellipse(0, -r * 0.2, r * 0.7, r * 0.5, 0, 0, TAU); fill("#6A9A4A");
      ctx.fillStyle = CREAM; for (const sd of [-1, 1]) { ctx.beginPath(); ctx.arc(sd * r * 0.35, -r * 0.6, r * 0.2, 0, TAU); ctx.fill(); ctx.stroke(); } ctx.fillStyle = INK; for (const sd of [-1, 1]) { ctx.beginPath(); ctx.arc(sd * r * 0.35, -r * 0.58, r * 0.08, 0, TAU); ctx.fill(); } }
    else if (kind === "duck") { ctx.beginPath(); ctx.ellipse(0, 0, r * 0.9, r * 0.55, 0, 0, TAU); fill("#E3B64B"); ctx.beginPath(); ctx.arc(r * 0.55, -r * 0.55, r * 0.38, 0, TAU); fill("#E3B64B");
      ctx.beginPath(); ctx.moveTo(r * 0.85, -r * 0.55); ctx.lineTo(r * 1.25, -r * 0.45); ctx.lineTo(r * 0.85, -r * 0.35); fill("#E8893A"); ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(r * 0.62, -r * 0.62, r * 0.07, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.rect(-r * 0.1, r * 0.5, r * 0.2, r * 0.8); fill("#8C6239"); }
    else if (kind === "bell") { ctx.save(); ctx.rotate(Math.sin(t * 2) * 0.15); ctx.strokeStyle = INK; ctx.beginPath(); ctx.moveTo(0, -r * 0.9); ctx.lineTo(0, -r * 3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-r * 0.25, -r * 0.9); ctx.quadraticCurveTo(-r * 0.75, -r * 0.6, -r * 0.8, r * 0.5); ctx.lineTo(r * 0.8, r * 0.5); ctx.quadraticCurveTo(r * 0.75, -r * 0.6, r * 0.25, -r * 0.9); ctx.closePath(); fill("#C49A42");
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(0, r * 0.6, r * 0.14, 0, TAU); ctx.fill(); ctx.restore(); }
    else if (kind === "filmcan") { ctx.save(); ctx.rotate(t * 1.2); ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); fill("#8A8E96"); ctx.fillStyle = "#3A3E46"; for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU; ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, r * 0.18, 0, TAU); ctx.fill(); }
      ctx.beginPath(); ctx.arc(0, 0, r * 0.15, 0, TAU); ctx.fill(); ctx.restore(); }
  }
  function drawHazards(front) {
    if (HZ.kind === "pendulum" && game.state !== "title") {
      const b = pendBob(), top = project(PEND.x, PEND.y + 2, PEND.z), p = project(b.x, b.y, b.z), r = PEND.r * p.s;
      if ((PEND.z < ring.z) === front) {
        ctx.strokeStyle = INK; ctx.lineWidth = Math.max(3, r * 0.22); ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(top.x, top.y); ctx.lineTo(p.x, p.y); ctx.stroke();
        ctx.strokeStyle = "#8C6239"; ctx.lineWidth = Math.max(1.5, r * 0.12); ctx.stroke();
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(-b.a); ctx.fillStyle = "#C49A42"; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(2, r * 0.1);
        ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); ctx.stroke(); ctx.fillStyle = "#E3B64B"; ctx.beginPath(); ctx.arc(-r * 0.3, -r * 0.3, r * 0.3, 0, TAU); ctx.fill();
        ctx.fillStyle = INK; for (const sd of [-1, 1]) { ctx.beginPath(); ctx.arc(sd * r * 0.32, -r * 0.05, r * 0.1, 0, TAU); ctx.fill(); } ctx.beginPath(); ctx.arc(0, r * 0.3, r * 0.22, 0.2, Math.PI - 0.2); ctx.stroke(); ctx.restore();
        const g = project(b.x, 0, b.z); ctx.fillStyle = "rgba(0,0,0,.28)"; ctx.beginPath(); ctx.ellipse(g.x, g.y, r * 1.1, r * 0.25, 0, 0, TAU); ctx.fill();
      }
    }
    for (const h of HZ.list) {
      if ((h.z < ring.z) !== front) continue;
      if (h.kind === "bat") {
        if (h.t < h.at + 0.55) continue;
        const p = project(h.x, h.yy || h.y, h.z); ctx.fillStyle = INK; drawBat(ctx, p.x, p.y, 0.28 * p.s, Math.sin(h.t * 22));
        ctx.fillStyle = "#E8D84A"; for (const sd of [-1, 1]) { ctx.beginPath(); ctx.arc(p.x + sd * 0.05 * p.s, p.y, Math.max(1, 0.025 * p.s), 0, TAU); ctx.fill(); }
      } else if (h.kind === "bone") {
        const g = project(h.x, 0, h.z), grow = clamp((h.t - h.at) / 0.9, 0, 1), s = g.s;
        if (h.t >= h.at && !h.landed) { ctx.fillStyle = `rgba(0,0,0,${0.15 + 0.3 * grow})`; ctx.beginPath(); ctx.ellipse(g.x, g.y, 0.3 * s * grow, 0.08 * s * grow, 0, 0, TAU); ctx.fill(); }
        if (h.t > h.at + 0.9) { const p = project(h.x, h.y, h.z), L = 0.36 * p.s; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(h.landed ? 1.4 : h.t * 7); ctx.fillStyle = "#E4DAC4"; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.2, L * 0.08);
          ctx.beginPath(); rr(ctx, -L * 0.5, -L * 0.08, L, L * 0.16, L * 0.06); ctx.fill(); ctx.stroke(); for (const e of [-1, 1]) for (const f of [-1, 1]) { ctx.beginPath(); ctx.arc(e * L * 0.5, f * L * 0.08, L * 0.09, 0, TAU); ctx.fill(); ctx.stroke(); } ctx.restore(); }
      } else if (h.kind === "balloon") {
        if (h.y > 5) continue;
        const p = project(h.x, h.y, h.z), r = h.r * p.s; ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(p.x, p.y + r); ctx.quadraticCurveTo(p.x + r * 0.3, p.y + r * 2, p.x, p.y + r * 3); ctx.stroke();
        ctx.fillStyle = h.col; ctx.lineWidth = Math.max(1.5, r * 0.1); ctx.beginPath(); ctx.ellipse(p.x, p.y, r * 0.85, r, 0, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,.4)"; ctx.beginPath(); ctx.ellipse(p.x - r * 0.3, p.y - r * 0.35, r * 0.18, r * 0.28, -0.4, 0, TAU); ctx.fill();
      }
    }
    if (front && HZ.fog > 0.02) {   // a fog bank rolling over the ring: its reflection on the water still shows where it is
      const p = project(ring.x, ring.y, ring.z), R = U * 0.6;   // (an ellipse round the ring, clear of the water below it)
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R); g.addColorStop(0, `rgba(190,215,205,${0.9 * HZ.fog})`); g.addColorStop(0.6, `rgba(170,200,190,${0.6 * HZ.fog})`); g.addColorStop(1, "rgba(170,200,190,0)");
      ctx.save(); ctx.translate(p.x, p.y); ctx.scale(1, 0.5); ctx.fillStyle = g; ctx.fillRect(-R, -R, R * 2, R * 2); ctx.restore();
    }
  }
