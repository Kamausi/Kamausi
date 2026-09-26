  // ───────────────────────── the aquatic environment (v58) ─────────────────────────
  // One system for every map with water in it, dressed by the map's own biome (src/maps/*.json: aquatic). Two kinds:
  //   submerged · the Drowned Theater: the camera is under water. Clear blue-teal attenuation that thickens with
  //     distance, light shafts slanting down from a surface you never see, caustics wavering over the sand, the seats and
  //     the walls, marine snow and rising bubbles drifting in the current, and far off, where there would be sky, the
  //     slow silhouettes of big things passing.
  //   surface · the Black Marsh: the camera is above murky water. What lives in it shows as shapes under the surface,
  //     and as the rings they leave on it; what lives on it (frogs on the pads, a snapper's head, a gator's eyes,
  //     skaters and dragonflies touching down) sits and moves on it.
  // Five layers, as the biome sets them: the water (surface or column), the animals, the vegetation (on the track,
  // swaying in the flow: 06j_aqua_props.js), the bed (the same), and the light. Everything is quiet most of the time,
  // with something moving somewhere now and then; near things are darker and larger, deep ones more muted, closer to
  // the water's own colour. The animals behave: fish school and wander between the seats and scatter when Morty goes
  // by; crabs crawl sideways and dig in; eels come out of their holes and go back; jellyfish drift; now and then a big
  // fish passes close to the camera. They wander on the flow (06i_flow.js) and steer themselves; none of it ever
  // touches the game: nothing here is hit, and every swimmer keeps out of the ring's cone and the throw's lane.
  const AQ = { map: -1, poke: null, B: null, fauna: [], snow: [], bubbles: [], far: [], rip: [], fg: null, fgT: 9, lastD: 0, rnd: null, tile: null, pats: null, stir: 0 };
  function aquaBiome() { const m = MAP_DATA[sceneMap]; return (m && m.aquatic) || null; }
  const aquaDrift = () => (AQ.B && AQ.B.water.current) || [0, 0];
  const aquaSub = () => !!(AQ.B && AQ.B.kind === "submerged");
  const aqN = n => Math.max(0, Math.round(n * (QUALITY.level < 0.75 ? 0.5 : 1)));
  const aqCol = hex => rgbOf(hex).split(",").map(Number);
  // a swimmer's keep-out: the ring's cone from the launcher out past the ring, at the heights a throw flies
  const aqClear = (x, y, z) => { const half = 2.1 + Math.max(0, z) * 0.1; return Math.abs(x) < half && y > 0.5 && y < 4.6; };
  // steering pushes a swimmer out of the ring's cone; this makes sure: never inside it, whatever the flow did
  function aqKeepOut(c) { if (aqClear(c.x, c.y, c.z)) c.x = Math.sign(c.x || 1) * (2.12 + Math.max(0, c.z) * 0.1); if (c.m) for (const m of c.m) if (aqClear(m.x, m.y, m.z)) m.x = Math.sign(m.x || c.x || 1) * (2.12 + Math.max(0, m.z) * 0.1); }
  function aquaSetup() {
    AQ.map = sceneMap; AQ.B = aquaBiome(); AQ.fauna = []; AQ.snow = []; AQ.bubbles = []; AQ.far = []; AQ.rip = []; AQ.fg = null; AQ.fgT = 9; AQ.lastD = TRAVEL.D || 0; AQ.stir = 0;
    const B = AQ.B; if (!B) return;
    const r = (AQ.rnd = mulberry32(3301 + sceneMap * 97)), F = B.fauna || {};
    for (const [kind, n] of Object.entries(F)) for (let i = 0; i < aqN(n); i++) AQ.fauna.push(aquaSpawn(kind, r, true));
    if (B.kind === "submerged") {
      for (let i = 0; i < aqN(B.water.snow || 0); i++) AQ.snow.push({ x: (r() * 2 - 1) * 9, y: r() * 6, z: 2 + r() * 30, s: 0.5 + r(), ph: r() * TAU });
      for (let i = 0; i < aqN(B.water.bubbles || 0); i++) AQ.bubbles.push(aquaBubble(r, true));
      for (const kind of B.far || []) AQ.far.push({ kind, x: r(), y: 0.15 + r() * 0.5, v: (r() < 0.5 ? -1 : 1) * (0.006 + r() * 0.01), s: 0.6 + r() * 0.8, ph: r() * TAU });
    } else for (let i = 0; i < aqN(B.water.bubbles || 0); i++) AQ.bubbles.push({ x: (r() * 2 - 1) * 10, z: 3 + r() * 30, t: r() * 6, every: 3 + r() * 7 });
  }
  // a creature, somewhere it belongs: first (spread through the whole scene) or later (coming up out of the distance)
  function aquaSpawn(kind, r, first) {
    const z = first ? 3 + r() * 34 : 30 + r() * 10, side = r() < 0.5 ? -1 : 1, out = x => side * (2.8 + x);
    const c = { kind, x: out(r() * 7), y: 0, z, vx: 0, vy: 0, vz: 0, ph: r() * TAU, seed: r() * 100, s: 1, st: "idle", t: r() * 5, dir: -side };
    switch (kind) {
      case "school": { const n = 5 + ((r() * 4) | 0); c.y = 1 + r() * 2.8; c.s = 0.16 + r() * 0.08; c.m = Array.from({ length: n }, () => ({ ox: (r() - 0.5) * 1.2, oy: (r() - 0.5) * 0.6, oz: (r() - 0.5) * 1.2, x: 0, y: 0, z: 0, ph: r() * TAU })); c.col = ["#E8B04A", "#8AB8C8", "#D8D0B0"][(r() * 3) | 0]; break; }
      case "fish": c.y = 0.6 + r() * 3; c.s = 0.3 + r() * 0.25; c.col = ["#D8683A", "#6A9AB0", "#C8A040", "#9A6AA8"][(r() * 4) | 0]; break;
      case "crab": c.x = (r() * 2 - 1) * 6; c.s = 0.22 + r() * 0.1; c.st = "walk"; c.hide = 0; break;
      case "eel": c.x = out(0.4 + r() * 4); c.y = 0.15 + r() * 0.4; c.s = 0.5 + r() * 0.3; c.ext = 0; c.st = "in"; c.t = 2 + r() * 6; break;
      case "jelly": c.y = 2.5 + r() * 3.5; c.s = 0.28 + r() * 0.2; c.col = ["#E8B8E0", "#B8D8F0", "#F0D0A8"][(r() * 3) | 0]; break;
      case "turtle": c.y = 2.6 + r() * 1.8; c.z = 12 + r() * 14; c.s = 0.7; c.x = side * 14; c.dir = -side; c.st = first ? "away" : "swim"; c.t = 8 + r() * 20; break;
      case "octopus": c.x = out(1 + r() * 5); c.s = 0.4; c.hue = r(); break;
      case "shrimp": c.x = (r() * 2 - 1) * 7; c.y = 0.05; c.s = 0.08; break;
      // the marsh
      case "minnows": { const n = 6 + ((r() * 5) | 0); c.s = 0.09; c.m = Array.from({ length: n }, () => ({ ox: (r() - 0.5) * 0.9, oz: (r() - 0.5) * 0.9, x: 0, z: 0, ph: r() * TAU })); break; }
      case "bigfish": c.s = 0.5 + r() * 0.3; c.t = 3 + r() * 8; break;
      case "tadpoles": c.x = out(r() * 2); c.s = 0.05; c.m = Array.from({ length: 7 }, () => ({ ox: (r() - 0.5) * 0.6, oz: (r() - 0.5) * 0.6, ph: r() * TAU })); break;
      case "frog": c.x = out(0.2 + r() * 3); c.z = 4 + r() * 22; c.s = 0.26; c.st = "sit"; c.hx = c.x; c.hz = c.z; c.t = 6 + r() * 14; break;
      case "snapper": c.x = out(1 + r() * 5); c.z = 9 + r() * 14; c.s = 0.3; c.st = "down"; c.t = 3 + r() * 9; c.up = 0; break;
      case "swamp-eel": c.s = 0.7; break;
      case "gator": c.x = out(3 + r() * 8); c.z = 18 + r() * 16; c.s = 1; c.dir = -side; break;
      case "strider": c.x = (r() * 2 - 1) * 8; c.z = 3 + r() * 18; c.s = 0.08; break;
      case "dragonfly": c.x = (r() * 2 - 1) * 6; c.y = 0.5 + r(); c.z = 3 + r() * 14; c.s = 0.12; break;
    }
    return c;
  }
  const aquaBubble = (r, first) => ({ x: (r() * 2 - 1) * 8, y: first ? r() * 6 : 0, z: 3 + r() * 26, v: 0.5 + r() * 0.6, s: 0.02 + r() * 0.04, ph: r() * TAU });
  // what's frightening right now: the skull in the water near it, or Morty going by (the world travelling)
  function aquaThreat(c) {
    if (AQ.poke && Math.hypot(AQ.poke.x - c.x, AQ.poke.y - c.y, AQ.poke.z - c.z) < 3) return AQ.poke;   // (the spec's finger in the water: 99_dev_hooks.js)
    if (TRAVEL.v > 0.6 && Math.abs(c.x) < 6 && c.z < 14) return { x: 0, y: START_Y, z: 0, k: 1 };
    const s = skull.pos; if (game.state === "flying" && skull.alpha > 0 && Math.hypot(s.x - c.x, s.y - c.y, s.z - c.z) < 2.6) return { x: s.x, y: s.y, z: s.z, k: 1.4 };
    return null;
  }
  function aquaRipple(x, z, s = 0.5) { if (AQ.rip.length < 14) AQ.rip.push({ x, z, t: 0, s }); }
  function updateAquatic(dt) {
    if (AQ.map !== sceneMap) aquaSetup();
    const B = AQ.B; if (!B || dt <= 0) return;
    const t = world.t, r = AQ.rnd, dD = (TRAVEL.D || 0) - AQ.lastD; AQ.lastD = TRAVEL.D || 0;
    const jump = Math.abs(dD) > 12 || dD < -0.01;   // (a new run, a reload: everything starts over, spread through the scene)
    if (jump) { const m = AQ.map; AQ.map = -1; aquaSetup(); AQ.map = m; return; }
    const still = reduceMotion ? 0.4 : 1, dr = aquaDrift();
    for (let i = 0; i < AQ.fauna.length; i++) {
      const c = AQ.fauna[i]; c.z -= dD; c.t -= dt; c.ph += dt * (2 + c.s);
      if (c.z < 1.4 || c.z > 46) { AQ.fauna[i] = aquaSpawn(c.kind, r, false); continue; }
      aquaStep(c, dt * still, t, dr);
    }
    for (const p of AQ.snow) {   // marine snow: carried by the current, wrapping round the volume
      p.z -= dD; const C = current(p.x, p.y, p.z, t, dr); p.x += C.x * dt * still; p.y += (C.y - 0.03) * dt * still; p.z += C.z * dt * still;
      if (p.z < 1.5) p.z += 30; if (p.z > 32) p.z -= 30; if (p.x > 9) p.x -= 18; if (p.x < -9) p.x += 18; if (p.y < 0) p.y += 6; if (p.y > 6) p.y -= 6;
    }
    if (aquaSub()) for (let i = 0; i < AQ.bubbles.length; i++) {   // bubbles: up, wobbling on the flow, a little bigger as they rise
      const b = AQ.bubbles[i]; b.z -= dD; const W = curl(b.x * 2 + b.ph, b.y * 2, t * 0.8, 1, 1);
      b.y += b.v * dt * still; b.x += (W.x * 0.25 + dr[0]) * dt * still; b.s *= 1 + dt * 0.04;
      if (b.y > 7 || b.z < 1.5) AQ.bubbles[i] = aquaBubble(r, false);
    }
    else for (const b of AQ.bubbles) { b.z -= dD; b.t -= dt; if (b.z < 2) b.z += 30; if (b.t < 0) { b.t = b.every; aquaRipple(b.x, b.z, 0.25); } }   // a bubble up from the mud: a small ring
    for (const R of AQ.rip) R.t += dt; AQ.rip = AQ.rip.filter(R => R.t < 1.8);
    // now and then something big passes close to the camera, low and to one side (never across the ring)
    AQ.fgT -= dt;
    if (!AQ.fg && AQ.fgT < 0 && B.kind === "submerged" && game.state !== "flying" && !(aim && aim.active)) { const sd = r() < 0.5 ? -1 : 1; AQ.fg = { x: sd < 0 ? -0.25 : 1.25, v: -sd * (0.1 + r() * 0.06), y: 0.8 + r() * 0.12, s: 0.9 + r() * 0.5, ph: 0 }; AQ.fgT = 16 + r() * 18; }
    if (AQ.fg) { AQ.fg.x += AQ.fg.v * dt * still; AQ.fg.ph += dt * 6; if (AQ.fg.x < -0.4 || AQ.fg.x > 1.4) AQ.fg = null; }
    for (const f of AQ.far) { f.x += f.v * dt * still; if (f.x < -0.3) f.x = 1.3; if (f.x > 1.3) f.x = -0.3; f.ph += dt; }
  }
  function aquaStep(c, dt, t, dr) {
    const th = aquaThreat(c), W = wander(c.seed, t);
    switch (c.kind) {
      case "school": case "fish": {
        let ax = W.x * 0.9 + dr[0] * 0.6, ay = W.y * 0.35, az = (W.x - W.y) * 0.3;
        if (aqClear(c.x, c.y, c.z) || Math.abs(c.x) < 2.6) ax += Math.sign(c.x || 1) * 2.2;   // out of the ring's cone and the lane
        if (Math.abs(c.x) > 11) ax -= Math.sign(c.x) * 0.8;
        if (c.y < 0.5) ay += 0.8; if (c.y > 4.4) ay -= 0.8;
        if (th) { const dx = c.x - th.x, dy = c.y - th.y, dz = c.z - th.z, d = Math.hypot(dx, dy, dz) || 1; ax += (dx / d) * 9 * th.k; ay += (dy / d) * 3; az += (dz / d) * 5; c.st = "scatter"; c.t = 1.6; }
        else if (c.st === "scatter" && c.t < 0) c.st = "idle";
        const max = c.st === "scatter" ? 3.2 : 0.7;
        c.vx += ax * dt; c.vy += ay * dt; c.vz += az * dt; const sp = Math.hypot(c.vx, c.vy, c.vz); if (sp > max) { c.vx *= max / sp; c.vy *= max / sp; c.vz *= max / sp; }
        c.vx *= 1 - dt * 0.4; c.vy *= 1 - dt * 0.8; c.vz *= 1 - dt * 0.4;
        c.x += c.vx * dt; c.y += c.vy * dt; c.z += c.vz * dt; if (Math.abs(c.vx) > 0.05) c.dir = Math.sign(c.vx);
        aqKeepOut(c);
        if (c.m) for (const m of c.m) {   // the school: each follows its place in it, a beat behind, bursting out when frightened
          const spread = c.st === "scatter" ? 2.6 : 1, tx = c.x + m.ox * spread + Math.sin(t * 1.3 + m.ph) * 0.12, ty = c.y + m.oy * spread, tz = c.z + m.oz * spread;
          const k = 1 - Math.exp(-dt * (c.st === "scatter" ? 6 : 2.4)); m.x += (tx - m.x) * k; m.y += (ty - m.y) * k; m.z += (tz - m.z) * k;
          if (!m.x && !m.z) { m.x = tx; m.y = ty; m.z = tz; }
        }
        aqKeepOut(c);
        break;
      }
      case "crab": {   // sideways, in fits and starts; dug in when frightened, out again after a while
        if (th && c.st !== "hide") { c.st = "hide"; c.t = 3 + AQ.rnd() * 3; }
        if (c.st === "hide") { c.hide = Math.min(1, c.hide + dt * 3); if (c.t < 0 && !th) c.st = "walk"; }
        else { c.hide = Math.max(0, c.hide - dt * 1.2); if (c.t < 0) { c.st = c.st === "walk" ? "rest" : "walk"; c.t = 1 + AQ.rnd() * 3; if (c.st === "walk") c.dir = AQ.rnd() < 0.5 ? -1 : 1; } if (c.st === "walk") c.x += c.dir * 0.35 * dt; }
        break;
      }
      case "eel": {   // out of its hole, a sway, back in; straight back in if something comes near
        if (th) c.st = "in";
        if (c.st === "in") { c.ext = Math.max(0, c.ext - dt * 2); if (c.t < 0 && !th) { c.st = "out"; c.t = 3 + AQ.rnd() * 4; } }
        else { c.ext = Math.min(1, c.ext + dt * 0.5); if (c.t < 0) { c.st = "in"; c.t = 4 + AQ.rnd() * 8; } }
        break;
      }
      case "jelly": {   // adrift: the current and a slow pulse upward, sinking back between
        const C = current(c.x, c.y, c.z, t, dr), pulse = Math.max(0, Math.sin(c.ph * 0.5)) * 0.25;
        c.x += (C.x + W.x * 0.08) * dt; c.y += (C.y * 0.5 + pulse - 0.08) * dt; c.z += C.z * dt;
        if (c.y < 2) c.y += dt * 0.3; if (c.y > 6) c.y -= dt * 0.3; aqKeepOut(c);
        break;
      }
      case "turtle": {   // a slow glide across, every so often
        if (c.st === "away") { if (c.t < 0) { c.st = "swim"; c.x = -c.dir * 14; } break; }
        c.x += c.dir * 0.55 * dt; c.y += Math.sin(c.ph * 0.2) * 0.05 * dt;
        if (Math.abs(c.x) > 14.5 && Math.sign(c.x) === c.dir) { c.st = "away"; c.t = 18 + AQ.rnd() * 26; c.dir = -c.dir; }
        break;
      }
      case "octopus": { if (th && c.st !== "jet") { c.st = "jet"; c.t = 1.2; c.vx = Math.sign(c.x) * 2.5; } if (c.st === "jet") { c.x += c.vx * dt; c.vx *= 1 - dt * 1.5; if (c.t < 0) c.st = "idle"; } c.hue += dt * 0.05; break; }
      case "shrimp": { if (c.t < 0) { c.t = 0.6 + AQ.rnd() * 2.5; c.vx = (AQ.rnd() - 0.5) * 1.6; c.vz = (AQ.rnd() - 0.5) * 1.2; } c.x += c.vx * dt; c.z += c.vz * dt; c.vx *= 1 - dt * 4; c.vz *= 1 - dt * 4; c.y = 0.05 + Math.max(0, c.vx * c.vx * 0.05); break; }
      // the marsh: under the surface and on it
      case "minnows": case "bigfish": case "swamp-eel": {
        let ax = W.x * 0.8 + dr[0] * 0.5, az = W.y * 0.5; if (Math.abs(c.x) < 1.2 && c.z < WALK_END + 0.3) ax += Math.sign(c.x || 1) * 2;
        if (Math.abs(c.x) > 10) ax -= Math.sign(c.x);
        if (th) { const dx = c.x - th.x, dz = c.z - th.z, d = Math.hypot(dx, dz) || 1; ax += (dx / d) * 7; az += (dz / d) * 4; if (c.st !== "scatter") aquaRipple(c.x, c.z, 0.3); c.st = "scatter"; c.t = 1.4; }
        else if (c.st === "scatter" && c.t < 0) c.st = "idle";
        const max = c.st === "scatter" ? 2.6 : c.kind === "bigfish" ? 0.5 : 0.8;
        c.vx += ax * dt; c.vz += az * dt; const sp = Math.hypot(c.vx, c.vz); if (sp > max) { c.vx *= max / sp; c.vz *= max / sp; }
        c.x += c.vx * dt; c.z += c.vz * dt; if (Math.abs(c.vx) > 0.04) c.dir = Math.sign(c.vx);
        if (c.kind === "bigfish" && c.t < 0) { c.t = 5 + AQ.rnd() * 10; aquaRipple(c.x, c.z, 0.45); }   // it comes up for something: a boil on the surface
        if (c.m) for (const m of c.m) { const sp2 = c.st === "scatter" ? 2.4 : 1, k = 1 - Math.exp(-dt * 3); m.x += (c.x + m.ox * sp2 - m.x) * k; m.z += (c.z + m.oz * sp2 - m.z) * k; if (!m.x && !m.z) { m.x = c.x; m.z = c.z; } }
        break;
      }
      case "tadpoles": for (const m of c.m) m.ph += dt * 5; c.x += W.x * 0.05 * dt; break;
      case "frog": {   // on its pad; into the water when frightened (a splash), back up on a pad a while later
        if (c.st === "sit" && c.t < 0 && !th) { c.t = 8 + AQ.rnd() * 14; if (AQ.rnd() < 0.35) c.hop = 1; }   // (mostly it just sits)
        if (c.st === "sit" && (th || c.hop)) { c.hop = 0; c.st = "jump"; c.t = 0.55; c.jx = c.x + Math.sign(c.x) * (0.6 + AQ.rnd()); c.jz = c.z + (AQ.rnd() - 0.5); c.fx = c.x; c.fz = c.z; }
        if (c.st === "jump") { const u = 1 - c.t / 0.55; c.x = c.fx + (c.jx - c.fx) * u; c.z = c.fz + (c.jz - c.fz) * u; c.y = Math.sin(Math.min(1, u) * Math.PI) * 0.5; if (c.t < 0) { c.st = "under"; c.t = 3 + AQ.rnd() * 4; c.y = 0; aquaRipple(c.x, c.z, 0.5); } }
        if (c.st === "under" && c.t < 0) { c.st = "sit"; c.x = c.hx; c.z = c.hz; c.t = 4 + AQ.rnd() * 6; aquaRipple(c.x, c.z, 0.3); }
        break;
      }
      case "snapper": {   // the head comes up, looks about, goes down: a ring each way
        if (c.st === "down" && c.t < 0 && !th) { c.st = "up"; c.t = 3 + AQ.rnd() * 3; aquaRipple(c.x, c.z, 0.35); }
        else if (c.st === "up" && (c.t < 0 || th)) { c.st = "down"; c.t = 6 + AQ.rnd() * 10; aquaRipple(c.x, c.z, 0.3); }
        c.up += ((c.st === "up" ? 1 : 0) - c.up) * (1 - Math.exp(-dt * 3));
        break;
      }
      case "gator": { c.x += c.dir * 0.18 * dt; if (Math.abs(c.x) > 16) c.dir = -Math.sign(c.x); if (Math.abs(c.x) < 3 && c.z < 16) c.x += Math.sign(c.x || 1) * dt; break; }
      case "strider": { if (c.t < 0) { c.t = 0.4 + AQ.rnd() * 1.6; c.vx = (AQ.rnd() - 0.5) * 1.4; c.vz = (AQ.rnd() - 0.5) * 1.2; if (AQ.rnd() < 0.3) aquaRipple(c.x, c.z, 0.12); } c.x += c.vx * dt; c.z += c.vz * dt; c.vx *= 1 - dt * 2.5; c.vz *= 1 - dt * 2.5; if (Math.abs(c.x) < 1 && c.z < WALK_END) c.x += Math.sign(c.x || 1) * dt; break; }
      case "dragonfly": {   // darting on the flow, dipping to touch the water
        const V = wander(c.seed, t, 1.2); c.x += V.x * 1.6 * dt; c.z += V.y * 1.2 * dt; c.y = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(c.ph * 0.4));
        if (c.y < 0.43 && c.t < 0) { c.t = 1.5; aquaRipple(c.x, c.z, 0.1); } if (Math.abs(c.x) > 9) c.x -= Math.sign(c.x) * dt * 2; if (aqClear(c.x, c.y, c.z)) c.x += Math.sign(c.x || 1) * dt * 1.5;
        break;
      }
    }
  }
  // ── drawing: a colour for a thing at depth z (near: its own and darker-inked; deep: toward the water's colour)
  function aqTone(rgb, z) {
    const w = AQ.B.water, far = aqCol(w.deep || "#0A2A3A"), k = clamp((z - 4) / (AQ.B.kind === "submerged" ? 34 : 40), 0, 0.85) * (AQ.B.kind === "submerged" ? w.murk || 1 : 0.7);
    return `rgb(${(rgb[0] + (far[0] - rgb[0]) * k) | 0},${(rgb[1] + (far[1] - rgb[1]) * k) | 0},${(rgb[2] + (far[2] - rgb[2]) * k) | 0})`;
  }
  const aqInk = z => `rgba(18,14,12,${clamp(1 - (z - 4) / 22, 0.1, 0.95)})`;
  function aqFish(x, y, z, s, dir, ph, col, lw = true) {   // a 1930s cartoon fish: a fat body, a fan tail, a pie-cut eye
    const p = project(x, y, z), L = s * p.s; if (L < 1.5 || p.x < -L * 2 || p.x > W + L * 2) return;
    const wag = Math.sin(ph * 2.2) * 0.35;
    ctx.save(); ctx.translate(p.x, p.y); ctx.scale(dir < 0 ? -1 : 1, 1); ctx.lineJoin = "round";
    ctx.fillStyle = aqTone(aqCol(col), z); ctx.strokeStyle = aqInk(z); ctx.lineWidth = Math.max(0.8, L * 0.06);
    ctx.beginPath(); ctx.moveTo(-L * 0.45, 0); ctx.lineTo(-L * 0.85, -L * (0.28 + wag * 0.3)); ctx.lineTo(-L * 0.78, 0); ctx.lineTo(-L * 0.85, L * (0.28 - wag * 0.3)); ctx.closePath(); ctx.fill(); if (lw) ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, 0, L * 0.5, L * 0.3, 0, 0, TAU); ctx.fill(); if (lw) ctx.stroke();
    if (L > 5) {
      ctx.fillStyle = "rgba(255,255,255,.18)"; ctx.beginPath(); ctx.ellipse(L * 0.05, -L * 0.1, L * 0.3, L * 0.09, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = "#F2EAD8"; ctx.beginPath(); ctx.arc(L * 0.28, -L * 0.06, L * 0.1, 0, TAU); ctx.fill();
      ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(L * 0.3, -L * 0.06); ctx.arc(L * 0.3, -L * 0.06, L * 0.06, 0.6, TAU - 0.2); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = aqInk(z); ctx.beginPath(); ctx.arc(L * 0.08, 0, L * 0.18, -1.1, 1.1); ctx.stroke();
    }
    ctx.restore();
  }
  function drawAquaThing(c) {
    switch (c.kind) {
      case "school": for (const m of c.m) aqFish(m.x, m.y, m.z, c.s, c.dir, c.ph + m.ph, c.col, c.z < 14); break;
      case "fish": aqFish(c.x, c.y, c.z, c.s, c.dir, c.ph, c.col); break;
      case "crab": {
        const p = project(c.x, 0, c.z), L = c.s * p.s * (1 - c.hide * 0.7); if (L < 1.5) return;
        ctx.save(); ctx.translate(p.x, p.y + c.hide * L * 0.5); ctx.strokeStyle = aqInk(c.z); ctx.lineWidth = Math.max(0.8, L * 0.07); ctx.fillStyle = aqTone([206, 86, 52], c.z);
        const step = c.st === "walk" ? Math.sin(c.ph * 6) * 0.1 : 0;
        for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(sd * L * 0.3, -L * 0.1); ctx.lineTo(sd * L * (0.6 + i * 0.1), -L * (0.25 - (i % 2 ? step : -step))); ctx.lineTo(sd * L * (0.7 + i * 0.12), 0); ctx.stroke(); }
        ctx.beginPath(); ctx.ellipse(0, -L * 0.2, L * 0.45, L * 0.26, 0, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
        for (const sd of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sd * L * 0.6, -L * 0.52, L * 0.16, L * 0.12, sd * 0.4 + Math.sin(c.ph * 3) * 0.1, 0, TAU); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(sd * L * 0.12, -L * 0.42); ctx.lineTo(sd * L * 0.14, -L * 0.62); ctx.stroke(); ctx.fillStyle = "#F2EAD8"; ctx.beginPath(); ctx.arc(sd * L * 0.14, -L * 0.66, L * 0.06, 0, TAU); ctx.fill(); ctx.fillStyle = aqTone([206, 86, 52], c.z); }
        ctx.restore(); break;
      }
      case "eel": {
        const p = project(c.x, c.y, c.z), L = c.s * p.s; if (L < 2 || c.ext < 0.03) { if (L >= 2) { ctx.fillStyle = "rgba(10,8,8,.7)"; ctx.beginPath(); ctx.ellipse(p.x, p.y, L * 0.12, L * 0.08, 0, 0, TAU); ctx.fill(); } return; }
        const n = 8, len = L * c.ext, sd = -Math.sign(c.x || 1);
        ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = aqInk(c.z); ctx.lineWidth = L * 0.16 + 2;
        const pts = []; for (let i = 0; i <= n; i++) { const u = i / n; pts.push([p.x + sd * len * u * 0.9, p.y - len * u * 0.35 + Math.sin(c.ph * 1.4 - u * 5) * L * 0.08 * u]); }
        ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
        ctx.strokeStyle = aqTone([96, 110, 60], c.z); ctx.lineWidth = L * 0.16; ctx.stroke();
        const [hx, hy] = pts[n]; ctx.fillStyle = aqTone([110, 124, 70], c.z); ctx.strokeStyle = aqInk(c.z); ctx.lineWidth = Math.max(0.8, L * 0.03);
        ctx.beginPath(); ctx.ellipse(hx, hy, L * 0.13, L * 0.09, 0, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#F2EAD8"; ctx.beginPath(); ctx.arc(hx + sd * L * 0.03, hy - L * 0.03, L * 0.03, 0, TAU); ctx.fill();
        ctx.fillStyle = "rgba(10,8,8,.8)"; ctx.beginPath(); ctx.ellipse(p.x, p.y + L * 0.02, L * 0.12, L * 0.07, 0, 0, TAU); ctx.fill();
        ctx.restore(); break;
      }
      case "jelly": {
        const p = project(c.x, c.y, c.z), L = c.s * p.s; if (L < 2) return; const pl = 1 + Math.sin(c.ph * 0.5) * 0.12;
        ctx.save(); ctx.translate(p.x, p.y); const col = aqCol(c.col), a = clamp(1 - c.z / 40, 0.25, 0.8);
        ctx.strokeStyle = `rgba(${col},${a * 0.6})`; ctx.lineWidth = Math.max(0.7, L * 0.03);
        for (let i = 0; i < 5; i++) { const x = (i - 2) * L * 0.14; ctx.beginPath(); ctx.moveTo(x, 0); for (let j = 1; j <= 5; j++) ctx.lineTo(x + Math.sin(c.ph + j + i) * L * 0.06, j * L * 0.2); ctx.stroke(); }
        ctx.fillStyle = `rgba(${col},${a * 0.55})`; ctx.strokeStyle = `rgba(18,14,12,${a * 0.6})`; ctx.beginPath(); ctx.ellipse(0, 0, L * 0.4 * pl, L * 0.32 / pl, 0, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = `rgba(255,255,255,${a * 0.35})`; ctx.beginPath(); ctx.ellipse(-L * 0.12, -L * 0.18, L * 0.1, L * 0.05, -0.4, 0, TAU); ctx.fill();
        ctx.restore(); break;
      }
      case "turtle": {
        if (c.st === "away") return; const p = project(c.x, c.y, c.z), L = c.s * p.s; if (L < 3) return; const fl = Math.sin(c.ph * 0.8) * 0.5;
        ctx.save(); ctx.translate(p.x, p.y); ctx.scale(c.dir, 1); ctx.strokeStyle = aqInk(c.z); ctx.lineWidth = Math.max(0.8, L * 0.04); ctx.fillStyle = aqTone([96, 120, 70], c.z);
        for (const [fx, fy, a] of [[0.25, 0.1, fl], [-0.3, 0.1, -fl]]) { ctx.save(); ctx.translate(fx * L, fy * L); ctx.rotate(a); ctx.beginPath(); ctx.ellipse(0, L * 0.15, L * 0.08, L * 0.22, 0.3, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore(); }
        ctx.beginPath(); ctx.ellipse(L * 0.5, -L * 0.02, L * 0.12, L * 0.09, 0, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = aqTone([122, 96, 58], c.z); ctx.beginPath(); ctx.ellipse(0, 0, L * 0.42, L * 0.2, 0, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = `rgba(40,30,16,.5)`; ctx.beginPath(); ctx.moveTo(-L * 0.15, -L * 0.18); ctx.lineTo(-L * 0.1, 0); ctx.moveTo(L * 0.15, -L * 0.18); ctx.lineTo(L * 0.1, 0); ctx.stroke();
        ctx.restore(); break;
      }
      case "octopus": {
        const p = project(c.x, 0, c.z), L = c.s * p.s; if (L < 2) return; const hue = 330 + Math.sin(c.hue * TAU) * 30;
        ctx.save(); ctx.translate(p.x, p.y); ctx.strokeStyle = aqInk(c.z); ctx.lineWidth = Math.max(0.8, L * 0.05); ctx.fillStyle = `hsl(${hue},45%,${clamp(48 - c.z, 22, 46)}%)`;
        for (let i = 0; i < 8; i++) { const a = Math.PI + (i / 7) * Math.PI, cx = Math.cos(a) * L * 0.25; ctx.beginPath(); ctx.moveTo(cx, -L * 0.1); ctx.quadraticCurveTo(cx + Math.cos(a) * L * 0.3, L * 0.05, cx + Math.cos(a) * L * 0.4 + Math.sin(c.ph + i) * L * 0.08, -L * 0.02); ctx.lineWidth = L * 0.07; ctx.stroke(); }
        ctx.lineWidth = Math.max(0.8, L * 0.05); ctx.beginPath(); ctx.ellipse(0, -L * 0.35, L * 0.28, L * 0.32, 0, 0, TAU); ctx.fill(); ctx.stroke();
        for (const sd of [-1, 1]) { ctx.fillStyle = "#F2EAD8"; ctx.beginPath(); ctx.arc(sd * L * 0.1, -L * 0.3, L * 0.07, 0, TAU); ctx.fill(); ctx.fillStyle = INK; ctx.fillRect(sd * L * 0.1 - L * 0.04, -L * 0.31, L * 0.08, L * 0.025); }
        ctx.restore(); break;
      }
      case "shrimp": { const p = project(c.x, c.y, c.z), L = c.s * p.s; if (L < 1.2) return; ctx.strokeStyle = aqTone([232, 140, 110], c.z); ctx.lineWidth = Math.max(1, L * 0.3); ctx.lineCap = "round"; ctx.beginPath(); ctx.arc(p.x, p.y - L * 0.3, L * 0.5, Math.PI * 0.2, Math.PI * 1.1); ctx.stroke(); break; }
      case "frog": {
        if (c.st === "under") return; const p = project(c.x, c.y, c.z), L = c.s * p.s; if (L < 2) return; const th = c.st === "sit" ? Math.max(0, Math.sin(c.ph * 1.5)) * 0.08 : 0;
        ctx.save(); ctx.translate(p.x, p.y); ctx.strokeStyle = aqInk(c.z); ctx.lineWidth = Math.max(0.8, L * 0.06); ctx.fillStyle = aqTone([96, 140, 60], c.z);
        if (c.st === "sit") {   // its own pad under it
          ctx.fillStyle = aqTone([70, 110, 52], c.z); ctx.beginPath(); ctx.ellipse(0, 0, L * 0.75, L * 0.2, 0, 0.25, TAU - 0.05); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.strokeStyle = "rgba(200,230,180,.18)"; ctx.beginPath(); ctx.ellipse(0, 0, L * 0.5, L * 0.12, 0, Math.PI * 1.1, Math.PI * 1.8); ctx.stroke(); ctx.strokeStyle = aqInk(c.z);
        }
        if (c.st === "jump") { ctx.rotate(Math.sign(c.jx - c.fx) * 0.6); ctx.beginPath(); ctx.ellipse(0, -L * 0.3, L * 0.3, L * 0.18, 0, 0, TAU); ctx.fill(); ctx.stroke(); for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(-L * 0.2, -L * 0.25); ctx.lineTo(-L * 0.6, -L * (0.1 + sd * 0.12)); ctx.stroke(); } ctx.restore(); break; }
        ctx.beginPath(); ctx.ellipse(0, -L * 0.25, L * 0.36, L * 0.25, 0, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = aqTone([200, 210, 150], c.z); ctx.beginPath(); ctx.ellipse(0, -L * 0.08 + th * L, L * (0.18 + th), L * (0.1 + th), 0, 0, TAU); ctx.fill();
        for (const sd of [-1, 1]) { ctx.fillStyle = aqTone([96, 140, 60], c.z); ctx.beginPath(); ctx.arc(sd * L * 0.18, -L * 0.5, L * 0.11, 0, TAU); ctx.fill(); ctx.stroke(); ctx.fillStyle = "#F2EAD8"; ctx.beginPath(); ctx.arc(sd * L * 0.18, -L * 0.52, L * 0.06, 0, TAU); ctx.fill(); ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(sd * L * 0.19, -L * 0.51, L * 0.03, 0, TAU); ctx.fill(); }
        ctx.restore(); break;
      }
      case "snapper": {
        if (c.up < 0.05) return; const p = project(c.x, 0, c.z), L = c.s * p.s; if (L < 2) return;
        ctx.save(); ctx.translate(p.x, p.y); ctx.beginPath(); ctx.rect(-L, -L * 2, L * 2, L * 2); ctx.clip(); ctx.translate(0, L * 0.45 * (1 - c.up));
        ctx.strokeStyle = aqInk(c.z); ctx.lineWidth = Math.max(0.8, L * 0.06); ctx.fillStyle = aqTone([90, 96, 60], c.z);
        ctx.beginPath(); ctx.moveTo(-L * 0.12, 0); ctx.quadraticCurveTo(-L * 0.16, -L * 0.4, L * 0.02, -L * 0.42); ctx.quadraticCurveTo(L * 0.3, -L * 0.4, L * 0.28, -L * 0.28); ctx.lineTo(L * 0.1, -L * 0.22); ctx.lineTo(L * 0.12, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#E8C040"; ctx.beginPath(); ctx.arc(L * 0.05, -L * 0.33, L * 0.04, 0, TAU); ctx.fill();
        ctx.restore(); break;
      }
      case "gator": {   // just the eyes and the snout's knobs above the water, and the wake
        const p = project(c.x, 0, c.z), L = c.s * p.s; if (L < 3) return; const d = c.dir;
        ctx.save(); ctx.translate(p.x, p.y); ctx.strokeStyle = `rgba(200,220,200,${clamp(0.35 - c.z / 120, 0.08, 0.3)})`; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(d * L * 0.2, 0); ctx.lineTo(-d * L * 1.4, -L * 0.1); ctx.moveTo(d * L * 0.2, 0); ctx.lineTo(-d * L * 1.4, L * 0.1); ctx.stroke();
        ctx.fillStyle = aqTone([60, 72, 44], c.z); ctx.strokeStyle = aqInk(c.z);
        for (const ex of [-0.15, 0.05]) { ctx.beginPath(); ctx.ellipse(d * L * ex, -L * 0.04, L * 0.07, L * 0.05, 0, Math.PI, 0); ctx.fill(); ctx.stroke(); }
        ctx.fillStyle = "#E8C040"; for (const ex of [-0.15, 0.05]) { ctx.beginPath(); ctx.arc(d * L * ex, -L * 0.06, L * 0.018, 0, TAU); ctx.fill(); }
        ctx.fillStyle = aqTone([60, 72, 44], c.z); ctx.beginPath(); ctx.ellipse(d * L * 0.5, -L * 0.01, L * 0.05, L * 0.025, 0, Math.PI, 0); ctx.fill();
        ctx.restore(); break;
      }
      case "strider": { const p = project(c.x, 0, c.z), L = c.s * p.s; if (L < 1) return; ctx.strokeStyle = "rgba(20,16,12,.8)"; ctx.lineWidth = 1; ctx.beginPath(); for (const a of [0.5, 1.2, 1.9, 3.6, 4.3, 5.0]) { ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + Math.cos(a) * L * 1.4, p.y + Math.sin(a) * L * 0.4); } ctx.stroke(); break; }
      case "dragonfly": {
        const p = project(c.x, c.y, c.z), L = c.s * p.s; if (L < 1.5) return; const f = Math.sin(world.t * 60) > 0 ? 1 : 0.4;
        ctx.save(); ctx.translate(p.x, p.y); ctx.fillStyle = `rgba(200,230,240,${0.45 * f})`; for (const sd of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sd * L * 0.35, -L * 0.05, L * 0.4, L * 0.1, sd * 0.2, 0, TAU); ctx.fill(); }
        ctx.strokeStyle = "#3A7A8A"; ctx.lineWidth = Math.max(1, L * 0.12); ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(-L * 0.1, 0); ctx.lineTo(L * 0.7, L * 0.05); ctx.stroke(); ctx.restore(); break;
      }
    }
  }
  // the marsh's life under the surface: dark shapes in the murk, wavering (drawn on the water, under everything on it)
  function drawUnderSurface(c) {
    const shape = (x, z, s, dir, ph, a) => { const p = project(x, -0.08, z), L = s * p.s; if (L < 1.2) return; ctx.save(); ctx.translate(p.x + Math.sin(world.t * 2 + ph) * 1.2, p.y); ctx.scale(dir, 0.42); const fa = a * clamp(1 - z / 34, 0.15, 1); ctx.fillStyle = `rgba(4,8,6,${fa})`; ctx.beginPath(); ctx.ellipse(0, 0, L * 0.5, L * 0.22, 0, 0, TAU); ctx.moveTo(-L * 0.45, 0); ctx.lineTo(-L * 0.8, -L * 0.22 * (1 + Math.sin(ph * 2) * 0.3)); ctx.lineTo(-L * 0.8, L * 0.22); ctx.closePath(); ctx.fill(); ctx.strokeStyle = `rgba(160,200,170,${fa * 0.3})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(0, 0, L * 0.5, L * 0.22, 0, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); ctx.restore(); };   // (the murk's sheen breaks over its back)
    if (c.kind === "minnows") for (const m of c.m) shape(m.x, m.z, c.s, c.dir, c.ph + m.ph, 0.55);
    else if (c.kind === "bigfish") shape(c.x, c.z, c.s, c.dir, c.ph, 0.45);
    else if (c.kind === "swamp-eel") { const p = project(c.x, -0.1, c.z), L = c.s * p.s; if (L < 2) return; ctx.strokeStyle = `rgba(8,14,10,${0.45 * clamp(1 - c.z / 30, 0.15, 1)})`; ctx.lineWidth = Math.max(1, L * 0.08); ctx.lineCap = "round"; ctx.beginPath(); for (let i = 0; i <= 8; i++) { const u = i / 8; const x = p.x - c.dir * L * u, y = p.y + Math.sin(c.ph * 1.6 - u * 6) * L * 0.05; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); }
    else if (c.kind === "tadpoles") for (const m of c.m) { const p = project(c.x + m.ox + Math.sin(m.ph * 0.3) * 0.1, -0.03, c.z + m.oz), L = c.s * p.s; if (L < 0.8) continue; ctx.fillStyle = "rgba(20,24,14,.7)"; ctx.beginPath(); ctx.ellipse(p.x, p.y, L * 0.5, L * 0.35, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = "rgba(20,24,14,.5)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(p.x - L * 0.4, p.y); ctx.quadraticCurveTo(p.x - L, p.y + Math.sin(m.ph) * L * 0.6, p.x - L * 1.5, p.y); ctx.stroke(); }
  }
  // the scenery's world list gets the creatures that live among it (06b_world_draw.js merges them by depth)
  const AQ_UNDER = ["minnows", "bigfish", "swamp-eel", "tadpoles"];
  function aquaWorldList() {
    if (!AQ.B) return [];
    const out = [];
    for (const c of AQ.fauna) if (!AQ_UNDER.includes(c.kind) && c.z > 1.5 && c.z < 44) out.push(c);
    return out;
  }
  // ── the far water: where the sky would be, big shapes passing slowly (drawn over the far plate, submerged only)
  function drawAquaFar() {
    if (!aquaSub()) return;
    const col = aqCol(AQ.B.water.deep || "#0A2A3A");
    ctx.save(); ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    for (const f of AQ.far) {
      const x = f.x * W, y = HY * f.y, L = U * 0.22 * f.s, a = 0.16, d = f.v < 0 ? -1 : 1;
      ctx.fillStyle = `rgba(${(col[0] * 0.5) | 0},${(col[1] * 0.6) | 0},${(col[2] * 0.7) | 0},${a})`;
      ctx.save(); ctx.translate(x, y); ctx.scale(d, 1);
      if (f.kind === "whale") { ctx.beginPath(); ctx.ellipse(0, 0, L, L * 0.26, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.moveTo(-L * 0.9, 0); ctx.lineTo(-L * 1.4, -L * 0.25 + Math.sin(f.ph) * L * 0.08); ctx.lineTo(-L * 1.35, L * 0.2); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.ellipse(L * 0.1, L * 0.25, L * 0.3, L * 0.06, 0.4, 0, TAU); ctx.fill(); }
      else if (f.kind === "manta") { const fl = Math.sin(f.ph * 0.8) * 0.2; ctx.beginPath(); ctx.moveTo(L * 0.5, 0); ctx.quadraticCurveTo(0, -L * (0.9 + fl), -L * 0.3, -L * 0.1); ctx.lineTo(-L * 0.9, 0); ctx.lineTo(-L * 0.3, L * 0.1); ctx.quadraticCurveTo(0, L * (0.9 - fl), L * 0.5, 0); ctx.fill(); }
      else for (let i = 0; i < 16; i++) { const a = i * 2.4, rr = L * 0.5 * Math.sqrt(i / 16); ctx.beginPath(); ctx.ellipse(Math.cos(a) * rr + Math.sin(f.ph + i) * 3, Math.sin(a) * rr * 0.5, L * 0.05, L * 0.02, 0, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
    ctx.restore();
  }
  // ── caustics: a tile of light made once (the classic folded-light pattern, tileable), laid over the floor in bands
  // that shrink toward the horizon, twice, drifting against each other
  function aquaTile() {
    if (AQ.tile) return AQ.tile;
    const N = 128, c = document.createElement("canvas"); c.width = c.height = N; const g = c.getContext("2d"), im = g.createImageData(N, N);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      let px = (i / N) * TAU - 250, py = (j / N) * TAU - 250, ix = px, iy = py, v = 1;
      for (let n = 0; n < 4; n++) { const tt = 1 - 3.5 / (n + 1); ix = px + Math.cos(tt - ix) + Math.sin(tt + iy); iy = py + Math.sin(tt - iy) + Math.cos(tt + ix); v += 1 / Math.hypot(px / (Math.sin(ix + tt) / 0.005), py / (Math.cos(iy + tt) / 0.005)); }
      v = 1.17 - Math.pow(v / 4, 1.4); const a = clamp(Math.pow(Math.abs(v), 7) * 1.6, 0, 1), o = (j * N + i) * 4;
      im.data[o] = 230; im.data[o + 1] = 250; im.data[o + 2] = 255; im.data[o + 3] = (a * 255) | 0;
    }
    g.putImageData(im, 0, 0); AQ.tile = c; return c;
  }
  function drawCaustics(y0, alpha) {
    if (!aquaSub() || QUALITY.level < 0.5) return;
    const tile = aquaTile(); if (!AQ.pats) AQ.pats = ctx.createPattern(tile, "repeat");
    const P = AQ.pats, t = world.t * (reduceMotion ? 0.3 : 1), k = AQ.B.water.caustics || 0.5, bands = QUALITY.level < 0.75 ? 4 : 7;
    ctx.save(); ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.globalCompositeOperation = "lighter";
    for (let layer = 0; layer < (QUALITY.level < 0.75 ? 1 : 2); layer++) for (let b = 0; b < bands; b++) {
      const u0 = b / bands, u1 = (b + 1) / bands, ya = y0 + (H - y0) * u0 * u0, yb = y0 + (H - y0) * u1 * u1, depth = (ya - HY) / Math.max(1, H - HY), sc = 0.35 + depth * 2.4;
      const m = new DOMMatrix().translate(W / 2 + (layer ? -1 : 1) * t * 9 * sc, ya + t * (layer ? 5 : -4) * sc).scale(sc * (layer ? 1.3 : 1), sc * 0.42 * (layer ? 1.3 : 1));
      P.setTransform(m); ctx.fillStyle = P; ctx.globalAlpha = alpha * k * (0.35 + depth * 0.65) * (layer ? 0.6 : 1); ctx.fillRect(0, ya, W, yb - ya + 1);
    }
    ctx.restore();
  }
  // on the floor: submerged, the light on the sand; surface, the life under the water
  function drawAquaFloor() {
    if (!AQ.B) return;
    if (aquaSub()) { drawCaustics(HY - 1, 0.55); return; }
    for (const c of AQ.fauna) if (AQ_UNDER.includes(c.kind)) drawUnderSurface(c);
    const B = AQ.B; if (B.water.algae) {   // algae: slow green drifts on the surface
      ctx.save(); for (let i = 0; i < B.water.algae; i++) { const r = mulberry32(i * 31 + 7), x = (r() * 2 - 1) * 9, z = 4 + r() * 26 - ((TRAVEL.D || 0) % 30), zz = z < 3 ? z + 30 : z, p = project(x + Math.sin(world.t * 0.1 + i) * 0.3, 0, zz), rx = p.s * (0.6 + r()); ctx.fillStyle = `rgba(70,96,40,${0.14 * clamp(1 - zz / 34, 0.2, 1)})`; ctx.beginPath(); ctx.ellipse(p.x, p.y, rx, rx * 0.2, 0, 0, TAU); ctx.fill(); } ctx.restore();
    }
  }
  // the water column, over the world and under the ring: attenuation, shafts of light, motes, bubbles, and the
  // caustics once more, fainter, on everything standing in it
  function drawAquaColumn() {
    if (!AQ.B) return;
    const t = world.t, still = reduceMotion ? 0.3 : 1;
    if (!aquaSub()) { for (const R of AQ.rip) aqRipple(R); return; }
    const w = AQ.B.water, tint = aqCol(w.tint || "#1E6A7A"), deep = aqCol(w.deep || "#0A2A3A");
    drawCaustics(HY - U * 0.35, 0.16);
    ctx.save(); ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    let g = ctx.createLinearGradient(0, 0, 0, H);   // the attenuation: thickest at the horizon, where the most water lies between
    g.addColorStop(0, `rgba(${tint},${0.1 * w.clarity})`); g.addColorStop(clamp(HY / H - 0.08, 0.05, 0.9), `rgba(${deep},${0.22})`); g.addColorStop(clamp(HY / H + 0.04, 0.1, 0.95), `rgba(${tint},${0.3})`); g.addColorStop(1, `rgba(${tint},${0.06})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";   // the shafts: from above, slanting, swaying a little on the flow
    for (let i = 0; i < (w.shafts || 0); i++) {
      const F = curl(i * 3.1, 0.5, t * 0.12, 1.5, 1), x = W * ((i + 0.5) / w.shafts) + F.x * U * 0.06 * still, lean = U * (0.25 + 0.1 * Math.sin(i * 1.7)), wd = U * (0.035 + 0.03 * ((i * 7) % 3) / 2);
      const a = 0.07 * (0.6 + 0.4 * Math.sin(t * 0.35 + i * 1.9)), sg = ctx.createLinearGradient(0, 0, 0, H * 0.9);
      sg.addColorStop(0, `rgba(210,245,255,${a})`); sg.addColorStop(0.7, `rgba(180,230,240,${a * 0.35})`); sg.addColorStop(1, "rgba(180,230,240,0)");
      ctx.fillStyle = sg; ctx.beginPath(); ctx.moveTo(x - wd, 0); ctx.lineTo(x + wd, 0); ctx.lineTo(x + wd * 2.2 + lean, H * 0.9); ctx.lineTo(x - wd * 1.4 + lean, H * 0.9); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    ctx.save();   // marine snow: specks, the near ones bigger and softer
    for (const p of AQ.snow) { const q = project(p.x, p.y, p.z); if (q.x < -4 || q.x > W + 4) continue; const r = Math.max(0.6, p.s * q.s * 0.012), a = clamp(1 - p.z / 32, 0.1, 0.6) * (0.6 + 0.4 * Math.sin(t + p.ph)); ctx.fillStyle = `rgba(220,240,235,${a})`; ctx.fillRect(q.x, q.y, r, r); }
    for (const b of AQ.bubbles) {   // bubbles: a ring with a glint
      const q = project(b.x, b.y, b.z), r = Math.max(1, b.s * q.s); if (q.x < -r || q.x > W + r) continue; const a = clamp(1 - b.z / 30, 0.15, 0.7);
      ctx.strokeStyle = `rgba(220,245,250,${a})`; ctx.lineWidth = Math.max(0.7, r * 0.18); ctx.beginPath(); ctx.arc(q.x, q.y, r, 0, TAU); ctx.stroke();
      ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.beginPath(); ctx.arc(q.x - r * 0.35, q.y - r * 0.35, r * 0.25, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  function aqRipple(R) {   // a small silent ring on the marsh's surface (08l_water.js's rings are for splashes)
    const p = project(R.x, 0, R.z), rad = (0.08 + R.t * 0.45 * R.s * 2) * p.s, a = Math.max(0, 1 - R.t / 1.8) * 0.4; if (rad < 1) return;
    ctx.strokeStyle = `rgba(200,225,215,${a})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(p.x, p.y, rad, rad * 0.26, 0, 0, TAU); ctx.stroke();
  }
  // the one that passes close to the camera: big, dark, low and to the side, gone in a few seconds
  function drawAquaFront() {
    const f = AQ.fg; if (!f || !aquaSub()) return;
    const x = f.x * W, y = H * f.y, L = U * 0.32 * f.s, d = f.v < 0 ? -1 : 1, wag = Math.sin(f.ph) * 0.25;
    ctx.save(); ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.translate(x, y); ctx.scale(d, 1); ctx.fillStyle = "rgba(6,18,24,.78)";
    ctx.beginPath(); ctx.ellipse(0, 0, L * 0.5, L * 0.24, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-L * 0.42, 0); ctx.lineTo(-L * 0.8, -L * (0.26 + wag)); ctx.lineTo(-L * 0.74, 0); ctx.lineTo(-L * 0.8, L * (0.26 - wag)); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-L * 0.05, -L * 0.2); ctx.lineTo(-L * 0.2, -L * 0.42); ctx.lineTo(L * 0.12, -L * 0.22); ctx.fill();
    ctx.restore();
  }
