  // ───────────────────────── the boss framework, and the fourteen new bosses ─────────────────────────
  // Every boss is a carrier (how it moves the ring during the fight), an optional attack (volleys of things that knock
  // the skull out of the air, always told first), and a drawing. The Crow King and the Pumpkin King keep their own
  // hand-tuned code (07d_boss.js); every other boss is data here. Mini-bosses carry the ring and never attack; end
  // bosses stand far off, attack, get angrier at half health, and each is holding one of Morty's pieces.
  //   Production: concept → gimmick → carrier → attack → arena → phases → drawing → hit and defeat → sound → QA.
  const BOSS_DEFS = {
    batbaron:   { mini: true, hp: [5, 8], hang: 1.05, fall: "spin", bits: "#3A2A4A",
                  carrier: { kind: "perch", word: "SCREE!", sound: "screech", hold: [0.75, 1.5], tell: 0.45, move: 0.55,
                             spots: [[-1.2, 3.2, 6.0], [1.2, 1.6, 7.2], [0, 3.3, 5.2], [-1.1, 1.7, 7.4], [1.0, 3.0, 5.6], [0, 1.9, 7.8]] }, draw: drawBatBaron },
    scarecrow:  { mini: true, hp: [5, 8], fall: "topple", bits: "#C8A04A", body: { x: 0.2, z: 9.6 },
                  carrier: { kind: "sway", word: "CREAK!", sound: "gust", cx: 0, cy: 2.35, cz: 6.2, amp: 1.25, period: 2.8, lurch: 3, tell: 0.6 }, draw: drawScarecrowBoss },
    owl:        { mini: true, hp: [5, 8], hang: 1.0, fall: "spin", bits: "#E4DAC4",
                  carrier: { kind: "perch", word: "HOO-HOO!", sound: "caw", hold: [0.9, 1.6], tell: 0.55, move: 0.5,
                             spots: [[-1.3, 2.6, 5.4], [1.3, 2.2, 7.0], [-0.4, 2.9, 7.6], [1.1, 2.9, 5.2], [0, 2.0, 6.4]] }, draw: drawOwl },
    gator:      { mini: true, hp: [5, 8], fall: "sink", bits: "#4A7A4A",
                  carrier: { kind: "surface", word: "BLUB BLUB", sound: "poof", hold: [1.1, 1.8], tell: 0.7,
                             spots: [[-1.3, 1.7, 5.2], [1.2, 1.9, 7.3], [0, 2.3, 6.1], [-0.9, 2.1, 7.7], [1.4, 1.6, 5.5]] }, draw: drawGator },
    jester:     { mini: true, hp: [5, 8], fall: "sink", bits: "#A94332",
                  carrier: { kind: "bounce", word: "POP!", sound: "boing", cz: 6.4, ax: 1.35, period: 5.2, low: 1.45, high: 3.0, every: 2.6, tell: 0.6 }, draw: drawJester },
    cuckoo:     { mini: true, hp: [5, 8], fall: "spin", bits: "#E3B64B", body: { x: 0, z: 7.6 },
                  carrier: { kind: "orbit", word: "CUCKOO!", sound: "tick", cx: 0, cy: 2.45, cz: 6.9, r: 0.95, steps: 8, hold: [0.7, 1.1], move: 0.2, flipEvery: 5, tell: 0.4 }, draw: drawCuckoo },
    projectionist: { mini: true, hp: [5, 8], fall: "topple", bits: "#8A8E96", body: { x: -2.9, z: 9.2 },
                  carrier: { kind: "jump", word: "CLACK-CLACK", sound: "tick", hold: [0.9, 1.5], tell: 0.35,
                             spots: [[-1.2, 2.2, 6.0], [1.2, 2.6, 6.4], [0, 3.1, 5.8], [-0.6, 1.7, 6.6], [1.0, 1.8, 5.7]] }, draw: drawProjectionist },
    undertaker: { hp: [8, 12], fall: "topple", bits: "#6A4A2E", body: { x: 0.5, z: 13.6 },
                  carrier: { kind: "loop", rate: [0.72, 0.95], spots: [[-1.25, 2.1, 5.2], [1.3, 2.0, 7.4], [0.1, 3.0, 6.2]], seq: [0, 1, 2, 0, 2, 1] },
                  attack: { word: "THWUMP!", sound: "shovel", every: [4.6, 3.6], n: [3, 4], from: [1.5, 2.8, 12.6], shot: "clod" }, draw: drawUndertaker },
    count:      { hp: [8, 12], fall: "burst", bits: "#3A1A3A", body: { x: 0, z: 13.8 },
                  carrier: { kind: "circle", cx: 0, cy: 2.45, cz: 6.4, rx: 1.4, rz: 1.3, speed: [1.25, 1.7], flipEvery: 6, tell: 0.5, word: "BLAH!", sound: "screech" },
                  attack: { word: "BATS!", sound: "screech", every: [4.8, 3.8], n: [3, 4], from: [0, 3.2, 12.8], shot: "bat" }, draw: drawCount },
    marrowroot: { hp: [8, 12], fall: "topple", bits: "#E4DAC4", body: { x: 0, z: 14.2 },
                  carrier: { kind: "sway", word: "CREEAK!", sound: "rumble", cx: 0, cy: 2.35, cz: 6.3, amp: 1.45, period: [3.2, 2.5], lurch: 4, tell: 0.7 },
                  attack: { word: "LOOK OUT!", sound: "bonk", every: [4.4, 3.4], n: [3, 4], from: [0, 6.8, 4.6], shot: "bone", high: true }, draw: drawMarrowroot },
    madame:     { hp: [8, 12], fall: "sink", bits: "#4A3A20", body: { x: 0, z: 13.2 },
                  carrier: { kind: "surface", word: "BLUB BLUB", sound: "poof", hold: [1.2, 0.85], tell: 0.7,
                             spots: [[-1.3, 1.6, 5.2], [1.2, 1.8, 7.4], [0, 2.4, 6.0], [-0.8, 2.2, 7.8], [1.4, 1.5, 5.4]] },
                  attack: { word: "PTUI!", sound: "ptoo", every: [4.4, 3.4], n: [3, 4], from: [0, 2.0, 12.2], shot: "mud" }, draw: drawMadame },
    ringmaster: { hp: [8, 12], fall: "topple", bits: "#A94332", body: { x: 0, z: 13.6 },
                  carrier: { kind: "circle", cx: 0, cy: 2.5, cz: 6.5, rx: 1.5, rz: 1.35, speed: [1.5, 2.0], hop: 0.35, flipEvery: 5, tell: 0.5, word: "ALLEZ-OOP!", sound: "boing" },
                  attack: { word: "CATCH!", sound: "pop", every: [4.4, 3.4], n: [3, 4], from: [0.9, 3.0, 12.8], shot: "pin" }, draw: drawRingmaster },
    clockking:  { hp: [8, 12], fall: "burst", bits: "#C49A42", body: { x: 0, z: 14.0 },
                  carrier: { kind: "orbit", word: "TICK TOCK", sound: "tick", cx: 0, cy: 2.45, cz: 6.3, r: 1.1, steps: 12, hold: [0.6, 0.42], move: 0.16, flipEvery: 6, tell: 0.4 },
                  attack: { word: "CLANK!", sound: "clang", every: [4.4, 3.4], n: [3, 4], from: [0, 3.0, 13.0], shot: "gear" }, draw: drawClockKing },
    reaper:     { hp: [9, 13], fall: "burst", bits: "#1A1A1A", body: { x: 0, z: 14.4 },
                  carrier: { kind: "jump", word: "CUT!", sound: "tick", hold: [1.1, 0.75], tell: 0.35, angry: "circle",
                             spots: [[-1.3, 2.2, 6.0], [1.3, 2.7, 6.4], [0, 3.2, 5.7], [-0.7, 1.7, 6.8], [1.0, 1.8, 5.6], [0, 2.4, 6.3]],
                             cx: 0, cy: 2.5, cz: 6.4, rx: 1.5, rz: 1.4, speed: [1.8, 1.8] },
                  attack: { word: "SNIP!", sound: "clang", every: [4.2, 3.2], n: [3, 5], from: [0, 3.2, 13.4], shot: "frame" }, draw: drawReaper }
  };

  // ── carriers: at(t) → where the ring is at fight time t, and tell (0–1) while the boss is giving its warning
  const bossAngry = B => B.hp <= B.max / 2;
  const pick2 = (v, B) => (Array.isArray(v) ? v[bossAngry(B) ? 1 : 0] : v);
  const lerp3 = (A, C, k) => ({ x: A[0] + (C[0] - A[0]) * k, y: A[1] + (C[1] - A[1]) * k, z: A[2] + (C[2] - A[2]) * k });
  // a segmented timeline (hold → tell → move), each leg timed when it starts: a look-ahead into the next leg keeps its timing
  function legs(B, C, lenOf) {
    return t => { let S = B.leg; if (!S) S = B.leg = { i: 0, t0: B.entry, len: lenOf() };
      let i = S.i, t0 = S.t0, len = S.len; while (t >= t0 + len) { t0 += len; i++; len = lenOf(); } return { i, u: t - t0, len }; };
  }
  const CARRIERS = {
    perch(B, C) {   // hold, tell (a crouch and a cry), then swoop to the next spot (the Crow King's way)
      const plan = () => { const k = B.hp / B.max; return { hold: C.hold[0] + (C.hold[1] - C.hold[0]) * k, tell: C.tell, move: C.move }; };
      B.seg = { i: 0, t0: B.entry, ...plan() };
      return { at: t => { const S = B.seg, n = C.spots.length; let i = S.i, t0 = S.t0; const len = S.hold + S.tell + S.move; while (t >= t0 + len) { t0 += len; i++; }
          const A = C.spots[i % n], P = C.spots[(i + 1) % n], u = t - t0; let q = lerp3(A, A, 0), tell = 0;
          if (u > S.hold + S.tell) { const k = smooth((u - S.hold - S.tell) / S.move); q = lerp3(A, P, k); q.y -= Math.sin(k * Math.PI) * 0.35; }
          else if (u > S.hold) { tell = (u - S.hold) / S.tell; q.y -= 0.12 * Math.sin(tell * Math.PI); } else q.y += Math.sin(t * 5) * 0.05;
          return { ...q, tell, leg: i }; },
        update: () => { const S = B.seg, len = S.hold + S.tell + S.move; if (!B.dead && B.t >= S.t0 + len) B.seg = { i: S.i + 1, t0: S.t0 + len, ...plan() }; } };
    },
    loop(B, C) {   // round and round a set of points, smooth (the Pumpkin King's vine)
      B.s = 0;
      const pos = s => { const n = C.seq.length, i = Math.floor(s), f = smooth(s - i); return lerp3(C.spots[C.seq[((i % n) + n) % n]], C.spots[C.seq[(((i + 1) % n) + n) % n]], f); };
      return { at: t => ({ ...pos(B.s + (t - B.t) * pick2(C.rate, B)), tell: 0 }), update: dt => { if (B.t > B.entry) B.s += dt * pick2(C.rate, B); } };
    },
    sway(B, C) {   // hanging from an arm or a branch, swinging side to side; every so often a big lurch, told first
      B.sw = 0;
      const at = t => { const P = pick2(C.period, B), ph = ((B.sw + (t - B.t) / P) % 1 + 1) % 1, cyc = Math.floor((B.sw + (t - B.t) / P)), big = C.lurch && cyc % C.lurch === C.lurch - 1;
        const A = C.amp * (big ? 1.45 : 1), s = Math.sin(ph * TAU), tell = C.lurch && cyc % C.lurch === C.lurch - 2 && ph > 1 - C.tell / P ? (ph - (1 - C.tell / P)) / (C.tell / P) : 0;
        return { x: C.cx + clamp(A * s, -2.2, 2.2), y: C.cy + 0.28 * (1 - Math.cos(ph * TAU * 2)) * 0.5 * (big ? 1.4 : 1), z: C.cz + 0.5 * Math.sin(ph * TAU * 0.5 + 0.3), tell }; };
      return { at, update: dt => { if (B.t > B.entry) B.sw += dt / pick2(C.period, B); } };
    },
    circle(B, C) {   // round a circle through depth; every few laps it turns about, with a flourish first
      B.ang = 0; B.dir = 1; B.flipAt = C.flipEvery;
      const at = t => { const a = B.ang + (t - B.t) * pick2(C.speed, B) * B.dir, hop = C.hop ? Math.abs(Math.sin(a * 1.5)) * C.hop : 0, tell = C.flipEvery && B.flipAt - (t - B.entry) < C.tell && B.flipAt - (t - B.entry) > 0 ? 1 - (B.flipAt - (t - B.entry)) / C.tell : 0;
        return { x: C.cx + C.rx * Math.sin(a), y: C.cy + hop + 0.1 * Math.sin(a * 2), z: C.cz + C.rz * Math.cos(a), tell }; };
      return { at, update: dt => { if (B.t <= B.entry) return; B.ang += dt * pick2(C.speed, B) * B.dir; if (C.flipEvery && B.t - B.entry >= B.flipAt) { B.dir *= -1; B.flipAt += C.flipEvery; } } };
    },
    surface(B, C) {   // up on one spot, then bubbles at the next, a dive, and up again somewhere else
      const L = legs(B, C, () => pick2(C.hold, B) + C.tell + 0.5);
      return { at: t => { const { i, u, len } = L(t), n = C.spots.length, A = C.spots[i % n], N = C.spots[(i + 1) % n], hold = len - C.tell - 0.5;
        if (u < hold) return { x: A[0], y: A[1] + Math.sin(t * 3) * 0.04, z: A[2], tell: 0, next: N };
        if (u < hold + C.tell) { const k = (u - hold) / C.tell; return { x: A[0], y: A[1] - 2.4 * k * k, z: A[2], tell: k, next: N }; }
        const k = smooth((u - hold - C.tell) / 0.5); return { x: N[0], y: N[1] - 2.4 * (1 - k), z: N[2], tell: 0, next: N }; } };
    },
    orbit(B, C) {   // a clock hand: tick, tick, tick round a circle in the picture plane; now and then it runs backwards
      const L = legs(B, C, () => pick2(C.hold, B) + C.move);
      B.flip = 1;
      return { at: t => { const { i, u, len } = L(t), hold = len - C.move, dir = Math.floor(i / C.flipEvery) % 2 ? -1 : 1, prevDir = Math.floor((i - 1) / C.flipEvery) % 2 ? -1 : 1;
        let step = 0; for (let k = 0; k < i; k++) step += Math.floor(k / C.flipEvery) % 2 ? -1 : 1;
        const a0 = (step / C.steps) * TAU, a = u < hold ? a0 : a0 + dir * smooth((u - hold) / C.move) * (TAU / C.steps);
        const tell = (i + 1) % C.flipEvery === 0 && u > hold - C.tell && u < hold ? (u - (hold - C.tell)) / C.tell : 0;
        return { x: C.cx + Math.sin(a) * C.r, y: C.cy + Math.cos(a) * C.r, z: C.cz, tell, dir: prevDir }; } };
    },
    bounce(B, C) {   // the jack-in-the-box: the box slides; the crank winds (the tell), then POP! up it springs, and sinks back
      return { at: t => { const u = Math.max(0, t - B.entry), x = C.ax * Math.sin((u / C.period) * TAU), cyc = u % C.every, wind = C.every - C.tell;
        let y = C.low, tell = 0;
        if (cyc > wind) { tell = (cyc - wind) / C.tell; y = C.low - 0.1 * tell + Math.sin(t * 40) * 0.02 * tell; }
        else if (cyc < 0.25) y = C.low + (C.high - C.low) * easeOutBack(cyc / 0.25) * 0.97;
        else if (cyc < 1.05) y = C.high;
        else y = C.high - (C.high - C.low) * smooth(Math.min(1, (cyc - 1.05) / 0.6));
        return { x, y, z: C.cz, tell }; } };
    },
    jump(B, C) {   // the film cuts between frames: hold, flicker (the tell), cut. The Reel Reaper takes to a circle when angry.
      const L = legs(B, C, () => pick2(C.hold, B) + C.tell), circ = C.angry === "circle" ? CARRIERS.circle(B, C) : null;
      return { at: t => { if (circ && bossAngry(B)) return circ.at(t); const { i, u, len } = L(t), A = C.spots[i % C.spots.length], hold = len - C.tell;
          return { x: A[0], y: A[1] + Math.sin(t * 4) * 0.04, z: A[2], tell: u > hold ? (u - hold) / C.tell : 0 }; },
        update: dt => { if (circ && bossAngry(B)) circ.update(dt); } };
    }
  };

  // ── a boss from its definition
  function makeGenericBoss(id, stage) {
    const D = BOSS_DEFS[id], max = Math.min(D.hp[0] + Math.floor((stage - 1) / 2), D.hp[1]), start = { x: ring.x, y: ring.y, z: ring.z };
    const B = { kind: id, short: BOSS_INFO[id].short, hp: max, max, rc: D.rc || 0.6, flat: false, flawless: true, dead: false, t: 0, deadAt: 0, hurt: 0, start,
      entry: D.mini ? 1.7 : 2.4, rise: D.mini ? 1 : 0, def: D, tellAt: -9, ghosts: 0, spit: 0 };
    const car = CARRIERS[D.carrier.kind](B, D.carrier, stage);
    B.pathAt = t => {
      if (B.dead) return { ...B.frozen, tell: 0 };
      if (t >= B.entry) return car.at(t);
      const q = car.at(B.entry), g = smooth(clamp((t - (B.entry - 0.7)) / 0.7, 0, 1));   // it takes the ring off its post in the last beat of its entrance
      return { x: B.start.x + (q.x - B.start.x) * g, y: B.start.y + (q.y - B.start.y) * g, z: B.start.z + (q.z - B.start.z) * g, tell: 0, entering: 1 - g };
    };
    B.ringAt = p => { const q = bossPathAt(B, p); return { x: q.x, y: q.y, z: q.z }; };
    const A = D.attack;
    if (A) B.volley = { next: B.entry + 1.2, tell: 0, n: 0 };
    B.update = dt => {
      B.t += dt; B.hurt = Math.max(0, B.hurt - dt * 2.5); B.rise = Math.min(1, B.rise + dt / 1.6);
      if (B.dead) { B.sink = (B.sink || 0) + dt; return; }
      if (car.update) car.update(dt);
      const q = car.at(B.t), C = D.carrier;
      if (q.tell > 0 && C.word && B.t - B.tellAt > 1.2 && B.t > B.entry) {   // the carrier's tell: its cry, and a caption
        B.tellAt = B.t; Sound.toon(C.sound || "caw", panOf(q.x)); const w = project(q.x + 0.5, q.y + 0.8, q.z); caption(C.word, w.x, w.y);
      }
      if (A) {   // the volleys: the tell, then the throw down the lane (as the Pumpkin King's seeds)
        const V = B.volley, every = pick2(A.every, B);
        V.tell = B.t >= V.next - 0.9 && B.t < V.next ? (B.t - (V.next - 0.9)) / 0.9 : 0;
        if (B.t >= V.next && game.state !== "cine") {
          const n = pick2(A.n, B), pat = V.n % 3;
          for (let i = 0; i < n; i++) {
            const lane = pat === 0 ? (i / (n - 1)) * 2 - 1 : pat === 1 ? 1 - (i / (n - 1)) * 2 : (i % 2 ? -0.6 : 0.6) * (1 - i * 0.15);
            seeds.push({ kind: A.shot, at: B.t + i * 0.16, x: A.high ? lane * 1.4 : A.from[0], y: A.from[1], z: A.from[2], tx: lane * 1.4, ty: 2.25 + (i % 2) * 0.55, tz: 3.2, rot: rrIn(0, TAU), live: false });
          }
          V.n++; V.next = B.t + every; B.spit = 0.3; Sound.toon(A.sound || "ptoo");
          const mp = project(A.from[0], A.from[1], A.from[2]); caption(A.word, clamp(mp.x + U * 0.1, U * 0.2, W - U * 0.2), Math.max(H * 0.14, mp.y - U * 0.08));
        }
        B.spit = Math.max(0, B.spit - dt);
      }
    };
    B.hit = (kind, at) => {
      const dmg = kind === "perfect" ? 2 : 1, was = B.hp;
      B.hp = Math.max(0, B.hp - dmg); B.hurt = 1; bossBonus(dmg, at);
      const bp = at || { x: W / 2, y: H * 0.3 };
      for (let i = 0; i < 10; i++) particles.push({ kind: "chunk", x: bp.x, y: bp.y, vx: rand(-1, 1) * U * 0.5, vy: -U * rand(0.2, 0.6), rot: rand(0, TAU), vr: rand(-6, 6), life: rand(0.8, 1.2), max: 1.2, size: rand(5, 9), color: D.bits || INK, g: 0.8, a: 1 });
      if (B.hp <= 0) { bossDown(B, at); updateHud(); return; }
      VisualSystem.triggerImpact("boss", { at });
      if (was > B.max / 2 && B.hp <= B.max / 2) { caption(D.mini ? "HE'S RATTLED!" : "NOW HE'S MAD!", W / 2, H * 0.22); Sound.toon("rumble"); }
      if (A) { const thirds = [Math.ceil(B.max * 2 / 3), Math.ceil(B.max / 3)]; if (B.ghosts < 2 && was > thirds[B.ghosts] && B.hp <= thirds[B.ghosts]) { B.ghosts++; B.ghostDue = true; } }
      updateHud();
    };
    B.after = () => { if (B.ghostDue && !pickup && !B.dead) { B.ghostDue = false; spawnPickup("ghost"); } };
    B.state = () => { if (B.volley && (B.volley.tell > 0 || B.spit > 0)) return "attack"; const q = car.at(B.t); return q.tell > 0 ? "attack" : "vulnerable"; };
    B.cine = c => { if (!D.mini && c.kind === "boss-in" && c.t < 1.6 && Math.floor(c.t * 8) !== Math.floor((c.t - 1 / 60) * 8)) VisualSystem.triggerCameraJolt("thunder"); };
    B.draw = front => D.draw(B, front);
    return B;
  }

  // ── drawing helpers: a boss is drawn in metres, at its place in the world, bouncing on twos
  const bt = B => Math.floor(B.t * 12) / 12;
  function bossBody(B) {   // where a far boss stands (it rises out of the ground as it enters, and goes as it falls)
    const D = B.def, b = D.body, rise = smooth(B.rise), dying = B.dead ? B.t - B.deadAt : 0;
    let y = -(1 - rise) * 5, rot = 0, sc = 1, alpha = 1;
    if (B.dead) { const f = D.fall; if (f === "sink") y -= dying * dying * 3; else if (f === "topple") { rot = Math.min(1.35, dying * 2.4) * (b.x > 0 ? 1 : -1); y -= Math.max(0, dying - 0.6) * 2; } else if (f === "burst") { sc = 1 + dying * 0.8; alpha = Math.max(0, 1 - dying * 1.4); } else { rot = dying * 8; y += dying * 3 - dying * dying * 6; } }
    return { x: b.x, y, z: b.z, rot, sc, alpha };
  }
  function withBody(B, P, paint) {   // P: { x, y, z, rot, sc, alpha } in the world; paint(ctx) in metres, y up negative
    const p = project(P.x, P.y, P.z); if (P.alpha <= 0.01) return p;
    ctx.save(); ctx.translate(p.x, p.y); ctx.globalAlpha *= P.alpha; if (P.rot) ctx.rotate(P.rot);
    const hurt = B.hurt, bounce = 1 + Math.sin(bt(B) * 6) * 0.015;
    ctx.scale(p.s * (P.sc || 1) * (bounce + hurt * 0.06), p.s * (P.sc || 1) * (1 / bounce - hurt * 0.05));
    ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.strokeStyle = INK; ctx.lineWidth = 0.05;
    paint(ctx); ctx.restore(); return p;
  }
  const inkF = (c, col) => { c.fillStyle = col; c.fill(); c.stroke(); };
  function pie(c, x, y, rx, ry, look = 0, shut = false, dead = false) {   // a pie-cut eye (shut when hurt, X'd when down)
    c.beginPath(); c.ellipse(x, y, rx, shut ? ry * 0.25 : ry, 0, 0, TAU); inkF(c, CREAM);
    if (dead) { c.beginPath(); c.moveTo(x - rx * 0.6, y - ry * 0.5); c.lineTo(x + rx * 0.6, y + ry * 0.5); c.moveTo(x + rx * 0.6, y - ry * 0.5); c.lineTo(x - rx * 0.6, y + ry * 0.5); c.stroke(); return; }
    if (shut) return;
    const px = x + look * rx * 0.3, py = y + ry * 0.15; c.fillStyle = INK; c.beginPath(); c.ellipse(px, py, rx * 0.45, ry * 0.6, 0, 0, TAU); c.fill();
    c.fillStyle = CREAM; c.beginPath(); c.moveTo(px, py); c.arc(px, py, rx * 0.62, -1.3, -0.6); c.closePath(); c.fill();
  }
  function gloveAt(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, TAU); inkF(c, "#F7F1DF"); for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(x + r * (-0.5 + k * 0.5), y - r * 0.8, r * 0.38, 0, TAU); inkF(c, "#F7F1DF"); } }
  function rope(from, to, col = INK, w = 0.03, sag = 0.3) {   // a line from a hand to the ring, in the world
    const a = project(from.x, from.y, from.z), b = project(to.x, to.y, to.z), m = project((from.x + to.x) / 2, (from.y + to.y) / 2 - sag, (from.z + to.z) / 2);
    ctx.strokeStyle = INK; ctx.lineWidth = Math.max(2, w * b.s * 1.6); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(m.x, m.y, b.x, b.y); ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, w * b.s); ctx.stroke();
  }
  const ringTopOf = q => ({ x: q.x, y: q.y + ring.rc + 0.04, z: q.z });
  // a carrying boss is drawn on whichever side of the ring it is (body above the ring, the ring in its grip)
  const sideOK = (z, front) => (z <= ring.z + 0.01) === front;

  // ── the mini-bosses
  function drawBatBaron(B, front) {
    const q = B.pathAt(B.t), dying = B.dead ? B.t - B.deadAt : 0, hang = B.def.hang;
    const P = B.dead ? { x: B.frozen.x + dying, y: B.frozen.y + hang + dying * 2 - dying * dying * 6, z: B.frozen.z, rot: dying * 9 } : { x: q.x, y: q.y + hang, z: q.z };
    if (!sideOK(P.z, front)) return;
    if (!B.dead) rope(P, ringTopOf(q), "#E3B64B", 0.02, 0);
    const flap = B.dead ? 1 : Math.sin(bt(B) * (q.tell ? 26 : 15)), tell = q.tell || 0;
    withBody(B, { ...P, alpha: 1 }, c => {
      for (const sd of [-1, 1]) { c.save(); c.scale(sd, 1); c.rotate(-0.25 - flap * 0.35); c.beginPath(); c.moveTo(0.2, -0.1);
        c.quadraticCurveTo(0.7, -0.75, 1.3, -0.55); c.quadraticCurveTo(1.15, -0.25, 1.2, -0.05); c.quadraticCurveTo(0.95, -0.2, 0.85, 0.08); c.quadraticCurveTo(0.6, -0.1, 0.5, 0.15); c.quadraticCurveTo(0.35, 0.0, 0.2, 0.15); c.closePath(); inkF(c, "#3A2A4A"); c.restore(); }
      c.beginPath(); c.ellipse(0, 0, 0.32, 0.38, 0, 0, TAU); inkF(c, "#4A3A5A");
      for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(sd * 0.12, -0.3); c.lineTo(sd * 0.28, -0.62); c.lineTo(sd * 0.3, -0.25); c.closePath(); inkF(c, "#4A3A5A"); }
      pie(c, -0.11, -0.1, 0.09, 0.11, 0, B.hurt > 0.3, B.dead); pie(c, 0.11, -0.1, 0.09, 0.11, 0, B.hurt > 0.3, B.dead);
      c.lineWidth = 0.025; c.beginPath(); c.arc(0.11, -0.1, 0.13, 0, TAU); c.stroke(); c.beginPath(); c.moveTo(0.23, -0.05); c.lineTo(0.26, 0.2); c.stroke();   // the monocle
      c.lineWidth = 0.05; c.beginPath(); c.moveTo(-0.1, 0.12); c.quadraticCurveTo(0, 0.18 + tell * 0.1, 0.1, 0.12); c.stroke();
      c.fillStyle = CREAM; for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(sd * 0.06, 0.13); c.lineTo(sd * 0.04, 0.22); c.lineTo(sd * 0.02, 0.14); c.fill(); }
      c.beginPath(); c.rect(-0.12, -0.62, 0.24, 0.24); inkF(c, "#1A1A1E"); c.beginPath(); c.ellipse(0, -0.38, 0.22, 0.05, 0, 0, TAU); inkF(c, "#1A1A1E");
    });
  }
  function drawOwl(B, front) {
    const q = B.pathAt(B.t), dying = B.dead ? B.t - B.deadAt : 0, hang = B.def.hang;
    const P = B.dead ? { x: B.frozen.x - dying, y: B.frozen.y + hang + dying * 2 - dying * dying * 6, z: B.frozen.z, rot: -dying * 8 } : { x: q.x, y: q.y + hang, z: q.z };
    if (!sideOK(P.z, front)) return;
    if (!B.dead) for (const sd of [-1, 1]) rope({ x: P.x + sd * 0.15, y: P.y - 0.3, z: P.z }, { x: q.x + sd * 0.25, y: q.y + ring.rc * 0.9, z: q.z }, "#E4DAC4", 0.03, 0);
    const hoot = q.tell ? Math.sin(q.tell * Math.PI * 2) : 0;
    withBody(B, P, c => {
      c.beginPath(); c.ellipse(0, 0, 0.38, 0.45, 0, 0, TAU); inkF(c, "#D8CCB0");
      c.strokeStyle = "rgba(23,19,15,.5)"; c.lineWidth = 0.025; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-0.22, 0.02 + i * 0.08); c.quadraticCurveTo(0, 0.08 + i * 0.08, 0.22, 0.02 + i * 0.08); c.stroke(); } c.strokeStyle = INK; c.lineWidth = 0.05;
      for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(sd * 0.36, -0.1); c.quadraticCurveTo(sd * 0.52, 0.2, sd * 0.3, 0.42); c.quadraticCurveTo(sd * 0.3, 0.1, sd * 0.36, -0.1); inkF(c, "#B8AC90"); }
      c.save(); c.translate(0, -0.42 - hoot * 0.05); c.beginPath(); c.ellipse(0, 0, 0.34, 0.28, 0, 0, TAU); inkF(c, "#E4DAC4");
      for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(sd * 0.18, -0.2); c.lineTo(sd * 0.3, -0.42); c.lineTo(sd * 0.3, -0.16); c.closePath(); inkF(c, "#E4DAC4"); }
      for (const sd of [-1, 1]) { c.beginPath(); c.arc(sd * 0.14, 0, 0.12, 0, TAU); inkF(c, "#1A1A10"); if (!B.dead && B.hurt < 0.3) { c.fillStyle = "#E8D84A"; c.beginPath(); c.arc(sd * 0.14, 0, 0.06, 0, TAU); c.fill(); } else pie(c, sd * 0.14, 0, 0.1, 0.1, 0, !B.dead, B.dead); }
      c.beginPath(); c.moveTo(-0.05, 0.08); c.lineTo(0.05, 0.08); c.lineTo(0, 0.18 + hoot * 0.04); c.closePath(); inkF(c, "#C49A42"); c.restore();
    });
  }
  function drawGator(B, front) {
    const q = B.pathAt(B.t), dying = B.dead ? B.t - B.deadAt : 0;
    const P = { x: B.dead ? B.frozen.x : q.x, y: 0, z: (B.dead ? B.frozen.z : q.z) + 0.05, alpha: 1 };
    if (!sideOK(P.z, front)) return;
    const up = B.dead ? Math.max(-3, -dying * dying * 3) : q.y - ring.rc - 1.2, sub = clamp(-up / 1.4, 0, 1);
    const wp = project(P.x, 0, P.z); ctx.strokeStyle = "rgba(200,240,220,.45)"; ctx.lineWidth = Math.max(1, 0.02 * wp.s);   // ripples where the neck meets the water
    for (let i = 0; i < 3; i++) { const k = ((B.t * 0.8 + i / 3) % 1); ctx.globalAlpha = 1 - k; ctx.beginPath(); ctx.ellipse(wp.x, wp.y, (0.3 + k * 0.6) * wp.s, (0.08 + k * 0.12) * wp.s, 0, 0, TAU); ctx.stroke(); } ctx.globalAlpha = 1;
    if (q.next && q.tell > 0) { const bp = project(q.next[0], 0, q.next[2]); ctx.fillStyle = "rgba(220,255,240,.7)"; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(bp.x + Math.sin(B.t * 9 + i) * 0.15 * bp.s, bp.y - ((B.t * 1.5 + i * 0.25) % 1) * 0.3 * bp.s, Math.max(1.5, 0.05 * bp.s), 0, TAU); ctx.fill(); } }
    if (sub >= 0.98) return;
    const topY = Math.max(0.1, up + 1.2);
    ctx.save(); const cp = project(P.x, 0, P.z); ctx.beginPath(); ctx.rect(-9999, -9999, 99999, cp.y + 9999); ctx.clip();   // under the waterline he's hidden
    withBody(B, { x: P.x, y: 0, z: P.z }, c => {
      c.beginPath(); c.moveTo(-0.28, 0.2); c.quadraticCurveTo(-0.34, -topY * 0.5, -0.24, -topY); c.lineTo(0.24, -topY); c.quadraticCurveTo(0.34, -topY * 0.5, 0.28, 0.2); c.closePath(); inkF(c, "#4A7A4A");
      c.fillStyle = "#8AAA6A"; c.beginPath(); c.ellipse(0, -topY * 0.5, 0.12, topY * 0.42, 0, 0, TAU); c.fill();
      c.save(); c.translate(0, -topY); c.beginPath(); c.moveTo(-0.3, 0.05); c.lineTo(-0.45, -0.1); c.lineTo(0.45, -0.1); c.lineTo(0.3, 0.05); c.closePath(); inkF(c, "#4A7A4A");
      c.fillStyle = CREAM; for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(i * 0.11 - 0.04, -0.1); c.lineTo(i * 0.11, -0.02); c.lineTo(i * 0.11 + 0.04, -0.1); c.fill(); }
      pie(c, -0.16, -0.24, 0.08, 0.09, 0.5, B.hurt > 0.3, B.dead); pie(c, 0.16, -0.24, 0.08, 0.09, -0.5, B.hurt > 0.3, B.dead);
      c.beginPath(); c.ellipse(0, -0.38, 0.3, 0.05, 0, 0, TAU); inkF(c, "#D8B87A"); c.beginPath(); c.rect(-0.18, -0.52, 0.36, 0.14); inkF(c, "#D8B87A"); c.fillStyle = RED; c.fillRect(-0.18, -0.43, 0.36, 0.04);
      c.restore();
    });
    ctx.restore();
  }
  function drawJester(B, front) {
    const q = B.pathAt(B.t), dying = B.dead ? B.t - B.deadAt : 0, x = B.dead ? B.frozen.x : q.x, z = B.dead ? B.frozen.z : q.z;
    if (!sideOK(z + 0.05, front)) return;
    const headY = B.dead ? Math.max(0.6, B.frozen.y - ring.rc - 0.35 - dying * 3) : q.y - ring.rc - 0.35, shake = q.tell ? Math.sin(B.t * 45) * 0.03 : 0;
    withBody(B, { x: x + shake, y: 0, z: z + 0.05 }, c => {
      c.beginPath(); c.rect(-0.45, -0.7, 0.9, 0.7); inkF(c, "#A94332"); c.fillStyle = CREAM; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(-0.45 + i * 0.3, -0.7); c.lineTo(-0.3 + i * 0.3, 0); c.lineTo(-0.15 + i * 0.3, -0.7); c.fill(); } c.beginPath(); c.rect(-0.45, -0.7, 0.9, 0.7); c.stroke();
      c.save(); c.translate(0.45, -0.35); c.rotate(B.t * (q.tell ? 18 : 2)); c.beginPath(); c.moveTo(0, 0); c.lineTo(0.18, 0); c.lineTo(0.18, 0.12); c.stroke(); c.restore();   // the crank
      const top = -(headY - 0.12), coils = 7; c.lineWidth = 0.045; c.strokeStyle = "#8A8E96"; c.beginPath(); c.moveTo(0, -0.7);
      for (let i = 1; i <= coils * 2; i++) c.lineTo((i % 2 ? 0.14 : -0.14), -0.7 + (top + 0.7) * (i / (coils * 2))); c.stroke(); c.strokeStyle = INK; c.lineWidth = 0.05;
      c.save(); c.translate(0, top); c.beginPath(); c.arc(0, -0.2, 0.26, 0, TAU); inkF(c, "#F2E7C9");
      pie(c, -0.1, -0.25, 0.07, 0.09, 0, B.hurt > 0.3, B.dead); pie(c, 0.1, -0.25, 0.07, 0.09, 0, B.hurt > 0.3, B.dead);
      c.fillStyle = RED; c.beginPath(); c.arc(0, -0.15, 0.05, 0, TAU); c.fill(); c.beginPath(); c.arc(0, -0.08, 0.14, 0.2, Math.PI - 0.2); c.stroke();
      for (const [sd, col] of [[-1, "#356B68"], [1, "#C49A42"]]) { c.beginPath(); c.moveTo(0, -0.42); c.quadraticCurveTo(sd * 0.3, -0.62, sd * 0.42, -0.36); c.lineTo(sd * 0.1, -0.4); c.closePath(); inkF(c, col); c.beginPath(); c.arc(sd * 0.42, -0.34, 0.05, 0, TAU); inkF(c, GOLD); }
      c.restore();
    });
  }
  function drawScarecrowBoss(B, front) {
    if (front) return;
    const q = B.pathAt(B.t), P = bossBody(B), sway = clamp((q.x - B.def.carrier.cx) / 2.2, -1, 1);
    const hand = { x: P.x + 1.05, y: P.y + 2.5, z: P.z };
    if (!B.dead) rope(hand, ringTopOf(q), "#C8A04A", 0.025, -0.2);
    withBody(B, P, c => {
      c.beginPath(); c.rect(-0.07, -2.7, 0.14, 2.7); inkF(c, "#6A4A2E");
      c.save(); c.translate(0, -2.4); c.rotate(sway * 0.12); c.beginPath(); c.rect(-1.2, -0.08, 2.4, 0.14); inkF(c, "#6A4A2E");
      c.beginPath(); c.moveTo(-0.5, -0.12); c.lineTo(0.5, -0.12); c.lineTo(0.58, 1.0); c.lineTo(-0.58, 1.0); c.closePath(); inkF(c, "#6A5A7A");
      c.fillStyle = "#4A3A5A"; c.fillRect(-0.2, 0.2, 0.18, 0.2); c.fillRect(0.12, 0.5, 0.2, 0.16);
      for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(sd * 1.2, -0.05); c.lineTo(sd * 1.42, 0.08); c.lineTo(sd * 1.35, -0.1); c.lineTo(sd * 1.45, -0.2); c.lineTo(sd * 1.2, -0.12); inkF(c, "#E3B64B"); }
      c.save(); c.translate(0, -0.45); c.rotate(-sway * 0.2); c.beginPath(); c.arc(0, 0, 0.38, 0, TAU); inkF(c, "#D8B87A");
      if (B.dead || B.hurt > 0.3) { pie(c, -0.14, -0.05, 0.08, 0.08, 0, !B.dead, B.dead); pie(c, 0.14, -0.05, 0.08, 0.08, 0, !B.dead, B.dead); }
      else for (const sd of [-1, 1]) { c.lineWidth = 0.05; c.beginPath(); c.moveTo(sd * 0.14 - 0.06, -0.1); c.lineTo(sd * 0.14 + 0.06, 0.0); c.moveTo(sd * 0.14 + 0.06, -0.1); c.lineTo(sd * 0.14 - 0.06, 0.0); c.stroke(); }
      c.lineWidth = 0.04; c.beginPath(); c.moveTo(-0.18, 0.15); for (let i = 0; i <= 6; i++) c.lineTo(-0.18 + i * 0.06, 0.15 + (i % 2) * 0.05 + (q.tell ? 0.05 : 0)); c.stroke(); c.lineWidth = 0.05;
      c.beginPath(); c.ellipse(0, -0.32, 0.55, 0.09, -0.1, 0, TAU); inkF(c, "#3A2A1E"); c.beginPath(); c.moveTo(-0.26, -0.35); c.lineTo(-0.18, -0.75); c.lineTo(0.2, -0.75); c.lineTo(0.28, -0.35); c.closePath(); inkF(c, "#3A2A1E");
      c.restore(); c.restore();
    });
  }
  function drawCuckoo(B, front) {
    const q = B.pathAt(B.t), C = B.def.carrier, P = { ...bossBody(B), y: 0 }, center = { x: C.cx, y: C.cy, z: B.def.body.z };
    if (!front) withBody(B, { ...P, y: center.y - 0.9 }, c => {   // the clock: a carved house, its face behind the ring's circle
      c.beginPath(); c.moveTo(-1.35, 1.9); c.lineTo(-1.35, -0.6); c.lineTo(0, -1.5); c.lineTo(1.35, -0.6); c.lineTo(1.35, 1.9); c.closePath(); inkF(c, "#6A4A2E");
      c.beginPath(); c.arc(0, 0.9, 1.15, 0, TAU); inkF(c, "#F2E2B8"); c.fillStyle = INK; for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; c.beginPath(); c.arc(Math.sin(a) * 1.0, 0.9 - Math.cos(a) * 1.0, 0.04, 0, TAU); c.fill(); }
      c.beginPath(); c.rect(-0.25, -0.95, 0.5, 0.4); inkF(c, "#2A1A10");
      c.fillStyle = "#8A5A30"; for (const sd of [-1, 1]) { c.beginPath(); c.ellipse(sd * 0.9, -0.95, 0.35, 0.12, sd * 0.5, 0, TAU); c.fill(); c.stroke(); }
    });
    if (B.dead) return;
    const hub = project(center.x, center.y, center.z), bird = project(q.x, q.y + ring.rc + 0.25, q.z);
    if (!front) { ctx.strokeStyle = INK; ctx.lineWidth = Math.max(3, 0.08 * bird.s); ctx.beginPath(); ctx.moveTo(hub.x, hub.y); ctx.lineTo(bird.x, bird.y); ctx.stroke(); ctx.strokeStyle = "#C49A42"; ctx.lineWidth = Math.max(1.5, 0.04 * bird.s); ctx.stroke(); return; }
    withBody(B, { x: q.x, y: q.y + ring.rc + 0.25, z: q.z - 0.01 }, c => {
      c.beginPath(); c.ellipse(0, 0, 0.26, 0.2, 0, 0, TAU); inkF(c, "#E3B64B"); c.beginPath(); c.arc(0.18, -0.16, 0.15, 0, TAU); inkF(c, "#E3B64B");
      c.beginPath(); c.moveTo(0.3, -0.18); c.lineTo(0.48 + (q.tell ? 0.1 : 0), -0.12); c.lineTo(0.3, -0.08); c.closePath(); inkF(c, "#E8893A");
      pie(c, 0.2, -0.2, 0.05, 0.06, 1, B.hurt > 0.3); c.beginPath(); c.moveTo(-0.24, -0.02); c.lineTo(-0.42, -0.12); c.lineTo(-0.36, 0.04); c.closePath(); inkF(c, "#C49A42");
    });
  }
  function drawProjectionist(B, front) {
    if (front) return;
    const q = B.pathAt(B.t), P = bossBody(B), lens = { x: P.x + 0.45, y: P.y + 3.3, z: P.z };
    if (!B.dead) {   // the beam: the projector throws the ring's picture
      const a = project(lens.x, lens.y, lens.z), b = project(q.x, q.y, q.z), r = ring.rc * b.s * 1.2, f = q.tell ? 0.5 + 0.5 * Math.sin(B.t * 60) : 1;
      const g = ctx.createLinearGradient(a.x, a.y, b.x, b.y); g.addColorStop(0, `rgba(255,244,214,${0.35 * f})`); g.addColorStop(1, `rgba(255,244,214,${0.08 * f})`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(a.x, a.y - 3); ctx.lineTo(b.x, b.y - r); ctx.lineTo(b.x, b.y + r); ctx.lineTo(a.x, a.y + 3); ctx.closePath(); ctx.fill();
    }
    withBody(B, P, c => {
      for (const sd of [-1, 1]) { c.beginPath(); c.rect(sd * 0.22 - 0.1, -1.4, 0.2, 1.4); inkF(c, "#2A2A35"); }
      c.beginPath(); c.moveTo(-0.45, -1.4); c.lineTo(-0.5, -2.8); c.lineTo(0.5, -2.8); c.lineTo(0.45, -1.4); c.closePath(); inkF(c, "#7A1E1E");
      c.fillStyle = GOLD; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(0, -2.6 + i * 0.3, 0.05, 0, TAU); c.fill(); }
      for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(sd * 0.48, -2.7); c.quadraticCurveTo(sd * 0.8, -2.2, sd * 0.6, -1.7); c.lineWidth = 0.14; c.stroke(); c.lineWidth = 0.05; gloveAt(c, sd * 0.6, -1.65, 0.1); }
      c.beginPath(); c.rect(-0.42, -3.55, 0.84, 0.72); inkF(c, "#3A3E46");
      c.beginPath(); c.arc(0.42, -3.2, 0.14, 0, TAU); inkF(c, "#1A1A1E"); c.fillStyle = "rgba(255,244,214,.9)"; c.beginPath(); c.arc(0.44, -3.2, 0.07, 0, TAU); c.fill();
      for (const sd of [-1, 1]) { c.save(); c.translate(sd * 0.25, -3.78); c.rotate(B.t * (q.tell ? 12 : 3) * sd); c.beginPath(); c.arc(0, 0, 0.24, 0, TAU); inkF(c, "#8A8E96"); c.fillStyle = "#3A3E46"; for (let i = 0; i < 4; i++) { const a = i * TAU / 4; c.beginPath(); c.arc(Math.cos(a) * 0.12, Math.sin(a) * 0.12, 0.06, 0, TAU); c.fill(); } c.restore(); }
      pie(c, -0.18, -3.25, 0.08, 0.1, 1, B.hurt > 0.3, B.dead);
    });
  }

  // ── the end bosses (each wearing, holding or guarding one of Morty's pieces)
  function drawUndertaker(B, front) {
    if (front) return;
    const q = B.pathAt(B.t), P = bossBody(B), V = B.volley, heave = V ? Math.sin(clamp(V.tell, 0, 1) * Math.PI) : 0;
    const hand = { x: P.x + 1.15, y: P.y + 3.0 + heave * 0.4, z: P.z - 0.3 };
    if (!B.dead) rope(hand, ringTopOf(q), "#8C6239", 0.035, -0.4);
    withBody(B, P, c => {
      for (const sd of [-1, 1]) { c.beginPath(); c.rect(sd * 0.28 - 0.12, -1.9, 0.24, 1.9); inkF(c, "#1E1E26"); c.beginPath(); c.ellipse(sd * 0.3, -0.05, 0.28, 0.1, 0, 0, TAU); inkF(c, "#111"); }
      c.beginPath(); c.moveTo(-0.62, -1.7); c.lineTo(-0.5, -3.5); c.lineTo(0.5, -3.5); c.lineTo(0.62, -1.7); c.lineTo(0.2, -1.95); c.lineTo(-0.2, -1.95); c.closePath(); inkF(c, "#2A2A35");
      c.fillStyle = "#E4DAC4"; c.beginPath(); c.moveTo(-0.12, -3.5); c.lineTo(0, -2.9); c.lineTo(0.12, -3.5); c.fill();
      c.beginPath(); c.moveTo(-0.5, -3.35); c.quadraticCurveTo(-0.95, -2.6, -0.8, -2.0); c.lineWidth = 0.16; c.stroke(); c.lineWidth = 0.05; gloveAt(c, -0.8, -1.95, 0.13);
      c.beginPath(); c.moveTo(0.5, -3.35); c.quadraticCurveTo(0.95, -3.2 - heave * 0.3, 1.15, -3.0 - heave * 0.4); c.lineWidth = 0.16; c.stroke(); c.lineWidth = 0.05; gloveAt(c, 1.15, -3.0 - heave * 0.4, 0.13);
      c.save(); c.translate(0, -3.85); c.beginPath(); c.ellipse(0, 0, 0.3, 0.42, 0, 0, TAU); inkF(c, "#C8C8B8");
      pie(c, -0.12, -0.1, 0.08, 0.1, 0, B.hurt > 0.3, B.dead); pie(c, 0.12, -0.1, 0.08, 0.1, 0, B.hurt > 0.3, B.dead);
      c.beginPath(); c.moveTo(0, -0.02); c.lineTo(0.12, 0.12); c.lineTo(0, 0.12); inkF(c, "#B8B8A8"); c.beginPath(); c.moveTo(-0.12, 0.24); c.quadraticCurveTo(0, 0.18 - heave * 0.1, 0.12, 0.24); c.stroke();
      c.beginPath(); c.ellipse(0, -0.36, 0.42, 0.07, 0, 0, TAU); inkF(c, "#141418"); c.beginPath(); c.rect(-0.28, -0.98, 0.56, 0.64); inkF(c, "#141418"); c.fillStyle = "#A94332"; c.fillRect(-0.28, -0.52, 0.56, 0.09);   // Morty's top hat
      c.restore();
    });
  }
  function drawCount(B, front) {
    if (front) return;
    const P = bossBody(B), V = B.volley, flare = V ? Math.sin(clamp(V.tell, 0, 1) * Math.PI) : 0, q = B.pathAt(B.t);
    withBody(B, P, c => {
      const spread = 1.2 + flare * 0.9 + (q.tell ? 0.3 : 0);
      c.beginPath(); c.moveTo(0, -3.4); c.quadraticCurveTo(-spread, -3.0, -spread * 1.1, -0.2); for (let i = 0; i < 4; i++) c.quadraticCurveTo(-spread * (0.9 - i * 0.25), -0.5, -spread * (0.8 - i * 0.25), -0.05);
      c.lineTo(spread * 0.2, -0.05); for (let i = 0; i < 4; i++) c.quadraticCurveTo(spread * (0.35 + i * 0.25), -0.5, spread * (0.45 + i * 0.25), -0.05); c.quadraticCurveTo(spread, -3.0, 0, -3.4); c.closePath(); inkF(c, "#1A0A1E");
      c.fillStyle = "#6A1E2A"; c.beginPath(); c.moveTo(-0.45, -3.1); c.quadraticCurveTo(-spread * 0.8, -2.2, -spread * 0.85, -0.4); c.lineTo(spread * 0.85, -0.4); c.quadraticCurveTo(spread * 0.8, -2.2, 0.45, -3.1); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(-0.4, -3.2); c.lineTo(-0.35, -0.4); c.lineTo(0.35, -0.4); c.lineTo(0.4, -3.2); c.closePath(); inkF(c, "#2A2A35");
      c.beginPath(); c.moveTo(-0.16, -3.2); c.lineTo(0, -2.4); c.lineTo(0.16, -3.2); c.closePath(); inkF(c, CREAM);
      c.beginPath(); c.moveTo(0, -3.12); c.lineTo(-0.22, -3.24); c.lineTo(-0.22, -3.0); c.closePath(); inkF(c, RED); c.beginPath(); c.moveTo(0, -3.12); c.lineTo(0.22, -3.24); c.lineTo(0.22, -3.0); c.closePath(); inkF(c, RED); c.beginPath(); c.arc(0, -3.12, 0.05, 0, TAU); inkF(c, RED);   // Morty's bow tie
      c.save(); c.translate(0, -3.62); c.beginPath(); c.ellipse(0, 0, 0.3, 0.38, 0, 0, TAU); inkF(c, "#B8D0B0");
      c.beginPath(); c.moveTo(-0.3, -0.12); c.quadraticCurveTo(-0.3, -0.45, 0, -0.42); c.quadraticCurveTo(0.3, -0.45, 0.3, -0.12); c.lineTo(0.08, -0.2); c.lineTo(0, -0.05); c.lineTo(-0.08, -0.2); c.closePath(); inkF(c, "#141418");
      for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(sd * 0.28, -0.05); c.lineTo(sd * 0.45, -0.22); c.lineTo(sd * 0.3, 0.08); c.closePath(); inkF(c, "#B8D0B0"); }
      pie(c, -0.12, 0.0, 0.08, 0.09, 0, B.hurt > 0.3, B.dead); pie(c, 0.12, 0.0, 0.08, 0.09, 0, B.hurt > 0.3, B.dead);
      c.beginPath(); c.moveTo(-0.14, 0.2); c.quadraticCurveTo(0, 0.28, 0.14, 0.2); c.stroke(); c.fillStyle = CREAM; for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(sd * 0.08, 0.22); c.lineTo(sd * 0.06, 0.34); c.lineTo(sd * 0.03, 0.23); c.fill(); }
      c.restore();
    });
    if (!B.dead) { const a = project(P.x, P.y + 3.0, P.z - 0.4), b = project(q.x, q.y, q.z); ctx.save(); ctx.strokeStyle = "rgba(160,110,200,.35)"; ctx.setLineDash([4, 6]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.restore(); }   // his spell holds the ring
  }
  function drawMarrowroot(B, front) {
    if (front) return;
    const q = B.pathAt(B.t), P = bossBody(B), V = B.volley, shake = V && V.tell ? Math.sin(B.t * 40) * 0.05 : 0, branch = { x: P.x + 1.7, y: P.y + 4.6, z: P.z - 0.4 };
    if (!B.dead) rope(branch, ringTopOf(q), "#5E7A36", 0.04, -0.2);
    withBody(B, { ...P, x: P.x + shake }, c => {
      c.beginPath(); c.moveTo(-1.3, 0); c.quadraticCurveTo(-0.7, -0.4, -0.75, -2); c.quadraticCurveTo(-0.9, -3.6, -0.5, -4.4); c.lineTo(0.5, -4.4); c.quadraticCurveTo(0.9, -3.6, 0.75, -2); c.quadraticCurveTo(0.7, -0.4, 1.3, 0); c.closePath(); inkF(c, "#D8CCB0");
      c.strokeStyle = "rgba(23,19,15,.4)"; c.lineWidth = 0.04; for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(-0.6, -0.8 - i * 0.55); c.quadraticCurveTo(0, -0.7 - i * 0.55, 0.6, -0.8 - i * 0.55); c.stroke(); } c.strokeStyle = INK; c.lineWidth = 0.06;
      for (const [sd, y, L] of [[-1, 4.0, 1.4], [1, 4.3, 1.7], [-1, 3.2, 1.1], [1, 3.4, 0.9]]) { c.lineWidth = 0.18; c.beginPath(); c.moveTo(sd * 0.5, -y); c.quadraticCurveTo(sd * L * 0.6, -y - 0.5, sd * L, -y - 0.2); c.stroke(); c.lineWidth = 0.1; c.strokeStyle = "#D8CCB0"; c.stroke(); c.strokeStyle = INK; c.lineWidth = 0.06;
        c.fillStyle = "#E4DAC4"; for (let k = 0; k < 2; k++) { c.beginPath(); c.ellipse(sd * L * (0.5 + k * 0.35), -y - 0.1 + 0.25, 0.05, 0.14, 0, 0, TAU); c.fill(); c.stroke(); } }
      c.lineWidth = 0.08; c.beginPath(); c.moveTo(-0.9, -2.4); c.lineTo(-1.6, -1.3); c.stroke(); c.beginPath(); c.arc(-1.62, -1.25, 0.12, Math.PI, 0); c.stroke(); c.lineWidth = 0.05;   // Morty's cane, grafted on
      for (const sd of [-1, 1]) { c.beginPath(); c.ellipse(sd * 0.3, -3.1, 0.17, 0.22, 0, 0, TAU); inkF(c, "#1A1A10"); if (!B.dead && B.hurt < 0.3) { c.fillStyle = "#AAF060"; c.beginPath(); c.arc(sd * 0.3, -3.08, 0.07, 0, TAU); c.fill(); } }
      c.beginPath(); c.moveTo(-0.4, -2.4); for (let i = 0; i <= 8; i++) c.lineTo(-0.4 + i * 0.1, -2.4 + (i % 2 ? 0.12 : 0) + (V && V.tell ? 0.1 : 0)); c.lineTo(0.4, -2.2); c.quadraticCurveTo(0, -1.9, -0.4, -2.2); c.closePath(); inkF(c, "#1A1A10");
    });
  }
  function drawMadame(B, front) {
    if (front) return;
    const P = bossBody(B), V = B.volley, gargle = V ? Math.sin(clamp(V.tell, 0, 1) * Math.PI * 4) * V.tell : 0;
    withBody(B, P, c => {
      c.beginPath(); c.moveTo(-1.6, 0.1); c.quadraticCurveTo(-1.7, -1.8, -0.9, -2.6); c.quadraticCurveTo(0, -3.1, 0.9, -2.6); c.quadraticCurveTo(1.7, -1.8, 1.6, 0.1); c.closePath(); inkF(c, "#5A4A2A");
      c.fillStyle = "#3A2A18"; for (let i = 0; i < 7; i++) { const x = -1.3 + i * 0.43; c.beginPath(); c.ellipse(x, -0.5 - (i % 3) * 0.3, 0.12, 0.06, 0.4, 0, TAU); c.fill(); }
      c.strokeStyle = "#4A6A3A"; c.lineWidth = 0.08; for (let i = 0; i < 12; i++) { const x = -1.1 + i * 0.2; c.beginPath(); c.moveTo(x, -2.7); c.quadraticCurveTo(x + Math.sin(B.t + i) * 0.1, -2.0, x - 0.1, -1.4 - (i % 3) * 0.2); c.stroke(); } c.strokeStyle = INK; c.lineWidth = 0.05;
      pie(c, -0.35, -2.0, 0.17, 0.2, 0, B.hurt > 0.3, B.dead); pie(c, 0.35, -2.0, 0.17, 0.2, 0, B.hurt > 0.3, B.dead);
      c.lineWidth = 0.035; for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(sd * (0.25 + k * 0.1), -2.18); c.lineTo(sd * (0.25 + k * 0.12), -2.32); c.stroke(); } c.lineWidth = 0.05;
      c.beginPath(); c.ellipse(0, -1.45, 0.3 + gargle * 0.05, 0.14 + (B.spit > 0 ? 0.12 : 0) + gargle * 0.05, 0, 0, TAU); inkF(c, "#8A2A3A");
      for (const sd of [-1, 1]) { c.beginPath(); c.rect(sd * 1.2 - 0.12, -1.9, 0.24, 0.3); inkF(c, "#F2E7C9"); c.fillStyle = INK; c.fillRect(sd * 1.2 - 0.12, -1.66, 0.24, 0.06); }   // Morty's spats, worn as earrings
    });
    const wp = project(P.x, 0, P.z); ctx.strokeStyle = "rgba(200,240,220,.35)"; ctx.lineWidth = 1.5; for (let i = 0; i < 2; i++) { const k = ((B.t * 0.5 + i / 2) % 1); ctx.beginPath(); ctx.ellipse(wp.x, wp.y, (1.7 + k) * wp.s, (0.2 + k * 0.2) * wp.s, 0, 0, TAU); ctx.stroke(); }
  }
  function drawRingmaster(B, front) {
    if (front) return;
    const q = B.pathAt(B.t), P = bossBody(B), V = B.volley, twirl = V ? V.tell : 0;
    withBody(B, P, c => {
      for (const sd of [-1, 1]) { c.beginPath(); c.rect(sd * 0.3 - 0.14, -1.2, 0.28, 1.2); inkF(c, "#F2E7C9"); c.beginPath(); c.ellipse(sd * 0.32, -0.05, 0.3, 0.12, 0, 0, TAU); inkF(c, "#111"); }
      c.beginPath(); c.ellipse(0, -2.1, 0.95, 1.05, 0, 0, TAU); inkF(c, "#A94332"); c.fillStyle = GOLD; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(0.25, -2.6 + i * 0.35, 0.06, 0, TAU); c.fill(); c.beginPath(); c.arc(-0.25, -2.6 + i * 0.35, 0.06, 0, TAU); c.fill(); }
      c.beginPath(); c.moveTo(-0.3, -1.2); c.lineTo(-0.9, -0.8); c.lineTo(-0.5, -1.4); c.closePath(); inkF(c, "#7E2A22"); c.beginPath(); c.moveTo(0.3, -1.2); c.lineTo(0.9, -0.8); c.lineTo(0.5, -1.4); c.closePath(); inkF(c, "#7E2A22");
      c.save(); c.translate(1.0, -2.4); c.rotate(twirl * TAU * 2); c.lineWidth = 0.06; c.beginPath(); c.moveTo(0, 0.3); c.lineTo(0, -0.9); c.stroke(); c.beginPath(); c.arc(0, -1.0, 0.1, 0, TAU); inkF(c, GOLD); c.restore(); c.lineWidth = 0.05;
      gloveAt(c, 1.0, -2.4, 0.13); c.beginPath(); c.moveTo(-0.8, -2.5); c.quadraticCurveTo(-1.2, -2.1, -1.05, -1.8); c.lineWidth = 0.18; c.stroke(); c.lineWidth = 0.05; gloveAt(c, -1.05, -1.75, 0.13);
      c.save(); c.translate(0, -3.4); c.beginPath(); c.arc(0, 0, 0.36, 0, TAU); inkF(c, "#E8C8A0");
      pie(c, -0.13, -0.08, 0.08, 0.1, 0, B.hurt > 0.3, B.dead); pie(c, 0.13, -0.08, 0.08, 0.1, 0, B.hurt > 0.3, B.dead);
      c.beginPath(); c.moveTo(0, 0.08); c.quadraticCurveTo(-0.35, 0.02 - twirl * 0.05, -0.45, -0.1); c.quadraticCurveTo(-0.3, 0.18, 0, 0.14); c.quadraticCurveTo(0.3, 0.18, 0.45, -0.1); c.quadraticCurveTo(0.35, 0.02, 0, 0.08); inkF(c, "#3A2A1E");
      c.beginPath(); c.ellipse(0, -0.3, 0.46, 0.08, 0, 0, TAU); inkF(c, "#141418"); c.beginPath(); c.rect(-0.3, -0.95, 0.6, 0.65); inkF(c, "#141418"); c.fillStyle = GOLD; c.fillRect(-0.3, -0.45, 0.6, 0.08);
      c.restore();
      c.lineWidth = 0.02; c.beginPath(); c.moveTo(-0.2, -3.05); c.quadraticCurveTo(0, -2.6, 0.2, -3.05); c.stroke(); c.beginPath(); c.rect(-0.06, -2.72, 0.12, 0.2); inkF(c, "#C8CCD4");   // Morty's whistle, on a cord
    });
    if (!B.dead) { const a = project(P.x + 1.0, P.y + 3.4, P.z), b = project(q.x, q.y + ring.rc, q.z); ctx.save(); ctx.strokeStyle = "rgba(242,231,201,.3)"; ctx.setLineDash([2, 5]); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.restore(); }
  }
  function drawClockKing(B, front) {
    if (front) return;
    const q = B.pathAt(B.t), P = bossBody(B), C = B.def.carrier, V = B.volley;
    withBody(B, P, c => {
      c.beginPath(); c.moveTo(-0.8, 0); c.lineTo(-0.95, -3.2); c.lineTo(0.95, -3.2); c.lineTo(0.8, 0); c.closePath(); inkF(c, "#6A4A2E");
      c.beginPath(); c.rect(-0.4, -1.8, 0.8, 1.4); inkF(c, "#2A1A10"); const sw = Math.sin(B.t * 3) * 0.35; c.save(); c.translate(0, -1.75); c.rotate(sw); c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 1.0); c.stroke(); c.beginPath(); c.arc(0, 1.05, 0.15, 0, TAU); inkF(c, GOLD); c.restore();
      c.beginPath(); c.arc(0, -3.9, 0.85, 0, TAU); inkF(c, "#F2E2B8"); c.fillStyle = INK; for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; c.beginPath(); c.arc(Math.sin(a) * 0.72, -3.9 - Math.cos(a) * 0.72, 0.035, 0, TAU); c.fill(); }
      pie(c, -0.28, -4.1, 0.13, 0.15, 0, B.hurt > 0.3, B.dead); pie(c, 0.28, -4.1, 0.13, 0.15, 0, B.hurt > 0.3, B.dead);
      c.lineWidth = 0.08; c.beginPath(); c.moveTo(0, -3.62); c.lineTo(-0.4, -3.5 - (V && V.tell ? 0.1 : 0)); c.moveTo(0, -3.62); c.lineTo(0.4, -3.5 - (V && V.tell ? 0.1 : 0)); c.stroke(); c.lineWidth = 0.05;
      for (let i = 0; i < 5; i++) { const x = -0.6 + i * 0.3; c.save(); c.translate(x, -4.85); c.rotate(B.t * (i % 2 ? 1 : -1)); c.beginPath(); for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU, r = k % 2 ? 0.11 : 0.15; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); inkF(c, GOLD); c.restore(); }   // a crown of gears
      c.beginPath(); c.arc(-1.1, -2.2, 0.22, 0, TAU); inkF(c, "#C8CCD4"); c.beginPath(); c.moveTo(-1.1, -2.2); c.lineTo(-1.1, -2.36); c.moveTo(-1.1, -2.2); c.lineTo(-0.98, -2.2); c.stroke(); c.beginPath(); c.moveTo(-1.1, -2.42); c.lineTo(-1.1, -2.52); c.stroke();   // Morty's pocket watch
      c.beginPath(); c.moveTo(-0.9, -2.9); c.quadraticCurveTo(-1.3, -2.6, -1.1, -2.4); c.lineWidth = 0.16; c.stroke(); c.lineWidth = 0.05;
    });
    if (!B.dead) { const hub = project(C.cx, C.cy, C.cz + 0.3), tip = project(q.x, q.y, q.z); ctx.strokeStyle = INK; ctx.lineWidth = Math.max(3, 0.09 * tip.s); ctx.beginPath(); ctx.moveTo(hub.x, hub.y); ctx.lineTo(tip.x, tip.y); ctx.stroke(); ctx.strokeStyle = GOLD; ctx.lineWidth = Math.max(1.5, 0.045 * tip.s); ctx.stroke();
      ctx.fillStyle = GOLD; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(hub.x, hub.y, Math.max(4, 0.1 * hub.s), 0, TAU); ctx.fill(); ctx.stroke(); }
  }
  function drawReaper(B, front) {
    if (front) return;
    const q = B.pathAt(B.t), P = bossBody(B), V = B.volley, glint = V ? V.tell : 0;
    withBody(B, P, c => {
      c.beginPath(); c.moveTo(-1.1, 0); c.quadraticCurveTo(-1.0, -2.5, -0.55, -3.8); c.quadraticCurveTo(0, -4.6, 0.55, -3.8); c.quadraticCurveTo(1.0, -2.5, 1.1, 0); c.closePath(); inkF(c, "#141414");
      c.fillStyle = "#3A3A3A"; for (let y = -3.5; y < 0; y += 0.3) for (const sd of [-1, 1]) { c.beginPath(); rr(c, sd * (0.72 + y * 0.08) - 0.06, y, 0.12, 0.16, 0.03); c.fill(); }   // the cloak is film stock, sprocket holes and all
      c.beginPath(); c.ellipse(0, -3.55, 0.42, 0.5, 0, 0, TAU); inkF(c, "#0A0A0A");
      c.beginPath(); c.ellipse(0, -3.45, 0.26, 0.3, 0, 0, TAU); inkF(c, "#E4DAC4");
      for (const sd of [-1, 1]) { c.beginPath(); c.ellipse(sd * 0.1, -3.5, 0.07, 0.09, 0, 0, TAU); c.fillStyle = INK; c.fill(); if (!B.dead) { c.fillStyle = "#FF5A3A"; c.beginPath(); c.arc(sd * 0.1, -3.5, 0.03, 0, TAU); c.fill(); } }
      c.lineWidth = 0.08; c.beginPath(); c.moveTo(0.95, -0.2); c.lineTo(0.75, -4.4); c.stroke(); c.lineWidth = 0.05;
      c.beginPath(); c.moveTo(0.75, -4.4); c.quadraticCurveTo(0.0, -4.9, -0.7, -4.2); c.quadraticCurveTo(-0.1, -4.5, 0.72, -4.2); c.closePath(); inkF(c, glint > 0.2 ? "#FFFFFF" : "#C8CCD4");
      c.globalAlpha *= 0.55; c.beginPath(); c.arc(-1.5, -2.2, 0.36, 0, TAU); c.fillStyle = "#0A0A12"; c.fill(); c.beginPath(); rr(c, -1.72, -1.9, 0.44, 0.22, 0.08); c.fill(); c.globalAlpha /= 0.55;   // Morty's shadow, held captive at his side
    });
  }
