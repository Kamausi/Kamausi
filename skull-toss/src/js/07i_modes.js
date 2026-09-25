  // ───────────────────────── more ways to play ─────────────────────────
  // Story and Arcade are the game. Around them:
  //   Practice     any map you've reached, as long as you like. Misses cost nothing, and nothing counts: the run
  //                plays on a copy of your profile, so no stat, bone, challenge or medal moves. The ring can stand
  //                still, go slow or run at full speed, flat or in 3D, with the map's hazards on or off.
  //   Boss Rush    every boss you've beaten, back to back: three skulls, one more after each end boss.
  //   Curtain Call twenty seconds, as many makes as you can; misses cost nothing (a mini-game)
  //   Longshot     a still ring that backs off after every make: how far can you reach? (a mini-game)
  //   Target Gallery ten throws through a still ring at the targets hanging behind it (a mini-game)
  // Boss Rush opens once you've put an end boss down; the mini-games (v46: with Can Alley among them) are open from the start. v45: after every end boss but the last the
  // Adventure offers a bonus round, Can Alley (07o_bonus.js): the "encore" phase, where misses are free.
  const MODES = {
    story:    { lives: true, cont: true, board: true },
    arcade:   { lives: true, cont: true, maps: true },
    practice: { maps: true, free: true, open: () => true },
    rush:     { lives: true, open: () => profile.bossKills > 0 },
    curtain:  { free: true, mini: true, clock: 20, map: 7 },   // (v46: the mini-games are open from the start, on their own card)
    longshot: { lives: true, mini: true, map: 3 },
    gallery:  { lives: true, mini: true, throws: 10, map: 5 },
    cans:     { free: true, mini: true, map: 0 },              // v46: Can Alley on its own (07o_bonus.js): ten cans, twenty-five seconds
    director: { lives: true, open: () => true },  // the Director's Challenge (07k_director.js): the week's map, whatever you've reached
    feature:  { lives: true, open: () => !!seasonNow() }   // the season's Feature (07l_season.js): only while a season's on
  };
  const arcadeLike = () => game.mode === "arcade" || game.mode === "director" || game.mode === "feature";   // (no bosses; the ring goes 3D at 30 hits and keeps winding up)
  const MODE_IDS = Object.keys(MODES), MINI_IDS = MODE_IDS.filter(m => MODES[m].mini);
  const modeOf = () => MODES[game.mode] || MODES.story;
  const freeMiss = () => !!modeOf().free || game.phase === "encore" || game.phase === "crossing";   // a miss that costs no skull
  const LONGSHOT = { z0: 4.6, step: 0.4, zMax: 14 };
  const practice = { ring: "full", half: "A", hazards: true };   // the Practice options (the Play sheet sets them)
  const modeSt = { real: null, rush: [], rushI: 0, clock: 0, far: 0, targetsHit: 0 };
  const inPractice = () => !!modeSt.real;
  const realProfile = () => modeSt.real || profile;   // what gets saved, whatever the run is playing on
  const modeRec = m => realProfile().modes[m] || { best: 0, runs: 0 };
  // the most reached map a mini-game can use (each has a home map it prefers)
  const miniMap = m => Math.min(MODES[m].map || 0, Math.max(0, Math.min(profile.bestStage, MAP_COUNT) - 1));
  const encoreOn = () => !(sandbox && !sandbox.encoreOn);
  const crossingsOn = () => !(sandbox && !sandbox.crossOn);   // (older tests expect the next reel straight after a boss)

  // ── starting and leaving
  function leavePractice() {
    if (!modeSt.real || Replay.play) return;   // (a replay gives the profile back itself)
    const P = modeSt.real; modeSt.real = null; profile = P;
    const R = profile.modes.practice || (profile.modes.practice = { best: 0, runs: 0 }); R.runs++; R.throws = (R.throws || 0) + game.throws;
    persist(1500); updateHud();
  }
  function modeStart(mode) {
    leavePractice();
    if (mode === "practice" && !Replay.play) { modeSt.real = profile; profile = JSON.parse(JSON.stringify(profile)); }   // a copy to play on
    Object.assign(modeSt, { rush: [], rushI: 0, clock: MODES[mode].clock || 0, far: 0, targetsHit: 0 });
  }
  function modeBegin() {   // after startGame has set the run up: each mode's own opening
    const m = game.mode;
    if (m === "practice") {
      if (practice.half === "B") { game.phase = "B"; setRingMode(bMode(), false); ring.morph = 1; Sound.setAct("B"); }
      if (practice.ring === "still") ring.frozen = { x: 0, y: RING_Y, z: RING_Z };
    } else if (m === "rush") {
      if (Replay.play && Replay.play.R.rush) for (const id of Replay.play.R.rush) { const n = MAP_DATA.findIndex(M => M.bosses.mini === id || M.bosses.end === id) + 1; modeSt.rush.push({ id, stage: n, end: mapData(n).bosses.end === id }); }
      else for (let n = 1; n <= MAP_COUNT; n++) { const B = mapData(n).bosses; if (profile.bossLog[B.mini]) modeSt.rush.push({ id: B.mini, stage: n, end: false }); if (profile.bossLog[B.end]) modeSt.rush.push({ id: B.end, stage: n, end: true }); }
      if (!modeSt.rush.length) modeSt.rush.push({ id: "crow", stage: 1, end: false });
      rushBoss();
    } else if (m === "longshot") { ring.frozen = { x: 0, y: RING_Y, z: LONGSHOT.z0 }; }
    else if (m === "gallery") { ring.frozen = { x: 0, y: RING_Y, z: RING_Z }; galleryTargets(); }
    if (m === "cans") startEncore(() => gameOver(true));   // (the bonus round, played for its own sake: no map to go on to)
    else if (MODES[m].mini) stageCard(t(`mode.${m}.name`), t(`mode.${m}.rule`), "", 2.2, "gold");
    if (m === "director") directorBegin();
    if (m === "feature") featureBegin();
  }
  // ── the ring, mode by mode (ringTargets asks first)
  function modeRing() {
    if (game.phase === "encore") return { amp: 0, omega: 0, rc: RC_START + CANS.rc, bob: 0 };   // Can Alley: a still, generous ring
    if (game.phase === "crossing") return { amp: 0, omega: 0, rc: game.run.crossRc || RC_START, bob: 0 };   // the Challenge Stage: rings on the road (07q_crossing.js)
    if (game.mode === "curtain") { const L = level(24); return { amp: 1.35, omega: 1.5, rc: L.rc + 0.02, bob: 0.14 }; }
    if (game.mode === "practice" && practice.ring === "slow") { const L = level(aLevel(game.stageHits || 0)); return { ...L, omega: L.omega * 0.5 }; }
    return null;
  }
  // ── after each throw has settled: true if the mode moved the run on (stageCheck's place)
  function modeCheck() {
    const m = game.mode, make = game.result && game.result.make;
    if (game.phase === "crossing") return crossingCheck();
    if (game.phase === "encore") { if (game.run.encoreEnd != null && (!cansLeft() || game.time >= game.run.encoreEnd)) { encoreDone(); return true; } return true; }   // (the cans are the round: no director between throws)
    if (m === "rush") { if (boss && boss.dead) { rushNext(); return true; } return false; }
    if (m === "curtain") { if (modeSt.clock <= 0) { gameOver(true); return true; } return false; }
    if (m === "longshot" && make) {
      modeSt.far = Math.max(modeSt.far, game.lastCross ? game.lastCross.ringZ : 0);
      const z = Math.min(LONGSHOT.zMax, ring.z + LONGSHOT.step), x = clamp(rrIn(-1, 1) * Math.min(1.4, (z - LONGSHOT.z0) * 0.3), -1.4, 1.4);
      ring.glide = { from: { x: ring.x, y: ring.y, z: ring.z }, t: 0, dur: 0.6 }; ring.frozen = { x, y: RING_Y, z };
      return false;
    }
    if (m === "gallery") {
      if (game.throws >= MODES.gallery.throws) { gameOver(true); return true; }
      if (!targets.some(T => !T.pop)) galleryTargets();
      return true;   // (the gallery's targets are its own: no director refills them)
    }
    return m === "practice";   // Practice: no bosses, no director between throws beyond the hazards
  }
  // the clock (Curtain Call and the encore): runs in play; the throw in the air when it runs out still counts
  function updateModes(dt) {
    if (game.mode === "curtain" && inRun() && game.state !== "cine") {
      modeSt.clock = Math.max(0, modeSt.clock - dt);
      if (modeSt.clock <= 0 && game.state === "ready") gameOver(true);
    }
    if (game.phase === "encore" && game.state === "ready" && game.time >= game.run.encoreEnd) encoreDone();
    const sec = game.mode === "curtain" ? Math.ceil(modeSt.clock) : game.phase === "encore" ? Math.ceil(game.run.encoreEnd - game.time) : null;   // (the clocks tick on the HUD)
    if (sec !== null && sec !== modeSt.shownSec) { modeSt.shownSec = sec; renderProgress(); }
  }

  // ── Boss Rush: the next boss on the list walks on; the list done, the run is won
  function rushBoss() {
    const B = modeSt.rush[modeSt.rushI];
    if (game.stage !== B.stage) { game.stage = B.stage; VisualSystem.setStage(B.stage); setScene(B.stage - 1); hazardsReset(); }
    game.phase = B.end ? "boss" : "mini"; clearPickups(); clearDirectors(); Sound.toon("brass"); Sound.setAct("boss");
    boss = makeBoss(B.id, B.stage); setRingMode("boss"); snapRing();
    stageCard(t("mode.rush.card", { n: modeSt.rushI + 1, total: modeSt.rush.length }), BOSS_INFO[B.id].name, BOSS_INFO[B.id].tell, 2.4, "boss");
    mortySays("boss." + B.id, { priority: true }); camMove("dutch"); Sound.motif(B.id);
    cine(B.end ? "boss-in" : "mini-in", 2.4, () => setHint(BOSS_INFO[boss ? boss.kind : B.id].hint), B.end ? 0.35 : 0);
    updateHud();
  }
  function rushNext() {
    const B = modeSt.rush[modeSt.rushI]; game.run.bosses++; profile.bossLog[B.id] = (profile.bossLog[B.id] || 0) + 1;
    if (B.end && game.lives < MAX_LIVES) { game.lives++; game.slots = Math.max(game.slots, game.lives); }
    const bonus = Math.round((B.end ? 5000 : 2500) * stageMult()); game.score += bonus; flyPoints(`+${fmtN(bonus)}`, W / 2, H * 0.36, true);
    Sound.toon("fanfare"); mortySays("bossdown", { priority: true });
    modeSt.rushI++;
    if (modeSt.rushI >= modeSt.rush.length) { game.run.rushDone = true; cine("boss-out", 2.4, () => { boss = null; seeds.length = 0; gameOver(true); }, 0.4); return; }
    cine("boss-out", 2.4, () => { boss = null; seeds.length = 0; rushBoss(); }, 0.4);
  }

  // ── the Target Gallery: five targets hang behind a still ring, each on a line you can throw through the hole
  function galleryTargets() {
    targets.length = 0;
    const inner = ring.rc - RING_TUBE - SKULL_R, own = mapData(game.stage).target, kind = own === "frog" ? mapData(1).target : own;   // (a frog sits on the ground)
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU + rrIn(-0.3, 0.3), r = inner * rrIn(0.15, 0.7), cx = Math.cos(a) * r, cy = RING_Y + Math.sin(a) * r;
      const z = RING_Z + rrIn(1.4, 3.2), T = flightT(), tc = RING_Z * T / RING_Z, vy = (cy - START_Y + 0.5 * G * tc * tc) / tc;   // the throw through (cx, cy) at the ring…
      const t2 = z / (RING_Z / T), x = (cx / RING_Z) * z, y = START_Y + vy * t2 - 0.5 * G * t2 * t2;                                   // …and where it is at the target's depth
      targets.push({ kind, x, y, z, t: 0, left: 99, pop: 0, ph: rrIn(0, TAU), via: { x: cx, y: cy } });   // via: where to throw through the ring
      sawIt("target", kind);
    }
  }

  // ── the Adventure's bonus round, taken (07o_bonus.js has the cans and the offer)
  function startEncore(then) {
    game.phase = "encore"; game.run.encoreEnd = game.time + CANS.secs + 1.8; game.run.encoreThen = then; game.run.encoreMakes = 0; game.run.bonusT0 = game.throws;
    profile.bonusRounds++; clearPickups(); clearDirectors();
    setRingMode("line", false); ring.morph = 0; ring.frozen = { x: 0, y: RING_Y, z: RING_Z }; snapRing(); canLayout(); Sound.setAct("A");
    stageCard(t("cans.k"), t("cans.name"), t("cans.rule", { n: cans.length, secs: CANS.secs }), 1.8, "gold");
    mortySays("encore", { priority: true }); updateHud();
  }
  function encoreMake() { if (game.phase === "encore") game.run.encoreMakes++; }
  function encoreDone() {
    if (game.phase !== "encore") return;
    const then = game.run.encoreThen, n = cans.filter(c => c.down).length, total = cans.length, clear = total > 0 && n === total, stage = game.stage;
    game.run.encoreEnd = null; game.run.encoreThen = null;
    const story = game.mode === "story", bones = n * CANS.per + (clear && story ? canClearBonus(stage) : 0); addBones(bones);   // (the clear bonus and the prizes are the Adventure's) game.run.bossBones = (game.run.bossBones || 0) + bones; game.run.canBones = (game.run.canBones || 0) + bones;
    const P = canPrize(stage), key = P ? `${CAN_PRIZES[stage - 1][0]}:${P.id}` : "", had = !key || profile.unlocked.includes(key);
    if (clear) { profile.canClears++; if (story) { profile.canAlley = profile.canAlley || {}; profile.canAlley[stage] = (profile.canAlley[stage] || 0) + 1; } checkUnlocks(); }
    const won = !had && profile.unlocked.includes(key);
    if (won) game.run.prizes = (game.run.prizes || []).concat(key);
    stageCard(clear ? t("cans.clear") : t("cans.time"), t("cans.count", { n, total }), t("cans.paid", { bones }) + (won ? " · " + t("cans.won", { name: P.name }) : ""), 2.2, "gold");
    Sound.toon(clear ? "fanfare" : "xylo"); Telemetry.emit("bonus_done", { stage, cans: n, clear, prize: won ? key : "" });
    cine("mini-out", 2.2, () => { clearCans(); ring.frozen = null; if (then) then(); }, 0);
    persist(); updateHud();
  }

  // ── the HUD's progress bar, mode by mode: a clock for Curtain Call and the encore, a reach for Longshot, the throws
  // left in the Gallery, how far into the list in Boss Rush (its fights use the boss's own bar)
  function modeProgress() {
    const m = game.mode; if (game.state === "title" || (m === "story" && game.phase !== "encore" && game.phase !== "crossing") || m === "arcade" || m === "director" || m === "feature") return false;   // (the Director's and the Feature's are renderProgress's own: 07b_stage.js)
    const fighting = !!boss && (game.phase === "mini" || game.phase === "boss");
    if (m === "rush" && fighting) { progSt.textContent = modeSt.rushI + 1; return false; }   // (the boss's health bar, as in Story)
    progEl.classList.remove("fight", "half", "beat"); delete progEl.dataset.boss;
    const clock = game.phase === "encore" ? Math.max(0, (game.run.encoreEnd || game.time) - game.time) : m === "curtain" ? modeSt.clock : -1;
    progEl.classList.toggle("arcade", clock >= 0);
    if (clock >= 0) { progArc.textContent = `0:${String(Math.ceil(clock)).padStart(2, "0")}`; progFill.style.width = (100 * clock / (game.phase === "encore" ? CANS.secs + 1.8 : MODES.curtain.clock)).toFixed(1) + "%"; }
    else progSt.textContent = game.stage || 1;
    if (game.phase === "encore") progLbl.textContent = t("prog.encore", { n: cans.filter(c => c.down).length, total: cans.length });
    else if (game.phase === "crossing") { const n = game.run.crossN || 0; progLbl.textContent = t("prog.cross", { map: mapData(game.stage + 1).name, n, total: CROSS.throws }); progFill.style.width = (100 * n / CROSS.throws).toFixed(1) + "%"; }
    else if (m === "curtain") progLbl.textContent = t("prog.curtain", { n: game.hits });
    else if (m === "longshot") { const best = modeRec("longshot").best / 10; progLbl.textContent = t("prog.longshot", { m: ring.z.toFixed(1), best: Math.max(best, modeSt.far).toFixed(1) }); progFill.style.width = (100 * clamp((ring.z - LONGSHOT.z0) / (LONGSHOT.zMax - LONGSHOT.z0), 0, 1)).toFixed(1) + "%"; }
    else if (m === "gallery") { const left = Math.max(0, MODES.gallery.throws - game.throws); progLbl.textContent = t("prog.gallery", { n: game.run.targets || 0, left }); progFill.style.width = (100 * left / MODES.gallery.throws).toFixed(1) + "%"; }
    else if (m === "practice") { progLbl.textContent = t("prog.practice", { makes: game.hits, throws: game.throws }); progFill.style.width = (game.throws ? (100 * game.hits) / game.throws : 0).toFixed(1) + "%"; }
    else if (m === "rush") { progLbl.textContent = t("prog.rush", { n: Math.min(modeSt.rush.length, modeSt.rushI + 1), total: modeSt.rush.length }); progFill.style.width = (100 * modeSt.rushI / Math.max(1, modeSt.rush.length)).toFixed(1) + "%"; }
    return true;
  }

  // ── records, when a run in one of these modes ends
  function modeRecords() {
    const m = game.mode;
    if (m === "director") { directorAfterRun(); game.run.modeValue = game.score; return; }   // (its record is the week's: 07k_director.js)
    const R = profile.modes[m] || (profile.modes[m] = { best: 0, runs: 0 });
    const value = m === "rush" ? game.run.bosses : m === "curtain" ? game.hits : m === "longshot" ? Math.round(modeSt.far * 10) : m === "gallery" ? (game.run.targets || 0) : m === "cans" ? (game.run.cans || 0) : m === "feature" ? game.score : 0;
    game.newBest = value > R.best; R.best = Math.max(R.best, value); R.runs++;
    if (m === "rush" || MODES[m].mini) challenge("modeRuns", 1);
    if (m === "rush") R.score = Math.max(R.score || 0, game.score);
    game.run.modeValue = value;
    Telemetry.emit("mode_end", { mode: m, value, best: R.best });
  }
  const modeValueText = (m, v) => m === "feature" ? t("mode.feature.v", { n: fmtN(v) }) : m === "longshot" ? t("mode.longshot.m", { m: (v / 10).toFixed(1) }) : m === "rush" ? t("mode.rush.bosses", { n: v }) : m === "gallery" ? t("mode.gallery.targets", { n: v }) : m === "cans" ? t("mode.cans.n", { n: v }) : t("mode.curtain.makes", { n: v });
