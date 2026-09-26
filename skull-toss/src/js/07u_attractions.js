  // ───────────────────────── v56: the carnival's attractions (the mini-games, rebuilt) ─────────────────────────
  // Every mini-game is an attraction that could stand in the Skull Toss carnival: its own set, its own objective, its
  // own verb, and none of them is "the ring somewhere else". While one is on the ring is gone (hidden, and nothing
  // crosses it): the skull is judged where it meets the attraction's own things, at the attraction's own depth (the
  // aim guide's reticle sits on that plane).
  //   Target Gallery  React        a wooden shooting gallery, blue and cream: tin stars and spinning plates (1), ducks
  //                                on conveyors (2), bullseyes that pop up and drop behind cover (3), and now and then a
  //                                golden target racing along the top rail (5) that rings the bell. Ten skulls.
  //   Can Alley       Smash        a red striped booth and a pyramid of numbered cans with weight (07o_bonus.js): a hit
  //                                knocks what it hits and what rests on it, a hard one ploughs on through, and cans
  //                                that fly knock others over. The lot in one throw is a CLEAN SWEEP, and it's restacked.
  //   Longshot        Reach        a range: a board on legs at 10 m, then 15, 20, 25, 30, 40, 50…; the throw carries
  //                                as far as the board, it's smaller every time, there's a breath of wind, and the
  //                                camera eases back. Three skulls.
  //   Curtain Call    Time         a little stage: DING, the curtains part on the round's act (one target; one on the
  //                                move; two, one of which goes; three in turn; the big finish in a spotlight), and
  //                                slam shut. One throw a round, while they're open. Three skulls.
  //   Perfect Pitch   Place        a painted board of pockets, 10, 25, 50 and 100 by size; dead centre in the 100 is a
  //                                PERFECT PITCH (the bell, the lights, the crowd). Ten skulls.
  //   Gale Force      Compensate   a still bullseye and a wind machine: breeze, gust, gale, storm, a fresh direction
  //                                every throw; flags snap, paper and dust blow across. Three skulls.
  //   Sudden Death    Survive      the dark, one spotlight, one target, one skull; every hit makes it worse (it moves,
  //                                shrinks, speeds up, blades cross in front, it jinks, the picture shakes, fakes).
  //   Swing Time      Synchronize  a target on a pendulum: slow, then quicker, wider, then out of time. Through the
  //                                middle of it on the move is DEAD CENTER. Three skulls.
  // An attraction's record is its own number (points, cans, metres or hits), not the run's score.
  const ATTR = { on: false, kind: null, t: 0, zp: RING_Z, props: [], bits: [], score: 0, n: 0, say: null, pull: 0, shake: 0, lvl: 0, encore: false, flash: 0 };
  const attrOn = () => ATTR.on;
  const aRand = (a, b) => a + runRand() * (b - a);   // (the run's dice, so a replay sees the same attraction)
  const at3 = (x, y, z) => ({ x, y, z });

  // ── starting, stopping
  function attrBegin(kind, o = {}) {
    const A = ATTRS[kind];
    Object.assign(ATTR, { on: true, kind, t: 0, props: [], bits: [], cur: null, round: 0, step: 0, score: 0, n: 0, say: null, pull: 0, shake: 0, lvl: 0, encore: !!o.encore, flash: 0, zp: A.zp, far: 0 });
    game.ringHidden = true; targets.length = 0; clearPickups();
    HZ.kind = "none"; HZ.list = []; HZ.wind = 0; HZ.fog = 0; HZ.fogT = 0; OB.list = []; OB.off = true;
    A.begin(o); attrFocus(); renderWind();
  }
  // the (hidden) ring stands on the attraction's plane: the aim guide's reticle and the camera's safe box read it
  function attrFocus() { const A = ATTRS[ATTR.kind], y = A.focusY ? A.focusY() : RING_Y; ring.frozen = { x: 0, y, z: ATTR.zp }; ring.x = 0; ring.y = y; ring.z = ATTR.zp; ring.glide = null; }
  function attrReset() { ATTR.on = false; ATTR.kind = null; ATTR.props = []; ATTR.bits = []; ATTR.pull = 0; ATTR.shake = 0; document.body.classList.remove("attr-dark"); }
  function attrEnd() { const was = ATTR.on; attrReset(); if (was) { game.ringHidden = false; ring.frozen = null; } }
  // the attraction's own throw (Longshot's carries to the board): null for the usual one
  function attrAim(AX, AY) { const A = ATTR.on && ATTRS[ATTR.kind]; return A && A.aim ? A.aim(AX, AY) : null; }
  // where to aim to meet (x, y) on the attraction's plane (the tests' and the replays' helper)
  function attrAimFor(x, y) {
    const A = ATTRS[ATTR.kind]; if (A && A.aim) return { AX: x * RING_Z / ATTR.zp, AY: y };
    const T = flightT(), z = ATTR.zp, tc = z * T / RING_Z, vy = (y - START_Y + 0.5 * G * tc * tc) / tc;
    return { AX: x * RING_Z / z, AY: START_Y + vy * T - 0.5 * G * T * T };
  }
  const attrWind = () => ATTR.on && (ATTR.kind === "gale" || ATTR.kind === "longshot");
  const attrFar = () => ATTR.on ? Math.max(48, ATTR.zp + 24) : 48;

  // ── in flight: where the skull meets the attraction's plane
  function attrCheck(s, prev) {
    if (!ATTR.on || game.result || s.crossed) return;
    const A = ATTRS[ATTR.kind];
    if (A.sweep && A.sweep(s, prev)) return;
    const zp = ATTR.zp;
    if (prev.z < zp && s.pos.z >= zp) {
      const u = (zp - prev.z) / Math.max(1e-9, s.pos.z - prev.z), c = at3(prev.x + (s.pos.x - prev.x) * u, prev.y + (s.pos.y - prev.y) * u, zp);
      s.crossed = true; A.judge(c, s);
    }
  }
  // off something solid: back a touch, up a little, and down
  function attrBounce(s, c, o = {}) {
    const v = velAt(s, s.t);
    s.p0 = at3(c.x, c.y, c.z - 0.04); s.t = 0; s.pos = { ...s.p0 }; s.ax = 0; s.resting = false;
    s.v0 = at3(o.vx != null ? o.vx : v.x * 0.25, o.vy != null ? o.vy : 1.1, o.vz != null ? o.vz : -Math.max(0.8, v.z * 0.2)); s.spin *= -0.6;
  }
  // a hit: the attraction's points, its word, and the throw's result (07_game.js: resolve)
  function attrHit(kind, P, word, pts, o = {}) {
    ATTR.score += pts; ATTR.n++;
    const at = project(P.x, P.y, P.z);
    ATTR.say = { word, sub: o.sub || "", fly: pts > 0 ? `+${fmtN(pts)}` : "", fill: o.fill || null, text: o.text || null };
    VisualSystem.triggerImpact(o.fx || (kind === "bull" ? "perfect" : "swish"), { at, hit: at, strength: 1, pan: panOf(P.x) });
    if (o.snd) Sound.toon(o.snd, panOf(P.x));
    resolve(kind, at, null);
    ATTR.say = null; renderProgress();
  }
  // a miss: into something (a bonk), or clean past it (the hang, the look, the drop)
  function attrMiss(kind, P, hit) {
    const at = project(P.x, P.y, P.z), hp = hit ? project(hit.x, hit.y, hit.z) : null;
    if (hit) VisualSystem.triggerImpact("seed", { at, hit: hp, strength: 1, pan: panOf(hit.x) });
    resolve(kind, at, hp);
  }
  // clean past a target: which way it went
  function attrPast(c, P) { const dx = c.x - P.x, dy = c.y - P.y; attrMiss(Math.abs(dy) > Math.abs(dx) ? (dy > 0 ? "over" : "low") : "wide", P, null); }

  // ── the clock and the props
  function attrUpdate(dt) {
    if (!ATTR.on) return;
    const live = game.state === "ready" || game.state === "flying" || game.state === "continue";
    if (live && !paused) ATTR.t += dt;
    const A = ATTRS[ATTR.kind]; if (A.update) A.update(dt, live);
    ATTR.flash = Math.max(0, ATTR.flash - dt);
    for (let i = ATTR.bits.length - 1; i >= 0; i--) { const b = ATTR.bits[i]; b.t += dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += (b.vz || 0) * dt; b.vy -= (b.g || 0) * dt; b.rot += (b.vr || 0) * dt; if (b.t > b.life) ATTR.bits.splice(i, 1); }
  }
  // after each throw has settled: the attraction moves on (true: no director between throws, 07i_modes.js)
  function attrAfter() {
    const A = ATTRS[ATTR.kind];
    if (A.after) A.after();
    const lim = MODES[game.mode] && MODES[game.mode].throws;
    if (!ATTR.encore && lim && game.throws >= lim && game.state === "ready") { gameOver(true); return true; }
    attrFocus(); renderProgress(); return true;
  }
  const attrValue = () => ATTRS[ATTR.kind] && ATTRS[ATTR.kind].value ? ATTRS[ATTR.kind].value() : ATTR.score;

  // ───────────────────────── the eight ─────────────────────────
  const GAL = { z: 7.0, back: 7.35, x0: -2.5, x1: 2.5, rows: [1.35, 2.2, 3.05], top: 3.75 };
  const LONG = { dists: [10, 15, 20, 25, 30, 40, 50, 60, 75, 90, 110, 130, 150], y: 1.35 };
  const longDist = n => n < LONG.dists.length ? LONG.dists[n] : LONG.dists[LONG.dists.length - 1] + 25 * (n - LONG.dists.length + 1);
  const longR = d => 0.45 + 0.0065 * d;
  const CURT = { z: 7.2, back: 7.6, x0: -2.3, x1: 2.3, floor: 1.0, top: 3.75 };
  const PITCH = { z: 7.2, x0: -2.2, x1: 2.2, y0: 0.95, y1: 3.9, holes: [
    { x: 0, y: 3.45, r: 0.2, pts: 100 }, { x: -1.35, y: 2.95, r: 0.26, pts: 50 }, { x: 1.35, y: 2.95, r: 0.26, pts: 50 },
    { x: -0.62, y: 2.25, r: 0.34, pts: 25 }, { x: 0.62, y: 2.25, r: 0.34, pts: 25 },
    { x: -1.3, y: 1.5, r: 0.46, pts: 10 }, { x: 0, y: 1.5, r: 0.46, pts: 10 }, { x: 1.3, y: 1.5, r: 0.46, pts: 10 }] };
  const GALE_LV = [{ w: 0.7, id: "breeze" }, { w: 1.4, id: "gust" }, { w: 2.2, id: "gale" }, { w: 3.0, id: "storm" }, { w: 3.8, id: "hurricane" }];
  const SWING = { z: 7.0, py: 4.6, L: 2.5, r: 0.42 };
  const SUDDEN = { z: 7.0, y: 2.3 };

  const ATTRS = {
    // ── 🎯 Target Gallery: React
    gallery: {
      zp: GAL.z, focusY: () => 2.2,
      begin() {
        const P = ATTR.props;
        for (let i = 0; i < 3; i++) P.push({ type: "duck", row: 0, x: GAL.x0 + 0.4 + i * 1.9, y: GAL.rows[0], r: 0.26, pts: 2, v: 0.75, up: 1 });   // the bottom conveyor
        for (let i = 0; i < 3; i++) P.push({ type: "duck", row: 2, x: GAL.x1 - 0.4 - i * 1.9, y: GAL.rows[2], r: 0.24, pts: 2, v: -1.05, up: 1 });  // the top one, the other way, quicker
        for (const x of [-1.9, 1.9]) P.push({ type: "plate", row: 1, x, y: GAL.rows[1], r: 0.27, pts: 1, spin: x < 0 ? 2.2 : -1.7, up: 1 });   // spinning plates: only while they face you
        P.push({ type: "star", row: 1, x: 0, y: GAL.rows[1] + 0.05, r: 0.25, pts: 1, up: 1 });
        ATTR.next = 0.8; ATTR.goldAt = aRand(9, 14); ATTR.seq = 0;
      },
      update(dt, live) {
        if (!live) return;
        const P = ATTR.props, span = GAL.x1 - GAL.x0 - 0.3;
        for (const p of P) {
          if (p.down > 0) { p.down += dt; if (p.type !== "pop" && p.type !== "gold" && p.down > (p.type === "duck" ? 2.2 : 1.6)) { p.down = 0; p.up = 0; } }
          else if (p.up < 1 && p.type !== "pop" && p.type !== "gold") p.up = Math.min(1, p.up + dt * 3);
          if (p.type === "duck") { p.x += p.v * dt; if (p.x > GAL.x1 - 0.15) p.x -= span; if (p.x < GAL.x0 + 0.15) p.x += span; }
          if (p.type === "plate") p.a = (p.a || 0) + p.spin * dt;
          if (p.type === "pop" || p.type === "gold") {   // up on its hinge, a while, and down behind the cover (knocked: gone)
            if (p.down) { if (p.down > 0.4) p.gone = true; continue; }
            p.age += dt;
            if (p.type === "gold") p.x += p.v * dt;
            const rise = 0.22, stay = p.stay;
            p.up = p.age < 0 ? 0 : p.age < rise ? p.age / rise : p.age < rise + stay ? 1 : Math.max(0, 1 - (p.age - rise - stay) / rise);
            if (p.age > stay + rise * 2 + 0.05 || (p.type === "gold" && (p.x > GAL.x1 + 0.3 || p.x < GAL.x0 - 0.3))) p.gone = true;
          }
        }
        for (let i = P.length - 1; i >= 0; i--) if (P[i].gone) P.splice(i, 1);
        // bullseyes pop up out of the holes in the counter: one, then another, sometimes a run of three left to right
        ATTR.next -= dt;
        if (ATTR.next <= 0 && P.filter(p => p.type === "pop").length < 2) {
          const slots = [-2.0, -1.0, 0, 1.0, 2.0];
          if (runRand() < 0.3) { for (let k = 0; k < 3; k++) P.push({ type: "pop", x: slots[k + 1] + (runRand() < 0.5 ? -1 : 0), y: 1.05, r: 0.29, pts: 3, age: -k * 0.45, stay: 1.4, up: 0 }); ATTR.next = 3.4; Sound.toon("tick"); }
          else { P.push({ type: "pop", x: slots[(runRand() * 5) | 0], y: aRand(0, 1) < 0.5 ? 1.05 : 2.62, r: 0.29, pts: 3, age: 0, stay: aRand(1.6, 2.4), up: 0 }); ATTR.next = aRand(1.3, 2.1); }
        }
        ATTR.goldAt -= dt;
        if (ATTR.goldAt <= 0) { const dir = runRand() < 0.5 ? 1 : -1; P.push({ type: "gold", x: dir > 0 ? GAL.x0 - 0.2 : GAL.x1 + 0.2, y: GAL.top - 0.28, r: 0.22, pts: 5, v: dir * 1.8, age: 0.22, stay: 99, up: 1 }); ATTR.goldAt = aRand(11, 16); Sound.toon("whistleUp"); }
      },
      judge(c, s) {
        let best = null, bd = 1e9;
        for (const p of ATTR.props) {
          if (p.down || p.up < 0.6) continue;
          if (p.type === "plate" && Math.abs(Math.cos(p.a || 0)) < 0.35) continue;   // edge-on: it slips past
          const d = Math.hypot(c.x - p.x, c.y - p.y);
          if (d <= p.r + SKULL_R * 0.7 && d < bd) { best = p; bd = d; }
        }
        if (best) {
          best.down = 0.001;
          const gold = best.type === "gold", bull = best.type === "pop" && bd < best.r * 0.4;
          if (gold) { Sound.toon("bell"); ATTR.flash = 0.6; }
          attrBounce(s, c, { vx: (c.x - best.x) * 3, vy: 1.4 });
          attrHit(gold || bull ? "bull" : "tgt", at3(best.x, best.y, GAL.z), t(`attr.gallery.hit.${best.type}`), best.pts + (bull ? 1 : 0), { fx: "clank", snd: best.type === "duck" ? "quack" : gold ? null : "knock", sub: bull ? t("attr.bull") : "" });
          return;
        }
        const inside = c.x > GAL.x0 && c.x < GAL.x1 && c.y > 0.7 && c.y < GAL.top;
        if (inside) { attrBounce(s, c, { vy: 0.8 }); Sound.toon("knock", panOf(c.x)); attrMiss("board", at3(c.x, c.y, GAL.z), c); }
        else attrPast(c, at3(0, 2.2, GAL.z));
      },
      draw(front) { drawGallery(front); }
    },

    // ── 🥫 Can Alley: Smash (the cans themselves are 07o_bonus.js)
    cans: {
      zp: CANS.z, focusY: () => canFocusY(),
      begin() { canLayout(); ATTR.round = 1; ATTR.sweeps = 0; },   // (the encore keeps its clock: 07i_modes.js)
      update() {},
      judge(c, s) {   // past the stack without touching a can: into the booth's back wall, or clean past it
        if (s.canHit) return;
        const inside = Math.abs(c.x) < 2.4 && c.y > 0.3 && c.y < 3.7;
        if (inside) { attrBounce(s, at3(c.x, c.y, CANS.z + 0.7), { vy: 0.6 }); Sound.toon("knock", panOf(c.x)); attrMiss("board", at3(c.x, c.y, CANS.z), c); }
        else attrPast(c, at3(0, canFocusY(), CANS.z));
      },
      after() {
        const n = cans.filter(c => c.down).length, all = cans.length > 0 && n === cans.length;
        if (all && ATTR.upBefore === cans.length && ATTR.thisThrow >= cans.length) {   // the whole pyramid in one throw
          ATTR.sweeps++; ATTR.flash = 1.2; Sound.toon("bell"); Sound.toon("cheer");
          impact(t("attr.cans.sweep"), W / 2, H * 0.3, { fill: GOLD, text: INK, scale: 1.05, sub: t("attr.cans.sweepSub") });
        }
        if (all && !ATTR.encore) { canLayout(); ATTR.round++; Sound.toon("xylo"); }   // cleared: the booth stacks a fresh pyramid
        ATTR.upBefore = cansLeft(); ATTR.thisThrow = 0;
      },
      value: () => (game.run.cans || 0) + 5 * (ATTR.sweeps || 0),   // (a can a point, and five more for a Clean Sweep)
      draw(front) { drawCanBooth(front); }
    },

    // ── 🏹 Longshot: Reach
    longshot: {
      zp: 10, focusY: () => LONG.y,
      begin() { ATTR.step = 0; ATTR.zp = longDist(0); ATTR.far = 0; longWind(); },
      // the throw carries to the board: the aim point is on its plane, and the flight takes as long as the distance asks
      aim(AX, AY) {
        const z = ATTR.zp, T = FLIGHT_T * Math.sqrt(z / RING_Z) * (powerOn("rush") ? 0.62 : 1), X = AX * z / RING_Z;
        return { x: X / T, y: (AY - START_Y + 0.5 * G * T * T) / T, z: z / T };
      },
      update(dt) { const k = clamp((ATTR.zp - 10) / 100, 0, 1); ATTR.pull += (k * 0.85 - ATTR.pull) * Math.min(1, dt * 2); },
      judge(c, s) {
        const z = ATTR.zp, r = longR(z), P = at3(0, LONG.y, z), d = Math.hypot(c.x - P.x, c.y - P.y);
        if (d <= r + SKULL_R * 0.5) {
          const bull = d <= r * 0.3;
          attrBounce(s, c, { vx: 0, vy: 0.4, vz: -0.6 });
          ATTR.far = Math.max(ATTR.far, z); ATTR.hitAt = z;
          attrHit(bull ? "bull" : "tgt", P, t("attr.longshot.hit", { m: z }), 0, { fx: "clank", snd: "knock", sub: bull ? t("attr.bull") : "", fill: bull ? null : TEAL });
          return;
        }
        const legs = c.y < LONG.y - r && c.y > 0 && Math.abs(c.x) < r * 0.8;
        if (legs) { attrBounce(s, c, { vy: 0.5 }); attrMiss("board", P, c); }
        else attrPast(c, P);
      },
      after() {
        if (ATTR.hitAt) { ATTR.hitAt = 0; ATTR.step++; ATTR.zp = longDist(ATTR.step); Sound.toon("whistleUp"); stageCard(t("attr.longshot.next"), t("attr.longshot.m", { m: ATTR.zp }), "", 1.1, "gold"); }
        longWind();
      },
      value: () => Math.round(ATTR.far * 10),
      draw(front) { drawRange(front); }
    },

    // ── 🎭 Curtain Call: Time
    curtain: {
      zp: CURT.z, focusY: () => 2.35,
      begin() { ATTR.round = 0; curtainNext(1.2); },
      update(dt, live) {
        const C = ATTR.cur; if (!C || !live) return;
        C.t += dt;
        const was = C.phase;
        if (C.phase === "shut" && C.t >= C.wait) { C.phase = "open"; C.t = 0; C.thrown = false; Sound.toon("ding"); Sound.toon("curtain"); }
        else if (C.phase === "open" && C.t >= C.win) { C.phase = "closing"; C.t = 0; Sound.toon("curtain"); }
        else if (C.phase === "closing" && C.t >= 0.25) { C.phase = "closed"; C.t = 0; }
        if (was === "closing" && C.phase === "closed" && !C.thrown && game.state === "ready") curtainCue();   // it came and went, and no throw
        if (C.phase === "closed" && C.done && game.state === "ready" && C.t > 0.35) curtainNext(0.6);
        for (const p of ATTR.props) {
          const u = C.phase === "open" ? C.t : C.phase === "closing" ? C.win + C.t : 0;
          p.live = C.phase === "open" && u >= (p.from || 0) && u < (p.to == null ? 99 : p.to);
          if (p.move) p.x = p.x0 + Math.sin(ATTR.t * p.move) * p.amp;
        }
      },
      judge(c, s) {
        const C = ATTR.cur; if (C && C.phase !== "shut") { C.thrown = true; C.done = true; }   // (a throw before the curtains part doesn't use up the round)
        const inside = c.x > CURT.x0 && c.x < CURT.x1 && c.y > CURT.floor - 0.1 && c.y < CURT.top;
        const open = C && C.phase === "open";
        if (open) for (const p of ATTR.props) {
          if (!p.live) continue;
          const d = Math.hypot(c.x - p.x, c.y - p.y);
          if (d <= p.r + SKULL_R * 0.7) {
            p.hit = true; const bull = d <= p.r * 0.3, fin = C.fin;
            attrBounce(s, c, { vx: (c.x - p.x) * 2, vy: 1.2 }); curtainShut();
            attrHit(bull || fin ? "bull" : "tgt", at3(p.x, p.y, CURT.z), fin ? t("attr.curtain.bravo") : t("attr.curtain.hit"), fin ? 3 : 1, { fx: "clank", snd: fin ? "cheer" : "knock", sub: bull ? t("attr.bull") : "" });
            return;
          }
        }
        curtainShut();
        if (inside && !open) { attrBounce(s, c, { vy: 0.4 }); Sound.toon("poof", panOf(c.x)); attrMiss("curtain", at3(c.x, c.y, CURT.z), c); }
        else if (inside) { attrBounce(s, at3(c.x, c.y, CURT.back), { vy: 0.5 }); attrMiss("board", at3(c.x, c.y, CURT.z), c); }
        else attrPast(c, at3(0, 2.35, CURT.z));
      },
      value: () => game.hits,
      draw(front) { drawStage(front); }
    },

    // ── 🎳 Perfect Pitch: Place
    pitch: {
      zp: PITCH.z, focusY: () => 2.4,
      begin() { ATTR.perfects = 0; },
      update() {},
      judge(c, s) {
        let hole = null, hd = 1e9;
        for (const h of PITCH.holes) { const d = Math.hypot(c.x - h.x, c.y - h.y); if (d < h.r + SKULL_R && d < hd) { hole = h; hd = d; } }
        if (hole && hd <= hole.r - SKULL_R * 0.6) {   // in: it drops through the pocket
          const perfect = hole.pts === 100 && hd <= 0.07;
          s.p0 = at3(c.x, c.y, PITCH.z + 0.05); s.t = 0; s.pos = { ...s.p0 }; s.v0 = at3(0, -0.4, 0.6); s.ax = 0; s.sink = 1;
          if (perfect) { ATTR.perfects++; ATTR.flash = 1.4; Sound.toon("bell"); Sound.toon("cheer"); }
          attrHit(perfect || hole.pts >= 50 ? "bull" : "tgt", at3(hole.x, hole.y, PITCH.z), perfect ? t("attr.pitch.perfect") : t("attr.pitch.in", { n: hole.pts }), hole.pts * (perfect ? 2 : 1), { fx: "swish", sub: perfect ? t("attr.pitch.double") : "" });
          return;
        }
        if (hole) { attrBounce(s, c, { vx: (c.x - hole.x) * 5, vy: 1.5 }); Sound.toon("clang", panOf(c.x)); attrMiss("pocket", at3(hole.x, hole.y, PITCH.z), c); return; }
        const inside = c.x > PITCH.x0 && c.x < PITCH.x1 && c.y > PITCH.y0 && c.y < PITCH.y1;
        if (inside) { attrBounce(s, c, { vy: 0.7 }); Sound.toon("knock", panOf(c.x)); attrMiss("board", at3(c.x, c.y, PITCH.z), c); }
        else attrPast(c, at3(0, 2.4, PITCH.z));
      },
      draw(front) { drawPitchBoard(front); }
    },

    // ── 🌪 Gale Force: Compensate
    gale: {
      zp: 7.0, focusY: () => 2.3,
      begin() { ATTR.lvl = -1; galeTurn(); },
      update(dt) {
        const w = HZ.wind, n = Math.abs(w);
        if (runRand() < dt * (4 + n * 6) && ATTR.bits.length < 60) {   // paper and dust blowing across
          const from = w >= 0 ? -3.6 : 3.6, paper = runRand() < 0.35;
          ATTR.bits.push({ kind: paper ? "paper" : "dust", x: from, y: paper ? aRand(0.4, 3.6) : aRand(0.05, 0.6), z: aRand(3.5, 9), vx: Math.sign(w || 1) * (1.4 + n * 1.3) * aRand(0.7, 1.3), vy: paper ? aRand(-0.2, 0.4) : 0, g: 0, rot: 0, vr: aRand(-6, 6), t: 0, life: 4, s: aRand(0.6, 1.2) });
        }
      },
      judge(c, s) {
        const P = at3(0, 2.3, 7.0), r = 0.42, d = Math.hypot(c.x - P.x, c.y - P.y);
        if (d <= r + SKULL_R * 0.6) {
          const bull = d <= r * 0.3;
          attrBounce(s, c, { vx: (c.x - P.x) * 3, vy: 1.2 });
          attrHit(bull ? "bull" : "tgt", P, t(`attr.gale.${GALE_LV[ATTR.lvl].id}`), 1, { fx: "clank", snd: "knock", sub: bull ? t("attr.bull") : t("attr.gale.beat") });
          return;
        }
        if (c.y < P.y - r && c.y > 0 && Math.abs(c.x) < 0.14) { attrBounce(s, c, { vy: 0.5 }); attrMiss("board", P, c); return; }
        attrPast(c, P);
      },
      after() { galeTurn(); },
      value: () => game.hits,
      draw(front) { drawGaleBooth(front); }
    },

    // ── ☠ Sudden Death: Survive
    sudden: {
      zp: SUDDEN.z, focusY: () => SUDDEN.y,
      begin() { suddenSet(); document.body.classList.add("attr-dark"); },
      update(dt, live) {
        if (!live) return;
        const h = game.hits, P = ATTR.props;
        for (const p of P) {
          if (p.kind === "blade") { p.x += p.v * dt; if (Math.abs(p.x) > 2.6) { p.v = -p.v; p.x = clamp(p.x, -2.6, 2.6); } continue; }
          if (h >= 1) {
            p.ph += dt * p.w;
            if (h >= 5 && runRand() < dt * 0.9) p.w = -p.w;   // it jinks: a sudden change of direction
            p.x = p.x0 + Math.sin(p.ph) * p.amp; p.y = SUDDEN.y + (h >= 3 ? Math.sin(p.ph * 0.7 + 1) * 0.35 : 0);
          }
        }
        ATTR.shake = h >= 6 ? 0.5 + Math.min(0.5, (h - 6) * 0.1) : 0;
      },
      sweep(s, prev) {   // the blades cross in front of it
        for (const p of ATTR.props) {
          if (p.kind !== "blade") continue;
          if (Math.abs(s.pos.z - p.z) > 0.25 && Math.abs(prev.z - p.z) > 0.25) continue;
          if (sweptDist(prev, s.pos, { x: p.x, y: p.y, z: p.z, ox: p.x, oy: p.y, oz: p.z }) <= SKULL_R + 0.28) {
            s.crossed = true; attrBounce(s, s.pos, { vy: 1.6, vz: -1.2 }); Sound.toon("clang", panOf(p.x)); attrMiss("blade", at3(p.x, p.y, p.z), s.pos); return true;
          }
        }
        return false;
      },
      judge(c, s) {
        let hit = null;
        for (const p of ATTR.props) { if (p.kind === "blade") continue; const d = Math.hypot(c.x - p.x, c.y - p.y); if (d <= p.r + SKULL_R * 0.55) { hit = p; break; } }
        if (hit && hit.fake) { attrBounce(s, c, { vy: 1 }); Sound.toon("poof", panOf(c.x)); hit.gone = 1; attrMiss("fake", at3(hit.x, hit.y, SUDDEN.z), c); return; }
        if (hit) { attrBounce(s, c, { vx: (c.x - hit.x) * 3, vy: 1.3 }); attrHit("tgt", at3(hit.x, hit.y, SUDDEN.z), t("attr.sudden.hit"), 1, { fx: "clank", snd: "knock", sub: t(`attr.sudden.next.${Math.min(8, game.hits + 1)}`), fill: "#2A2230", text: CREAM }); return; }
        const m = ATTR.props.find(p => !p.kind && !p.fake); attrPast(c, at3(m ? m.x : 0, m ? m.y : SUDDEN.y, SUDDEN.z));
      },
      after() { suddenSet(); },
      value: () => game.hits,
      draw(front) { drawSudden(front); }
    },

    // ── 🎠 Swing Time: Synchronize
    swing: {
      zp: SWING.z, focusY: () => SWING.py - SWING.L,
      begin() { ATTR.ph = 0; ATTR.dead = 0; },
      update(dt, live) {
        if (!live) return;
        const h = game.hits, w = swingW();
        const irregular = h >= 9 ? 1 + 0.45 * Math.sin(ATTR.t * 0.73) + 0.25 * Math.sin(ATTR.t * 1.9 + 1) : 1;
        const was = Math.cos(ATTR.ph); ATTR.ph += dt * w * irregular;
        if (Math.sign(was) !== Math.sign(Math.cos(ATTR.ph))) Sound.toon("tick", panOf(swingPos().x));   // the pendulum ticks at the ends of its swing
      },
      judge(c, s) {
        const P = swingPos(), d = Math.hypot(c.x - P.x, c.y - P.y);
        if (d <= SWING.r + SKULL_R * 0.6) {
          const dead = d <= SWING.r * 0.28; if (dead) ATTR.dead++;
          attrBounce(s, c, { vx: P.vx * 0.6, vy: 1.2 });
          attrHit(dead ? "bull" : "tgt", at3(P.x, P.y, SWING.z), dead ? t("attr.swing.dead") : t("attr.swing.hit"), dead ? 3 : 1, { fx: "clank", snd: "knock" });
          return;
        }
        const rod = swingRodHit(c); if (rod) { attrBounce(s, c, { vy: 0.8 }); Sound.toon("clang", panOf(c.x)); attrMiss("board", P, c); return; }
        attrPast(c, P);
      },
      value: () => game.hits,
      draw(front) { drawSwing(front); }
    }
  };

  // ── Longshot: a breath of wind that grows with the distance
  function longWind() {
    const z = ATTR.zp, w = Math.min(1.2, 0.15 + z * 0.006) * aRand(0.4, 1) * (runRand() < 0.5 ? -1 : 1);
    HZ.kind = "wind"; HZ.wind = Math.round(w * 10) / 10; renderWind();
  }
  // ── Gale Force: a new direction every throw; the level goes up every three hits
  function galeTurn() {
    const lv = Math.min(GALE_LV.length - 1, Math.floor(game.hits / 3)), L = GALE_LV[lv];
    const w = L.w * aRand(0.85, 1.15) * (runRand() < 0.5 ? -1 : 1);
    HZ.kind = "wind"; HZ.wind = Math.round(w * 10) / 10; renderWind();
    if (lv !== ATTR.lvl) { ATTR.lvl = lv; if (game.throws > 0) stageCard(t("attr.gale.up"), t(`attr.gale.${L.id}`), "", 1.2, "gold"); }
    Sound.toon("gust");
  }
  // ── Curtain Call: the next round's act
  function curtainNext(wait) {
    const n = ATTR.round++, k = Math.floor(n / 5), act = n % 5, win = Math.max(1.3, 3.2 - 0.25 * k - (act === 3 ? -0.4 : 0)), P = [];
    const rx = () => aRand(-1.3, 1.3), ry = () => aRand(1.7, 3.0);
    if (act === 0) P.push({ x: rx(), y: ry(), r: 0.36 });
    else if (act === 1) { const x0 = aRand(-0.3, 0.3); P.push({ x0, x: x0, y: ry(), r: 0.34, move: 1.7 + 0.35 * k, amp: 1.2 }); }
    else if (act === 2) { const gone = runRand() < 0.5 ? 0 : 1; for (let i = 0; i < 2; i++) P.push({ x: i ? aRand(0.5, 1.4) : aRand(-1.4, -0.5), y: ry(), r: 0.32, to: i === gone ? 1.0 : null }); }
    else if (act === 3) { for (let i = 0; i < 3; i++) P.push({ x: -1.3 + i * 1.3 + aRand(-0.2, 0.2), y: ry(), r: 0.3, from: i * 0.7, to: i * 0.7 + 1.3 }); }
    else { const x0 = aRand(-0.4, 0.4); P.push({ x0, x: x0, y: 2.35, r: 0.62, move: 0.8 + 0.2 * k, amp: 0.5, fin: true }); }
    ATTR.props = P; ATTR.cur = { phase: "shut", t: 0, wait, win, done: false, thrown: false, fin: act === 4, act };
  }
  function curtainShut() { const C = ATTR.cur; if (C && C.phase === "open") { C.phase = "closing"; C.t = 0; Sound.toon("curtain"); } }
  function curtainCue() {   // the window came and went without a throw: that costs a skull too
    const C = ATTR.cur; C.done = true;
    game.lives = Math.max(0, game.lives - 1); game.streak = 0; showCombo(0); profile.misses++; game.run.misses++;
    impact(t("attr.curtain.cue"), W / 2, H * 0.3, { fill: RED, text: CREAM, scale: 0.7, bits: false, sub: game.lives > 0 ? t("result.left", { n: game.lives }) : "" });
    Sound.toon("whistleDown"); updateHud();
    if (game.lives <= 0) gameOver(true);
  }
  // ── Sudden Death: the target, and whatever the last hit has added
  function suddenSet() {
    const h = game.hits, r = h >= 8 ? 0.24 : h >= 2 ? 0.34 : 0.45, P = [];
    P.push({ x0: 0, x: 0, y: SUDDEN.y, r, ph: aRand(0, TAU), w: (h >= 3 ? 1.6 : 0.9) * (1 + Math.max(0, h - 8) * 0.08), amp: h >= 1 ? 1.1 : 0 });
    if (h >= 7) for (const sd of [-1, 1]) P.push({ x0: sd * 1.1, x: sd * 1.1, y: SUDDEN.y, r, ph: aRand(0, TAU), w: 1.2 * sd, amp: 0.7, fake: true });
    if (h >= 4) for (const [y, v] of [[1.8, 1.4], [2.9, -1.7]]) P.push({ kind: "blade", x: aRand(-2, 2), y, z: 6.2, v: v * (1 + Math.max(0, h - 4) * 0.1) });
    ATTR.props = P;
  }
  // ── Swing Time: the target's place on the pendulum now
  function swingAmp() { const h = game.hits; return h < 6 ? 0.42 : Math.min(0.95, 0.72 + (h - 6) * 0.03); }
  const swingW = () => { const h = game.hits; return h < 3 ? 1.5 : h < 6 ? 2.1 : h < 9 ? 2.3 : 2.5 + Math.min(0.8, (h - 9) * 0.08); };
  function swingPos(ahead = 0) { const ph = ATTR.ph + ahead * swingW(), a = swingAmp() * Math.sin(ph), da = swingAmp() * Math.cos(ph); return { x: Math.sin(a) * SWING.L, y: SWING.py - Math.cos(a) * SWING.L, a, vx: Math.cos(a) * da * SWING.L }; }
  function swingRodHit(c) {
    const P = swingPos(), ax = 0, ay = SWING.py, bx = P.x, by = P.y, ex = bx - ax, ey = by - ay, u = clamp(((c.x - ax) * ex + (c.y - ay) * ey) / (ex * ex + ey * ey), 0, 1);
    return u < 0.85 && Math.hypot(c.x - (ax + ex * u), c.y - (ay + ey * u)) < SKULL_R + 0.05;
  }

  // ───────────────────────── drawing ─────────────────────────
  // the booth every attraction stands in: a painted back wall, two posts, a scalloped awning with a row of bulbs, the
  // name on a board over it. Everything flat faces the camera, so a rectangle at one depth is a rectangle on screen.
  const RECT = (x0, y0, x1, y1, z) => { const a = project(x0, y1, z), b = project(x1, y0, z); return { x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y, s: a.s }; };
  function paintPlanks(r, base, dark, n) {
    ctx.fillStyle = base; ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = dark; ctx.lineWidth = Math.max(1, r.s * 0.012);
    for (let i = 1; i < n; i++) { const x = r.x + (r.w * i) / n + Math.sin(i * 7.1) * r.s * 0.01; ctx.beginPath(); ctx.moveTo(x, r.y); ctx.lineTo(x, r.y + r.h); ctx.stroke(); }
    const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h); g.addColorStop(0, "rgba(255,244,214,.10)"); g.addColorStop(1, "rgba(20,10,0,.28)"); ctx.fillStyle = g; ctx.fillRect(r.x, r.y, r.w, r.h);
  }
  function drawBooth(o) {
    const zf = o.zf, a = project(o.x0, o.top, zf), b = project(o.x1, o.top, zf), g0 = project(o.x0, 0, zf), s = a.s;
    ctx.save(); ctx.lineJoin = "round"; ctx.strokeStyle = INK;
    // posts
    const pw = s * 0.16;
    for (const x of [a.x, b.x]) { ctx.fillStyle = o.post || "#6B4526"; ctx.lineWidth = Math.max(1.5, s * 0.02); ctx.beginPath(); ctx.rect(x - pw / 2, a.y, pw, g0.y - a.y); ctx.fill(); ctx.stroke(); ctx.fillStyle = "rgba(255,240,210,.18)"; ctx.fillRect(x - pw / 2 + 1, a.y, pw * 0.25, g0.y - a.y); }
    // the awning: stripes, a scalloped hem, bulbs along it
    const ah = s * 0.5, n = o.stripes || 10, sw = (b.x - a.x) / n;
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = o.awning[i % 2]; ctx.beginPath(); ctx.moveTo(a.x + i * sw, a.y - ah); ctx.lineTo(a.x + (i + 1) * sw, a.y - ah); ctx.lineTo(a.x + (i + 1) * sw, a.y);
      ctx.quadraticCurveTo(a.x + (i + 0.5) * sw, a.y + ah * 0.38, a.x + i * sw, a.y); ctx.closePath(); ctx.fill();
    }
    ctx.lineWidth = Math.max(1.5, s * 0.02); ctx.beginPath(); ctx.moveTo(a.x, a.y - ah);
    for (let i = 0; i < n; i++) { ctx.lineTo(a.x + i * sw, a.y); ctx.quadraticCurveTo(a.x + (i + 0.5) * sw, a.y + ah * 0.38, a.x + (i + 1) * sw, a.y); }
    ctx.lineTo(b.x, a.y - ah); ctx.closePath(); ctx.stroke();
    const blink = Math.floor(game.time * 3), lit = ATTR.flash > 0;
    for (let i = 0; i <= n; i++) { const on = lit ? (Math.floor(game.time * 12) + i) % 2 : (i + blink) % 3 !== 0; ctx.fillStyle = on ? "#FFE9A0" : "#6B5A3A"; ctx.beginPath(); ctx.arc(a.x + i * sw, a.y - ah, Math.max(1.5, s * 0.035), 0, TAU); ctx.fill(); ctx.stroke(); }
    ctx.restore();
    if (o.sign) drawSignBoard(o.sign, 0, o.signY || 0.55, zf - 0.02, o);   // the name, on a board at the foot of the booth (clear of the HUD)
  }
  // a painted sign: a board with an inner line and the name in the display face, centred on (x, y) at depth z
  function drawSignBoard(text, x, y, z, o) {
    const p = project(x, y, z), s = p.s, fs = Math.max(10, Math.round(s * 0.26)), w = fs * 0.6 * text.length + fs * 1.4, sh = fs * 1.35, sx = p.x - w / 2, sy = p.y - sh / 2;
    ctx.save(); ctx.strokeStyle = INK; ctx.lineJoin = "round";
    ctx.fillStyle = o.signBg; ctx.lineWidth = Math.max(2, s * 0.02); ctx.beginPath(); rr(ctx, sx, sy, w, sh, sh * 0.25); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = o.signLine || GOLD; ctx.lineWidth = Math.max(1, s * 0.01); ctx.beginPath(); rr(ctx, sx + sh * 0.12, sy + sh * 0.12, w - sh * 0.24, sh * 0.76, sh * 0.18); ctx.stroke();
    ctx.fillStyle = o.signInk || INK; ctx.font = `${fs}px ${DISPLAY}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(text, p.x, sy + sh * 0.56);
    ctx.restore();
  }
  function drawBoothCounter(x0, x1, z, h, top, face) {
    const r = RECT(x0, 0, x1, h, z), lip = r.s * 0.07;
    ctx.save(); ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.5, r.s * 0.02);
    ctx.fillStyle = face; ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.fill(); ctx.stroke();
    const n = 7; for (let i = 0; i < n; i++) { ctx.fillStyle = i % 2 ? "rgba(255,240,210,.12)" : "rgba(0,0,0,.08)"; ctx.fillRect(r.x + (r.w * i) / n, r.y + lip, r.w / n, r.h - lip); }
    ctx.fillStyle = top; ctx.beginPath(); ctx.rect(r.x - lip, r.y - lip * 0.4, r.w + lip * 2, lip * 1.4); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  function drawTargetDisc(p, r, o = {}) {   // a painted bullseye, gold for the golden ones, inked
    const rings = o.gold ? ["#E3B64B", "#FFF1B8", "#E3B64B", "#FFF1B8", "#C8942E"] : o.cols || ["#C0392B", "#F2E7C9", "#C0392B", "#F2E7C9", "#C0392B"];
    ctx.save(); ctx.translate(p.x, p.y); if (o.sx != null) ctx.scale(o.sx, 1); if (o.sy != null) ctx.scale(1, o.sy);
    ctx.lineWidth = Math.max(1.5, r * 0.12); ctx.strokeStyle = INK;
    rings.forEach((c, i) => { ctx.beginPath(); ctx.arc(0, 0, r * (1 - i * 0.2), 0, TAU); ctx.fillStyle = c; ctx.fill(); if (!i) ctx.stroke(); });
    ctx.fillStyle = "rgba(255,255,255,.3)"; ctx.beginPath(); ctx.ellipse(-r * 0.35, -r * 0.4, r * 0.22, r * 0.12, -0.6, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function drawDuck(p, r, flip) {   // a tin duck: a yellow body, a bill, an eye, on a stalk
    ctx.save(); ctx.translate(p.x, p.y); ctx.scale(flip ? -1 : 1, 1); ctx.lineWidth = Math.max(1.5, r * 0.12); ctx.strokeStyle = INK;
    ctx.fillStyle = "#6E6A72"; ctx.fillRect(-r * 0.08, r * 0.5, r * 0.16, r * 0.9);
    ctx.fillStyle = "#E8C24A"; ctx.beginPath(); ctx.ellipse(0, r * 0.2, r * 0.95, r * 0.55, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(r * 0.55, -r * 0.35, r * 0.42, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#E8893A"; ctx.beginPath(); ctx.moveTo(r * 0.9, -r * 0.4); ctx.lineTo(r * 1.35, -r * 0.28); ctx.lineTo(r * 0.9, -r * 0.16); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(r * 0.62, -r * 0.45, r * 0.08, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(90,60,10,.6)"; ctx.lineWidth = Math.max(1, r * 0.07); ctx.beginPath(); ctx.arc(-r * 0.1, r * 0.15, r * 0.45, 0.2, 2.2); ctx.stroke();
    ctx.restore();
  }
  function drawStar(p, r, gold) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.lineWidth = Math.max(1.5, r * 0.12); ctx.strokeStyle = INK; ctx.fillStyle = gold ? GOLD : "#D8DCE2";
    ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr2 = i % 2 ? r * 0.45 : r; ctx.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2); } ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.beginPath(); ctx.arc(-r * 0.2, -r * 0.2, r * 0.18, 0, TAU); ctx.fill(); ctx.restore();
  }
  const signTxt = m => t(`mode.${m}.name`).toUpperCase();

  // ── 🎯 the gallery
  function drawGallery(front) {
    if (front) {
      drawBooth({ x0: GAL.x0 - 0.1, x1: GAL.x1 + 0.1, top: GAL.top + 0.15, zf: 6.3, awning: ["#3E6F8E", "#EFE3C4"] });
      drawBoothCounter(GAL.x0 - 0.2, GAL.x1 + 0.2, 6.2, 0.8, "#8C6239", "#3E6F8E");
      drawSignBoard(signTxt("gallery"), 0, 0.42, 6.18, { signBg: "#EFE3C4", signInk: "#2E4F6A", signLine: "#3E6F8E" });
      return;
    }
    const W0 = RECT(GAL.x0, 0.7, GAL.x1, GAL.top, GAL.back);
    paintPlanks(W0, "#6F95A8", "rgba(30,50,60,.35)", 12);
    ctx.save(); ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.5, W0.s * 0.02); ctx.strokeRect(W0.x, W0.y, W0.w, W0.h);
    // the painted border and the stars on the wall
    ctx.strokeStyle = "rgba(239,227,196,.55)"; ctx.lineWidth = Math.max(2, W0.s * 0.05); ctx.strokeRect(W0.x + W0.s * 0.1, W0.y + W0.s * 0.1, W0.w - W0.s * 0.2, W0.h - W0.s * 0.2);
    // the bell at the top
    const bp = project(0, GAL.top - 0.05, GAL.back - 0.05), br = 0.2 * bp.s, sw = ATTR.flash > 0 ? Math.sin(game.time * 30) * 0.4 * ATTR.flash : 0;
    ctx.save(); ctx.translate(bp.x, bp.y - br); ctx.rotate(sw); ctx.fillStyle = GOLD; ctx.lineWidth = Math.max(1.5, br * 0.12);
    ctx.beginPath(); ctx.moveTo(-br, br * 1.2); ctx.quadraticCurveTo(-br * 0.9, -br * 0.9, 0, -br); ctx.quadraticCurveTo(br * 0.9, -br * 0.9, br, br * 1.2); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#8C6239"; ctx.beginPath(); ctx.arc(0, br * 1.3, br * 0.22, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore();
    // the rails the targets run on
    ctx.strokeStyle = INK;
    for (const y of GAL.rows) { const a = project(GAL.x0, y - 0.38, GAL.back - 0.02), b = project(GAL.x1, y - 0.38, GAL.back - 0.02); ctx.fillStyle = "#4A3524"; ctx.fillRect(a.x, a.y, b.x - a.x, Math.max(3, a.s * 0.07)); ctx.strokeRect(a.x, a.y, b.x - a.x, Math.max(3, a.s * 0.07)); }
    ctx.restore();
    for (const p of ATTR.props) {
      const k = p.down ? Math.max(0, 1 - p.down / 0.25) : p.up;   // up on its hinge; knocked, it flips back down
      if (k <= 0.02) continue;
      const q = project(p.x, p.y, GAL.z), r = p.r * q.s, base = q.y + r * 1.05;
      ctx.save(); ctx.translate(0, base); ctx.scale(1, k); ctx.translate(0, -base);
      if (p.type === "pop") { ctx.fillStyle = "#4A3524"; ctx.fillRect(q.x - r * 0.08, q.y + r * 0.8, r * 0.16, r * 0.3); }
      if (p.type === "duck") drawDuck(q, r, p.v < 0);
      else if (p.type === "plate") drawTargetDisc(q, r, { sx: Math.max(0.06, Math.abs(Math.cos(p.a || 0))), cols: ["#F2E7C9", "#3E6F8E", "#F2E7C9", "#3E6F8E", "#C0392B"] });
      else if (p.type === "star") drawStar(q, r, false);
      else if (p.type === "gold") drawStar(q, r * 1.1, true);
      else drawTargetDisc(q, r);
      ctx.restore();
    }
    const c0 = RECT(GAL.x0, 0.7, GAL.x1, 0.92, GAL.z + 0.01); ctx.fillStyle = "#2E4F6A"; ctx.fillRect(c0.x, c0.y, c0.w, c0.h);
  }

  // ── 🥫 the can booth (the cans are drawn by drawCans, 07o_bonus.js)
  function drawCanBooth(front) {
    if (front) { drawBooth({ x0: -2.5, x1: 2.5, top: 3.75, zf: 6.4, awning: ["#C8503A", "#F2E7C9"], stripes: 12, sign: signTxt("cans"), signBg: "#F2E7C9", signInk: "#9A2F22", signLine: "#C8503A" }); return; }
    const W0 = RECT(-2.4, 0.3, 2.4, 3.7, CANS.z + 0.75);
    paintPlanks(W0, "#8A5A3A", "rgba(40,20,10,.4)", 10);
    ctx.save(); ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.5, W0.s * 0.02); ctx.strokeRect(W0.x, W0.y, W0.w, W0.h);
    // painted stripes and a target painted on the back wall to aim the eye
    const n = 10; for (let i = 0; i < n; i += 2) { ctx.fillStyle = "rgba(200,80,58,.35)"; ctx.fillRect(W0.x + (W0.w * i) / n, W0.y, W0.w / n, W0.h); }
    ctx.restore();
    const bell = project(0, 3.4, CANS.z + 0.7), br = 0.16 * bell.s;
    ctx.save(); ctx.translate(bell.x, bell.y); ctx.rotate(ATTR.flash > 0 ? Math.sin(game.time * 30) * 0.4 * ATTR.flash : 0); ctx.fillStyle = GOLD; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.5, br * 0.12);
    ctx.beginPath(); ctx.moveTo(-br, br); ctx.quadraticCurveTo(-br * 0.9, -br * 1.1, 0, -br * 1.2); ctx.quadraticCurveTo(br * 0.9, -br * 1.1, br, br); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
  }

  // ── 🏹 the range: lane lines receding, distance flags every ten metres, the board on its legs
  function drawRange(front) {
    if (front) {   // the range's signpost, off to one side
      const g = project(-2.1, 0, 8.5), top = project(-2.1, 1.1, 8.5); ctx.save(); ctx.strokeStyle = INK; ctx.fillStyle = "#6B4526"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.rect(top.x - top.s * 0.05, top.y, top.s * 0.1, g.y - top.y); ctx.fill(); ctx.stroke(); ctx.restore();
      drawSignBoard(signTxt("longshot"), -2.1, 1.15, 8.48, { signBg: "#F2E7C9", signInk: "#6B3A1E", signLine: "#C8503A" });
      return;
    }
    const z1 = ATTR.zp + 12;
    ctx.save(); ctx.strokeStyle = "rgba(242,231,201,.55)"; ctx.lineCap = "round";
    for (const x of [-1.6, 1.6]) { const a = project(x, 0, 3.2), b = project(x, 0, z1); ctx.lineWidth = Math.max(1, a.s * 0.03); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
    for (let z = 10; z <= z1; z += 5) {   // the chalk lines, and a flag every ten metres
      const a = project(-1.6, 0, z), b = project(1.6, 0, z); ctx.lineWidth = Math.max(1, a.s * (z % 10 ? 0.012 : 0.025)); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      if (z % 10) continue;
      const f = project(-2.1, 0, z), top = project(-2.1, 1.1, z), fs = Math.max(7, Math.round(f.s * 0.24));
      ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, f.s * 0.02); ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(top.x, top.y); ctx.stroke();
      ctx.fillStyle = z === ATTR.zp ? GOLD : "#C8503A"; ctx.beginPath(); ctx.moveTo(top.x, top.y); ctx.lineTo(top.x + f.s * 0.5, top.y + f.s * 0.14); ctx.lineTo(top.x, top.y + f.s * 0.28); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = CREAM; ctx.font = `${fs}px ${NUMFONT}`; ctx.textAlign = "center"; ctx.fillText(`${z}`, f.x, f.y + fs * 0.9);
      ctx.strokeStyle = "rgba(242,231,201,.55)";
    }
    ctx.restore();
    // the board: a painted bullseye on two legs, its distance on a plate beneath
    const z = ATTR.zp, r = longR(z), P = project(0, LONG.y, z), R = r * P.s, g = project(0, 0, z);
    ctx.save(); ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.2, P.s * 0.02);
    for (const sd of [-1, 1]) { const top = project(sd * r * 0.5, LONG.y - r * 0.6, z), bot = project(sd * r * 0.75, 0, z); ctx.fillStyle = "#6B4526"; ctx.beginPath(); ctx.moveTo(top.x - P.s * 0.04, top.y); ctx.lineTo(top.x + P.s * 0.04, top.y); ctx.lineTo(bot.x + P.s * 0.05, bot.y); ctx.lineTo(bot.x - P.s * 0.05, bot.y); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.beginPath(); ctx.ellipse(g.x, g.y, R * 1.1, R * 0.18, 0, 0, TAU); ctx.fill();
    ctx.restore();
    drawTargetDisc(P, R);
    const pl = project(0, LONG.y - r - 0.12, z), fs = Math.max(8, Math.round(P.s * 0.2));
    ctx.save(); ctx.fillStyle = CREAM; ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath(); rr(ctx, pl.x - fs * 1.4, pl.y - fs * 0.7, fs * 2.8, fs * 1.2, fs * 0.2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = INK; ctx.font = `${fs}px ${NUMFONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(`${z} m`, pl.x, pl.y - fs * 0.08); ctx.restore();
  }

  // ── 🎭 the little stage
  function curtainOpenK() { const C = ATTR.cur; if (!C) return 0; if (C.phase === "open") return clamp(C.t / 0.3, 0, 1); if (C.phase === "closing") return 1 - clamp(C.t / 0.25, 0, 1); return 0; }
  function drawStage(front) {
    const R0 = RECT(CURT.x0, CURT.floor, CURT.x1, CURT.top, CURT.z + 0.02);
    if (!front) {
      const B = RECT(CURT.x0, CURT.floor, CURT.x1, CURT.top, CURT.back); ctx.fillStyle = "#2A1418"; ctx.fillRect(B.x, B.y, B.w, B.h);
      const fin = ATTR.cur && ATTR.cur.fin, k = curtainOpenK();
      if (k > 0) {   // the spotlight on the act
        const sp = project(ATTR.props[0] ? ATTR.props[0].x : 0, 2.5, CURT.back), g = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, sp.s * (fin ? 1.6 : 1.1));
        g.addColorStop(0, `rgba(255,236,170,${0.35 * k})`); g.addColorStop(1, "rgba(255,236,170,0)"); ctx.fillStyle = g; ctx.fillRect(B.x, B.y, B.w, B.h);
        for (const p of ATTR.props) if (p.live && !p.hit) drawTargetDisc(project(p.x, p.y, CURT.z), p.r * project(p.x, p.y, CURT.z).s, { gold: !!p.fin });
      }
      const st = RECT(CURT.x0 - 0.2, 0, CURT.x1 + 0.2, CURT.floor, CURT.z + 0.1); ctx.fillStyle = "#6B4526"; ctx.fillRect(st.x, st.y, st.w, st.h); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(st.x, st.y, st.w, st.h);
      // footlights along the lip of the stage
      for (let i = 0; i < 9; i++) { const f = project(CURT.x0 + 0.25 + i * (CURT.x1 - CURT.x0 - 0.5) / 8, CURT.floor, CURT.z - 0.05); ctx.fillStyle = k > 0 ? "#FFE9A0" : "#8A7650"; ctx.beginPath(); ctx.arc(f.x, f.y, Math.max(2, f.s * 0.05), Math.PI, 0); ctx.fill(); ctx.stroke(); }
      return;
    }
    // the curtains, pulled back to the sides as they open, with gold fringe; the proscenium arch over them
    const k = curtainOpenK(), half = R0.w / 2, open = half * 0.86 * k;
    ctx.save(); ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.5, R0.s * 0.02);
    for (const sd of [-1, 1]) {
      const x0 = sd < 0 ? R0.x : R0.x + half + open, w = half - open, folds = 5;
      if (w < 1) continue;
      const g = ctx.createLinearGradient(x0, 0, x0 + w, 0); for (let i = 0; i <= folds; i++) g.addColorStop(i / folds, i % 2 ? "#5E1A22" : "#9A2A36");
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x0, R0.y); ctx.lineTo(x0 + w, R0.y);
      ctx.quadraticCurveTo(x0 + w - sd * w * 0.08 * k, R0.y + R0.h * 0.6, x0 + w, R0.y + R0.h); ctx.lineTo(x0, R0.y + R0.h); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = GOLD; ctx.fillRect(x0, R0.y + R0.h - R0.s * 0.08, w, R0.s * 0.08);
    }
    const ar = RECT(CURT.x0 - 0.35, CURT.top - 0.05, CURT.x1 + 0.35, CURT.top + 0.45, CURT.z - 0.02);
    ctx.fillStyle = "#7A1E2A"; ctx.beginPath(); ctx.rect(ar.x, ar.y, ar.w, ar.h); ctx.fill(); ctx.stroke();
    ctx.fillStyle = GOLD; ctx.font = `${Math.max(10, Math.round(ar.s * 0.3))}px ${DISPLAY}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(signTxt("curtain"), ar.x + ar.w / 2, ar.y + ar.h * 0.55);
    for (const x of [CURT.x0 - 0.2, CURT.x1 + 0.2]) { const c = RECT(x - 0.14, 0, x + 0.14, CURT.top + 0.4, CURT.z - 0.03); ctx.fillStyle = "#C49A42"; ctx.fillRect(c.x, c.y, c.w, c.h); ctx.strokeRect(c.x, c.y, c.w, c.h); }
    ctx.restore();
    // the audience: heads along the bottom of the picture, either side of the launcher
    ctx.save(); ctx.fillStyle = "rgba(12,8,10,.9)"; const hr = U * 0.05;
    for (let i = 0; i < 14; i++) { const x = (i + 0.5) * (W / 14); if (Math.abs(x - W / 2) < U * 0.2) continue; const bob = ATTR.flash > 0 || (ATTR.cur && ATTR.cur.fin && k > 0) ? Math.abs(Math.sin(game.time * 9 + i)) * hr * 0.5 : 0; ctx.beginPath(); ctx.arc(x, H - hr * 0.6 - bob, hr, 0, TAU); ctx.fill(); ctx.fillRect(x - hr * 1.3, H - hr * 0.4 - bob, hr * 2.6, hr * 2); }
    ctx.restore();
  }

  // ── 🎳 the pitch board
  function drawPitchBoard(front) {
    if (front) { drawBooth({ x0: PITCH.x0 - 0.2, x1: PITCH.x1 + 0.2, top: PITCH.y1 + 0.2, zf: 6.6, awning: ["#356B68", "#F2E7C9"], sign: signTxt("pitch"), signBg: "#C49A42", signInk: INK, signLine: "#F2E7C9", signY: 0.4 }); return; }
    const B = RECT(PITCH.x0, PITCH.y0, PITCH.x1, PITCH.y1, PITCH.z + 0.02);
    paintPlanks(B, "#E8D8B4", "rgba(120,90,50,.3)", 9);
    ctx.save(); ctx.strokeStyle = INK; ctx.lineWidth = Math.max(2, B.s * 0.025); ctx.strokeRect(B.x, B.y, B.w, B.h);
    const lit = ATTR.flash > 0;
    for (let i = 0; i < 18; i++) {   // the marquee bulbs round the board: chasing when a PERFECT PITCH lands
      const u = i / 18, per = 2 * (B.w + B.h), d = u * per, pos = d < B.w ? [B.x + d, B.y] : d < B.w + B.h ? [B.x + B.w, B.y + d - B.w] : d < 2 * B.w + B.h ? [B.x + B.w - (d - B.w - B.h), B.y + B.h] : [B.x, B.y + B.h - (d - 2 * B.w - B.h)];
      const on = lit ? (i + Math.floor(game.time * 14)) % 3 === 0 : i % 2 === Math.floor(game.time * 1.5) % 2; ctx.fillStyle = on ? "#FFE9A0" : "#7A6A4A"; ctx.beginPath(); ctx.arc(pos[0], pos[1], Math.max(2, B.s * 0.045), 0, TAU); ctx.fill(); ctx.stroke();
    }
    for (const h of PITCH.holes) {
      const p = project(h.x, h.y, PITCH.z), r = h.r * p.s, col = h.pts === 100 ? "#C0392B" : h.pts === 50 ? "#356B68" : h.pts === 25 ? "#C49A42" : "#66506B";
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(p.x, p.y, r * 1.45, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#0E0A08"; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,.15)"; ctx.beginPath(); ctx.arc(p.x, p.y + r * 0.15, r * 0.8, Math.PI * 1.1, Math.PI * 1.9); ctx.fill();
      const fs = Math.max(8, Math.round(p.s * 0.2)); ctx.fillStyle = CREAM; ctx.font = `${fs}px ${NUMFONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(`${h.pts}`, p.x, p.y - r * 1.45 - fs * 0.1 + (h.pts === 10 ? r * 2.9 + fs * 0.2 : 0));
    }
    ctx.restore();
  }

  // ── 🌪 the wind booth: a weathered wall, the wind machine on the upwind side, pennants that snap
  function drawGaleBooth(front) {
    const w = HZ.wind, dir = w >= 0 ? 1 : -1, n = Math.abs(w);
    if (front) {
      drawBooth({ x0: -2.6, x1: 2.6, top: 3.85, zf: 6.4, awning: ["#5E7482", "#C9CFD2"], sign: signTxt("gale"), signBg: "#C9CFD2", signInk: "#2E3E48", signLine: "#5E7482", signY: 0.35 });
      // the machine: a drum on a stand, a cage, blades spinning with the strength of it (on the upwind side)
      const m = project(-dir * 2.05, 1.25, 5.6), r = 0.55 * m.s;
      ctx.save(); ctx.strokeStyle = INK; ctx.lineWidth = Math.max(2, m.s * 0.025);
      const leg = project(-dir * 2.05, 0, 5.6); ctx.fillStyle = "#4E4A52"; ctx.fillRect(m.x - r * 0.12, m.y, r * 0.24, leg.y - m.y); ctx.strokeRect(m.x - r * 0.12, m.y, r * 0.24, leg.y - m.y);
      ctx.fillStyle = "#6E7E88"; ctx.beginPath(); ctx.arc(m.x, m.y, r, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(ATTR.t * (6 + n * 8) * dir); ctx.fillStyle = "#B8C2C8";
      for (let i = 0; i < 4; i++) { ctx.rotate(TAU / 4); ctx.beginPath(); ctx.ellipse(r * 0.45, 0, r * 0.42, r * 0.16, 0.3, 0, TAU); ctx.fill(); ctx.stroke(); }
      ctx.restore();
      ctx.strokeStyle = "rgba(23,19,15,.8)"; ctx.lineWidth = Math.max(1, m.s * 0.012); for (let i = 1; i <= 3; i++) { ctx.beginPath(); ctx.arc(m.x, m.y, r * i / 3, 0, TAU); ctx.stroke(); }
      ctx.fillStyle = "#C49A42"; ctx.beginPath(); ctx.arc(m.x, m.y, r * 0.12, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.restore();
      // the flying bits: paper and dust
      for (const b of ATTR.bits) {
        const p = project(b.x, b.y, b.z), s = p.s * 0.1 * b.s;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(b.rot);
        if (b.kind === "paper") { ctx.fillStyle = "rgba(242,231,201,.9)"; ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.beginPath(); ctx.rect(-s, -s * 0.7, s * 2, s * 1.4); ctx.fill(); ctx.stroke(); }
        else { ctx.fillStyle = "rgba(200,180,140,.22)"; ctx.beginPath(); ctx.arc(0, 0, s * 0.7, 0, TAU); ctx.fill(); }
        ctx.restore();
      }
      return;
    }
    const B = RECT(-2.5, 0.3, 2.5, 3.8, 7.6); paintPlanks(B, "#7E8E98", "rgba(30,40,50,.35)", 10);
    ctx.save(); ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.5, B.s * 0.02); ctx.strokeRect(B.x, B.y, B.w, B.h);
    ctx.strokeStyle = "rgba(242,231,201,.35)"; ctx.lineCap = "round"; ctx.lineWidth = Math.max(1.5, B.s * 0.03);   // painted wind lines, the way it's blowing
    for (let i = 0; i < 5; i++) { const y = B.y + B.h * (0.15 + i * 0.17), x = B.x + ((ATTR.t * 60 * dir * (0.5 + n * 0.4) + i * 97) % B.w + B.w) % B.w; ctx.beginPath(); ctx.moveTo(x, y); ctx.bezierCurveTo(x + dir * 30, y - 8, x + dir * 50, y + 6, x + dir * 80, y); ctx.stroke(); }
    ctx.restore();
    for (const x of [-1.8, 0, 1.8]) {   // pennants on poles, snapping out downwind
      const b = project(x, 2.9, 7.4), top = project(x, 3.6, 7.4), L = (0.35 + n * 0.12) * b.s, flap = Math.sin(ATTR.t * (6 + n * 5) + x) * b.s * 0.05 * (0.4 + n * 0.3);
      ctx.save(); ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.5, b.s * 0.02); ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(top.x, top.y); ctx.stroke();
      ctx.fillStyle = x === 0 ? "#C8503A" : GOLD; ctx.beginPath(); ctx.moveTo(top.x, top.y); ctx.quadraticCurveTo(top.x + dir * L * 0.5, top.y + flap, top.x + dir * L, top.y + b.s * 0.1 + flap * 1.5); ctx.lineTo(top.x, top.y + b.s * 0.22); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    }
    // the bullseye on its post
    const P = project(0, 2.3, 7.0), g = project(0, 0, 7.0);
    ctx.save(); ctx.fillStyle = "#6B4526"; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.fillRect(P.x - P.s * 0.07, P.y, P.s * 0.14, g.y - P.y); ctx.strokeRect(P.x - P.s * 0.07, P.y, P.s * 0.14, g.y - P.y); ctx.restore();
    drawTargetDisc(P, 0.42 * P.s);
  }

  // ── ☠ the dark: everything but the spotlight goes black; the target, and what the hits have added
  function drawSudden(front) {
    if (front) {
      for (const p of ATTR.props) if (p.kind === "blade") {   // the blades: long scythes of tin crossing in front
        const q = project(p.x, p.y, p.z), L = 0.55 * q.s; ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(ATTR.t * 8 * Math.sign(p.v));
        ctx.fillStyle = "#B8C2C8"; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.5, q.s * 0.02);
        for (let i = 0; i < 2; i++) { ctx.rotate(Math.PI); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(L * 0.6, -L * 0.35, L, 0); ctx.quadraticCurveTo(L * 0.6, -L * 0.1, 0, 0); ctx.fill(); ctx.stroke(); }
        ctx.fillStyle = "#4E4A52"; ctx.beginPath(); ctx.arc(0, 0, q.s * 0.06, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore();
      }
      return;
    }
    const main = ATTR.props.find(p => !p.kind && !p.fake), sp = main ? project(main.x, main.y, SUDDEN.z) : project(0, SUDDEN.y, SUDDEN.z);
    ctx.save(); ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const g = ctx.createRadialGradient(sp.x, sp.y, sp.s * 0.35, sp.x, sp.y, Math.max(W, H) * 0.7);
    g.addColorStop(0, "rgba(6,4,10,.1)"); g.addColorStop(0.18, "rgba(6,4,10,.78)"); g.addColorStop(1, "rgba(6,4,10,.95)");
    ctx.fillStyle = g; ctx.fillRect(-20, -20, W + 40, H + 40);
    const cone = ctx.createLinearGradient(sp.x, 0, sp.x, sp.y); cone.addColorStop(0, "rgba(255,240,200,0)"); cone.addColorStop(1, "rgba(255,240,200,.16)");
    ctx.fillStyle = cone; ctx.beginPath(); ctx.moveTo(sp.x - sp.s * 0.08, 0); ctx.lineTo(sp.x + sp.s * 0.08, 0); ctx.lineTo(sp.x + sp.s * 0.7, sp.y + sp.s * 0.3); ctx.lineTo(sp.x - sp.s * 0.7, sp.y + sp.s * 0.3); ctx.closePath(); ctx.fill();
    ctx.restore();
    for (const p of ATTR.props) {
      if (p.kind || p.gone) continue;
      const q = project(p.x, p.y, SUDDEN.z);
      ctx.save(); if (p.fake) ctx.globalAlpha = 0.8 + 0.2 * Math.sin(game.time * 17 + p.x);   // (a fake flickers, if you look)
      drawTargetDisc(q, p.r * q.s, { cols: ["#8C1F2A", "#E8D8B4", "#8C1F2A", "#E8D8B4", "#8C1F2A"] }); ctx.restore();
    }
  }

  // ── 🎠 the pendulum: an iron frame, a pivot, a rod, and the target on the end
  function drawSwing(front) {
    const P = swingPos(), piv = project(0, SWING.py, SWING.z), q = project(P.x, P.y, SWING.z);
    if (front) {
      ctx.save(); ctx.strokeStyle = INK; ctx.lineJoin = "round";
      const beamA = project(-2.3, SWING.py + 0.2, SWING.z - 0.1), beamB = project(2.3, SWING.py + 0.2, SWING.z - 0.1), bw = beamA.s * 0.2;
      for (const sd of [-1, 1]) {   // the A-frames, riveted
        const top = project(sd * 2.2, SWING.py + 0.2, SWING.z - 0.1), f1 = project(sd * 2.6, 0, SWING.z - 0.5), f2 = project(sd * 1.8, 0, SWING.z + 0.3);
        for (const f of [f1, f2]) { ctx.lineWidth = bw + 3; ctx.beginPath(); ctx.moveTo(top.x, top.y); ctx.lineTo(f.x, f.y); ctx.stroke(); ctx.strokeStyle = "#7A5230"; ctx.lineWidth = bw; ctx.stroke(); ctx.strokeStyle = INK; }
      }
      ctx.fillStyle = "#7A5230"; ctx.lineWidth = Math.max(2, beamA.s * 0.02); ctx.beginPath(); ctx.rect(beamA.x, beamA.y - bw / 2, beamB.x - beamA.x, bw); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#4E4A52"; for (const x of [beamA.x + bw, (beamA.x + beamB.x) / 2, beamB.x - bw]) { ctx.beginPath(); ctx.arc(x, beamA.y, bw * 0.18, 0, TAU); ctx.fill(); ctx.stroke(); }
      ctx.restore();
      drawSignBoard(signTxt("swing"), 0, 0.45, SWING.z - 0.6, { signBg: "#EFE3C4", signInk: "#6B3A1E", signLine: "#7A5230" });
      return;
    }
    // its shadow swinging on the ground, the rod, the target
    const gnd = project(P.x, 0, SWING.z); ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.beginPath(); ctx.ellipse(gnd.x, gnd.y, SWING.r * q.s, SWING.r * q.s * 0.2, 0, 0, TAU); ctx.fill();
    ctx.save(); ctx.lineCap = "round"; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(3, piv.s * 0.06); ctx.beginPath(); ctx.moveTo(piv.x, piv.y); ctx.lineTo(q.x, q.y); ctx.stroke();
    ctx.strokeStyle = "#8A8E96"; ctx.lineWidth = Math.max(1.5, piv.s * 0.035); ctx.stroke();
    ctx.fillStyle = "#4E4A52"; ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.beginPath(); ctx.arc(piv.x, piv.y, piv.s * 0.09, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore();
    ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(P.a * 0.6); drawTargetDisc({ x: 0, y: 0 }, SWING.r * q.s, { cols: ["#C49A42", "#F2E7C9", "#356B68", "#F2E7C9", "#C0392B"] }); ctx.restore();
  }

  // the attraction, back (behind the plane) and front (nearer than it)
  function drawAttraction(front) { if (ATTR.on && game.state !== "title") ATTRS[ATTR.kind].draw(front); }
