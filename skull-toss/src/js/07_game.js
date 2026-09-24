  // ───────────────────────── flight physics (exact, event-driven) ─────────────────────────
  // (ax: the wind, pushing across the throw on the maps that have it)
  function posAt(s, t) { const g = s.resting ? 0 : G, ax = s.resting ? 0 : s.ax || 0; return { x: s.p0.x + s.v0.x * t + 0.5 * ax * t * t, y: s.p0.y + s.v0.y * t - 0.5 * g * t * t, z: s.p0.z + s.v0.z * t }; }
  function velAt(s, t) { return { x: s.v0.x + (s.resting ? 0 : s.ax || 0) * t, y: s.v0.y - (s.resting ? 0 : G) * t, z: s.v0.z }; }
  function rebase(s, t) { s.p0 = posAt(s, t); s.v0 = velAt(s, t); s.t = 0; }
  function groundTime(s) { const c = s.p0.y - SKULL_R, b = s.v0.y, disc = b * b + 2 * G * c; return disc < 0 ? Infinity : (b + Math.sqrt(disc)) / G; }
  const panOf = x => clamp(x / 2.4, -1, 1);
  function screenDir(s) { const a = project(s.pos.x, s.pos.y, s.pos.z), v = velAt(s, s.t), b = project(s.pos.x + v.x * 0.02, s.pos.y + v.y * 0.02, s.pos.z + v.z * 0.02); return Math.atan2(b.y - a.y, b.x - a.x); }

  function launch(AX, AY) {
    Replay.note("t", AX, AY);
    voice.quiet = game.time; voice.idleSaid = false;
    const v = aimVelocity(AX, AY);
    Object.assign(skull, { launchRing: { x: ring.x, y: ring.y, z: ring.z }, ax0: windNow(), close: false, shots: [] });   // (what the signature shots read: 07h_shots.js)
    Object.assign(skull, { p0: { x: 0, y: START_Y, z: 0 }, v0: v, t: 0, crossed: false, resting: false, bounces: 0, ax: windNow(),
      spin: (1.3 + Math.abs(v.x) * 0.5) * (v.x < 0 ? -1 : 1), hang: 0, take: 0, alpha: 1, flightTime: 0, trail: [], spawn: 1, emit: 0, missed: false });
    skull.pos = { ...skull.p0 };
    game.state = "flying"; game.result = null; game.endTimer = 0; game.throws++;
    profile.throws++; challenge("throws", 1);
    aim.active = false; cvs.classList.remove("aiming");
    setMood(rig, "fear", game.time);
    setHint("");
    VisualSystem.emit("throw", { AX, AY });   // the squash, the smear, the band, the camera, the sound of it
  }
  // ── the slingshot after the shot: it stays put, and the bands snap through the rest point, overshoot and twang
  // back while the frame jumps toward the throw. Offsets are in screen pixels from the pouch's resting place.
  // sq: how far the fork is squeezed in by the pull (the launcher takes the strain, the skull keeps its shape).
  const sling = { x: 0, y: 0, vx: 0, vy: 0, fy: 0, vfy: 0, sq: 0, vsq: 0 };
  function slingRelease(AX, AY) {
    let { x, y } = skull.pullOff;
    if (Math.hypot(x, y) < 1) {   // a throw with no drag behind it (the tests, the keyboard): pull back by its power
      const p = clamp((AY - AIM_Y_MIN) / (AIM_Y_MAX - AIM_Y_MIN), 0, 1);
      x = -clamp(AX / AIM_X_MAX, -1, 1) * U * 0.05; y = (0.35 + 0.65 * p) * U * 0.16;
    }
    Object.assign(sling, { x, y, vx: 0, vy: 0, fy: 0, vfy: -U * 0.5 });
  }
  function updateSling(dt) {
    // at full draw the fork shivers under the strain, one wobble a drawing on twos
    const n = Math.max(1, Math.ceil(dt * 240)), h = dt / n, sqT = aim.active && aim.valid ? 0.07 * aim.tension + (VSTATE.launcher === "anticipation" ? ((VCLOCK.f12 & 1) ? 0.012 : -0.012) : 0) : 0;
    for (let i = 0; i < n; i++) {   // about 5 Hz and lightly damped: through the rest point, back, still in half a second
      sling.vx += (-900 * sling.x - 14 * sling.vx) * h; sling.vy += (-900 * sling.y - 14 * sling.vy) * h;
      sling.x += sling.vx * h; sling.y += sling.vy * h;
      sling.vfy += (-600 * sling.fy - 20 * sling.vfy) * h; sling.fy += sling.vfy * h;
      sling.vsq += (-700 * (sling.sq - sqT) - 16 * sling.vsq) * h; sling.sq += sling.vsq * h;   // the fork springs back out, past, and home
    }
  }
  const POSE = { confused: 0.52, deadpan: 0 };   // moods that hold a pose instead of tumbling
  function updateFlight(dt, phase0) {
    const s = skull;
    s.flightTime += dt;
    const pose = POSE[rig.mood];
    if (pose != null) { s.spin *= Math.max(0, 1 - dt * 9); const target = pose + Math.round((s.angle - pose) / TAU) * TAU; s.angle += (target - s.angle) * Math.min(1, dt * 9); }
    else s.angle += s.spin * dt;
    if (rig.mood === "perfect") s.spin *= 1 - dt * 0.8;
    // a clean miss hangs in mid-air for a beat, looks at you… then drops like a stone
    s.take += ((s.hang > 0 ? 1 : 0) - s.take) * Math.min(1, dt * (s.hang > 0 ? 9 : 14));   // the cartoon "take": it turns to camera
    if (s.hang > 0) {
      s.hang -= dt;
      if (s.hang <= 0) { const v = velAt(s, s.t); s.p0 = posAt(s, s.t); s.v0 = { x: v.x * 0.1, y: -2.5, z: v.z * 0.1 }; s.t = 0; s.spin = 0; Sound.toon("whistleDown"); }
    }
    obstaclePush(s, dt);   // fans and lodestones push the flight (07m_obstacles.js)
    let remaining = s.hang > 0 ? 0 : dt, elapsed = 0, guard = 0;
    while (remaining > 1e-9 && guard++ < 10) {
      let tE = Infinity, kind = null;
      if (!s.crossed && s.v0.z > 0) { const e0 = elapsed, t0 = s.t, tc = crossTime(s, remaining, tau => phase0 + ring.omega * (e0 + tau - t0)); if (tc < Infinity) { tE = tc; kind = "ring"; } }
      if (!s.resting) { const tg = groundTime(s); if (tg > s.t + 1e-7 && tg <= s.t + remaining && tg < tE) { tE = tg; kind = "ground"; } }
      if (!kind) { s.t += remaining; break; }
      const adv = tE - s.t; remaining -= adv; elapsed += adv; rebase(s, tE);
      if (kind === "ring") hitRing(s, ringAt(phase0 + ring.omega * elapsed)); else hitGround(s);
      if (s.hang > 0) break;
    }
    const prevPos = s.pos; s.pos = posAt(s, s.t);
    if (!game.result && !s.crossed && seeds.length) seedCheck(s, prevPos);
    if (!game.result && !s.crossed) hazardCheck(s, prevPos);
    if (!game.result && !s.crossed) obstacleCheck(s, prevPos);   // the map's obstacles: bumpers bounce, fans and lodestones push, the rest block (07m_obstacles.js)
    envAfterFlight(s, prevPos);   // props it brushes answer (07n_environment.js)
    if (targets.length) targetCheck(s, prevPos);
    if (cans.length) canCheck(s, prevPos);   // Can Alley (07o_bonus.js)
    if (s.pos.z < -CAM_BACK + 0.9 || s.pos.z > 48) s.alpha = 0;
    const fade = game.result ? clamp(game.endTimer / 0.3, 0, 1) : 1;
    const v = velAt(s, s.t);
    const still = s.resting || s.hang > 0;
    Sound.flightUpdate(still ? 0 : Math.hypot(v.x, v.y, v.z), s.pos.z + CAM_BACK, s.pos.x, s.spin, s.alpha * fade * (still ? 0 : 1));
    if (game.result) {
      game.endTimer -= dt;
      if (game.endTimer <= 0) endThrow();
    } else if (s.flightTime > 4) resolve("wide", null);
  }

  const hasPost = () => ring.mode === "line" && anchorDef().support === "ground";   // (a post or the desert's hand stands under the ring; a hanging ring has nothing below it)
  function hitRing(s, rp) {
    s.crossed = true;
    const dx = s.p0.x - rp.x, dy = s.p0.y - rp.y, d = Math.hypot(dx, dy), zr = rp.z;
    const rc = ring.rc, inner = rc - RING_TUBE - SKULL_R, outer = rc + RING_TUBE + SKULL_R;
    const perfR = inner * 0.38 * (powerOn("deadeye") ? 2 : 1);   // Deadeye: a perfect window twice as wide
    game.lastCross = { x: s.p0.x, y: s.p0.y, ringX: rp.x, ringY: rp.y, ringZ: zr, d, rc, perfR, t: s.flightTime };
    const at = project(rp.x, rp.y, zr), pan = panOf(rp.x);
    const strength = Math.hypot(s.v0.x, s.v0.y, s.v0.z) / IMPACT_REF;   // how hard it arrives (1 = a normal throw)
    if (d > rc - RING_TUBE - SKULL_R && d < rc + RING_TUBE + SKULL_R + 0.02 && anchorHolds()) anchorReact(strength);   // a knock on the ring swings its anchor
    const ux = d > 1e-6 ? dx / d : 0, uy = d > 1e-6 ? dy / d : 1;
    if (d > inner && boss && boss.eyeAt) { const e = boss.eyeAt(s.p0); if (e >= 0) {   // the Pumpkin King's eyes: a hit, not a miss
      const ep = boss.eyePos(e); boss.eyeHit(e, at); s.v0 = { x: (s.p0.x - ep.x) * 4, y: 1.5, z: -Math.abs(s.v0.z) * 0.3 }; resolve("eye", at, project(ep.x, ep.y, ep.z)); return; } }
    if (d <= inner) { const kind = d <= perfR ? "perfect" : "swish"; VisualSystem.triggerImpact(kind, { at, strength, pan }); resolve(kind, at, null, d); }
    else if (d >= outer) {
      if (hasPost() && dy < -(rc + RING_TUBE) && Math.abs(dx) < POST_HALF + SKULL_R) {
        s.v0 = { x: s.v0.x + (dx < 0 ? -1 : 1) * 1.2, y: s.v0.y + 0.6, z: -Math.abs(s.v0.z) * 0.3 };
        const hit = project(rp.x + dx, s.p0.y, zr);
        VisualSystem.triggerImpact("post", { at, hit, strength, pan });
        resolve("post", at, hit);
      } else if (Math.abs(dy) > Math.abs(dx)) resolve(dy > 0 ? "over" : "low", at);
      else resolve("wide", at);
    } else if (powerOn("ghost")) {   // Ghost Toss: the skull goes see-through and slips past the rim
      usePower("ghost"); s.ghosted = 1;
      VisualSystem.triggerImpact("swish", { at, strength, pan });
      resolve("rim", at, null, d, true);
    } else {
      const hit = project(rp.x + ux * rc, rp.y + uy * rc, zr);
      if (d < rc) { s.v0 = { x: s.v0.x - ux * 1.1, y: s.v0.y - uy * 1.1, z: s.v0.z * 0.8 }; VisualSystem.triggerImpact("rim", { at, hit, strength, pan }); resolve("rim", at, null, d); }
      else { s.v0 = { x: s.v0.x + ux * 1.6, y: s.v0.y + uy * 1.6 + 0.4, z: -Math.abs(s.v0.z) * 0.32 }; VisualSystem.triggerImpact("clank", { at, hit, strength, pan }); resolve("clank", at, hit); }
    }
  }
  function hitGround(s) {
    const p = s.p0, at = project(p.x, 0, p.z), first = s.bounces === 0;
    const short = !s.crossed && !game.result;
    if (short) { s.crossed = true; resolve("short", project(p.x, p.y + 0.4, p.z)); }
    s.bounces++; if (first) envImpact(p.x, p.z, clamp(Math.abs(s.v0.y) / GROUND_REF, 0.5, 1.3));   // the ground shakes what's near
    // FLAT SKULL, then BOING back into shape (how flat depends on how fast it came down)
    VisualSystem.triggerImpact(!first ? "bounce" : short ? "short" : "ground", { at, strength: Math.abs(s.v0.y) / GROUND_REF, pan: panOf(p.x) });
    if (first && game.result && !game.result.make) {
      if (s.missed && !game.result.bonked) { game.result.bonked = true; profile.bonks++; impact(bonkWord(), at.x, at.y - SKULL_R * at.s * 2.2 - U * 0.08, { scale: 0.8 }); VisualSystem.cue("bonk", { pan: panOf(p.x) }); }
      setMood(rig, "dizzy", game.time); rig.dots = 0;
      game.endTimer = clamp(game.endTimer, 0.45, 0.6);
    }
    s.v0 = { x: s.v0.x * 0.55, y: -s.v0.y * 0.36, z: s.v0.z * 0.55 }; s.spin *= 0.5;
    if (s.v0.y < 0.9 || s.bounces >= 3) { s.resting = true; s.ax = 0; s.v0 = { x: 0, y: 0, z: 0 }; s.p0.y = SKULL_R; s.spin = 0; }
  }
  const bonkWord = () => (IMPACTS[cos.impact] || IMPACTS.classic).word;

  const RESULT = {
    perfect: { make: true, pts: 2, fill: MUSTARD, text: INK, mood: "perfect" },
    swish:   { make: true, pts: 1, fill: TEAL, text: CREAM, mood: "excited" },
    rim:     { make: true, pts: 1, fill: CREAM, text: INK, mood: "confused" },
    clank:   { make: false, hit: true },
    post:    { make: false, hit: true },
    wide:    { make: false },
    over:    { make: false },
    low:     { make: false },
    short:   { make: false, hit: true },
    seed:    { make: false, hit: true },
    bat:     { make: false, hit: true },
    bone:    { make: false, hit: true },
    balloon: { make: false, hit: true },
    pendulum: { make: false, hit: true },
    bar:     { make: false, hit: true },   // (the obstacles: 07m_obstacles.js)
    spikes:  { make: false, hit: true },
    cannon:  { make: false, hit: true },
    magnet:  { make: false, hit: true },
    crusher: { make: false, hit: true },
    barrier: { make: false, hit: true },
    decoy:   { make: false, hit: true },   // (a decoy target hung in front of the ring: 07e_directors.js)
    eye:     { make: false, hit: true, safe: true }   // (the Pumpkin King's eyes: a hit, not a miss; it costs no skull)
  };
  // the words are strings: result.<kind>.word for a make, result.<kind>.call and .sub for a miss; coach.<kind> the tip after one
  const MISS_STAT = { wide: "wides", over: "overs", low: "lows", post: "posts", short: "shorts", clank: "clanks", seed: "seeds" };
  function resolve(kind, at, hitAt, d = null, ghosted = false) {
    const R = RESULT[kind], run = game.run;
    Telemetry.emit("throw", { result: kind, make: !!R.make, stage: game.stage, stageHits: game.stageHits, lives: game.lives, boss: boss ? boss.kind : null, n: game.throws });
    game.result = { kind, make: R.make, at: game.time, bonked: false, pts: 0 };
    game.endTimer = R.make ? 0.95 : R.hit ? 1.0 : 1.45;
    const x = at ? at.x : W / 2, y = at ? at.y - ring.rc * at.s - U * 0.05 : H * 0.3;
    if (R.make) {
      if (game.lives === 1) profile.clutch++;
      game.streak++; game.hits++; if (!boss) game.stageHits++;
      // SCORE: base × combo × stage, and the power-ups that gamble on it
      const blast = powerOn("blast"), mult = comboMult(game.streak) * stageMult() * (powerOn("cursed") ? 3 : 1) * (blast ? 3 : 1);
      const pts = Math.max(5, Math.round((BASE_PTS[kind] * mult) / 5) * 5);
      game.score += pts; game.result.pts = pts; profile.scoreTotal += pts;
      game.perfStreak = kind === "perfect" ? game.perfStreak + 1 : 0;
      run.bestCombo = Math.max(run.bestCombo, game.streak);
      if (kind === "perfect") run.perfects++; else if (kind === "rim") run.rims++; else run.swishes++;
      profile.makes++; profile.points += R.pts; profile.mapMakes[game.stage] = (profile.mapMakes[game.stage] || 0) + 1;
      if (kind === "perfect") profile.perfects++;
      if (kind === "rim") profile.rims++;
      profile.bestStreak = Math.max(profile.bestStreak, game.streak);
      profile.bestPerfStreak = Math.max(profile.bestPerfStreak, game.perfStreak);
      challenge("makes", 1); if (kind === "perfect") challenge("perfects", 1); if (kind === "rim") challenge("rims", 1);
      challenge("combo", game.streak); challenge("best", game.hits); challenge("score", game.score);
      // the skull reacts: huge grin, a spinning perfect, or a puzzled rim-in (the impact itself was the visual system's)
      setMood(rig, R.mood, game.time);
      VisualSystem.emit("score", { kind, streak: game.streak }); buzz(kind === "perfect" ? [10, 30, 16] : 12);   // the swish was the contact; the director lands the sting
      const word = game.streak >= 2 ? comboWord(game.streak) : "";
      impact(ghosted ? t("result.ghost.word") : t(`result.${kind}.word`), x, y, { fill: ghosted ? PURPLE : R.fill, text: ghosted ? CREAM : R.text, scale: kind === "perfect" ? 1.1 : 0.9, sub: word ? `×${game.streak} · ${word}` : ghosted ? t("result.ghost.sub") : "" });
      flyPoints(`+${fmtN(pts)}`, x, y + U * 0.05, kind === "perfect");
      if (blast) bonkBlast(at || { x, y, s: U / 9 });
      if (powerOn("magnet")) magnetBones(at || { x, y });
      if (pickup && d != null && pickupHit(game.lastCross)) collectPickup(at);
      if (boss && !boss.dead) boss.hit(kind, at);
      judgeShots(kind, x, y);   // a signature shot? (07h_shots.js)
      directorMake();           // the Shrinking Ring (07k_director.js)
      encoreMake();             // the encore pays bones for every make (07i_modes.js)
      showCombo(game.streak);
      if (game.streak === 6) { Sound.toon("ignite"); caption(t("fire.on"), x, y - U * 0.1); profile.fireRings++; }   // the ring catches fire (08c_scene.js)
      else if (game.streak > 6) profile.fireMakes++;   // (a make into a burning ring)
      if (game.streak % 5 === 0 && game.lives < MAX_LIVES) { // every 5 in a row earns a skull, stacking up to five
        game.lives++; game.slots = Math.max(game.slots, game.lives); game.peakLives = Math.max(game.peakLives, game.lives);
        profile.peakLives = Math.max(profile.peakLives, game.peakLives); challenge("lives", game.lives);
        const icon = lifeIcons[game.lives - 1];
        updateHud(); icon.classList.remove("gain"); void icon.offsetWidth; icon.classList.add("gain");
        impact(game.lives > START_LIVES ? t("result.bonusSkull") : t("result.plusSkull"), x, y - U * 0.16, { fill: GOLD, text: INK, scale: 0.6, delay: 0.35, bits: false }); Sound.life();
      }
      if (game.throws <= 6 && game.hits <= 2) setHint(t("hint.speedsUp"));
    } else {
      const saved = powerOn("second");   // Second Chance: this miss is on the house
      if (saved) { usePower("second"); profile.saves++; impact(t("result.saved"), W / 2, H * 0.3, { fill: TEAL, text: CREAM, scale: 0.7, delay: 0.25, bits: false }); Sound.life(); }
      else if (!freeMiss() && !R.safe) game.lives--;   // (an eye poke costs nothing)   // (Practice, Curtain Call and the encore: misses are free)
      game.streak = 0; game.perfStreak = 0; run.misses++; profile.misses++;
      if (MISS_STAT[kind]) profile[MISS_STAT[kind]]++;
      if (boss && !R.safe) boss.flawless = false;
      showCombo(0);
      skull.missed = true;
      if (R.hit) {  // it actually hit something (the visual system already squashed it): see stars, BONK
        game.result.bonked = true; profile.bonks++;
        const hx = hitAt ? hitAt.x : x, hy = hitAt ? hitAt.y : y;
        setMood(rig, "dizzy", game.time);
        impact(bonkWord(), hx, Math.min(hy, y), { scale: 0.95, sub: `${t(`result.${kind}.sub`)}${game.lives > 0 ? ` · ${t("result.left", { n: game.lives })}` : ""}` });   // (the bonk was the contact's)
      } else {      // a clean miss: it turns, looks right at you… then gravity
        setMood(rig, "deadpan", game.time); rig.dots = 0;
        // the caption goes on the far side of the ring, so it never covers the skull's deadpan look
        let cx = x, cy = y;
        if (at) { const sp = project(skull.p0.x, skull.p0.y, skull.p0.z), dx = at.x - sp.x, dy = at.y - sp.y, d = Math.hypot(dx, dy) || 1, off = ring.rc * at.s + U * 0.075;
          cx = at.x + (dx / d) * off * 1.25; cy = at.y + (dy / d) * off; }
        caption(`${t(`result.${kind}.call`)}… ${t(`result.${kind}.sub`)}`, cx, cy);
        if (!skull.resting) skull.hang = simReduced() ? 0.2 : 0.38;   // (a replay uses the recorder's setting)
        VisualSystem.emit("miss");
      }
      buzz(30);
      if (game.throws <= 8 && game.lives > 0) setHint(t(`coach.${kind}`), true);
    }
    mortyAfterThrow(kind, R.make);   // Morty's two cents (08g_voice.js)
    secretsAfterThrow(kind, R.make);   // (09l_mischief.js)
    srEl.textContent = t("result.sr", { what: (R.make ? t(`result.${kind}.word`).replace("!", "") : t(`result.${kind}.call`) + ", " + t(`result.${kind}.sub`)).toLowerCase(), score: fmtN(game.score), hits: game.hits, lives: game.lives });
    checkUnlocks(); persist(); updateHud();
  }

  function endThrow() {
    Sound.flightStop();
    if (game.lives <= 0) { if (!offerContinue()) gameOver(); return; }   // out of skulls: one more, perhaps (07g_continue.js)
    settleThrow();
  }
  // the throw is over and the run goes on: the next skull, the power-ups' clocks, the act, the directors
  function settleThrow() {
    game.state = "ready"; resetSkull();
    powersAfterThrow();
    if (boss && boss.after) boss.after();
    if (!modeCheck() && !stageCheck()) {
      pickupSchedule(); directorsAfterThrow(); obstaclesSync();
      if (game.throws < 2 && !hintEl.textContent) setHint(t("hint.start"));
    }
    saveRunSnapshot();
    mischiefAfterThrow();   // now and then the old print acts up (09l_mischief.js)
  }
  function resetSkull() {
    Object.assign(skull, { p0: { x: 0, y: START_Y, z: 0 }, v0: { x: 0, y: 0, z: 0 }, t: 0, crossed: false, resting: true, missed: false, ghosted: 0,
      bounces: 0, angle: 0, spin: 0, spawn: 0, alpha: 1, flightTime: 0, pullOff: { x: 0, y: 0 }, trail: [], emit: 0 });
    skull.pos = { ...skull.p0 };
    kick(rig, 1, 0, Math.PI / 2); rig.tilt = 0; rig.dots = 0; setMood(rig, "idle", game.time);
    VisualSystem.emit("reload");   // the next skull drops into the pouch and the bands give under it
  }
  // two ways to play. Story: the stages in order, each with its two bosses. Arcade: one map (any stage), no bosses
  // and no end: the ring keeps getting quicker, and the run lasts as long as your skulls do.
  function startGame(opts = {}) {
    if (Replay.play && !opts.replay) Replay.stop(false);   // (a real run ends any replay: 07j_replay.js)
    const mode = !MODES[opts.mode] ? "story" : opts.replay || (!Flags.modeOff(opts.mode) && (!MODES[opts.mode].open || MODES[opts.mode].open())) ? opts.mode : "story";   // (the live config can take a mode off: 03d_flags.js)
    modeStart(mode);   // (Practice swaps in a copy of the profile here: 07i_modes.js)
    const pick = clamp(opts.map | 0, 0, STAGES.length - 1), map = opts.replay ? pick : mode === "director" ? directorNow().map : mode === "feature" ? featureMap() : MODES[mode].maps ? (mapUnlocked(pick) ? pick : 0) : MODES[mode].mini ? miniMap(mode) : 0;
    if (mode === "director" && opts.seed == null) opts = { ...opts, seed: directorNow().seed };   // (everyone plays the same run this week)
    Object.assign(game, { state: "ready", score: 0, hits: 0, lives: START_LIVES, slots: START_LIVES, streak: 0, perfStreak: 0, peakLives: START_LIVES, throws: 0,
      result: null, lastCross: null, newBest: false, shake: 0, slowmo: 0, run: freshRun(), mode, map });
    game.run.t0 = game.time; Object.assign(voice, { said: 0, text: "", quiet: game.time, idleSaid: false });
    seedRun(opts.seed != null ? opts.seed : sandbox ? 1933 : (Date.now() ^ (Math.random() * 0x7fffffff)) >>> 0);   // the run's dice (07e_directors.js)
    setScene(map);   // Story starts on map 1; Arcade on the map picked
    ring.frozen = null; ring.flash = 0; ring.wobble = 0; ring.morph = 0;
    stageReset(); clearPowers(); clearPickups(); powerDirectorReset();
    if (mode !== "story") { game.stage = map + 1; VisualSystem.setStage(game.stage); }
    snapRing();
    VisualSystem.emit("start");
    const r0 = ringAt(0); ring.x = r0.x; ring.y = r0.y; ring.z = r0.z;
    Sound.setAct("A");
    particles = []; bursts = []; waves = []; pendingFly = 0; clearFlies();
    resetSkull(); aim.active = false; Sound.pullEnd(); Sound.flightStop(true);
    paused = false; Sound.setPaused(false); showCombo(0); gameOverCard(false); contEl.hidden = true; game.cont = null;
    showScreen("play");
    OB.off = false; hazardsReset(); refillTargets();
    misc.lastMap = 0; misc.lastThrow = -99; misc.kind = null;   // (mischief's once-a-map is per run)
    modeBegin();   // each mode's own opening (07i_modes.js)
    if (opts.quiet || (mode !== "story" && mode !== "arcade" && mode !== "practice")) setHint(game.mode === "rush" ? "" : t("hint.start")); else introReel(mode, map);   // the leader and the reel's title card (09i_reel.js)
    Replay.begin(opts);   // record what the player does, for a replay (07j_replay.js)
    updateHud();
    Telemetry.emit("run_start", { mode, map, stage: game.stage, career: profile.games });   // career: runs finished before this one
  }
  const arcadeSecs = () => Math.max(0, game.time - (game.run.t0 || 0));
  const arcadeRec = (map = game.map) => profile.arcade[String(map)] || { score: 0, secs: 0, hits: 0, runs: 0 };
  // card: the GAME OVER words pop up first (out of skulls); ending the run from the pause menu goes straight to the stone
  function gameOver(card = true) {
    Sound.flightStop(true); if (!Replay.play) clearRunSnapshot(); contEl.hidden = true; game.cont = null;
    game.state = "over"; game.overAt = game.time; game.overHold = card ? GAME_OVER_HOLD : 0.6; game.cine = null; hideStageCard();
    if (card) gameOverCard(true, game.run.story ? ["The", "End"] : undefined);
    game.run.secs = Math.max(0, game.time - (game.run.t0 || 0));
    if (game.mode === "arcade") {   // arcade keeps its own bests, map by map (the story best and the leaderboard stay Story's)
      const k = String(game.map), A = profile.arcade[k] || (profile.arcade[k] = { score: 0, secs: 0, hits: 0, runs: 0 });
      game.newBest = game.score > A.score; game.run.newTime = Math.floor(game.run.secs) > A.secs;
      A.runs++; A.score = Math.max(A.score, game.score); A.secs = Math.max(A.secs, Math.floor(game.run.secs)); A.hits = Math.max(A.hits, game.hits);
      profile.arcadeRuns++; challenge("arcadeSecs", Math.floor(game.run.secs)); arcadeTableAfterRun();   // the cabinet's top five (09o_arcade.js)
    } else if (game.mode !== "story") modeRecords();   // Practice, Boss Rush and the mini-games keep their own (07i_modes.js)
    else {
      game.newBest = game.score > profile.bestScore;
      if (game.newBest) profile.bestScore = game.score;
      profile.bestStage = Math.max(profile.bestStage, game.stage);
      if (!game.run.continues && game.score > (profile.boardBest ? profile.boardBest.score : 0)) profile.boardBest = { score: game.score, hits: game.hits, stage: game.stage, at: Date.now(),   // what the leaderboard posts
        throws: game.throws, secs: Math.ceil(game.run.secs), perfects: game.run.perfects, bosses: game.run.bosses, targets: game.run.targets || 0, shots: (game.run.shots || []).length, fragments: (game.run.fragments || []).length, continues: 0 };
    }
    profile.games++;
    profile.best = Math.max(profile.best, game.hits);
    if (game.hits === 0) profile.zeroRuns++;
    if (game.throws <= 5) profile.quickDeaths++;
    profile.playTime += Math.round(game.run.secs); profile.longestRun = Math.max(profile.longestRun || 0, Math.round(game.run.secs));
    challenge("runs", 1); challenge("best", game.hits); challenge("score", game.score);
    careerAfterRun();   // experience, levels and the run log (04h_career.js)
    game.run.bones = inPractice() ? 0 : runBones(game.run, game.hits, game.newBest, game.score);
    profile.bones += game.run.bones; profile.bonesTotal += game.run.bones;
    checkUnlocks(); persist(300);
    showCombo(0); setHint(""); Sound.over(); Sound.setAct("menu"); VisualSystem.emit("death"); updateHud();
    renderResults(); if (game.mode === "story" && !Replay.play) Board.post();
    Telemetry.emit("run_end", { mode: game.mode, map: game.map, score: game.score, hits: game.hits, stage: game.stage, phase: game.phase, tier: tierNow().id, secs: Math.round(game.run.secs), throws: game.throws,
      misses: game.run.misses, perfects: game.run.perfects, continues: game.run.continues, powerups: game.run.powerups, bosses: game.run.bosses, quit: !card });
    if (!Replay.play) PlayData.runs++;
    Replay.finish(); renderResults();   // (the recording is kept for Watch replay and Share)
    leavePractice();   // (the copy goes; the real profile comes back, one practice run the richer)
  }
  function endRun() { if (inRun()) { Replay.note("e"); aim.active = false; Sound.pullEnd(); gameOver(false); game.overAt = game.time - 0.6; } }

  // ───────────────────────── the skull's rig, frame by frame ─────────────────────────
  function updateRig(dt) {
    const R = rig, t = game.time;
    if (game.state === "ready" || game.state === "title") {
      if (aim.active && aim.valid) {             // charging: the skull keeps its shape in the pouch; it only leans and grits
        R.aT = 1; R.k = 420; R.d = 26;
        R.tiltT = clamp(aim.AX / AIM_X_MAX, -1, 1) * 0.38;   // lean toward the trajectory
        setMood(R, "aim", t);
      } else {                                    // idle: breathe, rock side to side, blink
        R.aT = 1 + 0.025 * Math.sin(t * 2.4); R.k = 320; R.d = 11;
        if (R.a > 0.95 && R.a < 1.05) R.dir = Math.PI / 2;
        R.tiltT = 0.09 * Math.sin(t * 1.5);
        const S = SKINS[cos.skull], quirk = S && S.idle ? S.idle(t) : null;
        setMood(R, quirk || "idle", t);
      }
    } else {   // in the air it stretches along its flight, more the faster it goes
      const v = velAt(skull, skull.t), sp = VSTATE.skull === "flight" && !skull.resting ? clamp(Math.hypot(v.x, v.y, v.z) / (skull.launchSpeed || 1), 0, 1) : 0;
      R.aT = 1 + SQUASH.flight.stretch * sp; R.tiltT = 0;
    }
    R.jawT = poseFace(VPOSE.id, t).jawT;   // the jaw follows the pose now showing
    stepRig(R, dt);
  }

  // ───────────────────────── update ─────────────────────────
  // The game first (exact, every frame), then the picture. Nothing in updateGame waits on the art.
  function update(dt) {
    if (paused) return;
    if (game.freeze > 0) { game.freeze -= dt; VisualSystem.update(dt, true); return; }   // hit-stop: the whole reel holds for a beat
    updateGame(dt);
    VisualSystem.update(dt);
  }
  function updateGame(dt) {
    if (Replay.play) Replay.tick();   // what the recording did at this step (07j_replay.js)
    game.time += dt;
    if (arcadeLike() && inRun()) { const s = Math.floor(arcadeSecs()); if (s !== ui.arcSec) { ui.arcSec = s; renderProgress(); } }   // the Arcade clock, on game time
    const L = ringTargets(), k = Math.min(1, dt * 2.2);
    ring.amp += (L.amp - ring.amp) * k; ring.omega += (L.omega - ring.omega) * k;
    ring.rc += (L.rc - ring.rc) * k; ring.bob += (L.bob - ring.bob) * k;
    const phase0 = ring.phase;
    if (!ring.frozen) ring.phase += ring.omega * dt;
    const rp = ringAt(ring.phase);
    if (ring.glide) {   // after a change of act the ring glides from where it was onto its new path
      const g = ring.glide; g.t += dt; const e = smooth(clamp(g.t / g.dur, 0, 1));
      for (const a of ["x", "y", "z"]) rp[a] = g.from[a] + (rp[a] - g.from[a]) * e;
      if (g.t >= g.dur) ring.glide = null;
    }
    ring.x = rp.x; ring.y = rp.y; ring.z = rp.z;
    if (boss) updateBoss(dt);
    updateSeeds(dt); updatePickup(dt); updatePowers(dt); updateTargets(dt); updateCans(dt); updateBonusOffer(dt); updateHazards(dt); updateObstacles(dt);

    if (game.state === "flying") updateFlight(dt, phase0);
    else if (game.state === "cine") { updateCine(dt); skull.spawn = Math.min(1, skull.spawn + dt / 0.3); }
    else if (game.state === "ready" || game.state === "title") skull.spawn = Math.min(1, skull.spawn + dt / 0.3);
    updateModes(dt);   // Curtain Call's clock, the encore's end (07i_modes.js)
    updateMischief();
    if (game.state === "continue") updateContinue(dt);
    else if (game.state === "ready") mortyIdle();
    if (game.state === "over" && screen === "play" && game.time - game.overAt > (game.overHold || 0.6)) showScreen("over");
  }
