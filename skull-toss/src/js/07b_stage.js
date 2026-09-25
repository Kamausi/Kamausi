  // ───────────────────────── stages (v47): 80 hits a map, in ten-hit sections ─────────────────────────
  // Hits are progression (every make is one hit, boss hits included); score is the arcade number (base × combo ×
  // stage, plus boss and power-up bonuses) that goes on the leaderboard. Every map runs the same 80-hit shape
  // (src/maps/blueprint.json: structure), and every ten hits something changes:
  //   Acts I–III   1–30   the ring slides left ↔ right on its anchor, faster as you go; each act has a name
  //   ⚑  MINI-BOSS 31–40  ten hits on him and he drops the ring: it breaks loose and flies on its own
  //   The approach 41–50  the loose ring flies the map's path through depth (catch it first), toward the end boss
  //   ⚑  END BOSS  51–80  three phases of ten hits, each one harder; at 80 he's down
  //   ★  clear     the body part, the Black Ring shard, Can Alley if you want it, then the next map
  // Stages are data: each one names its patterns, modifiers and acts, so new ones are cheap to add.
  const STRUCT = BLUEPRINT.structure;
  const ACT_LEN = STRUCT.act, STAGE_MINI = STRUCT.mini, STAGE_LOOSE = STRUCT.loose, STAGE_BOSS = STRUCT.boss, STAGE_END = STRUCT.end;
  const MINI_HITS = STAGE_LOOSE - STAGE_MINI, BOSS_HITS = STAGE_END - STAGE_BOSS, BOSS_PHASES = STRUCT.phases;
  const BASE_PTS = { perfect: 250, swish: 100, rim: 75, eye: 150 };
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
  // how hard the ring is right now (targets; update() eases toward them). The first half climbs to the same level over
  // its 30 hits as it always did; the approach climbs the flying ring's whole range in its 10 (Arcade, which never
  // stops, climbs it at the old pace).
  const A_TOP = 16.25, B_RISE = 6.25, B_SLOW = 1.05;
  const aLevel = h => A_TOP * Math.min(h, STAGE_MINI) / STAGE_MINI;
  const bHits = h => Math.max(0, h - (arcadeLike() ? STAGE_MINI : STAGE_LOOSE)), bPace = () => (arcadeLike() ? 25 : STAGE_BOSS - STAGE_LOOSE);
  const ringTargets = () => portalRingSpec() || plusTargets(ringTargets0());   // (v51: Adventure+ pushes the ring: 07s_plus.js; v54: a portal's open: 07t_portal.js)
  function ringTargets0() {
    const MR = modeRing(); if (MR && game.state !== "title") return MR;   // Curtain Call, the encore, a slow Practice ring
    const st = game.stage || 1, S = stageDef(st), h = game.stageHits || 0, cursed = (powerOn("cursed") ? 1.5 : 1) * (powerOn("time") ? 0.5 : 1), T = tierNow();
    if (game.state === "title") { const L = level(0); return { mode: "line", ...L }; }
    if (ringFlies()) {   // the second half: the map's path, legs per second (the carousel's circle runs in radians: three legs a lap)
      const b = bHits(h) / bPace(), L = level(16 + b * B_RISE + (st - 1) * 4), lap = RING_PATHS[ring.mode].lap || 1;
      return { rc: L.rc - (hasMod("shrink") ? 0.05 : 0) + T.rc - (ring.rcShrink || 0), omega: lap * cursed * S.speed * T.speed * directorSpeed() * arcadeRamp() / Math.max(0.72, 1.9 - b * B_SLOW), amp: 0, bob: 0 };
    }
    if (ring.mode === "boss") return { rc: boss ? boss.rc : ring.rc, omega: 1, amp: 0, bob: 0 };
    const L = level(aLevel(h) + (st - 1) * 3);
    return { amp: L.amp, omega: L.omega * cursed * S.speed * T.speed * directorSpeed(), rc: L.rc - (hasMod("shrink") ? 0.05 : 0) + T.rc - (ring.rcShrink || 0), bob: Math.max(L.bob, hasMod("bob") ? 0.16 : 0) };
  }
  // Arcade never ends, so past the story's top speed its ring keeps winding up: 6% quicker every 10 hits, to 1.6×
  const arcadeRamp = () => (arcadeLike() ? Math.min(1.6, 1 + 0.06 * Math.floor(Math.max(0, (game.stageHits || 0) - STAGE_BOSS) / 10)) : 1);
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
    cardEl.className = "stagecard " + tone; cardEl.hidden = false; void cardEl.offsetWidth; cardEl.classList.add("in"); placeClearOfRing(cardEl);
    clearTimeout(stageCard.timer); clearTimeout(stageCard.hide);
    stageCard.timer = setTimeout(() => { cardEl.classList.remove("in"); cardEl.classList.add("out"); }, Math.max(400, dur * 1000 - 380));
    stageCard.hide = setTimeout(() => { if (cardEl.classList.contains("out")) cardEl.hidden = true; }, dur * 1000 + 60);
    srEl.textContent = `${kicker}. ${title}. ${sub || ""}`;
  }
  function hideStageCard() { clearTimeout(stageCard.timer); clearTimeout(stageCard.hide); cardEl.hidden = true; cardEl.className = "stagecard"; }
  // a cut-scene holds the throw while a boss arrives or leaves. pull: how far the camera pulls back.
  function cine(kind, dur, then, pull = 0, mid = null) {   // mid: [seconds in, fn], a beat partway through (v52)
    game.state = "cine"; game.cine = { kind, t: 0, dur, then, pull, mid };
    VisualSystem.emit("transition", { kind });
    aim.active = false; cvs.classList.remove("aiming"); Sound.pullEnd(); setHint("");
  }
  function updateCine(dt) {
    const c = game.cine; if (!c) return;
    c.t += dt;
    if (boss && boss.cine) boss.cine(c, dt);
    if (c.mid && c.t >= c.mid[0]) { const f = c.mid[1]; c.mid = null; f(); }
    if (c.t >= c.dur) { game.cine = null; game.state = "ready"; if (c.then) c.then(); updateHud(); }
  }

  // ── the acts
  function stageReset() {
    Object.assign(game, { stage: 1, stageHits: 0, hits: 0, phase: "A", act: 0, cine: null, freeze: 0 });
    boss = null; seeds.length = 0; deathReset(); setRingMode("line", false); hideStageCard(); clearDirectors();
  }
  // which ten-hit section of the map the run is in: 0–2 the first half's acts, 3 the approach, 4 the end boss
  const actOf = h => (h < STAGE_MINI ? Math.floor(h / ACT_LEN) : h < STAGE_BOSS ? 3 : 4);
  const ROMAN = ["I", "II", "III", "IV", "V"];
  const actName = (i, n = game.stage) => (mapData(n).acts || [])[i] || "";
  // called once a throw has settled: has the player just earned the next act?
  function stageCheck() {
    if (game.lives <= 0) return false;
    if (game.mode !== "story" && !arcadeLike()) return false;   // (the other modes move on in modeCheck: 07i_modes.js)
    if (arcadeLike()) {   // no bosses: at the mini-boss's hit the ring simply shakes loose and goes 3D, for good
      if (game.phase === "A" && game.stageHits >= STAGE_MINI) { arcadeGo3D(); return true; }
      return false;
    }
    if (boss && boss.dead) { if (game.phase === "mini") miniBossDown(); else mainBossDown(); return true; }
    if (boss && boss.phaseDue) { bossPhaseCard(); return true; }
    if (game.phase === "A" && game.stageHits >= STAGE_MINI) { startMiniBoss(); return true; }
    if (game.phase === "B" && game.stageHits >= STAGE_BOSS) { startMainBoss(); return true; }
    actCheck();
    return false;
  }
  // every ten hits of the first half a new act, with its own name on a card (it doesn't stop the throw)
  function actCheck() {
    const a = actOf(game.stageHits || 0);
    if (game.phase !== "A" || a <= (game.act || 0)) return;
    game.act = a; Sound.toon("xylo"); Telemetry.emit("act", { stage: game.stage, act: a + 1 });
    if (game.mode === "story") sawArea(game.stage, a);   // (v50: the Codex's Areas)
    stageCard(t("card.act.k", { n: ROMAN[a] }), actName(a), t("card.act.s", { n: STAGE_MINI - game.stageHits, boss: BOSS_INFO[bossIds().mini].name }), 2.0);
  }
  function arcadeGo3D() {
    game.phase = "B"; clearPickups(); Sound.toon("brass");
    stageCard(t("card.go3d.k"), t("card.go3d.t"), t("card.go3d.s"), 2.2, "gold");
    cine("mini-out", 2.2, () => { snapRing(); setHint(t("hint.watch")); obstaclesSync(); updateHud(); }, 0.45);
    setRingMode(bMode()); snapRing(); ring.morph = 1; Sound.setAct("B");
    updateHud();
  }
  const bossIds = (n = game.stage) => mapData(n).bosses;
  function startMiniBoss() {
    game.phase = "mini"; clearPickups(); clearPowers(); clearDirectors(); Sound.toon("brass"); Sound.setAct("boss");
    boss = makeBoss(bossIds().mini, game.stage); setRingMode("boss"); snapRing(); obstaclesSync(true); Telemetry.emit("boss_start", { kind: boss.kind, stage: game.stage, tier: "mini" });
    stageCard(t("card.mini.k"), BOSS_INFO[boss.kind].name, t("card.mini.s", { n: boss.max }), 2.3, "boss"); mortySays("boss." + boss.kind, { priority: true }); camMove("dutch"); Sound.motif(boss.kind);
    cine("mini-in", 2.3, () => setHint(BOSS_INFO[boss ? boss.kind : "crow"].hint));
    updateHud();
  }
  function miniBossDown() {
    profile.miniKills++; profile.bossLog[boss.kind] = (profile.bossLog[boss.kind] || 0) + 1; if (boss.flawless) profile.miniFlawless++; game.run.bosses++;
    const bonus = Math.round(2500 * stageMult() * (boss.flawless ? 1.5 : 1));
    mortySays("bossdown", { priority: true });
    // hit 40: he drops the ring and it breaks loose, flying on its own. The approach begins (and the first throw through
    // the loose ring catches it: 07_game.js)
    game.stageHits = Math.max(game.stageHits || 0, STAGE_LOOSE); game.act = 3; game.run.catchDue = 1;
    if (game.mode === "story") sawArea(game.stage, 3);
    // the reward waits for the defeat to play (07r_bossdeath.js's timing budget): then the bonus, the fanfare, the card
    const flawless = boss.flawless, REWARD_AT = 0.95;
    const reward = () => { game.score += bonus; flyPoints(`+${fmtN(bonus)}`, W / 2, H * 0.36, true); Sound.toon("fanfare"); updateHud();
      stageCard(t("card.miniDown.k"), t("card.loose.t"), `${t("card.loose.s", { act: actName(3) })}${flawless ? " · " + t("card.flawless") : ""}`, 2.6 - REWARD_AT + 0.6, "gold"); };
    // the rules change: the camera pulls back, the ring shakes loose and grows wings, the band changes key
    cine("mini-out", 2.6, () => { boss = null; game.phase = "B"; snapRing(); setHint(t("hint.catch")); obstaclesSync(); updateHud(); }, 0.55, [REWARD_AT, reward]);
    setRingMode(bMode()); snapRing(); ring.morph = 1; Sound.setAct("B");
    checkUnlocks(); persist(); updateHud();
    challenge("bosses", 1);
  }
  // the first make through the loose ring: caught! (the Crow King's encounter is done)
  function catchLooseRing(x, y) {
    if (!game.run.catchDue || game.phase !== "B" || boss) return;
    game.run.catchDue = 0; const bonus = Math.round(500 * stageMult());
    game.score += bonus; profile.scoreTotal += bonus; profile.ringCatches++;
    impact(t("result.catch"), x, y - U * 0.16, { fill: GOLD, text: INK, scale: 0.7, delay: 0.3, bits: false }); flyPoints(`+${fmtN(bonus)}`, x, y - U * 0.02, false);
    Sound.toon("whistleUp"); setHint(t("hint.watch"));
  }
  function startMainBoss() {
    game.phase = "boss"; game.act = 4; clearPickups(); clearPowers(); clearDirectors(); Sound.toon("brass"); Sound.setAct("boss");
    boss = makeBoss(bossIds().end, game.stage); setRingMode("boss"); snapRing(); obstaclesSync(); Telemetry.emit("boss_start", { kind: boss.kind, stage: game.stage, tier: "end" });
    stageCard(t("card.boss.k"), BOSS_INFO[boss.kind].name, `${t("card.phase.k", { n: ROMAN[0] })} · ${bossPhaseName(boss, 0)}`, 2.6, "boss"); mortySays("boss." + boss.kind, { priority: true }); camMove("dutch"); Sound.motif(boss.kind);
    cine("boss-in", 2.6, () => setHint(bossHint(boss)), 0.35);
    updateHud();
  }
  // the end boss's three phases (hits 51–60, 61–70, 71–80): a card between them, and a beat to take it in
  const bossPhaseName = (B, i) => t(`phase.${B.kind === "pumpkin" ? "pumpkin" : "any"}.${i + 1}`);
  const bossHint = B => (B && B.kind === "pumpkin" && B.phase === 2 ? t("hint.pkMouth") : BOSS_INFO[B ? B.kind : "pumpkin"].hint);
  function bossPhaseCard() {
    const B = boss; B.phaseDue = false; const i = B.phase;
    Sound.toon("rumble"); Sound.toon("brass"); VisualSystem.triggerCameraJolt("thunder"); Telemetry.emit("boss_phase", { kind: B.kind, phase: i + 1 });
    stageCard(t("card.phase.k", { n: ROMAN[i] }), bossPhaseName(B, i), t("card.phase.s", { n: B.hp }), 1.6, "boss");
    cine("boss-phase", 1.4, () => setHint(bossHint(boss)), 0.2);
    updateHud();
  }
  function mainBossDown() {
    clearStageForDefeat();   // (v54: the ring, its pole and the targets go at once; the defeat plays on an empty stage, 07t_portal.js)
    plusMapDone();   // (v51: Adventure+'s Perfect Map, 07s_plus.js)
    profile.bossKills++; if (boss.flawless) { profile.bossFlawless++; profile.flawless[boss.kind] = 1; } game.run.bosses++;
    profile.bossLog[boss.kind] = (profile.bossLog[boss.kind] || 0) + 1;
    profile.bestStage = Math.max(profile.bestStage, game.stage + 1); game.stageHits = Math.max(game.stageHits || 0, STAGE_END);
    // the corrected roadmap's progression: END BOSS → BODY-PART REWARD → BLACK RING SHARD → BONUS ROUND (optional) → CROSSING → NEXT MAP
    const M = mapData(game.stage), frag = M.fragment, fresh = !profile.fragments.includes(frag), part = BODY_PART[boss.kind], partKey = part ? part.kind + ":" + part.id : "";
    if (fresh) profile.fragments.push(frag);
    game.run.fragments = (game.run.fragments || []).concat(frag);
    if (part && !profile.unlocked.includes(partKey)) profile.unlocked.push(partKey);   // the body part: his to wear from now on
    game.run.parts = (game.run.parts || []).concat(partKey);
    const partName = part && findItem(part.kind, part.id) ? findItem(part.kind, part.id).name : "";
    Telemetry.emit("fragment", { id: frag, fresh, stage: game.stage }); mortySays("fragment." + frag, { priority: true });
    const shardCard = then => { stageCard(t("card.shard.k"), FRAGMENTS[frag].name, t("card.shard.s", { n: profile.fragments.length, total: MAP_COUNT }), 2.3, "gold"); Sound.toon("xylo"); cine("reward", 2.3, then, 0.3); };
    if (game.stage >= MAP_COUNT) {   // the last shard: the reward, the shard, and the Black Ring whole
      const card = () => stageCard(t("card.reward.k"), partName, t("card.reward.s", { slot: KIND_LABEL[part ? part.kind : "hat"] }), 2.4 - 1.1 + 0.6, "gold");
      cine("boss-out", 2.4, () => shardCard(() => storyComplete()), 0.4, [1.1, card]); checkUnlocks(); persist(); updateHud(); return;
    }
    const bonus = Math.round((10000 + (boss.flawless ? 5000 : 0)) * stageMult());
    const bones = 150 + game.stage * 50; addBones(bones); game.run.bossBones = (game.run.bossBones || 0) + bones;
    // the reward waits for the defeat: the boss's own cartoon plays clear first (07r_bossdeath.js's timing budget), then
    // the bonus flies in, the fanfare, and the map-clear card
    const flawless = boss.flawless, REWARD_AT = 1.1;
    const reward = () => {
      game.score += bonus; flyPoints(`+${fmtN(bonus)}`, W / 2, H * 0.36, true); updateHud();
      stageCard(t("card.clear.k", { map: M.name }), t("card.clear.t", { piece: partName }), `${t("card.clear.s", { bones })}${flawless ? " · " + t("card.flawless") : ""}`, 2.8 - REWARD_AT + 0.6, "gold");
      Sound.toon("fanfare");
    };
    changeoverCues(2.8 + 2.3);
    const nextMap = () => {
      game.stage++; game.stageHits = 0; game.phase = "A"; game.act = 0; game.ringHidden = false; VisualSystem.setStage(game.stage); setScene(game.stage - 1);
      if (game.lives < MAX_LIVES) { game.lives++; game.slots = Math.max(game.slots, game.lives); }
      setRingMode("line"); snapRing(); Sound.setAct("A"); hazardsReset(); refillTargets();
      nextReel();   // the next reel's title card (and the intermission, halfway): 09i_reel.js
      updateHud();
    };
    // the boss goes down, then (Story) the encore: ten seconds of Curtain Call for bones (07i_modes.js), then the next map
    // then his body section flies home (07p_body.js), the shard, Can Alley if you want it (07o_bonus.js), and the crossing
    // into the next map, the Challenge Stage (07q_crossing.js)
    const onward = () => (crossingsOn() ? startCrossing(nextMap) : nextMap());
    // v54: the way on is a portal you throw Morty through (07t_portal.js): into Can Alley if you take it, and from there
    // (or straight away if you don't) on towards the next map
    cine("boss-out", 2.8, () => { boss = null; seeds.length = 0; obstaclesSync(true); bodyReward(() => shardCard(() => { if (encoreOn()) offerBonus(onward); else portalTo("map", onward); })); }, 0.4, [REWARD_AT, reward]);
    checkUnlocks(); persist(); updateHud();
    challenge("bosses", 1);
  }
  // the last end boss: THE END. Morty is whole again and the run is over, won.
  function storyComplete() {
    boss = null; seeds.length = 0;
    const firstClear = !profile.storyClears; profile.storyClears++; game.run.story = true;
    if (firstClear && !game.plus && !sandbox) setTimeout(() => toast(`<b>${t("plus.kicker")}</b> · ${t("plus.unlocked")}`), 2500);   // (v51: the way back in, 07s_plus.js)
    Sound.toon("fanfare"); Telemetry.emit("story_complete", { score: game.score, secs: Math.round(game.time - (game.run.t0 || 0)) });
    const done = card => { gameOver(card); };
    if (cardsMode() === "off") { stageCard(t("reel.theEnd"), t("reel.whole"), t("reel.restored"), 3.4, "gold"); cine("boss-out", 3.4, () => done(true), 0.4); }
    else cine("boss-out", 1.6, () => endReel(() => done(false)), 0.4);   // the boss falls, then THE END card (09i_reel.js)
    checkUnlocks(); persist(); updateHud();
    challenge("bosses", 1);
  }
  const stageMult = () => 1 + 0.25 * ((game.stage || 1) - 1);
  function freezeFrame(sec) { if (!reduceMotion) game.freeze = Math.max(game.freeze || 0, sec); }

  // ── the HUD: a small progress bar above the skulls (the boss's health during a fight)
  const progEl = $("prog"), progFill = $("progFill"), progSt = $("progStage"), progLbl = $("progLabel"), progArc = $("progArc");
  function renderProgress() {
    if (!progEl) return;
    if (modeProgress()) return;   // Practice, Boss Rush, the mini-games and the encore (07i_modes.js)
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
    if ((game.mode === "director" || game.mode === "feature") && game.state !== "title") {   // no bosses to count down to: the run's clock, and the hits to the ring's third dimension
      const secs = game.state === "over" ? game.run.secs || 0 : arcadeSecs(), h = Math.min(game.stageHits || 0, STAGE_MINI);
      progEl.classList.remove("fight", "half", "beat"); delete progEl.dataset.boss; progEl.classList.toggle("arcade", true);
      progArc.textContent = `${Math.floor(secs / 60)}:${String(Math.floor(secs) % 60).padStart(2, "0")}`;
      progFill.style.width = (100 * h / STAGE_MINI).toFixed(1) + "%";
      progLbl.textContent = `${STAGES[game.map].name} · ${game.mode === "director" ? t("director.k") : t(`season.${(game.feature && game.feature.season) || "s1"}.feature`)}`;
      return;
    }
    const fighting = !!boss && (game.phase === "mini" || game.phase === "boss"), phased = fighting && game.phase === "boss";
    progEl.classList.toggle("fight", fighting);
    progEl.classList.toggle("phases", phased);   // (the end boss's bar shows its three phases)
    progEl.classList.toggle("half", game.phase !== "A" && !fighting);
    progSt.textContent = game.stage || 1;
    if (fighting) {
      progFill.style.width = (100 * Math.max(0, boss.hp) / boss.max).toFixed(1) + "%";
      progLbl.textContent = boss.dead ? "Down!" : `${boss.short}${phased ? ` · ${ROMAN[boss.phase || 0]}` : ""} · ${Math.max(0, boss.hp)}`; progEl.dataset.boss = boss.kind;
    } else {   // the whole map, 80 hits: the mini-boss's mark at 30, the end boss's at 50
      const h = Math.min(game.stageHits || 0, STAGE_END);
      progFill.style.width = (100 * h / STAGE_END).toFixed(1) + "%";
      const B = bossIds();
      progLbl.textContent = h < STAGE_MINI ? `${STAGE_MINI - h} to ${BOSS_INFO[B.mini].name.replace(/^The /, "the ")}` : `${Math.max(0, STAGE_BOSS - h)} to ${BOSS_INFO[B.end].name.replace(/^The /, "the ")}`;
      delete progEl.dataset.boss;
    }
    progEl.querySelector(".mini").classList.toggle("done", (game.stageHits || 0) >= STAGE_MINI);
  }
