  // ───────────────────────── how a boss goes down (v51) ─────────────────────────
  // Every boss's defeat is a short cartoon of its own, on one timeline:
  //   the final hit → hit-stop and a white flash (the director's K.O. impact) → an accent pulse or two (the boss's
  //   colour: escalation, not damage) → REALIZATION (it freezes, stiff, for a beat) → ANTICIPATION (the pose that
  //   says what's coming) → its SIGNATURE defeat (one of ten archetypes) with debris in its own material and a knock
  //   to the world around it → the WORDMARK (its own word, stamped and squashed) → a FINAL GAG a beat after it seems
  //   over → the reward. Minis run about 1.2 s; end bosses about 2 s. The boss's own fall is held still (its X eyes
  //   stay) while this plays it; the timings, the words and the gags are data.
  const DEATH = {
    //            archetype      material   gag        word          accent
    crow:         ["spinout",   "feather", "crown",   "PLUCKED!",   "#E3B64B"],
    pumpkin:      ["shatter",   "pumpkin", "stem",    "SMASHED!",   "#E8893A"],
    batbaron:     ["launch",    "cloth",   "tophat",  "BONKED!",    "#B48CFF"],
    undertaker:   ["dropout",   "stone",   "shovel",  "BURIED!",    "#8E949F"],
    scarecrow:    ["collapse",  "straw",   "hat",     "STUFFED!",   "#E3B64B"],
    marrowroot:   ["accordion", "wood",    "leaf",    "TIMBER!",    "#7F9447"],
    owl:          ["spinout",   "feather", "dizzy",   "HOO-KAY!",   "#E4DAC4"],
    gator:        ["cinematic", "water",   "bubble",  "SUNK!",      "#4A9A7A"],
    madame:       ["smoke",     "ink",     "hat",     "POOF!",      "#9A6AC8"],
    jester:       ["launch",    "confetti","bell",    "BOING!",     "#E8505B"],
    ringmaster:   ["target",    "confetti","tophat",  "CURTAINS!",  "#E8505B"],
    cuckoo:       ["accordion", "metal",   "spring",  "CUCKOO!",    "#E3B64B"],
    clockking:    ["shatter",   "metal",   "gear",    "CRACKED!",   "#C49A42"],
    projectionist:["collapse",  "metal",   "reel",    "CUT!",       "#8A8E96"],
    count:        ["smoke",     "bats",    "fang",    "STAKED!",    "#C0392B"],
    reaper:       ["cinematic", "ink",     "scythe",  "REAPED!",    "#B48CFF"]
  };
  const DEATH_T = { real: 0.1, anti: 0.24, sig: 1.1, gag: 1.25, gagEnd: 2.4 };   // seconds from the hit (a mini's signature is a touch quicker)
  const MATERIAL = {   // debris: particle kind, colours
    feather: ["feather", ["#2B2B33", "#3C3A4C"]], pumpkin: ["chunk", ["#E8893A", "#C8642A", "#F5C84A"]], cloth: ["scrap", ["#4A3A5A", "#1A1A1E"]],
    stone: ["chunk", ["#8E949F", "#6A707A"]], straw: ["scrap", ["#E3B64B", "#C8A04A"]], wood: ["chunk", ["#6B4526", "#8A5A30"]], water: ["bubble", ["#BFE3DA"]],
    ink: ["puff", ["#1A1520", "#3A2A4A"]], confetti: ["confetti", ["#E8505B", "#F5D84A", "#4A8FD8", "#5BB86A"]], metal: ["spark", ["#FFE36A", "#F2E7C9"]], bats: ["bat", ["#2A2230"]]
  };
  const DEATH_FX = { flash: 0, col: "#FFFFFF" };   // the accent pulse over the frame
  function deathPivot(B) {
    const F = B.frozen || { x: ring.x, y: ring.y, z: ring.z };
    if (B.kind === "crow") return project(F.x, F.y + CROW_HANG, F.z);
    if (B.kind === "pumpkin") return project(F.x, F.y + PK_HEAD.dy, F.z + PK_HEAD.dz);
    if (B.def && B.def.body) { const P = bossBody(B); return project(P.x, P.y + 1.2, P.z); }
    if (B.def && B.def.hang) return project(F.x, F.y + B.def.hang, F.z);
    return project(F.x, F.y + 0.6, F.z);
  }
  function deathBegin(B, at) {
    const D = DEATH[B.kind] || ["collapse", "ink", "dizzy", "BONKED!", "#FFFFFF"], mini = !B.end, p = deathPivot(B);
    B.death = { arch: D[0], mat: D[1], gag: D[2], word: D[3], accent: D[4], t0: B.t, px: p.x, py: p.y, s: p.s, mini, played: {}, bits: [] };
    const draw0 = B.draw;
    B.draw = front => {
      const X = B.death; if (!X) return draw0(front);
      const u = (B.t - X.t0) * (X.mini ? 1.15 : 1);
      B.deadAt = B.t;   // (its own fall held still: the archetype moves it now)
      if (u > DEATH_T.gagEnd + 0.4 || X.gone && u > X.gone) return;
      ctx.save(); const a = deathXform(X, u); if (a > 0.01) { ctx.globalAlpha *= a; if (X.arch === "shatter" && u > DEATH_T.anti) drawShards(X, u, () => draw0(front)); else draw0(front); } ctx.restore();
    };
    // the accent pulse, the debris, the knock to the world
    if (settings.flashes !== "off" && !reduceMotion) { DEATH_FX.flash = settings.flashes === "reduced" ? 0.5 : 1; DEATH_FX.col = D[4]; DEATH_FX.t = 0; DEATH_FX.pulses = settings.flashes === "reduced" ? 1 : mini ? 1 : 2; }
    return B.death;
  }
  // the whole boss's transform at u seconds since the hit (about its pivot); returns its opacity
  function deathXform(X, u) {
    const { px, py } = X, R = DEATH_T, k = clamp((u - R.anti) / (R.sig - R.anti), 0, 1), e = k * k, H2 = H * 1.3;
    const around = (sx, sy, rot = 0, dx = 0, dy = 0) => { ctx.translate(px + dx, py + dy); if (rot) ctx.rotate(rot); ctx.scale(sx, sy); ctx.translate(-px, -py); };
    if (u < R.real) { around(0.97, 1.06); return 1; }   // realization: stiff, a little taller, eyes gone to X
    const antic = u < R.anti ? smooth((u - R.real) / (R.anti - R.real)) : 1;
    switch (X.arch) {
      case "collapse": if (u < R.anti) { around(1, 1, -0.12 * antic); return 1; } around(1 + 0.35 * e, 1 - 0.8 * smooth(k), -0.12 + 0.3 * e, 0, X.s * 0.5 * e); return u > R.gagEnd ? Math.max(0, 1 - (u - R.gagEnd) * 3) : 1;
      case "launch": if (u < R.anti) { around(1 + 0.25 * antic, 1 - 0.3 * antic); return 1; } around(1 - 0.35 * smooth(Math.min(1, k * 3)), 1 + 0.5 * smooth(Math.min(1, k * 3)), 0.4 * k, W * 0.1 * k, -H2 * e); return 1;
      case "deflate": case "smoke": {
        if (u < R.anti) { const g = 1 + 0.35 * antic; around(g, g); return 1; }
        if (X.arch === "smoke") { around(1.35 - 0.9 * k, 1.35 - 0.9 * k, k * 6); return k < 0.5 ? 1 : 0; }
        const s2 = Math.max(0.12, 1.35 - 1.2 * k); around(s2, s2, Math.sin(u * 40) * 0.5 * k, Math.sin(u * 13) * W * 0.25 * k, -H * 0.4 * k); return k < 1 ? 1 : 0; }
      case "spinout": if (u < R.anti) { around(1, 1, -0.3 * antic); return 1; } { const a = -0.3 + 22 * e, s2 = Math.max(0.05, 1 - Math.max(0, k - 0.6) * 2.4); around(s2, s2, a); return k < 1 ? 1 : 0; }
      case "accordion": { if (u < R.anti) { around(1 + 0.15 * antic, 1 - 0.25 * antic); return 1; } const w = Math.cos(k * Math.PI * 3) * (1 - k); const sy = Math.max(0.08, 0.55 + 0.5 * w - 0.45 * k); around(1 / Math.sqrt(sy), sy, 0, 0, X.s * 0.9 * (1 - sy)); return u > R.gagEnd ? Math.max(0, 1 - (u - R.gagEnd) * 3) : 1; }
      case "shatter": if (u < R.anti) { around(1 - 0.06 * antic, 1 - 0.06 * antic); return 1; } return 1;
      case "dropout": if (u < R.anti) { around(1, 1, 0.05 * Math.sin(u * 50)); return 1; } around(1, 1, 0.3 * k, 0, H2 * e); return 1;   // the ground under it gives way
      case "target": if (u < R.anti) { around(1 - 0.08 * antic, 1 + 0.08 * antic); return 1; } { const s2 = Math.max(0.03, 1 - 0.97 * smooth(k)); around(s2, s2, Math.sin(u * 30) * 0.4 * (1 - k), 0, -X.s * 1.4 * k); return k < 1 ? 1 : 0; }
      case "cinematic": { if (u < R.anti + 0.25) { around(1, 1); return 1; } const q = clamp((u - R.anti - 0.25) / (R.sig + 0.3 - R.anti), 0, 1), s2 = Math.max(0.04, 1 - 0.96 * q * q); around(s2, s2 * (1 - 0.3 * q), -0.5 * q, 0, -X.s * 0.8 * q); return q < 1 ? 1 : 0; }
    }
    return 1;
  }
  // shatter: the boss drawn four times, each clipped to a quarter round its pivot, the quarters flying apart and falling
  function drawShards(X, u, paint) {
    const k = clamp((u - DEATH_T.anti) / 1.2, 0, 1), g = H * 1.6, R0 = Math.max(W, H);
    for (let i = 0; i < 4; i++) {
      const sx = i % 2 ? 1 : -1, sy = i < 2 ? -1 : 1, vx = sx * W * 0.35 * (0.7 + 0.2 * i), vy = sy < 0 ? -H * 0.55 : -H * 0.2;
      ctx.save(); ctx.translate(vx * k, vy * k + 0.5 * g * k * k); ctx.translate(X.px, X.py); ctx.rotate(sx * k * (3 + i)); ctx.translate(-X.px, -X.py);
      ctx.beginPath(); ctx.rect(sx < 0 ? X.px - R0 : X.px, sy < 0 ? X.py - R0 : X.py, R0, R0); ctx.clip();
      ctx.globalAlpha *= Math.max(0, 1 - k * 0.9); paint(); ctx.restore();
    }
  }
  const ARCH_SOUND = { collapse: "whistleDown", launch: "whistleUp", deflate: "hiss", smoke: "poof", spinout: "whistleUp", accordion: "boing", shatter: "clang", dropout: "rumble", target: "boing", cinematic: "whistleDown" };
  function deathSignature(X) {
    Sound.toon(ARCH_SOUND[X.arch] || "boing");
    const M = MATERIAL[X.mat] || MATERIAL.ink, n = X.mini ? 14 : 22;
    for (let i = 0; i < n; i++) { const a = rand(0, TAU), sp = rand(0.3, 1) * U * (X.arch === "shatter" ? 1.1 : 0.7);
      particles.push({ kind: M[0], x: X.px, y: X.py, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - U * 0.3, rot: rand(0, TAU), vr: rand(-6, 6), life: rand(0.8, 1.5), max: 1.5, size: rand(5, 11), color: M[1][i % M[1].length], g: M[0] === "bubble" || M[0] === "puff" || M[0] === "bat" ? -0.1 : 0.6, a: 1 }); }
    camJolt("ko", X.mini ? 0.5 : 0.9);   // the world takes the knock too
    envImpact(ring.x, ring.z, X.mini ? 0.9 : 1.4);
  }
  function deathPoof(X) {
    if (!gpuSmoke(X.px, X.py, X.s * 1.6, 30)) for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU; particles.push({ kind: "puff", x: X.px, y: X.py, vx: Math.cos(a) * U * 0.4, vy: Math.sin(a) * U * 0.3, rot: 0, vr: 0, life: 0.9, max: 0.9, size: rand(12, 22), color: "#E8E2D4", g: -0.05, a: 0.9 }); }
    Sound.toon("poof");
  }
  // ── the final gag: a beat after it all seems over, one small thing — a crown, a hat, a gear — falls, bounces, lies there
  const GAGS = [];
  function deathGagStart(X) {
    const floorY = Math.min(H * 0.86, X.py + X.s * 1.6);
    GAGS.push({ kind: X.gag, x: X.px + (X.arch === "launch" ? W * 0.08 : 0), y: X.arch === "launch" || X.arch === "dropout" ? -20 : X.py - X.s * 0.4, vy: 0, vx: rand(-0.1, 0.1) * U, floor: floorY, s: Math.max(10, X.s * 0.32), t: 0, bounces: 0, rot: rand(-0.4, 0.4) });
  }
  // the timeline's beats run in the update (a boss off to one side, or a test, still gets them)
  function deathTick(B) {
    const X = B.death, u = (B.t - X.t0) * (X.mini ? 1.15 : 1), R = DEATH_T;
    if (!X.played.sig && u >= R.anti) { X.played.sig = true; deathSignature(X); }
    if (X.arch === "smoke" && !X.played.poof && u >= R.anti + (R.sig - R.anti) * 0.5) { X.played.poof = true; deathPoof(X); }
    if (!X.played.gag && u >= R.gag) { X.played.gag = true; deathGagStart(X); }
  }
  function updateDeath(dt) {
    if (boss && boss.death) deathTick(boss);
    if (DEATH_FX.flash > 0) DEATH_FX.t = (DEATH_FX.t || 0) + dt;
    if (DEATH_FX.t > 0.5) DEATH_FX.flash = 0;
    for (const G of GAGS) {
      G.t += dt;
      if (G.kind === "dizzy" || G.kind === "bubble") { G.y -= U * 0.08 * dt; continue; }
      G.vy += H * 2.2 * dt; G.y += G.vy * dt; G.x += G.vx * dt; G.rot += G.vx * 0.02 * dt;
      if (G.y > G.floor) { G.y = G.floor; if (G.bounces < 2 && Math.abs(G.vy) > 40) { G.vy = -G.vy * 0.35; G.bounces++; Sound.toon(G.bounces === 1 ? "knock" : "plop"); } else { G.vy = 0; G.vx *= 0.8; } }
    }
    for (let i = GAGS.length - 1; i >= 0; i--) if (GAGS[i].t > 1.8) GAGS.splice(i, 1);
  }
  function drawDeathFX() {
    if (GAGS.length) { ctx.save(); baseXform(ctx); for (const G of GAGS) { ctx.globalAlpha = Math.max(0, Math.min(1, (1.8 - G.t) * 2)); drawGag(G); } ctx.restore(); }
    if (DEATH_FX.flash > 0) {   // the accent: one or two quick pulses of the boss's colour after the white flash
      const t = DEATH_FX.t, per = 0.12, i = Math.floor((t - 0.08) / per), inPulse = t > 0.08 && i < DEATH_FX.pulses && (t - 0.08) % per < per * 0.5;
      if (inPulse) { ctx.save(); ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.globalAlpha = 0.18 * DEATH_FX.flash; ctx.fillStyle = DEATH_FX.col; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    }
  }
  function drawGag(G) {
    const s = G.s, c = ctx; c.save(); c.translate(G.x, G.y); c.rotate(G.rot); c.lineJoin = "round"; c.strokeStyle = INK; c.lineWidth = Math.max(1.5, s * 0.1);
    const fill = col => { c.fillStyle = col; c.fill(); c.stroke(); };
    switch (G.kind) {
      case "crown": c.beginPath(); c.moveTo(-s, 0); c.lineTo(-s, -s * 0.8); c.lineTo(-s * 0.5, -s * 0.35); c.lineTo(0, -s); c.lineTo(s * 0.5, -s * 0.35); c.lineTo(s, -s * 0.8); c.lineTo(s, 0); c.closePath(); fill(GOLD); break;
      case "tophat": c.beginPath(); c.ellipse(0, 0, s * 1.1, s * 0.22, 0, 0, TAU); fill("#1E1C22"); c.beginPath(); c.rect(-s * 0.6, -s * 1.1, s * 1.2, s * 1.1); fill("#1E1C22"); c.fillStyle = "#6B2A22"; c.fillRect(-s * 0.6, -s * 0.35, s * 1.2, s * 0.2); break;
      case "hat": c.beginPath(); c.ellipse(0, 0, s * 1.2, s * 0.25, 0, 0, TAU); fill("#5A3A22"); c.beginPath(); c.moveTo(-s * 0.55, 0); c.quadraticCurveTo(-s * 0.5, -s * 1.1, 0, -s * 1.15); c.quadraticCurveTo(s * 0.5, -s * 1.1, s * 0.55, 0); fill("#6B4526"); break;
      case "stem": c.beginPath(); c.moveTo(-s * 0.15, 0); c.quadraticCurveTo(-s * 0.3, -s * 0.8, s * 0.2, -s * 1.1); c.lineTo(s * 0.35, -s * 0.9); c.quadraticCurveTo(0, -s * 0.6, s * 0.15, 0); c.closePath(); fill("#5E7A36"); break;
      case "shovel": c.beginPath(); c.rect(-s * 0.08, -s * 1.6, s * 0.16, s * 1.2); fill("#6B4526"); c.beginPath(); c.moveTo(-s * 0.45, -s * 0.4); c.lineTo(s * 0.45, -s * 0.4); c.lineTo(s * 0.3, s * 0.2); c.lineTo(0, s * 0.35); c.lineTo(-s * 0.3, s * 0.2); c.closePath(); fill("#8E949F"); break;
      case "leaf": c.beginPath(); c.ellipse(0, -s * 0.2, s * 0.7, s * 0.3, 0.4, 0, TAU); fill("#7F9447"); break;
      case "bell": c.beginPath(); c.arc(0, -s * 0.4, s * 0.5, 0, TAU); fill(GOLD); c.beginPath(); c.moveTo(-s * 0.2, -s * 0.2); c.lineTo(s * 0.2, -s * 0.2); c.stroke(); break;
      case "spring": c.beginPath(); for (let i = 0; i <= 12; i++) { const x = (i % 2 ? 1 : -1) * s * 0.4, y = -i * s * 0.14; i ? c.lineTo(x, y) : c.moveTo(x, y); } c.strokeStyle = "#C49A42"; c.lineWidth = Math.max(2, s * 0.14); c.stroke(); break;
      case "gear": c.beginPath(); for (let i = 0; i < 20; i++) { const a = (i / 20) * TAU + G.t * 3, r = i % 2 ? s * 0.55 : s * 0.72; c.lineTo(Math.cos(a) * r, Math.sin(a) * r - s * 0.7); } c.closePath(); fill("#C49A42"); c.beginPath(); c.arc(0, -s * 0.7, s * 0.2, 0, TAU); fill("#6A4A2A"); break;
      case "reel": c.beginPath(); c.arc(0, -s * 0.7, s * 0.7, 0, TAU); fill("#3A3E46"); for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU + G.t * 4; c.beginPath(); c.arc(Math.cos(a) * s * 0.38, -s * 0.7 + Math.sin(a) * s * 0.38, s * 0.14, 0, TAU); fill("#101014"); } break;
      case "fang": for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(sd * s * 0.3 - s * 0.15, -s * 0.6); c.lineTo(sd * s * 0.3 + s * 0.15, -s * 0.6); c.lineTo(sd * s * 0.3, 0); c.closePath(); fill("#F4F0E6"); } break;
      case "scythe": c.beginPath(); c.moveTo(-s * 1.2, 0); c.lineTo(s * 0.6, -s * 1.3); c.strokeStyle = "#6B4526"; c.lineWidth = Math.max(2, s * 0.14); c.stroke(); c.beginPath(); c.moveTo(s * 0.6, -s * 1.3); c.quadraticCurveTo(s * 1.6, -s * 1.1, s * 1.5, -s * 0.2); c.quadraticCurveTo(s * 1.2, -s * 0.9, s * 0.5, -s * 1.1); c.closePath(); c.strokeStyle = INK; c.lineWidth = Math.max(1.5, s * 0.08); fill("#C8CCD4"); break;
      case "dizzy": for (let i = 0; i < 3; i++) { const a = G.t * 5 + (i / 3) * TAU; c.save(); c.translate(Math.cos(a) * s * 1.2, -s * 0.4 + Math.sin(a) * s * 0.35); star(c, 0, 0, s * 0.35, 5, 0.45, a); fill(MUSTARD); c.restore(); } break;
      case "bubble": for (let i = 0; i < 3; i++) { c.beginPath(); c.arc((i - 1) * s * 0.4, -i * s * 0.5 - G.t * s, s * (0.22 + i * 0.05), 0, TAU); c.strokeStyle = "rgba(210,240,235,.9)"; c.stroke(); } break;
    }
    c.restore();
  }
