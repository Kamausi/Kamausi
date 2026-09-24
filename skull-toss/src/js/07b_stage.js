  // ───────────────────────── stages: 25 → mini-boss → 25 more in 3D → boss → next stage ─────────────────────────
  // Hits are progression (every make is one hit); score is the arcade number (base × combo × stage, plus boss and
  // power-up bonuses) that goes on the leaderboard. Each stage has two halves that feel different:
  //   A  0–25   the ring slides left ↔ right, faster as you go
  //   ⚑  25     MINI-BOSS: the Crow King carries the ring (and teaches you that it can move in depth)
  //   B  25–50  the ring breaks loose and flies a triangle through depth: left, right, up, down, near, far
  //   ⚑  50     MAIN BOSS: the Pumpkin King
  //   ★  clear  a skull back, a new stage, everything a notch faster
  // Stages are data: each one names its patterns and modifiers, so new ones are cheap to add.
  const STAGE_MINI = 25, STAGE_BOSS = 50;
  const BASE_PTS = { perfect: 250, swish: 100, rim: 75 };
  const comboMult = streak => Math.min(1 + 0.5 * Math.max(0, streak - 1), 6);
  // corners of the triangle: 0 near-left-low · 1 far-right-low · 2 up-centre. Patterns are learnable, never random.
  // The maps are data (src/maps/*.json → MAP_DATA): each names its ring's speed, triangle, patterns, modifiers and path.
  const STAGES = MAP_DATA.map(m => ({ id: m.id, name: m.name, speed: m.ring.speed, tri: m.ring.tri, seqs: m.ring.seqs, mods: m.ring.mods,
    path: m.ring.path, tint: m.look.tint, blurb: m.blurb, map: m }));
  function stageDef(n = game.stage || 1) {   // the story has eight maps and then ends: nothing loops any more
    const i = clamp((n | 0) - 1, 0, STAGES.length - 1);
    return { ...STAGES[i], n };
  }
  const hasMod = m => stageDef().mods.includes(m);
  function triSequence(stage) {   // each pattern twice, then the next one
    const out = [], S = stageDef(stage);
    for (const P of S.seqs) out.push(...P, ...P);
    return out;
  }
  function triVerts() {
    const T = ring.tri, y0 = RING_Y, z0 = RING_Z;
    return [{ x: -T.a, y: y0 - 0.3, z: z0 - T.near }, { x: T.a, y: y0 - 0.3 + T.skew * 0.4, z: z0 + T.far }, { x: T.skew * T.a, y: y0 + T.up, z: z0 + 0.05 }];
  }
  const smooth = t => t * t * (3 - 2 * t);
  function ringAt(p) {
    if (ring.frozen) return { x: ring.frozen.x, y: ring.frozen.y, z: ring.frozen.z == null ? RING_Z : ring.frozen.z };
    if (ring.mode === "boss" && boss) return boss.ringAt(p);
    return (RING_PATHS[ring.mode] || RING_PATHS.line).at(p);   // the Ring Path Director (07e_directors.js)
  }
  const ringFlat = () => !!ring.frozen || !!(RING_PATHS[ring.mode] && RING_PATHS[ring.mode].flat) || (ring.mode === "boss" && !!boss && !!boss.flat);
  // when does the skull reach the ring's depth? s: the skull, sampled between s.t and s.t + span; phaseAt(τ) gives
  // the ring's phase at skull time τ. The ring never moves in depth as fast as the skull, so there is one crossing.
  function crossTime(s, span, phaseAt) {
    if (s.v0.z <= 0) return Infinity;
    if (ringFlat()) { const z = ringAt(phaseAt(s.t)).z, tc = (z - s.p0.z) / s.v0.z; return tc >= s.t && tc <= s.t + span ? tc : Infinity; }
    const f = tau => s.p0.z + s.v0.z * tau - ringAt(phaseAt(tau)).z;
    let a = s.t, b = s.t + span;
    if (f(a) > 0 || f(b) < 0) return Infinity;
    for (let i = 0; i < 26; i++) { const m = (a + b) / 2; if (f(m) < 0) a = m; else b = m; }
    return b;
  }
  // how hard the ring is right now (targets; update() eases toward them)
  function ringTargets() {
    const st = game.stage || 1, S = stageDef(st), h = game.stageHits || 0, cursed = powerOn("cursed") ? 1.5 : 1, T = tierNow();
    if (game.state === "title") { const L = level(0); return { mode: "line", ...L }; }
    if (ringFlies()) {   // the second half: the map's path, legs per second (the carousel's circle runs in radians: three legs a lap)
      const L = level(16 + (h - STAGE_MINI) * 0.25 + (st - 1) * 4), lap = RING_PATHS[ring.mode].lap || 1;
      return { rc: L.rc - (hasMod("shrink") ? 0.05 : 0) + T.rc, omega: lap * cursed * S.speed * T.speed * arcadeRamp() / Math.max(0.72, 1.9 - (h - STAGE_MINI) * 0.042), amp: 0, bob: 0 };
    }
    if (ring.mode === "boss") return { rc: boss ? boss.rc : ring.rc, omega: 1, amp: 0, bob: 0 };
    const L = level(Math.min(h, STAGE_MINI) * 0.65 + (st - 1) * 3);
    return { amp: L.amp, omega: L.omega * cursed * S.speed * T.speed, rc: L.rc - (hasMod("shrink") ? 0.05 : 0) + T.rc, bob: Math.max(L.bob, hasMod("bob") ? 0.16 : 0) };
  }
  // Arcade never ends, so past the story's top speed its ring keeps winding up: 6% quicker every 10 hits, to 1.6×
  const arcadeRamp = () => (game.mode === "arcade" ? Math.min(1.6, 1 + 0.06 * Math.floor(Math.max(0, (game.stageHits || 0) - STAGE_BOSS) / 10)) : 1);
  function snapRing() { const T = ringTargets(); ring.amp = T.amp; ring.omega = T.omega; ring.rc = T.rc; ring.bob = T.bob; }
  function setRingMode(mode, keepPos = true) {
    const here = { x: ring.x, y: ring.y, z: ring.z };
    ring.mode = mode; ring.phase = 0;
    if (RING_PATHS[mode] && !RING_PATHS[mode].flat) { ring.tri = { ...stageDef().tri, seq: triSequence(game.stage || 1) }; }
    const p = ringAt(0); ring.x = p.x; ring.y = p.y; ring.z = p.z;
    ring.glide = keepPos ? { from: here, t: 0, dur: 0.7 } : null;
  }

  // ── the stage cards: an old title card slides in between the acts
  const cardEl = $("stagecard");
  function stageCard(kicker, title, sub, dur = 1.9, tone = "") {
    cardEl.innerHTML = `<span class="k">${kicker}</span><b>${title}</b>${sub ? `<span class="s">${sub}</span>` : ""}`;
    cardEl.className = "stagecard " + tone; cardEl.hidden = false; void cardEl.offsetWidth; cardEl.classList.add("in");
    clearTimeout(stageCard.timer); clearTimeout(stageCard.hide);
    stageCard.timer = setTimeout(() => { cardEl.classList.remove("in"); cardEl.classList.add("out"); }, Math.max(400, dur * 1000 - 380));
    stageCard.hide = setTimeout(() => { if (cardEl.classList.contains("out")) cardEl.hidden = true; }, dur * 1000 + 60);
    srEl.textContent = `${kicker}. ${title}. ${sub || ""}`;
  }
  function hideStageCard() { clearTimeout(stageCard.timer); clearTimeout(stageCard.hide); cardEl.hidden = true; cardEl.className = "stagecard"; }
  // a cut-scene holds the throw while a boss arrives or leaves. pull: how far the camera pulls back.
  function cine(kind, dur, then, pull = 0) {
    game.state = "cine"; game.cine = { kind, t: 0, dur, then, pull };
    VisualSystem.emit("transition", { kind });
    aim.active = false; cvs.classList.remove("aiming"); Sound.pullEnd(); setHint("");
  }
  function updateCine(dt) {
    const c = game.cine; if (!c) return;
    c.t += dt;
    if (boss && boss.cine) boss.cine(c, dt);
    if (c.t >= c.dur) { game.cine = null; game.state = "ready"; if (c.then) c.then(); updateHud(); }
  }

  // ── the acts
  function stageReset() {
    Object.assign(game, { stage: 1, stageHits: 0, hits: 0, phase: "A", cine: null, freeze: 0 });
    boss = null; seeds.length = 0; setRingMode("line", false); hideStageCard(); clearDirectors();
  }
  // called once a throw has settled: has the player just earned the next act?
  function stageCheck() {
    if (game.lives <= 0) return false;
    if (game.mode === "arcade") {   // no bosses: at 25 hits the ring simply shakes loose and goes 3D, for good
      if (game.phase === "A" && game.stageHits >= STAGE_MINI) { arcadeGo3D(); return true; }
      return false;
    }
    if (boss && boss.dead) { if (game.phase === "mini") miniBossDown(); else mainBossDown(); return true; }
    if (game.phase === "A" && game.stageHits >= STAGE_MINI) { startMiniBoss(); return true; }
    if (game.phase === "B" && game.stageHits >= STAGE_BOSS) { startMainBoss(); return true; }
    return false;
  }
  function arcadeGo3D() {
    game.phase = "B"; clearPickups(); Sound.toon("brass");
    stageCard(t("card.go3d.k"), t("card.go3d.t"), t("card.go3d.s"), 2.2, "gold");
    cine("mini-out", 2.2, () => { snapRing(); setHint(t("hint.watch")); updateHud(); }, 0.45);
    setRingMode(bMode()); snapRing(); ring.morph = 1; Sound.setAct("B");
    updateHud();
  }
  const bossIds = (n = game.stage) => mapData(n).bosses;
  function startMiniBoss() {
    game.phase = "mini"; clearPickups(); clearPowers(); clearDirectors(); Sound.toon("brass"); Sound.setAct("boss");
    boss = makeBoss(bossIds().mini, game.stage); setRingMode("boss"); snapRing(); Telemetry.emit("boss_start", { kind: boss.kind, stage: game.stage });
    stageCard(t("card.mini.k"), BOSS_INFO[boss.kind].name, t("card.mini.s", { n: boss.max }), 2.3, "boss"); mortySays("boss." + boss.kind, { priority: true });
    cine("mini-in", 2.3, () => setHint(BOSS_INFO[boss ? boss.kind : "crow"].hint));
    updateHud();
  }
  function miniBossDown() {
    profile.miniKills++; profile.bossLog[boss.kind] = (profile.bossLog[boss.kind] || 0) + 1; if (boss.flawless) profile.miniFlawless++; game.run.bosses++;
    const bonus = Math.round(2500 * stageMult() * (boss.flawless ? 1.5 : 1));
    game.score += bonus; flyPoints(`+${fmtN(bonus)}`, W / 2, H * 0.36, true); Sound.toon("fanfare"); mortySays("bossdown", { priority: true });
    stageCard(t("card.miniDown.k"), t("card.go3d.k"), `${t("card.go3d.t")}${boss.flawless ? " · " + t("card.flawless") : ""}`, 2.6, "gold");
    // the rules change: the camera pulls back, the ring shakes loose and grows wings, the band changes key
    cine("mini-out", 2.6, () => { boss = null; game.phase = "B"; snapRing(); setHint(t("hint.watch")); updateHud(); }, 0.55);
    setRingMode(bMode()); snapRing(); ring.morph = 1; Sound.setAct("B");
    checkUnlocks(); persist(); updateHud();
    challenge("bosses", 1);
  }
  function startMainBoss() {
    game.phase = "boss"; clearPickups(); clearPowers(); clearDirectors(); Sound.toon("brass"); Sound.setAct("boss");
    boss = makeBoss(bossIds().end, game.stage); setRingMode("boss"); snapRing(); Telemetry.emit("boss_start", { kind: boss.kind, stage: game.stage });
    stageCard(t("card.boss.k"), BOSS_INFO[boss.kind].name, BOSS_INFO[boss.kind].tell, 2.6, "boss"); mortySays("boss." + boss.kind, { priority: true });
    cine("boss-in", 2.6, () => setHint(BOSS_INFO[boss ? boss.kind : "pumpkin"].hint), 0.35);
    updateHud();
  }
  function mainBossDown() {
    profile.bossKills++; if (boss.flawless) profile.bossFlawless++; game.run.bosses++;
    profile.bossLog[boss.kind] = (profile.bossLog[boss.kind] || 0) + 1;
    profile.bestStage = Math.max(profile.bestStage, game.stage + 1);
    // the end boss was holding one of Morty's pieces
    const frag = mapData(game.stage).fragment, fresh = !profile.fragments.includes(frag);
    if (fresh) profile.fragments.push(frag);
    game.run.fragments = (game.run.fragments || []).concat(frag);
    Telemetry.emit("fragment", { id: frag, fresh, stage: game.stage }); mortySays("fragment." + frag, { priority: true });
    if (game.stage >= MAP_COUNT) { storyComplete(); return; }
    const bonus = Math.round((10000 + (boss.flawless ? 5000 : 0)) * stageMult());
    game.score += bonus; flyPoints(`+${fmtN(bonus)}`, W / 2, H * 0.36, true);
    const bones = 150 + game.stage * 50; addBones(bones); game.run.bossBones = (game.run.bossBones || 0) + bones;
    stageCard(t("card.clear.k", { map: mapData(game.stage).name }), t("card.clear.t", { piece: FRAGMENTS[frag].name }), `${t("card.clear.s", { bones })}${boss.flawless ? " · " + t("card.flawless") : ""}`, 2.8, "gold");
    Sound.toon("fanfare"); changeoverCues(2.8);
    cine("boss-out", 2.8, () => {
      boss = null; seeds.length = 0; game.stage++; game.stageHits = 0; game.phase = "A"; VisualSystem.setStage(game.stage); setScene(game.stage - 1);
      if (game.lives < MAX_LIVES) { game.lives++; game.slots = Math.max(game.slots, game.lives); }
      setRingMode("line"); snapRing(); Sound.setAct("A"); hazardsReset(); refillTargets();
      nextReel();   // the next reel's title card (and the intermission, halfway): 09i_reel.js
      updateHud();
    }, 0.4);
    checkUnlocks(); persist(); updateHud();
    challenge("bosses", 1);
  }
  // the last end boss: THE END. Morty is whole again and the run is over, won.
  function storyComplete() {
    profile.storyClears++; game.run.story = true;
    Sound.toon("fanfare"); Telemetry.emit("story_complete", { score: game.score, secs: Math.round(game.time - (game.run.t0 || 0)) });
    const done = card => { boss = null; seeds.length = 0; gameOver(card); };
    if (cardsMode() === "off") { stageCard(t("reel.theEnd"), t("reel.whole"), t("reel.restored"), 3.4, "gold"); cine("boss-out", 3.4, () => done(true), 0.4); }
    else cine("boss-out", 1.6, () => endReel(() => done(false)), 0.4);   // the boss falls, then THE END card (09i_reel.js)
    checkUnlocks(); persist(); updateHud();
    challenge("bosses", 1);
  }
  const stageMult = () => 1 + 0.25 * ((game.stage || 1) - 1);
  function freezeFrame(sec) { if (!reduceMotion) game.freeze = Math.max(game.freeze || 0, sec); }

  // ── the HUD: a small progress bar above the skulls (the boss's health during a fight)
  const progEl = $("prog"), progFill = $("progFill"), progSt = $("progStage"), progLbl = $("progLabel");
  function renderProgress() {
    if (!progEl) return;
    progEl.classList.toggle("arcade", game.mode === "arcade" && game.state !== "title");
    if (game.mode === "arcade" && game.state !== "title") {   // Arcade: the clock, racing your best time on this map
      const secs = game.state === "over" ? game.run.secs || 0 : arcadeSecs(), best = arcadeRec().secs, clock = s => `${Math.floor(s / 60)}:${String(Math.floor(s) % 60).padStart(2, "0")}`;
      progEl.classList.remove("fight", "half"); delete progEl.dataset.boss;
      progArc.textContent = clock(secs);
      progFill.style.width = (best ? Math.min(100, (100 * secs) / best) : 100).toFixed(1) + "%";
      // once you outlast your best the bar turns gold and says so (and keeps saying so on a run that set it)
      const fresh = game.state === "over" ? !!game.run.newTime && best > 0 : best > 0 && Math.floor(secs) > best;
      progEl.classList.toggle("beat", fresh);
      progLbl.textContent = `${STAGES[game.map].name} · ${fresh ? "new best!" : best ? `best ${clock(best)}` : "no best yet"}`;
      return;
    }
    const fighting = !!boss && (game.phase === "mini" || game.phase === "boss");
    progEl.classList.toggle("fight", fighting);
    progEl.classList.toggle("half", game.phase !== "A" && !fighting);
    progSt.textContent = game.stage || 1;
    if (fighting) {
      progFill.style.width = (100 * Math.max(0, boss.hp) / boss.max).toFixed(1) + "%";
      progLbl.textContent = boss.dead ? "Down!" : `${boss.short} · ${Math.max(0, boss.hp)}`; progEl.dataset.boss = boss.kind;
    } else {
      const h = Math.min(game.stageHits || 0, STAGE_BOSS);
      progFill.style.width = (100 * h / STAGE_BOSS).toFixed(1) + "%";
      const B = bossIds();
      progLbl.textContent = h < STAGE_MINI ? `${STAGE_MINI - h} to ${BOSS_INFO[B.mini].name.replace(/^The /, "the ")}` : `${STAGE_BOSS - h} to ${BOSS_INFO[B.end].name.replace(/^The /, "the ")}`;
      delete progEl.dataset.boss;
    }
    progEl.querySelector(".mini").classList.toggle("done", (game.stageHits || 0) >= STAGE_MINI);
  }
