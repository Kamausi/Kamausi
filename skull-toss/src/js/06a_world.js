  // ───────────────────────── the living graveyard ─────────────────────────
  // Everything here is background: it never touches scoring. A small "director" spawns clouds, bats,
  // a witch, lightning and wanderers (zombies, skeletons, a werewolf, ghosts) on relaxed timers.
  const HEADSTONES = (() => {
    const rnd = mulberry32(4242);
    return [[-4.4, 3.5], [4.7, 5.2], [-5.3, 8.5], [5.4, 10.5], [-6.2, 14], [6.6, 17], [-4.1, 21], [4.6, 25], [-7.5, 29], [7.8, 33], [-9.5, 19], [10, 24]]
      .map(([x, z]) => ({ kind: "stone", x, z, w: 0.55 + rnd() * 0.25, h: 0.78 + rnd() * 0.35, cross: rnd() < 0.3, tilt: (rnd() - 0.5) * 0.12 }));
  })();
  const WALKERS = {
    zombie:   { h: 1.72, v: [0.35, 0.55], step: 3.2, voice: "groan",  every: [5, 9] },
    skeleton: { h: 1.78, v: [0.75, 1.0],  step: 6.2, voice: "rattle", every: [2.5, 5] },
    werewolf: { h: 1.62, v: [2.0, 2.6],   step: 11,  voice: null,     every: [99, 99] },
    ghost:    { h: 1.35, v: [0.45, 0.7],  step: 2,   voice: "wail",   every: [7, 11] }
  };
  const world = { t: 0, clouds: [], sprites: [], fogSprite: null, fog: [], twinkles: [], bats: [], flocks: [], witch: null, walkers: [], shooting: null, bolt: null, thunderAt: 0,
    next: { walker: 3, ghost: 16, bats: 5, witch: 22, shoot: 10, bolt: 45, cat: 9 } };

  function spriteCanvas(w, h) {
    const c = document.createElement("canvas"); c.width = Math.ceil(w * DPR); c.height = Math.ceil(h * DPR);
    const g = c.getContext("2d"); g.setTransform(DPR, 0, 0, DPR, 0, 0); return [c, g];
  }
  function makeCloud(seed) {
    const rnd = mulberry32(seed), w = U * (0.55 + rnd() * 0.45), h = w * 0.32, [c, g] = spriteCanvas(w, h);
    const puff = (px, py, pr, col) => { const gr = g.createRadialGradient(px, py, 0, px, py, pr); gr.addColorStop(0, col); gr.addColorStop(1, col.replace(/[\d.]+\)$/, "0)")); g.fillStyle = gr; g.fillRect(px - pr, py - pr, pr * 2, pr * 2); };
    for (let i = 0; i < 10; i++) puff(w * (0.12 + rnd() * 0.76), h * (0.45 + rnd() * 0.25), h * (0.26 + rnd() * 0.3), "rgba(52,66,90,.94)");
    for (let i = 0; i < 7; i++) puff(w * (0.15 + rnd() * 0.7), h * (0.3 + rnd() * 0.14), h * (0.18 + rnd() * 0.18), "rgba(232,216,180,.14)");
    return { c, w, h };
  }
  const halfWidthAt = z => (W / 2) / (F / (z + CAM_BACK));
  // how many clouds and fog banks a map has: none indoors, a low ceiling over the belfry, a thick mist in the crypts and the bayou
  const skyCloud = () => { const L = look(); return { n: L.moon === "screen" ? 0 : L.moon === "none" ? 11 : 6, fog: L.weather === "mist" || L.ambient.water ? 6 : 3, fogA: L.weather === "mist" ? 1.6 : L.ambient.water ? 1.3 : 1 }; };
  function worldResize() {
    const K = skyCloud();
    world.sprites = [0, 1, 2, 3, 4].map(i => makeCloud(900 + i * 37));
    const rnd = mulberry32(5150);
    world.clouds = Array.from({ length: K.n }, (_, i) => ({ s: i % 5, x: rnd() * (W + U * 0.6) - U * 0.6, y: HY * (0.06 + rnd() * 0.62), v: U * (0.012 + rnd() * 0.03), a: 0.55 + rnd() * 0.45 }));
    const [fc, fg] = spriteCanvas(W * 0.9, U * 0.09);
    const gr = fg.createRadialGradient(W * 0.45, U * 0.045, 0, W * 0.45, U * 0.045, W * 0.45);
    gr.addColorStop(0, "rgba(200,210,225,.13)"); gr.addColorStop(1, "rgba(200,210,225,0)");
    fg.fillStyle = gr; fg.save(); fg.scale(1, (U * 0.09) / (W * 0.9)); fg.fillRect(0, 0, W * 0.9, W * 0.9); fg.restore();
    world.fogSprite = { c: fc, w: W * 0.9, h: U * 0.09 };
    world.fog = [0.03, 0.09, 0.17, 0.06, 0.12, 0.24].slice(0, K.fog).map((k, i) => ({ x: rnd() * W - W * 0.45, y: HY + (H - HY) * k, v: U * (0.008 + rnd() * 0.012) * (i % 2 ? -1 : 1), a: Math.min(1, (0.6 + rnd() * 0.4) * K.fogA) }));
    world.twinkles = Array.from({ length: 28 }, () => ({ x: rnd() * W, y: rnd() * HY * 0.8, ph: rnd() * TAU, sp: 0.6 + rnd() * 1.8, r: 0.8 + rnd() * 0.9 }));
    world.bats = []; world.flocks = []; world.witch = null; world.shooting = null; world.bolt = null;
    graveyardResize(); walkerCelsResize(); weatherReset();
  }

  // a new map: its own wanderers, sky life and weather, starting fresh
  function worldForScene() {
    Object.assign(world, { walkers: [], bats: [], flocks: [], witch: null, bolt: null, shooting: null, thunderAt: 0 });
    GY.cat = null; GY.digger = null;
    worldResize();
  }
  const panX = sx => clamp((sx / W) * 2 - 1, -1, 1);
  function spawnWalker(type) {
    const T = WALKERS[type], z = rand(13, 27), dir = Math.random() < 0.5 ? 1 : -1, hw = halfWidthAt(z) + 2;
    world.walkers.push({ kind: "walker", type, z, dir, x: -dir * hw, start: -dir * hw, end: dir * hw, v: rand(T.v[0], T.v[1]), h: T.h * rand(0.93, 1.07),
      ph: rand(0, TAU), state: "walk", stopX: rand(-0.35, 0.35) * hw, howled: false, howlT: 0, next: world.t + rand(1, 3), alpha: 0 });
  }
  function spawnFlock(kind = "bat") {
    const dir = Math.random() < 0.5 ? 1 : -1, n = 4 + ((Math.random() * 6) | 0), base = HY * rand(0.2, 0.7), flock = { next: world.t + rand(0.3, 1), bats: [] };
    for (let i = 0; i < n; i++) {
      const b = { kind, x: dir > 0 ? -rand(20, U * 0.4) : W + rand(20, U * 0.4), y0: base + rand(-U * 0.07, U * 0.07), vx: dir * U * rand(0.32, 0.5),
        ph: rand(0, TAU), fl: rand(9, 13), amp: U * rand(0.01, 0.03), sz: U * rand(0.013, 0.021), wob: rand(0.8, 2) };
      world.bats.push(b); flock.bats.push(b);
    }
    world.flocks.push(flock);
  }
  function spawnWitch() {
    const dir = Math.random() < 0.5 ? 1 : -1, v = W / rand(6, 9);
    world.witch = { dir, x: dir > 0 ? -U * 0.2 : W + U * 0.2, y0: clamp(moon.y + rand(-U * 0.04, U * 0.14), 40, HY - U * 0.08), v, ph: 0, cackled: false };
  }
  function spawnBolt() {
    const x0 = rand(W * 0.1, W * 0.9), pts = [[x0, -10]];
    let x = x0, y = -10; const bottom = HY - U * rand(0.01, 0.05), steps = 9;
    for (let i = 1; i <= steps; i++) { y = -10 + (bottom + 10) * (i / steps); x += rand(-1, 1) * U * 0.045; pts.push([x, y]); }
    const bi = 3 + ((Math.random() * 3) | 0), branch = [pts[bi]];
    let bx = pts[bi][0], by = pts[bi][1];
    for (let i = 0; i < 4; i++) { bx += rand(0.2, 1) * U * 0.04 * (Math.random() < 0.5 ? -1 : 1); by += U * 0.035; branch.push([bx, by]); }
    world.bolt = { t: 0, pts, branch };
    world.thunderAt = world.t + rand(0.4, 1.6);
  }

  function updateWorld(dt) {
    const w = world; w.t += dt;
    updateGraveyard(dt); updateWeather(dt);
    for (const k of w.walkers) if (k.scare) k.scare = Math.max(0, k.scare - dt * 1.4);
    for (const c of w.clouds) {
      c.x += c.v * dt;
      const sp = w.sprites[c.s];
      if (sp && c.x > W + 10) { c.x = -sp.w - rand(0, W * 0.3); c.y = HY * rand(0.06, 0.68); }
    }
    if (w.fogSprite) for (const f of w.fog) { f.x += f.v * dt; if (f.x > W) f.x = -w.fogSprite.w; if (f.x < -w.fogSprite.w) f.x = W; }
    // director
    const n = w.next;
    const A = look().ambient, kinds = A.walkers.filter(k => k !== "ghost");
    if (w.t >= n.walker) {
      if (kinds.length && w.walkers.filter(k => k.type !== "ghost").length < 2) { // weighted pick from the map's wanderers, never the same one twice running if it has a choice
        let type, tries = 0; do { const r = Math.random(); type = kinds[Math.min(kinds.length - 1, Math.floor(Math.pow(r, 1.3) * kinds.length))]; } while (type === w.lastType && kinds.length > 1 && tries++ < 6);
        w.lastType = type; spawnWalker(type);
      }
      n.walker = w.t + rand(7, 16);
    }
    if (w.t >= n.ghost) { if ((A.ghost || A.walkers.includes("ghost")) && !w.walkers.some(k => k.type === "ghost")) spawnWalker("ghost"); n.ghost = w.t + rand(25, 45); }
    if (w.t >= n.bats) { if (A.bats > 0) spawnFlock(A.crows ? "crow" : "bat"); n.bats = w.t + rand(14, 28) / Math.max(0.2, A.bats || 0.2); }
    if (w.t >= n.witch) { if (A.witch && !w.witch) spawnWitch(); n.witch = w.t + rand(45, 80); }
    if (w.t >= n.shoot) { w.shooting = { x: rand(W * 0.15, W * 0.85), y: rand(HY * 0.05, HY * 0.35), vx: U * rand(1.1, 1.6) * (Math.random() < 0.5 ? -1 : 1), vy: U * rand(0.35, 0.6), t: 0, dur: 0.75 }; n.shoot = w.t + rand(18, 40); }
    if (w.t >= n.bolt) { if (!reduceMotion && A.lightning) spawnBolt(); n.bolt = w.t + rand(50, 100) * (look().weather === "rain" ? 0.4 : 1); }
    // wanderers
    for (const k of w.walkers) {
      const T = WALKERS[k.type];
      if (k.type === "werewolf" && k.state === "walk" && !k.howled && k.dir * (k.x - k.stopX) >= 0) {
        k.state = "howl"; k.howled = true; k.howlT = 3;
        const p = project(k.x, 0, k.z); Sound.voice.howl(panX(p.x), clamp(14 / k.z, 0.35, 1));
      }
      if (k.state === "howl") { k.howlT -= dt; if (k.howlT <= 0) k.state = "walk"; }
      else { k.x += k.dir * k.v * dt; k.ph += dt * T.step; }
      k.alpha = clamp(Math.min(Math.abs(k.x - k.start), Math.abs(k.end - k.x)) / 1.5, 0, 1);
      if (T.voice && w.t >= k.next) {
        const p = project(k.x, 0, k.z);
        if (p.x > 0 && p.x < W) Sound.voice[T.voice](panX(p.x), clamp(14 / k.z, 0.35, 1));
        k.next = w.t + rand(T.every[0], T.every[1]);
      }
    }
    w.walkers = w.walkers.filter(k => k.dir * (k.x - k.end) < 0);
    // sky life
    for (const b of w.bats) { b.x += b.vx * dt; b.ph += dt * b.fl; }
    w.bats = w.bats.filter(b => b.vx > 0 ? b.x < W + U * 0.5 : b.x > -U * 0.5);
    for (const f of w.flocks) {
      if (w.t >= f.next && f.bats.length) { const b = f.bats[0]; if (b.x > 0 && b.x < W) Sound.voice.squeak(panX(b.x)); f.next = w.t + rand(0.8, 2.2); }
      f.bats = f.bats.filter(b => w.bats.includes(b));
    }
    w.flocks = w.flocks.filter(f => f.bats.length);
    if (w.witch) {
      const k = w.witch; k.x += k.dir * k.v * dt; k.ph += dt;
      const prog = k.dir > 0 ? k.x / W : 1 - k.x / W;
      if (!k.cackled && prog > 0.42) { k.cackled = true; Sound.voice.cackle(panX(k.x)); }
      if (prog > 1.15) w.witch = null;
    }
    if (w.shooting) { w.shooting.t += dt; w.shooting.x += w.shooting.vx * dt; w.shooting.y += w.shooting.vy * dt; if (w.shooting.t > w.shooting.dur) w.shooting = null; }
    if (w.bolt) { w.bolt.t += dt; if (w.bolt.t > 0.9) w.bolt = null; }
    if (w.thunderAt && w.t >= w.thunderAt) {
      w.thunderAt = 0; Sound.voice.thunder(0, 1);
      if (!paused) camJolt("thunder");
    }
  }
  function flashAlpha() {
    const b = world.bolt; if (!b) return 0; const t = b.t;
    return flashK() * (t < 0.07 ? 0.55 : t < 0.14 ? 0.08 : t < 0.22 ? 0.4 : Math.max(0, 0.4 - (t - 0.22) * 0.9));
  }
