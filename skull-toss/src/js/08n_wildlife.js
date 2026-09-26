  // ───────────────────────── the wildlife (v58): each map's own creatures, on land and in the air ─────────────────────────
  // MAP → ECOSYSTEM → CAST (blueprint.json: ecosystem). The water's life is 08m_aquatic.js; this is the rest, dressed
  // from the map's ecosystem.wildlife: owls, deer, a fox and the forest's spirits in the Whistling Woods; vultures,
  // scorpions and tumbleweeds (and the heat haze) in the Bone Desert; wind-up clockwork bugs and glowing fungi in the
  // Clockwork Caves; things of the void and floating fragments of the seven worlds before in the Black Abyss. Nothing
  // here is ever hit, and nothing flies across the ring's cone. Quiet mostly: a turn of the head, a flicker, now and
  // then something crossing, and they react to Morty (an owl takes off, the deer bound away, a scorpion digs in, the
  // fungi flare). They drift and wander on the flow (06i_flow.js); the game never reads them.
  const WILD = { map: -1, E: null, list: [], lastD: 0, rnd: null, heat: false };
  const wildEco = () => (MAP_DATA[sceneMap] && MAP_DATA[sceneMap].ecosystem) || null;
  const WILD_FRAGS = ["pumpkin", "stone", "seat", "lily", "cactus", "gear", "reel", "angel"];   // (a piece of each world before)
  function wildSetup() {
    WILD.map = sceneMap; WILD.E = wildEco(); WILD.list = []; WILD.lastD = TRAVEL.D || 0;
    const E = WILD.E; WILD.heat = !!(E && E.heat); if (!E) return;
    const r = (WILD.rnd = mulberry32(8111 + sceneMap * 53));
    for (const [kind, n] of Object.entries(E.wildlife || {})) for (let i = 0; i < Math.round(n * (QUALITY.level < 0.75 ? 0.6 : 1)); i++) WILD.list.push(wildSpawn(kind, r, true, i));
  }
  function wildSpawn(kind, r, first, i = 0) {
    const side = r() < 0.5 ? -1 : 1, z = first ? 5 + r() * 30 : 30 + r() * 8;
    const c = { kind, x: side * (3 + r() * 8), y: 0, z, ph: r() * TAU, seed: r() * 100, st: "idle", t: 2 + r() * 6, dir: -side, s: 1, a: 1 };
    switch (kind) {
      case "owl": c.x = side * (3.6 + r() * 6); c.y = 2.2 + r() * 1.2; c.z = first ? 7 + r() * 24 : 26 + r() * 8; c.look = 0; break;
      case "deer": c.x = side * (6 + r() * 9); c.z = first ? 16 + r() * 20 : 30 + r() * 8; c.st = "graze"; break;
      case "fox": c.z = 9 + r() * 12; c.x = side * 12; c.st = first ? "away" : "trot"; c.t = first ? 3 + r() * 10 : 0; break;
      case "spirit": c.y = 0.8 + r() * 2.2; c.x = side * (2.6 + r() * 6); break;
      case "vulture": c.cx = side * (4 + r() * 8); c.cz = 14 + r() * 16; c.rad = 2.5 + r() * 3; c.y = 7 + r() * 3; c.ang = r() * TAU; c.v = (r() < 0.5 ? -1 : 1) * (0.25 + r() * 0.15); break;
      case "scorpion": c.x = (r() * 2 - 1) * 6; c.hide = 0; c.st = "walk"; break;
      case "tumbleweed": c.x = -Math.sign(windNow() || side) * 14; c.z = 8 + r() * 22; c.rot = 0; c.st = first && i % 2 ? "away" : "roll"; c.t = first ? r() * 12 : 0; c.vy = 0; break;
      case "clockbug": c.x = (r() * 2 - 1) * 6; c.wind = 1; break;
      case "fungi": c.x = side * (2.6 + r() * 5); c.flare = 0; break;
      case "voidling": c.x = side * (4 + r() * 9); c.z = first ? 12 + r() * 24 : 30 + r() * 8; c.y = r() * 2; c.a = 0; break;
      case "fragment": c.frag = WILD_FRAGS[(r() * WILD_FRAGS.length) | 0]; c.x = side * (3 + c.z * 0.16 + r() * 10); c.y = 2.2 + r() * 5; c.rot = r() * TAU; c.spin = (r() - 0.5) * 0.4; break;
    }
    return c;
  }
  function wildThreat(c) {
    if (TRAVEL.v > 0.6 && c.z < 14) return 1;
    const s = skull.pos; return game.state === "flying" && skull.alpha > 0 && Math.hypot(s.x - c.x, s.z - c.z) < 3 ? 1 : 0;
  }
  function updateWildlife(dt) {
    if (WILD.map !== sceneMap) wildSetup();
    if (!WILD.E || dt <= 0) return;
    const t = world.t, r = WILD.rnd, dD = (TRAVEL.D || 0) - WILD.lastD; WILD.lastD = TRAVEL.D || 0;
    if (Math.abs(dD) > 12 || dD < -0.01) { const m = WILD.map; WILD.map = -1; wildSetup(); WILD.map = m; return; }
    const still = reduceMotion ? 0.4 : 1; dt *= still;
    for (let i = 0; i < WILD.list.length; i++) {
      const c = WILD.list[i]; c.z -= dD; if (c.cz != null) c.cz -= dD; c.t -= dt; c.ph += dt;
      if ((c.cz != null ? c.cz : c.z) < (c.kind === "tumbleweed" ? 6.5 : 2) || c.gone) { WILD.list[i] = wildSpawn(c.kind, r, false); continue; }   // (a tumbleweed never rolls right under the camera)
      const th = wildThreat(c), W = wander(c.seed, t, 0.4);
      switch (c.kind) {
        case "owl":   // turns its head after the skull, blinks, and takes off when Morty comes close
          c.look += ((game.state === "flying" ? clamp((skull.pos.x - c.x) * 0.4, -1, 1) : Math.sin(t * 0.3 + c.seed)) - c.look) * (1 - Math.exp(-dt * 3));
          if (th && c.st === "idle") { c.st = "fly"; c.vx = Math.sign(c.x) * 2.2; }
          if (c.st === "fly") { c.x += c.vx * dt; c.y += 0.8 * dt; if (Math.abs(c.x) > 18) c.gone = true; }
          break;
        case "deer":   // grazes; its head comes up; if Morty keeps coming, it bounds off
          if (th && c.st !== "flee") { c.st = c.st === "alert" && c.t < 0 ? "flee" : "alert"; if (c.st === "alert" && c.t < -1) c.t = 0.8; }
          else if (!th && c.st === "alert" && c.t < -2) c.st = "graze";
          if (c.st === "flee") { c.x += Math.sign(c.x) * 4 * dt; c.y = Math.abs(Math.sin(c.ph * 5)) * 0.5; if (Math.abs(c.x) > 22) c.gone = true; }
          break;
        case "fox":   // trots across now and then, stops to look, trots on
          if (c.st === "away") { if (c.t < 0) { c.st = "trot"; c.x = -c.dir * 12; } break; }
          if (c.st === "sit") { if (c.t < 0 || th) c.st = "trot"; break; }
          c.x += c.dir * (th ? 3 : 1.1) * dt; if (!th && Math.abs(c.x) < 6 && Math.abs(c.x) > 4 && c.t < -4) { c.st = "sit"; c.t = 1.5 + r() * 2; }
          if (Math.abs(c.x) > 13 && Math.sign(c.x) === c.dir) { c.st = "away"; c.t = 10 + r() * 20; c.dir = -c.dir; }
          break;
        case "spirit": {   // wanders on the flow, keeping out of the ring's cone; draws near the skull a little, curious
          c.x += W.x * 0.35 * dt; c.y += W.y * 0.2 * dt; c.z += (W.x - W.y) * 0.15 * dt; c.y = clamp(c.y, 0.5, 3.4);
          if (Math.abs(c.x) < 2.4 + c.z * 0.14) c.x = Math.sign(c.x || 1) * (2.45 + c.z * 0.14); if (Math.abs(c.x) > 12) c.x -= Math.sign(c.x) * dt;
          break;
        }
        case "vulture": c.ang += c.v * dt; c.x = c.cx + Math.cos(c.ang) * c.rad; c.z = c.cz + Math.sin(c.ang) * c.rad * 0.6; break;
        case "scorpion":
          if (th && c.st !== "hide") { c.st = "hide"; c.t = 2.5 + r() * 3; }
          if (c.st === "hide") { c.hide = Math.min(1, c.hide + dt * 3); if (c.t < 0 && !th) c.st = "walk"; }
          else { c.hide = Math.max(0, c.hide - dt); if (c.t < 0) { c.st = c.st === "walk" ? "rest" : "walk"; c.t = 1 + r() * 3; c.dir = r() < 0.5 ? -1 : 1; } if (c.st === "walk") c.x += c.dir * 0.3 * dt; }
          break;
        case "tumbleweed": {   // rolls across on the wind, bouncing
          if (c.st === "away") { if (c.t < 0) { c.st = "roll"; c.x = -Math.sign(windNow() || 1) * 14; } break; }
          const v = 1.6 + Math.abs(windNow()) * 1.2, d = Math.sign(windNow() || 1); c.x += d * v * dt; c.rot += d * v * dt / 0.35;
          c.vy -= 9.8 * dt; c.y += c.vy * dt; if (c.y < 0) { c.y = 0; c.vy = 1 + r() * 1.6; }
          if (Math.abs(c.x) > 15) { c.st = "away"; c.t = 6 + r() * 14; }
          break;
        }
        case "clockbug":   // skitters while it's wound, runs down, winds itself up again
          if (c.st === "idle") { c.wind -= dt * 0.25; c.x += c.dir * 0.5 * dt * c.wind; if (c.wind <= 0) { c.st = "wind"; c.t = 1.5; } if (th) c.dir = Math.sign(c.x || 1); }
          else if (c.t < 0) { c.st = "idle"; c.wind = 1; c.dir = r() < 0.5 ? -1 : 1; }
          break;
        case "fungi": c.flare = Math.max(th ? 1 : 0, c.flare - dt * 0.6); break;
        case "voidling": {   // fades in far off, watches, fades out
          if (c.st === "idle" && c.t < 0) { c.st = "show"; c.t = 3 + r() * 4; }
          if (c.st === "show") { c.a = Math.min(1, c.a + dt * 0.8); if (c.t < 0 || th) { c.st = "hide"; } }
          if (c.st === "hide") { c.a = Math.max(0, c.a - dt * 1.2); if (c.a === 0) { c.st = "idle"; c.t = 4 + r() * 8; c.x = Math.sign(c.x) * (4 + r() * 9); } }
          break;
        }
        case "fragment": { const F = curl(c.seed, t * 0.1, t * 0.05, 1.5, 1); c.x += F.x * 0.08 * dt; c.y += F.y * 0.06 * dt; c.rot += c.spin * dt; if (Math.abs(c.x) < 2.6 + c.z * 0.16) c.x = Math.sign(c.x || 1) * (2.65 + c.z * 0.16); break; }   // (never behind the ring, whatever its height)
      }
    }
  }
  const wildWorldList = () => (WILD.E ? WILD.list.filter(c => c.z > 1.5 && c.z < 44 && c.st !== "away") : []);
  const wHaze = z => clamp(1 - (z - 8) / 40, 0.35, 1);
  function drawWild(c) {
    const Ld = c.y < 0.3 ? landAt(c.x, c.z) : { dx: 0, y: 0 }, p = project(c.x + Ld.dx, c.y + Ld.y, c.z), s = p.s; if (p.x < -s * 3 || p.x > W + s * 3) return;
    const t = world.t, ink = `rgba(18,14,12,${clamp(1.1 - c.z / 36, 0.25, 0.95)})`;
    ctx.save(); ctx.translate(p.x, p.y); ctx.globalAlpha *= wHaze(c.z); ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.strokeStyle = ink; ctx.lineWidth = Math.max(0.8, s * 0.018);
    switch (c.kind) {
      case "owl": {
        const L = s * 0.32, blink = Math.sin(t * 0.7 + c.seed) > 0.97;
        if (c.st === "fly") { const f = Math.sin(t * 14) * 0.6; ctx.fillStyle = "#6A5238"; ctx.beginPath(); ctx.ellipse(0, 0, L * 0.35, L * 0.25, 0, 0, TAU); ctx.fill(); ctx.stroke(); for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sd * L * 0.2, 0); ctx.quadraticCurveTo(sd * L * 0.7, -L * (0.4 + f * sd * 0.3), sd * L * 1.1, -L * f * 0.4); ctx.quadraticCurveTo(sd * L * 0.6, L * 0.05, sd * L * 0.2, L * 0.1); ctx.fill(); ctx.stroke(); } break; }
        ctx.strokeStyle = "#3A2A1C"; ctx.lineWidth = Math.max(1.5, L * 0.12); ctx.beginPath(); ctx.moveTo(-Math.sign(c.x) * L * 1.8, L * 0.55); ctx.lineTo(Math.sign(c.x) * L * 0.5, L * 0.5); ctx.stroke(); ctx.strokeStyle = ink; ctx.lineWidth = Math.max(0.8, s * 0.018);   // its branch
        ctx.fillStyle = "#7A6048"; ctx.beginPath(); ctx.ellipse(0, 0, L * 0.4, L * 0.55, 0, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#C8B08A"; ctx.beginPath(); ctx.ellipse(0, L * 0.12, L * 0.24, L * 0.34, 0, 0, TAU); ctx.fill();
        ctx.save(); ctx.translate(c.look * L * 0.12, -L * 0.5); ctx.fillStyle = "#7A6048"; ctx.beginPath(); ctx.ellipse(0, 0, L * 0.36, L * 0.3, 0, 0, TAU); ctx.fill(); ctx.stroke();
        for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sd * L * 0.2, -L * 0.2); ctx.lineTo(sd * L * 0.3, -L * 0.42); ctx.lineTo(sd * L * 0.08, -L * 0.25); ctx.fill(); ctx.stroke();
          ctx.fillStyle = blink ? "#7A6048" : "#F2D048"; ctx.beginPath(); ctx.arc(sd * L * 0.15, -L * 0.02, L * 0.11, 0, TAU); ctx.fill(); ctx.stroke(); if (!blink) { ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(sd * L * 0.15 + c.look * L * 0.03, -L * 0.02, L * 0.05, 0, TAU); ctx.fill(); } ctx.fillStyle = "#7A6048"; }
        ctx.fillStyle = "#D8A040"; ctx.beginPath(); ctx.moveTo(-L * 0.05, L * 0.08); ctx.lineTo(L * 0.05, L * 0.08); ctx.lineTo(0, L * 0.18); ctx.closePath(); ctx.fill(); ctx.restore();
        break;
      }
      case "deer": {
        const L = s * 1.1, head = c.st === "graze" ? 0.15 + Math.sin(c.ph * 0.5) * 0.05 : -0.35, d = c.st === "flee" ? Math.sign(c.x) : c.dir;
        ctx.scale(d, 1); ctx.fillStyle = "#8A5A36"; ctx.lineWidth = Math.max(0.8, L * 0.02);
        const leg = c.st === "flee" ? Math.sin(c.ph * 10) * 0.2 : 0;
        for (const [lx, a] of [[-0.35, leg], [-0.25, -leg], [0.25, -leg], [0.35, leg]]) { ctx.beginPath(); ctx.moveTo(lx * L, -L * 0.55); ctx.lineTo(lx * L + a * L, 0); ctx.stroke(); }
        ctx.beginPath(); ctx.ellipse(0, -L * 0.62, L * 0.45, L * 0.17, 0, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(L * 0.35, -L * 0.7); ctx.lineTo(L * 0.52, -L * (0.95 - head)); ctx.lineTo(L * 0.6, -L * (0.88 - head)); ctx.lineTo(L * 0.44, -L * 0.6); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(L * 0.62, -L * (0.93 - head), L * 0.12, L * 0.07, 0.4, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = "#C8B090"; for (const sd of [-0.04, 0.04]) { ctx.beginPath(); ctx.moveTo(L * (0.58 + sd), -L * (1.0 - head)); ctx.lineTo(L * (0.52 + sd * 3), -L * (1.22 - head)); ctx.lineTo(L * (0.46 + sd * 3), -L * (1.3 - head)); ctx.moveTo(L * (0.53 + sd * 3), -L * (1.16 - head)); ctx.lineTo(L * (0.62 + sd * 3), -L * (1.24 - head)); ctx.stroke(); }
        ctx.fillStyle = "#F2EAD8"; ctx.beginPath(); ctx.ellipse(-L * 0.46, -L * 0.66, L * 0.06, L * 0.08, 0, 0, TAU); ctx.fill();
        break;
      }
      case "fox": {
        const L = s * 0.55, sit = c.st === "sit", leg = sit ? 0 : Math.sin(c.ph * 12) * 0.18; ctx.scale(c.dir, 1); ctx.fillStyle = "#C8642A"; ctx.lineWidth = Math.max(0.8, L * 0.03);
        ctx.beginPath(); ctx.moveTo(-L * 0.4, -L * 0.35); ctx.quadraticCurveTo(-L * 0.9, -L * 0.5 + Math.sin(t * 3) * L * 0.05, -L * 1.0, -L * 0.2); ctx.quadraticCurveTo(-L * 0.7, -L * 0.2, -L * 0.4, -L * 0.25); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#F2EAD8"; ctx.beginPath(); ctx.arc(-L * 0.98, -L * 0.24, L * 0.07, 0, TAU); ctx.fill(); ctx.fillStyle = "#C8642A";
        if (!sit) for (const [lx, a] of [[-0.3, leg], [0.25, -leg]]) { ctx.beginPath(); ctx.moveTo(lx * L, -L * 0.3); ctx.lineTo(lx * L + a * L, 0); ctx.stroke(); }
        ctx.beginPath(); ctx.ellipse(0, -L * (sit ? 0.3 : 0.38), L * 0.42, L * 0.16, sit ? -0.5 : 0, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(L * 0.3, -L * 0.5); ctx.lineTo(L * 0.62, -L * 0.52); ctx.lineTo(L * 0.4, -L * 0.36); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(L * 0.34, -L * 0.52); ctx.lineTo(L * 0.4, -L * 0.72); ctx.lineTo(L * 0.46, -L * 0.52); ctx.fill(); ctx.stroke();
        ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(L * 0.46, -L * 0.48, L * 0.025, 0, TAU); ctx.fill();
        break;
      }
      case "spirit": {   // a little lantern-light with a face and a trailing tail
        const L = s * 0.18, fl = 0.7 + 0.3 * Math.sin(t * 5 + c.seed);
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, L * 2.2); g.addColorStop(0, `rgba(200,255,220,${0.5 * fl})`); g.addColorStop(1, "rgba(200,255,220,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, L * 2.2, 0, TAU); ctx.fill();
        ctx.fillStyle = `rgba(230,255,235,${0.85 * fl})`; ctx.beginPath(); ctx.moveTo(-L * 0.5, 0); ctx.quadraticCurveTo(-L * 0.4, -L * 0.8, 0, -L * 0.8); ctx.quadraticCurveTo(L * 0.4, -L * 0.8, L * 0.5, 0); ctx.quadraticCurveTo(L * 0.2, L * 0.6 + Math.sin(t * 4) * L * 0.3, -L * 0.1, L * 1.3); ctx.quadraticCurveTo(-L * 0.2, L * 0.4, -L * 0.5, 0); ctx.fill();
        ctx.fillStyle = "rgba(40,70,60,.8)"; ctx.beginPath(); ctx.arc(-L * 0.15, -L * 0.3, L * 0.07, 0, TAU); ctx.arc(L * 0.15, -L * 0.3, L * 0.07, 0, TAU); ctx.fill();
        if (QUALITY.level >= 0.75) gpuLight(p.x + camBase.x, p.y + camBase.y, L * 5, "200,255,220", 0.1 * fl);
        break;
      }
      case "vulture": {
        const L = s * 0.9, f = Math.sin(t * 1.2 + c.seed) * 0.15, d = Math.sign(-Math.sin(c.ang) * c.v) || 1; ctx.scale(d, 1); ctx.fillStyle = "#2A2020";
        ctx.beginPath(); ctx.moveTo(-L, -L * (0.1 + f)); ctx.quadraticCurveTo(-L * 0.5, -L * 0.25, 0, 0); ctx.quadraticCurveTo(L * 0.5, -L * 0.25, L, -L * (0.1 - f)); ctx.quadraticCurveTo(L * 0.5, L * 0.04, 0, L * 0.12); ctx.quadraticCurveTo(-L * 0.5, L * 0.04, -L, -L * (0.1 + f)); ctx.fill();
        for (let i = 0; i < 4; i++) { const x = L * (0.72 + i * 0.07); ctx.beginPath(); ctx.moveTo(x, -L * 0.1); ctx.lineTo(x + L * 0.05, -L * 0.04); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-x, -L * 0.1); ctx.lineTo(-x - L * 0.05, -L * 0.04); ctx.stroke(); }
        ctx.fillStyle = "#C8906A"; ctx.beginPath(); ctx.arc(L * 0.1, -L * 0.05, L * 0.06, 0, TAU); ctx.fill();
        break;
      }
      case "scorpion": {
        const L = s * 0.3 * (1 - c.hide * 0.7); if (L < 1) break; ctx.translate(0, c.hide * L * 0.4); ctx.scale(c.dir, 1); ctx.fillStyle = "#6A3A1C"; ctx.lineWidth = Math.max(0.8, L * 0.05);
        const step = c.st === "walk" ? Math.sin(t * 16) * 0.08 : 0;
        for (let i = 0; i < 4; i++) for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(L * (0.1 * i - 0.15), -L * 0.1); ctx.lineTo(L * (0.1 * i - 0.2) , L * (sd > 0 ? 0 : -0.02) + (i % 2 ? step : -step) * L); ctx.stroke(); }
        ctx.beginPath(); ctx.ellipse(0, -L * 0.12, L * 0.3, L * 0.12, 0, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-L * 0.28, -L * 0.15); for (let i = 1; i <= 5; i++) { const a = -Math.PI * 0.2 - (i / 5) * Math.PI * 0.9; ctx.lineTo(-L * 0.35 + Math.cos(a) * L * 0.4, -L * 0.4 + Math.sin(a) * L * 0.35 + (1 - i / 5) * L * 0.2); } ctx.lineWidth = L * 0.09; ctx.stroke();
        ctx.fillStyle = "#E8C040"; ctx.beginPath(); ctx.arc(-L * 0.3, -L * 0.8, L * 0.06, 0, TAU); ctx.fill();
        ctx.fillStyle = "#6A3A1C"; ctx.lineWidth = Math.max(0.8, L * 0.05); for (const sd of [-1, 1]) { ctx.beginPath(); ctx.ellipse(L * 0.42, -L * 0.1 + sd * L * 0.1, L * 0.12, L * 0.06, sd * 0.4, 0, TAU); ctx.fill(); ctx.stroke(); }
        break;
      }
      case "tumbleweed": {
        const R = s * 0.35; ctx.translate(0, -R); ctx.rotate(c.rot); ctx.strokeStyle = "#8A6A3A"; ctx.lineWidth = Math.max(0.7, R * 0.06);
        for (let i = 0; i < 9; i++) { const a = i * 0.7; ctx.beginPath(); ctx.ellipse(0, 0, R * (0.6 + (i % 3) * 0.15), R * (0.3 + (i % 2) * 0.25), a, 0, TAU); ctx.stroke(); }
        ctx.strokeStyle = ink; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.stroke();
        break;
      }
      case "clockbug": {
        const L = s * 0.2, run = c.st === "idle" ? Math.sin(t * 20) * 0.06 : 0; ctx.scale(c.dir, 1); ctx.fillStyle = "#B8862A"; ctx.lineWidth = Math.max(0.8, L * 0.06);
        for (let i = 0; i < 3; i++) for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(L * (i - 1) * 0.2, -L * 0.2); ctx.lineTo(L * ((i - 1) * 0.25 + run * sd), L * 0.02); ctx.stroke(); }
        ctx.beginPath(); ctx.ellipse(0, -L * 0.3, L * 0.4, L * 0.25, 0, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#6A4A1A"; for (const x of [-0.18, 0, 0.18]) { ctx.beginPath(); ctx.arc(x * L, -L * 0.38, L * 0.04, 0, TAU); ctx.fill(); }
        ctx.fillStyle = "#8A8A8A"; ctx.beginPath(); ctx.arc(L * 0.42, -L * 0.28, L * 0.1, 0, TAU); ctx.fill(); ctx.stroke(); ctx.fillStyle = "#F2EAD8"; ctx.beginPath(); ctx.arc(L * 0.45, -L * 0.3, L * 0.04, 0, TAU); ctx.fill();
        const k = c.st === "wind" ? t * 12 : t * 2 * c.wind; ctx.save(); ctx.translate(-L * 0.05, -L * 0.55); ctx.scale(Math.cos(k), 1); ctx.fillStyle = "#C8C8C0"; ctx.beginPath(); ctx.ellipse(-L * 0.12, -L * 0.1, L * 0.1, L * 0.07, 0, 0, TAU); ctx.ellipse(L * 0.12, -L * 0.1, L * 0.1, L * 0.07, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore();
        break;
      }
      case "fungi": {   // a glowing cluster that brightens when Morty passes
        const L = s * 0.25, pulse = 0.6 + 0.4 * Math.sin(t * 1.3 + c.seed) + c.flare * 0.8;
        const g = ctx.createRadialGradient(0, -L * 0.4, 0, 0, -L * 0.4, L * 2); g.addColorStop(0, `rgba(120,255,220,${0.28 * pulse})`); g.addColorStop(1, "rgba(120,255,220,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, -L * 0.4, L * 2, 0, TAU); ctx.fill();
        for (const [x, h, r] of [[-0.3, 0.6, 0.2], [0.05, 0.9, 0.28], [0.3, 0.45, 0.16]]) { ctx.fillStyle = "#D8E8D0"; ctx.fillRect(x * L - L * 0.03, -h * L, L * 0.06, h * L); ctx.fillStyle = `rgba(${120 + 60 * pulse},255,${210 + 20 * pulse},.95)`; ctx.beginPath(); ctx.ellipse(x * L, -h * L, r * L, r * L * 0.55, 0, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); }
        if (QUALITY.level >= 0.75) gpuLight(p.x + camBase.x, p.y - L * 0.4 + camBase.y, L * 3, "120,255,220", 0.08 * pulse);
        break;
      }
      case "voidling": {   // a shape of the dark, two eyes, tendrils that never quite settle
        if (c.a < 0.02) break; const L = s * 0.9; ctx.globalAlpha *= c.a;
        ctx.fillStyle = "rgba(8,4,16,.9)"; ctx.beginPath(); ctx.moveTo(-L * 0.4, 0); for (let i = 0; i <= 10; i++) { const u = i / 10, a = Math.PI + u * Math.PI; ctx.lineTo(Math.cos(a) * L * (0.4 + 0.06 * Math.sin(t * 3 + i)), -L * 0.6 + Math.sin(a) * L * 0.6); } ctx.lineTo(L * 0.4, 0); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = "rgba(8,4,16,.8)"; ctx.lineWidth = L * 0.05; for (let i = 0; i < 5; i++) { const x = (i - 2) * L * 0.18; ctx.beginPath(); ctx.moveTo(x, -L * 0.05); ctx.quadraticCurveTo(x + Math.sin(t * 2 + i) * L * 0.2, L * 0.15, x + Math.sin(t * 1.3 + i * 2) * L * 0.3, L * 0.3); ctx.stroke(); }
        const blink = Math.sin(t * 0.9 + c.seed) > 0.95; ctx.fillStyle = "#C8A0FF"; if (!blink) for (const sd of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sd * L * 0.13, -L * 0.62, L * 0.06, L * 0.03, 0, 0, TAU); ctx.fill(); }
        break;
      }
      case "fragment": drawFragment(c, s); break;
    }
    ctx.restore();
  }
  // a floating piece of a world Morty has come through: a pumpkin, a headstone, a theatre seat, a lily pad, a cactus,
  // a gear, a film reel, an angel's wing, turning slowly in the void, edged in its violet light
  function drawFragment(c, s) {
    const L = s * 0.5; ctx.rotate(c.rot); ctx.lineWidth = Math.max(0.8, L * 0.04); ctx.strokeStyle = "rgba(170,130,255,.8)";
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, L * 1.3); g.addColorStop(0, "rgba(150,110,255,.15)"); g.addColorStop(1, "rgba(150,110,255,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, L * 1.3, 0, TAU); ctx.fill();
    switch (c.frag) {
      case "pumpkin": ctx.fillStyle = "#D9692A"; for (const dx of [-0.2, 0.2, 0]) { ctx.beginPath(); ctx.ellipse(dx * L, 0, L * 0.26, L * 0.32, 0, 0, TAU); ctx.fill(); ctx.stroke(); } ctx.fillStyle = "#3A5A22"; ctx.fillRect(-L * 0.04, -L * 0.45, L * 0.08, L * 0.14); break;
      case "stone": ctx.fillStyle = "#7A7680"; ctx.beginPath(); ctx.moveTo(-L * 0.3, L * 0.45); ctx.lineTo(-L * 0.3, -L * 0.2); ctx.quadraticCurveTo(0, -L * 0.55, L * 0.3, -L * 0.2); ctx.lineTo(L * 0.25, L * 0.25); ctx.lineTo(L * 0.3, L * 0.45); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = "rgba(20,16,24,.5)"; ctx.fillRect(-L * 0.12, -L * 0.1, L * 0.24, L * 0.04); break;
      case "seat": ctx.fillStyle = "#8A2A34"; ctx.beginPath(); ctx.rect(-L * 0.35, -L * 0.4, L * 0.7, L * 0.45); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.rect(-L * 0.4, L * 0.05, L * 0.8, L * 0.18); ctx.fill(); ctx.stroke(); break;
      case "lily": ctx.fillStyle = "#4A7A3A"; ctx.beginPath(); ctx.ellipse(0, 0, L * 0.45, L * 0.2, 0, 0.3, TAU - 0.1); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = "#E890B0"; ctx.beginPath(); ctx.arc(L * 0.1, -L * 0.1, L * 0.09, 0, TAU); ctx.fill(); break;
      case "cactus": ctx.fillStyle = "#5A8A4A"; ctx.beginPath(); ctx.rect(-L * 0.1, -L * 0.5, L * 0.2, L * 0.95); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.rect(L * 0.1, -L * 0.2, L * 0.2, L * 0.1); ctx.rect(L * 0.2, -L * 0.4, L * 0.1, L * 0.25); ctx.fill(); ctx.stroke(); break;
      case "gear": ctx.fillStyle = "#B8862A"; ctx.beginPath(); for (let i = 0; i < 20; i++) { const a = (i / 20) * TAU, r = i % 2 ? L * 0.34 : L * 0.42; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = "#1A1020"; ctx.beginPath(); ctx.arc(0, 0, L * 0.12, 0, TAU); ctx.fill(); break;
      case "reel": ctx.fillStyle = "#3A3A40"; ctx.beginPath(); ctx.arc(0, 0, L * 0.4, 0, TAU); ctx.fill(); ctx.stroke(); ctx.fillStyle = "#1A1020"; for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU; ctx.beginPath(); ctx.arc(Math.cos(a) * L * 0.22, Math.sin(a) * L * 0.22, L * 0.08, 0, TAU); ctx.fill(); } break;
      default: ctx.fillStyle = "#C8B48A"; ctx.beginPath(); ctx.moveTo(0, L * 0.4); ctx.quadraticCurveTo(L * 0.5, -L * 0.1, L * 0.2, -L * 0.5); ctx.quadraticCurveTo(0, -L * 0.1, -L * 0.1, L * 0.4); ctx.closePath(); ctx.fill(); ctx.stroke();   // an angel's wing
    }
  }
  // the desert's heat haze: the band above the horizon wavers (a copy of the frame, strip by strip, nudged sideways)
  function drawHeatHaze() {
    if (!WILD.heat || QUALITY.level < 0.75 || reduceMotion || game.state === "title") return;
    const t = world.t, band = U * 0.08, y0 = Math.max(0, HY + camBase.y - band * 0.8), n = 10, h = band / n;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 0.55;
    for (let i = 0; i < n; i++) { const y = (y0 + i * h) * DPR, dx = Math.sin(t * 3.1 + i * 1.7) * 1.6 * DPR * (1 - Math.abs(i - n / 2) / n); ctx.drawImage(cvs, 0, y, cvs.width, h * DPR + 1, dx, y, cvs.width, h * DPR + 1); }
    ctx.restore();
  }
