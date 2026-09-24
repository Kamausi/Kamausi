  // ───────────────────────── obstacles (v44, the corrected roadmap's V19) ─────────────────────────
  // Eight kinds of thing the environment puts in the throw's way, each with a spatial footprint (where it may stand:
  // the map sheet's hazard zone), a depth layer (the foreground plane, between the launcher and the ring), a collision
  // volume, an animation, a reaction when hit, a sound, and a tell that makes it readable before it matters:
  //   bumper   a gilded urn or ball: the skull bounces off it, and a bank shot still counts   (sphere; BOING)
  //   bar      a revolving scenery flat or gear spoke sweeping the lane                        (capsule; blocks)
  //   spikes   a thorn hedge that rises out of the ground on a cycle, low throws first         (box; blocks)
  //   cannon   dug in beside the lane, firing a ball across it after its fuse fizzes           (sphere; blocks)
  //   fan      a hollow log gusting up the lane: the skull is pushed while it's in the stream  (box; a force)
  //   magnet   a lodestone that bends the flight toward it; touch it and it sticks              (field; a force, its core blocks)
  //   crusher  a heavy block that shudders, then slams down across the lane, and slowly rises  (box; blocks)
  //   barrier  a ghostly scrim that fades in and out; solid, it stops the skull                (plane; blocks)
  // The maps name theirs (src/maps/*.json: obstacles.A, .B and .boss), each coming in at a hit count, so a map
  // introduces one thing, escalates it, then adds the next. Everything runs on the obstacles' own clock (the run's
  // simulation time), so a replay sees them exactly where the player did. The aim guide bends with fans and
  // lodestones, as it does with the wind. The tier sets how quickly they all move (tiers.json: objects).
  const OB = { list: [], t: 0, seen: {} };
  const CRUSHER_TALL = 2.2, BAR_R = 0.09, BALL_R = 0.2, MAG_CORE = 0.22;
  const obSpeed = () => (tierNow().objects || 1) * (game.phase === "boss" && boss && bossAngry(boss) ? 1.2 : 1);
  const obstaclesAllowed = () => hazardsAllowed() && game.state !== "title";
  // which of the map's obstacles are in now: the first half's by hit count, the approach's by hits since the ring broke loose,
  // the end boss's own set for the fight, none for the mini-boss
  function obstacleSpecs() {
    if (!obstaclesAllowed() || OB.off) return [];   // (off: the spec's calm set-up throws)
    const O = mapData(game.stage || 1).obstacles, h = game.stageHits || 0;
    if (boss) return game.phase === "boss" ? O.boss.map((o, i) => ({ ...o, key: "boss" + i })) : [];   // (the end boss brings the map's machinery into the fight; a mini-boss fights clean)
    if (game.phase === "A") return O.A.map((o, i) => ({ ...o, key: "A" + i })).filter(o => h >= o.from);
    if (game.phase === "B") return O.B.map((o, i) => ({ ...o, key: "B" + i })).filter(o => h - (arcadeLike() ? STAGE_MINI : STAGE_LOOSE) >= o.from);
    return [];
  }
  function obstaclesReset() { OB.list = []; OB.t = 0; obstaclesSync(true); }
  // after every settled throw (and at each change of act): bring in what's due, drop what's done
  function obstaclesSync(quiet = false) {
    const want = obstacleSpecs(), keep = [];
    for (const o of want) {
      let I = OB.list.find(x => x.key === o.key);
      if (!I) { I = { ...o, born: OB.t, hitAt: -9, fired: -1, balls: [] }; if (!quiet) introduceObstacle(I); }
      keep.push(I);
    }
    OB.list = keep;
  }
  // a new obstacle comes in with a word, so the player knows what it is before it matters
  function introduceObstacle(I) {
    sawIt("obstacle", I.kind);
    if (OB.seen[I.kind] === game.stage) return;
    OB.seen[I.kind] = game.stage;
    const p = project(...obCentre(I));
    caption(t(`obstacle.${I.kind}.intro`), clamp(p.x, U * 0.25, W - U * 0.25), p.y - U * 0.08);
    Sound.toon("brass");
  }
  function obCentre(I) {
    if (I.at) return I.at;
    if (I.kind === "spikes") return [(I.span[0] + I.span[1]) / 2, I.h * 0.6, I.z];
    if (I.kind === "cannon") return [I.side * 2.2, I.y, I.z];
    if (I.kind === "fan") { const [x0, x1, y0, y1, z0, z1] = I.box; return [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2]; }
    if (I.kind === "crusher") { const [x0, x1, z0, z1] = I.box; return [(x0 + x1) / 2, I.low + 1.2, (z0 + z1) / 2]; }
    if (I.kind === "barrier") { const [x0, x1, y0, y1, z] = I.box; return [(x0 + x1) / 2, (y0 + y1) / 2, z]; }
    return [0, 2, 4];
  }
  function updateObstacles(dt) {
    if (!OB.list.length) return;
    OB.t += dt * obSpeed();
    for (const I of OB.list) if (I.kind === "cannon") cannonUpdate(I);
  }

  // ── where each one is at obstacle-time T
  function bumperAt(I, T = OB.t) {
    let [x, y, z] = I.at;
    if (I.drift) x += I.drift[0] * Math.sin((TAU * T) / I.drift[1]);
    if (I.orbit) { const a = (TAU * T) / I.orbit[1] + (x < 0 ? Math.PI : 0); x = I.orbit[0] * Math.cos(a); y = I.at[1] + I.orbit[0] * 0.45 * Math.sin(a); }
    return { x, y, z };
  }
  function barEnds(I, T = OB.t) {
    const a = I.spin * T + (I.at[0] < 0 ? 0.6 : 0), c = Math.cos(a) * I.len, s = Math.sin(a) * I.len;
    return { a: { x: I.at[0] - c, y: I.at[1] - s, z: I.at[2] }, b: { x: I.at[0] + c, y: I.at[1] + s, z: I.at[2] }, ang: a };
  }
  function spikesRaise(I, T = OB.t) {   // 0 (down) … 1 (up); the last 0.5 s down they peek (the tell)
    const [up, down] = I.cycle, u = ((T + (I.phase || 0)) % (up + down) + up + down) % (up + down);
    if (u < up) return Math.min(1, u / 0.18);
    const left = up + down - u; return left < 0.5 ? 0.12 * (1 - left / 0.5) : Math.max(0, 1 - (u - up) / 0.25);
  }
  const spikesTell = (I, T = OB.t) => { const [up, down] = I.cycle, u = ((T + (I.phase || 0)) % (up + down) + up + down) % (up + down); return u >= up && up + down - u < 0.5; };
  function crusherBottom(I, T = OB.t) {   // the block's underside: up, shudder (tell), SLAM, hold down, rise
    const [upH, downH, rise] = I.cycle, tell = 0.45, slam = 0.12, per = upH + slam + downH + rise, u = ((T + (I.phase || 0)) % per + per) % per;
    if (u < upH) return { y: I.top + (u > upH - tell ? Math.sin(u * 60) * 0.03 : 0), tell: u > upH - tell ? (u - (upH - tell)) / tell : 0 };
    if (u < upH + slam) return { y: I.top + (I.low - I.top) * ((u - upH) / slam) ** 2, tell: 0, slam: true };
    if (u < upH + slam + downH) return { y: I.low, tell: 0, down: true };
    return { y: I.low + (I.top - I.low) * smooth((u - upH - slam - downH) / rise), tell: 0 };
  }
  function barrierAlpha(I, T = OB.t) {   // solid (1), fading, gone (0), flickering back in (the tell)
    const [solid, gone] = I.cycle, per = solid + gone, u = ((T + (I.phase || 0)) % per + per) % per;
    if (u < solid - 0.2) return 1;
    if (u < solid) return (solid - u) / 0.2;
    if (u < per - 0.45) return 0;
    const k = (u - (per - 0.45)) / 0.45; return k < 0.7 ? (Math.floor(u * 20) % 2 ? 0.35 * k : 0.05) : k;
  }
  const fanOn = (I, T = OB.t) => { const [on, off] = I.pulse, u = ((T + (I.phase || 0)) % (on + off) + on + off) % (on + off); return u < on ? Math.min(1, u / 0.25, (on - u) / 0.25) : 0; };
  const fanDir = (I, T = OB.t) => (I.flip && Math.floor((T + (I.phase || 0)) / (I.pulse[0] + I.pulse[1])) % 2 ? -1 : 1);
  function cannonUpdate(I) {   // fire on the schedule: a fizzing fuse first, then BOOM, the ball crossing the lane
    const [per, tell] = I.every, k = Math.floor((OB.t - (I.phase || 0) - tell) / per);
    if (k > I.fired && OB.t - (I.phase || 0) >= tell + k * per && k >= 0) {
      I.fired = k; I.balls.push({ t0: OB.t }); Sound.toon("pop", I.side * -0.8);
      const p = project(I.side * 3.0, I.y, I.z); caption("BOOM!", clamp(p.x, U * 0.2, W - U * 0.2), p.y - U * 0.05);
    }
    I.balls = I.balls.filter(b => Math.abs(ballAt(I, b).x) < 3.6);
  }
  const ballAt = (I, b, T = OB.t) => ({ x: I.side * 3.0 - I.side * I.speed * (T - b.t0), y: I.y, z: I.z });
  const cannonTell = I => { const [per, tell] = I.every, u = (((OB.t - (I.phase || 0)) % per) + per) % per; return u < tell && OB.t - (I.phase || 0) >= 0 ? u / tell : 0; };

  // ── forces on the skull in flight (fans and lodestones): m/s², at a point
  function obstacleForce(P, T = OB.t) {
    let fx = 0, fy = 0, fz = 0;
    for (const I of OB.list) {
      if (I.kind === "fan") { const [x0, x1, y0, y1, z0, z1] = I.box, on = fanOn(I, T); if (on > 0 && P.x > x0 && P.x < x1 && P.y > y0 && P.y < y1 && P.z > z0 && P.z < z1) { const d = fanDir(I, T); fx += I.push[0] * on * d; fy += I.push[1] * on; } }
      else if (I.kind === "magnet") { const dx = I.at[0] - P.x, dy = I.at[1] - P.y, dz = I.at[2] - P.z, d = Math.hypot(dx, dy, dz); if (d < I.R && d > 1e-3) { const a = I.k * (1 - d / I.R) / d; fx += dx * a; fy += dy * a; fz += dz * a * 0.3; } }
    }
    return { x: fx, y: fy, z: fz };
  }
  const obstacleForcesLive = () => OB.list.some(I => I.kind === "fan" || I.kind === "magnet");
  // the flight a throw would take through the fans and lodestones, stepped the way the game steps it (for the aim guide)
  function forcedPath(v, tEnd) {
    const out = [], dt = SIM_STEP, wx = windNow(); let p = { x: 0, y: START_Y, z: 0 }, u = { ...v }, T = OB.t;
    for (let t = 0; t < tEnd; t += dt) {
      const f = obstacleForce(p, T); u = { x: u.x + f.x * dt, y: u.y + f.y * dt, z: Math.max(0.5, u.z + f.z * dt) };
      p = { x: p.x + u.x * dt + 0.5 * wx * dt * dt, y: p.y + u.y * dt - 0.5 * G * dt * dt, z: p.z + u.z * dt }; u = { x: u.x + wx * dt, y: u.y - G * dt, z: u.z };
      T += dt * obSpeed(); out.push({ ...p, t: t + dt });
      if (p.y < SKULL_R) break;
    }
    return out;
  }
  // (called at the top of each flight step: the push goes into the throw's velocity, exactly and replayably)
  function obstaclePush(s, dt) {
    if (s.resting || s.hang > 0 || !OB.list.length || game.result) return;
    const f = obstacleForce(s.pos); if (!f.x && !f.y && !f.z) return;
    rebase(s, s.t); s.v0 = { x: s.v0.x + f.x * dt, y: s.v0.y + f.y * dt, z: Math.max(0.5, s.v0.z + f.z * dt) };
    s.pushed = true;
  }

  // ── collisions: bumpers bounce, the rest knock the skull out of the air (a Ghost Toss slips through, once a charge)
  function segDist(P, a, b) { const ex = b.x - a.x, ey = b.y - a.y, ez = b.z - a.z, ee = ex * ex + ey * ey + ez * ez, u = ee > 1e-9 ? clamp(((P.x - a.x) * ex + (P.y - a.y) * ey + (P.z - a.z) * ez) / ee, 0, 1) : 0;
    return Math.hypot(P.x - a.x - ex * u, P.y - a.y - ey * u, P.z - a.z - ez * u); }
  function obstacleCheck(s, prev) {
    if (!OB.list.length) return false;
    const P = s.pos;
    for (const I of OB.list) {
      let hit = false, near = false, at = null;
      if (I.kind === "bumper") {
        const c = bumperAt(I), d = Math.hypot(P.x - c.x, P.y - c.y, P.z - c.z);
        if (d < I.r + SKULL_R && OB.t - I.hitAt > 0.15) { bumperBounce(s, I, c, d); continue; }
        continue;
      }
      if (I.kind === "bar") { const E = barEnds(I), d = segDist(P, E.a, E.b); hit = d < BAR_R + SKULL_R; near = d < BAR_R + SKULL_R + NEAR_PASS; at = P; }
      else if (I.kind === "spikes") { const r = spikesRaise(I); hit = r > 0.3 && P.x > I.span[0] - SKULL_R && P.x < I.span[1] + SKULL_R && P.y < I.h * r + SKULL_R && Math.abs(P.z - I.z) < 0.14 + SKULL_R; at = P; }
      else if (I.kind === "cannon") { for (const b of I.balls) { const q = ballAt(I, b), d = Math.hypot(P.x - q.x, P.y - q.y, P.z - q.z); if (d < BALL_R + SKULL_R) { hit = true; at = q; break; } if (d < BALL_R + SKULL_R + NEAR_PASS) near = true; } }
      else if (I.kind === "magnet") { const d = Math.hypot(P.x - I.at[0], P.y - I.at[1], P.z - I.at[2]); hit = d < MAG_CORE + SKULL_R; near = d < MAG_CORE + SKULL_R + NEAR_PASS; at = P; }
      else if (I.kind === "crusher") { const [x0, x1, z0, z1] = I.box, B = crusherBottom(I); hit = P.x > x0 - SKULL_R && P.x < x1 + SKULL_R && P.z > z0 - SKULL_R && P.z < z1 + SKULL_R && P.y > B.y - SKULL_R && P.y < B.y + CRUSHER_TALL + SKULL_R; at = P; }
      else if (I.kind === "barrier") { const [x0, x1, y0, y1, z] = I.box; if (prev.z < z && P.z >= z && barrierAlpha(I) > 0.5) { const u = (z - prev.z) / (P.z - prev.z), x = prev.x + (P.x - prev.x) * u, y = prev.y + (P.y - prev.y) * u; hit = x > x0 && x < x1 && y > y0 && y < y1; at = { x, y, z }; } }
      if (near && !hit && !game.result) s.close = true;   // a near pass (Thread the Needle)
      if (!hit) continue;
      if (powerOn("ghost")) { if (!I.ghosted || OB.t - I.ghosted > 1) { I.ghosted = OB.t; usePower("ghost"); s.ghosted = 1; const p = project(P.x, P.y, P.z); caption(t("result.ghost.caption"), p.x, p.y - U * 0.06); Sound.toon("poof"); } continue; }
      obstacleKnock(s, I, at || P);
      return true;
    }
    return false;
  }
  function bumperBounce(s, I, c, d) {
    const v = velAt(s, s.t), n = d > 1e-6 ? { x: (s.pos.x - c.x) / d, y: (s.pos.y - c.y) / d, z: (s.pos.z - c.z) / d } : { x: 0, y: 1, z: 0 }, vn = v.x * n.x + v.y * n.y + v.z * n.z;
    const out = vn < 0 ? { x: v.x - 2 * vn * n.x, y: v.y - 2 * vn * n.y, z: v.z - 2 * vn * n.z } : v;
    s.p0 = { x: c.x + n.x * (I.r + SKULL_R + 0.01), y: c.y + n.y * (I.r + SKULL_R + 0.01), z: c.z + n.z * (I.r + SKULL_R + 0.01) };
    s.v0 = { x: out.x * 0.95 + n.x * 0.8, y: out.y * 0.95 + n.y * 0.8, z: Math.max(0.6, out.z * 0.95 + n.z * 0.8) }; s.t = 0; s.pos = { ...s.p0 };
    s.spin = -s.spin * 1.3 - 2; I.hitAt = OB.t; s.banked = (s.banked || 0) + 1;
    const p = project(c.x, c.y, c.z); impact("BOING!", p.x, p.y - I.r * p.s * 1.4, { fill: GOLD, text: INK, scale: 0.55, bits: false });
    Sound.toon("boing", panOf(c.x)); VisualSystem.triggerImpact("bounce", { at: p, strength: 0.8, pan: panOf(c.x) });
  }
  function obstacleKnock(s, I, q) {
    const p = project(s.pos.x, s.pos.y, s.pos.z);
    s.p0 = { ...s.pos }; s.t = 0; s.v0 = { x: (s.pos.x - q.x) * 6 + (I.kind === "cannon" ? -I.side * 2.5 : 0), y: I.kind === "crusher" ? -3 : 2.2, z: -1.8 }; s.crossed = true; s.spin *= -2; s.ax = 0;
    I.hitAt = OB.t;
    Sound.toon(I.kind === "spikes" ? "bonk" : I.kind === "barrier" ? "poof" : I.kind === "magnet" ? "clang" : I.kind === "cannon" ? "bonk" : "clang", panOf(s.pos.x));
    VisualSystem.triggerImpact("seed", { at: project(ring.x, ring.y, ring.z), hit: p, strength: 1, pan: panOf(s.pos.x) });
    resolve(I.kind, project(ring.x, ring.y, ring.z), p);
    profile.hazardHits++;
  }

  // ── drawing: each in front of or behind the ring, by depth
  function drawObstacles(front) {
    if (!OB.list.length || game.state === "title") return;
    for (const I of OB.list) {
      const zc = obCentre(I)[2]; if ((zc < ring.z) !== front) continue;
      ctx.save(); ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.strokeStyle = INK;
      OB_DRAW[I.kind](I);
      ctx.restore();
    }
  }
  const obShadow = (x, z, w) => { const g = project(x, 0, z); ctx.fillStyle = "rgba(0,0,0,.28)"; ctx.beginPath(); ctx.ellipse(g.x, g.y, w * g.s, 0.06 * g.s, 0, 0, TAU); ctx.fill(); };
  const OB_DRAW = {
    bumper(I) {   // a gilded urn-ball on a stalk of light, squashing when it's hit
      const c = bumperAt(I), p = project(c.x, c.y, c.z), r = I.r * p.s, k = clamp((OB.t - I.hitAt) / 0.35, 0, 1), sq = k < 1 ? Math.sin(k * Math.PI * 3) * (1 - k) * 0.25 : 0;
      obShadow(c.x + shadowShift(c.y), c.z, I.r * 0.9);
      const g = ctx.createRadialGradient(p.x, p.y, r * 0.5, p.x, p.y, r * 2); g.addColorStop(0, "rgba(255,220,140,.25)"); g.addColorStop(1, "rgba(255,220,140,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, r * 2, 0, TAU); ctx.fill();
      ctx.translate(p.x, p.y); ctx.scale(1 + sq, 1 - sq);
      ctx.fillStyle = "#C49A42"; ctx.lineWidth = Math.max(2, r * 0.1); ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#E3B64B"; ctx.beginPath(); ctx.arc(-r * 0.2, -r * 0.2, r * 0.62, 0, TAU); ctx.fill();
      ctx.fillStyle = "#FFF3C4"; star(ctx, -r * 0.1, -r * 0.1, r * 0.42, 5, 0.45, -Math.PI / 2 + OB.t * 0.5); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.6)"; ctx.beginPath(); ctx.ellipse(-r * 0.45, -r * 0.45, r * 0.14, r * 0.22, -0.6, 0, TAU); ctx.fill();
    },
    bar(I) {   // a painted scenery flat on a hub, turning; a faint ghost behind it shows which way it's going
      const E = barEnds(I), a = project(E.a.x, E.a.y, E.a.z), b = project(E.b.x, E.b.y, E.b.z), c = project(...I.at), w = Math.max(5, BAR_R * 2 * c.s);
      const G = barEnds(I, OB.t - 0.12 * Math.sign(I.spin)), ga = project(G.a.x, G.a.y, G.a.z), gb = project(G.b.x, G.b.y, G.b.z);
      ctx.strokeStyle = "rgba(242,231,201,.14)"; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(ga.x, ga.y); ctx.lineTo(gb.x, gb.y); ctx.stroke();
      for (const [col, k] of [[INK, 1.35], ["#8A5A36", 1], ["#A87444", 0.4]]) { ctx.strokeStyle = col; ctx.lineWidth = w * k; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
      ctx.strokeStyle = "rgba(20,12,6,.5)"; ctx.lineWidth = 1.2; for (const u of [0.2, 0.4, 0.6, 0.8]) { const x = a.x + (b.x - a.x) * u, y = a.y + (b.y - a.y) * u, nx = -(b.y - a.y), ny = b.x - a.x, L = Math.hypot(nx, ny) || 1; ctx.beginPath(); ctx.moveTo(x - nx / L * w * 0.5, y - ny / L * w * 0.5); ctx.lineTo(x + nx / L * w * 0.5, y + ny / L * w * 0.5); ctx.stroke(); }
      ctx.fillStyle = GOLD; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(c.x, c.y, w * 0.9, 0, TAU); ctx.fill(); ctx.stroke();
      const post = project(I.at[0], 0, I.at[2]); ctx.strokeStyle = "rgba(20,14,8,.6)"; ctx.lineWidth = Math.max(2, 0.05 * c.s); ctx.beginPath(); ctx.moveTo(c.x, c.y + w); ctx.lineTo(post.x, post.y); ctx.stroke();
    },
    spikes(I) {   // a hedge of thorns across the lane; it peeks, rumbling, before it comes up
      const r = spikesRaise(I), n = Math.round((I.span[1] - I.span[0]) / 0.22), tell = spikesTell(I);
      for (let i = 0; i <= n; i++) {
        const x = I.span[0] + (I.span[1] - I.span[0]) * (i / n) + (tell ? Math.sin(OB.t * 70 + i) * 0.01 : 0), h = I.h * r * (0.75 + 0.25 * Math.sin(i * 2.3)), base = project(x, 0, I.z), tip = project(x + Math.sin(i * 1.7) * 0.05, h, I.z), w = 0.1 * base.s;
        if (h < 0.02) { ctx.fillStyle = "rgba(20,30,16,.6)"; ctx.fillRect(base.x - w * 0.6, base.y - 2, w * 1.2, 3); continue; }
        ctx.fillStyle = "#2E3A22"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(base.x - w, base.y); ctx.lineTo(tip.x, tip.y); ctx.lineTo(base.x + w, base.y); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = "rgba(200,230,170,.3)"; ctx.beginPath(); ctx.moveTo(base.x - w * 0.4, base.y); ctx.lineTo(tip.x, tip.y); ctx.stroke(); ctx.strokeStyle = INK;
      }
      if (tell && Math.floor(OB.t * 8) % 2) { const p = project((I.span[0] + I.span[1]) / 2, 0.3, I.z); ctx.fillStyle = "rgba(242,231,201,.6)"; ctx.font = `800 ${Math.round(U * 0.03)}px ${UIFONT}`; ctx.textAlign = "center"; ctx.fillText("RUMBLE", p.x, p.y); }
    },
    cannon(I) {   // a black cannon on a bone carriage beside the lane, its fuse fizzing, and its ball in flight
      const base = project(I.side * 3.0, I.y, I.z), s = base.s, tl = cannonTell(I);
      const ground = project(I.side * 3.0, 0, I.z); ctx.strokeStyle = "#E4DAC4"; ctx.lineWidth = Math.max(3, 0.08 * s); ctx.beginPath(); ctx.moveTo(ground.x - 0.3 * s, ground.y); ctx.lineTo(base.x, base.y + 0.1 * s); ctx.lineTo(ground.x + 0.3 * s, ground.y); ctx.stroke();
      ctx.save(); ctx.translate(base.x, base.y); ctx.scale(-I.side, 1); ctx.fillStyle = "#1E2024"; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); rr(ctx, -0.45 * s, -0.16 * s, 0.7 * s, 0.32 * s, 0.14 * s); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0.25 * s, 0, 0.06 * s, 0.18 * s, 0, 0, TAU); ctx.fill(); ctx.stroke();
      if (tl > 0) { ctx.fillStyle = Math.floor(OB.t * 20) % 2 ? "#FFD04A" : "#E8893A"; star(ctx, -0.46 * s, -0.2 * s, 0.07 * s * (1 + tl), 6, 0.4, OB.t * 9); ctx.fill(); }
      ctx.restore();
      if (tl > 0) {   // a narrow screen can't see the cannon itself: the fuse's warning shows at the frame's edge, at its height
        const ex = I.side < 0 ? Math.max(U * 0.06, base.x) : Math.min(W - U * 0.06, base.x), blink = Math.floor(OB.t * 10) % 2;
        ctx.fillStyle = blink ? "#FFD04A" : "#E8893A"; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ex, base.y, U * 0.035 * (1 + tl * 0.4), 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = INK; ctx.font = `900 ${Math.round(U * 0.045)}px ${UIFONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("!", ex, base.y + 1);
      }
      for (const b of I.balls) { const q = ballAt(I, b), p = project(q.x, q.y, q.z), r = BALL_R * p.s; obShadow(q.x + shadowShift(q.y), q.z, BALL_R);
        ctx.fillStyle = "#18181C"; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill(); ctx.stroke(); ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.beginPath(); ctx.arc(p.x - r * 0.35, p.y - r * 0.35, r * 0.25, 0, TAU); ctx.fill();
        ctx.strokeStyle = "rgba(242,231,201,.3)"; ctx.lineWidth = 2; for (const k of [1, 2, 3]) { ctx.beginPath(); ctx.moveTo(p.x + I.side * r * (1 + k * 0.6), p.y - r * 0.4 + k * 3); ctx.lineTo(p.x + I.side * r * (1.6 + k * 0.9), p.y - r * 0.4 + k * 3); ctx.stroke(); } }
    },
    fan(I) {   // the hollow log at the upwind edge, and streaks of air running through its stream while it blows
      const [x0, x1, y0, y1, z0, z1] = I.box, on = fanOn(I), d = fanDir(I), dir = Math.sign(I.push[0] * d) || 1, sx = dir > 0 ? x0 : x1, zm = (z0 + z1) / 2;
      const lg = project(sx - dir * 0.15, y0 + 0.05, zm), s = lg.s;
      ctx.fillStyle = "#4A3A28"; ctx.lineWidth = 2; ctx.beginPath(); rr(ctx, lg.x - 0.35 * s, lg.y - 0.3 * s, 0.7 * s, 0.6 * s, 0.12 * s); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#140E08"; ctx.beginPath(); ctx.ellipse(lg.x + dir * 0.35 * s, lg.y, 0.1 * s, 0.26 * s, 0, 0, TAU); ctx.fill(); ctx.stroke();
      if (on <= 0.02) return;
      ctx.lineWidth = 2; const n = 9;
      for (let i = 0; i < n; i++) {
        const u = ((OB.t * 0.9 + i * 0.37) % 1), y = y0 + (y1 - y0) * ((i * 0.618) % 1), z = z0 + (z1 - z0) * ((i * 0.41) % 1), xa = sx + dir * (x1 - x0) * u, xb = xa + dir * 0.45, ya = y + I.push[1] * 0.05 * u;
        const a = project(xa, ya, z), b = project(xb, ya + I.push[1] * 0.02, z); ctx.strokeStyle = `rgba(230,245,235,${0.45 * on * Math.sin(u * Math.PI)})`; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
    },
    magnet(I) {   // a red horseshoe lodestone, its field pulsing out toward the lane
      const p = project(...I.at), s = p.s, side = I.at[0] < 0 ? 1 : -1;
      ctx.strokeStyle = "rgba(255,120,120,.25)"; ctx.lineWidth = 1.5;
      for (let k = 0; k < 3; k++) { const r = ((OB.t * 0.6 + k / 3) % 1) * I.R * s; ctx.globalAlpha = 1 - r / (I.R * s); ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.stroke(); } ctx.globalAlpha = 1;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(side * Math.PI / 2); const R = MAG_CORE * s * 1.2;
      for (const [col, w] of [[INK, 0.62], ["#C0392B", 0.42]]) { ctx.strokeStyle = col; ctx.lineWidth = R * w; ctx.beginPath(); ctx.arc(0, 0, R, Math.PI, 0); ctx.stroke(); }
      ctx.fillStyle = "#D8DCE2"; ctx.strokeStyle = INK; ctx.lineWidth = 2; for (const sd of [-1, 1]) { ctx.beginPath(); ctx.rect(sd * R - R * 0.21, 0, R * 0.42, R * 0.4); ctx.fill(); ctx.stroke(); }
      ctx.restore();
      const post = project(I.at[0], 0, I.at[2]); ctx.strokeStyle = "rgba(20,14,8,.6)"; ctx.lineWidth = Math.max(2, 0.05 * s); ctx.beginPath(); ctx.moveTo(p.x, p.y + MAG_CORE * s); ctx.lineTo(post.x, post.y); ctx.stroke();
    },
    crusher(I) {   // a great weight on chains: its shadow darkens and it shudders before it drops
      const [x0, x1, z0, z1] = I.box, B = crusherBottom(I), zm = (z0 + z1) / 2, tl = project(x0, B.y + CRUSHER_TALL, zm), br = project(x1, B.y, zm);
      const sh = project((x0 + x1) / 2, 0, zm), dark = 0.18 + 0.4 * clamp(1 - (B.y - I.low) / (I.top - I.low), 0, 1); ctx.fillStyle = `rgba(0,0,0,${dark})`; ctx.beginPath(); ctx.ellipse(sh.x, sh.y, (x1 - x0) * 0.6 * sh.s, 0.1 * sh.s, 0, 0, TAU); ctx.fill();
      for (const x of [x0 + 0.15, x1 - 0.15]) { const a = project(x, B.y + CRUSHER_TALL, zm), b = project(x, B.y + CRUSHER_TALL + 3, zm); ctx.strokeStyle = "#5A5E66"; ctx.lineWidth = 3; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.setLineDash([]); }
      ctx.fillStyle = "#4A4038"; ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.beginPath(); rr(ctx, tl.x, tl.y, br.x - tl.x, br.y - tl.y, 6); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = "rgba(242,231,201,.2)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(tl.x + 6, tl.y + 6); ctx.lineTo(tl.x + 6, br.y - 6); ctx.stroke();
      ctx.fillStyle = "#2A241E"; for (const u of [0.25, 0.75]) { ctx.beginPath(); ctx.arc(tl.x + (br.x - tl.x) * u, tl.y + (br.y - tl.y) * 0.2, 4, 0, TAU); ctx.fill(); }
      if (B.tell > 0 && Math.floor(OB.t * 12) % 2) { ctx.fillStyle = "rgba(242,231,201,.75)"; ctx.font = `800 ${Math.round(U * 0.032)}px ${UIFONT}`; ctx.textAlign = "center"; ctx.fillText("RUMBLE", (tl.x + br.x) / 2, br.y + U * 0.04); }
    },
    barrier(I) {   // a ghostly scrim across the lane, fading in and out; faces drift in it while it's solid
      const [x0, x1, y0, y1, z] = I.box, al = barrierAlpha(I); if (al < 0.03) { const a = project(x0, y0, z), b = project(x1, y0, z); ctx.strokeStyle = "rgba(190,240,220,.12)"; ctx.setLineDash([3, 6]); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.setLineDash([]); return; }
      const tl = project(x0, y1, z), br = project(x1, y0, z);
      ctx.globalAlpha = 0.55 * al; const g = ctx.createLinearGradient(0, tl.y, 0, br.y); g.addColorStop(0, "rgba(190,240,220,.15)"); g.addColorStop(1, "rgba(190,240,220,.5)"); ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(tl.x, tl.y); for (let i = 0; i <= 12; i++) { const u = i / 12; ctx.lineTo(tl.x + (br.x - tl.x) * u, tl.y + Math.sin(u * 10 + OB.t * 3) * 4); } ctx.lineTo(br.x, br.y); ctx.lineTo(tl.x, br.y); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 0.8 * al; ctx.strokeStyle = "rgba(220,255,240,.8)"; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = "rgba(20,40,34,.5)"; for (let i = 0; i < 3; i++) { const u = ((OB.t * 0.1 + i / 3) % 1), x = tl.x + (br.x - tl.x) * u, y = (tl.y + br.y) / 2 + Math.sin(OB.t + i) * 6; for (const sd of [-1, 1]) { ctx.beginPath(); ctx.ellipse(x + sd * 6, y, 2.5, 4, 0, 0, TAU); ctx.fill(); } ctx.beginPath(); ctx.ellipse(x, y + 9, 4, 3, 0, 0, TAU); ctx.fill(); }
      ctx.globalAlpha = 1;
    }
  };
