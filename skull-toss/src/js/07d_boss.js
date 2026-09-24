  // ───────────────────────── the bosses ─────────────────────────
  // Two big cartoon villains, each with a pattern you can learn. A boss owns the ring while it's on stage:
  // ringAt(p) says where the ring is at ring-phase p (phase runs in seconds during a fight), so the physics can
  // look a few milliseconds ahead. Toss through the ring to hurt the boss (a perfect hurts twice).
  //   CROW KING (mini-boss): carries the ring in his talons. He hovers, squawks (the tell), then swoops to his
  //   next perch: left, right, up, down, NEAR and FAR. He's there to teach you that the ring can move in depth.
  //   PUMPKIN KING (main boss): rises behind the graves. A vine carries the ring around the triangle, and he
  //   spits volleys of seeds down the throw lane. A seed knocks the skull out of the air, so throw between volleys.
  const seeds = [];
  const SEED_R = 0.14;
  const bossPathAt = (B, p) => B.pathAt(B.t + (p - ring.phase));

  // ── the Crow King
  const CROW_PERCHES = [
    { x: -1.0, y: 2.3, z: 6.0 }, { x: 1.15, y: 2.0, z: 7.4 }, { x: 0.05, y: 2.85, z: 5.0 },
    { x: -1.2, y: 2.05, z: 7.1 }, { x: 1.0, y: 2.65, z: 5.3 }, { x: 0.0, y: 2.2, z: 7.8 }
  ];
  const CROW_HANG = 1.18;   // from the crow's body down to the centre of the ring it carries
  function makeCrowKing(stage) {
    const max = Math.min(5 + (stage - 1), 8), start = { x: ring.x, y: ring.y, z: ring.z };
    const B = { kind: "crow", short: "Crow King", hp: max, max, rc: 0.6, flat: false, flawless: true, dead: false, t: 0, deadAt: 0, hurt: 0, cawAt: -9, start, segs: null,
      entry: 1.7 };
    // the timeline: a flight in, then hold → tell → swoop, perch after perch (holds shorten as he gets hurt)
    B.plan = () => { const k = B.hp / B.max; return { hold: 0.95 + 0.75 * k, tell: 0.5, move: 0.72 }; };
    B.seg = { i: 0, t0: B.entry, ...B.plan() };
    B.pathAt = t => {
      if (B.dead) return { ...B.frozen };
      if (t < B.entry) {                        // swoops in from the top left, snatches the ring off its post
        const P = CROW_PERCHES[0], k = smooth(clamp((t - 0.5) / (B.entry - 0.5), 0, 1));
        const from = { x: -4.2, y: 4.6, z: 8.5 }, body = { x: from.x + (P.x - from.x) * k, y: from.y + (P.y + CROW_HANG - from.y) * k - Math.sin(k * Math.PI) * 0.6, z: from.z + (P.z - from.z) * k };
        if (t < B.entry - 0.25) return { ...B.start, body };
        const g = smooth(clamp((t - (B.entry - 0.25)) / 0.25, 0, 1));
        return { x: B.start.x + (P.x - B.start.x) * g, y: B.start.y + (P.y - B.start.y) * g, z: B.start.z + (P.z - B.start.z) * g, body };
      }
      const S = B.seg, n = CROW_PERCHES.length;
      let i = S.i, t0 = S.t0; const len = S.hold + S.tell + S.move;
      while (t >= t0 + len) { t0 += len; i++; }        // a look-ahead into the next leg keeps the same timing
      const A = CROW_PERCHES[i % n], Bp = CROW_PERCHES[(i + 1) % n], u = t - t0;
      let x = A.x, y = A.y, z = A.z, bob = Math.sin(t * 5) * 0.05;
      if (u > S.hold + S.tell) { const k = smooth((u - S.hold - S.tell) / S.move); x = A.x + (Bp.x - A.x) * k; y = A.y + (Bp.y - A.y) * k - Math.sin(k * Math.PI) * 0.35; z = A.z + (Bp.z - A.z) * k; bob = 0; }
      else if (u > S.hold) bob = -0.12 * Math.sin(((u - S.hold) / S.tell) * Math.PI);   // the tell: he crouches
      return { x, y: y + bob, z, tell: u > S.hold && u <= S.hold + S.tell ? (u - S.hold) / S.tell : 0, next: Bp, leg: i };
    };
    B.ringAt = p => { const q = bossPathAt(B, p); return { x: q.x, y: q.y, z: q.z }; };
    B.update = dt => {
      B.t += dt; B.hurt = Math.max(0, B.hurt - dt * 2.5);
      const S = B.seg, len = S.hold + S.tell + S.move;
      if (!B.dead && B.t >= S.t0 + len) { B.seg = { i: S.i + 1, t0: S.t0 + len, ...B.plan() }; }
      const q = B.pathAt(B.t);
      if (q.tell > 0 && B.t - B.cawAt > 1) { B.cawAt = B.t; Sound.toon("caw", panOf(q.x)); }
    };
    B.hit = (kind, at) => {
      const dmg = kind === "perfect" ? 2 : 1;
      B.hp = Math.max(0, B.hp - dmg); B.hurt = 1; VisualSystem.cue("caw");   // (the doonk is the contact's: the director plays it)
      bossBonus(dmg, at);
      const q = B.pathAt(B.t), bp = project(q.x, q.y + CROW_HANG, q.z);
      for (let i = 0; i < 10; i++) particles.push({ kind: "feather", x: bp.x, y: bp.y, vx: rand(-1, 1) * U * 0.5, vy: -U * rand(0.2, 0.6), rot: rand(0, TAU), vr: rand(-4, 4), life: rand(0.9, 1.4), max: 1.4, size: rand(6, 11), color: "#2B2B33", g: 0.25, a: 1 });
      if (B.hp <= 0) bossDown(B, at); else VisualSystem.triggerImpact("boss", { at });
      updateHud();
    };
    B.draw = (front) => drawCrow(B, front);
    return B;
  }
  function drawCrow(B, front) {
    const q = B.pathAt(B.t), t = B.t, dying = B.dead ? B.t - B.deadAt : 0;
    let body = q.body || { x: q.x, y: q.y + CROW_HANG, z: q.z };
    if (B.dead) body = { x: B.frozen.x + dying * 0.8, y: B.frozen.y + CROW_HANG + dying * 2.2 - dying * dying * 6.5, z: B.frozen.z + dying * 1.5 };
    const behind = body.z > ring.z + 0.01;
    if (front === behind) return;   // drawn with whichever side of the ring it's on
    const p = project(body.x, body.y, body.z), s = p.s, R = 0.5 * s, tt = Math.floor(t * 12) / 12;
    // (no ghost ring at his next perch any more: his crouch and his caw are the only warning he gives)
    ctx.save(); ctx.translate(p.x, p.y); if (B.dead) ctx.rotate(dying * 9);
    const sq = q.tell ? 1 - 0.12 * Math.sin(q.tell * Math.PI) : 1, hurtK = B.hurt;
    ctx.scale(1 + (1 - sq) * 0.6 + hurtK * 0.15, sq - hurtK * 0.1);
    ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(2, R * 0.09);
    // legs (rubber hose) reaching down to the ring's top, with talons
    if (!B.dead && !q.body) {
      const ringTop = project(q.x, q.y + ring.rc, q.z);
      for (const sd of [-1, 1]) { ctx.strokeStyle = INK; ctx.lineWidth = Math.max(3, R * 0.14); ctx.beginPath(); ctx.moveTo(sd * R * 0.3, R * 0.7); ctx.quadraticCurveTo(sd * R * 0.7, (ringTop.y - p.y) * 0.5, sd * R * 0.22, ringTop.y - p.y - R * 0.05); ctx.stroke();
        ctx.strokeStyle = "#E3B64B"; ctx.lineWidth = Math.max(1.5, R * 0.07); ctx.stroke(); }
    }
    // wings, flapping on twos
    const flap = B.dead ? 1 : Math.sin(tt * (q.tell ? 26 : 16)) * 0.6;
    for (const sd of [-1, 1]) {
      ctx.save(); ctx.scale(sd, 1); ctx.rotate(-0.2 - flap * 0.5); ctx.fillStyle = "#3C3A4C"; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(2, R * 0.08);
      ctx.beginPath(); ctx.moveTo(R * 0.6, -R * 0.2); ctx.bezierCurveTo(R * 1.5, -R * 1.3, R * 2.4, -R * 0.9, R * 2.5, -R * 0.4);
      for (let i = 0; i < 4; i++) ctx.quadraticCurveTo(R * (2.3 - i * 0.35), -R * (0.1 - i * 0.02), R * (2.2 - i * 0.4), R * (0.2 + i * 0.06));
      ctx.quadraticCurveTo(R * 1.1, R * 0.4, R * 0.6, R * 0.3); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = "rgba(190,180,220,.45)"; ctx.lineWidth = Math.max(1, R * 0.05); for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(R * 0.8, -R * 0.05); ctx.lineTo(R * (1.9 - i * 0.35), -R * (0.35 - i * 0.12)); ctx.stroke(); }
      ctx.restore();
    }
    // body and head: one fat black bean
    ctx.strokeStyle = INK; ctx.lineWidth = Math.max(2, R * 0.09);
    ctx.fillStyle = "#2B2B33"; ctx.beginPath(); ctx.ellipse(0, 0, R * 0.85, R, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#3A3A46"; ctx.beginPath(); ctx.ellipse(-R * 0.25, -R * 0.35, R * 0.3, R * 0.2, -0.5, 0, TAU); ctx.fill();
    // pie eyes (X eyes when he's done for)
    for (const sd of [-1, 1]) {
      const ex = sd * R * 0.3, ey = -R * 0.3;
      ctx.fillStyle = CREAM; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.5, R * 0.06); ctx.beginPath(); ctx.ellipse(ex, ey, R * 0.24, R * (hurtK > 0.3 ? 0.08 : 0.3), 0, 0, TAU); ctx.fill(); ctx.stroke();
      if (B.dead) { ctx.beginPath(); ctx.moveTo(ex - R * 0.12, ey - R * 0.12); ctx.lineTo(ex + R * 0.12, ey + R * 0.12); ctx.moveTo(ex + R * 0.12, ey - R * 0.12); ctx.lineTo(ex - R * 0.12, ey + R * 0.12); ctx.stroke(); }
      else if (hurtK < 0.3) { const px = ex + sd * R * 0.04, py = ey + R * 0.06; ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(px, py, R * 0.1, R * 0.15, 0, 0, TAU); ctx.fill(); ctx.fillStyle = CREAM; ctx.beginPath(); ctx.moveTo(px, py); ctx.arc(px, py, R * 0.16, -1.3, -0.6); ctx.closePath(); ctx.fill(); }
      // angry brows
      ctx.strokeStyle = INK; ctx.lineWidth = Math.max(2, R * 0.1); ctx.beginPath(); ctx.moveTo(ex - sd * R * 0.22, ey - R * 0.4); ctx.lineTo(ex + sd * R * 0.2, ey - R * (B.hp < B.max / 2 ? 0.22 : 0.3)); ctx.stroke();
    }
    // beak, open on the squawk
    const open = q.tell ? 0.4 * Math.sin(q.tell * Math.PI) : hurtK * 0.5;
    ctx.fillStyle = "#E3B64B"; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.5, R * 0.07);
    ctx.beginPath(); ctx.moveTo(-R * 0.2, R * 0.02); ctx.quadraticCurveTo(0, -R * 0.08, R * 0.2, R * 0.02); ctx.lineTo(0, R * (0.45 - open * 0.3)); ctx.closePath(); ctx.fill(); ctx.stroke();
    if (open > 0.05) { ctx.beginPath(); ctx.moveTo(-R * 0.16, R * 0.1 + open * R * 0.3); ctx.lineTo(R * 0.16, R * 0.1 + open * R * 0.3); ctx.lineTo(0, R * (0.4 + open * 0.5)); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    // the crown, knocked crooked by every hit
    ctx.save(); ctx.translate(R * 0.05, -R * 0.95); ctx.rotate(-0.15 + (1 - B.hp / B.max) * 0.5 + (B.dead ? dying * 3 : 0)); if (B.dead) ctx.translate(0, -dying * R * 3);
    ctx.fillStyle = GOLD; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.5, R * 0.07);
    ctx.beginPath(); ctx.moveTo(-R * 0.42, R * 0.1); ctx.lineTo(-R * 0.45, -R * 0.35); ctx.lineTo(-R * 0.2, -R * 0.1); ctx.lineTo(0, -R * 0.45); ctx.lineTo(R * 0.2, -R * 0.1); ctx.lineTo(R * 0.45, -R * 0.35); ctx.lineTo(R * 0.42, R * 0.1); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = RED; ctx.beginPath(); ctx.arc(0, -R * 0.02, R * 0.07, 0, TAU); ctx.fill(); ctx.restore();
    ctx.restore();
    if (q.tell > 0.15 && !B.dead && B.lastCapLeg !== q.leg) { const w = project(body.x + 0.55, body.y + 0.55, body.z); caption("CAW!", w.x, w.y); B.lastCapLeg = q.leg; }
  }

  // ── the Pumpkin King (v44, the corrected roadmap's V20): HIS MOUTH IS THE RING and HIS EYES ARE TARGETS. His great head
  // rises out of the pumpkin rows and drifts round the ring's space; the ring is clamped in his grin, so a toss through
  // it goes down his throat (that's what hurts him). He spits seed volleys out through the ring at you, cheeks puffing
  // first. Hit an eye and it squeezes shut (a hit, not a miss: it costs no skull); shut both and he's blind for a few
  // seconds: no volleys, his mouth gapes wider, and every throw down it counts double. Then his eyes open again.
  const PK_TRI = [{ x: -1.2, y: 1.95, z: 5.4 }, { x: 1.25, y: 2.0, z: 7.2 }, { x: 0.05, y: 2.45, z: 6.2 }], PK_SEQ = [0, 1, 2, 0, 2, 1];
  const PK_HEAD = { dy: 0.8, dz: 0.45, r: 1.4 }, PK_EYE = { dx: 0.66, dy: 1.05, r: 0.22 }, PK_BLIND = 4.5;
  function makePumpkinKing(stage) {
    const max = Math.min(8 + (stage - 1), 12), start = { x: ring.x, y: ring.y, z: ring.z };
    const B = { kind: "pumpkin", short: "Pumpkin King", hp: max, max, rc: 0.56, flat: false, flawless: true, dead: false, t: 0, deadAt: 0, hurt: 0, start,
      entry: 2.4, s: 0, rise: 0, volley: { next: 3.6, tell: 0, n: 0 }, ghosts: 0, spit: 0, eyes: [0, 0], blind: 0 };   // eyes: how long each stays shut (0 = open)
    B.rate = () => (B.hp <= B.max / 2 ? 0.8 : 0.6) * (0.9 + stage * 0.1) * (B.blind > 0 ? 0.55 : 1);
    B.pathAt = t => {
      if (B.dead) return { ...B.frozen };
      if (t < B.entry - 0.6) return { ...B.start };
      const s = B.s + (t - B.t) * B.rate(), i = Math.floor(s), f = smooth(s - i), n = PK_SEQ.length;
      const A = PK_TRI[PK_SEQ[((i % n) + n) % n]], C = PK_TRI[PK_SEQ[(((i + 1) % n) + n) % n]];
      const q = { x: A.x + (C.x - A.x) * f, y: A.y + (C.y - A.y) * f, z: A.z + (C.z - A.z) * f };
      if (t < B.entry) { const g = smooth((t - (B.entry - 0.6)) / 0.6); return { x: B.start.x + (q.x - B.start.x) * g, y: B.start.y + (q.y - B.start.y) * g, z: B.start.z + (q.z - B.start.z) * g }; }
      return q;
    };
    B.ringAt = p => bossPathAt(B, p);
    B.eyePos = (i, m = ring) => ({ x: m.x + (i ? PK_EYE.dx : -PK_EYE.dx), y: m.y + PK_EYE.dy, z: m.z });
    // a throw crossing the mouth's plane: did it hit an open eye? (-1: no)
    B.eyeAt = P => { if (B.dead || B.t < B.entry) return -1; for (const i of [0, 1]) { const e = B.eyePos(i); if (!B.eyes[i] && Math.hypot(P.x - e.x, P.y - e.y) <= PK_EYE.r + SKULL_R) return i; } return -1; };
    B.eyeHit = (i, at) => {
      B.eyes[i] = 99; B.hurt = 0.6;
      const e = B.eyePos(i), p = project(e.x, e.y, e.z); impact("POKE!", p.x, p.y - U * 0.06, { fill: GOLD, text: INK, scale: 0.6, bits: false }); Sound.toon("boing", panOf(e.x));
      if (B.eyes[0] && B.eyes[1]) { B.blind = PK_BLIND; B.volley.next = Math.max(B.volley.next, B.t + PK_BLIND + 1.2); seeds.length = 0; caption("HE CAN'T SEE!", W / 2, H * 0.22); Sound.toon("rumble"); }
      void at;
    };
    B.update = dt => {
      B.t += dt; B.hurt = Math.max(0, B.hurt - dt * 2); B.rise = Math.min(1, B.rise + dt / 1.6);
      if (B.dead) { B.sink = (B.sink || 0) + dt; return; }
      if (B.t > B.entry) B.s += dt * B.rate();
      if (B.blind > 0) { B.blind -= dt; if (B.blind <= 0) { B.blind = 0; B.eyes = [0, 0]; Sound.toon("whistleUp"); } }
      B.rc = 0.56 + (B.blind > 0 ? 0.14 : 0);
      // seed volleys, out through the ring: puff the cheeks (the tell), then ptoo-ptoo-ptoo
      const V = B.volley;
      if (B.blind <= 0 && B.t >= V.next - 0.9 && B.t < V.next) V.tell = (B.t - (V.next - 0.9)) / 0.9; else V.tell = 0;
      if (B.blind <= 0 && B.t >= V.next && game.state !== "cine") {
        const n = B.hp <= B.max / 2 ? 4 : 3, pat = V.n % 3, m = B.pathAt(B.t);
        for (let i = 0; i < n; i++) {
          const lane = pat === 0 ? (i / (n - 1)) * 2 - 1 : pat === 1 ? 1 - (i / (n - 1)) * 2 : (i % 2 ? -0.6 : 0.6) * (1 - i * 0.15);
          seeds.push({ at: B.t + i * 0.16, x: m.x, y: m.y, z: m.z + 0.1, tx: lane * 1.4, ty: 2.25 + (i % 2) * 0.55, tz: 2.2, rot: rand(0, TAU), live: false });
        }
        V.n++; V.next = B.t + (B.hp <= B.max / 2 ? 3.6 : 4.4); B.spit = 0.3; Sound.toon("ptoo");
        const mp = project(m.x, m.y, m.z); caption("PTOO!", mp.x + U * 0.12, mp.y - U * 0.1);
      }
      B.spit = Math.max(0, B.spit - dt);
    };
    B.hit = (kind, at) => {
      const dmg = (kind === "perfect" ? 2 : 1) * (B.blind > 0 ? 2 : 1), was = B.hp;   // (blind, a throw down his throat counts double)
      B.hp = Math.max(0, B.hp - dmg); B.hurt = 1;
      bossBonus(dmg, at);
      const m = B.pathAt(B.t), pp = project(m.x, m.y + PK_HEAD.dy, m.z + PK_HEAD.dz);
      for (let i = 0; i < 10; i++) particles.push({ kind: "chunk", x: pp.x + rand(-1, 1) * PK_HEAD.r * pp.s * 0.5, y: pp.y + rand(-0.5, 0.5) * PK_HEAD.r * pp.s * 0.5, vx: rand(-1, 1) * U * 0.6, vy: -U * rand(0.3, 0.8), rot: rand(0, TAU), vr: rand(-8, 8), life: rand(0.8, 1.2), max: 1.2, size: rand(6, 12), color: i % 2 ? "#E8803A" : "#D9692A", g: 0.9 });
      if (B.hp <= 0) bossDown(B, at);
      else {
        VisualSystem.triggerImpact("boss", { at });
        if (was > B.max / 2 && B.hp <= B.max / 2) { caption("HE'S FURIOUS!", W / 2, H * 0.22); Sound.toon("rumble"); }
        const thirds = [Math.ceil(B.max * 2 / 3), Math.ceil(B.max / 3)];
        if (B.ghosts < 2 && was > thirds[B.ghosts] && B.hp <= thirds[B.ghosts]) { B.ghosts++; B.ghostDue = true; }
      }
      updateHud();
    };
    B.after = () => { if (B.ghostDue && !pickup && !B.dead) { B.ghostDue = false; spawnPickup("ghost"); } };
    B.cine = (c) => { if (c.kind === "boss-in" && c.t < 1.6 && Math.floor(c.t * 8) !== Math.floor((c.t - 1 / 60) * 8)) VisualSystem.triggerCameraJolt("thunder"); };
    B.draw = (front) => { if (!front) drawPumpkin(B); };
    return B;
  }
  // his head behind the ring, the ring clamped in his carved grin, his eyes two glowing targets
  function drawPumpkin(B) {
    const rise = smooth(B.rise), sink = B.sink || 0, t = B.t, tt = Math.floor(t * 12) / 12;
    const m = B.dead ? B.frozen : { x: ring.x, y: ring.y, z: ring.z }, drop = (1 - rise) * 3.4 + sink * sink * 2.5;
    const c = project(m.x, m.y + PK_HEAD.dy - drop, m.z + PK_HEAD.dz), R = PK_HEAD.r * c.s;
    const hurt = B.hurt, angry = B.hp <= B.max / 2, V = B.volley, puff = V.tell ? Math.sin(V.tell * Math.PI * 0.5) : 0, split = B.dead ? Math.min(1, (t - B.deadAt) / 0.6) : 0;
    ctx.save(); ctx.translate(c.x, c.y);
    const bounce = 1 + Math.sin(tt * 6) * 0.02 + hurt * 0.05;
    ctx.scale(bounce + puff * 0.08, 1 / bounce - hurt * 0.04);
    ctx.lineJoin = "round"; ctx.strokeStyle = INK;
    for (const sd of [-1, 1]) {   // vine arms, white gloves
      const wave = Math.sin(tt * 3 + sd) * R * 0.15;
      ctx.strokeStyle = INK; ctx.lineWidth = R * 0.14; ctx.beginPath(); ctx.moveTo(sd * R * 0.9, R * 0.3); ctx.bezierCurveTo(sd * R * 1.4, R * 0.3 + wave, sd * R * 1.55, -R * 0.4, sd * R * 1.35, -R * 0.65 + wave); ctx.stroke();
      ctx.strokeStyle = "#5E7A36"; ctx.lineWidth = R * 0.09; ctx.stroke();
      ctx.fillStyle = "#F7F1DF"; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(2, R * 0.03); ctx.beginPath(); ctx.arc(sd * R * 1.35, -R * 0.7 + wave, R * 0.15, 0, TAU); ctx.fill(); ctx.stroke();
    }
    for (const h of split ? [-1, 1] : [0]) {
      ctx.save();
      if (h) { ctx.translate(h * split * R * 0.5, split * R * 0.1); ctx.rotate(h * split * 0.35); ctx.beginPath(); ctx.rect(h < 0 ? -R * 2 : 0, -R * 2, R * 2, R * 4); ctx.clip(); }
      const cols = ["#D9692A", "#E8803A", "#F09046", "#E8803A", "#D9692A"];
      for (let i = 0; i < 5; i++) { const xk = (i - 2) * 0.36; ctx.fillStyle = cols[i]; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(2.5, R * 0.035); ctx.beginPath(); ctx.ellipse(xk * R, 0, R * (0.55 - Math.abs(i - 2) * 0.04), R * 0.9, 0, 0, TAU); ctx.fill(); ctx.stroke(); }
      ctx.fillStyle = "#5A6B2A"; ctx.beginPath(); ctx.moveTo(-R * 0.1, -R * 0.85); ctx.quadraticCurveTo(-R * 0.05, -R * 1.2, R * 0.18, -R * 1.25); ctx.lineTo(R * 0.2, -R * 1.12); ctx.quadraticCurveTo(R * 0.08, -R * 1.05, R * 0.1, -R * 0.85); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = GOLD; ctx.beginPath(); ctx.moveTo(-R * 0.45, -R * 0.82); for (let k = 0; k <= 4; k++) ctx.lineTo(-R * 0.45 + k * R * 0.225, -R * (k % 2 ? 1.0 : 1.16)); ctx.lineTo(R * 0.45, -R * 0.82); ctx.closePath(); ctx.fill(); ctx.stroke();
      // the carved grin: a jagged dark hole round where the ring sits (the ring itself is drawn over it)
      const mo = project(m.x, m.y - drop, m.z), mx = mo.x - c.x, my = mo.y - c.y, mr = B.rc * mo.s * (1.25 + (B.spit > 0 ? 0.1 : 0));
      ctx.fillStyle = "#1A0A04"; ctx.beginPath();
      for (let k = 0; k <= 16; k++) { const a = (k / 16) * TAU, rr2 = mr * (k % 2 ? 1.08 : 1.28) * (1 + (B.blind > 0 ? 0.12 : 0)); ctx.lineTo(mx + Math.cos(a) * rr2 * 1.25, my + Math.sin(a) * rr2); } ctx.closePath(); ctx.fill();
      const glow = angry ? "#FFD04A" : "#FFB84A", fl = 0.8 + 0.2 * Math.sin(t * 13) * Math.sin(t * 4.1);
      ctx.fillStyle = glow; ctx.globalAlpha = 0.35 * fl; ctx.beginPath(); ctx.ellipse(mx, my + mr * 0.6, mr * 0.8, mr * 0.25, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
      if (puff > 0.1) for (const sd of [-1, 1]) { ctx.fillStyle = "rgba(255,150,120,.5)"; ctx.beginPath(); ctx.ellipse(mx + sd * mr * 1.9, my - mr * 0.1, R * 0.16 * (1 + puff), R * 0.11 * (1 + puff), 0, 0, TAU); ctx.fill(); }
      // the eyes: targets, a glowing bull's-eye each, squeezed shut once hit
      for (const i of [0, 1]) {
        const e = B.eyePos(i, { x: m.x, y: m.y - drop, z: m.z }), ep = project(e.x, e.y, e.z), ex = ep.x - c.x, ey = ep.y - c.y, er = PK_EYE.r * ep.s;
        if (B.eyes[i] || B.dead) { ctx.strokeStyle = INK; ctx.lineWidth = er * 0.35; ctx.beginPath(); ctx.moveTo(ex - er, ey); ctx.quadraticCurveTo(ex, ey + er * 0.5, ex + er, ey); ctx.stroke(); for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(ex + k * er * 0.5, ey + er * 0.1); ctx.lineTo(ex + k * er * 0.6, ey + er * 0.5); ctx.lineWidth = er * 0.12; ctx.stroke(); } continue; }
        ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(ex - er * 1.25, ey - er * (angry ? 1.1 : 0.7)); ctx.lineTo(ex + er * 1.25, ey - er * (angry ? 0.2 : 0.7)); ctx.lineTo(ex, ey + er * 1.1); ctx.closePath(); ctx.fill();
        for (const [k, col] of [[0.85, glow], [0.55, "#1A0A04"], [0.28, glow]]) { ctx.fillStyle = col; ctx.globalAlpha = col === glow ? fl : 1; ctx.beginPath(); ctx.arc(ex, ey - er * 0.05, er * k, 0, TAU); ctx.fill(); } ctx.globalAlpha = 1;
      }
      ctx.restore();
    }
    ctx.restore();
  }
  function drawSeeds(front) {
    for (const sd of seeds) {
      if (!sd.live) continue;
      if ((sd.z < ring.z) !== front) continue;
      const p = project(sd.x, sd.y, sd.z), r = SEED_R * p.s * 1.3;
      if (r < 0.5) continue;
      const g = project(sd.x, 0, sd.z);   // a shadow on the ground, so you can read how near it is
      ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.beginPath(); ctx.ellipse(g.x, g.y, r * 1.1, r * 0.3, 0, 0, TAU); ctx.fill();
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(sd.rot);
      ctx.fillStyle = "#F4E6BE"; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.5, r * 0.16);
      if (sd.kind && sd.kind !== "seed") drawShot(sd.kind, r, sd.rot);
      else {
        ctx.beginPath(); ctx.moveTo(0, -r * 1.2); ctx.bezierCurveTo(r * 1.1, -r * 0.6, r * 0.8, r * 1, 0, r * 1.1); ctx.bezierCurveTo(-r * 0.8, r * 1, -r * 1.1, -r * 0.6, 0, -r * 1.2); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = "rgba(160,120,60,.6)"; ctx.lineWidth = Math.max(1, r * 0.1); ctx.beginPath(); ctx.moveTo(0, -r * 0.8); ctx.lineTo(0, r * 0.8); ctx.stroke();
      }
      ctx.restore();
    }
  }
  // what the other end bosses throw (drawn at the seed's place, r its size on screen)
  function drawShot(kind, r, rot) {
    const f = c => { ctx.fillStyle = c; ctx.fill(); ctx.stroke(); };
    if (kind === "clod") { ctx.beginPath(); for (let i = 0; i < 9; i++) { const a = (i / 9) * TAU, k = 1 + ((i * 37) % 5) * 0.08; ctx.lineTo(Math.cos(a) * r * k, Math.sin(a) * r * k); } ctx.closePath(); f("#6A4A2E"); }
    else if (kind === "bat") { ctx.rotate(-rot); ctx.fillStyle = INK; drawBat(ctx, 0, 0, r * 0.9, Math.sin(rot * 3)); }
    else if (kind === "bone") { ctx.beginPath(); rr(ctx, -r * 1.1, -r * 0.2, r * 2.2, r * 0.4, r * 0.15); f("#E4DAC4"); for (const e of [-1, 1]) for (const g of [-1, 1]) { ctx.beginPath(); ctx.arc(e * r * 1.1, g * r * 0.22, r * 0.26, 0, TAU); f("#E4DAC4"); } }
    else if (kind === "mud") { ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); f("#5A4A2A"); ctx.fillStyle = "#7A6A3A"; ctx.beginPath(); ctx.arc(-r * 0.3, -r * 0.3, r * 0.3, 0, TAU); ctx.fill(); }
    else if (kind === "pin") { ctx.beginPath(); ctx.moveTo(0, -r * 1.3); ctx.quadraticCurveTo(r * 0.5, -r * 0.6, r * 0.5, r * 0.5); ctx.quadraticCurveTo(r * 0.4, r * 1.2, 0, r * 1.2); ctx.quadraticCurveTo(-r * 0.4, r * 1.2, -r * 0.5, r * 0.5); ctx.quadraticCurveTo(-r * 0.5, -r * 0.6, 0, -r * 1.3); f(CREAM); ctx.fillStyle = RED; ctx.fillRect(-r * 0.4, -r * 0.3, r * 0.8, r * 0.2); }
    else if (kind === "gear") { ctx.beginPath(); for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU, k = i % 2 ? 0.8 : 1.05; ctx.lineTo(Math.cos(a) * r * k, Math.sin(a) * r * k); } ctx.closePath(); f(GOLD); ctx.beginPath(); ctx.arc(0, 0, r * 0.3, 0, TAU); f("#6A4A2E"); }
    else if (kind === "frame") { ctx.beginPath(); ctx.rect(-r, -r * 0.75, r * 2, r * 1.5); f("#141414"); ctx.fillStyle = "#F2E7C9"; ctx.fillRect(-r * 0.6, -r * 0.45, r * 1.2, r * 0.9); ctx.fillStyle = "#3A3A3A"; for (const sy of [-1, 1]) for (let i = 0; i < 4; i++) ctx.fillRect(-r * 0.85 + i * r * 0.5, sy * r * 0.62 - r * 0.06, r * 0.18, r * 0.12); }
  }
  function updateSeeds(dt) {
    if (!seeds.length) return;
    const T = boss ? boss.t : 0;
    for (const sd of seeds) {
      if (!sd.live) {
        if (T >= sd.at) { sd.live = true; const fly = 1.45; sd.vx = (sd.tx - sd.x) / fly; sd.vz = (sd.tz - sd.z) / fly; sd.vy = (sd.ty - sd.y + 0.5 * 3 * fly * fly) / fly; sd.ox = sd.x; sd.oy = sd.y; sd.oz = sd.z; }
        continue;
      }
      sd.ox = sd.x; sd.oy = sd.y; sd.oz = sd.z;
      if (sd.fixed) continue;
      sd.x += sd.vx * dt; sd.z += sd.vz * dt; sd.vy -= 3 * dt; sd.y += sd.vy * dt; sd.rot += dt * 9;
    }
    for (let i = seeds.length - 1; i >= 0; i--) { const sd = seeds[i]; if (sd.live && (sd.z < -CAM_BACK + 0.5 || sd.y < -0.5)) seeds.splice(i, 1); }
    if (!boss) seeds.length = 0;
  }
  // a seed in the face: the skull gets knocked out of the air (Ghost Toss lets it slip through, once per charge)
  function seedCheck(s, prev) {
    for (const sd of seeds) {
      if (!sd.live) continue;
      // swept test: the closest the two came during this frame (they close fast, so a single sample could miss)
      const a = { x: prev.x - sd.ox, y: prev.y - sd.oy, z: prev.z - sd.oz }, b = { x: s.pos.x - sd.x, y: s.pos.y - sd.y, z: s.pos.z - sd.z };
      const e = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z }, ee = e.x * e.x + e.y * e.y + e.z * e.z;
      const u = ee > 1e-9 ? clamp(-(a.x * e.x + a.y * e.y + a.z * e.z) / ee, 0, 1) : 1;
      const d = Math.hypot(a.x + e.x * u, a.y + e.y * u, a.z + e.z * u);
      if (d > SKULL_R + SEED_R) { if (d < SKULL_R + SEED_R + NEAR_PASS && !game.result) s.close = true; continue; }
      if (powerOn("ghost")) { if (!sd.ghosted) { sd.ghosted = true; usePower("ghost"); s.ghosted = 1; const p = project(sd.x, sd.y, sd.z); caption(t("result.ghost.caption"), p.x, p.y - U * 0.06); Sound.toon("poof"); } continue; }
      const p = project(s.pos.x, s.pos.y, s.pos.z);
      s.p0 = { ...s.pos }; s.t = 0; s.v0 = { x: (s.pos.x - sd.x) * 8 + sd.vx * 0.4, y: 2.5, z: -2.2 }; s.crossed = true; s.spin *= -2;
      VisualSystem.triggerImpact("seed", { at: project(ring.x, ring.y, ring.z), hit: p, strength: 1, pan: panOf(s.pos.x) });
      sd.vx *= -0.5; sd.vz = -sd.vz * 0.3 + 2; sd.vy = 3;
      resolve("seed", project(ring.x, ring.y, ring.z), p);
      return;
    }
  }
  // every boss hit is worth extra
  function bossBonus(dmg, at) {
    const bonus = Math.round(300 * dmg * stageMult());
    game.score += bonus; profile.scoreTotal += bonus;
    const p = at || { x: W / 2, y: H * 0.3 };
    flyPoints(`+${fmtN(bonus)}`, p.x + U * 0.12, p.y - U * 0.1, false);
  }
  // the knockout: freeze the frame, K.O.!, and the boss's defeat plays out once the throw has settled
  function bossDown(B, at) {
    B.frozen = { ...B.ringAt(ring.phase) }; B.dead = true; B.deadAt = B.t;
    Telemetry.emit("boss_down", { kind: B.kind, stage: game.stage, flawless: !!B.flawless });
    VisualSystem.triggerImpact("ko", { at });   // doonk, the knockout bell, the hold, the big flash: the director's
    const p = at || { x: W / 2, y: H * 0.35 };
    impact("K.O.!", p.x, p.y - U * 0.18, { fill: GOLD, text: INK, scale: 1.35, sub: `${B.short} is down${B.flawless ? " · flawless" : ""}` });
    seeds.length = 0;
  }
  function updateBoss(dt) { if (boss) boss.update(dt); }
  // a boss by id (see BOSS_INFO): the Crow King and the Pumpkin King are hand-made here, every other one is built from its
  // definition (07f_bosses.js)
  function makeBoss(id, stage) {
    const B = id === "pumpkin" ? makePumpkinKing(stage) : id === "crow" ? makeCrowKing(stage) : makeGenericBoss(id, stage);
    B.kind = id; B.short = BOSS_INFO[id].short; sawIt("boss", id);
    return B;
  }
