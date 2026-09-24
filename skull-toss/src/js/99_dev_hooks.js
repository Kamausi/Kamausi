  // ───────────────────────── test hooks (dev build only: python3 src/build.py --dev) ─────────────────────────
  // These can change the game (bones, stats, the leaderboard), so the release and published builds leave this part out.
  // TEST_SPEC.js drives the game through them with the clock paused.
  Object.assign(window.SkullToss.debug, {
    constants: { G, SKULL_R, START_Y, RING_Z, RING_Y, RING_TUBE, RC_START, RC_MIN, POST_HALF, FLIGHT_T, START_LIVES, MAX_LIVES },
    level, catalog: () => JSON.parse(JSON.stringify(CATALOG)), bandStyle: () => ({ id: cos.band, ...(BANDS[cos.band] || {}) }), wearOutfit: i => wearOutfit(i), saveOutfit: i => saveOutfit(i), surprise: () => surpriseLook(),
    reqText: (k, n) => REQ_TEXT[k](n), cleanProfile: p => cleanProfile(p),
    async fakeServer(uid) { Backend.reset(); Backend.useFake(uid); await Souls.connect(); return Backend.kind; }, noServer() { Backend.reset(); Souls.connect(); },
    setWallet(w) { Souls.set(w); }, levelFor: xp => levelFor(xp), xpForLevel: L => xpForLevel(L),
    shape: (f, type, dur, peak, slide, o) => soundShape(f, type, dur, peak, slide, o), motifPlan: id => motifPlan(id), sting: r => playSting(r), soundSets: () => SOUNDSET_IDS.slice(), soundRoom: () => soundRoom(),
    claimMastery: (cat, id, i) => claimMastery(cat, id, i), masteryClaimable: () => masteryClaimable(), tierReached: (cat, id, i) => tierReached(cat, id, i),   // (the client's view only: for drawing tests)
    watchReplay: () => Replay.watch(Replay.last), replaying: () => !!Replay.play, lastReplay: () => Replay.last && JSON.parse(JSON.stringify(Replay.last)),
    encodeReplay: R => Replay.encode(R), decodeReplay: s => Replay.decode(s), replayLink: R => Replay.link(R), offerShared(R) { sharedReplay = R; renderSharedOffer(); }, stopReplay: () => Replay.stop(true),
    submitBoard: () => Board.submit(), lastSubmit: () => Board.lastSubmit, serverDoc: p => (Backend.fakeDocs && Backend.fakeDocs.has(p) ? JSON.parse(JSON.stringify(Backend.fakeDocs.get(p))) : null),
    advanceServerClock(ms) { Backend.fakeClock = (Backend.fakeClock || 0) + ms; }, weekOf: ms => Runs.weekOf(ms), checkRun: r => Runs.check(r),
    wallet: () => Souls.wallet && JSON.parse(JSON.stringify(Souls.wallet)), soulsApi: () => Souls, callServer: (name, data) => Backend.call(name, data), exportCode: () => exportCode(), economy: () => Economy,
    start() { startGame(); },
    pause(on = true) { manual = on; },
    simStep: SIM_STEP, simAdvance: dt => advance(dt), simReset() { simAcc = 0; },   // the live loop's fixed step
    setScene: i => setScene(i), mapUnlocked: i => mapUnlocked(i), goWords: () => $("gameOver").textContent,
    scene: () => ({ map: sceneMap, props: GY.props.length, kinds: [...new Set(GY.props.map(p => p.kind))].sort(), weather: WX.kind, bits: WX.bits.length, moon: moon.kind, fg: fgLayer.length,
      clear: GY.props.every(p => p.kind === "digger" || clearOfLane(p.x, p.z)), clouds: world.clouds.length }),
    maps: () => JSON.parse(JSON.stringify(MAP_DATA)),
    implemented: () => ({ skyline: Object.keys(SKYLINES), lane: Object.keys(LANES), props: Object.keys(PROPSETS), foreground: Object.keys(FOREGROUNDS), near: Object.keys(NEAR_SETS),
      weather: ["none", "mist", ...Object.keys(WX_COUNT)], moon: ["art", "none", "crescent", "harvest", "full", "screen"], registry: MAP_REGISTRY }),
    calm() { HZ.kind = "none"; HZ.list = []; HZ.wind = 0; HZ.fogT = 0; HZ.fog = 0; renderWind(); },   // (for set-up throws that aren't about hazards)
    setLives(n) { game.lives = n; updateHud(); }, cont: () => game.cont && { ...game.cont }, continueRule: () => continueRule(),
    fakeAds(on) { Ads = on ? { available: () => true, show: () => ({ then: f => f(true) }) } : { available: () => false, show: () => Promise.resolve(false) }; },   // (a synchronous reel, for the spec)
    continues(on = true) { if (sandbox) sandbox.contOn = on; },
    cards(on = true) { if (sandbox) sandbox.cardsOn = on; reelSt.leaderShown = false; reelSt.shown = []; reelSt.cues = []; },
    skipReel: () => skipReelCard(), encore(on = true) { if (sandbox) sandbox.encoreOn = on; }, startMode(mode, map = 0) { startGame({ mode, map }); }, setPractice(o) { Object.assign(practice, o); },
    realProfile: () => JSON.parse(JSON.stringify(realProfile())), inPractice: () => inPractice(),
    modeState: () => ({ mode: game.mode, phase: game.phase, clock: modeSt.clock, far: modeSt.far, rush: modeSt.rush.map(b => b.id), rushI: modeSt.rushI, encoreEnd: game.run.encoreEnd, frozen: ring.frozen && { ...ring.frozen } }),
    targetsFull: () => targets.map(T => ({ ...T })), mischiefOn(on = true) { if (sandbox) sandbox.mischiefOn = on; }, misbehave: kind => misbehave(kind),
    misc: () => (updateCamFx(), { kind: misc.kind, log: misc.log.slice(), lastMap: misc.lastMap, css: cvs.style.transform, hand: misc.kind === "hand" ? handAt((game.time - misc.t0) / misc.dur) : null, wrong: reelEl.classList.contains("wrong") && !reelEl.hidden }),
    clearMisc() { misc.kind = null; misc.log = []; misc.lastMap = 0; misc.lastThrow = -99; }, secrets: () => realProfile().secrets.slice(), titleIdle(s) { sec.quietSince = uiNow() - s; sec.slept = false; },
    upwardPull() { secretUpward(); }, secretName: n => secretName(n), canvas: () => cvs, codex: () => ({ count: codexCount(), total: codexTotal(), seen: realProfile().met.slice(), archive: ARCHIVE.filter(A => A.open()).map(A => A.id) }), shots(on = true) { if (sandbox) sandbox.shotsOn = on; }, lastShots: () => (skull.shots || []).slice(), shotList: () => SHOTS.map(S => ({ id: S.id, rare: S.rare, cam: S.cam })),
    camfx: () => (updateCamFx(), { kind: camfx.kind, log: camfx.log.slice(), css: cvs.style.transform, spot: !!film.spot }), clearCamLog() { camfx.log = []; }, setStreak(n) { game.streak = n; }, bossInfo: () => Object.fromEntries(BOSS_IDS.map(id => [id, { ...BOSS_INFO[id] }])),
    tr: (id, vars) => t(id, vars), lineIds: prefix => lineIds(prefix).slice(),
    reel: () => ({ card: reelSt.card ? reelSt.card.kind : null, n: reelSt.card ? reelSt.card.n || 0 : 0, shown: reelSt.shown.slice(), cues: reelSt.cues.length, title: $("rcTitle").textContent, reel: $("rcReel").textContent, hidden: reelEl.hidden, cine: game.cine ? game.cine.kind : null, dur: game.cine ? game.cine.dur : 0 }),
    snapOn(on = true) { if (sandbox) { sandbox.snapOn = on; sandbox.snap = null; } }, snapshot: () => readRunSnapshot(),
    tier: () => ({ ...tierNow() }),
    // the Power-Up Director alone: n makes in a row from the start of the first half, noting the hits where a prop turned up
    powerRolls(n, phase = "A") { const out = [], was = game.result; game.phase = phase; game.stageHits = phase === "A" ? 0 : STAGE_MINI; powerDirectorReset();
      for (let i = 0; i < n; i++) { game.stageHits++; game.result = { make: true }; pickupSchedule(); if (pickup) { out.push({ hit: game.stageHits, id: pickup.id }); pickup = null; } }
      game.result = was; return out; }, setWind(w) { HZ.wind = w; renderWind(); }, hz: () => ({ kind: HZ.kind, wind: HZ.wind, fog: HZ.fog, list: HZ.list.map(h => ({ kind: h.kind, fixed: !!h.fixed })), bob: pendBob() }),
    fogIn() { HZ.fogT = 3.6; }, hazardsAfterThrow: () => hazardsAfterThrow(), setPendT(t) { HZ.pendT = t; }, pend: () => ({ ...PEND, period: pendPeriod() }),
    plantHazard(kind, x, y, z, r = 0.28) { HZ.list = HZ.list.filter(h => h.kind !== kind); HZ.list.push({ kind, x, y, z, ox: x, oy: y, oz: z, r, fixed: true, t: 0, at: 0, dir: 1 }); },
    targets: () => targets.map(T => ({ kind: T.kind, ...targetPos(T), pop: T.pop, left: T.left })), refillTargets: () => refillTargets(),
    plantTarget(x, y, z) { targets.length = 0; targets.push({ kind: mapData(game.stage || 1).target, x, y, z, t: 0, left: 6, pop: 0, ph: 0 }); },
    ringPath(mode, phases) { const was = ring.mode; setRingMode(mode, false); const out = phases.map(p => ({ ...ringAt(p), tell: RING_PATHS[mode].tell ? RING_PATHS[mode].tell(p) : 0 })); setRingMode(was, false); return out; },
    ringPaths: () => Object.keys(RING_PATHS), seedRun: s => seedRun(s), runSeed: () => game.seed,
    pollPad: () => pollPad(), aim: () => ({ active: aim.active, source: aim.source, valid: aim.valid, tension: aim.tension, AX: aim.AX, AY: aim.AY }),
    telemetry: () => Telemetry.events.map(e => ({ ...e })), migrateProfile: p => migrateProfile(JSON.parse(JSON.stringify(p))), saveSchema: SAVE_SCHEMA,
    readSaved: (k, st) => readSaved(k, st), boardEntry: () => Board.entry(), endRun: () => endRun(),
    step(sec) { const h = SIM_STEP; let t = 0; while (t < sec - 1e-9) { const d = Math.min(h, sec - t); update(d); t += d; } draw(); },
    freezeRing(x = 0, y = RING_Y, z = RING_Z) { ring.frozen = { x, y, z }; ring.x = x; ring.y = y; ring.z = z; },
    unfreezeRing() { ring.frozen = null; },
    setRingPhase(p) { ring.phase = p; const q = ringAt(p); ring.x = q.x; ring.y = q.y; ring.z = q.z; },
    setScore(n) { game.stageHits = n; game.hits = n; snapRing(); updateHud(); },   // (in hits: how far into the stage)
    setHits(n) { game.stageHits = n; game.hits = Math.max(game.hits, n); snapRing(); updateHud(); },
    setStage(n) { game.stage = n; hazardsReset(); snapRing(); updateHud(); },
    stageCheck() { return modeCheck() || stageCheck(); }, endThrow() { if (game.state === "ready") { powersAfterThrow(); if (boss && boss.after) boss.after(); modeCheck() || stageCheck() || pickupSchedule(); } },
    boss: () => boss && { kind: boss.kind, hp: boss.hp, max: boss.max, dead: boss.dead, flawless: boss.flawless, t: boss.t },
    hurtBoss(n = 1) { if (boss) { for (let i = 0; i < n && !boss.dead; i++) boss.hit("swish", null); } },
    seeds: () => seeds.filter(s => s.live).map(s => ({ x: s.x, y: s.y, z: s.z })),
    spawnPickup(id) { spawnPickup(id); }, pickup: () => pickup && { id: pickup.id, left: pickup.left, pop: pickup.pop },
    powers: () => JSON.parse(JSON.stringify(powers)), givePower(id) { givePower(id); }, clearPowers() { clearPowers(); },
    ringMode: () => ({ mode: ring.mode, z: ring.z, phase: ring.phase, omega: ring.omega, seq: ring.tri.seq.slice(), flat: ringFlat() }),
    triVerts: () => triVerts(), stages: () => STAGES.map(s => s.name), scoreFor: (kind, streak, stage = 1) => Math.max(5, Math.round((BASE_PTS[kind] * comboMult(streak) * (1 + 0.25 * (stage - 1))) / 5) * 5),
    throwAt(AX, AY) { if (game.state !== "ready") return false; launch(AX, AY); return true; },
    holdAim(nx, ny) { if (game.state !== "ready") return false; Object.assign(aim, { active: true, source: "key", nx, ny }); refreshAim(); return true; },   // pull and hold (as the arrow keys do)
    letGo() { release(); },
    aimFor(x, y, z = RING_Z) { const T = flightT(), tc = z * T / RING_Z, vy = (y - START_Y + 0.5 * G * tc * tc) / tc; return { AX: x * RING_Z / z, AY: START_Y + vy * T - 0.5 * G * T * T }; },
    throwThrough(x, y, z) { const a = this.aimFor(x, y, z); return this.throwAt(a.AX, a.AY); },
    aimFromDrag(dx, dy) { const m = mapDrag(dx, dy); return { ...m, ...aimPoint(m.nx, m.ny) }; },
    predictCrossing(AX, AY) { const v = aimVelocity(AX, AY), tc = ring.z / v.z; return { x: v.x * tc + 0.5 * windNow() * tc * tc, y: START_Y + v.y * tc - 0.5 * G * tc * tc, z: ring.z }; },
    previewInfo(AX, AY) { const p = buildPreview(AX, AY, settings.guide); return { dots: p.front.length + p.back.length, crosshair: !!p.cross }; },
    ringAhead(sec) { return ringAt(ring.phase + ring.omega * sec); },
    state() {
      return { state: game.state, score: game.score, hits: game.hits, throws: game.throws, stage: game.stage, stageHits: game.stageHits, phase: game.phase, lives: game.lives, slots: game.slots, streak: game.streak,
        best: profile.bestScore, bestHits: profile.best, paused, sheet, screen, cine: game.cine && game.cine.kind,
        lastResult: game.result && { ...game.result }, lastCross: game.lastCross && { ...game.lastCross },
        ring: { x: ring.x, y: ring.y, z: ring.z, rc: ring.rc, amp: ring.amp, omega: ring.omega, mode: ring.mode }, skull: { ...skull.pos } };
    },
    layout() {
      const s = projectBase(0, START_Y, 0), r = projectBase(ring.x, ring.y, ring.z), sh = projectBase(ring.x, 0, ring.z), tc = projectBase(0, 0, RING_Z);
      return { W, H, skull: { x: s.x, y: s.y, r: SKULL_R * s.s }, ring: { x: r.x, y: r.y, r: ring.rc * r.s }, ringShadowX: sh.x, trackCenterX: tc.x, pullMax: pullMax() };
    },
    world() {
      return { t: world.t, clouds: world.clouds.map(c => c.x), walkers: world.walkers.map(w => ({ type: w.type, x: w.x, z: w.z, state: w.state })),
        bats: world.bats.length, witch: !!world.witch, bolt: !!world.bolt, spawned: { ...world.next } };
    },
    catNow() { spawnCat(); },
    cartBuy: (kind, id) => cartBuy(kind, id), deals: () => dailyDeals().map(d => ({ kind: d.kind, id: d.it.id, price: d.price, full: d.it.price, shop: !!d.it.shop })),
    coffin() { const g = openCoffin(mulberry32(7)); return g && { kind: g.kind, id: g.it.id, shop: !!g.it.shop }; },
    plantSeed(x, y, z) { seeds.length = 0; seeds.push({ live: true, fixed: true, x, y, z, ox: x, oy: y, oz: z, vx: 0, vy: 0, vz: 0, rot: 0, at: 0 }); },
    skullPathAt(AX, AY, t) { const v = aimVelocity(AX, AY); return { x: v.x * t + 0.5 * windNow() * t * t, y: START_Y + v.y * t - 0.5 * G * t * t, z: v.z * t }; }, say(pool = "grab") { voice.test = true; const s = sayLine(pool); voice.test = false; return s; },
    voiceLines: () => { const o = {}; for (const id of lineIds("morty.")) { const pool = id.split(".").slice(1, -1).join("."); (o[pool] = o[pool] || []).push(t(id)); } return o; },
    voiceTest(on = true) { voice.test = on; voice.bags = {}; voice.last = -99; }, voice: () => ({ text: voice.text, id: voice.id, pool: voice.pool, said: voice.said, mood: mortyMood() }),
    lang: l => (l ? setLang(l) : LANG), missingStrings: () => [...t.missing], grab() { return skullGrabbed(); }, hat: () => ({ ...hatSpring }), digger: () => GY.digger && { t: GY.digger.t, dirt: GY.digger.dirt.length }, cat: () => GY.cat && { x: GY.cat.x, z: GY.cat.z, state: GY.cat.state },
    music() {
      const out = { want: reel.want, on: reel.on, synth: !!mus, tracks: {} };
      for (const [k, t] of Object.entries(reel.tracks)) out.tracks[k] = { live: t.live, paused: t.el ? t.el.paused : null, at: t.el ? +t.el.currentTime.toFixed(2) : null, gain: t.gain ? +t.gain.gain.value.toFixed(3) : null };
      return out;
    },
    visualShapes: () => visualShapes(), sling: () => ({ ...sling }), VisualSystem,
    visualSystem() {   // the picture's side of things: its clock, its states, the art it loaded, the last impact, the drawing now showing
      return { clock: { fps: VCLOCK.fps, frame: VCLOCK.n, t: +VCLOCK.t.toFixed(4) }, state: { skull: VSTATE.skull, target: VSTATE.target, launcher: VSTATE.launcher, camera: VSTATE.camera, stage: VSTATE.stage, log: VSTATE.log.slice() },
        assets: Object.fromEntries(Object.entries(ASSETS).map(([id, A]) => [id, { version: A.meta.version, name: A.meta.name, layers: Object.keys(A.layers), anchors: A.meta.anchors || null, shapes: A.meta.shapes }])),
        lastImpact, held: VENT.skull && { a: VENT.skull.a, angle: VENT.skull.angle, tilt: VENT.skull.tilt, t: VENT.skull.t, pose: VENT.skull.pose, smear: VENT.skull.smear, tremble: VENT.skull.tremble, mood: VENT.skull.face.mood, glyph: VENT.skull.face.glyph },
        rig: { a: rig.a, dir: rig.dir }, target: { sq: targetSq.v }, pose: VPOSE.id, poseLog: VPOSE.log ? VPOSE.log.slice() : [], boss: VSTATE.boss, power: VSTATE.power, cuts: VCLOCK.cuts, director: fxState() };
    },
    moon() {   // where the moon hangs, whether its artwork is in, and how bright the sky is on the disc and beside it
      if (moonState === "loading") buildMoon();   // picks the picture up if it has decoded but its onload is still queued
      const N = 64, c = document.createElement("canvas"); c.width = c.height = N;
      const g = c.getContext("2d", { willReadFrequently: true }), R = moon.r * 2.4, s = N / (R * 2);   // read copies, never the live plates
      g.setTransform(s, 0, 0, s, -(moon.x - R) * s, -(moon.y - R) * s);
      for (const P of [skyLayer, moonLayer]) if (P) g.drawImage(P.c, P.x0, P.y0, P.w, P.h);
      const d = g.getImageData(0, 0, N, N).data, lum = i => 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2], k = N / 2 / 2.4;
      let disc = 0, n = 0;
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (Math.hypot(x + 0.5 - N / 2, y + 0.5 - N / 2) < k * 0.8) { disc += lum((y * N + x) * 4); n++; }
      return { x: moon.x, y: moon.y, r: moon.r, art: moonState, layer: !!moonLayer, disc: Math.round(disc / n), sky: Math.round(lum(((N - 4) * N + 3) * 4)) };
    },
    forceSpawn(what) { if (what === "bats") spawnFlock(); else if (what === "witch") spawnWitch(); else if (what === "bolt") spawnBolt(); else spawnWalker(what); },
    settings() { return { ...settings }; },
    setSetting(k, v) { settings[k] = v; persist(); Sound.apply(); applyAccess(); if (sheet === "settings") renderSettings(); },
    access: () => ({ flashK: flashK(), hc: document.documentElement.classList.contains("hc"), text: document.documentElement.dataset.text, lastFlash: $("flash").dataset.last }),
    perf: () => ({ ...PERF, now: { particles: particles.length, bursts: bursts.length, inkStars: inkStars.length } }),
    spray(n) { for (let i = 0; i < n; i++) { particles.push({ kind: "dot", x: W / 2, y: H / 2, vx: 0, vy: 0, life: 5, max: 5, size: 2, color: CREAM, g: 0, a: 1 }); bursts.push({ word: "", x: 0, y: 0, t: 0, dur: 5 }); } },
    h: (...a) => h(...a),
    profile() { return JSON.parse(JSON.stringify(profile)); },
    setStats(o) { Object.assign(profile, JSON.parse(JSON.stringify(o)));   // (a copy: the live profile must never share a list with the caller)
      if (o.unlocked) profile.unlocked = [...o.unlocked]; if (o.achievements) profile.achievements = [...o.achievements]; if (o.arcade) profile.arcade = JSON.parse(JSON.stringify(o.arcade)); },
    setName(n) { profile.name = n; },
    equip, cosmetics() { return { ...cos }; }, checkUnlocks: () => checkUnlocks().map(f => f.kind + ":" + f.it.id),
    nextUnlock() { const n = nextUnlock(); return n && { kind: n.kind, id: n.it.id, have: n.have, need: n.it.req[1] }; },
    exportCode, importCode, merge: mergeProfiles,
    openSheet, closeSheet, pauseRun, resumeRun, toTitle, shop: () => ({ ...shop }), runStats: () => ({ ...game.run }),
    bones: () => profile.bones, setBones(n) { profile.bones = n; renderBones(); if (sheet) renderSheet(sheet); },
    buy, daily: () => JSON.parse(JSON.stringify(ensureDaily())), challenge, claim: claimChallenge, runBones,
    weekly: () => JSON.parse(JSON.stringify(ensurePeriod("weekly"))), monthly: () => JSON.parse(JSON.stringify(ensurePeriod("monthly"))),
    setPeriod(per, d) { profile[per] = d; updatePips(); }, periodKey: (per, d) => PERIODS[per].key(d), resetIn: per => msToReset(per),
    startArcade(map = 0) { startGame({ mode: "arcade", map }); }, arcade: () => ({ mode: game.mode, map: game.map, secs: arcadeSecs(), rec: { ...arcadeRec() }, tint: stageDef().tint || null, ramp: arcadeRamp() }),
    achievements: () => ACHIEVEMENTS.map(A => ({ id: A.id, name: A.name, n: A.n, bones: A.bones, have: achValue(A), got: achHas(A.id) })), checkAchievements: () => checkAchievements().map(A => A.id),
    gameOverShowing: () => !$("gameOver").hidden, mmss: s => mmss(s), pickupHit: lc => pickupHit(lc), sfx: () => Object.keys(SFX_EMBED || {}).sort(),
    challengePools: () => Object.fromEntries(PERIOD_IDS.map(per => [per, Object.fromEntries(PERIODS[per].pool.map(c => [c.id, [c.reward(c.range[0]), c.reward(c.range[1])]]))])),
    setDaily(d) { profile.daily = d; updatePips(); },
    audio() { return { ...Sound.debug(), level: Sound.level() }; },
    aimAt(nx, ny) { if (game.state !== "ready") return false; Object.assign(aim, { active: true, source: "key", nx, ny }); refreshAim(); return true; },
    releaseAim() { release(); },
    rig() { return { a: rig.a, dir: rig.dir, jaw: rig.jaw, tilt: rig.tilt, mood: rig.mood, dots: rig.dots }; },
    bursts: () => bursts.map(b => b.word), kinds: () => KINDS.slice(), film: () => ({ level: settings.film, reel: document.body.dataset.reel, iris: !!film.iris }),
    cloud() { return { state: Cloud.state, signedIn: !!Cloud.ref }; },
    // a stand-in for the shared store, so the leaderboard can be tested without a published page
    fakeBoard(rows = [], o = {}) {
      const docs = new Map(rows.map(r => [r.id, r])), writes = [], id = p => p.split("/")[1]; let cb = null;
      const snap = () => ({ docs: [...docs.values()].sort((a, b) => b.score - a.score).map(r => ({ id: r.id, data: () => ({ ...r }) })) });
      const db = { collection: () => ({ orderBy: () => ({ limit: () => ({ onSnapshot: n => { cb = n; n(snap()); return () => { cb = null; }; } }) }) }),
        doc: path => ({ get: () => Promise.resolve({ exists: docs.has(id(path)), data: () => docs.get(id(path)) }),
          set: d => o.readonly ? Promise.reject({ code: "invalid_argument" }) : (writes.push({ path, d }), docs.set(id(path), { id: id(path), ...d }), cb && cb(snap()), Promise.resolve()),
          delete: () => { docs.delete(id(path)); if (cb) cb(snap()); return Promise.resolve(); } }) };
      Board.unwatch(); Object.assign(Board, { db, me: { id: "me1" }, state: "live", rows: [], mine: null, fake: true, tab: "live" });
      return { writes, docs };
    },
    unfakeBoard() { Board.unwatch(); Object.assign(Board, { db: null, me: null, state: "local", rows: [], mine: null, fake: false }); },
    boardPush: () => Board.push(true), boardState: () => Board.state,
    sandbox(on) {
      if (on) { sandbox = {}; Sound.apply(); }
      else { sandbox = null; loadAll(); ensureDaily(); applyCosmetics(); updateHud(); Sound.apply(); }
    },
    storedBest() { return profile.bestScore; },
    camera: () => ({ x: camS.x, y: camS.y, z: camS.z, on: camOn, live: { x: cam.x, y: cam.y, z: cam.z }, slip: Math.max(...PLANES.map(p => Math.hypot(camS.slip[p].x, camS.slip[p].y))) }),
    parallax: zc => { const c = camAt(zc); return { k: c.k, dx: c.ox, dy: c.oy }; },
    setCamera(v) { settings.camera = v; updateCamera(0); },
    skullArt: () => ({ layers: Object.fromEntries(Object.entries(SKULL_ART).map(([k, v]) => [k, v.length])), bottom: SKULL_BOTTOM, sockets: SOCK.map(s => ({ x: s.x, y: s.y, rx: s.rx, ry: s.ry })) }),
    // draws one skull on a fresh canvas: { look, mood, jaw, a, dir, ang, size } → data URL (for visual checks)
    skullCard(o = {}) {
      const n = o.size || 240, cv = document.createElement("canvas"); cv.width = cv.height = n; const c = cv.getContext("2d");
      c.fillStyle = o.bg || "#26364A"; c.fillRect(0, 0, n, n);
      const f = faceFor(o.mood || "idle", o.t || 0);
      const look = { ...cos, ...(o.look || {}) }, cy = n * (o.cy || 0.46), sr = n * (o.r || 0.3);
      drawAura(c, n / 2, cy, sr, o.t || 0, false, look.aura);
      drawSkull(c, n / 2, cy, sr, { look, face: f, jaw: o.jaw == null ? f.jawT : o.jaw, a: o.a, dir: o.dir, ang: o.ang, t: o.t || 0 });
      drawAura(c, n / 2, cy, sr, o.t || 0, true, look.aura); drawHat(c, n / 2, cy, sr, o.ang || 0, o.t || 0, null, 1, look.hat, o.a || 1, o.dir || 0);
      if (o.power) drawPowerIcon(c, o.power, n / 2, n / 2, n * 0.3, o.t || 0);
      if (o.pole) { c.fillStyle = o.bg || "#26364A"; c.fillRect(0, 0, n, n); drawRingShape(c, n / 2, n * 0.28, n * 0.2, n * 0.05, o.ring || "hoop", o.t || 0); drawPole(n / 2, n * 0.5, n * 0.95, n * 0.04, n * 0.45, o.pole, c, o.t || 0, n * 0.06); }
      if (o.ring && !o.pole) { c.fillStyle = o.bg || "#26364A"; c.fillRect(0, 0, n, n); drawRingShape(c, n / 2, n / 2, n * 0.3, n * 0.07, o.ring, o.t || 0); }
      return cv.toDataURL();
    }
  });
  if (/[?&]test\b/.test(location.search)) { const s = document.createElement("script"); s.src = "TEST_SPEC.js"; document.body.appendChild(s); }
