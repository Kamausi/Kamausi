// Skull Toss v14 — behavioural acceptance tests.
//
// How to run: build the dev version (python3 src/build.py --dev), put this file next to index-dev.html and open
// index-dev.html?test. The release build leaves the test hooks out, so it can't run the spec.
// Results appear on screen and in the console (window.__skullTossResults).
// The tests drive the game through window.SkullToss.debug with the clock paused,
// so every result is deterministic. Port these behaviours when moving to a native engine.
(function runSkullTossSpec() {
  const T = window.SkullToss && window.SkullToss.debug;
  if (!T) { console.error("SkullToss debug API not found — load this after index.html's script."); return; }
  const C = T.constants;
  const results = [];
  // tests queue up and run in order once they're all registered; a test may be async (the stand-in server's calls
  // are, v30). step() queues a setting change between tests so it happens in order with them.
  const queue = [];
  const test = (name, fn) => queue.push({ name, fn });
  const step = fn => queue.push({ fn, step: true });
  const assert = (cond, msg) => { if (!cond) throw new Error(msg); };
  const near = (a, b, eps, msg) => assert(Math.abs(a - b) <= eps, `${msg}: expected ≈${b}, got ${a}`);

  T.pause(true);
  T.sandbox(true);  // don't touch the player's saved stats, settings or unlocks
  const fresh = (score = 0) => { T.start(); if (score) T.setScore(score); T.freezeRing(0, C.RING_Y); };
  const throwAndSettle = (AX, AY) => { assert(T.throwAt(AX, AY), "throw was refused"); T.step(3); return T.state(); };
  const holeClear = rc => rc - C.RING_TUBE - C.SKULL_R;   // how far off-centre a clean pass can be

  // ── Layout ────────────────────────────────────────────────
  test("Skull rests horizontally centred", () => {
    fresh(); const L = T.layout(); near(L.skull.x, L.W / 2, 0.5, "skull x");
  });
  test("Ring starts centred, over its post and its shadow", () => {
    T.start(); const L = T.layout();
    near(L.ring.x, L.W / 2, 0.5, "ring x"); near(L.ringShadowX, L.ring.x, 0.5, "shadow x"); near(L.trackCenterX, L.W / 2, 0.5, "rail centre");
  });
  test("Ring slides left and right, symmetric about the centre", () => {
    T.start(); T.unfreezeRing(); T.setScore(5);
    let min = Infinity, max = -Infinity;
    for (let i = 0; i < 900; i++) { T.step(1 / 60); const x = T.state().ring.x; min = Math.min(min, x); max = Math.max(max, x); }
    assert(min < -0.8 && max > 0.8, `sweep too small (${min.toFixed(2)} … ${max.toFixed(2)})`);
    near(min + max, 0, 0.05, "sweep symmetry");
  });

  // ── The ring is a ring ────────────────────────────────────
  test("Through the dead centre of the hole = PERFECT (250 points, 1 hit)", () => {
    fresh(); const s = throwAndSettle(0, C.RING_Y);
    assert(s.lastResult.kind === "perfect", `got ${s.lastResult.kind}`); assert(s.score === 250 && s.hits === 1, `score ${s.score}, hits ${s.hits}`);
  });
  test("Off-centre but clear of the rim = SWISH (100 points, 1 hit)", () => {
    fresh(); const s = throwAndSettle(holeClear(C.RC_START) * 0.75, C.RING_Y);
    assert(s.lastResult.kind === "swish", `got ${s.lastResult.kind}`); assert(s.score === 100 && s.hits === 1, `score ${s.score}`);
  });
  test("Clipping the inside of the rim rattles in (RIM IN, 75 points)", () => {
    fresh(); const s = throwAndSettle(C.RC_START - C.RING_TUBE - C.SKULL_R * 0.4, C.RING_Y);
    assert(s.lastResult.kind === "rim", `got ${s.lastResult.kind}`); assert(s.lives === 3 && s.score === 75 && s.hits === 1, "rim-in should score");
  });
  test("Clipping the outside of the rim clanks out and costs a skull", () => {
    fresh(); const s = throwAndSettle(C.RC_START + C.RING_TUBE, C.RING_Y);
    assert(s.lastResult.kind === "clank", `got ${s.lastResult.kind}`); assert(s.lives === 2 && s.score === 0 && s.hits === 0, "clank is a miss");
  });
  test("Score climbs with the combo: base × combo multiplier; hits count one each", () => {
    fresh(); throwAndSettle(0, C.RING_Y); T.freezeRing(0, C.RING_Y); const s = throwAndSettle(0, C.RING_Y);
    assert(s.hits === 2 && s.score === 250 + T.scoreFor("perfect", 2), `score ${s.score}, hits ${s.hits}`);
    assert(T.scoreFor("perfect", 2) === 375 && T.scoreFor("swish", 11) === 600 && T.scoreFor("swish", 40) === 600, "combo multiplier should be +0.5 a hit, capped at ×6");
    assert(T.scoreFor("swish", 1, 3) === 150, "later stages multiply the score");
  });
  test("Hitting the solid ring material never counts as a make", () => {
    fresh(); const s = throwAndSettle(0, C.RING_Y + C.RC_START); // aimed straight at the top of the tube
    assert(!s.lastResult.make, `got ${s.lastResult.kind}`);
  });
  test("Misses are classified: wide, too high, too low, post, short (v49: every map's ring stands on a pole)", () => {
    const cases = [[C.RC_START + 1.2, C.RING_Y, "wide"], [0.2, C.RING_Y + C.RC_START + 0.7, "over"],
      [0.6, C.RING_Y - C.RC_START - 0.7, "low"], [0, 0.9, "post", 5], [0, 0.9, "post", 1], [0, -2, "short"]];
    for (const [ax, ay, want, stage] of cases) { fresh(); if (stage) { T.setStage(stage); T.calm(); T.freezeRing(0, C.RING_Y); } const s = throwAndSettle(ax, ay); assert(s.lastResult.kind === want, `aim (${ax}, ${ay}) on map ${stage || 1} → ${s.lastResult.kind}, wanted ${want}`); }
  });

  // ── Aiming ────────────────────────────────────────────────
  test("Aim preview is exact: predicted crossing = real crossing", () => {
    fresh(); const P = T.predictCrossing(0.31, 2.05);
    T.throwAt(0.31, 2.05); T.step(C.FLIGHT_T + 0.05);
    const X = T.state().lastCross; near(X.x, P.x, 1e-6, "crossing x"); near(X.y, P.y, 1e-6, "crossing y");
  });
  test("Slingshot input: pull down-left → throws right; more pull → higher", () => {
    const a = T.aimFromDrag(-60, 80); assert(a.valid && a.AX > 0, "down-left should aim right");
    const b = T.aimFromDrag(60, 80); assert(b.valid && b.AX < 0, "down-right should aim left");
    assert(T.aimFromDrag(0, 140).AY > T.aimFromDrag(0, 50).AY, "longer pull should aim higher");
  });
  test("Pulling up, or barely moving, is not a throw", () => {
    assert(!T.aimFromDrag(0, -90).valid, "upward drag accepted"); assert(!T.aimFromDrag(2, 3).valid, "tap accepted");
  });
  test("There is a pull length that lands dead centre (ring is reachable)", () => {
    const L = T.layout().pullMax; let hit = false;
    for (let dy = 0; dy <= L && !hit; dy += 1) { const a = T.aimFromDrag(0, dy); if (a.valid && Math.abs(a.AY - C.RING_Y) < 0.05) hit = true; }
    assert(hit, "no straight pull reaches ring height");
  });

  // ── Moving target ─────────────────────────────────────────
  test("Moving ring rewards leading: aim at where it is → miss, where it will be → make", () => {
    T.start(); T.setScore(8); T.unfreezeRing(); T.setRingPhase(0);
    const now = T.state().ring; let s = throwAndSettle(now.x, now.y);
    assert(!s.lastResult.make, `aiming at the ring's current spot should miss at speed (got ${s.lastResult.kind})`);
    T.start(); T.setScore(8); T.unfreezeRing(); T.setRingPhase(0);
    const ahead = T.ringAhead(C.FLIGHT_T); s = throwAndSettle(ahead.x, ahead.y);
    assert(s.lastResult.make, `leading the ring should score (got ${s.lastResult.kind})`);
  });
  test("Difficulty ramps with score but stays makeable", () => {
    const a = T.level(0), b = T.level(20);
    assert(b.amp * b.omega > a.amp * a.omega * 3, "ring should get much faster");
    assert(b.rc < a.rc, "ring should shrink"); assert(holeClear(b.rc) > 0.15, "hardest ring must still fit the skull");
  });

  // ── Run loop ──────────────────────────────────────────────
  test("Every throw resolves and a fresh skull is ready within 2.5 s", () => {
    for (const [ax, ay] of [[0, C.RING_Y], [3, C.RING_Y], [0, -2], [C.RC_START + C.RING_TUBE, C.RING_Y]]) {
      fresh(); T.throwAt(ax, ay); T.step(2.5); assert(T.state().state === "ready", `stuck after aim (${ax}, ${ay})`);
    }
  });
  test("Three misses end the run; retry resets score and skulls", () => {
    fresh(); throwAndSettle(0, C.RING_Y); // +2
    for (let i = 0; i < 3; i++) throwAndSettle(3, C.RING_Y);
    let s = T.state(); assert(s.state === "over", `state ${s.state}`); assert(s.lives === 0, "lives should be 0");
    T.start(); s = T.state(); assert(s.score === 0 && s.lives === C.START_LIVES && s.state === "ready", "retry did not reset");
  });
  test("Bonus skulls stack past 3, up to a maximum of 5", () => {
    fresh(); assert(T.state().lives === 3, "should start with 3");
    for (let i = 0; i < 5; i++) throwAndSettle(0, C.RING_Y);
    assert(T.state().lives === 4, `5 in a row at full health should give a 4th skull (got ${T.state().lives})`);
    for (let i = 0; i < 5; i++) throwAndSettle(0, C.RING_Y);
    assert(T.state().lives === 5, `10 in a row should give a 5th skull (got ${T.state().lives})`);
    for (let i = 0; i < 5; i++) throwAndSettle(0, C.RING_Y);
    assert(T.state().lives === C.MAX_LIVES, `skulls must cap at ${C.MAX_LIVES} (got ${T.state().lives})`);
    assert(T.profile().peakLives >= 5, "most-skulls-held stat not recorded");
  });
  test("A new best score is kept", () => {
    fresh(); const before = T.state().best;
    for (let i = 0; i < 3; i++) { T.freezeRing(0, C.RING_Y); throwAndSettle(0, C.RING_Y); }
    for (let i = 0; i < 3; i++) throwAndSettle(3, C.RING_Y);
    const s = T.state(); assert(s.best >= Math.max(before, 250 + 375 + 500), `best ${s.best}`); assert(s.bestHits >= 3, `best hits ${s.bestHits}`);
    assert(T.storedBest() === s.best, "saved best out of sync");
  });

  // ── Screens, pause and sheets ─────────────────────────────
  const $ = id => document.getElementById(id);
  const SHEETS = ["customize", "challenges", "settings", "profile"];
  test("Main menu: Play, Challenges, Customize, then Settings and Profile", () => {
    T.toTitle(); const s = T.state();
    assert(s.screen === "title" && !$("title").hidden && $("hud").hidden, "title screen not showing");
    for (const id of ["play", "challengesBtn", "customizeBtn"]) assert($(id) && $("title").contains($(id)), `missing ${id}`);
    for (const k of ["settings", "profile"]) assert($("title").querySelector(`[data-sheet="${k}"]`), `missing ${k} button`);
  });
  test("Each menu button opens its own sheet, and Back closes it", () => {
    T.toTitle();
    for (const k of SHEETS) {
      $("title").querySelector(`[data-sheet="${k}"]`).click();
      for (const o of SHEETS) assert($("sheet-" + o).hidden === (o !== k), `${o} sheet visibility wrong after opening ${k}`);
      assert(T.state().sheet === k, `state says ${T.state().sheet}`);
      $("sheet-" + k).querySelector("[data-back]").click();
      assert($("sheet-" + k).hidden && !T.state().sheet && $("sheetScrim").hidden, `${k} did not close`);
    }
  });
  test("Pause button freezes the run; Resume carries on", () => {
    T.start(); T.unfreezeRing(); T.setScore(5); T.step(0.3);
    $("pauseBtn").click(); let s = T.state(); assert(s.paused && s.screen === "pause" && !$("pause").hidden, "did not pause");
    const x0 = s.ring.x; T.step(1); near(T.state().ring.x, x0, 1e-9, "ring moved while paused");
    $("resumeBtn").click(); s = T.state(); assert(!s.paused && s.screen === "play" && !$("hud").hidden, "did not resume");
    T.step(0.5); assert(Math.abs(T.state().ring.x - x0) > 0.01, "ring did not resume");
  });
  test("A sheet opened from pause keeps the run frozen", () => {
    T.start(); T.unfreezeRing(); T.setScore(5); T.pauseRun(); const x0 = T.state().ring.x;
    $("pause").querySelector('[data-sheet="settings"]').click(); T.step(1);
    near(T.state().ring.x, x0, 1e-9, "ring moved under the sheet");
    T.closeSheet(); assert(T.state().paused && T.state().screen === "pause", "closing the sheet should land back on pause"); T.resumeRun();
  });
  test("Pausing mid-flight freezes the skull, and the throw still lands after", () => {
    fresh(); T.throwAt(0, C.RING_Y); T.step(0.3); const z0 = T.state().skull.z;
    T.pauseRun(); T.step(1); near(T.state().skull.z, z0, 1e-9, "skull moved while paused"); T.resumeRun();
    T.step(2.5); assert(T.state().lastResult && T.state().lastResult.make, "throw should still score after resuming");
  });
  test("End run (two taps) goes to the results screen", () => {
    fresh(); throwAndSettle(0, C.RING_Y); T.pauseRun();
    $("quitBtn").click(); assert(T.state().state !== "over", "one tap should only arm the button");
    $("quitBtn").click(); T.step(0.2); const s = T.state();
    assert(s.state === "over" && s.screen === "over" && !$("over").hidden, `ended on ${s.state}/${s.screen}`);
  });
  test("Aim guide: Full = path + crosshair, Short = start of path, Off = nothing", () => {
    fresh(); T.setSetting("guide", "full"); const full = T.previewInfo(0, C.RING_Y);
    assert(full.dots > 10 && full.crosshair, "full guide missing path or crosshair");
    T.setSetting("guide", "short"); const short = T.previewInfo(0, C.RING_Y);
    assert(short.dots > 0 && short.dots < full.dots && !short.crosshair, "short guide wrong");
    T.setSetting("guide", "off"); const off = T.previewInfo(0, C.RING_Y);
    assert(off.dots === 0 && !off.crosshair, "off guide still drawing");
    T.setSetting("guide", "full");
  });
  test("Settings switches change the saved settings", () => {
    T.openSheet("settings");
    const before = T.settings().shake; document.getElementById("set-shake").click();
    assert(T.settings().shake === !before, "camera jolts switch did nothing");
    document.getElementById("set-shake").click();
    document.querySelector('#set-camera [data-v="gentle"]').click(); assert(T.settings().camera === "gentle", "camera setting did nothing");
    document.querySelector('#set-camera [data-v="still"]').click(); assert(document.getElementById("set-shake").disabled, "jolts should switch off with a still camera");
    document.querySelector('#set-camera [data-v="full"]').click(); T.closeSheet();
  });

  // ── Profile ───────────────────────────────────────────────
  test("Profile records throws, makes, perfects, points and best streak", () => {
    fresh(); const a = T.profile();
    throwAndSettle(0, C.RING_Y); throwAndSettle(0, C.RING_Y); throwAndSettle(3, C.RING_Y);
    const b = T.profile();
    assert(b.throws === a.throws + 3, `throws ${a.throws}→${b.throws}`); assert(b.makes === a.makes + 2, "makes");
    assert(b.perfects === a.perfects + 2, "perfects"); assert(b.points === a.points + 4, "points"); assert(b.bestStreak >= 2, "best streak");
  });
  test("Your name goes on the headstone", () => {
    T.setName("Blake"); fresh();
    for (let i = 0; i < 3; i++) throwAndSettle(3, C.RING_Y);
    assert(T.state().state === "over", "run did not end");
    const e = document.getElementById("epitaph").textContent; assert(e === "Blake", `headstone reads "${e}"`);
    T.setName("");
  });

  // ── Cosmetics ─────────────────────────────────────────────
  const ZERO = { body: [], crossings: 0, cleanCrossings: 0, crossThrows: 0, ringCatches: 0, eyePokes: 0, canAlley: {}, canClears: 0, cansDown: 0, bonusRounds: 0, bones: 0, bonks: 0, misses: 0, clutch: 0, bonesTotal: 0, makes: 0, best: 0, perfects: 0, rims: 0, bestStreak: 0, bestPerfStreak: 0, peakLives: 0, games: 0, points: 0, throws: 0, unlocked: [], boardBest: null, fragments: [], bossLog: {} };
  for (const [k, v] of Object.entries(T.profile())) if (typeof v === "number" && !(k in ZERO) && k !== "updatedAt" && k !== "schema") ZERO[k] = k === "bestStage" ? 1 : 0;   // every other counter too
  ZERO.achievements = T.achievements().map(a => a.id); ZERO.arcade = {};   // (all achievements in hand, so none pays out in the middle of a bones test)
  ZERO.shots = {}; ZERO.modes = {}; ZERO.met = []; ZERO.secrets = []; ZERO.history = []; ZERO.mastery = []; ZERO.flawless = {}; ZERO.mapMakes = {}; ZERO.arcadeTables = {}; ZERO.lastIni = ""; ZERO.streakLast = ""; ZERO.firsts = [];   // (v25–v27: signature shots, mode records, what the Codex has noted)
  const statFor = { perfStreak: "bestPerfStreak" };
  const DEF = { skull: "bone", eyes: "pie", teeth: "grin", paint: "none", trail: "dust", impact: "classic", ring: "hoop", aim: "bone", reel: "standard", title: "rookie", hat: "none", aura: "none", pole: "wood" };
  const dressDefault = () => { for (const [k, v] of Object.entries(DEF)) T.equip(k, v); };
  test("Skull Vault: thirteen shelves (hats, auras and poles are new), over 350 things, titles earned not bought", () => {
    const c = T.catalog(), want = { skull: 40, eyes: 24, teeth: 18, paint: 32, trail: 35, impact: 21, ring: 26, aim: 17, reel: 10, title: 50, hat: 54, aura: 32, pole: 22 };   // (titles: six career-level ones, v31, and the Shot Doctor, v32; v45: one Can Alley prize on seven shelves)
    for (const [k, n] of Object.entries(want)) { const L = (c[k] || []).filter(i => (!i.souls || i.shop) && !i.season); assert(L.length === n, `${k}: ${L.length} items, wanted ${n} (besides the Soul Shop's, v30, and the seasons', v42)`); }
    const all = Object.values(c).flat(); assert(all.length >= 351, `only ${all.length} cosmetics (117 × 3 = 351)`);
    for (const k of Object.keys(c)) for (const it of c[k]) {
      assert(!it.s || (it.s >= 1 && it.s <= 4), `${k} ${it.id} has ${it.s} stars`);
      if (k === "title") assert(!it.price, `title ${it.id} is for sale`);
      else if (it.shame || it.boss || it.prize) assert(!it.price && it.req, `${k} ${it.id}: prizes are won, not sold`);
      else if (it.souls) assert(!it.price && !it.req && it.souls > 0, `${k} ${it.id}: a Soul item is sold for Souls alone`);
      else if (it.season) assert(!it.price && !it.req, `${k} ${it.id}: a season look is earned on its Ticket, never sold`);
      else if (it.s) assert(it.price > 0, `${k} ${it.id} has no price`);
      if (it.shop) assert(it.souls > 0 && !it.price && !it.req, `${k} ${it.id}: a Cart exclusive is bought at the Cart, for Souls alone (v45)`);
    }
    assert(all.filter(i => i.shame).length >= 20, "not enough prizes for failing"); assert(all.filter(i => i.boss).length >= 15, "not enough boss prizes"); assert(all.filter(i => i.shop).length >= 15, "not enough shop exclusives");
  });
  test("Locked cosmetics can't be equipped; reaching the goal unlocks them", () => {
    T.setStats(ZERO); T.start();
    for (const kind of ["skull", "ring", "aim", "trail"]) {
      const it = T.catalog()[kind].filter(i => i.req).pop();
      assert(!T.equip(kind, it.id), `equipped a locked ${kind} (${it.id})`);
      T.setStats(it.req[0].startsWith("cans:") ? { canAlley: { [it.req[0].slice(5)]: it.req[1] } } : { [statFor[it.req[0]] || it.req[0]]: it.req[1] });   // (a Can Alley prize: that map cleared, v45)
      const got = T.checkUnlocks();
      assert(got.includes(kind + ":" + it.id), `${kind} ${it.id} did not unlock at ${it.req[0]} ${it.req[1]}`);
      assert(T.equip(kind, it.id) && T.cosmetics()[kind] === it.id, `could not equip ${kind} ${it.id} after unlocking`);
      T.setStats(ZERO);
    }
    dressDefault();
  });
  test("Unlocks take real play: a strong 10-minute session opens only a handful", () => {
    T.setStats({ ...ZERO, makes: 45, best: 11, perfects: 11, rims: 6, bestStreak: 7, bestPerfStreak: 2, peakLives: 4, games: 7, points: 70, throws: 80 });
    const got = T.checkUnlocks();
    const lockable = Object.values(T.catalog()).flat().filter(i => i.req).length;
    assert(got.length <= 4, `too generous: ${got.length} unlocks (${got.join(", ")})`);
    assert(lockable >= 30, `only ${lockable} things to unlock`);
    const n = T.nextUnlock(); assert(n && n.have < n.need, "game over screen has nothing to chase");
    T.setStats(ZERO);
  });
  test("Every Vault item renders in play and on its shelf", () => {
    const cat = T.catalog(), all = Object.keys(cat).flatMap(k => cat[k].map(it => k + ":" + it.id));
    T.setStats({ makes: 9999, best: 99, perfects: 999, rims: 999, bestStreak: 99, bestPerfStreak: 99, peakLives: 5, games: 999, points: 99999, unlocked: all });
    T.setWallet({ souls: 0, owned: Object.keys(T.economy().ITEMS) });   // (the Soul Shop's items: the wallet owns them, v30)
    for (const kind of Object.keys(cat)) for (const it of cat[kind]) {
      assert(T.equip(kind, it.id), `could not equip ${kind} ${it.id}`);
      fresh(); T.throwAt(0.2, C.RING_Y); T.step(0.4); T.step(1.6);
    }
    T.equip("aim", "rainbow"); T.freezeRing(0, C.RING_Y); T.previewInfo(0, C.RING_Y);
    T.toTitle(); T.openSheet("customize");
    for (const k of Object.keys(cat)) { $("catTabs").querySelector(`[data-cat="${k}"]`).click(); const n = $("shopGrid").querySelectorAll(".item").length; assert(n === cat[k].length, `${k} grid shows ${n}`); }
    T.closeSheet(); T.noServer();
    dressDefault(); T.setStats(ZERO);
    assert(Object.entries(DEF).every(([k, v]) => T.cosmetics()[k] === v), "couldn't dress back to the defaults");
  });

  // ── Combo, bones, shop, challenges, results ───────────────
  test("Combo meter climbs with the streak, names it, and breaks on a miss", () => {
    fresh(); throwAndSettle(0, C.RING_Y); assert($("combo").hidden, "no combo on the first make");
    throwAndSettle(0, C.RING_Y); throwAndSettle(0, C.RING_Y);
    assert(!$("combo").hidden && $("comboN").textContent === "3" && $("comboWord").textContent === "Bones!", `meter shows ×${$("comboN").textContent} ${$("comboWord").textContent}`);
    throwAndSettle(3, C.RING_Y); assert($("combo").hidden, "miss should break the combo");
    assert(T.runStats().bestCombo === 3, "best combo not kept for the results");
  });
  test("Misses get OOF-style calls", () => {
    fresh(); throwAndSettle(3, C.RING_Y); assert(/^whiff/.test($("sr").textContent), `wide miss called "${$("sr").textContent}"`);
    fresh(); throwAndSettle(0, -2); assert(/^oof/.test($("sr").textContent), `short miss called "${$("sr").textContent}"`);
  });
  test("Every run pays bones, more for a better run", () => {
    T.setStats(ZERO); fresh();
    throwAndSettle(0, C.RING_Y); throwAndSettle(0, C.RING_Y);
    for (let i = 0; i < 3; i++) throwAndSettle(3, C.RING_Y);
    const r = T.runStats(), got = T.bones();
    assert(r.perfects === 2 && r.misses === 3 && r.bones > 0, `run stats ${JSON.stringify(r)}`);
    assert(got === r.bones + (r.streak ? r.streak.bones : 0), `balance ${got}, run paid ${r.bones} (and the day's streak bonus, v37)`);
    assert(T.runBones({ perfects: 6, bestCombo: 9 }, 15, true) > T.runBones({ perfects: 0, bestCombo: 1 }, 2, false), "a better run should pay more");
  });
  test("Results: a headstone carved with the round, a grade, a ribbon and the bones earned", () => {
    T.setStats(ZERO); fresh(); throwAndSettle(0, C.RING_Y);
    for (let i = 0; i < 3; i++) throwAndSettle(3, C.RING_Y);
    T.step(2); const s = T.state();   // (GAME OVER holds the picture for a moment first)
    assert(s.screen === "over" && !$("over").hidden && $("hud").hidden, "results not showing");
    assert($("final").textContent === s.score.toLocaleString("en-US"), "final score wrong");
    const dts = [...$("resStats").querySelectorAll("dt")].map(d => d.textContent);
    assert(dts.length >= 6, "stats rows missing");
    for (const k of ["Score", "Time", "Hits", "Skill level"]) assert(dts.includes(k), `${k} not carved on the stone (${dts.join(", ")})`);
    assert(/^(S|[ABCD][+-]?|F)$/.test($("resGrade").textContent), `grade reads "${$("resGrade").textContent}"`);
    assert(!$("newBest").hidden && $("resTitle").textContent === "", "a first run is a new record, so the ribbon should say so");
    assert(Number($("resBones").textContent) === T.runStats().bones, "bones earned not shown");
    const pb = $("nextUnlock").getBoundingClientRect(), bb = $("resBonesBox").getBoundingClientRect();
    assert(bb.top >= pb.top - 4 && bb.top < pb.top + 20 && bb.right <= pb.right + 6 && bb.right > pb.right - 30, "the bones box should sit in the top-right corner of the progress panel");
    assert($("sleeper").width > 0, "the knocked-out skull isn't drawn");
    assert(document.querySelector(".grave .cross") && document.querySelector(".ribbon"), "the stone is missing its cross or ribbon");
  });
  test("Bones buy locked cosmetics, with no overspending", () => {
    T.setStats(ZERO); T.toTitle(); T.setBones(100);
    assert(!T.buy("skull", "tin"), "bought with too few bones"); assert(!T.equip("skull", "tin"), "equipped before buying");
    T.setBones(1000); assert(T.buy("skull", "tin"), "purchase refused");
    assert(T.bones() === 500, `balance after buying ${T.bones()}`);
    assert(T.equip("skull", "tin"), "bought item won't equip");
    assert(!T.buy("skull", "tin") && T.bones() === 500, "charged twice");
    assert(!T.buy("title", "flinger"), "titles can't be bought");
    assert(!T.buy("skull", "bone"), "starter items are free, not for sale");
    T.equip("skull", "bone"); T.setStats(ZERO);
  });
  test("Shop: tapping a locked item shows the price bar; Buy equips it", () => {
    T.setStats(ZERO); T.toTitle(); T.setBones(500); T.openSheet("customize");
    $("catTabs").querySelector('[data-cat="aim"]').click();
    $("shopGrid").querySelector('[data-id="blood"]').click();
    assert(!$("buybar").hidden && !$("buyBtn").disabled, "price bar missing or disabled");
    $("buyBtn").click();
    assert(T.cosmetics().aim === "blood" && T.bones() === 200 && $("buybar").hidden, "buy did not equip or charge");
    $("shopGrid").querySelector('[data-id="frost"]').click();
    assert($("buyBtn").disabled && /Need 400/.test($("buyBtn").textContent), `short of bones should say so (${$("buyBtn").textContent})`);
    T.closeSheet(); T.equip("aim", "toxic"); T.setStats(ZERO);
  });
  test("v45 Vault: shelf tabs in a grid with new-item bubbles; only the shelves scroll; rarity headings; try-on before wearing; Clear badges clears at once (v49)", () => {
    T.setStats({ ...ZERO, unlocked: ["hat:bowler", "hat:fez", "glasses:round"], seen: [] }); T.toTitle(); T.openSheet("customize"); T.shopCat("hat");
    const tabs = $("catTabs"), bub = k => { const b = tabs.querySelector(`[data-cat="${k}"] .bubble`); return b ? +b.textContent : 0; };
    assert(getComputedStyle(tabs).display === "grid" && tabs.querySelector('[data-cat="glasses"]') && tabs.querySelector('[data-cat="ringwings"]'), "the shelves are a grid, glasses and ring wings among them");
    assert(bub("hat") === 2 && bub("glasses") === 1 && bub("skull") === 0, `bubbles count what's new (${bub("hat")}, ${bub("glasses")})`);
    assert(getComputedStyle(document.querySelector("#sheet-customize .sheet-body")).overflowY === "hidden" && getComputedStyle($("vaultScroll")).overflowY === "auto", "only the shelves scroll: the pedestal stays in view");
    const heads = [...$("shopGrid").querySelectorAll(".rar-head")].map(h => h.className.split("t-")[1]); assert(heads.join() === "stock,featured,special,lost", `Stock to Lost (${heads})`);
    $("shopGrid").querySelector('[data-id="bowler"]').click();
    assert(!$("sheet-customize").classList.contains("trying") && $("cardAct") && /Equip/.test($("cardAct").textContent) && T.cosmetics().hat !== "bowler", "an owned hat goes on the pedestal, and its card gets an Equip button (v50: no try-on stage)");
    assert(bub("hat") === 1, "looking at a new item takes it off its shelf's bubble");
    $("cardAct").click(); assert(T.cosmetics().hat === "bowler", "Equip puts it on");
    const how = $("shopGrid").querySelector(".item.locked .how"); assert(how && /Bones/i.test(how.textContent), "a locked item says how it's had");
    T.shopCat("glasses"); const g = $("shopGrid").querySelector('[data-id="bandit"] .how'); assert(g && /Earn/i.test(g.textContent), "and an earned one says so");
    $("clearBadges").click(); assert(bub("glasses") === 0 && bub("hat") === 0 && $("clearBadges").hidden, "Clear badges clears every bubble at once, no question asked");
    T.closeSheet(); T.equip("hat", "none"); T.setStats(ZERO);
  });
  test("v45: three times the achievements, in sections; twenty-one ranks, the last at 50,000 makes; a set bonus for all three of a period", () => {
    const all = T.achievements(); assert(all.length >= 132 && new Set(all.map(a => a.id)).size === all.length, `${all.length} achievements (44 × 3 = 132)`);
    T.toTitle(); T.openSheet("achievements"); const heads = document.querySelectorAll("#achList .ach-h").length; assert(heads >= 8, `in sections (${heads})`); T.closeSheet();
    assert(!$("achList").children.length, "and the long list is let go when the sheet shuts");
    const R = T.ranks(); assert(R.length >= 20 && R[R.length - 1][0] >= 50000, `ranks ${R.length}, the last at ${R[R.length - 1][0]}`);
    T.setStats(ZERO); T.setDaily(null); const d = T.daily();
    for (let i = 0; i < 3; i++) T.challenge(d.items[i].id, d.items[i].n * 10);
    const b0 = T.bones(); T.claim(0); T.claim(1); const b2 = T.bones(); T.claim(2);
    const paid = T.bones() - b2 - T.daily().items[2].reward;
    assert(paid === 150 && T.profile().chalSets === 1 && T.daily().setPaid, `the set bonus pays once (${paid}, from ${b0})`);
    T.openSheet("challenges"); assert(document.querySelector("#chalSet .chal-set.claimed"), "the sheet shows the set bonus, paid, in its strip at the top"); T.closeSheet();
    T.setStats(ZERO); T.setDaily(null);
  });
  test("Daily challenges: three a day, progress counts, claiming pays once", () => {
    T.setStats(ZERO); T.setDaily(null);
    const d = T.daily(); assert(d.items.length === 3 && new Set(d.items.map(i => i.id)).size === 3, "need three different challenges");
    assert(JSON.stringify(T.daily().items.map(i => [i.id, i.n])) === JSON.stringify(d.items.map(i => [i.id, i.n])), "the day's set changed");
    const it = d.items[0];
    assert(!T.claim(0), "claimed an unfinished challenge");
    T.challenge(it.id, it.n); assert(T.daily().items[0].have >= it.n, "progress not counted");
    const b0 = T.bones(); assert(T.claim(0) && T.bones() === b0 + it.reward, "claim did not pay");
    assert(!T.claim(0) && T.bones() === b0 + it.reward, "paid twice");
    T.openSheet("challenges"); assert($("chalList").querySelectorAll(".chal").length === 3, "challenge cards missing"); T.closeSheet();
    T.setDaily(null); T.setStats(ZERO);
  });

  // ── The skull is the character ───────────────────────────
  const sample = (sec, fn) => { const out = []; for (let t = 0; t < sec; t += 1 / 60) { T.step(1 / 60); out.push(fn()); } return out; };
  test("Launch: squash, then smear, then fly", () => {
    fresh(); T.throwAt(0, C.RING_Y); const a = sample(0.35, () => T.rig().a);
    assert(Math.min(...a) < 0.8, `never squashed (min ${Math.min(...a).toFixed(2)})`);
    assert(Math.max(...a) > 1.12, `never smeared (max ${Math.max(...a).toFixed(2)})`);
  });
  test("The skull is drawn from the layered SVG art", () => {
    const A = T.skullArt();
    for (const k of ["cranium", "jaw", "nose", "socket-left", "socket-right", "teeth-upper", "teeth-lower"]) assert(A.layers[k] >= 1, `missing layer ${k}`);
    assert(A.bottom > 0.9 && A.bottom < 1.3, `skull bottom ${A.bottom}`);
    const [L, R] = A.sockets; assert(L.x < 0 && R.x > 0 && Math.abs(L.x + R.x) < 0.05 && L.rx > 0.1, "sockets not found in the art");
  });
  // ── The rostrum camera ───────────────────────────────────
  test("Camera: pulling leans toward the pull and dollies back (anticipation)", () => {
    T.setCamera("full"); fresh(); T.step(1);
    assert(T.aimAt(-0.8, 0.9), "could not aim"); T.step(0.8);
    const c = T.camera(); assert(c.on, "camera off");
    assert(c.x < -0.03, `no lean toward the pull (x ${c.x.toFixed(3)})`); assert(c.z < -0.15, `no dolly back (z ${c.z.toFixed(3)})`);
    T.releaseAim(); T.step(0.12); const s = T.camera();
    assert(s.live.z > c.z + 0.2, `no snap forward on release (${c.z.toFixed(2)} → ${s.live.z.toFixed(2)})`);
    T.step(0.35); const f = T.camera();
    assert(f.z > 0.15, `no push-in while following the throw (z ${f.z.toFixed(2)})`); assert(Math.abs(f.x) > 0.02, "the camera did not pan after the skull");
    T.step(3); assert(Math.abs(T.camera().z) < 0.12, "the camera did not settle back after the throw");
  });
  test("Camera: near planes slide further than far ones (parallax)", () => {
    T.setCamera("full"); fresh(); T.aimAt(0.9, 0.9); T.step(0.8);
    const d = [3, 9, 30, 70, 400].map(zc => Math.abs(T.parallax(zc).dx));
    for (let i = 1; i < d.length; i++) assert(d[i] < d[i - 1], `plane at ${[3, 9, 30, 70, 400][i]} m moved ${d[i].toFixed(2)}px, not less than ${d[i - 1].toFixed(2)}px`);
    assert(d[0] > 8 && d[4] < 3, `parallax range ${d[0].toFixed(1)}px → ${d[4].toFixed(1)}px`);
    T.releaseAim(); T.step(3);
  });
  test("Camera: it exposes in steps, like a rostrum camera (24 fps)", () => {
    T.setCamera("full"); fresh(); T.aimAt(-0.8, 0.9);
    const seen = new Set(); for (let i = 0; i < 60; i++) { T.step(1 / 120); seen.add(T.camera().x.toFixed(6)); }
    assert(seen.size >= 9 && seen.size <= 15, `${seen.size} exposures in 0.5 s`);
    T.releaseAim(); T.step(3);
  });
  test("Camera: impacts knock the planes; Still locks the camera off", () => {
    T.setCamera("full"); fresh(); T.throwAt(C.RC_START + C.RING_TUBE, C.RING_Y);
    let slip = 0; for (let i = 0; i < 30; i++) { T.step(1 / 30); slip = Math.max(slip, T.camera().slip); }
    assert(slip > 1, `no jolt on a BONK (${slip.toFixed(2)}px)`); T.step(2);
    T.setCamera("still"); fresh(); T.aimAt(-0.8, 0.9); T.step(0.8);
    const c = T.camera(); assert(!c.on && c.x === 0 && c.z === 0, "Still did not lock the camera");
    T.releaseAim(); T.step(3); T.setCamera("full");
  });
  test("Pulling the slingshot keeps the skull's shape and leans it toward the shot", () => {
    fresh(); assert(T.aimAt(-0.8, 0.9), "could not aim"); T.step(0.4);
    const r = T.rig(); assert(r.mood === "aim", `mood ${r.mood}`); assert(Math.abs(r.a - 1) < 0.03, `skull deformed while pulled (${r.a.toFixed(2)})`); assert(r.tilt > 0.1, `lean ${r.tilt.toFixed(2)}`);
    T.releaseAim(); assert(T.state().state === "flying", "release did not throw"); T.step(3);
  });
  test("Moods follow the story: fear in flight, grin, spin, puzzled, dizzy", () => {
    fresh(); T.throwAt(0, C.RING_Y); T.step(0.3); assert(T.rig().mood === "fear", `in flight: ${T.rig().mood}`);
    T.step(0.6); assert(T.rig().mood === "perfect", `perfect: ${T.rig().mood}`); T.step(2);
    fresh(); throwAndSettle(holeClear(C.RC_START) * 0.75, C.RING_Y); 
    fresh(); T.throwAt(holeClear(C.RC_START) * 0.75, C.RING_Y); T.step(0.9); assert(T.rig().mood === "excited", `swish: ${T.rig().mood}`); T.step(2);
    fresh(); T.throwAt(C.RC_START - C.RING_TUBE - C.SKULL_R * 0.4, C.RING_Y); T.step(0.9); assert(T.rig().mood === "confused", `rim-in: ${T.rig().mood}`); T.step(2);
    fresh(); T.throwAt(C.RC_START + C.RING_TUBE, C.RING_Y); T.step(0.9); assert(T.rig().mood === "dizzy", `clank: ${T.rig().mood}`); T.step(2);
    fresh(); assert(T.rig().mood === "idle", `back on the slingshot: ${T.rig().mood}`);
  });
  test("A clean miss: it looks at you, thinks \"...\", then BONK", () => {
    fresh(); T.throwAt(0.2, C.RING_Y + C.RC_START + 0.7); T.step(0.86);
    assert(T.rig().mood === "deadpan", `after missing: ${T.rig().mood}`);
    T.step(0.4); assert(T.rig().dots > 0.5, "no thought bubble");
    let bonk = false, flat = 9; for (let i = 0; i < 40 && !bonk; i++) { T.step(0.05); flat = Math.min(flat, T.rig().a); bonk = T.bursts().includes("BONK!"); }
    assert(bonk, `never said BONK (bursts: ${T.bursts().join("|") || "none"})`); assert(flat < 0.7, `didn't flatten on the ground (${flat.toFixed(2)})`); T.step(2);
  });
  test("Impact cosmetics change the bonk", () => {
    T.setStats({ ...ZERO, unlocked: ["impact:cartoon"] }); assert(T.equip("impact", "cartoon"), "couldn't equip WHAM");
    fresh(); T.throwAt(C.RC_START + C.RING_TUBE, C.RING_Y); T.step(0.86);
    assert(T.bursts().includes("WHAM!"), `bursts: ${T.bursts().join(", ")}`); T.step(2);
    T.equip("impact", "classic"); T.setStats(ZERO);
  });
  test("Titles are earned by playing", () => {
    T.setStats(ZERO); assert(!T.equip("title", "flinger"), "equipped an unearned title");
    T.setStats({ makes: 50 }); assert(T.checkUnlocks().includes("title:flinger"), "50 makes didn't earn Skull Flinger");
    assert(T.equip("title", "flinger"), "couldn't wear it"); T.equip("title", "rookie"); T.setStats(ZERO);
  });
  test("Film look and reels: grain can be turned down, reels re-grade the picture", () => {
    T.setSetting("film", "off"); assert(T.film().level === "off", "film setting ignored"); T.setSetting("film", "full");
    T.setStats({ ...ZERO, unlocked: ["reel:silent"] }); assert(T.equip("reel", "silent"), "couldn't equip Silent Era");
    assert(T.film().reel === "silent", `reel is ${T.film().reel}`); T.equip("reel", "standard"); T.setStats(ZERO);
  });
  test("Old saves keep their unlocks under the new names", () => {
    const json = JSON.stringify({ v: 1, p: { unlocked: ["skull:gilded", "trail:embers"], makes: 5 }, c: { skull: "gilded", trail: "embers" } });
    T.setStats(ZERO); assert(T.importCode("SKULL1." + btoa(json).replace(/=+$/, "")), "code refused");
    const p = T.profile(), c = T.cosmetics();
    assert(p.unlocked.includes("skull:gold") && p.unlocked.includes("trail:fire"), `unlocked: ${p.unlocked.join(", ")}`);
    assert(c.skull === "gold" && c.trail === "fire", `equipped ${c.skull} / ${c.trail}`);
    T.equip("skull", "bone"); T.equip("trail", "dust"); T.setStats(ZERO);
  });

  // ── Saving ────────────────────────────────────────────────
  test("Save codes carry progress to another device, merging rather than overwriting", () => {
    T.setStats({ ...ZERO, makes: 120, best: 14, perfects: 30, unlocked: ["skull:tin"] }); T.setName("Blake");
    const code = T.exportCode(); assert(/^SKULL1\./.test(code), "bad code format");
    T.setStats({ ...ZERO, makes: 10, best: 20, unlocked: ["ring:iron"] }); T.setName("");
    assert(T.importCode(code), "valid code rejected");
    const p = T.profile();
    assert(p.makes === 120 && p.best === 20 && p.perfects === 30, `merge lost progress (${p.makes}, ${p.best}, ${p.perfects})`);
    assert(p.unlocked.includes("skull:tin") && p.unlocked.includes("ring:iron"), "unlocks not merged");
    assert(p.name === "Blake", "name not restored");
    assert(!T.importCode("SKULL1.not-a-real-code!!") && !T.importCode("hello"), "garbage code accepted");
    T.setStats(ZERO); T.setName("");
  });
  test("Cloud merge keeps the higher of every counter", () => {
    const m = T.merge({ makes: 5, best: 30, games: 2, unlocked: ["a"], updatedAt: 1, name: "Old" }, { makes: 50, best: 3, games: 9, unlocked: ["b"], updatedAt: 2, name: "New" });
    assert(m.makes === 50 && m.best === 30 && m.games === 9, "counters went backwards");
    assert(m.unlocked.length === 2 && m.name === "New", "unlocks or newest name lost");
  });

  // ── Living graveyard ──────────────────────────────────────
  test("The graveyard is alive: clouds drift, creatures wander across and leave (v58: the Gilded Graveyard, whose cast they are)", () => {
    T.start(); T.setStage(2); const w0 = T.world();
    T.step(20); const w1 = T.world();
    assert(w1.clouds.some((x, i) => Math.abs(x - w0.clouds[i]) > 1), "clouds are static");
    let saw = w1.walkers.length;                       // they come and go on their own clock, so wait for one
    for (let i = 0; i < 10 && !saw; i++) { T.step(5); saw = T.world().walkers.length; }
    assert(saw > 0, "no wanderers after over a minute");
    const seen = new Set();
    for (let i = 0; i < 12; i++) { T.step(10); T.world().walkers.forEach(k => seen.add(k.type)); }
    assert(seen.size >= 3, `only saw ${[...seen].join(", ")}`);
    assert(T.world().walkers.length <= 3, "too many wanderers at once");
  });
  test("Bats, the witch, lightning and every wanderer draw without errors", () => {
    T.start(); for (const k of ["bats", "witch", "bolt", "zombie", "skeleton", "werewolf", "ghost"]) T.forceSpawn(k);
    const w = T.world(); assert(w.bats > 0 && w.witch && w.bolt, "sky spawns missing");
    for (let i = 0; i < 30; i++) T.step(0.25);
  });


  // ── v11: score, progress, stages and bosses ───────────────
  const toHit = n => { T.calm(); T.setHits(n - 1); T.freezeRing(0, C.RING_Y); throwAndSettle(0, C.RING_Y); T.unfreezeRing(); };
  const beatCrow = (stage = 1) => { fresh(); if (stage > 1) T.setStage(stage); toHit(C.STAGE_MINI); T.step(2.6); T.hurtBoss(99); T.endThrow(); T.step(3.2); };
  test("HUD: the score centred in the title's lettering, the hits under it, the best under that; small skulls and combo", () => {
    fresh(); throwAndSettle(0, C.RING_Y);
    assert($("score").dataset.v === "250" && $("hits").textContent === "1", `score ${$("score").dataset.v}, hits ${$("hits").textContent}`);
    const s = $("score").getBoundingClientRect(), h = $("hits").parentElement.getBoundingClientRect(), b = $("best").getBoundingClientRect(), mid = r => (r.left + r.right) / 2;
    assert(Math.abs(mid(s) - innerWidth / 2) < 3, `the score should be centred (${mid(s).toFixed(1)} of ${innerWidth})`);
    assert(h.top >= s.bottom - 4 && b.top >= h.bottom - 2 && Math.abs(mid(h) - mid(s)) < 3, "the hits should sit under the score, and the best under the hits");
    assert(/Luckiest Guy/.test(getComputedStyle($("score")).fontFamily), "v45: the score is in the title's lettering");
    for (const id of ["hits", "best"]) assert(/Bebas Neue/.test(getComputedStyle($(id)).fontFamily), `${id} should use the game's numerals`);
    const skull = $("lives").querySelector("svg").getBoundingClientRect();
    assert(skull.width <= 18, `the skulls should be small (${skull.width}px)`);
  });
  test("Skulls top left, score top centre, a small progress bar at the bottom counting down to each boss", () => {
    fresh(); const pr = $("prog").getBoundingClientRect(), lv = $("lives").getBoundingClientRect(), sc = $("score").getBoundingClientRect();
    const W = innerWidth, H = innerHeight, mid = r => (r.left + r.right) / 2;
    assert(lv.top < 60 && lv.left < W * 0.25, `skulls at ${Math.round(lv.left)},${Math.round(lv.top)}`);
    assert(sc.top < 60 && Math.abs(mid(sc) - W / 2) < W * 0.2, `score at ${Math.round(mid(sc))} of ${W}`);
    assert(pr.height < 60 && pr.top > H * 0.6 && Math.abs(mid(pr) - W / 2) < 24, `progress bar ${Math.round(pr.height)}px tall at ${Math.round(mid(pr))},${Math.round(pr.top)} of ${W}×${H}`);
    T.setHits(12); assert(/18 to the Crow King/.test($("progLabel").textContent), $("progLabel").textContent);
  });
  test("30 hits bring on the Crow King: he carries the ring near and far, and no power-ups appear", () => {
    fresh(); toHit(C.STAGE_MINI); let s = T.state();
    assert(s.phase === "mini" && s.state === "cine" && T.boss().kind === "crow", `phase ${s.phase}, state ${s.state}`);
    T.step(2.6); s = T.state(); assert(s.state === "ready" && s.ring.mode === "boss", "the fight didn't start");
    let zmin = 99, zmax = 0; for (let i = 0; i < 480; i++) { T.step(1 / 60); const z = T.state().ring.z; zmin = Math.min(zmin, z); zmax = Math.max(zmax, z); }
    assert(zmax - zmin > 1.5, `the ring should move in depth (z ${zmin.toFixed(2)}–${zmax.toFixed(2)})`);
    assert(!T.pickup() && !Object.keys(T.powers()).length, "no power-ups during the mini-boss");
    assert(/Crow King/.test($("progLabel").textContent) && $("prog").classList.contains("fight"), "the bar should show his health");
  });
  test("A ring off its usual plane is still exact: the skull crosses at the ring's own depth", () => {
    fresh(); T.freezeRing(0.4, 2.1, 7.4); assert(T.throwThrough(0.4, 2.1, 7.4), "throw refused"); T.step(2.5);
    const s = T.state(); assert(s.lastResult.kind === "perfect", `got ${s.lastResult.kind}`); near(s.lastCross.ringZ, 7.4, 1e-6, "crossing depth");
  });
  test("Beating the Crow King turns the ring 3D: a repeating triangle through left, right, up, down, near and far", () => {
    fresh(); toHit(C.STAGE_MINI); T.step(2.6); T.hurtBoss(99); T.endThrow(); let s = T.state();
    assert(s.cine === "mini-out" && s.ring.mode === "tri", `cine ${s.cine}, ring ${s.ring.mode}`);
    T.step(3.2); s = T.state(); assert(s.phase === "B" && s.state === "ready", `phase ${s.phase}`);
    const V = T.triVerts(), span = k => Math.max(...V.map(v => v[k])) - Math.min(...V.map(v => v[k]));
    assert(span("x") > 2 && span("y") > 0.8 && span("z") > 2, `triangle spans x ${span("x").toFixed(1)}, y ${span("y").toFixed(1)}, z ${span("z").toFixed(1)}`);
    const q = T.ringMode().seq; assert(q.length >= 6 && q.slice(0, 3).join() === q.slice(3, 6).join(), "each pattern should repeat (learnable, not random)");
  });
  test("Leading the flying ring through depth scores", () => {
    beatCrow(); T.setHits(C.STAGE_LOOSE + 5);
    const VZ = C.RING_Z / C.FLIGHT_T; let tau = T.state().ring.z / VZ, p;
    for (let i = 0; i < 30; i++) { p = T.ringAhead(tau); tau = p.z / VZ; }
    assert(T.throwThrough(p.x, p.y, p.z), "throw refused"); T.step(2.5);
    const s = T.state(); assert(s.lastResult.make, `leading the 3D ring should score (got ${s.lastResult.kind}; cross z ${s.lastCross && s.lastCross.ringZ})`);
  });
  test("Hit 50 on map 1 brings on the Pumpkin King; a seed knocks the skull out of the air, Ghost Toss slips through", () => {
    beatCrow(1); toHit(C.STAGE_BOSS); let s = T.state(); assert(s.phase === "boss" && T.boss().kind === "pumpkin", `phase ${s.phase}`);
    T.step(2.9); T.freezeRing(0, C.RING_Y);
    const lives = T.state().lives, a = { AX: 0, AY: C.RING_Y }, q = T.skullPathAt(a.AX, a.AY, 3 / (C.RING_Z / C.FLIGHT_T));
    T.plantSeed(q.x, q.y, q.z); T.throwAt(a.AX, a.AY); T.step(2.5); s = T.state();
    assert(s.lastResult.kind === "seed" && s.lives === lives - 1, `got ${s.lastResult.kind}, lives ${s.lives}`);
    T.givePower("ghost"); T.freezeRing(0, C.RING_Y); T.plantSeed(q.x, q.y, q.z); T.throwAt(a.AX, a.AY); T.step(2.5);
    assert(T.state().lastResult.make, `Ghost Toss should phase through the seed (got ${T.state().lastResult.kind})`);
  });
  test("Beating the Pumpkin King clears map 1: a big bonus, bones, a skull back, the body part and the shard, then map 2", () => {
    beatCrow(1); toHit(C.STAGE_BOSS); T.step(2.9); const s0 = T.state(), bones = T.bones();
    T.hurtBoss(99); T.endThrow(); T.step(6); const s = T.state();
    assert(s.stage === 2 && s.phase === "A" && s.stageHits === 0, `stage ${s.stage}, phase ${s.phase}`);
    assert(T.profile().unlocked.includes("hair:vines") && T.profile().fragments.includes("hollow") && T.profile().body.includes("leftArm"), "the Pumpkin-Vine Curls, Morty's Left Arm and the Hollow Shard");
    assert(s.score >= s0.score + 10000 && T.bones() > bones, "no bonus");
    assert(s.lives === Math.min(C.MAX_LIVES, s0.lives + 1), "no skull back"); assert(T.profile().bossKills >= 1 && T.profile().bestStage >= 2 && T.profile().bossLog.pumpkin >= 1, "boss not recorded");
  });
  test("Stages are data: each one names its speed, triangle and patterns", () => { const st = T.stages(); assert(st.length === 8 && st[0] === "Crow Hollow" && st[5] === "The Bone Desert" && st[7] === "The Black Abyss", st.join()); });

  // ── v11: power-ups ────────────────────────────────────────
  test("Power-ups float in the middle of the ring; only a toss through the middle grabs one", () => {
    fresh(); toHit(6); T.spawnPickup("deadeye"); assert(T.pickup(), "the power-up should float in the ring");
    T.freezeRing(0, C.RING_Y); const rc = T.state().ring.rc; throwAndSettle(holeClear(rc) * 0.92, C.RING_Y);
    assert(T.state().lastResult.make && T.pickup() && !Object.keys(T.powers()).length, "an edge-of-the-hole make shouldn't grab it");
    T.freezeRing(0, C.RING_Y); throwAndSettle(0, C.RING_Y); assert(Object.keys(T.powers()).length === 1, "a dead-centre toss should grab it");
  });
  test("Skull Rush makes flights quicker; Deadeye doubles the perfect window", () => {
    const crossT = () => { let t = 0; while (!T.state().lastCross && t < 2) { T.step(0.005); t += 0.005; } return t; };
    fresh(); T.throwAt(0, C.RING_Y); const t0 = crossT(); T.step(2.5);
    fresh(); T.givePower("rush"); T.throwAt(0, C.RING_Y); const t1 = crossT(); T.step(2.5);
    assert(t1 < t0 * 0.75, `rush flight ${t1.toFixed(2)}s vs ${t0.toFixed(2)}s`);
    const off = holeClear(C.RC_START) * 0.38 * 1.5;
    fresh(); T.clearPowers(); throwAndSettle(off, C.RING_Y); assert(T.state().lastResult.kind === "swish", "should be a swish without Deadeye");
    fresh(); T.givePower("deadeye"); throwAndSettle(off, C.RING_Y); assert(T.state().lastResult.kind === "perfect", "Deadeye should make it a perfect"); T.clearPowers();
  });
  test("Second Chance saves a skull; Cursed Skull and BONK Blast triple the score", () => {
    fresh(); T.givePower("second"); throwAndSettle(3, C.RING_Y); assert(T.state().lives === C.START_LIVES && !T.powers().second, "Second Chance didn't save the skull");
    fresh(); T.givePower("cursed"); throwAndSettle(0, C.RING_Y); assert(T.state().score === 750, `cursed perfect scored ${T.state().score}`);
    fresh(); T.givePower("blast"); throwAndSettle(0, C.RING_Y); assert(T.state().score === 750 && !T.powers().blast, `blast perfect scored ${T.state().score}`);
    T.clearPowers();
  });

  // ── v11: the Vault, the Curio Cart, the board, the profile ──
  test("Curio Cart (v45): Souls only, never bones; its exclusives shelf by shelf, a deal of the day, and the Mystery Coffin", async () => {
    T.noServer(); T.setStats(ZERO); T.setBones(20000); const ex = T.catalog().hat.find(i => i.shop);
    assert(ex.souls > 0 && !ex.price, "a Cart exclusive has a Souls price and no bones price");
    assert(!T.buy("hat", ex.id), "an exclusive was sold in the Vault");
    assert(!(await T.cartBuy("hat", ex.id)) && T.bones() === 20000, "no server, no Souls: nothing sells, and no bones are taken");
    T.openSheet("store"); assert(!$("cartStatus").hidden && document.querySelectorAll("#exclGrid .cart-shelf").length === 4, "the Cart shows its four shelves and says the Souls counter is shut"); T.closeSheet();
    await T.fakeServer(); const S = T.soulsApi(); await S.redeem({ platform: "test", receipt: "OK:cart1", product: "souls.1200" });
    const deal = T.deals()[0]; assert(T.deals().length === 1 && deal.shop && deal.price < deal.full, JSON.stringify(T.deals()));
    assert(await T.cartBuy(deal.kind, deal.id), "bought the deal of the day");
    assert(T.wallet().souls === 1200 - deal.price && T.bones() === 20000 && T.wallet().owned.includes(`${deal.kind}:${deal.id}`), `Souls spent, bones untouched (${T.wallet().souls})`);
    const n = T.profile().unlocked.length, got = await T.coffin();
    assert(got && !got.shop && T.profile().unlocked.length === n + 1 && T.wallet().souls === 1200 - deal.price - T.economy().COFFIN, "the coffin takes Souls and gives one new Vault look");
    const p = T.profile(); assert(p.shopBuys === 1 && p.coffins === 1 && p.bonesSpent === 0, `shop stats ${p.shopBuys}/${p.coffins}/${p.bonesSpent}`);
    T.equip(deal.kind, T.catalog()[deal.kind][0].id); T.noServer(); T.setStats(ZERO);
  });
  test("Curio Cart (v45): an exclusive bought with bones before stays yours; the coffin opens on a row of coffins", async () => {
    T.noServer(); const ex = T.catalog().hat.find(i => i.shop); T.setStats({ ...ZERO, unlocked: [`hat:${ex.id}`] });
    assert(T.canUse("hat", ex.id), "a bones-era Cart buy is kept");
    await T.fakeServer(); await T.soulsApi().redeem({ platform: "test", receipt: "OK:cart2", product: "souls.550" });
    T.openSheet("store"); $("coffinBtn").click(); await new Promise(r => setTimeout(r, 30));
    assert(T.coffinShow(), "opening the coffin opens its viewport");
    T.endCoffinShow(false); assert(!T.coffinShow(), "and Keep it closes it");
    T.closeSheet(); T.noServer(); T.setStats(ZERO);
  });
  test("Failing in style and beating bosses earn their own prizes", () => {
    T.setStats({ ...ZERO, misses: 300, zeroRuns: 8, posts: 40 }); const a = T.checkUnlocks();
    for (const k of ["hat:dunce", "hat:bag", "pole:plunger", "aura:raincloud", "title:postoffice"]) assert(a.includes(k), `${k} not won (${a.join(", ")})`);
    T.setStats({ ...ZERO, miniKills: 1, bossKills: 1, bossFlawless: 1 }); const b = T.checkUnlocks();
    for (const k of ["hat:crowcrown", "hat:pumpkinhelm", "hat:goldcrown", "ring:vine", "title:smasher"]) assert(b.includes(k), `${k} not won`);
    T.setStats(ZERO);
  });
  test("Hats pop off the head when the skull is launched, then settle back", () => {
    T.setStats({ ...ZERO, unlocked: ["hat:tophat"] }); T.equip("hat", "tophat"); fresh();
    T.throwAt(0, C.RING_Y); T.step(0.08); assert(T.hat().lift > 0.05, `lift ${T.hat().lift}`);
    T.step(3); assert(T.hat().lift < 0.01, "hat didn't settle"); T.equip("hat", "none"); T.setStats(ZERO);
  });
  test("v45 Leaderboard: a board for each way to play; a tapped headstone opens its card, read-only and as plain text; ten of each kind on the device", () => {
    T.fakeBoard([{ id: "a", name: "<b>Ada</b>", score: 9000, hits: 20, stage: 2, bio: "<img src=x onerror=alert(1)> hi", pic: { face: "happy", frame: "plain" }, rank: "Crypt Keeper", level: 7, ach: 12 }]);
    T.setStats(ZERO); T.openSheet("board");
    const chips = [...$("boardModes").querySelectorAll("[data-mode]")].map(b => b.dataset.mode); assert(chips.join() === "story,plus,arcade,rush,curtain,longshot,gallery,cans,pitch,sudden,gale,swing", chips.join());   // (v53: Adventure+ and all eight mini-games)
    $("boardList").querySelector("li").click();
    assert(!$("playerCard").hidden && $("pcName").textContent === "bAda/b" && !$("playerCard").querySelector("img") && /Crypt Keeper/.test($("pcTitle").textContent) && / hi$/.test($("pcBio").textContent), "the card, as plain text");
    assert(!$("playerCard").querySelector("input, textarea, [contenteditable]") && /View only/.test($("playerCard").textContent), "and read-only");
    $("pcClose").click(); assert($("playerCard").hidden, "Close shuts it");
    assert($("boardOnline").hidden, "no presence to count, no online line");
    T.closeSheet(); T.unfakeBoard();
    T.boardLocal([{ mode: "arcade", name: "Me", score: 700, hits: 9, stage: 1, at: 1 }, { name: "Me", score: 300, hits: 4, stage: 1, at: 2 }]);
    T.openSheet("board"); $("boardTabs").querySelector('[data-tab="local"]').click();
    const scores = () => [...$("boardList").querySelectorAll(".sc")].map(e => e.textContent).join();
    assert(scores() === "300", `the Adventure's runs (${scores()})`);
    $("boardModes").querySelector('[data-mode="arcade"]').click(); assert(scores() === "700", `the Arcade's (${scores()})`);
    assert($("boardTabs").querySelector('[data-tab="week"]').disabled, "the weekly board is the Adventure's");
    T.closeSheet(); T.unfakeBoard();
  });
  test("Leaderboard: opt-in, only your headstone name, and other names shown as plain text", () => {
    const fk = T.fakeBoard([{ id: "a", name: "<img src=x onerror=alert(1)>", score: 9000, hits: 20, stage: 2 }, { id: "b", name: "Mort", score: 12000, hits: 30, stage: 3 }]);
    T.setName("Blake"); T.setStats({ ...ZERO, bestScore: 5000, best: 12, board: false, boardBest: { score: 5000, hits: 12, stage: 1, at: 1 } }); T.openSheet("board");
    let rows = $("boardList").querySelectorAll("li");
    assert(rows.length === 2 && rows[0].textContent.includes("Mort"), `rows ${rows.length}`); assert(!$("boardList").querySelector("img"), "a name was rendered as HTML");
    assert(fk.writes.length === 0, "posted without opting in");
    $("set-board").click();
    assert(fk.writes.length === 1 && fk.writes[0].path === "leaderboard/me1" && fk.writes[0].d.name === "Blake" && fk.writes[0].d.score === 5000, JSON.stringify(fk.writes));
    assert(Object.keys(fk.writes[0].d).every(k => ["name", "score", "hits", "stage", "title", "look", "at", "bio", "pic", "rank", "level", "ach"].includes(k)), "posted more than the headstone: name, score, looks and its card (v45)");
    assert($("boardList").querySelector("li.me"), "your row isn't marked");
    $("set-board").click(); assert(!$("boardList").querySelector("li.me") && !T.profile().board, "opting out should take the score down");
    T.closeSheet(); T.unfakeBoard(); T.setName(""); T.setStats(ZERO);
  });
  test("Profile: grouped stats, from bosses to the Hall of Shame", () => {
    fresh(); throwAndSettle(3, C.RING_Y); assert(T.profile().wides >= 1, "wide misses aren't counted");
    T.openSheet("profile"); const hs = [...$("stats").querySelectorAll(".stat-h")].map(h => h.textContent);
    assert(hs.length >= 6 && hs.includes("Hall of Shame") && hs.includes("Bosses"), hs.join()); assert($("stats").querySelectorAll(".stat").length >= 35, "too few stats");
    T.closeSheet();
  });
  test("The skull talks when grabbed: a stock of lines and a voice setting", () => {
    const L = T.voiceLines(); assert(L.grab.length >= 20 && L.grab.includes("Hey! What do you think you're doing?!"), "missing lines");
    assert(typeof T.say() === "string" && $("set-voice").querySelectorAll("button").length === 3, "voice setting missing");
  });
  test("The graveyard at work: a gravedigger digs and a black cat crosses between you and the ring", () => {
    T.start(); T.setStage(2); T.step(0.2); const d0 = T.digger() ? T.digger().t : 0; T.step(5); assert(T.digger() && T.digger().t > d0 + 4, "no gravedigger (v58: he's the Gilded Graveyard's)");
    T.setStage(1); T.step(0.2); T.catNow(); const c0 = T.cat(); assert(c0 && c0.z > 2 && c0.z < 4, "the cat should walk between the slingshot and the ring");
    T.step(1.5); assert(T.cat() && T.cat().x !== c0.x, "the cat should move");
  });
  test("The slingshot stays after the shot: its bands snap through the rest point, overshoot and settle", () => {
    fresh(); T.step(1);
    assert(T.throwThrough(0, C.RING_Y, T.state().ring.z), "throw refused");
    const y0 = T.sling().y; let lo = Infinity;
    for (let i = 0; i < 40; i++) { T.step(0.01); lo = Math.min(lo, T.sling().y); }
    assert(y0 > 0 && lo < -y0 * 0.2, `the pouch should fly past its rest point (pulled ${y0.toFixed(1)}px, reached ${lo.toFixed(1)}px)`);
    T.step(0.4); const s = T.sling();
    assert(Math.hypot(s.x, s.y) < 1 && Math.abs(s.fy) < 1, `the bands should be still again (${s.x.toFixed(2)}, ${s.y.toFixed(2)})`);
  });
  test("The visual debug overlay draws the shapes the game plays with, in the right order", () => {
    fresh(); const V = T.visuals;
    ["showFPS", "showCollisionRadius", "showPivots", "showParallax", "showCamera", "showAnimationFrame", "forceAnimationFPS"].forEach(k => assert(k in V, `visuals.${k} is missing`));
    const R = T.visualShapes().ring;
    assert(R.perfect < R.clean && R.clean < R.tubeIn && R.tubeIn < R.tubeOut && R.tubeOut < R.miss, "the ring's circles are out of order");
    const flags = Object.keys(V).filter(k => k.startsWith("show"));
    flags.forEach(k => { V[k] = true; });
    try { T.step(0.1); } finally { flags.forEach(k => { V[k] = false; }); }
  });
  // ── Visual Foundation v1 ─────────────────────────────────────
  test("The Visual System: one place for the picture's clock, states, art and events", () => {
    const VS = T.VisualSystem;
    ["update", "render", "setStage", "setSkullState", "setTargetState", "triggerImpact", "triggerCameraJolt", "setCamera", "emit"].forEach(k => assert(typeof VS[k] === "function", `VisualSystem.${k} is missing`));
    const v = T.visualSystem();
    assert(v.clock.fps === 24, `the drawings should run at 24 fps, not ${v.clock.fps}`);
    ["skull", "target", "launcher", "camera"].forEach(k => assert(typeof v.state[k] === "string", `no ${k} state`));
  });
  test("The art comes from SVG assets: skull, launcher and target, with named layers, anchors and versions", () => {
    const A = T.visualSystem().assets;
    assert(A.skull && A.skull.layers.length === 7 && A.skull.layers.includes("jaw"), "the skull should have its seven layers");
    assert(A.launcher && ["frame", "tips", "pouch"].every(l => A.launcher.layers.includes(l)), "the launcher needs frame, tips and pouch layers");
    assert(["seat", "bandL", "bandR", "pouchL", "pouchR"].every(k => A.launcher.anchors && A.launcher.anchors[k]), "the launcher needs its band and pouch anchors");
    assert(A.target && A.target.layers.includes("post"), "the target needs its post");
    for (const [id, a] of Object.entries(A)) assert(/^\d+\.\d+\.\d+$/.test(a.version) && a.shapes > 0, `${id} needs a version and some shapes`);
  });
  test("Drawings change on 24s while the flight stays smooth", () => {
    fresh(); T.step(1);
    assert(T.throwThrough(0, C.RING_Y, T.state().ring.z), "throw refused");
    let poses = 0, moves = 0, lastPose = null, lastPos = null;
    for (let i = 0; i < 60; i++) {   // half a second in 120ths
      T.step(1 / 120);
      const h = T.visualSystem().held, pose = `${h.a.toFixed(4)}|${h.angle.toFixed(4)}`, pos = JSON.stringify(T.state().skull);
      if (pose !== lastPose) poses++; if (pos !== lastPos) moves++;
      lastPose = pose; lastPos = pos;
    }
    assert(poses <= 14, `the skull's drawing changed ${poses} times in half a second (24 fps allows 12 or 13)`);
    assert(moves >= 58, `the skull should move every frame (${moves} of 60)`);
  });
  test("The visual states follow the throw: launch, flight, impact, recover, idle", () => {
    fresh(); T.step(1);
    T.throwThrough(0, C.RING_Y, T.state().ring.z);
    for (let i = 0; i < 80 && T.visualSystem().state.skull !== "idle"; i++) T.step(0.05);
    const log = T.visualSystem().state.log, want = ["launch", "flight", "impact", "recover", "idle"];
    let at = -1; for (const s of want) { const i = log.indexOf(s, at + 1); assert(i > at, `expected ${want.join(" → ")}, got ${log.join(" → ")}`); at = i; }
  });
  test("One impact system, scaled by how hard it hits: Skull Rush clanks the rim harder", () => {
    const rimHit = rush => {
      fresh(); T.clearPowers(); if (rush) T.givePower("rush"); T.step(1);
      const r = T.state().ring; T.throwThrough(r.x + r.rc - 0.02, r.y, r.z);
      for (let i = 0; i < 240; i++) { T.step(1 / 120); const L = T.visualSystem().lastImpact; if (L && (L.kind === "rim" || L.kind === "clank")) return L; }
      return null;
    };
    const slow = rimHit(false), fast = rimHit(true);
    T.clearPowers();
    assert(slow && fast, "both throws should meet the rim");
    assert(fast.strength > slow.strength * 1.2, `a Skull Rush throw should arrive harder (${slow.strength} vs ${fast.strength})`);
    assert(fast.a < slow.a, `and squash the skull further (${slow.a} vs ${fast.a})`);
  });
  test("The moon is the drawn one: its face in front of the clouds, the vignette cleared around it", () => {
    const m = T.moon();
    assert(m.art === "loaded" && m.layer, `the moon artwork should be hung (it is ${m.art})`);
    assert(m.disc > 130 && m.disc > m.sky + 50, `the disc should shine against the sky (disc ${m.disc}, sky ${m.sky})`);
    const v = getComputedStyle($("vig")), mask = v.maskImage || v.webkitMaskImage || "";
    assert(/radial-gradient/.test(mask), "the vignette should leave a clearing where the moon hangs");
  });
  // ── Visual Foundation v2: poses, the shot director, FX and sound direction ──
  test("Full draw is the anticipation: the skull squints and shivers but keeps its shape", () => {
    fresh(); T.step(1);
    assert(T.holdAim(0, 0.5), "aim refused"); T.step(0.3);
    let v = T.visualSystem();
    assert(v.state.skull === "aim" && v.pose === "aim", `a half pull should be plain aim (${v.state.skull} / ${v.pose})`);
    T.holdAim(0, 1); T.step(0.3); v = T.visualSystem();
    assert(v.state.skull === "anticipation" && v.state.launcher === "anticipation", `a full draw should be the anticipation (skull ${v.state.skull}, launcher ${v.state.launcher})`);
    assert(v.held.pose === "anticipation" && v.held.mood === "strain" && v.held.tremble, "the drawing should strain and shiver");
    assert(Math.abs(v.rig.a - 1) < 0.02 && Math.abs(v.held.a - 1) < 0.02, `the skull must keep its shape in the pouch (a = ${v.rig.a.toFixed(3)})`);
    assert(v.director.cues.filter(c => c.name === "creak").length === 1, "the band should creak once at full draw");
    T.letGo(); T.step(3);
  });
  test("The poses follow the throw: launch, a smear that thins, flight, then the make's own drawing", () => {
    fresh(); T.step(1);
    T.throwThrough(0, C.RING_Y, T.state().ring.z);
    const smears = [];
    for (let i = 0; i < 240; i++) { T.step(1 / 120); const h = T.visualSystem().held; if (h.pose === "smear" && smears[smears.length - 1] !== h.smear) smears.push(h.smear); }
    const log = T.visualSystem().poseLog, want = ["launch", "smear", "flight", "perfect"];
    let at = -1; for (const s of want) { const i = log.indexOf(s, at + 1); assert(i > at, `expected ${want.join(" → ")}, got ${log.join(" → ")}`); at = i; }
    assert(smears.length >= 2 && smears[0] === 1 && smears[1] < smears[0], `the smear should be two drawings, thinning (${smears.join(", ")})`);
    const states = T.visualSystem().state.log;
    assert(states.indexOf("smear") > states.indexOf("launch") && states.indexOf("rebound") > states.indexOf("impact"), `states ${states.join(" → ")}`);
  });
  test("A bonk lands on its own drawing: eyes screwed shut, then the rebound and the dizzy look", () => {
    fresh(); T.step(1);
    const r = T.state().ring, cuts = T.visualSystem().cuts; T.throwThrough(r.x + r.rc + 0.05, r.y, r.z);
    let L = null; for (let i = 0; i < 240 && !L; i++) { T.step(1 / 120); const I = T.visualSystem().lastImpact; if (I && (I.kind === "clank" || I.kind === "rim")) L = I; }
    assert(L && L.kind === "clank", `the throw should clank off the rim (${L && L.kind})`);
    T.step(1 / 120); let v = T.visualSystem();
    assert(v.cuts >= cuts + 2, "the release and the contact should each start a drawing on the frame they happen");
    assert(v.held.pose === "impact" && v.held.glyph === "squeeze", `the contact drawing should screw its eyes shut (${v.held.pose}, ${v.held.glyph})`);
    const star = v.director.stars.find(s => s.style === "bonk"); assert(star && star.drawing === 0, "the bonk should throw a contact star");
    T.step(0.25); v = T.visualSystem();
    assert(v.state.log.includes("rebound") && v.held.pose === "dizzy", `then the rebound, seeing stars (${v.held.pose})`);
    assert(v.director.stars.length === 0, "the contact star is three drawings long, then gone");
  });
  test("One shot, one timeline: snap → whoosh on the smear → contact → transient → sting three drawings on, each once", () => {
    fresh(); T.step(1);
    T.throwThrough(0, C.RING_Y, T.state().ring.z); T.step(2);
    const d = T.visualSystem().director, at = n => (d.cues.find(c => c.name === n) || {}).t;
    const names = d.cues.filter(c => c.t <= at("swish") + 0.2).map(c => c.name);   // the shot up to its sting (the skull lands later, with its own thud)
    ["snap", "whoosh", "swish", "transient", "sting"].forEach(n => assert(names.filter(x => x === n).length === 1, `${n} should play exactly once (${names.join(", ")})`));
    assert(at("snap") < 0.01 && Math.abs(at("whoosh") - 1 / 24) < 0.02, `the whoosh should land on the smear, a drawing after the snap (${at("whoosh")})`);
    const c = at("swish");
    assert(Math.abs(at("transient") - c) < 0.01 && Math.abs(at("sting") - c - 0.125) < 0.02, `the sting should land three drawings after the contact (${c} → ${at("sting")})`);
    assert(d.outcome === "perfect" && d.intensity === 1, `a perfect is the throw's moment, even after the skull lands (${d.outcome})`);
    ["flash", "dust", "sting", "settle"].forEach(n => assert(!d.pending.some(b => b.name === n), `the ${n} beat should have played`));
  });
  test("Every hit is heard once: a rim clank, a bonk, then the thud and the boing on the rebound", () => {
    fresh(); T.step(1);
    const r = T.state().ring; T.throwThrough(r.x + r.rc + 0.05, r.y, r.z); T.step(3);
    const d = T.visualSystem().director, n = k => d.cues.filter(c => c.name === k).length, at = k => (d.cues.find(c => c.name === k) || {}).t;
    assert(n("clank") === 1 && n("bonk") === 1, `one clank and one bonk (${d.cues.map(c => c.name).join(", ")})`);
    assert(n("thud") >= 1 && n("boing") === 1 && at("boing") > at("thud") + 0.05, `the boing should come on the rebound, after the thud (${at("thud")} → ${at("boing")})`);
    assert(d.outcome === "miss", `a bonk is a miss (${d.outcome})`);
  });
  test("Bigger moments read bigger: FX recipes ranked from launch to boss defeat, all on one timeline", () => {
    const A = T.visualAnimation, order = ["launch", "miss", "hit", "perfect", "bossHit", "bossDefeat"];
    assert(order.map(k => A.fxIntensity(k)).join() === "0.42,0.58,0.72,1,1.05,1.35", `intensities ${order.map(k => A.fxIntensity(k)).join()}`);
    const tl = A.fxTimeline("perfect");
    assert(tl.burst === 0 && tl.flash === 0.08 && tl.dust === 0.14 && Math.abs(tl.settle - 0.63) < 1e-6, `timeline ${JSON.stringify(tl)}`);
    fresh(); const p = { x: 200, y: 200, s: 20 };
    T.VisualSystem.triggerImpact("rim", { at: p, hit: p, strength: 1 }); T.VisualSystem.triggerImpact("ko", { at: p, strength: 1 });
    const st = T.visualSystem().director.stars, rim = st.find(s => s.style === "rim"), ko = st.find(s => s.style === "ko");
    assert(rim && ko && ko.r > rim.r * 2, `a knockout's star should dwarf a rim's (${rim && rim.r} vs ${ko && ko.r})`);
    const L = A.poseLibrary();
    ["idle", "aim", "anticipation", "launch", "smear", "flight", "impact", "perfect", "miss", "bossHit", "bossDefeat", "dizzy", "confused", "death"].forEach(k => assert(L.includes(k), `the pose library needs ${k}`));
    assert(A.samplePose("death").glyph === "x" && A.samplePose("impact").glyph === "squeeze", "death has X eyes, the contact screws them shut");
    T.start();
  });
  test("The bosses have visual states: in, open, winding up, hurt, down", () => {
    fresh(); toHit(C.STAGE_MINI); const seen = new Set();
    for (let i = 0; i < 90; i++) { T.step(0.05); seen.add(T.visualSystem().boss); }
    T.hurtBoss(1); T.step(1 / 60); seen.add(T.visualSystem().boss);
    T.hurtBoss(99); T.step(0.3); seen.add(T.visualSystem().boss);   // (past the knockout's hold)
    assert(["enter", "hit", "defeat"].every(s => seen.has(s)) && (seen.has("vulnerable") || seen.has("attack")), `boss states seen: ${[...seen].join(", ")}`);
    T.endThrow(); T.step(3.2);
  });
  test("Busy devices lose effects before pixels, and never below half", () => {
    const A = T.visualAnimation;
    try {
      assert(A.setQuality(0.2) === 0.5 && A.quality().particles === 0.5 && A.quality().grain === 0.5, "quality should stop at half");
      assert(A.setQuality(0.75) === 0.75, "quality should step");
    } finally { A.setQuality(1); }
  });

  // ── v12: two modes, GAME OVER, weekly and monthly challenges, achievements, new music and sounds ──
  test("PLAY asks Story or Arcade; Arcade lists every map with its best, and a map starts there", () => {
    T.setStats({ ...ZERO, bestStage: 9 }); T.toTitle(); $("play").click();
    assert(T.state().sheet === "play" && !$("modePick").hidden, "PLAY should open the mode picker");
    assert(document.querySelectorAll("#modePick .mode-card[data-mode]").length === 2 && document.querySelector('#modePick .mode-card[data-open="minis"]') && document.querySelectorAll("#moreModes [data-mode]").length === 2, "Adventure and Arcade, the Mini Games card (v46), and two more ways to play");
    document.querySelector('#modePick [data-mode="arcade"]').click();
    const maps = [...document.querySelectorAll("#mapList [data-map]")];
    assert(!$("mapPick").hidden && maps.length === T.stages().length, `every map should be listed (${maps.length})`);
    assert(maps.every((b, i) => b.textContent.includes(T.stages()[i])), "maps should be named after the stages");
    $("sheet-play").querySelector("[data-back]").click();
    assert(T.state().sheet === "play" && !$("modePick").hidden, "Back from the maps should return to the modes");
    document.querySelector('#modePick [data-mode="arcade"]').click(); document.querySelector('#mapList [data-map="2"]').click();
    const a = T.arcade(), s = T.state();
    assert(!T.state().sheet && s.state === "ready" && a.mode === "arcade" && a.map === 2 && s.stage === 3, `arcade on map 3 (${JSON.stringify(a)}, stage ${s.stage})`);
    assert(T.scene().map === 2 && T.scene().props > 10, `a map other than the first dresses the scene as itself (${JSON.stringify(T.scene())})`);
    T.toTitle(); $("play").click(); document.querySelector('#modePick [data-mode="story"]').click();
    assert(T.arcade().mode === "story" && T.state().stage === 1 && T.state().state === "ready", "Story starts at stage 1");
  });
  test("Arcade: no bosses, the ring goes 3D at 30 hits and keeps speeding up; bests are kept map by map", () => {
    T.setStats({ ...ZERO, bestStage: 9 }); T.startArcade(1); T.freezeRing(0, C.RING_Y);
    T.setHits(C.STAGE_MINI - 1); throwAndSettle(0, C.RING_Y); T.step(2.6);
    assert(!T.boss() && T.ringMode().mode === "tri", `30 hits in Arcade: no Crow King, the ring goes 3D (${T.ringMode().mode}, boss ${JSON.stringify(T.boss())})`);
    T.setHits(49); assert(T.arcade().ramp === 1, "no extra speed yet"); T.setHits(80); assert(T.arcade().ramp > 1.1, `the ring should keep winding up (${T.arcade().ramp})`);
    T.setHits(C.STAGE_MINI - 1); T.freezeRing(0, C.RING_Y);
    const story = T.profile().bestScore;
    for (let i = 0; i < 3; i++) throwAndSettle(3, C.RING_Y);
    T.step(2);
    const s = T.state(), rec = T.arcade().rec;
    assert(s.screen === "over" && rec.runs === 1 && rec.score === s.score && rec.secs > 0, `the map's record should keep the run (${JSON.stringify(rec)})`);
    assert(T.profile().bestScore === story, "an Arcade run must not touch the Story best (or the leaderboard)");
    const dts = [...$("resStats").querySelectorAll("dt")].map(d => d.textContent);
    assert(dts.includes("Survived") && /Map best/.test($("bestLine").textContent), `the stone should read like an Arcade run (${dts.join(", ")} / ${$("bestLine").textContent})`);
    const secs = T.runStats().secs, sv = $("resStats").querySelectorAll("dd")[1].textContent;
    assert(sv === T.mmss(secs), `Survived should read the run's time (${sv} for ${secs.toFixed(2)} s)`);
    assert(T.mmss(59.85) === "00:59" && T.mmss(119.5) === "01:59" && T.mmss(60) === "01:00", `times are floored, never rounded into 00:00 (${T.mmss(59.85)}, ${T.mmss(119.5)})`);
    $("again").click(); assert(T.arcade().mode === "arcade" && T.arcade().map === 1, "Toss again should replay the same map");
    T.setStats({ arcade: { "1": { score: 99999, secs: 3, hits: 1, runs: 1 } } }); T.startArcade(1); T.step(1);
    assert(/best 0:03/.test($("progLabel").textContent) && !$("prog").classList.contains("beat"), `the clock races the map's best time (${$("progLabel").textContent})`);
    T.step(4); T.step(1);
    assert(/new best!/.test($("progLabel").textContent) && $("prog").classList.contains("beat"), `outlasting it turns the bar gold (${$("progLabel").textContent})`);
    T.start();
  });
  test("GAME OVER pops up when the last skull goes, then the headstone; ending the run skips it", () => {
    fresh(); for (let i = 0; i < 2; i++) throwAndSettle(3, C.RING_Y);
    assert(T.throwAt(3, C.RING_Y), "throw refused");
    for (let i = 0; i < 600 && T.state().state !== "over"; i++) T.step(1 / 120);
    T.step(0.3);
    assert(T.gameOverShowing() && T.state().screen === "play", "GAME OVER should be up over the picture first");
    assert(/GAME/.test($("gameOver").textContent) && /OVER/.test($("gameOver").textContent), "it should say GAME OVER");
    T.step(1.6);
    assert(T.state().screen === "over" && !T.gameOverShowing(), "then the headstone, and the words gone");
    fresh(); T.pauseRun(); $("quitBtn").click(); $("quitBtn").click(); T.step(0.2);
    assert(!T.gameOverShowing() && T.state().screen === "over", "ending the run from the pause menu goes straight to the stone");
  });
  test("Challenges come daily, weekly and monthly: three of each, and progress counts into all three", () => {
    T.setStats(ZERO);
    const w = T.weekly(), m = T.monthly();
    assert(w.items.length === 3 && m.items.length === 3, "three weekly and three monthly challenges");
    assert(T.periodKey("weekly", new Date(2026, 8, 21)) === T.periodKey("weekly", new Date(2026, 8, 27)) && T.periodKey("weekly", new Date(2026, 8, 27)) !== T.periodKey("weekly", new Date(2026, 8, 28)), "a week runs Monday to Sunday");
    assert(T.periodKey("monthly", new Date(2026, 8, 1)) === T.periodKey("monthly", new Date(2026, 8, 30)) && T.periodKey("monthly", new Date(2026, 8, 30)) !== T.periodKey("monthly", new Date(2026, 9, 1)), "a month runs from the 1st");
    const pools = T.challengePools();   // [least, most] a goal of each kind can pay
    for (const [id, [wLo, wHi]] of Object.entries(pools.weekly)) {
      const d = pools.daily[id], mo = pools.monthly[id];
      assert(!d || wLo > d[1], `a weekly ${id} should always pay more than a daily one (${wLo} vs ${d && d[1]})`);
      assert(mo && mo[0] > wHi, `a monthly ${id} should always pay more than a weekly one (${mo && mo[0]} vs ${wHi})`);
    }
    const item = { id: "throws", n: 2, reward: 400, have: 0, claimed: false }, filler = id => ({ id, n: 9999, reward: 5, have: 0, claimed: false });
    T.setPeriod("weekly", { day: T.periodKey("weekly"), items: [item, filler("rims"), filler("bosses")] });
    T.setPeriod("monthly", { day: T.periodKey("monthly"), items: [{ ...item, reward: 900 }, filler("rims"), filler("bosses")] });
    fresh(); throwAndSettle(0, C.RING_Y); throwAndSettle(0, C.RING_Y);
    assert(T.weekly().items[0].have >= 2 && T.monthly().items[0].have >= 2, "a throw should count toward the weekly and the monthly challenge");
    const b0 = T.bones(); assert(T.claim(0, "weekly") && T.bones() === b0 + 400 && !T.claim(0, "weekly"), "a weekly claim pays once");
    assert(T.claim(0, "monthly") && T.bones() === b0 + 1300, "a monthly claim pays");
    T.openSheet("challenges"); const tabs = [...$("chalTabs").querySelectorAll(":scope > button")].map(b => b.textContent.trim());
    assert(tabs.join() === "Daily,Weekly,Monthly", `the sheet should have Daily, Weekly and Monthly tabs (${tabs})`);
    $("chalTabs").querySelector('[data-per="monthly"]').click();
    assert(/monthly/.test($("chalWhat").textContent) && $("chalList").querySelectorAll(".chal.monthly").length === 3, "the Monthly tab shows the monthly three");
    T.closeSheet();
  });
  test("Achievements: a milestone pays out once, a medal drops in, and the sheet lists them all", () => {
    const all = T.achievements();
    assert(all.length >= 30 && new Set(all.map(a => a.id)).size === all.length, `a good set of achievements (${all.length})`);
    T.toTitle(); T.setStats({ ...ZERO, achievements: [], bones: 0, bonesTotal: 0, makes: 0 });
    assert(!T.checkAchievements().includes("first-toss"), "nothing reached yet");
    T.setStats({ makes: 1 }); const got = T.checkAchievements();
    assert(got.includes("first-toss") && T.bones() === 25, `First Toss should unlock and pay 25 bones (${got}, ${T.bones()})`);
    assert(!$("achPop").hidden && /First Toss/.test($("achPop").textContent), "a medal should drop in");
    assert(!$("achPop").classList.contains("play"), "on the menus it drops in at the top");
    assert(!T.checkAchievements().length && T.bones() === 25, "and only once");
    assert(!$("achPip").hidden, "the Achievements button should flag something new");
    T.toTitle(); T.openSheet("achievements");
    assert($("achList").querySelectorAll(".ach").length === all.length && $("achList").querySelectorAll(".ach.got").length === 1, "the sheet lists every achievement, one done");
    assert(/1 of/.test($("achCount").textContent) && $("achPip").hidden, "the count reads 1, and the flag clears once seen");
    T.closeSheet();
    fresh(); T.setStats({ achievements: [], perfects: 1 }); assert(T.checkAchievements().includes("bullseye"), "Bullseye should unlock mid-run");
    const pop = $("achPop").getBoundingClientRect(), under = $("best").getBoundingClientRect().bottom;
    assert($("achPop").classList.contains("play") && parseFloat($("achPop").style.top) >= under, `mid-run the medal sits under the score, not over it (top ${$("achPop").style.top}, best ends ${under.toFixed(0)})`);
    T.toTitle(); T.setStats(ZERO);
  });
  test("The pause menu and the Curio Cart have their own music, and hand back to the act", () => {
    fresh(); assert(T.music().want === "A", `a run plays act A (${T.music().want})`);
    T.pauseRun(); assert(T.music().want === "pause", `paused should play the pause track (${T.music().want})`);
    T.resumeRun(); assert(T.music().want === "A", "resuming hands back to the act");
    T.toTitle(); T.openSheet("store"); assert(T.music().want === "shop", `the Curio Cart should play the shop track (${T.music().want})`);
    T.closeSheet(); assert(T.music().want === "menu", "closing the Cart hands back to the menu tune");
    assert(T.sfx().join() === "achievement,powerup,purchase", `the three recorded sounds ride inside the page (${T.sfx()})`);
  });
  test("A toss that clips the drawn power-up grabs it; one that misses the drawing doesn't", () => {
    fresh(); toHit(6); T.spawnPickup("deadeye"); assert(T.pickup(), "the power-up should float in the ring");
    const rc = T.state().ring.rc, icon = rc * 0.46;   // (v45: the grab takes in the whole drawn prop)
    const clip = icon + C.SKULL_R * 0.5, wide = icon + C.SKULL_R * 0.95;
    assert(!T.pickupHit({ x: wide, y: C.RING_Y, ringX: 0, ringY: C.RING_Y }), "a toss that only grazes the glow shouldn't grab it");
    T.freezeRing(0, C.RING_Y); throwAndSettle(clip, C.RING_Y);
    assert(T.state().lastResult.make && Object.keys(T.powers()).length === 1, `a toss whose skull overlaps the drawn power-up should grab it (off by ${clip.toFixed(3)}, old window ${(rc * 0.45).toFixed(3)})`);
  });
  test("The title skull's canvases spill past its letter, so an aura is never cut off", () => {
    T.toTitle(); T.step(0.2);
    const slot = $("mascot").getBoundingClientRect(), back = $("mascotBack").getBoundingClientRect(), front = $("mascotFront").getBoundingClientRect(), em = parseFloat(getComputedStyle($("mascot")).fontSize);
    assert(front.width >= slot.width + em && back.width === front.width && front.bottom > slot.bottom, "the canvases should be wider and deeper than the letter slot");
    assert(+getComputedStyle($("mascotBack")).zIndex < 0 && +getComputedStyle($("mascotFront")).zIndex > 0, "the back layer goes behind the lettering, the front one over it");
    const tag = document.querySelector(".tagline");
    assert(tag.textContent.trim() === "The Adventures of Mortimer Bones" && getComputedStyle(tag).textTransform === "none", "the tagline is the one line, capitalised as written (v50: The Adventures of Mortimer Bones)");
  });
  test("The score follows the acts: menu, A, B and the boss, the recorded score and nothing else", () => {
    T.toTitle(); assert(T.music().want === "menu", `title plays ${T.music().want}`);
    fresh(); assert(T.music().want === "A", `a run opens on ${T.music().want}`);
    toHit(C.STAGE_MINI); assert(T.music().want === "boss", `the mini-boss plays ${T.music().want}`);
    T.step(2.6); T.hurtBoss(99); T.endThrow(); T.step(3.2);
    assert(T.music().want === "B", `after the Crow King it should be act B, not ${T.music().want}`);
    assert(!T.music().on, "the recorded reel should stay out of the way in sandbox");
  });
  test("The picture keeps moving: a busy frame stays well inside the budget", () => {
    // a canary, not a benchmark: it only fires if a frame starts costing many times what it should
    T.start(); ["zombie", "skeleton", "werewolf", "ghost"].forEach(w => T.forceSpawn(w));
    for (let i = 0; i < 20; i++) T.step(0.1);
    for (let i = 0; i < 40; i++) T.step(1 / 60);          // warm the cels and sprites first
    const t0 = performance.now(); for (let i = 0; i < 120; i++) T.step(1 / 60);
    const ms = (performance.now() - t0) / 120;
    assert(ms < 60, `${ms.toFixed(1)} ms a frame with four wanderers on screen`);
  });

  // ── v14 foundation: the leaderboard, the save schema and its backup, the fixed step, the gamepad, telemetry ──
  const decodeCode = c => JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(c.slice(7)), ch => ch.charCodeAt(0))));
  const encodeCode = o => "SKULL1." + btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(o)))).replace(/=+$/, "");
  test("The leaderboard posts Story runs played to the end, never the numbers in a save code", () => {
    const fk = T.fakeBoard([]); T.setName("Blake"); T.setStats({ ...ZERO, bestScore: 0, board: true });
    const forged = decodeCode(T.exportCode()); forged.p.bestScore = 88888888; forged.p.boardBest = { score: 88888888, hits: 999, stage: 9, at: 1 };
    assert(T.importCode(encodeCode(forged)), "a well-formed code should still load");
    assert(T.profile().bestScore === 88888888 && T.profile().boardBest === null, "the code's best stays on the profile and brings no leaderboard run with it");
    T.boardPush(); assert(fk.writes.length === 0, `a save code's score reached the board: ${JSON.stringify(fk.writes)}`);
    T.setStats({ ...ZERO, bestScore: 0, board: true }); fresh(); throwAndSettle(0, C.RING_Y);
    const score = T.state().score; assert(score > 0, "the make should score");
    T.endRun(); T.step(1);
    assert(T.profile().boardBest && T.profile().boardBest.score === score, `the finished run should be the board's run (${JSON.stringify(T.profile().boardBest)})`);
    assert(fk.writes.length === 1 && fk.writes[0].d.score === score, `the finished run should post (${JSON.stringify(fk.writes)})`);
    T.unfakeBoard(); T.setName(""); T.setStats({ ...ZERO, bestScore: 0 }); T.toTitle();
  });
  test("Saves carry a schema number and step through migrations in order", () => {
    assert(T.saveSchema === 4, `schema ${T.saveSchema}`);
    const old = T.migrateProfile({ bestScore: 5000, boardBest: { score: 5000 } });   // a v12 save has no number
    assert(old.schema === 4 && old.boardBest === null, `a v12 save should reach schema 4 with no board run (${JSON.stringify(old)})`);
    const v3 = T.migrateProfile({ schema: 3, fragments: ["tophat", "whistle", "shadow"], bestStage: 7, bossLog: { pumpkin: 2 } });   // v44: Morty's pieces become the Black Ring's shards, map for map
    assert(v3.schema === 4 && v3.fragments.join() === "hollow,desert,abyss" && v3.bestStage === 7 && v3.bossLog.pumpkin === 2, `a v43 save keeps its progress (${JSON.stringify(v3.fragments)})`);
    const newer = T.migrateProfile({ schema: 9, boardBest: { score: 7 } });
    assert(newer.schema === 9 && newer.boardBest.score === 7, "a newer build's save keeps its number and its fields");
    assert(decodeCode(T.exportCode()).v === T.saveSchema && T.profile().schema === T.saveSchema, `codes and the live profile should carry the current schema (code ${decodeCode(T.exportCode()).v}, profile ${T.profile().schema})`);
    assert(!T.importCode(encodeCode({ v: T.saveSchema + 1, p: { makes: 1 } })), "a code from a newer build should be refused, not half-read");
  });
  test("A save that won't read falls back to the last copy that did", () => {
    const m = new Map(), st = { get: (k, d) => (m.has(k) ? m.get(k) : d), set: (k, v) => m.set(k, String(v)) };
    assert(T.readSaved("p", st) === null, "no save: nothing to load");
    m.set("p", JSON.stringify({ bones: 42 }));
    assert(T.readSaved("p", st).bones === 42 && m.get("p.bak") === m.get("p"), "a clean load should become the backup");
    m.set("p", '{"bones": 4');   // a write cut off halfway
    const got = T.readSaved("p", st);
    assert(got && got.bones === 42, `a broken save should load the backup (${JSON.stringify(got)})`);
    assert(m.get("p.corrupt") === '{"bones": 4', "the broken text should be kept for recovery");
  });
  test("The game runs on a fixed step: a throw ends the same at any frame rate", () => {
    const run = frames => {
      fresh(); T.simReset(); T.throwThrough(0.25, C.RING_Y + 0.1, C.RING_Z);
      let n = 0; for (const f of frames) n += T.simAdvance(f);
      const s = T.state(); return { n, skull: s.skull, result: s.lastResult && s.lastResult.kind, score: s.score, phase: T.ringMode().phase };
    };
    const at60 = run(Array(90).fill(1 / 60));
    const mixed = [], pat = [1 / 144, 1 / 90, 1 / 30, 1 / 120, 1 / 75, 1 / 48]; let left = 1.5;
    for (let i = 0; left > 1e-9; i++) { const f = Math.min(pat[i % pat.length], left); mixed.push(f); left -= f; }
    const other = run(mixed);
    assert(at60.n === Math.round(1.5 / T.simStep) && other.n === at60.n, `steps: ${at60.n} at 60 Hz, ${other.n} mixed`);
    assert(other.result === at60.result && other.score === at60.score, `the outcome changed with the frame rate: ${at60.result} vs ${other.result}`);
    for (const k of ["x", "y", "z"]) near(other.skull[k], at60.skull[k], 1e-9, `skull ${k}`);
    near(other.phase, at60.phase, 1e-9, "ring phase");
  });
  test("A gamepad aims and throws through the same model as a finger", () => {
    const gp = { connected: true, axes: [0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
    Object.defineProperty(navigator, "getGamepads", { value: () => [gp], configurable: true });
    const press = (i, on) => { gp.buttons[i] = { pressed: on, value: on ? 1 : 0 }; T.pollPad(); };
    try {
      fresh();
      gp.axes = [0.1, 0.12]; T.pollPad(); assert(!T.aim().active, "a stick inside the dead zone shouldn't pull");
      gp.axes = [-0.3, 0.8]; T.pollPad(); const a = T.aim();
      assert(a.active && a.source === "pad" && a.valid && a.tension > 0.5, `the stick should pull the band (${JSON.stringify(a)})`);
      const mag = Math.hypot(-0.3, 0.8), k = (mag - 0.22) / (1 - 0.22) / mag, L = T.layout().pullMax, d = T.aimFromDrag(-0.3 * k * L, 0.8 * k * L);
      near(a.AX, d.AX, 1e-9, "the stick should aim where the same drag would (x)"); near(a.AY, d.AY, 1e-9, "(y)");
      press(0, true); assert(T.state().state === "flying", `A should let go (${T.state().state})`); press(0, false);
      gp.axes = [0, 0]; T.pollPad(); T.step(3);
      gp.axes = [0, 0.7]; T.pollPad(); assert(T.aim().active, "pulling again"); gp.axes = [0, 0]; T.pollPad();
      assert(!T.aim().active && T.state().state === "ready", "letting the stick spring back should throw nothing");
      press(9, true); assert(T.state().screen === "pause", `Start should pause (${T.state().screen})`); press(9, false);
      press(9, true); assert(T.state().screen === "play", `Start again should resume (${T.state().screen})`); press(9, false);
    } finally { delete navigator.getGamepads; }
  });
  test("Telemetry: a run is logged on this device, start to end", () => {
    fresh(); throwAndSettle(0, C.RING_Y); T.endRun(); T.step(1);
    const all = T.telemetry(), ev = all.slice(all.map(e => e.name).lastIndexOf("run_start")), names = ev.map(e => e.name);
    assert(names[0] === "run_start" && names.includes("throw") && names[names.length - 1] === "run_end", names.join(", "));
    const th = ev.find(e => e.name === "throw"), end = ev[ev.length - 1];
    assert(th.make === true && typeof th.result === "string" && th.stage === 1, JSON.stringify(th));
    assert(end.quit === true && end.hits === 1 && end.throws >= 1, JSON.stringify(end));
    assert(all.length <= 500, `the log should keep only the last 500 events (${all.length})`);
    assert(typeof window.SkullToss.telemetry === "function", "every build can read it from the console");
    T.setStats({ ...ZERO, bestScore: 0 }); T.toTitle();
  });

  // ── v15: flashes, contrast and text size, focus in sheets, the performance budget, the UI kit ──
  test("Flashes: Reduced swaps each flash for one soft one, Off skips them, and lightning and the film's flicker follow", () => {
    for (const [v, want, k] of [["full", "perfect", 1], ["reduced", "soft", 0.3], ["off", "none", 0]]) {
      T.setSetting("flashes", v); fresh(); throwAndSettle(0, C.RING_Y);
      assert(T.state().lastResult.kind === "perfect", `a centred toss should be a perfect (${T.state().lastResult.kind})`);
      assert(T.access().lastFlash === want && T.access().flashK === k, `${v}: flash ${T.access().lastFlash}, strength ${T.access().flashK}`);
    }
    T.setSetting("flashes", "full"); T.toTitle();
  });
  test("Large text reaches the page; the High contrast setting is gone (v46)", () => {
    T.setSetting("text", "large");
    assert(T.access().text === "large" && !T.access().hc, JSON.stringify(T.access()));
    assert(getComputedStyle(document.querySelector(".hud")).zoom === "1.15", `the HUD should zoom for large text (${getComputedStyle(document.querySelector(".hud")).zoom})`);
    T.setSetting("text", "normal");
    assert(getComputedStyle(document.querySelector(".hud")).zoom === "1", "and switch off again");
    assert(!$("set-contrast") && !("contrast" in T.settings()), "no High contrast row, and no setting behind it");
    T.toTitle();
  });
  test("Focus stays inside an open sheet, and its radio rows move with the arrow keys", () => {
    T.toTitle(); T.openSheet("settings");
    const root = $("sheet-settings"), list = [...root.querySelectorAll("button, input")].filter(el => !el.disabled && el.getClientRects().length);
    list[list.length - 1].focus();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true }));
    assert(root.contains(document.activeElement) && document.activeElement === list[0], `Tab off the end should wrap to the top (${document.activeElement && document.activeElement.id})`);
    const full = $("set-flashes").querySelector('[data-v="full"]'); T.setSetting("flashes", "full"); T.openSheet("settings"); document.querySelector('.set-cat[data-sec="access"]').click(); full.focus();
    full.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }));
    assert(T.settings().flashes === "reduced", `the arrow should pick the next choice (${T.settings().flashes})`);
    T.setSetting("flashes", "full"); T.closeSheet();
  });
  test("The performance budget: effects are capped, a game step is cheap, the page stays small", () => {
    fresh(); T.spray(2000); T.step(1 / 60);
    const P = T.perf();
    assert(P.now.particles <= P.particles && P.now.bursts <= P.bursts, `over budget: ${JSON.stringify(P.now)}`);
    fresh(); T.throwThrough(0.2, C.RING_Y, C.RING_Z); T.simReset();
    const t0 = performance.now(), n = T.simAdvance(4); const ms = (performance.now() - t0) / n;
    assert(n === Math.round(4 / T.simStep) && ms < P.stepMs, `${ms.toFixed(3)} ms a step (budget ${P.stepMs})`);
    const nodes = document.getElementsByTagName("*").length;
    assert(nodes <= P.domNodes, `${nodes} elements on the page (budget ${P.domNodes})`);
    T.toTitle();
  });
  test("The UI kit builds elements with text, attributes, data and handlers", () => {
    let clicked = 0; const el = T.h("button", { class: "chip-btn", type: "button", data: { k: "v" }, onclick: () => clicked++, "aria-label": "Poke" }, "Poke ", T.h("b", { text: "him" }));
    el.click();
    assert(el.className === "chip-btn" && el.dataset.k === "v" && el.getAttribute("aria-label") === "Poke" && el.textContent === "Poke him" && clicked === 1, el.outerHTML);
  });

  // ── v16–v18: the eight maps from checked data, their scenery, Arcade unlocks, and the story's end ──
  test("Eight maps, all from the checked map data, and everything they name is drawn by the code", () => {
    const M = T.maps(), I = T.implemented(), R = I.registry;
    assert(M.length === 8 && new Set(M.map(m => m.id)).size === 8, `${M.length} maps`);
    for (const k of ["skyline", "lane", "props", "foreground", "weather", "moon"]) for (const id of R[k]) assert(I[k].includes(id), `the registry promises ${k} "${id}" but the code draws no such thing`);
    for (const id of R.props) assert(I.near.includes(id), `no near props for "${id}"`);
    assert(new Set(M.map(m => m.fragment)).size === 8 && new Set(M.map(m => m.bosses.end)).size === 8, "eight different end bosses, each holding a different piece of Morty");
    for (const m of M) for (const k of ["mechanic", "throw", "targets", "hazards", "camera", "ambient", "music", "sfx", "transition", "reward"]) assert(m.identity[k], `${m.name} is missing its ${k} in the stage bible`);
  });
  test("Every map dresses the scene as itself: its planes, props clear of the lane, its weather, and it draws", () => {
    const looks = new Set();
    for (let i = 0; i < 8; i++) {
      fresh(); const t0 = performance.now(); T.setScene(i); const ms = performance.now() - t0; T.step(0.25);
      const S = T.scene(), m = T.maps()[i];
      assert(S.map === i && S.props >= 8 && S.clear, `${m.name}: ${JSON.stringify(S)}`);
      assert(S.weather === m.look.weather && S.moon === m.look.moon && S.fg >= 1, `${m.name} should wear its own weather, moon and frame (${JSON.stringify(S)})`);
      assert(ms < 2500, `${m.name} took ${ms.toFixed(0)} ms to dress`);
      looks.add(S.kinds.join());
    }
    assert(looks.size === 8, `eight different sets of props (${looks.size})`);
    T.setScene(0); const S = T.scene(); assert(!S.kinds.includes("digger") && S.kinds.includes("pumpkin") && S.moon === "art", "map 1 is Crow Hollow: the pumpkin rows and the drawn moon (v58: no gravedigger: he's the Graveyard's)");
    T.setScene(1); assert(T.scene().kinds.includes("digger"), "the Gilded Graveyard has its gravedigger");
    T.toTitle();
  });
  test("Arcade opens a map once Story has reached it", () => {
    T.setStats({ ...ZERO });
    assert(T.mapUnlocked(0) && !T.mapUnlocked(1), "only map 1 at first");
    T.startArcade(4); assert(T.arcade().map === 0, "a locked map starts map 1 instead");
    T.setStats({ bestStage: 5 }); assert(T.mapUnlocked(4) && !T.mapUnlocked(5), "reaching map 5 opens maps 1 to 5");
    T.toTitle(); $("play").click(); document.querySelector('#modePick [data-mode="arcade"]').click();
    assert(document.querySelectorAll("#mapList .cabinet.locked").length === 3, "three cabinets still out of order (v36)");
    document.querySelector('#mapList [data-map="6"]').click(); assert(T.state().sheet === "play", "a locked map can't be picked");
    T.closeSheet(); T.setStats({ ...ZERO }); T.toTitle();
  });
  test("End bosses give a body part and hold a shard of the Black Ring: map 1's gives the Pumpkin-Vine Curls and the Hollow Shard, once", () => {
    T.setStats({ ...ZERO, bestScore: 0 });
    for (let k = 0; k < 2; k++) { beatCrow(1); toHit(C.STAGE_BOSS); T.step(2.9); assert(T.boss().kind === "pumpkin", `map 1's end boss is the Pumpkin King (${T.boss().kind})`); T.hurtBoss(99); T.endThrow(); T.step(6); }
    const p = T.profile(); assert(p.fragments.length === 1 && p.fragments[0] === "hollow" && p.bossLog.pumpkin === 2 && T.canUse("hair", "vines"), JSON.stringify({ f: p.fragments, log: p.bossLog }));
    T.setStats({ ...ZERO, bestScore: 0 }); T.toTitle();
  });
  test("The Adventure ends after map 8: the last shard, the Black Ring whole, THE END and The Whole Reel", () => {
    T.setStats({ ...ZERO, bestScore: 0 });
    beatCrow(8); toHit(C.STAGE_BOSS); T.step(2.9); assert(T.boss().kind === "reaper", `map 8's end boss is the Reel Reaper (${T.boss().kind})`);
    T.hurtBoss(99); T.endThrow(); T.step(9);   // (the knockout's hold, the reward and the shard, then the 3.4 s ending)
    const p = T.profile();
    assert(p.storyClears === 1 && p.fragments.includes("abyss") && p.bestStage === 9 && T.canUse("wings", "shadow"), JSON.stringify({ c: p.storyClears, f: p.fragments, b: p.bestStage }));
    assert(T.state().state === "over" && /THE\s*END/.test(T.goWords()), `the reel should end (${T.state().state}, "${T.goWords()}")`);
    T.step(2.2);
    assert(/The end/.test(document.querySelector("#over .rip").textContent), "the results say The end, not Here lies");
    assert(T.achievements().find(a => a.id === "whole-reel").got, "The Whole Reel should be earned");
    T.setStats({ ...ZERO, bestScore: 0 }); T.toTitle();
  });
  test("A v12 save: stages past four mean map 5 now, and The Whole Reel becomes Half the Reel", () => {
    const m = T.migrateProfile({ bestStage: 7, achievements: ["whole-reel", "first-toss"] });
    assert(m.bestStage === 5 && m.achievements.includes("half-reel") && !m.achievements.includes("whole-reel") && m.achievements.includes("first-toss"), JSON.stringify(m));
  });

  // ── v19: the Tier and Ring Path Directors, bonus targets, and each map's hazards ──
  const BP = { xMax: 2.3, yMin: 1.25, yMax: 3.7, zMin: 4.4, zMax: 8.6 };
  test("The Tier Director: each map runs its two tiers, and Arcade climbs past 50 hits", () => {
    fresh(); assert(T.tier().id === "I", `map 1 opens on tier I (${T.tier().id})`);
    beatCrow(1); assert(T.tier().id === "II", `and runs tier II after the mini-boss (${T.tier().id})`);
    beatCrow(8); assert(T.tier().id === "VI", `the Final Reel's second half is tier VI (${T.tier().id})`);
    T.setStats({ ...ZERO, bestStage: 9 }); T.startArcade(0); T.setHits(100); assert(T.tier().id === "III", `Arcade on map 1 at 100 hits has climbed two tiers (${T.tier().id})`);
    T.setStats(ZERO); T.toTitle();
  });
  test("The Ring Path Director: every path stays in the ring's space; the carousel circles; the jump cut holds, flickers, then cuts", () => {
    fresh(); T.setStage(8); T.unfreezeRing();
    const ph = Array.from({ length: 121 }, (_, i) => i * 0.1);
    for (const mode of T.ringPaths()) for (const q of T.ringPath(mode, ph)) assert(Math.abs(q.x) <= BP.xMax && q.y >= BP.yMin && q.y <= BP.yMax && q.z >= BP.zMin && q.z <= BP.zMax, `${mode} leaves the ring's space at ${JSON.stringify(q)}`);
    const c = T.ringPath("circle", ph), xs = c.map(q => q.x), zs = c.map(q => q.z);
    assert(Math.max(...xs) - Math.min(...xs) > 2.5 && Math.max(...zs) - Math.min(...zs) > 2.2, "the carousel should ride a wide circle through depth");
    const j = T.ringPath("jumpcut", [0.1, 0.4, 0.6, 0.8, 0.95, 1.1]);
    assert(Math.abs(j[0].x - j[2].x) < 1e-9 && Math.abs(j[0].z - j[2].z) < 1e-9 && j[1].tell === 0, "a jump cut holds its corner");
    assert(j[4].tell > 0 && Math.abs(j[5].x - j[3].x) > 0.5, "then flickers, then cuts to the next corner");
    beatCrow(4); assert(T.ringMode().mode === "circle", `the Drowned Theater's second half rides the revolving stage (${T.ringMode().mode})`);
    beatCrow(8); assert(T.ringMode().mode === "jumpcut", `the Black Abyss cuts (${T.ringMode().mode})`);
    T.toTitle();
  });
  test("Wind pushes the throw sideways in the Whistling Woods, and the guide bends with it", () => {
    fresh(); T.setStage(3); T.freezeRing(0.8, C.RING_Y);
    T.setWind(0); throwAndSettle(0, C.RING_Y); assert(!T.state().lastResult.make, `no wind: aimed at the middle, a ring 0.8 m off is missed (${T.state().lastResult.kind})`);
    fresh(); T.setStage(3); T.freezeRing(0.8, C.RING_Y); T.setWind(2.4);
    const pc = T.predictCrossing(0, C.RING_Y), drift = 0.5 * 2.4 * C.FLIGHT_T * C.FLIGHT_T;
    near(pc.x, drift, 0.02, "the guide's crossing should drift with the wind");
    assert(!$("wind").hidden && /2\.4/.test($("wind").textContent), `the HUD shows the wind (${$("wind").textContent})`);
    throwAndSettle(0, C.RING_Y); const s = T.state();
    assert(s.lastResult.make && Math.abs(s.lastCross.x - drift) < 0.03, `the wind should carry it into the ring (${s.lastResult.kind}, crossed at ${s.lastCross.x.toFixed(3)})`);
    assert(T.runStats().windCurves === 1, "aimed off the ring and bent in by the wind: a Wind Curve (v53)");
    assert(!$("wind").hidden && T.hz().wind !== 2.4, "and it turns after the throw");
    T.setWind(0); T.toTitle(); assert($("wind").hidden, "no wind sign out of the woods");
  });
  test("Bats, falling bones, balloons and the pendulum knock the skull out of the air; Ghost Toss slips through", () => {
    for (const [stage, kind] of [[2, "bat"], [6, "bone"], [4, "balloon"]]) {
      fresh(); T.setStage(stage); T.freezeRing(0, C.RING_Y); const a = T.aimFor(0, C.RING_Y, C.RING_Z), q = T.skullPathAt(a.AX, a.AY, 3.6 / (C.RING_Z / C.FLIGHT_T));
      T.plantHazard(kind, q.x, q.y, q.z); const lives = T.state().lives; T.throwAt(a.AX, a.AY); T.step(2.5);
      assert(T.state().lastResult.kind === kind && T.state().lives === lives - 1, `${kind}: got ${T.state().lastResult.kind}`);
      T.givePower("ghost"); T.plantHazard(kind, q.x, q.y, q.z); T.throwAt(a.AX, a.AY); T.step(2.5);
      assert(T.state().lastResult.make, `Ghost Toss should slip past the ${kind} (${T.state().lastResult.kind})`);
    }
    fresh(); T.setStage(7); T.freezeRing(0, C.RING_Y); const P = T.pend(), tc = P.z / (C.RING_Z / C.FLIGHT_T), a = T.aimFor(0, P.y - P.L, P.z);
    T.setPendT(-tc); T.throwAt(a.AX, a.AY); T.step(2.5);
    assert(T.state().lastResult.kind === "pendulum", `the pendulum's bob, at the bottom of its swing as the skull passes, should clang it (${T.state().lastResult.kind})`);
    T.setPendT(-tc + T.pend().period / 4); T.freezeRing(0, C.RING_Y); const b = T.aimFor(0, C.RING_Y, C.RING_Z); T.throwAt(b.AX, b.AY); T.step(2.5);
    assert(T.state().lastResult.make, `a quarter swing later the lane is clear (${T.state().lastResult.kind})`);
    T.toTitle();
  });
  test("Hazards come round on the tier's schedule and rest during boss fights", () => {
    fresh(); T.setStage(2); for (let i = 0; i < 6; i++) T.hazardsAfterThrow();
    assert(T.hz().list.some(h => h.kind === "bat"), "the Gilded Graveyard sends a bat every few throws");
    fresh(); T.setStage(5); T.fogIn(); T.step(1.2); assert(T.hz().fog > 0.5, `the Black Marsh's fog rolls in (${T.hz().fog.toFixed(2)})`);
    T.step(4); assert(T.hz().fog < 0.05, "and rolls out again");
    beatCrow(7); toHit(C.STAGE_BOSS); T.step(2.9); T.freezeRing(0, C.RING_Y); const P = T.pend(), tc = P.z / (C.RING_Z / C.FLIGHT_T), a = T.aimFor(0, P.y - P.L, P.z);
    T.setPendT(-tc); T.throwAt(a.AX, a.AY); T.step(2.5);
    assert(T.state().lastResult.kind !== "pendulum", "no pendulum during the end boss");
    T.toTitle();
  });
  test("Bonus targets hang behind the ring: a make that flies on through one pays points and bones", () => {
    fresh(); T.setStage(2); T.freezeRing(0, C.RING_Y); const a = T.aimFor(0, C.RING_Y, C.RING_Z), t2 = (C.RING_Z + 2) / (C.RING_Z / C.FLIGHT_T), q = T.skullPathAt(a.AX, a.AY, t2);
    T.plantTarget(q.x, q.y, q.z); const bones = T.bones(), hits = T.profile().targetHits || 0;
    T.throwAt(a.AX, a.AY); T.step(1.3); const s = T.state();   // (the skull reaches it about 1.1 s after the throw)
    assert(s.lastResult.make && T.targets()[0].pop > 0, `the make should carry on into the target (${s.lastResult.kind}, ${JSON.stringify(T.targets())})`);
    assert(T.bones() >= bones + 3 && T.profile().targetHits === hits + 1, "a target pays bones and counts");
    fresh(); assert(T.targets().length === 0, "map 1's first tier hangs no targets");
    T.setStage(6); T.refillTargets(); assert(T.targets().length === 2 && T.targets().every(x => x.kind === "bonefruit"), `the Bone Desert hangs its bones (${JSON.stringify(T.targets())})`);
    T.toTitle();
  });
  test("A run's play comes from one seeded stream: the same seed lays out the same targets and hazards", () => {
    const lay = seed => { fresh(); T.setStage(6); T.seedRun(seed); T.refillTargets(); for (let i = 0; i < 4; i++) T.hazardsAfterThrow(); return JSON.stringify(T.targets()); };
    assert(lay(77) === lay(77) && lay(77) !== lay(78), "same seed, same run; another seed, another run");
    T.toTitle();
  });

  // ── v20: the boss framework and all sixteen bosses ──
  const watchBoss = secs => {   // step through a fight, noting where the ring goes and what the boss does
    const seen = { pos: [], states: new Set(), shots: 0 };
    for (let t = 0; t < secs; t += 0.1) { T.step(0.1); const r = T.state().ring; seen.pos.push({ ...r }); seen.states.add(T.visualSystem().boss); seen.shots = Math.max(seen.shots, T.seeds().length); }
    return seen;
  };
  const inPlay = q => q.y < 0.9 || (Math.abs(q.x) <= 2.35 && q.y <= 3.8 && q.z >= 4.3 && q.z <= 8.7);   // (a diving ring may go under; one in play stays in the ring's space)
  test("Every map's mini-boss takes the ring, moves it, gives its tell, and falls", () => {
    const M = T.maps();
    for (let n = 1; n <= 8; n++) {
      fresh(); T.setStage(n); toHit(C.STAGE_MINI); const id = M[n - 1].bosses.mini;
      assert(T.boss() && T.boss().kind === id, `map ${n}: the mini-boss should be ${id} (${T.boss() && T.boss().kind})`);
      const s = watchBoss(9), xs = s.pos.map(q => q.x), ys = s.pos.map(q => q.y), zs = s.pos.map(q => q.z);
      assert(Math.max(...xs) - Math.min(...xs) + Math.max(...ys) - Math.min(...ys) + Math.max(...zs) - Math.min(...zs) > 1, `${id} should move the ring`);
      assert(s.pos.every(inPlay), `${id} carries the ring out of play: ${JSON.stringify(s.pos.find(q => !inPlay(q)))}`);
      assert(s.states.has("attack"), `${id} should give its tell (${[...s.states]})`);
      T.hurtBoss(99); assert(T.boss().dead, `${id} should go down`); T.endThrow(); T.step(3.4);
      assert(!T.boss() && T.state().phase === "B", `after ${id}, the second half (${T.state().phase})`);
    }
    T.toTitle();
  });
  test("Every map's end boss attacks with its own volleys, told first, and falls holding its shard", () => {
    const M = T.maps(); T.setStats({ ...ZERO, bestScore: 0 });
    for (let n = 1; n <= 8; n++) {
      beatCrow(n); toHit(C.STAGE_BOSS); const id = M[n - 1].bosses.end;
      assert(T.boss() && T.boss().kind === id, `map ${n}: the end boss should be ${id} (${T.boss() && T.boss().kind})`);
      const s = watchBoss(11);
      assert(s.shots > 0 && s.states.has("attack"), `${id} should throw something, after a tell (${s.shots} shots; ${[...s.states]})`);
      assert(s.pos.every(inPlay), `${id} carries the ring out of play: ${JSON.stringify(s.pos.find(q => !inPlay(q)))}`);
      T.hurtBoss(99); T.endThrow(); T.step(n === 8 ? 9 : 6);
      assert(T.profile().fragments.includes(M[n - 1].fragment), `${id} should give up the Black Ring's ${M[n - 1].fragment}`);
    }
    assert(T.profile().fragments.length === 8 && T.profile().storyClears === 1, "all eight shards, and the Adventure finished");
    T.setStats({ ...ZERO, bestScore: 0 }); T.toTitle();
  });
  test("A new end boss's volleys knock the skull down, and a Ghost Toss turns up at two-thirds and one-third health", () => {
    beatCrow(1); toHit(C.STAGE_BOSS); T.step(2.9); T.freezeRing(0, C.RING_Y);
    const a = { AX: 0, AY: C.RING_Y }, q = T.skullPathAt(a.AX, a.AY, 3 / (C.RING_Z / C.FLIGHT_T)), lives = T.state().lives;
    T.plantSeed(q.x, q.y, q.z); T.throwAt(a.AX, a.AY); T.step(2.5);
    assert(T.state().lastResult.kind === "seed" && T.state().lives === lives - 1, `a clod to the face (${T.state().lastResult.kind})`);
    const max = T.boss().max; T.hurtBoss(max - Math.ceil(max * 2 / 3)); T.endThrow();
    assert(T.pickup() && T.pickup().id === "ghost", "a Ghost Toss at two-thirds health");
    T.toTitle();
  });

  // ── v21: the Power-Up Director ──
  test("Power-ups are rare but fair: 2% a hit, score milestones from 2,000, pity, four a stage at most, no repeats", () => {
    fresh(); let spawns = [], early = 0;
    for (let seed = 1; seed <= 40; seed++) {
      T.seedRun(seed); const r = T.powerRolls(60);
      assert(r.length <= 4, `seed ${seed}: ${r.length} in one stage`);
      assert(r.every(x => x.hit >= 3), `seed ${seed}: one came before the third hit (${JSON.stringify(r)})`);
      assert(r.length >= 1, `seed ${seed}: pity should make one certain in 60 makes (${JSON.stringify(r)})`);
      if (r[0].hit <= 25) early++;
      for (let i = 1; i < r.length; i++) assert(r[i].id !== r[i - 1].id, `seed ${seed}: the same prop twice running`);
      assert(r.every(x => x.id !== "cursed"), "no Cursed Skull in a first half");
      spawns = spawns.concat(r);
    }
    assert(early >= 20, `most runs see one in the first 25 hits (${early}/40)`);
    const kinds = new Set(spawns.map(x => x.id)); assert(kinds.size >= 5, `a good spread of props (${[...kinds]})`);
    T.seedRun(4); const noScore = T.powerRolls(25, "A", 0), withScore = T.powerRolls(25, "A", 400); void noScore;
    assert(withScore.length >= 1, `score milestones are chances of their own (${JSON.stringify(withScore)})`);
    T.seedRun(5); const one = JSON.stringify(T.powerRolls(40)); T.seedRun(5); assert(JSON.stringify(T.powerRolls(40)) === one, "the same seed rolls the same props");
    T.toTitle();
  });
  test("v45: power-ups come round in a shuffled cycle, four a stage, milestones from 2,000 growing each stage", () => {
    fresh(); const firsts = new Set(), orders = new Set();
    for (let seed = 1; seed <= 30; seed++) {
      T.seedRun(seed); const d = T.powerDeal(14);   // fourteen drops in a row, the stage cap and the carry rules aside
      const a = d.slice(0, 7), b = d.slice(7);
      assert(new Set(a).size === 7 && new Set(b).size === 7, `seed ${seed}: every prop once before any comes again (${d})`);
      for (let i = 1; i < d.length; i++) assert(d[i] !== d[i - 1], `seed ${seed}: the same prop twice running (${d})`);
      firsts.add(d[0]); orders.add(a.join());
    }
    assert(firsts.size >= 5 && orders.size >= 25, `the order changes run to run (${firsts.size} first props, ${orders.size} orders)`);
    const m = T.powerMilestones();
    assert(m[0] === 2000 && m[1] > m[0] && m[2] > m[1] && m[3] > m[2], `milestone steps grow each stage (${m})`);
    T.seedRun(7); const A = T.powerRolls(25, "A", 900), B = T.powerRolls(25, "B", 900);
    assert(A.length <= 4 && B.length <= 4 && A.length + B.length >= 3, `four a stage at most, each stage its own four (${A.length} + ${B.length})`);
    T.toTitle();
  });
  test("v45: a hot streak sets the ring on fire, and a miss puts it out", () => {
    fresh(); assert(T.ringHeat() === 0, "a cold ring to start");
    for (let i = 0; i < 6; i++) { T.freezeRing(0, C.RING_Y); throwAndSettle(0, C.RING_Y); }
    assert(T.state().streak >= 6 && T.ringHeat() > 0, `six in a row lights it (${T.state().streak}, ${T.ringHeat()})`);
    T.freezeRing(0, C.RING_Y); throwAndSettle(3, C.RING_Y);
    assert(T.ringHeat() === 0, "a miss puts it out");
    T.toTitle();
  });
  test("In play, a make can bring a power-up; a miss never does", () => {
    fresh(); T.seedRun(3); let got = null;
    for (let i = 0; i < 20 && !got; i++) { T.setPoints(T.state().score + 3000); T.freezeRing(0, C.RING_Y); throwAndSettle(0, C.RING_Y); if (T.pickup()) got = T.state().stageHits; }   // (every make crosses a score milestone)
    assert(got && got >= 3, `a prop should float in within a run of makes (at hit ${got})`);
    fresh(); T.seedRun(3); for (let i = 0; i < 12; i++) { T.givePower("second"); T.freezeRing(0, C.RING_Y); throwAndSettle(2.5, C.RING_Y); }   // (Second Chance keeps the run going)
    assert(!T.pickup(), "misses never bring one");
    T.toTitle();
  });

  // ── v22: one more skull, and runs that survive a reload ──
  const missOut = () => { T.calm(); T.freezeRing(0, C.RING_Y); T.throwAt(0, C.RING_Y + 3); T.step(3); };   // a wild miss
  step(() => T.continues(true));   // (the tests before these expect the last skull to end the run)
  test("Out of skulls: one more for bones, and the score stays", () => {
    T.setStats({ ...ZERO, bones: 1000 }); fresh(); toHit(3); T.setLives(1); const score = T.state().score;
    missOut();
    assert(T.state().state === "continue" && !$("continueBox").hidden && /200/.test($("contBones").textContent), `a continue should be offered (${T.state().state})`);
    $("contBones").click(); const s = T.state();
    assert(s.state === "ready" && s.lives === 1 && s.score === score && s.streak === 0 && T.bones() === 800 && $("continueBox").hidden, JSON.stringify({ st: s.state, l: s.lives, sc: s.score, b: T.bones() }));
    assert(T.runStats().continues === 1 && T.profile().continues === 1, "the run and the profile count the continue");
    T.toTitle();
  });
  test("No thanks ends the run, and so does the clock", () => {
    T.setStats({ ...ZERO, bones: 1000 }); fresh(); T.setLives(1); missOut(); assert(T.state().state === "continue", "offered");
    $("contNo").click(); assert(T.state().state === "over" && $("continueBox").hidden, `No thanks ends it (${T.state().state})`);
    fresh(); T.setLives(1); missOut(); T.step(8.5); assert(T.state().state === "over", `eight seconds and it's over (${T.state().state})`);
    T.toTitle();
  });
  test("One continue a map; none without the bones or an ad; a short reel works where there's an ad provider", () => {
    T.setStats({ ...ZERO, bones: 1000 }); fresh(); T.setLives(1); missOut(); $("contBones").click(); T.setLives(1); missOut();
    assert(T.state().state === "over", `a second death on the same map ends the run (${T.state().state})`);
    T.setStats({ ...ZERO, bones: 50 }); fresh(); T.setLives(1); missOut(); assert(T.state().state === "over", "no bones, no ad: no offer");
    T.fakeAds(true); T.setStats({ ...ZERO, bones: 50 }); fresh(); T.setLives(1); missOut();
    assert(T.state().state === "continue" && !$("contAd").hidden && $("contBones").disabled, "with an ad provider the reel is offered, the bones button greyed");
    const b0 = T.bones(); $("contAd").click(); assert(T.state().state === "ready" && T.state().lives === 1 && T.bones() === b0, `the reel buys the skull (${T.state().state}, ${T.bones()} vs ${b0})`);
    T.fakeAds(false); T.setStats(ZERO); T.toTitle();
  });
  test("A run that used a continue never goes on the leaderboard", () => {
    T.setStats({ ...ZERO, bones: 1000, board: true }); fresh(); toHit(4); T.setLives(1); missOut(); $("contBones").click();
    T.endRun(); T.step(1); assert(T.profile().boardBest === null, `the board run should stay empty (${JSON.stringify(T.profile().boardBest)})`);
    assert(T.profile().bestScore > 0, "but it still counts for your own best");
    T.setStats({ ...ZERO, bestScore: 0 }); T.toTitle();
  });
  test("A run survives a reload: it picks up where it left off, a boss fight from its start, a continue offered again", () => {
    T.snapOn(); fresh(); toHit(3); toHit(4); T.givePower("deadeye"); T.freezeRing(0, C.RING_Y); throwAndSettle(0, C.RING_Y);
    const was = T.state(); assert(T.snapshot() && T.snapshot().score === was.score, "each settled throw is kept");
    T.toTitle(); assert(!$("resumeRunBtn").hidden, "the title offers to resume");
    $("resumeRunBtn").click(); const s = T.state();
    assert(s.state === "ready" && s.score === was.score && s.hits === was.hits && s.lives === was.lives && s.stageHits === was.stageHits && T.powers().deadeye, JSON.stringify({ s, was }));
    fresh(); toHit(C.STAGE_MINI); assert(T.boss(), "the mini-boss has started"); T.step(3); T.freezeRing(T.state().ring.x, T.state().ring.y, T.state().ring.z); T.hurtBoss(1); T.endThrow();
    T.toTitle(); $("resumeRunBtn").click(); assert(T.boss() && T.boss().hp === T.boss().max && T.state().phase === "mini", `a fight comes back from its start (${T.state().phase})`);
    T.setStats({ ...ZERO, bones: 1000 }); fresh(); T.setLives(1); missOut(); assert(T.state().state === "continue", "offered");
    T.toTitle(); $("resumeRunBtn").click(); assert(T.state().state === "continue", `after a reload the offer is made again (${T.state().state})`);
    $("contNo").click(); T.toTitle(); assert($("resumeRunBtn").hidden, "a finished run leaves nothing to resume");
    T.snapOn(false); T.setStats(ZERO); T.toTitle();
  });
  step(() => T.continues(false));

  // ── v23: the reel's own cards ──
  const skipCards = () => { for (let i = 0; i < 6 && T.reel().card; i++) { T.skipReel(); T.step(0.02); } };
  const beatBoth = stage => { fresh(); skipCards(); T.setStage(stage); toHit(C.STAGE_MINI); T.step(2.6); T.hurtBoss(99); T.endThrow(); T.step(3.2); toHit(C.STAGE_BOSS); T.step(2.9); T.hurtBoss(99); T.endThrow(); };
  step(() => T.cards(true));
  test("A Story run opens on Reel One's title card, then the countdown leader (v49: after the card); the throw waits, and a tap skips", () => {
    T.setStats(ZERO); T.start(); T.freezeRing(0, C.RING_Y);
    let R = T.reel(); assert(R.card === "title" && R.n === 1 && R.title === T.maps()[0].name && /Reel One of Eight/.test(R.reel) && T.state().state === "cine", `the map's card first (${JSON.stringify(R)})`);
    assert(!T.throwAt(0, C.RING_Y), "no throw while a card is up");
    T.step(2.9); R = T.reel(); assert(R.card === "leader" && !R.hidden, `then the countdown (${JSON.stringify(R)})`);
    $("reelCard").dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })); T.step(0.05);
    R = T.reel(); assert(R.hidden && T.state().state === "ready", `a tap skips to play (${JSON.stringify(R)})`);
    T.start(); R = T.reel(); assert(R.card === "title", `the next run opens on its title too (${R.card})`);
    T.step(2.9); assert(T.reel().card === "leader", "and v50: the countdown plays every run");
    T.step(2.8); assert(!T.reel().hidden && T.reel().rot > 0.2, `it corrupts and fades into the map (${T.reel().rot})`);
    T.step(0.9); assert(T.state().state === "ready" && T.reel().hidden, "then play");
    T.toTitle();
  });
  test("Between reels: the changeover cues, then the next reel's card; after Reel Four, an intermission", () => {
    T.setStats(ZERO); beatBoth(1); const c0 = T.reel().cues; T.step(6);   // (the knockout's hold, the 2.8 s boss-out, then the shard)
    let R = T.reel(); assert(c0 === 2 && R.card === "title" && R.n === 2 && /Reel Two/.test(R.reel), `map 2's card after two cues (${c0}, ${JSON.stringify(R)})`);
    skipCards(); assert(T.state().state === "ready" && T.state().stage === 2, "and map 2 plays");
    beatBoth(4); T.step(6); R = T.reel(); assert(R.card === "intermission" && /shards of the Black Ring/.test($("rcSub").textContent), `the intermission after Reel Four (${JSON.stringify(R)})`);
    T.step(3.7); R = T.reel(); assert(R.card === "title" && R.n === 5, `then Reel Five (${JSON.stringify(R)})`);
    T.step(2.9); R = T.reel(); assert(R.card === "leader", `then the countdown into it (v50) (${JSON.stringify(R)})`);
    T.step(3.6); assert(T.state().state === "ready" && T.state().stage === 5, "and play");
    T.setStats(ZERO); T.toTitle();
  });
  test("After Reel Eight: THE END card, then the headstone", () => {
    T.setStats(ZERO); beatBoth(8); T.step(7.2);
    const R = T.reel(); assert(R.card === "end" && R.title === "The End" && T.state().state === "cine", `THE END (${JSON.stringify(R)})`);
    T.step(4.7); assert(T.state().state === "over" && T.reel().hidden, `the reel ends (${T.state().state})`);
    T.step(1); assert(/The end/.test(document.querySelector("#over .rip").textContent), "on the stone's The end");
    T.setStats(ZERO); T.toTitle();
  });
  test("Title cards Short: a brief card and no leader; Off: straight into play; Arcade: the map's own card", () => {
    T.cards(true); T.setSetting("cards", "short"); T.setStats(ZERO); T.start();
    let R = T.reel(); assert(R.card === "title" && R.dur <= 1.5, `a short card, no leader (${JSON.stringify(R)})`);
    T.step(1.5); assert(T.state().state === "ready", "then play");
    T.setSetting("cards", "off"); T.start(); assert(T.reel().hidden && T.state().state === "ready", "off: no card at all");
    T.setSetting("cards", "full"); T.setStats({ ...ZERO, bestStage: 9 }); T.startArcade(2);
    R = T.reel(); assert(R.card === "title" && R.n === 3 && /no bosses/.test(R.reel), `Arcade opens on its map's card, no leader (${JSON.stringify(R)})`);
    skipCards(); T.setStats(ZERO); T.toTitle();
  });
  step(() => T.cards(false));

  // ── v24: every word has an ID, and Morty has a personality ──
  const POOLS = ["grab", "last", "cursed", "missing", "hot", "perfect", "nearmiss", "bonk", "bossdown", "continue", "encore", "resume", "idle", "end"];
  test("Every word has an ID: the markup, the code's text and Morty's lines come from the string table", () => {
    assert(document.querySelector('#play [data-t]').textContent === T.tr("ui.play") && T.tr("ui.play") === "Play", "the Play button reads its string");
    assert(T.tr("cont.bones", { n: "200" }) === "Spend 200 bones" && T.tr("no.such.string") === "no.such.string", "placeholders fill in; a missing ID shows itself");
    const L = T.voiceLines(); for (const p of POOLS) assert((L[p] || []).length >= 2, `Morty's ${p} lines (${(L[p] || []).length})`);
    for (const b of Object.keys(T.bossInfo ? T.bossInfo() : {})) assert((L["boss." + b] || []).length >= 1, `a line for ${b}`);
    for (let n = 1; n <= 8; n++) assert((L["map." + n] || []).length, `a line for map ${n}`);
    for (const f of ["hollow", "gilded", "whistle", "drowned", "marsh", "desert", "clockwork", "abyss"]) assert((L["fragment." + f] || []).length, `a line for the ${f} shard`);
    assert(T.lineIds("morty.grab.").length >= 28 && T.lineIds("morty.grab.")[0] === "morty.grab.01", "line IDs are voice-line IDs");
    T.setStats(ZERO); fresh(); toHit(C.STAGE_MINI); T.step(3); T.toTitle();
    const miss = T.missingStrings().filter(k => k !== "no.such.string"); assert(!miss.length, `no string went missing in play (${miss.join(", ")})`);
  });
  test("The pseudo-locale: every tagged text changes, numbers survive, and nothing overflows its button", () => {
    T.toTitle(); T.lang("pseudo");
    const play = document.querySelector('#play [data-t]').textContent;
    assert(/^\[Ƥļáý ·+\]$/.test(play), `accented and padded (${play})`);
    assert(/200/.test(T.tr("cont.bones", { n: "200" })) && /\{/.test(T.tr("cont.bones")) === true, "placeholders keep their braces until filled");
    const inside = (a, b) => a.left >= b.left - 1 && a.right <= b.right + 1 && a.top >= b.top - 1 && a.bottom <= b.bottom + 1;
    const over = sel => [...document.querySelectorAll(sel)].filter(el => el.getClientRects().length).filter(el => {   // the label's box must sit inside its button (a pip may overhang on purpose)
      const lbl = el.matches("[data-t]") ? el : el.querySelector("[data-t]") || el;
      return lbl.scrollWidth > lbl.clientWidth + 1 || (lbl !== el && !inside(lbl.getBoundingClientRect(), el.getBoundingClientRect()));
    }).map(el => el.textContent.slice(0, 24));
    let bad = over("#title .btn, #title .chip-btn"); assert(!bad.length, `title buttons overflow: ${bad.join(" | ")}`);
    T.openSheet("settings"); bad = over("#sheet-settings .seg button, #sheet-settings .lbl"); T.closeSheet(); assert(!bad.length, `settings overflow: ${bad.join(" | ")}`);
    T.continues(true); T.setStats({ ...ZERO, bones: 1000 }); fresh(); T.setLives(1); missOut();
    bad = over("#continueBox .btn, #continueBox .ghost-btn"); $("contNo").click(); T.continues(false); assert(!bad.length, `continue buttons overflow: ${bad.join(" | ")}`);
    T.lang("en"); assert(document.querySelector('#play [data-t]').textContent === "Play", "and back to English");
    T.setStats(ZERO); T.toTitle();
  });
  test("Morty deals his lines like cards: none again until the whole pool has been said", () => {
    T.voiceTest(true); const n = T.lineIds("morty.grab.").length, seen = new Set();
    for (let i = 0; i < n; i++) { T.say("grab"); seen.add(T.voice().id); }
    const last = T.voice().id; T.say("grab");
    assert(seen.size === n && T.voice().id !== last, `${seen.size} of ${n} different lines, and the next round doesn't open on the last one`);
    T.voiceTest(false);
  });
  test("Morty's big moments always get a line; the rest wait their turn; and he nags once if you stall", () => {
    T.setStats(ZERO); fresh(); T.voiceTest(true); toHit(C.STAGE_MINI);
    assert(T.voice().pool === "boss.crow", `the Crow King walks on to a line (${T.voice().pool})`);
    const id = T.voice().id; T.step(2.4); T.freezeRing(T.state().ring.x, T.state().ring.y, T.state().ring.z); T.hurtBoss(1);
    assert(T.voice().id === id, "a small moment inside the cooldown stays quiet");
    T.hurtBoss(99); T.endThrow(); assert(T.voice().pool === "bossdown", `the mini-boss falls to a line (${T.voice().pool})`);
    T.step(3.2); const said = T.voice().said; T.step(12.5);
    assert(T.voice().pool === "idle" && T.voice().said === said + 1, `twelve seconds idle gets a nudge (${T.voice().pool})`);
    T.step(13); assert(T.voice().said === said + 1, "once per lull");
    T.continues(true); T.setStats({ ...ZERO, bones: 1000 }); fresh(); T.setLives(1); missOut();
    assert(T.voice().pool === "continue", `the offer of one more skull gets a line (${T.voice().pool})`);
    $("contBones").click(); assert(T.voice().pool === "encore", `and taking it (${T.voice().pool})`);
    T.continues(false); T.voiceTest(false); T.setStats(ZERO); T.toTitle();
  });
  test("His mood picks his lines: nervous on the last skull, cocky on a streak, grumpy after misses", () => {
    fresh(); assert(T.voice().mood === "chipper", T.voice().mood);
    T.setLives(1); assert(T.voice().mood === "nervous", T.voice().mood);
    T.setLives(3); T.setStreak(6); assert(T.voice().mood === "cocky", T.voice().mood);
    T.setStreak(0); T.setLives(5); T.freezeRing(0, C.RING_Y); throwAndSettle(2.5, C.RING_Y); T.freezeRing(0, C.RING_Y); throwAndSettle(2.5, C.RING_Y);
    assert(T.voice().mood === "grumpy", T.voice().mood);
    T.toTitle();
  });

  // ── v25: signature shots and the cartoon camera ──
  const shotAt = (x, y, z = C.RING_Z) => { T.calm(); T.freezeRing(x, y, z); assert(T.throwThrough(x, y, z), "throw refused"); T.step(2.5); return T.lastShots(); };
  step(() => T.shots(true));
  test("Signature shots by where the ring was: dead centre, a Long Bomb, Point Blank, the Top Corner; each pays and is counted", () => {
    T.setStats(ZERO); fresh(); const s0 = T.state().score;
    let s = shotAt(0, C.RING_Y); assert(s.includes("deadcentre") && T.profile().shots.deadcentre === 1, `a perfect through the middle is Dead Centre (${s})`);
    assert(T.state().score === s0 + 250 + 450, `250 for the perfect, 150 × rarity 3 for the shot (${T.state().score})`);
    s = shotAt(0.2, 2.3, 8.0); assert(s.includes("longbomb") && !s.includes("pointblank"), `a ring at 8 m is a Long Bomb (${s})`);
    s = shotAt(0, 2.3, 4.7); assert(s.includes("pointblank"), `a ring at 4.7 m is Point Blank (${s})`);
    s = shotAt(2.0, 2.3, 6.0); assert(s.includes("corner"), `a ring at the frame's edge is the Top Corner (${s})`);
    T.calm(); T.freezeRing(0.6, 2.5, 6.0); T.throwThrough(0.6 + holeClear(T.state().ring.rc) * 0.6, 2.5, 6.0); T.step(2.5);
    assert(T.state().lastResult.kind === "swish" && !T.lastShots().length, `an ordinary swish in the middle of the space earns nothing (${T.lastShots()})`);
    T.toTitle();
  });
  test("Signature shots by what you did: led it, rode the wind, threaded a hazard, flew on into a target, phased through", () => {
    T.setStats(ZERO); fresh(); T.calm(); T.freezeRing(-1.6, C.RING_Y); T.throwThrough(0.2, C.RING_Y, C.RING_Z); T.freezeRing(0.2, C.RING_Y); T.step(2.5);
    assert(T.lastShots().includes("leading"), `leading a ring 1.8 m is Leading Man (${T.lastShots()})`);
    fresh(); T.setStage(3); T.freezeRing(0.8, C.RING_Y); T.setWind(2.4); throwAndSettle(0, C.RING_Y);
    assert(T.state().lastResult.make && T.lastShots().includes("windrider"), `carried 0.8 m by the wind is Wind Rider (${T.lastShots()})`);
    fresh(); T.setStage(6); T.freezeRing(0, C.RING_Y); let a = T.aimFor(0, C.RING_Y, C.RING_Z), q = T.skullPathAt(a.AX, a.AY, 3.6 / (C.RING_Z / C.FLIGHT_T));
    T.plantHazard("balloon", q.x + 0.75, q.y, q.z); T.throwAt(a.AX, a.AY); T.step(2.5);
    assert(T.state().lastResult.make && T.lastShots().includes("needle"), `a balloon passed by a whisker is Thread the Needle (${T.state().lastResult.kind}, ${T.lastShots()})`);
    fresh(); T.setStage(2); T.freezeRing(0, C.RING_Y); a = T.aimFor(0, C.RING_Y, C.RING_Z); q = T.skullPathAt(a.AX, a.AY, (C.RING_Z + 2) / (C.RING_Z / C.FLIGHT_T));
    T.plantTarget(q.x, q.y, q.z); T.throwAt(a.AX, a.AY); T.step(2.5);
    assert(T.lastShots().includes("twofer"), `a make that flies on into a target is Two for One (${T.lastShots()})`);
    fresh(); T.givePower("ghost"); T.freezeRing(0, C.RING_Y); const r = T.state().ring; throwAndSettle(r.x + r.rc - 0.02, r.y);
    assert(T.lastShots().includes("phantom"), `a Ghost Toss through the rim is Phantom (${T.state().lastResult.kind}, ${T.lastShots()})`);
    T.toTitle();
  });
  test("The big ones: a Hat Trick, a Buzzer Beater and a Knockout Blow hold the reel; the rarest takes the card", () => {
    T.setStats(ZERO); fresh(); shotAt(0, C.RING_Y); shotAt(0, C.RING_Y); const s = shotAt(0, C.RING_Y);
    assert(s.includes("hattrick"), `three perfects running is a Hat Trick (${s})`);
    fresh(); T.setLives(1); T.clearCamLog(); const b = shotAt(0, C.RING_Y);
    assert(b.includes("buzzer") && b.includes("deadcentre") && T.bursts().some(w => /BUZZER BEATER/.test(w)), `a perfect on the last skull: the Buzzer Beater takes the card (${b}, ${T.bursts()})`);
    assert(T.camfx().log.includes("hold"), `a big one holds the reel (${T.camfx().log})`);
    fresh(); toHit(C.STAGE_MINI); T.step(3); T.hurtBoss(T.boss().max - 1); const r = T.state().ring;
    const k = shotAt(r.x, r.y, r.z); assert(k.includes("knockout") && T.boss().dead, `a perfect that puts a boss down is a Knockout Blow (${k})`);
    T.toTitle();
  });
  test("The cartoon camera: a crash zoom punches in, a whip pan slides, a boss walks on to a Dutch tilt, and Camera Still leaves it level", () => {
    T.setStats(ZERO); fresh(); T.calm(); T.freezeRing(0.2, 2.3, 8.0); T.throwThrough(0.2, 2.3, 8.0); T.step(1.2);
    let f = T.camfx(); assert(f.kind === "crash" && /scale\(1\.0[1-9]/.test(f.css), `a Long Bomb crash-zooms (${JSON.stringify(f)})`);
    T.step(1.5); T.freezeRing(2.0, 2.3, 6.0); T.throwThrough(2.0 - holeClear(T.state().ring.rc) * 0.6, 2.3, 6.0); T.step(1.1);   // (a swish: a perfect would be Dead Centre, which outranks it)
    f = T.camfx(); assert(f.kind === "whip" && /translateX\(-?[1-9]/.test(f.css), `the Top Corner whips the frame (${JSON.stringify(f)})`);
    T.step(2); assert(T.camfx().css === "", "and it comes back to rest");
    fresh(); T.calm(); T.setHits(C.STAGE_MINI); T.stageCheck(); T.step(0.4); f = T.camfx(); assert(f.kind === "dutch" && /rotate\((?!0\.00)/.test(f.css), `the mini-boss walks on to a Dutch tilt (${JSON.stringify(f)})`);
    T.step(2); assert(T.camfx().css === "", "then the frame comes level");
    T.setSetting("camera", "still"); fresh(); T.calm(); T.freezeRing(0.2, 2.3, 8.0); T.throwThrough(0.2, 2.3, 8.0); T.step(1.2);
    f = T.camfx(); assert(!f.kind && f.css === "" && T.lastShots().includes("longbomb"), `Still: the shot counts, the frame stays put (${JSON.stringify(f)})`);
    T.setSetting("camera", "full"); T.toTitle();
  });
  test("The profile lists the twelve signature shots, what each takes and how often you've made it", () => {
    T.setStats({ ...ZERO, shots: { deadcentre: 3, longbomb: 1 } }); T.toTitle(); T.openSheet("profile");
    const rows = [...document.querySelectorAll("#stats .stats.shots .stat")];
    assert(rows.length === 12 && rows.filter(r => !r.classList.contains("unseen")).length === 2 && /2\/12/.test(document.querySelector("#stats").textContent), `${rows.length} rows`);
    assert(rows.every(r => r.querySelector("small").textContent.length > 10), "each says what it takes");
    T.closeSheet(); T.setStats(ZERO); T.toTitle();
  });
  step(() => T.shots(false));

  // ── v26: more ways to play ──
  const OPENED = { ...ZERO, bossKills: 1, bestStage: 3, bossLog: { crow: 1, undertaker: 1 } };
  test("Practice: any map you've reached, misses are free, and nothing counts", () => {
    T.setStats({ ...ZERO, makes: 5, bones: 100, bestStage: 2 }); T.setPractice({ ring: "full", half: "A", hazards: true }); T.startMode("practice", 1);
    assert(T.inPractice() && T.state().stage === 2 && T.modeState().mode === "practice", JSON.stringify(T.modeState()));
    T.calm(); T.freezeRing(0, C.RING_Y); throwAndSettle(0, C.RING_Y); T.freezeRing(0, C.RING_Y); throwAndSettle(2.5, C.RING_Y);
    assert(T.state().lives === 3 && T.state().hits === 1, `a miss costs nothing (${T.state().lives} skulls)`);
    T.endRun(); T.step(1);
    const P = T.realProfile(); assert(!T.inPractice() && P.makes === 5 && P.bones === 100 && P.throws === 0 && P.modes.practice.runs === 1, `nothing counted but the practice run itself (${JSON.stringify({ m: P.makes, b: P.bones, t: P.throws, p: P.modes.practice })})`);
    assert(/Practice/.test($("resTitle").textContent) && $("resBones").textContent === "0", "the stone says Practice and pays nothing");
    T.setPractice({ ring: "still" }); T.startMode("practice", 0); T.step(3); const r = T.state().ring;
    assert(Math.abs(r.x) < 1e-6 && T.modeState().frozen, `a still ring stands still (${r.x})`);
    T.setPractice({ ring: "slow" }); T.startMode("practice", 0); T.unfreezeRing(); T.step(0.1); const slow = T.state().ring.omega;
    T.setPractice({ ring: "full" }); T.startMode("practice", 0); T.unfreezeRing(); T.step(0.1);
    assert(slow < T.state().ring.omega * 0.6, `a slow ring runs at half speed (${slow} vs ${T.state().ring.omega})`);
    T.setPractice({ half: "B" }); T.startMode("practice", 0); assert(T.state().phase === "B", "and the 3D path can be practised");
    T.setPractice({ ring: "full", half: "A", hazards: true }); T.toTitle(); T.setStats(ZERO);
  });
  test("Boss Rush: every boss you've beaten, back to back, a skull back after each end boss", () => {
    T.setStats(ZERO); T.startMode("rush"); assert(T.modeState().mode === "story", "locked until an end boss is down");
    T.setStats(OPENED); T.startMode("rush"); T.step(2.5);
    assert(T.modeState().rush.join() === "crow,undertaker" && T.boss() && T.boss().kind === "crow", JSON.stringify(T.modeState()));
    T.hurtBoss(99); T.endThrow(); T.step(3.4); assert(T.boss() && T.boss().kind === "undertaker", `then the Undertaker (${T.boss() && T.boss().kind})`);
    T.step(2.6); const l = T.state().lives; T.hurtBoss(99); T.endThrow(); assert(T.state().lives === Math.min(5, l + 1), `a skull back after an end boss (${l} → ${T.state().lives})`);
    T.step(3); assert(T.state().state === "over" && T.profile().modes.rush.best === 2, `the list done, the run is won (${T.state().state}, ${JSON.stringify(T.profile().modes.rush)})`);
    T.setStats(ZERO); T.toTitle();
  });
  test("v56 Curtain Call: a little stage; DING, the curtains part on the round's act, one throw while they're open; no ring anywhere", () => {
    T.setStats(OPENED); T.startMode("curtain"); let A = T.attr();
    assert(A.on && A.kind === "curtain" && A.ringHidden && A.cur && A.cur.phase === "shut", `an attraction, not a ring (${JSON.stringify({ on: A.on, hidden: A.ringHidden, cur: A.cur })})`);
    T.step(1.4); A = T.attr(); assert(A.cur.phase === "open" && A.props.length === 1 && A.props[0].live, `the curtains part on one target (${JSON.stringify(A.cur)})`);
    let p = A.props[0]; T.attrThrow(p.x, p.y); T.step(2.5);
    assert(T.state().lastResult.make && T.state().hits === 1 && T.state().lives === 3, `a hit while they're open (${T.state().lastResult.kind})`);
    A = T.attr(); assert(A.round === 2 && A.cur.act === 1, `the next act (${A.round}, ${A.cur.act})`);
    T.attrCurtain("closed"); T.attrThrow(0, 2.3); T.step(2.5); assert(T.state().lastResult.kind === "curtain" && T.state().lives === 2, `into the closed curtain: a skull (${T.state().lastResult.kind}, ${T.state().lives})`);
    T.step(1.2); A = T.attr(); const l = T.state().lives; T.step(A.cur.win + 0.6); assert(T.state().lives === l - 1, `a round that comes and goes with no throw costs one too (${l} → ${T.state().lives})`);
    T.step(1.5); A = T.attr(); if (A.cur.phase === "open") { p = A.props.find(q => q.live) || A.props[0]; T.attrThrow(2.2, 3.5); T.step(2.5); }
    T.step(4); assert(T.state().state === "over" && T.profile().modes.curtain.best === 1, `out of skulls, and the record is the rounds hit (${T.state().state}, ${JSON.stringify(T.profile().modes.curtain)})`);
    T.setStats(ZERO); T.toTitle();
  });
  test("v56 Longshot: a board on the range at 10 m, then 15, 20…; the throw carries to it; a miss costs a skull; the record is the farthest hit", () => {
    T.setStats(OPENED); T.startMode("longshot"); let A = T.attr();
    assert(A.kind === "longshot" && A.zp === 10 && A.ringHidden, `the first board at 10 m (${A.zp})`);
    T.attrWindSet(0); T.attrThrow(0, 1.35); T.step(3);
    A = T.attr(); assert(T.state().lastResult.make && A.zp === 15 && A.far === 10, `a hit, and the board goes back to 15 m (${T.state().lastResult.kind}, ${A.zp})`);
    T.attrWindSet(0); T.attrThrow(0, 1.35); T.step(3.5); A = T.attr(); assert(A.zp === 20 && A.far === 15, `then 20 m (${A.zp})`);
    T.attrWindSet(0); T.attrThrow(2.6, 1.35); T.step(3.5); assert(T.state().lives === 2 && T.attr().zp === 20, `a miss costs a skull and the board stays (${T.state().lives})`);
    T.endRun(); T.step(1); assert(T.profile().modes.longshot.best === 150, `the farthest hit, in tenths of a metre (${JSON.stringify(T.profile().modes.longshot)})`);
    T.setStats(ZERO); T.toTitle();
  });
  test("v56 Target Gallery: a shooting gallery of ducks, plates, stars and pop-ups; each pays its own; ten skulls, misses free", () => {
    T.setStats(OPENED); T.startMode("gallery"); let A = T.attr();
    const types = new Set(A.props.map(p => p.type));
    assert(A.ringHidden && types.has("duck") && types.has("plate") && types.has("star"), `ducks, plates and a star (${[...types]})`);
    const st = A.props.find(p => p.type === "star"); T.attrThrow(st.x, st.y); T.step(2.5);
    assert(T.state().lastResult.make && T.attr().value === 1, `the star pays 1 (${T.attr().value})`);
    const d = T.attr().props.find(p => p.type === "duck" && p.row === 0); T.attrProps(T.attr().props.map(p => p.type === "duck" ? { ...p, v: 0 } : p));
    T.attrThrow(d.x, d.y); T.step(2.5); assert(T.attr().value === 3, `a duck pays 2 (${T.attr().value})`);
    T.attrThrow(-2.3, 3.6); T.step(2.5); assert(T.state().lastResult.kind === "board" && T.state().lives === 3, "into the backboard: a miss, but free");
    for (let i = 3; i < 10 && T.state().state === "ready"; i++) { T.attrThrow(2.3, 0.9); T.step(2.5); }
    assert(T.state().state === "over" && T.profile().modes.gallery.best === 3, `ten skulls and it's over; the record is the points (${T.state().state}, ${JSON.stringify(T.profile().modes.gallery)})`);
    T.setStats(ZERO); T.toTitle();
  });
  // ── v45: Can Alley, the optional bonus round after an end boss ──
  const toCanAlley = () => { T.encore(true); T.setStats(ZERO); fresh(); toHit(C.STAGE_MINI); T.step(2.6); T.hurtBoss(99); T.endThrow(); T.step(3.2); toHit(C.STAGE_BOSS); T.step(2.9); T.hurtBoss(99); T.endThrow(); T.step(6); };
  test("v45: after an end boss, Can Alley is offered (Play or Skip, fifteen seconds); skipping goes straight on to the next map", () => {
    toCanAlley();
    assert(T.bonusOffered() && T.state().state === "cine", `the offer after Reel One's end boss (${T.state().state})`);
    assert(/Prize Tickets/.test($("bonusPrize").textContent) && /bones a can/.test($("bonusPay").textContent), `it says what it pays (${$("bonusPay").textContent} / ${$("bonusPrize").textContent})`);
    T.bonus(false); assert(!T.bonusOffered(), "skipped");
    T.step(4); assert(T.state().stage === 2 && T.state().phase === "A", `then Reel Two (${T.state().stage}, ${T.state().phase})`);
    toCanAlley(); T.step(16); assert(!T.bonusOffered(), "left alone, the offer lapses");
    T.step(4); assert(T.state().stage === 2, "and the run goes on");
    T.encore(false); T.setStats(ZERO); T.toTitle();
  });
  test("v45: Can Alley: ten numbered cans in a booth, no ring; the stack falls together; misses are free; the lot pays and wins the map's prize", () => {
    toCanAlley(); T.bonus(true); T.step(1.9);
    const m = T.modeState(), cs = T.cans(), A = T.attr();
    assert(m.phase === "encore" && A.on && A.kind === "cans" && A.ringHidden && cs.length === 10 && cs.every(c => c.num >= 1), `the booth and ten numbered cans (${m.phase}, ${cs.length}, ${A.kind})`);
    assert([4, 3, 2, 1].every((n, row) => cs.filter(c => c.row === row).length === n), "stacked four, three, two, one");
    const lives = T.state().lives, b0 = T.bones();
    T.attrThrow(2.2, 3.4); T.step(2.5); assert(T.state().lives === lives, "a miss is free");
    const b1 = cs.find(c => c.row === 0 && c.i === 1); T.attrThrow(b1.x, b1.y); T.step(3);
    const down = T.cans().filter(c => c.down).length;
    assert(down >= 5, `the second can of the bottom row brings down what rests on it (${down} down)`);
    T.cans().forEach((c, i) => { if (!c.down) T.knockCan(i); }); T.endThrow(); T.step(2.6);
    const P = T.profile();
    assert(T.bones() === b0 + 10 * 5 + 125 && P.canAlley[1] === 1 && P.canClears === 1, `ten cans and the clear pay (${T.bones() - b0} bones)`);
    assert(P.unlocked.includes("aim:tickets"), "and the first clear after map 1 wins its prize");
    T.step(3); assert(T.state().stage === 2 && T.state().phase === "A" && !T.cans().length && !T.attr().on, `then Reel Two, the booth gone (${T.state().stage}, ${T.state().phase})`);
    assert(T.canPrizes().length === 7 && T.canPrizes().every(k => { const [kind, id] = k.split(":"); return T.findItem(kind, id); }), "seven prizes, one a map before the last, all in the Vault");
    T.encore(false); T.setStats(ZERO); T.toTitle();
  });
  test("The Play sheet: Practice and Boss Rush under More ways to play (Boss Rush opens with an end boss); Mini Games has its own card, open from the start (v46)", () => {
    T.setStats(ZERO); T.toTitle(); $("play").click();
    let tiles = [...document.querySelectorAll("#moreModes [data-mode]")];
    assert(tiles.map(b => b.dataset.mode).join() === "practice,rush" && tiles.filter(b => b.classList.contains("locked")).map(b => b.dataset.mode).join() === "rush", `Practice open, Boss Rush locked (${tiles.map(b => b.dataset.mode + (b.classList.contains("locked") ? "*" : "")).join()})`);
    document.querySelector('#modePick [data-open="minis"]').click();
    const minis = [...document.querySelectorAll("#miniModes [data-mode]")];
    assert(!$("miniPick").hidden && $("modePick").hidden && minis.map(b => b.dataset.mode).join() === "curtain,longshot,gallery,cans,pitch,sudden,gale,swing" && !minis.some(b => b.classList.contains("locked")), `the Mini Games card: eight (v50), all open (${minis.map(b => b.dataset.mode).join()})`);
    document.querySelector("#sheet-play [data-back]").click(); assert(!$("modePick").hidden && $("miniPick").hidden, "Back steps back to the modes");
    T.closeSheet(); T.setStats(OPENED); T.toTitle(); $("play").click();
    tiles = [...document.querySelectorAll("#moreModes [data-mode]")]; assert(!tiles.some(b => b.classList.contains("locked")), "Boss Rush open after an end boss");
    document.querySelector('#moreModes [data-mode="practice"]').click();
    assert(!$("mapPick").hidden && !$("practiceOpts").hidden && /Practice/.test($("mapPickK").textContent), "Practice goes to the map list, with its options");
    document.querySelector('#mapList [data-map="1"]').click(); assert(T.inPractice() && T.state().stage === 2, "and starts there");
    T.toTitle(); T.setStats(ZERO);
  });
  test("v56: Can Alley as a mini-game: ten skulls at the pyramid, a can a point; cleared, it's restacked; no Adventure prize", () => {
    T.setStats(ZERO); T.toTitle(); T.startMode("cans"); T.step(0.2);
    let A = T.attr(); assert(A.kind === "cans" && T.cans().length === 10 && T.modeState().phase !== "encore", `the pyramid is up (${A.kind}, ${T.cans().length})`);
    const b1 = T.cans().find(c => c.row === 0 && c.i === 1); T.attrThrow(b1.x, b1.y); T.step(3);
    const n = T.cans().filter(c => c.down).length; assert(n >= 5 && T.attr().value === n, `a can a point (${n}, ${T.attr().value})`);
    T.cans().forEach((c, i) => { if (!c.down) T.knockCan(i); }); T.attrThrow(2.2, 3.4); T.step(3);
    assert(T.cans().every(c => !c.down) && T.attr().value === 10, `the lot down: a fresh pyramid (${T.attr().value})`);
    for (let i = 2; i < 10 && T.state().state === "ready"; i++) { T.attrThrow(2.2, 3.4); T.step(3); }
    const P = T.profile(); assert(T.state().state === "over" && P.modes.cans && P.modes.cans.best === 10, `ten skulls, over, and a best of ten (${T.state().state}, ${JSON.stringify(P.modes.cans)})`);
    assert(!P.unlocked.includes("aim:tickets") && !(P.canAlley || {})[1], "the carnival prizes stay the Adventure's");
    T.setStats(ZERO); T.toTitle();
  });
  test("v56 Can Alley: a glancing hit can start a chain, and the whole pyramid in one throw is a Clean Sweep (+5)", () => {
    let swept = false;
    for (let x = -0.45; x <= 0.46 && !swept; x += 0.075) { T.setStats(ZERO); T.toTitle(); T.startMode("cans"); T.step(0.3); const y0 = T.cans()[0].y; T.attrThrow(x, y0); T.step(3.5); swept = T.attr().sweeps === 1; if (swept) assert(T.attr().value === 15 && T.cans().every(c => !c.down), `ten and five for the sweep, and restacked (${T.attr().value})`); }
    assert(swept, "somewhere along the bottom row, a Clean Sweep");
    T.setStats(ZERO); T.toTitle();
  });
  test("The Codex notes things as they turn up: a boss when you meet it, a power-up when you grab it, each map's hazard and target", () => {
    T.setStats(ZERO); let K = T.codex(); assert(K.total === 119 && K.count === 2, `119 entries (v50: 32 areas; v54 and v57: six more power-ups each), only Crow Hollow and its first act known at first (${K.count}/${K.total})`);
    fresh(); toHit(C.STAGE_MINI); assert(T.codex().seen.includes("boss:crow"), "meeting the Crow King notes him");
    T.givePower("rush"); assert(T.codex().seen.includes("power:rush"), "grabbing a power-up notes it");
    fresh(); T.setStage(2); T.setHits(10); T.freezeRing(0, C.RING_Y); throwAndSettle(0, C.RING_Y);
    K = T.codex(); assert(K.seen.includes("hazard:bats") && K.seen.some(k => /^target:(standard|swinging|golden|secret)$/.test(k)) && K.seen.includes("obstacle:bumper"), `the Gilded Graveyard's bats, its targets and its urns (${K.seen.join(", ")})`);
    T.setPractice({ ring: "full", half: "A", hazards: true }); T.startMode("practice", 0); T.givePower("ghost"); T.endRun(); T.step(1);
    assert(T.codex().seen.includes("power:ghost"), "what you see in Practice still goes in the Codex");
    T.setStats(ZERO); T.toTitle();
  });
  test("The Codex sheet: a tab for each part and the Archive, ??? until found, and the count", () => {
    T.setStats({ ...ZERO, bossLog: { crow: 2 }, fragments: ["hollow"], shots: { longbomb: 1 }, bestStage: 2 }); T.toTitle(); T.openSheet("codex");
    const tabs = [...document.querySelectorAll("#codexTabs [data-cat]")]; assert(tabs.length === 12 && tabs[0].dataset.cat === "area" && tabs[1].dataset.cat === "map", `twelve tabs, Areas first (v50) (${tabs.length})`);
    assert($("codexTabs").hidden && $("codexCatBtn"), "in a menu, shut until it's opened (v53)");
    tabs.find(b => b.dataset.cat === "miniboss").click();
    const rows = [...document.querySelectorAll("#codexList .entry")], crow = rows.find(r => r.dataset.entry === "miniboss:crow");
    assert(rows.length === 8 && crow && /Crow King/.test(crow.textContent) && /Beaten 2/.test(crow.textContent), `8 mini-bosses, the Crow King written up (${rows.length})`);
    assert(rows.filter(r => r.classList.contains("unseen")).length === 7, "the rest stay ???");
    tabs.find(b => b.dataset.cat === "boss").click(); const ends = [...document.querySelectorAll("#codexList .entry")];
    assert(ends.length === 8 && ends.every(r => r.classList.contains("unseen")) && ends.find(r => r.dataset.entry === "boss:reaper").textContent.startsWith("???"), "8 end bosses, none met");
    tabs.find(b => b.dataset.cat === "area").click(); const areas = [...document.querySelectorAll("#codexList .entry")];
    assert(areas.length === 32 && areas.filter(r => !r.classList.contains("unseen")).length === 5, `32 areas, map 1's four and map 2's first seen (${areas.filter(r => !r.classList.contains("unseen")).length})`);
    assert(/of 119 found/.test($("codexCount").textContent), $("codexCount").textContent);
    T.closeSheet(); T.setStats(ZERO); T.toTitle();
  });
  test("The Production Archive unseals the studio's paperwork as the story goes on", () => {
    T.setStats(ZERO); assert(T.codex().archive.join() === "memo", `only the first memo at the start (${T.codex().archive})`);
    T.setStats({ ...ZERO, makes: 1, bestStage: 5, bossLog: { crow: 1 }, bonesTotal: 1000, perfects: 25 });
    assert(T.codex().archive.length === 8 && !T.codex().archive.includes("restoration"), `eight documents by Reel Five (${T.codex().archive})`);
    T.toTitle(); T.openSheet("codex"); document.querySelector('#codexTabs [data-cat="archive"]').click();
    const docs = [...document.querySelectorAll("#codexList .doc")];
    assert(docs.length === 12 && docs.filter(d => !d.classList.contains("sealed")).length === 8 && /1933/.test(docs[0].textContent), `12 documents, 8 unsealed (${docs.length})`);
    T.setStats({ storyClears: 1 }); document.querySelector('#codexTabs [data-cat="archive"]').click();
    assert(!document.querySelector('#codexList [data-doc="restoration"]').classList.contains("sealed"), "finishing the story unseals the restoration report");
    T.closeSheet(); T.setStats(ZERO); T.toTitle();
  });

  // ── v28: the cartoon misbehaves, and nine secrets ──
  test("The cartoon misbehaves between throws: at most once a map, never early, never mid-flight, and it can be switched off", () => {
    T.mischiefOn(true); T.clearMisc(); T.setStats(ZERO); fresh(); T.seedRun(7);
    for (let i = 0; i < 4; i++) { T.freezeRing(0, C.RING_Y); throwAndSettle(0, C.RING_Y); }
    assert(!T.misc().log.length, "nothing in the first five throws");
    for (let i = 0; i < 60 && !T.misc().log.length; i++) { T.freezeRing(0, C.RING_Y); throwAndSettle(0, C.RING_Y); if (T.state().hits >= 24) T.setHits(10); }
    assert(T.misc().log.length === 1, `one misbehaviour on the map (${T.misc().log})`);
    for (let i = 0; i < 30; i++) { T.freezeRing(0, C.RING_Y); throwAndSettle(0, C.RING_Y); if (T.state().hits >= 24) T.setHits(10); }
    assert(T.misc().log.length === 1, `and only one a map (${T.misc().log})`);
    fresh(); T.clearMisc(); T.throwAt(0, C.RING_Y); T.step(0.2); assert(T.misbehave("jam") === null, "never while the skull's in the air");
    T.step(2.5); T.setSetting("mischief", false); T.clearMisc(); for (let i = 0; i < 60; i++) { T.freezeRing(0, C.RING_Y); throwAndSettle(0, C.RING_Y); if (T.state().hits >= 24) T.setHits(10); }
    assert(!T.misc().log.length, "Mischief off: never"); T.setSetting("mischief", true);
    T.toTitle();
  });
  test("The six misbehaviours: a jam shudders and holds, a slip rolls back into the gate, the hand, the wrong reel, the fourth wall, the blot", () => {
    T.mischiefOn(true); T.setStats(ZERO); fresh(); T.clearMisc();
    T.misbehave("jam"); T.step(0.05); let m = T.misc(); assert(m.kind === "jam" && /translateY/.test(m.css), `the picture shudders (${m.css})`); T.step(1.8); assert(!T.misc().kind, "and runs on");
    T.misbehave("slip"); T.step(0.1); m = T.misc(); assert(/translateY\(-\d/.test(m.css), `the frame rolls down into the gate (${m.css})`); T.step(0.7);
    T.misbehave("wrong"); m = T.misc(); assert(m.wrong && /WRONG REEL/.test($("rcSub").textContent) && T.state().state === "ready", "a spliced-in card that holds nothing up"); T.step(0.6); assert(!T.misc().wrong, "gone in half a second");
    T.voiceTest(true); T.misbehave("wall"); assert(T.voice().pool === "meta", `Morty talks to the camera (${T.voice().pool})`); T.voiceTest(false); T.step(0.2);
    T.misbehave("blot"); assert(T.misc().kind === "blot", "an ink blot on the lens"); T.step(2.5);
    T.misbehave("hand"); T.step(0.8); const p = T.misc().hand; assert(p, "the animator's hand reaches in");
    T.canvas().dispatchEvent(new PointerEvent("pointerdown", { clientX: p.x, clientY: p.y, bubbles: true, pointerId: 9 }));
    assert(T.secrets().includes("caught") && !T.misc().kind, `tap it: Caught in the Act (${T.secrets()})`);
    T.setStats(ZERO); T.toTitle();
  });
  test("Nine secrets: each found its own way, each pays 150 bones once, and the Codex keeps them", () => {
    T.setStats({ ...ZERO, bones: 0 }); T.toTitle();
    for (let i = 0; i < 13; i++) $("mascot").dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    assert(T.secrets().includes("knock") && T.bones() === 150, `thirteen pokes: Knock Knock (${T.secrets()}, ${T.bones()})`);
    for (const k of ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"]) window.dispatchEvent(new KeyboardEvent("keydown", { key: k }));
    assert(T.secrets().includes("projector") && T.profile().unlocked.includes("reel:twostrip"), "the old projector's code unlocks the Two-Strip Color reel");
    T.secretName("Morty"); assert(T.secrets().includes("name"), "Morty's own name on the stone");
    fresh(); for (let i = 0; i < 5; i++) T.upwardPull(); assert(T.secrets().includes("upside"), "five upward pulls: Wrong Way Round");
    fresh(); T.setLives(5); for (let i = 0; i < 3; i++) { T.freezeRing(0, C.RING_Y); throwAndSettle(0, C.RING_Y + 2.2); }
    assert(T.state().lastResult.kind === "over" && T.secrets().includes("moon"), `three overs in a row: Moonshot (${T.state().lastResult.kind})`);
    fresh(); T.setStage(7); T.setStreak(12); T.freezeRing(0, C.RING_Y); throwAndSettle(0, C.RING_Y); assert(T.secrets().includes("thirteen"), "thirteen in a row in the Belfry");
    const b = T.bones(); T.secretName("Morty"); assert(T.bones() === b, "a secret pays once");
    T.toTitle(); T.openSheet("codex"); document.querySelector('#codexTabs [data-cat="secret"]').click();
    const rows = [...document.querySelectorAll("#codexList .entry")];
    assert(rows.length === 9 && rows.filter(r => !r.classList.contains("unseen")).length === T.secrets().length && /secrets found/.test($("codexCount").textContent), `the Secrets tab (${rows.length}, ${T.secrets().length})`);
    T.closeSheet(); T.setStats(ZERO); T.toTitle();
  });
  step(() => T.mischiefOn(false));

  // ── v29: cosmetics and customization ──
  test("Bands: eight slingshot bands in the Vault, the rubber one yours from the start, each strung on the launcher its own way", () => {
    T.setStats(ZERO); T.toTitle(); const B = T.catalog().band.filter(i => !i.souls && !i.season);   // (and two Soul bands, v30, and a season's, v42)
    assert(B.length === 8 && T.cosmetics().band === "classic" && T.bandStyle().id === "classic", `${B.length} bands, the rubber one on`);
    T.openSheet("customize"); document.querySelector('#catTabs [data-cat="band"]').click();
    assert(document.querySelectorAll('#shopGrid .item').length === 10 && document.querySelectorAll('#shopGrid .item.locked').length === 9, "the Bands shelf (with the Soul Shop's two), all but one locked");
    T.closeSheet(); T.setStats({ ...ZERO, unlocked: ["band:candy"] }); assert(T.equip("band", "candy") && T.bandStyle().stripe, "Candy Cane: a striped band");
    T.setStats({ ...ZERO, misses: 300 }); assert(T.equip("band", "barbed") && T.bandStyle().barbs, "Barbed Wire comes free after 300 misses (Hall of Shame)");
    T.setStats({ ...ZERO, storyClears: 1 }); assert(T.equip("band", "ghostly") && T.bandStyle().glow, "Ectoplasm is the story's prize");
    fresh(); T.step(0.5); T.toTitle(); T.setStats(ZERO); T.equip("band", "classic");
  });
  test("Outfits: save a look, change it, wear it back; Surprise me dresses Morty only in what's yours", () => {
    const C0 = T.catalog(), skin = C0.skull.find(i => i.price).id, hat = C0.hat.find(i => i.price).id;
    T.setStats({ ...ZERO, unlocked: [`skull:${skin}`, `hat:${hat}`, "band:licorice"] }); T.toTitle();
    T.equip("skull", skin); T.equip("hat", hat); T.saveOutfit(0);
    T.equip("skull", "bone"); T.equip("hat", "none"); assert(T.cosmetics().skull === "bone", "changed");
    T.wearOutfit(0); let c = T.cosmetics(); assert(c.skull === skin && c.hat === hat, `outfit 1 back on (${c.skull}, ${c.hat})`);
    T.setStats({ ...ZERO, unlocked: [] }); T.wearOutfit(0); c = T.cosmetics(); assert(c.skull === skin, "an outfit never puts on what you no longer own (wearing leaves it as it was)");
    T.equip("skull", "bone"); T.equip("hat", "none");
    T.setStats({ ...ZERO, unlocked: [`skull:${skin}`, `hat:${hat}`, "band:licorice"] });
    for (let i = 0; i < 12; i++) { T.surprise(); c = T.cosmetics(); for (const [k, id] of Object.entries(c)) if (C0[k]) { const it = C0[k].find(x => x.id === id); assert(it && (!it.price && !it.req || T.profile().unlocked.includes(`${k}:${id}`) || it.req), `${k}:${id} isn't yours`); } }
    T.equip("skull", "bone"); T.equip("hat", "none"); T.equip("band", "classic"); T.setStats(ZERO); T.toTitle();
  });
  test("A renamed Vault item still belongs to you, and item goals name the right bosses", () => {
    const P = T.cleanProfile({ unlocked: ["skull:gilded", "trail:embers"] });
    assert(P.unlocked.includes("skull:gold") && P.unlocked.includes("trail:fire") && !P.unlocked.includes("skull:gilded"), JSON.stringify(P.unlocked));
    assert(T.reqText("miniKills", 3) === "Beat 3 mini-bosses" && T.reqText("bossKills", 1) === "Beat an end boss" && T.reqText("bestStage", 5) === "Reach map 5", `${T.reqText("miniKills", 3)} / ${T.reqText("bossKills", 1)}`);
  });

  // ── v30: Souls, and the Soul Shop (the server's own handlers, stood up in the page) ──
  test("No server, no Souls: the Soul Shop says so, Soul looks stay locked, and nothing else minds", () => {
    T.noServer(); T.setStats(ZERO); T.toTitle();
    const soulItems = Object.values(T.catalog()).flat().filter(i => i.souls && !i.shop);
    assert(soulItems.length === 8 && !T.equip("skull", "soul"), `8 Soul Shop items, none wearable without a wallet (${soulItems.length})`);
    T.openSheet("souls"); assert(!$("soulsStatus").hidden && /server/.test($("soulsStatus").textContent) && $("soulsDaily").disabled, "the shop explains, and its buttons wait");
    T.closeSheet(); T.toTitle();
  });
  test("Souls: a daily handful once a day, a pack credited once per receipt, a look bought at the server's price", async () => {
    assert(await T.fakeServer() === "fake" && T.wallet().souls === 0, "a new wallet is empty");
    const S = T.soulsApi();
    await S.claimDaily(); assert(T.wallet().souls === 10, `the daily ten (${T.wallet().souls})`);
    await S.claimDaily(); assert(T.wallet().souls === 10, "and only once a day");
    await S.redeem({ platform: "test", receipt: "OK:r1", product: "souls.550" }); assert(T.wallet().souls === 560, `a pack of 550 (${T.wallet().souls})`);
    await S.redeem({ platform: "test", receipt: "OK:r1", product: "souls.550" }); assert(T.wallet().souls === 560, "the same receipt never pays twice");
    await S.redeem({ platform: "test", receipt: "forged", product: "souls.1200" }); assert(T.wallet().souls === 560, "a receipt the store won't confirm pays nothing");
    const w = await T.callServer("buyWithSouls", { item: "skull:soul", souls: 1 });
    assert(w.souls === 160 && T.wallet() !== null, `the server charges its own price, whatever the caller says (${w.souls})`);
    await T.fakeServer(); await S.redeem({ platform: "test", receipt: "OK:r2", product: "souls.550" }); await S.buy("skull:soul");
    assert(T.wallet().souls === 150 && T.wallet().owned.includes("skull:soul") && T.cosmetics().skull === "soul", `bought and worn (${JSON.stringify(T.wallet())}, ${T.cosmetics().skull})`);
    await S.buy("skull:aurora"); assert(T.wallet().souls === 150 && !T.wallet().owned.includes("skull:aurora"), "not enough Souls: nothing changes");
    T.toTitle(); T.openSheet("souls");
    assert($("soulsStatus").hidden && document.querySelectorAll("#soulsGrid .item").length === 8 && document.querySelector('#soulsGrid [data-key="skull:soul"]').classList.contains("equipped"), "the shop shows the wallet");
    T.closeSheet();
  });
  test("Souls never travel in a save code or the save, and a Soul look waits for the wallet before it's judged", async () => {
    await T.fakeServer(); const S = T.soulsApi(); await S.redeem({ platform: "test", receipt: "OK:r3", product: "souls.550" }); await S.buy("band:soul");
    assert(!/"souls"\s*:/.test(JSON.stringify(T.profile())) && T.wallet().souls > 0, "the wallet has Souls; the profile (and so a save code) has none");
    assert(!("souls" in T.profile()) && !("wallet" in T.profile()), "the profile carries no balance");
    await T.fakeServer("someone-else"); assert(T.cosmetics().band === "classic", `a wallet that doesn't own it takes the look off (${T.cosmetics().band})`);
    T.noServer(); T.toTitle();
  });

  // ── v31: career levels, the profile card and the runs log ──
  test("Every real run earns experience; fifty levels on a rising curve; Practice earns none", () => {
    assert(T.levelFor(0) === 1 && T.levelFor(T.xpForLevel(2)) === 2 && T.levelFor(T.xpForLevel(2) - 1) === 1 && T.levelFor(1e9) === 50, "the curve");
    for (let L = 2; L < 50; L++) assert(T.xpForLevel(L + 1) - T.xpForLevel(L) >= T.xpForLevel(L) - T.xpForLevel(L - 1), `each level asks at least as much as the last (${L})`);
    T.setStats(ZERO); fresh(); T.setLives(1); T.calm(); for (let i = 0; i < 4; i++) { T.freezeRing(0, C.RING_Y); throwAndSettle(0, C.RING_Y); }
    T.endRun(); T.step(1); const P = T.profile(), r = T.runStats();
    assert(r.xp === 4 + 4 * 2 && P.xp === r.xp, `4 hits + 4 perfects × 2 = 12 XP (${r.xp}, ${P.xp})`);
    T.setPractice({ ring: "full", half: "A", hazards: true }); T.startMode("practice", 0); T.freezeRing(0, C.RING_Y); throwAndSettle(0, C.RING_Y); T.endRun(); T.step(1);
    assert(T.profile().xp === 12, `Practice earns none (${T.profile().xp})`);
    T.setStats(ZERO); T.toTitle();
  });
  test("A level up pays 25 bones × the level, once, and levels 5, 10, 20, 30, 40 and 50 bring a title", () => {
    const x5 = T.xpForLevel(5); T.setStats({ ...ZERO, xp: x5 - 3, bones: 0 }); fresh(); T.calm(); T.freezeRing(0, C.RING_Y); throwAndSettle(0, C.RING_Y); T.endRun(); T.step(1);
    const r = T.runStats(), P = T.profile();
    assert(r.levelUp && r.levelUp.from === 4 && r.levelUp.to === 5 && r.levelUp.bones === 125, JSON.stringify(r.levelUp));
    assert(P.bones >= 125 && /Level up/.test($("resStats").textContent), "paid, and on the headstone");
    assert(T.equip("title", "understudy"), "level 5: the Understudy title");
    fresh(); T.freezeRing(0, C.RING_Y); throwAndSettle(0, C.RING_Y); T.endRun(); T.step(1); assert(!T.runStats().levelUp, "and not again next run");
    T.equip("title", "rookie"); T.setStats(ZERO); T.toTitle();
  });
  test("The profile's career card and the last ten runs", () => {
    T.setStats({ ...ZERO, xp: 2500, fragments: ["tophat", "bowtie"], bestScore: 12345 }); T.toTitle();
    for (let i = 0; i < 12; i++) { fresh(); T.freezeRing(0, C.RING_Y); throwAndSettle(0, C.RING_Y); T.endRun(); T.step(0.8); }
    assert(T.profile().history.length === 10, `ten kept (${T.profile().history.length})`);
    T.toTitle(); T.openSheet("profile");
    const card = $("careerCard").textContent;
    assert(new RegExp(`^${T.levelFor(T.profile().xp)}`).test(card) && /XP to level/.test(card) && /2\/8/.test(card) && /12,345/.test(card), card);
    assert(document.querySelectorAll("#history .runs li").length === 5, "the runs log (v50: the last five)");
    T.closeSheet(); T.setStats(ZERO); T.toTitle();
  });

  // ── v32: the Shot Book and mastery ──
  test("Shot mastery: Bronze, Silver and Gold at 1, 10 and 25; each tier pays once; gold on all twelve is the Shot Doctor", () => {
    T.setStats({ ...ZERO, bones: 0, shots: { longbomb: 10 } });
    assert(T.tierReached("shot", "longbomb", 1) && !T.tierReached("shot", "longbomb", 2) && T.masteryClaimable(), "Silver at 10, not Gold");
    assert(T.claimMastery("shot", "longbomb", 0) === 60 && T.claimMastery("shot", "longbomb", 1) === 150 && T.bones() === 210, `Bronze 60 and Silver 150 (v55's pay) (${T.bones()})`);
    assert(T.claimMastery("shot", "longbomb", 1) === 0 && T.claimMastery("shot", "longbomb", 2) === 0 && T.bones() === 210, "once each; Gold not yet");
    const all = {}; for (const s of T.shotList()) all[s.id] = 25; T.setStats({ ...ZERO, shots: all });
    assert(T.equip("title", "shotdoctor"), "gold on all twelve: the Shot Doctor"); T.equip("title", "rookie"); T.setStats(ZERO);
  });
  test("Map mastery: a star for its end boss, one for beating it without a miss, one for 100 makes there", () => {
    T.setStats({ ...ZERO, bones: 0 }); fresh(); toHit(C.STAGE_MINI); T.step(2.6); T.hurtBoss(99); T.endThrow(); T.step(3.2); toHit(C.STAGE_BOSS); T.step(2.9); T.hurtBoss(99); T.endThrow(); T.step(6.5);
    const P = T.profile(); assert(P.bossLog.pumpkin === 1 && P.flawless.pumpkin === 1, `the Pumpkin King down, without a miss (${JSON.stringify(P.flawless)})`);
    assert(T.tierReached("map", "1", 0) && T.tierReached("map", "1", 1) && !T.tierReached("map", "1", 2), "two stars");
    T.setStats({ mapMakes: { 1: 100 } }); assert(T.tierReached("map", "1", 2), "the third at 100 makes");
    T.setStats(ZERO); T.toTitle();
  });
  test("Boss mastery, and the Mastery sheet: tiers light up when reached, and the title chip says when there's something to claim", () => {
    T.setStats({ ...ZERO, bossLog: { crow: 5 } }); T.toTitle();
    assert(T.tierReached("boss", "crow", 1) && !T.tierReached("boss", "crow", 2) && !$("masteryPip").hidden, "the Crow King ×5: two tiers, and the pip shows");
    T.openSheet("mastery"); document.querySelector('#masteryTabs [data-cat="boss"]').click();
    const row = document.querySelector('#masteryList [data-m="boss:crow"]'), live = row.querySelectorAll(".m-tier.got:not(.claimed)");
    assert(document.querySelectorAll("#masteryList .m-row").length === 16 && live.length === 2, `16 bosses, two tiers to claim (${live.length})`);
    live[0].click();
    assert(T.profile().mastery.includes("boss:crow:0"), "claimed from the sheet");
    T.closeSheet(); T.setStats(ZERO); T.toTitle();
  });

  // ── v33: motifs and stings (v49: the sound sets are gone) ──
  test("v49: no sound sets and no synthesised music: effects play as they always did, and the Settings row is gone", () => {
    const S = T.shape(440, "sine", 0.2, 0.1, 880, { lp: 4000 }); assert(S.f === 440 && S.type === "sine" && S.dur === 0.2 && S.o.lp === 4000 && T.soundRoom() === 1, JSON.stringify(S));
    T.toTitle(); T.openSheet("settings"); assert(!$("set-soundset") && !("soundSet" in T.settings()), "the Settings row"); T.closeSheet();
    assert(!T.music().synth, "no synth music");
  });
  test("Every boss walks on to its own motif, every reel's card has one, and a signature shot's sting rises with its rarity", () => {
    const ids = Object.keys(T.bossInfo()).concat([1, 2, 3, 4, 5, 6, 7, 8].map(n => "map" + n));
    for (const id of ids) {
      const P = T.motifPlan(id), end = P.length ? P[P.length - 1].at + P[P.length - 1].dur : 0;
      assert(P.length >= 3 && end < 3 && P.every(N => N.f > 60 && N.f < 1400), `${id}: ${P.length} notes, ${end.toFixed(2)} s`);
    }
    const plans = new Set(ids.map(id => JSON.stringify(T.motifPlan(id).map(N => Math.round(N.f)))));
    assert(plans.size === ids.length, `no two alike (${plans.size}/${ids.length})`);
    assert(T.sting(2) === 3 && T.sting(5) === 6, "a rarity-2 shot's sting has three notes, a rarity-5 shot's six");
  });

  // ── v34: the leaderboard, checked by the server ──
  test("With a server, a finished Story run is checked and goes on the board (all time and this week); a forged one doesn't", async () => {
    await T.fakeServer(); T.setStats({ ...ZERO, board: true }); T.setName("Ada");
    fresh(); T.calm(); for (let i = 0; i < 6; i++) { T.freezeRing(0, C.RING_Y); throwAndSettle(0, C.RING_Y); } T.endRun(); T.step(1);
    const R = T.profile().boardBest;
    assert(R && R.throws === 6 && R.hits === 6 && R.perfects === 6 && R.secs >= 1, `the best run keeps what the server checks (${JSON.stringify(R)})`);
    assert(await T.submitBoard() && T.lastSubmit().accepted, `accepted (${JSON.stringify(T.lastSubmit())})`);
    const e = T.serverDoc("leaderboard/tester"); assert(e && e.score === R.score && e.name === "Ada", JSON.stringify(e));
    assert(T.serverDoc(`weekly/${T.weekOf(Date.now())}_tester`), "and this week's board");
    T.advanceServerClock(20000); T.setStats({ boardBest: { ...R, score: 900000000 } });
    assert(!(await T.submitBoard()) && T.lastSubmit().why === "score-ceiling" && T.serverDoc("leaderboard/tester").score === R.score, `a forged score is refused (${JSON.stringify(T.lastSubmit())})`);
    T.setStats({ boardBest: R }); assert(await T.submitBoard(), "a fair run, twenty seconds on, is fine");
    assert(!(await T.submitBoard()) && T.lastSubmit().code === "resource-exhausted", "but another straight after is slowed down");
    T.noServer(); T.setName(""); T.setStats(ZERO); T.toTitle();
  });
  test("The run checks: a fair run passes, and each kind of forgery is named", () => {
    const fair = { mode: "story", score: 48250, hits: 61, stage: 3, throws: 80, secs: 190, perfects: 20, bosses: 4, targets: 3, shots: 5, continues: 0, fragments: 2 };
    assert(T.checkRun(fair).ok, JSON.stringify(T.checkRun(fair)));
    for (const [r, why] of [[{ score: 5e9 }, "score-ceiling"], [{ hits: 500 }, "more-hits-than-throws"], [{ secs: 10 }, "clock"], [{ continues: 1 }, "continued"], [{ mode: "director" }, "no-such-board"], [{ mode: "arcade" }, "fragments"]])
      assert(T.checkRun({ ...fair, ...r }).why === why, `${JSON.stringify(r)} → ${T.checkRun({ ...fair, ...r }).why}`);
  });
  test("The board has a This week tab beside all time and this device", () => {
    T.toTitle(); T.openSheet("board");
    assert([...document.querySelectorAll("#boardTabs [data-tab]")].map(b => b.dataset.tab).join() === "live,week,local", "three tabs");
    document.querySelector('#boardTabs [data-tab="week"]').click(); document.querySelector('#boardPerMenu [data-per="week"]').click(); assert($("boardRival").hidden, "no rival line off the shared board");
    T.closeSheet();
  });

  // ── v35: replays and sharing ──
  const playRun = (aims, cards = true) => {   // a run played only through what a player can do: throws, card skips, the end
    T.cards(cards); T.setStats({ ...ZERO, bones: 500 }); T.start(); T.step(0.4); T.skipReel(); T.step(0.02);
    for (const [AX, AY] of aims) { for (let i = 0; i < 400 && T.state().state !== "ready"; i++) T.step(0.05); if (T.state().state !== "ready") break; T.step(0.13); T.throwAt(AX, AY); T.step(0.4); }
    for (let i = 0; i < 100 && T.state().state === "flying"; i++) T.step(0.05);
    if (T.state().state !== "over") T.endRun(); T.step(1);
    return { score: T.state().score, hits: T.state().hits, throws: T.state().throws };
  };
  test("A replay plays the same run back, throw for throw, and changes nothing of yours", () => {
    const aims = [[0.1, C.RING_Y], [-0.4, C.RING_Y + 0.1], [0.6, C.RING_Y - 0.1], [0, C.RING_Y], [0.9, C.RING_Y + 0.2], [-0.8, C.RING_Y], [0.3, C.RING_Y + 0.3], [0, C.RING_Y - 0.2], [-0.2, C.RING_Y], [0.5, C.RING_Y]];
    const orig = playRun(aims), R = T.lastReplay();
    assert(R && R.ev.filter(e => e[1] === "t").length === orig.throws && R.ev.some(e => e[1] === "s") && R.score === orig.score, `the run is recorded (${JSON.stringify({ orig, ev: R && R.ev.length })})`);
    assert(orig.throws >= 3 && orig.hits >= 1, `a run worth replaying (${JSON.stringify(orig)})`);
    const before = T.profile(), snap = T.snapshot();
    assert(T.watchReplay() && T.replaying(), "watching");
    for (let i = 0; i < 2400 && T.state().state !== "over"; i++) T.step(0.05);
    const s = T.state(); assert(s.state === "over" && s.score === orig.score && s.hits === orig.hits && s.throws === orig.throws, `the same run (${JSON.stringify({ got: [s.score, s.hits, s.throws], orig })})`);
    T.stopReplay(); const after = T.profile();
    assert(after.makes === before.makes && after.bones === before.bones && after.games === before.games && JSON.stringify(T.snapshot()) === JSON.stringify(snap), "and nothing of yours changed");
    T.cards(false); T.setStats(ZERO); T.toTitle();
  });
  test("A replay survives the trip through a link: encoded, decoded, the same run", () => {
    const orig = playRun([[0, C.RING_Y], [0.4, C.RING_Y], [-0.3, C.RING_Y]], false), R = T.lastReplay(), link = T.replayLink(R);
    assert(/#replay=[\w-]+$/.test(link) && JSON.stringify(T.decodeReplay(link.split("#replay=")[1])) === JSON.stringify(R), "round trip");
    assert(T.decodeReplay("not a replay") === null && T.decodeReplay(T.encodeReplay({ v: 9 })) === null, "junk is refused");
    T.toTitle(); T.offerShared(R); assert(!$("sharedReplayBtn").hidden, "the title offers a shared replay");
    $("sharedReplayBtn").click(); assert(T.replaying(), "and plays it");
    for (let i = 0; i < 1200 && T.state().state !== "over"; i++) T.step(0.05);
    assert(T.state().score === orig.score && T.state().throws === orig.throws, `the same run from the link (${T.state().score} vs ${orig.score})`);
    T.stopReplay(); T.offerShared(null); T.setStats(ZERO); T.toTitle();
  });
  test("The headstone offers Watch replay and Share; a replay's own stone says Replay", () => {
    playRun([[0, C.RING_Y], [0.2, C.RING_Y]], false); T.step(2);
    assert(!$("watchBtn").hidden && !$("shareBtn").hidden, "both on a real run's stone");
    T.watchReplay(); for (let i = 0; i < 1200 && T.state().state !== "over"; i++) T.step(0.05); T.step(2);
    assert($("resTitle").textContent === "Replay" && $("shareBtn").hidden, `a replay's stone (${$("resTitle").textContent})`);
    T.stopReplay(); T.setStats(ZERO); T.toTitle();
  });

  // ── v36: the Diegetic Arcade ──
  const arcadeRun = (map, makes) => { T.startArcade(map); for (let i = 0; i < makes; i++) { T.calm(); T.freezeRing(0, C.RING_Y); throwAndSettle(0, C.RING_Y); } T.endRun(); T.step(1); return T.state().score; };
  test("The Arcade is a haunted penny arcade: a cabinet a map, its name in lights, its top scores on the screen, Out of Order until reached", () => {
    T.setStats({ ...ZERO, bestStage: 3, arcadeTables: { 0: [{ ini: "MRT", score: 9000, secs: 60, at: 1 }] } }); T.toTitle(); $("play").click();
    document.querySelector('#modePick [data-mode="arcade"]').click();
    const cabs = [...document.querySelectorAll("#mapList .cabinet")];
    assert(cabs.length === 8 && cabs.filter(c => c.classList.contains("locked")).length === 5 && /OUT OF ORDER/.test(cabs[7].textContent), `8 cabinets, 5 out of order (${cabs.length})`);
    assert(/Crow Hollow/i.test(cabs[0].querySelector(".marq").textContent) && /MRT/.test(cabs[0].textContent) && /9,000/.test(cabs[0].textContent) && /INSERT BONE/.test(cabs[0].textContent), cabs[0].textContent);
    cabs[1].click(); assert(T.arcade().map === 1 && T.state().state !== "title", "a coin in the slot starts that cabinet");
    T.setStats(ZERO); T.toTitle();
  });
  test("A score good enough for a cabinet's top five asks for three initials, the old way", () => {
    T.setStats({ ...ZERO, bestStage: 2 }); T.setName("Ada Lovelace"); const score = arcadeRun(0, 4); T.step(2);
    const tab = T.profile().arcadeTables["0"]; assert(tab && tab[0].score === score && tab[0].ini === "ALO", `on the table as ALO (${JSON.stringify(tab)})`);
    assert(!$("iniBox").hidden && /#1 on the Crow Hollow cabinet/.test($("iniRank").textContent), "the headstone asks");
    document.querySelector('#iniLetters [data-i="0"].up').click();
    assert(T.profile().arcadeTables["0"][0].ini === "BLO" && T.profile().lastIni === "BLO", `▲ on the first letter (${T.profile().arcadeTables["0"][0].ini})`);
    T.setName(""); T.setStats(ZERO); T.toTitle();
  });
  test("Only the top five: a score below them asks for nothing and leaves the table as it was", () => {
    const full = [50000, 40000, 30000, 20000, 10000].map((sc, i) => ({ ini: "AAA", score: sc, secs: 30, at: i + 1 }));
    T.setStats({ ...ZERO, bestStage: 2, arcadeTables: { 0: full } }); arcadeRun(0, 1); T.step(2);
    assert($("iniBox").hidden && JSON.stringify(T.profile().arcadeTables["0"].map(e => e.score)) === JSON.stringify([50000, 40000, 30000, 20000, 10000]), "unchanged");
    T.setStats(ZERO); T.toTitle();
  });

  // ── v37: challenges on a rotation the live config can steer, and a daily streak ──
  const ALL_KINDS = ["perfects", "makes", "throws", "best", "score", "bosses", "powerups", "combo", "rims", "runs", "lives", "arcadeSecs", "shots", "targets", "modeRuns"];
  test("New kinds of challenge (signature shots, bonus targets, other modes), and the live config can take kinds out of the rotation", () => {
    T.setFlags({ "challenges.off": ALL_KINDS.filter(k => !["shots", "targets", "modeRuns"].includes(k)) }); T.setStats({ ...ZERO, daily: null, weekly: null, monthly: null });
    const D = T.ensurePeriod("daily"); assert(D.items.map(i => i.id).sort().join() === "modeRuns,shots,targets", `only the kinds left in (${D.items.map(i => i.id)})`);
    assert(T.ensurePeriod("weekly").items.length === 3 && T.ensurePeriod("monthly").items.every(i => ["shots", "targets", "modeRuns"].includes(i.id)), "weekly and monthly too");
    T.shots(true); fresh(); T.calm(); T.freezeRing(0, C.RING_Y); throwAndSettle(0, C.RING_Y); T.shots(false);
    assert(T.ensurePeriod("daily").items.find(i => i.id === "shots").have >= 1, "a signature shot counts toward it");
    T.setFlags({}); T.setStats({ ...ZERO, daily: null, weekly: null, monthly: null }); T.toTitle();
  });
  test("An event can raise every challenge's pay, and the same day picks the same goals for everyone", () => {
    T.setFlags({}); T.setStats({ ...ZERO, weekly: null }); const a = T.ensurePeriod("weekly");
    T.setFlags({ "challenges.bonus": 2 }); T.setStats({ ...ZERO, weekly: null }); const b = T.ensurePeriod("weekly");
    assert(a.items.map(i => i.id + i.n).join() === b.items.map(i => i.id + i.n).join(), "the same goals");
    assert(b.items.every((it, i) => Math.abs(it.reward - 2 * a.items[i].reward) <= 5), `double the pay (${a.items.map(i => i.reward)} → ${b.items.map(i => i.reward)})`);
    T.setFlags({}); T.setStats({ ...ZERO, weekly: null });
  });
  test("The daily streak: a day in a row pays 20 bones a day of it, up to a week; a missed day starts it again", () => {
    T.setStats({ ...ZERO, bones: 0, streakDays: 0, streakLast: "" });
    const day = n => new Date(2026, 8, 20 + n, 12);
    assert(T.streakAfterRun(day(0)) === 20 && T.streakAfterRun(day(0)) === 0, "day one pays 20, and only once a day");
    assert(T.streakAfterRun(day(1)) === 40 && T.streakAfterRun(day(2)) === 60 && T.profile().streakDays === 3, "day three pays 60");
    for (let i = 3; i < 12; i++) T.streakAfterRun(day(i)); assert(T.profile().streakDays === 12 && T.streakAfterRun(day(12)) === 140, "the pay stops rising at a week");
    assert(T.streakAfterRun(day(14)) === 20 && T.profile().streakDays === 1, "a missed day starts it again");
    T.setStats(ZERO);
  });
  test("Kill switches and the event banner: the live config can close the Soul Shop, the board and sharing, and hang out a banner", async () => {
    await T.fakeServer(); assert(T.soulsApi().available(), "the shop's open");
    T.setFlags({ "kill.souls": true, "event.banner": "Double bones weekend!" }); assert(!T.soulsApi().available(), "a kill switch closes it");
    T.toTitle(); assert(!$("eventBanner").hidden && /Double bones/.test($("eventBanner").textContent), "the banner on the title");
    T.setFlags({}); T.noServer(); T.toTitle(); assert($("eventBanner").hidden, "and gone when it's off");
  });

  // ── v38: the Director's Challenge ──
  test("The week's Director's Challenge is the same for everyone, changes each week, and anyone can play it", () => {
    const a = T.directorOf("2026-W39"), b = T.directorOf("2026-W39"), c = T.directorOf("2026-W40");
    assert(JSON.stringify(a) === JSON.stringify(b) && a.notes.length === 3 && a.map >= 0 && a.map < 8, JSON.stringify(a));
    assert(JSON.stringify(a) !== JSON.stringify(c), "a new week, a new note");
    T.setStats({ ...ZERO, bestStage: 1 }); T.startMode("director"); const D = T.director();
    assert(T.modeState().mode === "director" && T.state().stage === D.map + 1, `on the week's map, reached or not (${T.state().stage})`);
    T.toTitle(); $("play").click(); assert(/Director/.test($("directorCard").textContent) && $("directorCard").querySelectorAll(".notes li").length === 3, "the note on the Play sheet");
    T.closeSheet(); T.setStats(ZERO); T.toTitle();
  });
  test("The six twists: Double Wind, the Cursed Reel, the Shrinking Ring, Night Shoot, Rush Hour, Bonus Bonanza", () => {
    T.setStats(ZERO);
    T.directorWith({ twist: "wind", map: 0 }); assert(T.hz().kind === "wind", "wind on Moonshine Cemetery");
    T.directorWith({ twist: "fog", map: 0 }); assert(T.hz().kind === "fog", "fog on Moonshine Cemetery");
    assert(/Director/.test($("progLabel").textContent) && !/ to the /.test($("progLabel").textContent), `no boss to count down to (${$("progLabel").textContent})`);
    T.directorWith({ twist: "cursed", map: 0 }); assert(T.powers().cursed, "the Cursed Skull all run");
    T.directorWith({ twist: "rush", map: 0 }); T.step(0.2); const fast = T.state().ring.omega;
    T.directorWith({ twist: "fog", map: 0 }); T.step(0.2); assert(fast > T.state().ring.omega * 1.2, `a quicker ring (${fast} vs ${T.state().ring.omega})`);
    T.directorWith({ twist: "shrink", map: 0 }); T.step(0.5); const rc0 = T.state().ring.rc; for (let i = 0; i < 6; i++) { T.calm(); T.freezeRing(0, C.RING_Y); throwAndSettle(0, C.RING_Y); }
    T.step(3); assert(T.state().ring.rc < rc0 - 0.015, `a smaller ring after six makes (${rc0} → ${T.state().ring.rc})`);
    T.toTitle();
  });
  test("A note met is a star for the week, paying its bones the first time; the week's best is kept", () => {
    const notes = [{ id: "hits", n: 1 }, { id: "perfects", n: 1 }, { id: "score", n: 999999 }];
    T.setStats({ ...ZERO, bones: 0, streakLast: "x" }); T.directorWith({ twist: "fog", map: 0, notes });
    T.calm(); T.freezeRing(0, C.RING_Y); throwAndSettle(0, C.RING_Y); T.endRun(); T.step(1);
    const P = T.profile(); assert(P.director && P.director.stars.join() === "true,true,false" && P.director.best === T.state().score, JSON.stringify(P.director));
    assert(T.runStats().director.pay === 300, `100 + 200 for the first two (${T.runStats().director.pay})`);
    T.directorWith({ twist: "fog", map: 0, notes }); T.calm(); T.freezeRing(0, C.RING_Y); throwAndSettle(0, C.RING_Y); T.endRun(); T.step(1);
    assert(T.runStats().director.pay === 0 && T.profile().director.runs === 2, "and not again this week");
    const R = T.lastReplay(); assert(R && R.dir && R.dir.twist === "fog" && R.dir.notes[2].n === 999999, "the replay carries its note");
    T.directorWith(null); assert(T.watchReplay() && T.director().twist === "fog" && T.director().notes[0].id === "hits", "and watching it plays that note, whatever this week's is");
    for (let i = 0; i < 600 && T.state().state !== "over"; i++) T.step(0.05); T.stopReplay && T.stopReplay();
    T.setStats({ director: { week: "1999-W01", best: 5, stars: [true, true, true], runs: 9 } }); T.toTitle(); $("play").click();
    assert(!/★/.test($("directorCard").querySelector(".notes").textContent), "last week's stars don't count this week");
    T.closeSheet(); T.setStats(ZERO); T.toTitle();
  });

  // ── v39: play analytics with consent, and the live-ops safety net ──
  test("Play data waits for a yes: nothing is queued before, the question comes after the first run, and a privacy signal is a no", async () => {
    await T.fakeServer(); T.analyticsOn(); T.resetConsent(); T.setStats({ ...ZERO, games: 0 });
    assert(!T.renderConsent(), "not before the first run");
    T.setStats({ ...ZERO, games: 1 }); assert(T.renderConsent(), "asked on the title after it");
    T.start(); T.calm(); T.freezeRing(0.1, C.RING_Y); throwAndSettle(0.1, C.RING_Y); T.toTitle();
    assert(T.playData().q.length === 0 && T.playData().consent === "ask", "nothing queued while unasked");
    T.openSheet("settings"); assert($("set-analytics").getAttribute("aria-checked") === "false" && !$("set-analytics").disabled, "the switch starts off"); T.closeSheet();
    T.setConsent("yes"); assert(!T.renderConsent(), "and not asked again");
    for (let i = 0; i < 6 && T.playData().q.length; i++) await T.flushPlayData();   // (a batch at a time, fifty at most)
    const docs = T.serverKeys("events/").sort().map(T.serverDoc), q = docs.flatMap(d => d.events).map(e => e.name);
    assert(T.playData().q.length === 0 && docs.length && docs.every(d => d.build === T.gameBuild), "sent, and filed on the server");
    assert(q[0] === "session_start" && q.includes("run_start") && q.includes("first") && q.includes("consent") && !q.includes("throw"), `the session so far, cut down (${q.join()})`);
    const m = T.serverDoc(T.serverKeys("metrics/")[0]); assert(m && m.first_throw >= 1 && m.consent === 1 && !JSON.stringify(m).includes("tester"), `and counted, naming no one (${JSON.stringify(m)})`);
    T.setConsent("no"); T.start(); T.calm(); T.freezeRing(0.1, C.RING_Y); throwAndSettle(0.1, C.RING_Y); T.endRun(); T.step(1);
    assert(T.playData().q.length === 0, "a no stops everything at once");
    T.resetConsent(); Object.defineProperty(navigator, "globalPrivacyControl", { value: true, configurable: true });
    assert(T.playData().consent === "no" && !T.renderConsent(), "Global Privacy Control: no, without asking");
    delete navigator.globalPrivacyControl; T.resetConsent(); T.analyticsOn(false); T.noServer(); T.toTitle();
  });
  test("The funnel: each first is noted once a player, in order, and a save merge keeps them all", () => {
    T.setStats({ ...ZERO, games: 2 }); T.start(); T.calm(); T.freezeRing(0, C.RING_Y); throwAndSettle(0, C.RING_Y);
    T.calm(); T.freezeRing(0, C.RING_Y); throwAndSettle(2.5, 4.8);
    const f = T.firsts(); assert(["retry", "throw", "hit", "miss"].every(k => f.includes(k)) && f.indexOf("throw") < f.indexOf("hit"), `first throw, hit, miss and retry (${f.join()})`);
    T.calm(); T.freezeRing(0, C.RING_Y); throwAndSettle(0, C.RING_Y); assert(T.firsts().filter(k => k === "hit").length === 1, "once each");
    const merged = T.merge({ ...T.profile(), firsts: ["throw", "boss"] }, { ...T.profile(), firsts: ["story", "hit"] });
    assert(["throw", "story", "hit"].every(k => merged.firsts.includes(k)) && !merged.firsts.includes("boss") === false, `merged (${merged.firsts.join()})`);
    T.setStats(ZERO); T.toTitle();
  });
  test("Only the listed events and fields leave the device; errors are kept, and five a session are sent", async () => {
    await T.fakeServer(); T.analyticsOn(); T.resetConsent(); T.setStats({ ...ZERO, games: 1 }); T.setConsent("yes");
    T.start(); T.calm(); T.freezeRing(0, C.RING_Y); throwAndSettle(0, C.RING_Y); T.endRun(); T.step(1);
    const end = [...T.serverKeys("events/").map(T.serverDoc).flatMap(d => d.events), ...T.playData().q].filter(e => e.name === "run_end").pop();
    assert(end && end.mode === "story" && end.tier && "misses" in end && !("name2" in end) && Object.keys(end).every(k => ["name", "t", "mode", "map", "score", "hits", "stage", "phase", "tier", "secs", "throws", "misses", "perfects", "continues", "powerups", "bosses", "quit"].includes(k)), JSON.stringify(end));
    for (let i = 0; i < 7; i++) T.reportError("boom " + i, "https://example.com/path/index.html:12");
    const errs = T.playData().q.filter(e => e.name === "error");
    assert(T.errors().length === 7 && errs.length === 5 && errs[0].src === "index.html:12", `seven kept, five queued (${errs.length})`);
    T.setFlags({ "kill.analytics": true }); T.reportError("after", "x"); assert(!T.playData().allowed, "a kill switch stops it");
    T.setFlags({ "analytics.sample": 0 }); assert(!T.playData().allowed, "and a sample of 0 leaves everyone out");
    T.setFlags({}); T.setConsent("no"); T.resetConsent(); T.analyticsOn(false); T.noServer(); T.setStats(ZERO); T.toTitle();
  });
  test("Live ops: a scheduled event runs only in its window, a mode can be taken off, an old build is asked to reload", () => {
    const now = Date.now(), iso = ms => new Date(ms).toISOString();
    T.setFlags({ "event.banner": "Double bones", "event.bones": 2, "event.from": iso(now + 3600e3) }); T.toTitle();
    assert($("eventBanner").hidden && T.flag("event.bones") === 1, "not yet");
    assert(T.flag("event.bones", now + 7200e3) === 2, "on once it starts");
    T.setFlags({ "event.banner": "Double bones", "event.from": iso(now - 60e3), "event.until": iso(now + 60e3) }); assert(!$("eventBanner").hidden && /Double/.test($("eventBanner").textContent), "on in its window");
    assert(!T.eventLive(now + 120e3), "and off when it ends");
    T.setFlags({ maintenance: "The projector's being serviced" }); assert(/serviced/.test($("eventBanner").textContent) && $("eventBanner").classList.contains("warn"), "a maintenance line");
    T.setFlags({ "build.min": T.gameBuild + 1, "event.banner": "x" }); assert(/newer print/.test($("eventBanner").textContent), "an old build is asked to reload");
    T.setFlags({ "modes.off": ["director", "rush", "story"] }); T.setStats({ ...ZERO, bossKills: 1 });
    T.startMode("director"); assert(T.modeState().mode === "story", "a mode taken off can't be started");
    T.toTitle(); $("play").click(); assert($("directorCard").hidden && !document.querySelector("#moreModes .m-rush") && !document.querySelector('.mode-card[data-mode="story"]').hidden, "and leaves the Play sheet (Story can't be taken off)");
    T.closeSheet(); T.setFlags({}); T.setStats(ZERO); T.toTitle();
  });
  test("A refunded pack's Souls owed show in the Soul Shop, and the shop waits until they're paid off", async () => {
    await T.fakeServer(); const S = T.soulsApi();
    await S.redeem({ platform: "test", receipt: "OK:rf1", product: "souls.550" }); await S.buy("skull:soul");
    const r = await T.serverAdmin("revokeReceipt", { receipt: "rf1" }); assert(r.wallet.owed === 400 && r.wallet.souls === 0, JSON.stringify(r.wallet));
    await S.connect(); T.toTitle(); T.openSheet("souls");
    assert(!$("soulsStatus").hidden && /400 Souls owed/.test($("soulsStatus").textContent), $("soulsStatus").textContent);
    await S.buy("band:soul"); assert(!T.wallet().owned.includes("band:soul"), "nothing more can be bought");
    T.closeSheet(); T.noServer(); T.toTitle();
  });
  test("The economy audit: no duplicate ids, prices that climb with rarity, the Soul catalog the server's, and sane pacing", () => {
    T.setStats(ZERO); const A = T.economyAudit();
    assert(A.problems.length === 0, A.problems.join("; "));
    assert(A.items > 50 && A.tiers.length === 4 && A.runsForAll > 0 && A.soulDays === 13, JSON.stringify({ ...A, problems: undefined }));
  });
  test("Restore points: one a day, the last three kept, and recovering one only adds", () => {
    T.setStats({ ...ZERO, games: 3, bestStage: 4, bones: 50 });
    for (const d of ["2026-09-20", "2026-09-20", "2026-09-21", "2026-09-22", "2026-09-23"]) T.makeRestorePoint(d);
    assert(T.restorePoints().map(r => r.day).join() === "2026-09-21,2026-09-22,2026-09-23", JSON.stringify(T.restorePoints()));
    T.setStats({ ...ZERO, games: 1, bestStage: 1, bones: 999 }); assert(T.restoreFrom("2026-09-22"), "recovered");
    const P = T.profile(); assert(P.bestStage === 4 && P.games === 3 && P.bones === 999, `the best of both, today's balance kept (${P.bestStage}, ${P.games}, ${P.bones})`);
    T.openSheet("settings"); assert(document.querySelectorAll("#restoreList [data-day]").length === 3, "listed in Settings"); T.closeSheet();
    T.setStats(ZERO); T.toTitle();
  });

  // ── v40: the platforms ──
  const tick = () => new Promise(r => setTimeout(r, 0));
  test("The web build is the web: no store, no reels, no Quit, and no service worker under test", () => {
    T.platformReset(); const P = T.platform();
    assert(P.id === "web" && P.shell === null && !P.caps.quit, JSON.stringify(P));
    assert(!T.payments().available() && !T.ads().available() && $("quitBtnTitle").hidden, "nothing native");
    assert(!T.swRegistered(), "no service worker from a file, a frame or a test browser");
  });
  test("The phone shells: native haptics, Android's back button, and the app going to the background", () => {
    const hits = [], on = {};
    const P = T.platformWith({ capacitor: "android", plugins: { Haptics: { impact: o => { hits.push(o.style); return Promise.resolve(); } }, App: { addListener: (ev, fn) => { on[ev] = fn; }, exitApp: () => { on.exited = true; } } } });
    assert(P.id === "android" && P.shell === "capacitor" && P.caps.haptics && !P.caps.fullscreen, JSON.stringify(P));
    T.haptic(10); T.haptic([10, 30, 16]); T.haptic(30); assert(hits.join() === "LIGHT,LIGHT,HEAVY", `the shell's haptic engine (${hits.join()})`);
    T.openSheet("settings"); assert($("row-fullscreen").hidden, "no full-screen switch in an app"); on.backButton(); assert(!T.state().sheet, "back closes a sheet");
    T.backgroundOn(); T.snapOn(); T.start(); T.calm(); on.backButton(); assert(T.state().paused, "back pauses a run"); on.backButton(); assert(!T.state().paused, "and back again resumes it");
    on.appStateChange({ isActive: false }); assert(T.state().paused && T.snapshot(), "going to the background pauses the run and keeps it");
    on.appStateChange({ isActive: true }); T.backgroundOn(false); T.snapOn(false); T.toTitle(); on.backButton(); assert(on.exited, "back on the title leaves the app");
    T.platformReset();
  });
  test("Soul packs through the app store: the server credits them, then they're finished; one left over is credited at the next launch, never twice", async () => {
    const S = { n: 0, finished: [], products: [], approved: null,
      register(list) { S.products = list.map(p => ({ id: p.id, canPurchase: true, pricing: { price: "$4.99" }, getOffer: () => ({ order: () => { setTimeout(() => S.approved(S.tx(p.id)), 0); return Promise.resolve(); } }) })); },
      when: () => ({ approved(fn) { S.approved = fn; return this; } }), initialize: () => Promise.resolve(), get: id => S.products.find(p => p.id === id),
      tx: id => { const n = ++S.n; return { products: [{ id }], transactionId: "OK:t" + n, nativePurchase: { purchaseToken: "OK:t" + n }, finish() { S.finished.push(this.transactionId); } }; } };
    await T.fakeServer(); T.platformWith({ capacitor: "android", cdv: { store: S, ProductType: { CONSUMABLE: "consumable" }, Platform: { APPLE_APPSTORE: "ios", GOOGLE_PLAY: "android" } } });
    const Souls = T.soulsApi(); assert(T.payments().available(), "the store is open");
    assert(await Souls.buyPack("souls.550") && T.wallet().souls === 550 && S.finished.join() === "OK:t1", `credited, then finished (${T.wallet().souls}, ${S.finished})`);
    const left = S.tx("souls.100"); S.approved(left); for (let i = 0; i < 5; i++) await tick();
    assert(T.wallet().souls === 650 && S.finished.includes(left.transactionId), `one the app never finished is credited when it turns up (${T.wallet().souls})`);
    S.approved(left); for (let i = 0; i < 5; i++) await tick();
    assert(T.wallet().souls === 650 && S.finished.filter(x => x === left.transactionId).length === 2, "delivered again, it's finished but never credited twice");
    T.openSheet("souls"); assert(/\$4\.99/.test($("soulsPacks").textContent), "the store's own price on the pack"); T.closeSheet();
    T.platformReset(); T.noServer(); T.toTitle();
  });
  test("Rewarded reels: offered once one has loaded, watched for a continue, and switched off by the live config", async () => {
    let shown = 0; const AdMob = { initialize: () => Promise.resolve(), requestConsentInfo: () => Promise.resolve({ status: "NOT_REQUIRED" }),
      prepareRewardVideoAd: () => Promise.resolve(), showRewardVideoAd: () => { shown++; return Promise.resolve({ type: "reel", amount: 1 }); } };
    T.platformWith({ capacitor: "ios", plugins: { AdMob } }); const Ads = T.ads();
    assert(!Ads.available(), "nothing to offer until a reel has loaded"); Ads.start(); for (let i = 0; i < 6; i++) await tick();
    assert(Ads.available(), "loaded"); assert(await Ads.show() && shown === 1, "watched");
    for (let i = 0; i < 4; i++) await tick(); assert(Ads.available(), "and the next one loads");
    T.setFlags({ "kill.ads": true }); assert(!Ads.available(), "a kill switch takes them away"); T.setFlags({});
    T.platformReset();
  });
  test("The desktop shell: full screen, Quit on the title, and Steam achievements", () => {
    let fs = false, quit = 0; const got = [];
    const P = T.platformWith({ desktop: { steam: { ok: true, activate: id => got.push(id) }, setFullscreen: on => { fs = on; }, isFullscreen: () => fs, quit: () => { quit++; } } });
    assert(P.id === "steam" && P.caps.fullscreen && P.caps.quit && !$("quitBtnTitle").hidden, JSON.stringify(P));
    T.openSheet("settings"); assert(!$("row-fullscreen").hidden, "a full-screen switch"); $("set-fullscreen").click(); assert(fs, "full screen"); T.closeSheet();
    $("quitBtnTitle").click(); assert(quit === 1, "Quit");
    T.steamAchievement("first-toss"); assert(got.join() === "FIRST_TOSS", `Steam hears of an achievement, by its API name (${got})`);
    T.platformReset(); assert($("quitBtnTitle").hidden, "and back on the web, no Quit");
  });

  // ── v41: found by the soak test (tools/soak.mjs) ──
  test("The content audit: every map, boss, piece, power-up, shot, achievement, challenge, mode, secret and document is whole", () => {
    const P = T.contentAudit(); assert(P.length === 0, P.join("; "));
  });
  test("A replay on the balloon map sees the same balloons, whenever it's watched", () => {
    T.setStats({ ...ZERO, bestStage: 9 }); T.setPractice({ hazards: true }); T.startMode("practice", 3);
    const at = () => T.hz().list.filter(h => h.kind === "balloon").map(h => [h.x.toFixed(5), h.y.toFixed(5)]).join(" ");
    T.step(4); const was = at(); assert(T.hz().kind === "balloons" && was, "balloons up");
    T.endRun(); T.step(7.25);   // (the clock moves on before it's watched)
    T.watchReplay(); T.step(4); assert(at() === was, `the same balloons (${at()} vs ${was})`);
    T.stopReplay(); T.setPractice({ hazards: true }); T.setStats(ZERO); T.toTitle();
  });

  // ── v42: seasons ──
  const IN_SEASON = "2026-10-15T12:00:00Z", AFTER = ms => new Date(Date.parse("2026-12-01T00:00:00Z") + ms).toISOString();
  test("A season runs on its dates, or whenever the live config names it; 'off' means none", () => {
    T.setFlags({}); T.seasonAt("2026-09-20T12:00:00Z"); assert(T.season() === null, "not before its dates");
    T.seasonAt(IN_SEASON); assert(T.season() && T.season().id === "s1", "Season One in October");
    T.setFlags({ "season.id": "s1" }); T.seasonAt("2026-09-20T12:00:00Z"); assert(T.season() && T.season().id === "s1", "on early, when the live config says so");
    T.setFlags({ "season.id": "off" }); T.seasonAt(IN_SEASON); assert(T.season() === null && T.seasonClaimable() === null, "and off when it says off");
    T.setFlags({}); T.seasonAt(IN_SEASON); T.toTitle(); assert(!$("seasonChip").hidden, "the title shows the Season chip");
    T.seasonAt(null); T.toTitle();
  });
  test("Runs tear stubs off the Season Ticket; the Feature counts double; a note pays its experience once", () => {
    T.setFlags({}); T.seasonAt(IN_SEASON); T.setStats({ ...ZERO, bestStage: 3 }); T.setSeasonRec(null);
    T.start(); T.calm(); T.freezeRing(0, C.RING_Y); throwAndSettle(0, C.RING_Y); T.endRun(); T.step(1);
    const r1 = T.runStats(); assert(r1.season && r1.season.xp === r1.xp && T.seasonRec().xp === r1.xp && r1.xp > 0, `a run's experience (${JSON.stringify(r1.season)}, ${r1.xp})`);
    T.startMode("feature"); T.calm(); T.freezeRing(0, C.RING_Y); throwAndSettle(0, C.RING_Y); T.endRun(); T.step(1);
    const r2 = T.runStats(); assert(r2.season.xp === 2 * r2.xp, `double on the Feature (${r2.season.xp} vs ${r2.xp})`);
    const rec = T.seasonRec(); rec.notes.perfects = 39; T.setSeasonRec(rec);
    T.start(); T.calm(); T.freezeRing(0, C.RING_Y); throwAndSettle(0, C.RING_Y); T.endRun(); T.step(1);
    const r3 = T.runStats(); assert(T.seasonRec().done.includes("perfects") && r3.season.xp === r3.xp + 150, `forty perfects: +150 (${JSON.stringify(r3.season)})`);
    T.start(); T.calm(); T.freezeRing(0, C.RING_Y); throwAndSettle(0, C.RING_Y); T.endRun(); T.step(1);
    assert(T.runStats().season.xp === T.runStats().xp, "and only once");
    T.setPractice({ ring: "full" }); T.startMode("practice", 0); const before = T.seasonRec().xp; T.calm(); T.freezeRing(0, C.RING_Y); throwAndSettle(0, C.RING_Y); T.endRun(); T.step(1); T.toTitle();
    assert(T.seasonRec().xp === before, "Practice earns none");
    T.setSeasonRec(null); T.setStats(ZERO); T.seasonAt(null); T.toTitle();
  });
  test("Claiming stubs: once each, reached ones only; the premium reward needs the Premium Ticket; season looks are the Ticket's alone", async () => {
    T.setFlags({}); T.seasonAt(IN_SEASON); T.setStats({ ...ZERO, bones: 0 }); T.setSeasonRec({ id: "s1", xp: 600, free: [], prem: [], notes: {}, done: [] });
    assert(!T.canUse("aim", "lantern"), "a season look isn't anyone's to begin with");
    assert(T.seasonPips() === 2, `two stubs waiting (${T.seasonPips()})`);
    assert(T.claimSeason(0) && T.profile().bones === 100, "stub 1: 100 bones"); assert(!T.claimSeason(0), "once");
    assert(!T.claimSeason(2), "stub 3 isn't reached"); assert(T.claimSeason(1) && T.canUse("aim", "lantern"), "stub 2: the Lantern Glow aim line");
    assert(!T.claimSeason(0, true), "the premium reward needs the Premium Ticket");
    await T.fakeServer(); await T.serverAdmin("grant", { uid: "tester", souls: 1000, reason: "test" }); const S = T.soulsApi(); await S.connect();
    await S.ask("buyWithSouls", { item: "pass:s1" }); assert(T.wallet().owned.includes("pass:s1") && T.wallet().souls === 400, `the Premium Ticket, at the server's price (${JSON.stringify(T.wallet())})`);
    assert(T.claimSeason(0, true) && T.profile().bones === 250, "and now stub 1 pays twice");
    T.toTitle(); T.openSheet("season");
    assert(document.querySelectorAll("#seasonBody .season-track li").length === 20 && document.querySelectorAll("#seasonBody .reward.claimed").length === 3, "the Ticket on the Season sheet");
    assert(!document.querySelector("#soulsGrid [data-key='pass:s1']"), "the Premium Ticket isn't a look in the Soul Shop");
    T.closeSheet(); T.noServer(); T.setSeasonRec(null); T.setStats(ZERO); T.seasonAt(null); T.toTitle();
  });
  test("After the season: a week to claim what's earned, then it expires; season looks nobody earned leave the Vault", () => {
    T.setFlags({}); T.setStats({ ...ZERO, bones: 0 }); T.setSeasonRec({ id: "s1", xp: 1000, free: [], prem: [], notes: {}, done: [] });
    T.seasonAt(AFTER(3 * 864e5)); assert(T.season() === null && T.seasonClaimable() && T.seasonClaimable().over, "over, but claimable");
    assert(T.claimSeason(0) && T.profile().bones === 100, "claimed in the grace week");
    T.start(); T.calm(); T.freezeRing(0, C.RING_Y); throwAndSettle(0, C.RING_Y); T.endRun(); T.step(1); assert(T.seasonRec().xp === 1000 && !T.runStats().season, "no more experience once it's over");
    T.seasonAt(AFTER(8 * 864e5)); assert(!T.seasonClaimable() && !T.claimSeason(2), "a week later, the rest has expired");
    T.toTitle(); T.openSheet("customize"); T.shopCat("skull");
    assert(!document.querySelector('#shopGrid [data-id="harvestmoon"]'), "the Harvest Moon skull, never earned, is gone from the Vault");
    T.setStats({ ...ZERO, unlocked: ["skull:harvestmoon"] }); T.shopCat("skull"); assert(document.querySelector('#shopGrid [data-id="harvestmoon"]'), "but stays for whoever earned it");
    T.seasonAt(IN_SEASON); T.setStats(ZERO); T.shopCat("ring"); assert(document.querySelector('#shopGrid [data-id="candycorn"]'), "and while the season's on, it's there to earn");
    T.shopCat("skull"); T.closeSheet(); T.setSeasonRec(null); T.setStats(ZERO); T.seasonAt(null); T.toTitle();
  });
  test("The Feature: the season's map after dark with twice the targets, and its replay keeps the season's rules after it ends", () => {
    T.setFlags({}); T.seasonAt(IN_SEASON); T.setStats({ ...ZERO, bestStage: 1 });
    T.startMode("feature"); const F = T.feature();
    assert(T.modeState().mode === "feature" && T.state().stage === 3 && T.hz().kind === "fog" && T.twists().join() === "fog,bonanza", `the Whistling Woods after dark (${JSON.stringify(F)}, stage ${T.state().stage})`);
    assert(/The Whistling Woods · The Midnight Matinee/.test($("progLabel").textContent), `the bar names the Feature (${$("progLabel").textContent})`);
    T.calm(); T.freezeRing(0, C.RING_Y); throwAndSettle(0, C.RING_Y); T.endRun(); T.step(1);
    const R = T.lastReplay(); assert(R.feat && R.feat.twists.join() === "fog,bonanza", "the replay carries the Feature");
    T.seasonAt(AFTER(30 * 864e5)); assert(T.watchReplay() && T.state().stage === 3 && T.twists().join() === "fog,bonanza", "and plays it after the season's gone");
    T.stopReplay(); T.startMode("feature"); assert(T.modeState().mode === "story", "the Feature itself has gone with the season");
    T.setStats(ZERO); T.seasonAt(null); T.toTitle();
  });
  test("Two devices' Season Tickets merge: the best of each; a newer season's record wins", () => {
    const P = T.profile(), a = { id: "s1", xp: 900, free: [0, 1], prem: [], notes: { hits: 40 }, done: [] }, b = { id: "s1", xp: 700, free: [2], prem: [0], notes: { hits: 90, targets: 3 }, done: ["shots"] };
    const m = T.merge({ ...P, season: a }, { ...P, season: b }).season;
    assert(m.xp === 900 && m.free.sort().join() === "0,1,2" && m.prem.join() === "0" && m.notes.hits === 90 && m.notes.targets === 3 && m.done.join() === "shots", JSON.stringify(m));
  });

  // ── v43: Google Analytics, behind the same yes ──
  test("Google Analytics waits for the same yes, gets the same cut-down events with advertising off, and stops at a no", async () => {
    const calls = [], sdk = { on: null, logEvent: (n, p) => calls.push([n, p]), setAnalyticsCollectionEnabled(v) { this.on = v; } };
    T.noServer(); T.gaWith({ measurementId: "G-TEST", sdk }); T.analyticsOn(); T.resetConsent(); T.setStats({ ...ZERO, games: 1 });
    assert(T.renderConsent(), "with only Google Analytics set up, the question is still asked");
    T.start(); T.calm(); T.freezeRing(0, C.RING_Y); throwAndSettle(0, C.RING_Y); T.endRun(); T.step(1); T.toTitle();
    assert(calls.length === 0 && T.gaState() === "off" && sdk.on === null, "nothing, and no SDK, before a yes");
    T.setConsent("yes"); for (let i = 0; i < 3; i++) await tick();
    assert(T.gaState() === "on" && sdk.on === true, `on after the yes (${T.gaState()})`);
    const dl = (window.dataLayer || []).map(a => Array.from(a));
    assert(dl.some(a => a[0] === "consent" && a[2] && a[2].ad_storage === "denied" && a[2].ad_personalization === "denied") && dl.some(a => a[0] === "set" && a[1] && a[1].allow_google_signals === false), "advertising features off");
    T.start(); T.calm(); T.freezeRing(0, C.RING_Y); throwAndSettle(0, C.RING_Y); T.endRun(); T.step(1); T.reportError("boom", "x.js:1");
    const names = calls.map(c => c[0]), end = calls.filter(c => c[0] === "run_end").pop();
    assert(names.includes("run_start") && names.includes("consent") && end && end[1].mode === "story" && !("name" in end[1]) && !("t" in end[1]), `the events and their fields (${names.join()})`);
    assert(!names.includes("throw") && !names.includes("session_start") && !names.includes("error") && names.includes("game_error"), "never a throw, never Google's own names");
    const n = calls.length; T.setConsent("no"); T.start(); T.calm(); T.freezeRing(0, C.RING_Y); throwAndSettle(0, C.RING_Y); T.endRun(); T.step(1);
    assert(calls.length === n && sdk.on === false, "a no stops it at once");
    T.gaWith(null); T.resetConsent(); T.analyticsOn(false); T.setStats(ZERO); T.toTitle();
  });

  test("Firebase partly set up (no database or functions yet, or sign-in not switched on): the game plays on, and Google Analytics still works", async () => {
    const stub = signIn => { const app = { auth: () => ({ currentUser: null, signInAnonymously: () => (signIn ? Promise.resolve({ user: { uid: "u1", displayName: "" } }) : Promise.reject(new Error("auth/admin-restricted-operation"))) }),
      firestore: () => ({ doc: () => ({ onSnapshot: () => () => {}, get: () => Promise.resolve({ exists: false }) }) }), functions: () => ({ httpsCallable: () => () => Promise.resolve({ data: {} }) }) };
      return { apps: [], initializeApp: () => app, app: () => app, auth: {}, firestore: {}, functions: {} }; };
    const cfg = { apiKey: "k", projectId: "p", appId: "a", measurementId: "G-TEST" };
    let r = await T.useFirebaseWith({ ...cfg, services: { firestore: false, functions: false } }, stub(true));
    assert(r.kind === "firebase" && r.me === "u1" && !r.db && !r.call && r.ga && !r.souls, `signed in, no database or functions (${JSON.stringify(r)})`);
    T.toTitle(); T.openSheet("souls"); assert(!$("soulsStatus").hidden && /opens when the game's server does/.test($("soulsStatus").textContent) && !/README/.test($("soulsStatus").textContent), `the Soul Shop waits politely (${$("soulsStatus").textContent})`); T.closeSheet();
    r = await T.useFirebaseWith(cfg, stub(false));
    assert(r.kind === "firebase" && !r.me && !r.db && !r.call && r.ga && /sign-in/.test(r.error), `sign-in off: no server parts, but analytics can run (${JSON.stringify(r)})`);
    r = await T.useFirebaseWith({ ...cfg, services: { firestore: true, functions: false } }, stub(true));
    T.boardInit(); assert(r.db && !r.call && T.boardState() === "local", `a database but no functions: the board stays on the device (${T.boardState()})`);
    r = await T.useFirebaseWith(cfg, stub(true));
    assert(r.me === "u1" && r.db && r.call && r.souls, `everything up (${JSON.stringify(r)})`);
    delete window.firebase; T.noServer(); T.toTitle();
  });

  // ── v44: the corrected roadmap. The Spatial & Environmental Blueprint (V16), map progression (V17), the eight rebuilt maps
  // (V18), targets and obstacles (V19), the bosses on them (V20), power-ups (V21), the new slots (V29), the profile (V31) ──
  const pathAt = (z, x = 0, y = C.RING_Y) => { const a = T.aimFor(x, y, C.RING_Z); return { a, q: T.skullPathAt(a.AX, a.AY, z / (C.RING_Z / C.FLIGHT_T)) }; };
  test("The blueprint is the gate: every map carries a whole Map Production Sheet that fits it", () => {
    const B = T.blueprint(), M = T.maps(), R = T.implemented().registry;
    for (const k of ["gameplayPlanes", "camera", "anchors", "reactions", "ambientBudget", "lighting", "shadow", "occlusion", "sheet"]) assert(B[k], `the blueprint defines ${k}`);
    assert(B.shadow.ring.ringLine === false, "no line joins the ring to its shadow");
    for (const m of M) {
      assert(JSON.stringify(Object.keys(m.sheet)) === JSON.stringify(B.sheet.order), `${m.name}: the sheet's parts, in order (${Object.keys(m.sheet)})`);
      for (const k of B.sheet.identity) assert(m.identity[k], `${m.name}: its ${k} identity`);
      assert(R.anchor.includes(m.anchor) && B.anchors[m.anchor], `${m.name}: its anchor`);
      assert(m.sheet.ambient.length <= B.ambientBudget.max && m.sheet.lighting.ring >= B.lighting.ringReadability, `${m.name}: inside the ambient budget, the ring readable`);
      const Z = m.sheet.zones; assert(Z.targets.z[0] >= Z.ring.z[0] && Z.hazards.z[1] <= Z.ring.z[1], `${m.name}: targets behind the ring, hazards before it`);
    }
    assert(M.every(m => m.anchor === (m.n === 7 ? "gear" : "post")), "v50: every map's ring stands on its pole but the Clockwork Caves', which hangs from its gears");
  });
  test("Tiers I to VI have their names: The Toss, The Distraction, The Hazard, The Puzzle, The Chaos, The Secrets", () => {
    assert(T.tiers().map(x => x.name).join() === "The Toss,The Distraction,The Hazard,The Puzzle,The Chaos,The Secrets", T.tiers().map(x => x.name).join());
    const M = T.maps(); assert(M[0].tiers[0] === "I" && M[7].tiers[1] === "VI", "the reel climbs from the Toss to the Secrets");
  });
  test("v50: the ring stands on its pole on every map but the Clockwork Caves (it hangs from the gears there): it holds in the first half and leaves it when it flies", () => {
    fresh(); T.setStage(7); T.unfreezeRing(); T.step(0.2); assert(T.anchor().kind === "gear" && T.anchor().holds, `map 7 hangs it (${JSON.stringify(T.anchor())})`);
    for (const n of [1, 2, 6, 8]) { fresh(); if (n > 1) T.setStage(n); T.unfreezeRing(); T.step(0.2); const A = T.anchor(); assert(A.kind === "post" && A.holds, `map ${n}: on its pole (${JSON.stringify(A)})`); }
    beatCrow(1); assert(!T.anchor().holds, "the winged ring has left its pole");
    T.toTitle();
  });
  test("The environment answers a hit: props near a landing move, bend, squeak, crack or fall, the map's way", () => {
    fresh(); T.setScene(0); const P = T.scene(); assert(P.props > 8, "props");
    const got = T.reactAt(-3.6, 8, 1.3); assert(got.length >= 1, `something near the landing reacts (${JSON.stringify(got)})`);
    T.setScene(1); const g2 = T.reactAt(-3.3, 6.5, 1.3); assert(g2.some(r => r.does === "rotate") || g2.length >= 1, `the gilded angels turn (${JSON.stringify(g2)})`);
    T.toTitle();
  });
  test("A map brings its obstacles in on its beats: one thing, then more, then the second half's", () => {
    fresh(); T.setStage(2); T.setHits(C.ACT_LEN - 1); T.syncObstacles(); assert(T.obstacles().length === 0, "nothing in Act I");
    T.setHits(C.ACT_LEN); T.syncObstacles(); assert(T.obstacles().map(o => o.kind).join() === "bumper", `a gilded urn as Act II begins (${JSON.stringify(T.obstacles())})`);
    T.setHits(2 * C.ACT_LEN); T.syncObstacles(); assert(T.obstacles().length === 2, "two by Act III");
    for (let n = 1; n <= 8; n++) { fresh(); T.setStage(n); T.setHits(C.STAGE_MINI - 1); T.syncObstacles(); const k = T.obstacles().map(o => o.kind); assert(n === 1 ? !k.length : k.length >= 1, `map ${n}'s first half (${k})`); }
    T.toTitle();
  });
  test("A gilded urn bounces the skull instead of stopping it; the rest knock it out of the air, and Ghost Toss slips through", () => {
    fresh(); T.setStage(2); T.calm(); T.freezeRing(0, C.RING_Y); let { a, q } = pathAt(3.4);
    T.plantObstacle({ kind: "bumper", at: [q.x + 0.1, q.y, q.z], r: 0.3, from: 0 }); T.throwAt(a.AX, a.AY); T.step(2.5);
    assert(T.banked() >= 1 && !["bumper"].includes(T.state().lastResult.kind), `BOING (${T.banked()}, ${T.state().lastResult.kind})`);
    const blockers = [["bar", q => ({ kind: "bar", at: [q.x, q.y, q.z], len: 1.2, spin: 0 })], ["spikes", q => ({ kind: "spikes", span: [-2, 2], z: q.z, h: q.y + 0.4, cycle: [99, 1] })],
      ["crusher", q => ({ kind: "crusher", box: [q.x - 0.6, q.x + 0.6, q.z - 0.3, q.z + 0.3], top: q.y - 1.1, low: q.y - 1.1, cycle: [0.01, 99, 1] })], ["barrier", q => ({ kind: "barrier", box: [-2, 2, 0.5, 4.5, q.z], cycle: [99, 1] })],
      ["magnet", q => ({ kind: "magnet", at: [q.x, q.y, q.z], k: 0, R: 0.5 })]];
    for (const [kind, mk] of blockers) {
      fresh(); T.setStage(1); T.calm(); T.freezeRing(0, C.RING_Y); ({ a, q } = pathAt(3.4)); T.plantObstacle({ ...mk(q), from: 0 }); const lives = T.state().lives;
      T.throwAt(a.AX, a.AY); T.step(2.5); assert(T.state().lastResult.kind === kind && T.state().lives === lives - 1, `${kind}: got ${T.state().lastResult.kind}`);
      T.givePower("ghost"); T.freezeRing(0, C.RING_Y); T.throwAt(a.AX, a.AY); T.step(2.5); assert(T.state().lastResult.make, `Ghost Toss slips past the ${kind} (${T.state().lastResult.kind})`);
    }
    T.toTitle();
  });
  test("The cannon fizzes, then fires a ball across the lane; the crusher, spikes and scrim each give a tell first", () => {
    fresh(); T.setStage(6); T.calm(); T.plantObstacle({ kind: "cannon", side: -1, y: 2.5, z: 3.4, every: [3, 0.9], speed: 6, from: 0 }); T.obClock(0);
    T.step(0.5); assert(T.obstacles()[0].balls === 0, "the fuse first"); T.step(0.6); assert(T.obstacles()[0].balls === 1, `then BOOM (${JSON.stringify(T.obstacles())})`);
    T.step(1.5); assert(T.obstacles()[0].balls === 0, "and the ball leaves the lane");
    T.toTitle();
  });
  test("A fan and a lodestone bend the flight, and the aim guide bends with them", () => {
    fresh(); T.setStage(3); T.calm(); T.freezeRing(0, C.RING_Y); const still = T.predictCrossing(0, C.RING_Y);
    T.plantObstacle({ kind: "fan", box: [-3, 3, 0, 5, 0.5, 5.5], push: [3, 0], pulse: [99, 0.01], from: 0 }); T.obClock(0.5);
    const bent = T.predictCrossing(0, C.RING_Y); assert(bent.x > still.x + 0.3, `the guide leans with the gust (${still.x.toFixed(2)} → ${bent.x.toFixed(2)})`);
    T.freezeRing(bent.x, bent.y); T.throwAt(0, C.RING_Y); T.step(2.5); const s = T.state();
    assert(Math.abs(s.lastCross.x - bent.x) < 0.08, `and the throw goes where the guide said (${s.lastCross.x.toFixed(3)} vs ${bent.x.toFixed(3)})`);
    T.clearObstacles(); T.plantObstacle({ kind: "magnet", at: [2.0, 2.8, 3.6], k: 9, R: 2.2, from: 0 }); const f = T.obForce(1.2, 2.8, 3.6); assert(f.x > 0, "the lodestone pulls toward itself");
    T.toTitle();
  });
  test("Nine kinds of target: shielded take two, split ones burst in two, pop-ups duck, gold pays, secrets hide, decoys are a miss", () => {
    fresh(); T.setStage(5); T.calm(); let t0 = T.spawnTargetType("shielded"); assert(t0.shield, "a lid");
    let r = T.hitTargetNow(0); assert(!r[0].pop && !r[0].shield, "the first hit knocks the lid off"); r = T.hitTargetNow(0); assert(r[0].pop > 0, "the second pops it");
    fresh(); T.setStage(4); T.calm(); T.spawnTargetType("split"); r = T.hitTargetNow(0); assert(r.filter(x => x.type === "half").length === 2, `two halves (${JSON.stringify(r)})`);
    fresh(); T.setStage(4); T.calm(); T.spawnTargetType("popup"); let up = 0, down = 0; for (let i = 0; i < 40; i++) { T.step(0.1); if (T.targetLive(0)) up++; else down++; } assert(up > 5 && down > 5, `it ducks and comes back (${up}/${down})`);
    fresh(); T.setStage(8); T.calm(); const b = T.bones(); T.spawnTargetType("golden"); T.hitTargetNow(0); assert(T.bones() >= b + 25, "gold pays bones");
    const secrets = T.profile().secretTargets || 0; T.spawnTargetType("secret"); T.hitTargetNow(1); assert((T.profile().secretTargets || 0) === secrets + 1, "a secret found counts");
    fresh(); T.setStage(3); T.calm(); T.freezeRing(0, C.RING_Y); const { a, q } = pathAt(3.6); const d = T.spawnTargetType("decoy"); assert(d.corner != null && d.arm, "v54: a decoy rides on an arm beside the ring like the rest");
    void a; void q; T.toTitle();
  });
  test("v54: targets ride beside the ring on arms, 1.25–1.6× its drawn size out, never on it, on screen and within reach wherever it goes; a throw straight at one hits it and isn't a miss (v50)", () => {
    for (const n of [2, 4, 6, 8]) {
      const R = T.maps()[n - 1].sheet.zones.ring;
      for (const [rx, ry] of [[0, C.RING_Y], [R.x[0], R.y[1]], [R.x[1], R.y[0]]]) {
        fresh(); T.setStage(n); T.calm(); T.freezeRing(rx, ry); for (let i = 0; i < 4; i++) T.spawnTargetType("standard");
        const Ts = T.targetsFull(), O = T.armOuter(); assert(new Set(Ts.map(q => q.corner)).size === 4, `map ${n}: four slots of their own (${Ts.map(q => q.corner)})`);
        for (const q of Ts) {
          const d = Math.hypot(q.x - rx, q.y - ry);
          assert(d >= O + 0.26 && d <= O * 1.6 + 0.3, `map ${n}, ring at ${rx},${ry}: beside the ring, clear of its drawn edge (${d.toFixed(2)} from its centre; drawn ${O.toFixed(2)})`);
          assert(Math.abs(q.x) <= 1.95 * q.z / 6 + 0.01, `map ${n}: on screen even on a phone (${q.x.toFixed(2)})`);
          const a = T.aimFor(q.x, q.y, q.z); assert(Math.abs(a.AX) <= 2.8 && a.AY <= 5 && a.AY >= 0.35, `map ${n}: within a throw's aim (${JSON.stringify(a)})`);
        }
      }
    }
    fresh(); T.setStage(3); T.calm(); T.spawnTargetType("standard"); const q = T.targetsFull()[0], a = T.aimFor(q.x, q.y, q.z), lives = T.state().lives, pts = T.profile().targetHits || 0;
    void q;
    T.setStreak(4); T.freezeRing(0, C.RING_Y); T.throwAt(a.AX, a.AY); T.step(3);
    assert((T.profile().targetHits || 0) === pts + 1 && !T.state().lastResult.make && T.state().lastResult.target && T.state().lives === lives && T.state().streak === 4, `straight at a corner: the bullseye pays, and it isn't a miss (${T.profile().targetHits}, ${T.state().lastResult.kind}, lives ${T.state().lives}/${lives})`);
    assert(T.targets().filter(x => !x.pop).length === 0, "and no new bullseye turns up until a make");
    T.toTitle();
  });
  test("A decoy in the throw's way is a miss; the Codex knows all nine targets and eight obstacles", () => {
    fresh(); T.setStage(3); T.calm(); T.freezeRing(0, C.RING_Y); const { a, q } = pathAt(3.6); T.plantDecoy(q.x, q.y, q.z); const lives = T.state().lives;
    T.throwAt(a.AX, a.AY); T.step(2.5); assert(T.state().lastResult.kind === "decoy" && T.state().lives === lives - 1, `HONK (${T.state().lastResult.kind})`);
    T.setStats(ZERO); T.openSheet("codex"); document.querySelector('#codexTabs [data-cat="obstacle"]').click(); assert(document.querySelectorAll("#codexList .entry").length === 8, "eight obstacles");
    document.querySelector('#codexTabs [data-cat="target"]').click(); assert(document.querySelectorAll("#codexList .entry").length === 9, "nine targets");
    T.closeSheet(); T.toTitle();
  });
  test("The Pumpkin King: his mouth is the ring, his eyes are targets; a poke is one of the 80 hits, and poke both shut and he's blind and gaping", () => {
    T.setStats(ZERO); beatCrow(1); toHit(C.STAGE_BOSS); T.step(2.9); T.freezeRing(0, C.RING_Y); let K = T.pk();
    assert(K && !K.eyes[0] && !K.eyes[1] && K.hp === C.STAGE_END - C.STAGE_BOSS && K.phase === 0, `two open eyes, thirty hits, phase I (${JSON.stringify(K)})`);
    const lives = T.state().lives; T.freezeRing(0, C.RING_Y); K = T.pk(); const e = K.eye[0];
    T.plantSeed(9, 9, 9); const aim = T.aimFor(e.x, e.y, e.z); T.throwAt(aim.AX, aim.AY); T.step(2.5);
    let s = T.state(); assert(s.lastResult.kind === "eye" && s.lastResult.make && s.lives === lives && T.pk().eyes[0] && T.pk().hp === K.hp - 1 && s.stageHits === C.STAGE_BOSS + 1,
      `POKE: a hit that counts (${s.lastResult.kind}, lives ${s.lives}/${lives}, hp ${T.pk().hp}, hits ${s.stageHits})`);
    const e1 = T.pk().eye[1], aim2 = T.aimFor(e1.x, e1.y, e1.z); T.freezeRing(0, C.RING_Y); T.throwAt(aim2.AX, aim2.AY); T.step(2.5);
    K = T.pk(); assert(K.blind > 0 && K.rc > 0.6, `blind, and the mouth gapes (${JSON.stringify(K)})`);
    const hp = K.hp; T.freezeRing(0, C.RING_Y); throwAndSettle(0, C.RING_Y); assert(T.pk().hp === hp - 1 && T.state().stageHits === C.STAGE_BOSS + 3, `down his throat is one hit more (${hp} → ${T.pk().hp})`);
    T.toTitle();
  });
  test("v47: every map is 80 hits — three named acts, the Crow King's ten, the ring breaks loose at 40, the approach, the end boss's three phases of ten", () => {
    T.setStats(ZERO); fresh(); T.calm();
    toHit(C.ACT_LEN); let A = T.act(); assert(A.act === 1 && /Act II/.test(A.card) && /Haunted Farm/.test(A.card), `hit 10: Act II, the Haunted Farm (${JSON.stringify(A)})`);
    toHit(2 * C.ACT_LEN); A = T.act(); assert(A.act === 2 && /Harvest Grove/.test(A.card), `hit 20: Act III (${JSON.stringify(A)})`);
    toHit(C.STAGE_MINI); T.step(2.6); let F = T.fight(); assert(F && F.kind === "crow" && F.max === 10 && !F.end, `hit 30: the Crow King, ten hits (${JSON.stringify(F)})`);
    for (let i = 0; i < 10 && T.boss() && !T.boss().dead; i++) { const r = T.state().ring; T.freezeRing(r.x, r.y, r.z); T.throwThrough(r.x, r.y, r.z); T.step(2.4); if (i < 9) assert(T.state().stageHits === C.STAGE_MINI + i + 1, `each make on him is one hit, a perfect too (${T.state().stageHits})`); }
    T.step(3.2); let s = T.state(); assert(s.phase === "B" && s.stageHits === C.STAGE_LOOSE && T.act().catchDue, `hit 40: he drops the ring and it's loose (${s.phase}, ${s.stageHits})`);
    const r = s.ring, c0 = T.profile().ringCatches; T.freezeRing(r.x, r.y, r.z); T.throwThrough(r.x, r.y, r.z); T.step(2.5); assert(!T.act().catchDue && T.profile().ringCatches === c0 + 1, `the first make catches it (${T.profile().ringCatches})`); T.unfreezeRing();
    toHit(C.STAGE_BOSS); T.step(2.9); F = T.fight(); assert(F.kind === "pumpkin" && F.end && F.max === 30 && F.phase === 0 && $("prog").classList.contains("phases"), `hit 50: the Pumpkin King, thirty hits in phases (${JSON.stringify(F)})`);
    T.hurtBoss(10); F = T.fight(); assert(F.phase === 1 && F.phaseDue && T.state().stageHits === 60, `hit 60: phase II (${JSON.stringify(F)}, ${T.state().stageHits})`);
    T.stageCheck(); assert(/Phase II/.test($("stagecard").textContent) && /The Roll/.test($("stagecard").textContent) && T.state().cine === "boss-phase", `the phase card (${$("stagecard").textContent})`);
    T.step(1.6); T.hurtBoss(10); T.stageCheck(); T.step(1.6); const K = T.pk(); assert(K.phase === 2 && K.eyes[0] && K.eyes[1] && K.rc > 0.6 && /The Mouth/.test($("stagecard").textContent), `hit 70: phase III, the mouth; his eyes screwed shut (${JSON.stringify(K)})`);
    T.hurtBoss(10); assert(T.boss().dead && T.state().stageHits === C.STAGE_END, `hit 80: he's down (${T.state().stageHits})`);
    T.endThrow(); T.step(6); s = T.state(); assert(s.stage === 2 && s.stageHits === 0 && T.act().act === 0, `and on to map 2 (${s.stage})`);
    T.toTitle();
  });
  test("v47: Boss Rush keeps its short fights (a perfect hurts twice there), and an end boss still climbs three phases", () => {
    T.setStats({ ...ZERO, bossKills: 1, bossLog: { crow: 1, pumpkin: 1 } }); T.startMode("rush", 0); T.step(2.6); let F = T.fight();
    assert(F && F.kind === "crow" && F.max < 10, `the Crow King's own short fight (${JSON.stringify(F)})`);
    T.hurtBoss(99); T.endThrow(); T.step(3); F = T.fight(); assert(F && F.kind === "pumpkin" && F.end && F.max < 30, `then the Pumpkin King's (${JSON.stringify(F)})`);
    T.hurtBoss(Math.ceil(F.max / 3)); assert(T.fight().phase === 1, `a third down: phase II (${JSON.stringify(T.fight())})`);
    T.toTitle(); T.setStats(ZERO);
  });
  test("The new slots: hair, facial hair and wings come back from the end bosses; a launcher (v49: no Wizard Mort shelf)", () => {
    T.setStats(ZERO); T.toTitle(); T.openSheet("customize");
    for (const k of ["hair", "beard", "wings", "launcher"]) { T.shopCat(k); assert(document.querySelectorAll("#shopGrid .item").length >= 3, `the ${k} shelf`); }
    const groups = [...document.querySelectorAll("#catTabs [data-group]")].map(b => b.dataset.group);
    assert(groups.join() === "Skull,Face,Hair,Facial hair,Head,Wings,Effects,Ring,Launcher,Special" && !document.querySelector('#catTabs [data-cat="wizard"]'), groups.join());
    assert(!T.canUse("hair", "vines"), "locked at first");
    T.setStats({ ...ZERO, bossLog: { pumpkin: 1 } }); assert(T.canUse("hair", "vines"), "the Pumpkin King: his vines");
    T.closeSheet(); T.equip("wings", "shadow"); T.start(); T.step(0.5); T.freezeRing(0, C.RING_Y); throwAndSettle(0, C.RING_Y); assert(T.state().lastResult.make, "and he still throws the same");
    T.equip("wings", "none"); T.setStats(ZERO); T.toTitle();
  });
  test("The profile has a picture (one of eight) and a bio, and both travel in a save code", () => {
    T.setStats({ ...ZERO, bestStage: 3 }); T.toTitle(); T.openSheet("profile");
    const pics = document.querySelectorAll("#picGrid button"); assert(pics.length === 8 && [...pics].every(b => !b.disabled), "eight pictures, all of them selectable");
    document.querySelector('#picGrid [data-face="dizzy"]').click();
    assert(T.profile().pic.face === "dizzy" && T.profile().pic.frame === "drowned" && document.querySelector('#picGrid [data-face="dizzy"]').getAttribute("aria-pressed") === "true", JSON.stringify(T.profile().pic));
    const bio = $("prof-bio"); bio.value = "Tosser of skulls <b>"; bio.dispatchEvent(new Event("input")); assert(T.profile().bio === "Tosser of skulls b", `markup stripped (${T.profile().bio})`);
    const code = T.exportCode(); T.setStats(ZERO); assert(T.importCode(code) && T.profile().bio === "Tosser of skulls b" && T.profile().pic.face === "dizzy", "the code carries them");
    T.closeSheet(); T.setStats(ZERO); T.toTitle();
  });
  test("Story is now the Adventure, wherever a player reads it", () => {
    assert(T.tr("mode.story.name") === "Adventure", T.tr("mode.story.name"));
    const words = document.body.innerText + " " + [...document.querySelectorAll("[aria-label]")].map(e => e.getAttribute("aria-label")).join(" ");
    assert(!/\bStory\b/.test(words.replace(/Storyboard/g, "")), "no Story left on screen");
  });
  test("Occlusion: the foreground frame never covers the ring's zone on any map", () => {
    const B = T.blueprint();
    for (let i = 0; i < 8; i++) {
      T.setScene(i); const Z = T.maps()[i].sheet.zones.ring, pts = [];
      for (const x of Z.x) for (const y of [Z.y[0], Z.y[1]]) for (const z of Z.z) pts.push(T.ringScreen(x, y, z));
      const a = T.fgAlphaAt(pts); assert(a <= B.occlusion.fgMaxAlpha, `${T.maps()[i].name}: the frame covers the ring zone (alpha ${a.toFixed(2)})`);
    }
    T.setScene(0); T.toTitle();
  });

  test("App Check (reCAPTCHA Enterprise) is configured, stays out of Firebase's own options, and never runs off the https site", async () => {
    const opts = []; const app = { auth: () => ({ currentUser: { uid: "u1", displayName: "" } }), firestore: () => ({}), functions: () => ({ httpsCallable: () => () => Promise.resolve({ data: {} }) }) };
    const stub = { apps: [], initializeApp: o => { opts.push(o); return app; }, app: () => app, auth: {}, firestore: {}, functions: {}, appCheck: () => { throw new Error("should not activate here"); } };
    const r = await T.useFirebaseWith({ apiKey: "k", projectId: "p", appId: "a", appCheck: { recaptchaEnterprise: "site-key" } }, stub);
    assert(r.kind === "firebase" && !r.appCheck && opts[0] && !("appCheck" in opts[0]), `off the https site, no App Check, and Firebase never sees the key as an option (${JSON.stringify(r)})`);
    delete window.firebase; T.noServer(); T.toTitle();
  });

  // ── v47: perceptual travel (the Crow Hollow pilot) and the GPU effects layer ──
  test("v47 travel: Crow Hollow's scenery comes toward Morty a step a make, slows as a boss comes up, stands still through the fights, and never stands in the lane", () => {
    T.setStats(ZERO); fresh(); T.calm(); let V = T.travel();
    assert(V.on && V.D === 0 && V.props > 100, `Crow Hollow travels, from the start (${JSON.stringify(V)})`);
    const at = T.travelAt, step = at(1) - at(0);
    assert(step > 3 && at(C.ACT_LEN) > at(0) && at(C.STAGE_MINI) > at(2 * C.ACT_LEN), `every make of the acts carries it on (${[0, 10, 20, 30].map(at)})`);
    assert(at(C.STAGE_MINI) - at(C.STAGE_MINI - 1) < step * 0.5 && at(C.STAGE_BOSS) - at(C.STAGE_BOSS - 1) < step * 0.5, "the world slows as Morty arrives at a boss");
    assert(at(C.STAGE_LOOSE) === at(C.STAGE_MINI) && at(C.STAGE_END) === at(C.STAGE_BOSS) && at(C.STAGE_BOSS) > at(C.STAGE_LOOSE), "still through each fight, on again through the approach");
    const D0 = T.travel().D; T.freezeRing(0, C.RING_Y); throwAndSettle(3, C.RING_Y); assert(T.travel().D === D0, "a miss goes nowhere");
    T.freezeRing(0, C.RING_Y); throwAndSettle(0, C.RING_Y); V = T.travel(); assert(Math.abs(V.D - at(1)) < 0.05, `a make: one step on (${V.D} of ${at(1)})`);
    T.step(2); assert(T.travel().D === V.D, "and nothing moves while you aim");
    T.setHits(24); T.snapTravel(); assert(T.travel().D === at(24) && T.travel().zone === "harvest", `where the world stands comes from the hits alone, so a reload or a replay finds it there (${JSON.stringify(T.travel())})`);
    toHit(C.STAGE_MINI); const Dm = T.travel().D; T.step(2.6); T.hurtBoss(4); T.step(1); assert(T.travel().D === Dm && T.travel().zone === "crows", "the Crow King's arena stands still");
    const half = 2.4, far = T.travelEnd(), bad = T.travelSpans().filter(s => s.x1 > -half && s.x0 < half && s.d - far < 16);
    assert(!bad.length, `no scenery ever stands in the throw corridor (${JSON.stringify(bad.slice(0, 3))})`);
    fresh(); T.setStage(2); assert(T.travel().on && T.travel().D === 0, "and so does the next map (all eight do: the v48 test)");
    T.startArcade(0); T.setHits(20); T.step(3); assert(T.travel().on && T.travel().D > 0, "Arcade on Crow Hollow travels too (v58: every mode that plays a lane does)");
    T.toTitle(); T.setStats(ZERO);
  });
  // ── v49: the menus, the Vault's Closet, the Cart and the Soul Shop, the popups and the results ──
  test("v49 title: six small buttons in two rows of three, and Leaderboard says so", () => {
    T.toTitle(); const chips = [...document.querySelectorAll("#title .menu-row .chip-btn")].filter(b => !b.hidden);
    assert(chips.length === 6 && getComputedStyle(document.querySelector("#title .menu-row")).display === "grid", `six, in a grid (${chips.length})`);
    const tops = [...new Set(chips.map(b => Math.round(b.getBoundingClientRect().top)))]; assert(tops.length === 2, `two rows (${tops})`);
    assert(chips.some(b => b.textContent.trim() === "Leaderboard") && !chips.some(b => b.textContent.trim() === "Leaders"), "Leaderboard, not Leaders");
  });
  test("v49 Play sheet and challenges: the Director's Challenge comes after Practice and Boss Rush; the set bonus is a slim strip at the top", () => {
    T.setStats(OPENED); T.toTitle(); T.openSheet("play"); const kids = [...$("modePick").children].map(el => el.id || el.className);
    assert(kids.indexOf("directorCard") > kids.indexOf("moreModes"), `the director's card below the other modes (${kids})`); T.closeSheet();
    T.openSheet("challenges"); const body = [...document.querySelector("#sheet-challenges .sheet-body").children].map(el => el.id || el.className);
    assert(body.indexOf("chalSet") < body.indexOf("streakLine") && body.indexOf("chalSet") < body.indexOf("chalList") && $("chalSet").querySelector(".chal-set"), `the strip above the streak and the timer (${body})`);
    assert($("chalSet").firstElementChild.getBoundingClientRect().height < 64, `and it's slim (${$("chalSet").firstElementChild.getBoundingClientRect().height})`); T.closeSheet(); T.setStats(ZERO);
  });
  test("v50 settings: only the categories, a category opens its settings; Account & General has notifications, linking, redeem and support", async () => {
    T.toTitle(); T.openSheet("settings");
    const cats = [...document.querySelectorAll("#setCats .set-cat b")].map(b => b.textContent).join("|");
    assert(cats === "Audio|Graphics|Gameplay|Accessibility|Account & General", cats);
    assert([...document.querySelectorAll("#sheet-settings .set-sec")].every(s => s.hidden), "no settings until a category is picked");
    document.querySelector('.set-cat[data-sec="audio"]').click();
    assert(!document.querySelector('.set-sec[data-sec="audio"]').hidden && $("setCats").hidden && $("h-settings").textContent === "Audio", "Audio opens");
    $("sheet-settings").querySelector("[data-back]").click();
    assert(T.state().sheet === "settings" && !$("setCats").hidden, "back goes to the categories first");
    document.querySelector('.set-cat[data-sec="account"]').click();
    for (const id of ["set-notif-daily", "set-notif-chal", "set-notif-events", "googleSignIn", "redeemIn", "redeemBtn"]) assert($(id), id);
    for (const p of ["apple.com", "facebook.com", "password"]) assert(document.querySelector(`.link-btn[data-provider="${p}"]`), p);
    assert([...document.querySelectorAll("[data-info]")].map(b => b.dataset.info).join() === "help,privacy,terms,credits", "support and credits");
    const btn = $("googleSignIn"); assert(btn && /Sign in with Google/.test(btn.textContent) && btn.disabled, "the Google button (off without the online game)");
    assert(/online game/.test($("accountNote").textContent), $("accountNote").textContent);
    const b0 = T.profile().bones;
    const r0 = T.profile().redeemed.length;
    $("redeemIn").value = "nope nope"; $("redeemBtn").click(); await new Promise(r => { const iv = setInterval(() => { if (!$("redeemBtn").disabled) { clearInterval(iv); r(); } }, 20); });   // (v53: an unknown code waits on the key check)
    assert(/isn't valid/.test($("redeemNote").textContent) && T.profile().redeemed.length === r0 && !T.profile().allAccess, `a bad code pays nothing (${$("redeemNote").textContent})`);   // (v53: judged by what it redeemed, since other rewards can land while the key is checked)
    const b1 = T.profile().bones;
    $("redeemIn").value = "morty-bones"; $("redeemBtn").click(); assert(T.profile().bones === b1 + 500, `a good code pays (${T.profile().bones - b1})`);
    $("redeemIn").value = "MORTYBONES"; $("redeemBtn").click(); assert(/already used/.test($("redeemNote").textContent) && T.profile().bones === b1 + 500, "once");
    document.querySelector('[data-info="credits"]').click(); assert(T.state().sheet === "info" && /Credits/.test($("h-info").textContent) && $("infoBody").children.length, "credits open");
    $("sheet-info").querySelector("[data-back]").click(); assert(T.state().sheet === "settings" && !document.querySelector('.set-sec[data-sec="account"]').hidden, "back to Account & General");
    T.closeSheet();
    T.openSheet("profile"); assert(!document.querySelector("#sheet-profile .google-btn"), "and not on the Profile any more (v53: sign-in is here)"); T.closeSheet();
  });
  test("v51 throw feel: a miss leaves a ghost trail (and a cross if it went close) until a make wipes it", () => {
    T.setStats(ZERO); fresh(); T.calm(); throwAndSettle(2.5, C.RING_Y);
    const F = T.feel(); assert(F.ghost > 5 && T.state().lastResult !== undefined, `a miss leaves its path (${F.ghost})`);
    throwAndSettle(0, C.RING_Y); assert(T.feel().ghost === 0, "a make wipes it");
    T.toTitle(); T.setStats(ZERO);
  });
  test("v51 the world starts moving on a predicted make, and doesn't on a predicted miss", () => {
    T.setStats(ZERO); fresh(); T.calm(); T.step(0.1); const tr0 = T.travel(); if (!tr0.on) { T.toTitle(); return; }
    assert(T.throwAt(0, C.RING_Y), "throw"); T.step(0.12);
    const a = T.feel().antic; assert(a.predicted && a.k > 0, `a make on its way is foreseen (${JSON.stringify(a)})`);
    const g = T.travel().goal; assert(g > tr0.goal, `and the world leads off before it lands (${g} > ${tr0.goal})`);
    T.step(3); T.freezeRing(0, C.RING_Y);
    assert(T.throwAt(2.5, C.RING_Y), "throw"); T.step(0.12); assert(!T.feel().antic.predicted, "a miss isn't");
    T.step(3); T.toTitle(); T.setStats(ZERO);
  });
  test("v53 the Crow King flies his path: the whole body bobs a little with a slow, uneven wingbeat, the ring more, and not in step", () => {
    T.setStats(ZERO); fresh(); toHit(C.STAGE_MINI); T.step(2.6);
    const B = T.boss(); assert(B && B.kind === "crow", "the Crow King"); const t = 2.0;   // (a moment in his first perch)
    const ts = Array.from({ length: 28 }, (_, i) => t + i * 0.025), qs = ts.map(u => T.bossPath(u)).filter(q => !q.tell);
    const body = qs.map(q => q.ay), ring = qs.map(q => q.y - q.ay), span = a => Math.max(...a) - Math.min(...a);
    assert(span(body) > 0.02 && span(body) < 0.05, `the body bobs a couple of centimetres (${span(body).toFixed(3)})`);
    assert(span(ring) > 0.03 && span(ring) < 0.09, `the ring bobs more, under him (${span(ring).toFixed(3)})`);
    const top = a => a.indexOf(Math.max(...a)); assert(top(body) !== top(qs.map(q => q.y)), "body and ring don't peak together");
    T.toTitle(); T.setStats(ZERO);
  });
  test("v51 boss deaths: every boss has its own archetype, word and gag; a knockout plays it, then the gag drops", () => {
    const D = T.deathTable(), ARCH = ["collapse", "launch", "deflate", "spinout", "accordion", "shatter", "smoke", "dropout", "target", "cinematic"];
    assert(Object.keys(D).length === 16 && Object.values(D).every(d => ARCH.includes(d[0]) && d[3].length > 2), "sixteen, each with an archetype and a word");
    assert(new Set(Object.values(D).map(d => d[0])).size >= 9, "and they don't all go the same way");
    T.setStats(ZERO); fresh(); toHit(C.STAGE_MINI); T.step(2.6); T.hurtBoss(99);
    const X = T.death(); assert(X && X.arch === "spinout" && X.word === "PLUCKED!" && X.gag === "crown", JSON.stringify(X));
    T.step(1.6); assert(T.gags().includes("crown"), `the crown falls, after the hit-stop and the spin-out (${T.gags()})`);
    T.toTitle(); T.setStats(ZERO);
  });
  // ── v53 ──
  test("v53 settings: a medium text size; save codes live in Account & General; the notification switches always switch", async () => {
    T.openSheet("settings"); document.querySelector("#setCats [data-sec=access]").click();
    const med = document.querySelector('#set-text [data-v="medium"]'); assert(med, "a Medium option"); med.click();
    assert(document.documentElement.dataset.text === "medium" || T.settings().text === "medium", "medium applies");
    document.querySelector('#set-text [data-v="normal"]').click();
    T.closeSheet(); T.openSheet("settings"); document.querySelector("#setCats [data-sec=account]").click();
    assert($("sheet-settings").contains($("saveCard")) && $("sheet-settings").contains($("copyCodeBtn")), "the save codes are in Settings");
    assert(!$("sheet-profile").querySelector(".google-btn"), "and the profile has no sign-in button any more");
    const was = T.settings().notifDaily; $("set-notif-daily").click(); await new Promise(r => setTimeout(r, 50));
    assert(T.settings().notifDaily === !was && !$("set-notif-daily").disabled, "the switch switches, whatever the browser allows");
    if (T.settings().notifDaily !== was) $("set-notif-daily").click();
    T.closeSheet();
  });
  test("v53 leaderboard: Adventure (and Adventure+) and the eight mini-games in menus; Arcade and Boss Rush as buttons", () => {
    T.openSheet("board"); const M = $("boardModes");
    assert(M.querySelectorAll(":scope > *").length === 4, `four in the row (${M.children.length})`);
    const minis = M.querySelectorAll('[data-group="minis"] [data-mode]'); assert(minis.length === 8, `all eight mini-games (${minis.length})`);
    M.querySelector("[data-drop=adv]").click(); M.querySelector('[data-mode="plus"]').click();
    assert(/Adventure\+/.test(M.querySelector("[data-drop=adv]").textContent), "picking Adventure+ names the menu's button");
    M.querySelector("[data-drop=minis]").click(); M.querySelector('[data-mode="swing"]').click();
    assert(/Swing Time/.test(M.querySelector("[data-drop=minis]").textContent) && M.querySelector('[data-group="minis"] .board-menu').hidden, "a mini-game picked, the menu shut");
    M.querySelector("[data-drop=adv]").click(); M.querySelector('[data-mode="story"]').click(); T.closeSheet();
  });
  test("v53 codex: the parts in a menu, the entries one row of book pages; achievements two rows a kind, each marked with its difficulty", () => {
    T.openSheet("codex"); assert($("codexTabs").hidden, "the menu starts shut"); $("codexCatBtn").click(); assert(!$("codexTabs").hidden, "and opens");
    $("codexTabs").querySelector('[data-cat="boss"]').click(); assert($("codexTabs").hidden && /boss/i.test($("codexCatLbl").textContent), "a part picked");
    const L = $("codexList"); assert(getComputedStyle(L).display === "flex" && L.scrollWidth > L.clientWidth, "the pages scroll sideways");
    T.closeSheet(); T.openSheet("achievements");
    const g = document.querySelector("#achList .ach-grid"); assert(getComputedStyle(g).gridAutoFlow.startsWith("column") && g.scrollWidth > g.clientWidth, "two rows that scroll sideways");
    const tiers = [...document.querySelectorAll("#achList .ach-tier")].map(e => e.textContent); assert(tiers.includes("Easy") && tiers.includes("Legendary"), `difficulty on every card (${new Set(tiers).size} kinds)`);
    T.closeSheet();
  });
  test("v53 the map's title card is fully opaque", () => {
    const el = $("reelCard"); el.dataset.kind = "title"; const bg = getComputedStyle(el).backgroundImage; delete el.dataset.kind;
    assert(!/rgba\([^)]*,\s*0?\.\d+\)/.test(bg), `no see-through colour in it (${bg.slice(0, 80)})`);
  });
  test("v53 the cat keeps its place in the world as the camera travels", () => {
    T.setStats(ZERO); fresh(); T.calm(); T.step(2); T.catNow(); const c0 = T.cat(), d0 = T.travel().D; assert(c0, "a cat");   // (the world settled first)
    T.freezeRing(0, C.RING_Y); throwAndSettle(0, C.RING_Y); T.step(1.5); const c1 = T.cat(), d1 = T.travel().D;
    assert(d1 > d0 + 0.1, `the world travelled on a make (${d0} → ${d1}, ${T.state().hits} hits)`);
    assert(!c1 || Math.abs(c0.z - c1.z - (d1 - d0)) < 0.03, `the cat is passed by as far as the world moved, not carried along (${c0.z.toFixed(2)} → ${c1 ? c1.z.toFixed(2) : "gone"}; the world ${(d1 - d0).toFixed(2)})`);
    T.toTitle();
  });
  test("v53 underwater: a skull that comes down in open water goes in, slows and sinks, and the throw still ends (v58: the marsh; the Drowned Theater is under the sea now)", () => {
    T.setStats(ZERO); fresh(); T.setStage(5); T.calm(); T.freezeRing(0, C.RING_Y);
    assert(T.throwAt(1.6, 0.9), "thrown"); let lowest = 9, under = 0;
    for (let i = 0; i < 60 && T.state().state === "flying"; i++) { T.step(0.05); const y = T.state().skull.y; lowest = Math.min(lowest, y); if (y < -0.05) under++; }
    assert(under > 3 && lowest > -1.35, `it went under and stopped short of the bottom (lowest ${lowest.toFixed(2)})`);
    T.step(3); assert(T.state().state !== "flying", "and the throw ended");
    T.toTitle();
  });
  test("v53 a wrong play-test key opens nothing", async () => {
    const P0 = T.profile(); T.openSheet("settings"); document.querySelector("#setCats [data-sec=account]").click();
    $("redeemIn").value = "NOT-THE-KEY-9"; $("redeemBtn").click(); await new Promise(r => { const iv = setInterval(() => { if (!$("redeemBtn").disabled) { clearInterval(iv); r(); } }, 20); });
    assert(!T.profile().allAccess && T.profile().bones === P0.bones && /isn't valid/.test($("redeemNote").textContent), "refused");
    T.closeSheet();
  });
  // ── v55 ──
  test("v55 screens: the closet in the order you'd dress him; a screen opens at its top; a diamond once Adventure+ is beaten; mastery pages of eight", () => {
    const cats = [...document.querySelectorAll("#catTabs [data-cat]")].map(b => b.dataset.cat);
    assert(cats.slice(0, 9).join() === "skull,paint,eyes,teeth,mask,glasses,hair,beard,hat", `skull, then face, hair, beard, hat (${cats.slice(0, 9)})`);
    T.setStats(ZERO); T.toTitle(); T.openSheet("store"); const body = document.querySelector("#sheet-store .sheet-body") || $("sheet-store"); body.scrollTop = 400; T.closeSheet();
    T.openSheet("store"); assert(body.scrollTop === 0, "the Cart opens at its top again"); T.closeSheet();
    T.openSheet("profile"); assert($("profPlus").hidden, "no diamond yet"); T.closeSheet();
    T.setStats({ ...ZERO, plusClears: 1 }); T.openSheet("profile"); assert(!$("profPlus").hidden, "Adventure+ beaten: the diamond"); T.closeSheet();
    T.setStats({ ...ZERO, bossLog: { crow: 60 } }); T.openSheet("mastery"); document.querySelector('#masteryTabs [data-cat="boss"]').click();
    const pg = document.querySelector('#masteryList [data-m="boss:crow"]'); assert(pg.classList.contains("m-page") && pg.querySelectorAll(".m-line .m-tier").length === 8 && pg.querySelectorAll(".m-tier.got").length === 4, "a page, eight stops on its line, four reached at 60");
    T.closeSheet(); T.setStats(ZERO); T.toTitle();
  });
  // ── v58: the sky keeps time with the road; one ring reflection; every mode travels ──
  test("v58 The sky: the further the road has come, the lower the moon (setting on its own side, clear of the ring) and the later the night; the picture-house screen stays put", () => {
    T.setStats({ ...ZERO, bestStage: 9 }); fresh(); T.step(0.5); const s0 = T.sky();
    assert(s0.p === 0 && s0.dx === 0 && s0.dy === 0 && s0.halo, `the start of the road: the moon where it hangs (${JSON.stringify(s0)})`);
    T.setHits(40); T.snapTravel(); T.step(0.2); const s1 = T.sky();
    assert(s1.p > 0.5 && s1.y > s0.y && Math.abs(s1.x - T.ringScreen(0, C.RING_Y, C.RING_Z).x) > Math.abs(s0.x - T.ringScreen(0, C.RING_Y, C.RING_Z).x), `forty makes on: lower, and further from the ring (${JSON.stringify(s1)})`);
    T.setHits(C.STAGE_END - 2); T.snapTravel(); T.step(0.2); const s2 = T.sky(); assert(s2.p >= s1.p && s2.y >= s1.y, `by the boss it is setting (${JSON.stringify(s2)})`);
    T.setStage(4); T.setHits(40); T.snapTravel(); T.step(0.2); const s4 = T.sky(); assert(s4.kind === "screen" && s4.dx === 0 && s4.dy === 0, `the Drowned Theater's screen doesn't move (${JSON.stringify(s4)})`);
    T.toTitle(); T.setStats(ZERO);
  });
  test("v58 The ring has one reflection on the water, drawn every frame there, and none anywhere else", () => {
    T.setStats({ ...ZERO, bestStage: 9 }); fresh(); T.setStage(5); T.step(0.3); assert(T.ringRefl() === 1, "the Black Marsh: the ring's reflection");
    T.setStage(1); T.step(0.3); assert(T.ringRefl() === 0, "Crow Hollow: no water, no reflection");
    T.setStage(5); T.calm(); T.freezeRing(0, C.RING_Y); throwAndSettle(0, C.RING_Y); assert(T.state().lastResult.make, "and a throw is a throw, as ever");
    T.toTitle(); T.setStats(ZERO);
  });
  test("v58 Every mode that plays a lane travels it (the MapTravelController): the Adventure by its legs, Arcade, Practice and the Director's Challenge by the road, Boss Rush in the arena; an attraction stays put", () => {
    T.setStats({ ...OPENED, bestStage: 9, bossKills: 3 });
    const run = (m, map) => { T.toTitle(); T.startMode(m, map); T.step(1); T.skipReel && T.skipReel(); const D0 = T.travel().D; T.setHits(12); T.step(3); const D1 = T.travel().D; T.setHits(30); T.step(3); return [D0, D1, T.travel().D]; };
    for (const [m, map] of [["story", 0], ["arcade", 2], ["practice", 4], ["director", 0]]) { const D = run(m, map); assert(D[1] > D[0] && D[2] > D[1], `${m}: the world comes on as the makes do (${D})`); }
    const R = run("rush", 0); assert(R[0] > 0 && R[1] === R[0] && R[2] === R[0], `Boss Rush: in the arena, and it stays there (${R})`);
    const G = run("gallery", 0); assert(G.every(d => d === 0), `an attraction: its booth doesn't move (${G})`);
    T.toTitle(); T.setStats(ZERO);
  });
  test("v58 Curl noise: the flow has no sources or sinks (divergence ~0), stays gentle, and moves only atmosphere: a throw on a map full of it is a throw as ever", () => {
    let worst = 0, big = 0; for (let i = 0; i < 40; i++) { const r = T.curlDiv(i * 1.37, i * 0.71 - 5, i * 0.3); worst = Math.max(worst, Math.abs(r.div)); big = Math.max(big, r.mag); }
    assert(worst < 0.05, `divergence-free (worst ${worst.toFixed(4)})`); assert(big > 0.05 && big < 12, `a real flow, not a storm (${big.toFixed(2)})`);
    T.setStats({ ...ZERO, bestStage: 9 }); fresh(); T.setStage(4); T.step(1); T.calm(); T.freezeRing(0, C.RING_Y);
    const k0 = T.aimFor(0, C.RING_Y); T.throwAt(k0.AX, k0.AY); T.step(0.4); const p1 = T.skullInfo(); T.step(2.5); const r1 = T.state().lastResult;
    T.aquaStep(0.5); T.freezeRing(0, C.RING_Y); T.throwAt(k0.AX, k0.AY); T.step(0.4); const p2 = T.skullInfo(); T.step(2.5);
    assert(r1.make && T.state().lastResult.make && JSON.stringify(p1.pos) === JSON.stringify(p2.pos), `the same throw flies the same, whatever the water's doing (${JSON.stringify(p1.pos)} / ${JSON.stringify(p2.pos)})`);
    T.toTitle(); T.setStats(ZERO);
  });
  test("v58 The Drowned Theater is under the sea: no dock and no surface, a sandy aisle between rows of sunken seats (some over, some buried), the stage at the back, and its life", () => {
    T.setStats({ ...ZERO, bestStage: 9 }); fresh(); T.setStage(4); T.step(1); const A = T.aqua();
    assert(A.kind === "submerged" && A.snow > 20 && A.bubbles > 5 && A.far >= 2, `submerged: motes, bubbles, big shapes far off (${JSON.stringify({ k: A.kind, s: A.snow, b: A.bubbles, f: A.far })})`);
    for (const k of ["school", "fish", "crab", "eel", "jelly", "turtle", "octopus", "shrimp"]) assert(A.n[k] > 0, `${k}s live here`);
    assert(T.ringRefl() === 0 && T.scene().lane === "seabed", `no water surface to reflect in, and the floor is the sea bed (${T.scene().lane})`);
    const seats = T.travelSpans().filter(s => s.kind === "theatre-seats"); assert(seats.length > 60 && seats.every(s => s.x1 < -2.4 || s.x0 > 2.4), `rows of seats either side of the aisle, never in it (${seats.length})`);
    const R = T.travelRows(); assert(R.over > 0 && R.buried > 0 && R.over + R.buried < R.n * 0.5, `some over, some buried, most still standing (${JSON.stringify(R)})`);
    assert(!T.powersHere().includes("dive"), "no Diving Skull: there's no surface to dive from");
    const sw = A.list.filter(c => ["school", "fish", "jelly"].includes(c.k)); assert(sw.every(c => !(Math.abs(c.x) < 2.1 + c.z * 0.1 && c.y > 0.5 && c.y < 4.6)), "every swimmer keeps out of the ring's cone");
    assert(T.aquaPoke("school").st === "scatter", "a school scatters when something comes at it");
    assert(T.aquaPoke("crab").hide > 0.5, "a crab digs in"); const e = T.aquaPoke("eel"); assert(e.st === "in", "an eel goes back in its hole");
    T.setStage(5); T.step(1); const M = T.aqua(); assert(M.kind === "surface" && ["frog", "minnows", "snapper", "gator", "strider", "dragonfly", "tadpoles"].every(k => M.n[k] > 0), `the Black Marsh: life under and on the surface (${JSON.stringify(M.n)})`);
    assert(["jump", "under"].includes(T.aquaPoke("frog").st), "a frog goes off its pad and into the water"); assert(T.powersHere().includes("dive"), "and the dive is the marsh's");
    T.setStage(1); T.step(0.5); assert(T.aqua().kind === null, "no water, no aquatic life");
    T.toTitle(); T.setStats(ZERO);
  });
  test("v58 MAP → ECOSYSTEM → CAST: every character belongs to its maps (the gravedigger in the Graveyard and, as a prospector, the desert; zombies in the Graveyard and a rare one in the Hollow; the skeleton drowned, bleached or an echo), and each map has its own wildlife", () => {
    const B = T.blueprint(), M = T.maps(); assert(B.ecosystem && B.ecosystem.identityTest.length === 10, "the Map Identity Test has ten questions");
    const ORDER = ["Fundamentals", "Ricochet", "Wind", "Water", "Unpredictability", "Distance", "Timing", "Mastery"];
    M.forEach((m, i) => { assert(m.ecosystem && m.ecosystem.teaches === ORDER[i], `${m.id} teaches ${ORDER[i]}`); for (const c of m.ecosystem.cast) assert(B.ecosystem.cast[c].includes(m.id), `${c} belongs on ${m.id}`); });
    T.setStats({ ...ZERO, bestStage: 9 }); fresh();
    const at = st => { T.setStage(st); T.step(0.5); return T.cast(); };
    let c = at(1); assert(c.walkers.join() === "zombie" && c.zombie === "intro" && c.flock === "crow" && !T.scene().kinds.includes("digger"), `Crow Hollow: crows, the odd zombie, no gravedigger (${JSON.stringify(c.walkers)})`);
    c = at(2); assert(c.digger === "sexton" && c.walkers.includes("zombie") && c.skeleton === "plain" && c.flock === "crow", "the Gilded Graveyard: the sexton, zombies, skeletons, crows");
    c = at(3); assert(!c.walkers.includes("zombie") && c.flock === null && ["owl", "deer", "fox", "spirit"].every(k => T.wild().n[k] > 0), `the Whistling Woods: owls, deer, a fox, spirits; no crows, no zombies (${JSON.stringify(T.wild().n)})`);
    c = at(4); assert(c.skeleton === "drowned", "the Drowned Theater's skeletons are drowned");
    c = at(6); assert(c.digger === "prospector" && c.skeleton === "bleached" && T.wild().heat && ["vulture", "scorpion", "tumbleweed"].every(k => T.wild().n[k] > 0), "the Bone Desert: a prospector, sun-bleached skeletons, vultures, scorpions, tumbleweeds, the heat");
    c = at(7); assert(!c.walkers.length && ["clockbug", "fungi"].every(k => T.wild().n[k] > 0), "the Clockwork Caves: no zombies or skeletons, clockwork bugs and glowing fungi");
    c = at(8); assert(c.walkers.join() === "skeleton" && c.skeleton === "echo" && ["voidling", "fragment"].every(k => T.wild().n[k] > 0), "the Black Abyss: skeletons only as echoes, void things, fragments of the worlds before");
    const cone = T.wild().list.filter(w => ["spirit", "fragment"].includes(w.k) && Math.abs(w.x) < 2.4 + w.z * 0.14); T.setStage(3); T.step(3); const cone2 = T.wild().list.filter(w => w.k === "spirit" && Math.abs(w.x) < 2.4 + w.z * 0.14);
    assert(!cone.length && !cone2.length, `nothing floats across the ring's cone (${JSON.stringify(cone.concat(cone2))})`);
    T.calm(); T.freezeRing(0, C.RING_Y); throwAndSettle(0, C.RING_Y); assert(T.state().lastResult.make, "and a throw is a throw");
    T.toTitle(); T.setStats(ZERO);
  });
  // ── v57: the land, the band, and six power-ups with physics of their own ──
  test("v57 The land: flat and straight within nine metres (the play never changes); beyond, the road bends and the land rises either side; the water maps stay flat", () => {
    T.setStats(ZERO); fresh(); T.step(0.5);
    for (const z of [0, 3, 6, 7.9]) for (const x of [-4, 0, 4]) { const L = T.land(x, z); assert(L.dx === 0 && L.y === 0, `flat and straight at ${z} m (${JSON.stringify(L)})`); }
    let bent = 0, lift = 0; for (let z = 30; z <= 160; z += 10) { bent = Math.max(bent, Math.abs(T.land(0, z).dx)); lift = Math.max(lift, T.land(20, z).y - T.land(0, z).y); }
    assert(bent > 0.8, `the road bends further on (${bent.toFixed(2)} m)`);
    assert(lift > 0.8, `the land rises away from the road (${lift.toFixed(2)} m)`);
    let lane = 0, side = 0; for (let d = 0; d < 400; d += 7) { lane += Math.abs(T.landRaw(d, 0).h - T.landRaw(d, 0.5).h); side += T.landRaw(d, 22).h - T.landRaw(d, 0).h; }
    assert(side / 58 > 1 && lane / 58 < 0.2, `hills either side, the lane itself level across (${(side / 58).toFixed(2)}, ${(lane / 58).toFixed(3)})`);
    assert(T.land().slices === 23, `drawn in 23 slices (${T.land().slices})`);
    T.setStage(4); T.step(0.5); const W = T.land(15, 60); assert(W.flat && W.y === 0, `the Drowned Theater: the water stays flat (${JSON.stringify(W)})`);
    T.calm(); T.freezeRing(0, C.RING_Y); throwAndSettle(0, C.RING_Y); assert(T.state().lastResult.make, "and a throw is a throw, as ever");
    T.toTitle();
  });
  test("v57 The band: layers in the loop's key come in on a bar line (drive, hats, heart, bass) and a perfect gets a four-note sting", () => {
    const K = T.band().keys; assert(K.A && K.B && K.boss && K.A.tonic >= 0 && ["major", "minor"].includes(K.boss.mode), `every loop knows its key (${JSON.stringify(K)})`);
    T.setStats(ZERO); fresh(); T.step(1); T.bandDry(true); assert(!Object.keys(T.band().want).length, "a fresh run: nothing extra");
    T.setStreak(3); assert(T.band().want.drive && !T.band().want.hats, "three in a row: the drive");
    T.step(3); const lg = T.band().log; assert(lg.length && lg.every(e => e.play.includes("drive") ? e.pos === 0 || e.pos === 8 : true) && lg.some(e => e.play.includes("drive")), `on one and three, from a bar line (${JSON.stringify(lg.slice(0, 3))})`);
    T.setStreak(6); assert(T.band().want.hats, "on fire: the hats too");
    T.setStreak(0); T.setLives(1); assert(T.band().want.heart && !T.band().want.drive, "the last skull: the heartbeat");
    T.setLives(3); T.setHits(C.STAGE_MINI - 5); assert(T.band().want.bass, "the last hits before a boss: the bass leans in");
    fresh(); T.step(1); T.bandDry(true); T.calm(); T.freezeRing(0, C.RING_Y); throwAndSettle(0, C.RING_Y); T.step(3);
    assert(T.state().lastResult.kind === "perfect" && T.band().log.filter(e => e.play.includes("sting")).length === 4, `a perfect: four notes on the eighths (${T.state().lastResult.kind}, ${T.band().log.filter(e => e.play.includes("sting")).length})`);
    T.bandDry(false); T.toTitle();
  });
  test("v57 power-ups: one new a map (the vine in the woods, the dive only where there's water, the flip in the Abyss) and each does what it says", () => {
    const at = st => { T.setStats({ ...ZERO, bestStage: 9 }); fresh(); if (st > 1) T.setStage(st); T.step(0.3); return T.powersHere(); };
    assert(!at(1).some(id => ["vine", "dive", "clones", "rewind", "homing", "flip"].includes(id)), "none on map 1");
    assert(at(3).includes("vine") && !at(3).includes("dive"), "the Whistling Woods: the vine (no water, no dive)");
    assert(!at(4).includes("dive") && at(5).includes("dive") && at(6).includes("rewind") && !at(6).includes("dive") && at(7).includes("homing") && at(8).includes("flip") && at(5).includes("clones"), "the rest a map at a time, the dive where there's a surface to dive from (v58: the marsh; the Drowned Theater is under the sea)");
    const setup = st => { at(st); T.setHits(5); T.step(0.5); T.calm(); T.freezeRing(0, C.RING_Y); };
    setup(8); T.givePower("flip"); T.throwThrough(0, C.RING_Y, C.RING_Z); T.step(0.3); assert(T.skullInfo().g < 0, "Gravity Flip: it falls up"); T.step(2.5); assert(T.state().lastResult.make, `and the aim still meets the ring (${T.state().lastResult.kind})`);
    setup(7); T.throwThrough(0.62, C.RING_Y + 0.3, C.RING_Z); T.step(2.5); assert(!T.state().lastResult.make, "without it, a throw that far off misses");
    setup(7); T.givePower("homing"); T.throwThrough(0.62, C.RING_Y + 0.3, C.RING_Z); T.step(0.6); const homed = T.skullInfo().homed; T.step(2); assert(homed && T.state().lastResult.make, `Homing Bone: it locks on and curves in (${T.state().lastResult.kind})`);
    setup(5); T.givePower("clones"); T.throwThrough(-0.62, C.RING_Y, C.RING_Z); T.step(0.2); assert(T.skullInfo().clones === 2, "Clone Skull: three in the air"); T.step(2.5); assert(T.state().lastResult.make, `the clone through the ring counts (${T.state().lastResult.kind})`);
    setup(6); T.givePower("rewind"); const l0 = T.state().lives, n0 = T.state().throws; T.throwThrough(2.6, C.RING_Y, C.RING_Z); let rw = false; for (let i = 0; i < 80 && !rw; i++) { T.step(0.05); rw = T.skullInfo().rew; } assert(rw, "Rewind Bone: a miss, and the film runs back");
    T.step(1.5); assert(T.state().lives === l0 && T.state().throws === n0 && T.state().state === "ready" && !T.powers().rewind, `and the throw never happened (${T.state().lives}, ${T.state().throws})`);
    setup(3); T.givePower("vine"); T.step(0.2); const E = T.vineEnd(), a = T.aimFor(E.x, E.y, E.z); T.throwAt(a.AX, a.AY); T.step(0.6);
    assert(T.skullInfo().vined, "Vine Swing: caught"); T.step(3); assert(T.state().lastResult.make && T.powers().vine && T.powers().vine.uses === 1, `slung through the ring, one catch left (${T.state().lastResult.kind})`);
    setup(5); T.givePower("dive"); const d = T.aimFor(1.3, 0.14, 3.8); T.throwAt(d.AX, d.AY); let dv = false; for (let i = 0; i < 40 && !dv; i++) { T.step(0.05); const k = T.skullInfo(); dv = !!(k.sub && k.sub.dive); } assert(dv, "Diving Skull: short into the water, it dives");
    T.step(3); assert(T.state().lastResult.make && T.state().lives === 3, `it swims on and leaps through the ring (${T.state().lastResult.kind})`);
    T.toTitle(); T.setStats(ZERO);
  });
  // ── v56: the mini-games rebuilt as the carnival's attractions (07u_attractions.js) ──
  test("v56 Every mini-game is an attraction: its own booth, no ring to cross, the ring hidden; the Adventure keeps its ring", () => {
    T.setStats(OPENED);
    for (const m of ["curtain", "longshot", "gallery", "cans", "pitch", "sudden", "gale", "swing"]) { T.toTitle(); T.startMode(m); const A = T.attr(); assert(A.on && A.kind === m && A.ringHidden, `${m}: an attraction (${A.kind}, ${A.ringHidden})`); }
    T.toTitle(); T.startMode("gallery"); const st = T.attr().props.find(p => p.type === "star"); T.attrThrow(st.x, st.y); T.step(2.5);
    assert(T.state().lastResult.make && Number.isFinite(T.state().score) && T.state().score > 0, `a hit scores on the run's score too (${T.state().score})`);
    T.toTitle(); assert(!T.attr().on, "the title: none"); T.start(); assert(!T.attr().on && !T.attr().ringHidden, "the Adventure: the ring as ever");
    T.setStats(ZERO); T.toTitle();
  });
  test("v56 Perfect Pitch: pockets of 10, 25, 50 and 100; dead centre in the 100 is a Perfect Pitch (double); a rattle off the rim is a miss", () => {
    T.setStats(OPENED); T.startMode("pitch"); const H = T.pitchHoles();
    assert(H.map(h => h.pts).sort((a, b) => a - b).join() === "10,10,10,25,25,50,50,100" && H.find(h => h.pts === 100).r < H.find(h => h.pts === 10).r, "the pockets, smaller for more");
    const h100 = H.find(h => h.pts === 100); T.attrThrow(h100.x, h100.y); T.step(2.5); assert(T.attr().value === 200 && T.attr().perfects === 1, `a Perfect Pitch pays double (${T.attr().value})`);
    const h10 = H.find(h => h.pts === 10); T.attrThrow(h10.x + 0.12, h10.y); T.step(2.5); assert(T.attr().value === 210, `in the 10 (${T.attr().value})`);
    T.attrThrow(h10.x + h10.r + 0.02, h10.y); T.step(2.5); assert(T.state().lastResult.kind === "pocket" && T.attr().value === 210 && T.state().lives === 3, `off the rim: rattled out, free (${T.state().lastResult.kind})`);
    T.setStats(ZERO); T.toTitle();
  });
  test("v56 Gale Force: a still bullseye and a wind that turns every throw and gets up every three hits (breeze, gust, gale…)", () => {
    T.setStats(OPENED); T.startMode("gale"); let A = T.attr();
    assert(A.lvl === 0 && Math.abs(A.wind) >= 0.5 && Math.abs(A.wind) <= 0.9, `a breeze to start (${A.wind})`);
    for (let i = 0; i < 3; i++) { T.attrWindSet(0); T.attrThrow(0, 2.3); T.step(2.5); }
    A = T.attr(); assert(T.state().hits === 3 && A.lvl === 1 && Math.abs(A.wind) >= 1.1, `three hits: a gust (${A.lvl}, ${A.wind})`);
    T.attrWindSet(0); T.attrThrow(1.5, 2.3); T.step(2.5); assert(T.state().lives === 2, "a miss costs a skull");
    T.setStats(ZERO); T.toTitle();
  });
  test("v56 Sudden Death: the dark, one target, one skull; every hit adds something; one miss and it's over", () => {
    T.setStats(OPENED); T.startMode("sudden"); let A = T.attr();
    assert(A.dark && T.state().lives === 1 && A.props.filter(p => !p.kind).length === 1, `in the dark, one skull, one target (${A.dark}, ${T.state().lives})`);
    const hitIt = () => { T.attrProps(T.attr().props.map(p => ({ ...p, w: 0, amp: 0, x0: p.x }))); const p = T.attr().props.find(q => !q.kind && !q.fake); T.attrThrow(p.x, p.y); T.step(2.5); };
    for (let i = 0; i < 4; i++) { const r0 = T.attr().props.find(p => !p.kind).r; hitIt(); if (i === 1) assert(T.attr().props.find(p => !p.kind).r < r0, "two hits: it's smaller"); }
    A = T.attr(); assert(T.state().hits === 4 && A.props.some(p => p.kind === "blade"), `four hits: blades (${T.state().hits})`);
    for (let i = 4; i < 7; i++) hitIt();
    A = T.attr(); assert(A.props.some(p => p.fake) && A.shake > 0, `seven hits: fakes, and the picture shakes (${A.shake})`);
    T.attrProps(T.attr().props.filter(p => !p.kind)); const f = T.attr().props.find(p => p.fake); T.attrThrow(f.x, f.y); T.step(3);
    assert(T.state().state === "over" && T.profile().modes.sudden.best === 7, `a fake is a miss, and that's it (${T.state().state}, ${JSON.stringify(T.profile().modes.sudden)})`);
    T.toTitle(); assert(!T.attr().dark, "the lights back on");
    T.setStats(ZERO); T.toTitle();
  });
  test("v56 Swing Time: a target on a pendulum; hit it where it is when the skull arrives; the middle of it is DEAD CENTER", () => {
    T.setStats(OPENED); T.startMode("swing"); T.step(0.3);
    const a = T.attrSwing(); assert(Math.abs(a.a) <= 0.45, `a gentle swing to start (${a.a})`);
    const P = T.attrSwing(T.attrFlight()); T.attrThrow(P.x, P.y); T.step(2.5);
    assert(T.state().lastResult.make && T.state().hits === 1, `thrown where it will be when the skull gets there: a hit (${T.state().lastResult.kind})`);
    const Q = T.attrSwing(T.attrFlight()); T.attrThrow(Q.x, Q.y); T.step(2.5); assert(T.state().lastResult.kind === "bull" && T.attr().dead >= 1, `through the middle of it on the move: DEAD CENTER (${T.state().lastResult.kind})`);
    T.attrThrow(0, 4.5); T.step(2.5); assert(T.state().lives === 2, "a miss costs a skull");
    T.setStats(ZERO); T.toTitle();
  });
  // ── v54 ──
  test("v54 a ghost's glow fades out inside its drawing (no square edge up close); the act card and a power-up card never overlap", () => {
    assert(T.celEdge("ghost") <= 2, `nothing at the cel's edge (alpha ${T.celEdge("ghost")})`);
    fresh(); T.calm(); T.stageCardNow("Act II", "The Harvest", "a test"); T.powerCardNow("rush");
    const [A, B] = T.popupsNow(); assert(!A.hidden && !B.hidden, "both up");
    assert(Math.abs(A.c - B.c) >= (A.h + B.h) / 2, `stacked, not on top of each other (${JSON.stringify([A, B])})`);
    T.toTitle();
  });
  test("v54 a signature shot's focus: the picture behind softens, nothing goes dark; power-up cards with a gauge that drains", () => {
    fresh(); T.calm(); const f = T.shotFocus(195, 400); assert(f.spot && f.blur, "the blur layer and the ring come up");
    assert(T.filmSpot().dur <= 500, `short (${T.filmSpot().dur} ms)`);
    T.givePower("rush"); T.givePower("ghost"); let P = T.powerCards();
    assert(P.length === 2 && P.every(c => c.gauge && c.w === 100) && P.find(c => c.id === "ghost").uses === "×2", JSON.stringify(P));
    for (let i = 0; i < 3; i++) { T.freezeRing(0, C.RING_Y); throwAndSettle(0, C.RING_Y); }
    P = T.powerCards(); const r = P.find(c => c.id === "rush"); assert(r && r.w === 25 && r.low && r.crit, `Skull Rush's last throw: a quarter left, pulsing (${JSON.stringify(r)})`);
    T.toTitle();
  });
  test("v54 the Raven King's caw: a squeeze, a snap open, a hold, a close that overshoots shut", () => {
    const J = T.crowJaw; assert(J(0.06) < 0 && J(0.5) > 0.9 && J(0.93) < 0 && J(0) === 0 && J(1) === 0, [0.06, 0.5, 0.93].map(J).join());
  });
  test("v54 the lair on the horizon reveals itself: small and dark far off, colour, then the crown, full size only close", () => {
    const L = T.landmark; assert(T.hasReveal("king-lair"), "the Pumpkin King's crown is its own part");
    assert(L(150).scale < 0.35 && L(150).sil === 1 && L(150).rev === 0, `far: small, a silhouette, no crown (${JSON.stringify(L(150))})`);
    assert(L(90).sil > 0 && L(90).sil < 1 && L(65).rev > 0 && L(65).rev < 1 && L(40).scale === 1 && L(40).sil === 0 && L(40).rev === 1, "then colour, then the crown, then the thing itself");
    fresh(); const V = T.travel(), spans = T.travelSpans();
    assert(V.props > 400, `the land is full (${V.props} pieces)`);
    const lairD = V.lair + V.D; assert(lairD > 100, "the lair is far down the track");
    const inFront = spans.filter(q => q.d > lairD - 32 && q.d < lairD + 8 && q.x1 > -6 && q.x0 < 6 && !q.lm);
    assert(!inFront.length, `nothing stands in front of the lair (${JSON.stringify(inFront.slice(0, 3))})`);
    T.toTitle();
  });
  test("v54 the scenery moves to the music: a clock on the beat, hops on alternate beats, beat maps for all six loops", () => {
    const B = T.musicBeats(); assert(Object.keys(B).length === 6 && Object.values(B).every(b => b.n > 150 && b.bpm > 80 && b.bpm < 140), JSON.stringify(B));
    fresh(); T.calm(); const c0 = T.musicClock(); T.step(60 / 104 * 4); const c1 = T.musicClock();
    assert(Math.abs(c1.beat - c0.beat - 4) < 0.05 && c1.bar === c0.bar + 1, `a bar of the free clock is four beats (${c0.beat.toFixed(2)} → ${c1.beat.toFixed(2)})`);
    let hopsA = 0, hopsB = 0; for (let i = 0; i < 96; i++) { T.step(60 / 104 / 12); const g0 = T.groove(0.2), g1 = T.groove(0.8); if (g0.hop) hopsA++; if (g1.hop) hopsB++; }
    assert(hopsA > 4 && hopsB > 4 && hopsA < 60 && hopsB < 60, `each half hops, not all the time (${hopsA}, ${hopsB})`);
    T.toTitle();
  });
  test("v54 the gravedigger digs to the bar: a contact, a throw of earth that flies and lands, and not every dig the same", () => {
    fresh(); T.setStage(2); T.calm(); const kinds = new Set(); let thrown = 0, maxDirt = 0;   // (v58: in the Gilded Graveyard, where he belongs)
    for (let i = 0; i < 16 * 24; i++) { T.step(60 / 104 / 6); const d = T.diggerState(); if (!d) continue; kinds.add(d.kind); maxDirt = Math.max(maxDirt, d.dirt); if (d.dirt) thrown++; }
    assert(maxDirt >= 4 && thrown > 10, `earth in the air (${maxDirt})`);
    assert(kinds.size >= 3 && kinds.has("rest"), `a few kinds of dig, and a rest (${[...kinds]})`);
    T.toTitle();
  });
  test("v54 portals: the end boss goes down, the stage empties, a portal opens; a miss costs nothing, a make goes through the rift to the next map", () => {
    T.setStats(ZERO); T.portalsOn(true); fresh(); T.calm();
    toHit(C.STAGE_MINI); T.step(2.6); T.hurtBoss(99); T.endThrow(); for (let i = 0; i < 200 && (T.boss() || T.state().state !== "ready"); i++) T.step(0.1);
    T.calm(); T.setHits(C.STAGE_BOSS - 1); T.freezeRing(0, C.RING_Y); T.throwAt(0, C.RING_Y); for (let i = 0; i < 200 && !(T.boss() && T.boss().kind === "pumpkin" && T.state().state === "ready"); i++) T.step(0.1); T.unfreezeRing();
    T.hurtBoss(99); T.endThrow(); T.step(0.3); assert(T.portal().hidden && !T.targets().length, "the ring and the targets go at once");
    for (let i = 0; i < 300 && T.portal().phase !== "open"; i++) { T.step(0.05); const sk = $("bonusSkip"); if (sk && sk.offsetParent) sk.click(); }
    assert(T.portal().phase === "open" && T.state().state === "ready", `a portal, and the launcher back (${JSON.stringify(T.portal())})`);
    const lives = T.state().lives; T.throwAt(2.4, 4.6); T.step(3); assert(T.state().lives === lives && T.portal().phase === "open", "a miss: nothing lost, try again");
    T.throwAt(0, T.portal().y); for (let i = 0; i < 60 && T.portal().phase === "open"; i++) T.step(0.05);
    assert(T.portal().phase === "rift" && T.state().state === "cine", "through: the rift");
    T.step(3.5); assert(T.state().stage === 2 && T.state().state === "ready" && !T.portal().phase, `and out on the next map (${JSON.stringify(T.portal())}, stage ${T.state().stage})`);
    T.portalsOn(false); T.toTitle();
  });
  test("v54 power-ups: the seven from the start, one new a map, a rule-breaker in Adventure+; Lucky, Ricochet, Time, Combo and synergies work", () => {
    fresh(); assert(T.powersHere().length === 7, `map 1: the seven (${T.powersHere()})`);
    T.setStage(4); assert(["lucky", "ricochet", "heavy"].every(id => T.powersHere().includes(id)) && !T.powersHere().includes("time") && !T.powersHere().includes("chaos"), `map 4 (${T.powersHere()})`);
    fresh(); T.calm(); T.givePower("ricochet"); const lives = T.state().lives; T.freezeRing(0, C.RING_Y);
    throwAndSettle(C.RC_START + C.RING_TUBE, C.RING_Y); assert(T.state().lives === lives && !T.powers().ricochet, `a clank off the rim, bounced for free (${T.state().lastResult.kind})`);
    fresh(); T.calm(); const w0 = T.state().ring.omega; T.givePower("time"); T.step(3); assert(T.state().ring.omega < w0 * 0.6, `Time Bone: the ring at half speed (${w0.toFixed(2)} → ${T.state().ring.omega.toFixed(2)})`);
    fresh(); T.calm(); T.setStreak(4); T.freezeRing(0, C.RING_Y); let s0 = T.state().score; throwAndSettle(0, C.RING_Y); const plain = T.state().score - s0;
    fresh(); T.calm(); T.setStreak(4); T.givePower("combo"); T.freezeRing(0, C.RING_Y); s0 = T.state().score; throwAndSettle(0, C.RING_Y); const combo = T.state().score - s0;
    assert(combo >= plain * 1.9, `Combo Bone: the fifth in a row pays double (${plain} → ${combo})`);
    fresh(); T.calm(); T.givePower("time"); T.givePower("combo"); assert(T.synergy() && T.synergy()[2] === "slowburn", "Time Bone and Combo Bone: Slow Burn");
    T.toTitle();
  });
  test("v52 knockout timing: a short hold (shorter on a mini), one white flash, one colour pulse, then the defeat", () => {
    T.setStats(ZERO); fresh(); toHit(C.STAGE_MINI); T.step(2.6); T.hurtBoss(99);
    assert(Math.abs(T.freezeLeft() - 3.5 / 24) < 0.01, `a mini holds 3½ drawings (${T.freezeLeft()})`);
    assert(T.deathFX().pulses === 1, "one pulse of its colour, not a string of blinks");
    T.endThrow(); T.step(3.2); toHit(C.STAGE_BOSS); T.step(2.9); T.hurtBoss(99);
    assert(Math.abs(T.freezeLeft() - 5 / 24) < 0.01, `an end boss holds 5 drawings (${T.freezeLeft()})`);
    assert(T.deathFX().pulses === 1 && $("flash").dataset.last !== undefined, "one pulse on an end boss too");
    T.step(1.6); assert(T.gags().length, "the gag's down"); T.toTitle(); assert(!T.gags().length && !T.deathFX().flash, "leaving mid-knockout takes the gag and the pulse with it");
    T.toTitle(); T.setStats(ZERO);
  });
  test("v51 Adventure+: opens after the Adventure; a smaller, quicker ring, decoys from map 3, a crosswind from map 2, and a cracked skull costs two", () => {
    T.setStats(ZERO); T.toTitle(); assert(!T.plus().open, "shut until the Adventure's finished");
    T.openSheet("play"); assert($("plusCard").classList.contains("locked"), "its card says so"); T.closeSheet();
    T.start(); T.calm(); T.setHits(5); T.step(0.2); const normal = T.plus();
    T.setStats({ ...ZERO, storyClears: 1 }); T.startPlus(); T.calm(); T.setHits(5); T.step(0.2); const P = T.plus();
    assert(P.on && P.open && P.k === 1.25 && P.rc < normal.rc && P.omega > normal.omega, `harder on map 1 (${JSON.stringify(P)} vs ${JSON.stringify(normal)})`);
    T.setStage(3); T.startPlus(); T.setStage(3); assert(T.plus().k > 1.4, "harder on later maps");
    T.setStats({ ...ZERO, storyClears: 1 }); T.startPlus(); T.setStage(2); T.freezeRing(0, C.RING_Y); throwAndSettle(0, C.RING_Y); assert(T.plus().wind !== 0, `a crosswind from map 2 (${T.plus().wind})`);
    T.toTitle(); T.setStats(ZERO);
  });
  test("v50 Vault: 21 shelves in three rows of seven (masks among them); a slot is picked and worn, only Save look saves", () => {
    T.setStats({ ...ZERO, unlocked: ["mask:paperbag"] }); T.toTitle(); T.openSheet("customize");
    const tabs = [...document.querySelectorAll("#catTabs [data-cat]")]; assert(tabs.length === 21 && getComputedStyle($("catTabs")).gridTemplateColumns.split(" ").length === 7, `21 shelves, seven across (${tabs.length})`);
    T.shopCat("mask"); assert(document.querySelectorAll("#shopGrid .item").length >= 7, "the mask shelf");
    $("shopGrid").querySelector('[data-id="paperbag"]').click(); $("cardAct").click(); assert(T.cosmetics().mask === "paperbag", "a paper bag over his head");
    const before = JSON.stringify(T.cosmetics().outfits); document.querySelectorAll("#outfitSlots .slot")[2].click();
    assert(JSON.stringify(T.cosmetics().outfits) === before, "picking an empty slot saves nothing");
    $("outfitSave").click(); assert(T.cosmetics().outfits[2] && T.cosmetics().outfits[2].mask === "paperbag", "Save look saves into the picked slot");
    const how = document.querySelector("#shopGrid .item .how i"); assert(!how || getComputedStyle(how).borderTopWidth === "0px", "how it's had is plain text");
    T.closeSheet(); T.setStats(ZERO);
  });
  test("v50 Cart and mini-games and mastery: four Cart shelves of seven; eight mini-games; five mastery parts with a Diamond tier", () => {
    T.setStats(ZERO); T.toTitle(); T.openSheet("store");
    const shelves = [...document.querySelectorAll("#exclGrid .grid")].map(g => g.querySelectorAll(".item, button").length);
    assert(shelves.length === 4 && shelves.every(n => n === shelves[0]), `balanced shelves (${shelves})`);
    assert(document.querySelector("#sheet-store .sheet-head .bones"), "the bones beside the Souls"); T.closeSheet();
    T.openSheet("play"); document.querySelector("[data-open=minis]").click(); assert(document.querySelectorAll("#miniModes [data-mode]").length === 8, "eight mini-games"); T.closeSheet();
    T.openSheet("mastery"); assert(document.querySelectorAll("#masteryTabs [data-cat]").length === 5, "five parts");
    assert(document.querySelectorAll("#masteryList .m-row")[0].querySelectorAll(".m-tier").length === 8 && document.querySelector(".m-tier.diamond:last-child"), "v55: eight tiers, Diamond last"); T.closeSheet();
  });
  test("v50 Challenges: a fourth tab drops down Seasonal and Events; the set bonus sits clear of the dotted line", () => {
    T.setStats(ZERO); T.toTitle(); T.openSheet("challenges");
    $("chalMoreBtn").click(); assert(!$("chalMenu").hidden, "the drop-down opens");
    T.seasonAt("2026-09-01"); T.setFlags({}); document.querySelector('#chalMenu [data-per="seasonal"]').click(); assert($("chalMenu").hidden && /Seasonal/.test($("chalMoreLbl").textContent) && document.querySelectorAll("#chalList .chal-soon").length === 1 && /coming soon/i.test($("chalList").textContent), "v55: out of season, just coming soon");
    T.seasonAt("2026-10-15"); T.closeSheet(); T.openSheet("challenges"); assert(document.querySelectorAll("#chalList .chal:not(.chal-soon)").length === 3, "in Season One: three seasonal challenges");
    $("chalMoreBtn").click(); document.querySelector('#chalMenu [data-per="event"]').click(); assert(/Events/.test($("chalMoreLbl").textContent) && document.querySelectorAll("#chalList .chal-soon").length === 1, "no event on: coming soon");
    T.setFlags({ "event.banner": "Test Week" }); T.closeSheet(); T.openSheet("challenges"); assert(document.querySelectorAll("#chalList .chal:not(.chal-soon)").length === 3, "an event on: three for it");
    T.setFlags({}); T.seasonAt(null);
    const line = $("chalTabs").getBoundingClientRect().bottom, set = $("chalSet").getBoundingClientRect().top; assert(set >= line, `the set bonus clears the line (${set} ≥ ${line})`);
    T.closeSheet();
  });
  test("v50 Profile: name beside the picture with a pencil; stats in See all stats; five runs; fragments beside Morty's bones; level chips in 2 rows of 3", () => {
    T.setStats({ ...ZERO, name: "Mort", bio: "Hi", history: Array.from({ length: 8 }, (_, i) => ({ score: 100 * i, mode: "story", stage: 1, hits: 3, xp: 5, at: Date.now() })) }); T.toTitle(); T.openSheet("profile");
    assert($("profNameShow").textContent === "Mort" && $("profBioShow").textContent === "Hi" && $("profEditBox").hidden, "name and bio shown, editor shut");
    $("profEdit").click(); assert(!$("profEditBox").hidden && $("picGrid").children.length === 8, "the pencil opens the editor with the eight pictures");
    assert(!$("allStats").open && $("allStats").contains($("stats")), "the stats fold into See all stats");
    assert(document.querySelectorAll("#history .runs li").length === 5, "the last five runs");
    assert(/0\/8/.test($("profFragN").textContent), "the fragments count");
    const chips = $("careerCard").querySelector(".chips"); assert(getComputedStyle(chips).gridTemplateColumns.split(" ").length === 3 && chips.children.length === 6, "2 rows of 3");
    assert(!document.querySelector("#sheet-profile .google-btn"), "no sign-in on the profile (v53: it's in Settings)"); T.closeSheet(); T.setStats(ZERO);
  });
  test("v50 Leaderboard: one row of tabs with a Daily/Weekly/Monthly drop-down; ten rows, and See more opens a hundred", () => {
    T.boardLocal(Array.from({ length: 10 }, (_, i) => ({ name: "M" + i, score: 100 + i, hits: 1, stage: 1, at: Date.now() })));
    T.toTitle(); T.openSheet("board"); $("boardTabs").querySelector('[data-tab="local"]').click();
    const tabs = $("boardTabs").getBoundingClientRect(); assert(tabs.height < 60, `one row (${tabs.height})`);
    $("boardPerBtn").click(); assert(!$("boardPerMenu").hidden && $("boardPerMenu").querySelectorAll("[data-per]").length === 3, "the drop-down: daily, weekly, monthly");
    document.querySelector('#boardPerMenu [data-per="month"]').click(); assert(/Monthly/.test($("boardPerLbl").textContent), "Monthly picked");
    T.closeSheet(); T.unfakeBoard();
  });
  test("v50 Achievements are cards, two across", () => {
    T.setStats(ZERO); T.toTitle(); T.openSheet("achievements");
    const g = document.querySelector("#achList .ach-grid"); assert(g && getComputedStyle(g).display === "grid" && getComputedStyle(g).gridTemplateColumns.split(" ").length >= 2, "a grid of cards"); T.closeSheet();
  });
  test("v49 Vault: a Closet holds Surprise me (first), four outfits, Save look and the shelves; the pedestal says Preview; no Wizard Mort", () => {
    T.setStats(ZERO); T.toTitle(); T.openSheet("customize");
    const closet = $("closet"); assert(closet.tagName === "DETAILS" && /Closet/.test(closet.querySelector("summary").textContent) && !closet.open, "a Closet drop-down, folded");
    for (const id of ["surpriseBtn", "outfitSlots", "outfitSave", "catTabs"]) assert(closet.contains($(id)), `${id} is in the Closet`);
    assert($("outfits").firstElementChild.id === "surpriseBtn", "Surprise me on the left");
    assert(document.querySelectorAll("#outfitSlots .slot").length === 4 && T.cosmetics().outfits.length === 4, "four outfit slots");
    assert($("previewTag").textContent === "Preview", $("previewTag").textContent);
    closet.open = true; document.querySelector('#catTabs [data-cat="hat"]').click(); assert(!closet.open && $("closetNow").textContent === "Hats", "picking a shelf folds it away, and it names the shelf");
    T.closeSheet();
  });
  test("v49 Cart and Souls: the coffin opens for bones too; 200 welcome Souls; a countdown to the daily handful; the pack tiers; Back from the Soul Shop is the Cart", async () => {
    T.setStats({ ...ZERO, bones: 5000 }); T.toTitle(); T.welcome(true); await T.fakeServer("welcome1"); for (let i = 0; i < 5; i++) await new Promise(r => setTimeout(r, 0));
    assert(T.wallet().souls === 200 && T.wallet().welcomed, `200 Souls to start (${JSON.stringify(T.wallet())})`);
    const again = await T.callServer("claimWelcomeSouls", {}).then(() => "paid", e => e.code); assert(again === "already-exists", `once per account (${again})`);
    T.welcome(false);
    T.openSheet("store"); const b0 = T.bones(), u0 = T.profile().unlocked.length; $("coffinBones").click();
    assert(T.bones() === b0 - T.coffinBones() && T.profile().unlocked.length === u0 + 1, `the coffin, for ${T.coffinBones()} bones`);
    T.step(0.1); $("coffinKeep").hidden = false; $("coffinKeep").click();
    document.querySelector('#sheet-store [data-sheet="souls"]').click(); assert(!$("sheet-souls").hidden, "the Soul Shop");
    assert(/\d/.test($("soulsNext").textContent), `a countdown (${$("soulsNext").textContent})`);
    const packs = [...document.querySelectorAll("#soulsPacks .pack")].map(b => b.dataset.product); assert(packs.join() === "souls.100,souls.500,souls.1100,souls.2300,souls.6000,souls.13000", packs.join());
    assert(/\$99\.99/.test(document.querySelector('#soulsPacks [data-product="souls.13000"]').textContent), "the whale anchor's list price");
    document.querySelector("#sheet-souls [data-back]").click(); assert(!$("sheet-store").hidden && $("sheet-souls").hidden, "Back goes to the Curio Cart, not the title");
    document.querySelector("#sheet-store [data-back]").click(); assert($("sheet-store").hidden, "and Back again closes it");
    T.noServer(); T.setStats(ZERO);
  });
  test("v49 results: the headstone's four small buttons in one row, and the whole screen without scrolling", () => {
    T.setStats(ZERO); fresh(); T.freezeRing(0, C.RING_Y); throwAndSettle(0, C.RING_Y); T.endRun(); T.step(2);
    const row = document.querySelector("#over .res-row"); assert(row && row.querySelectorAll(".chip-btn").length === 4, "one row of four");
    const tops = new Set([...row.querySelectorAll(".chip-btn")].map(b => Math.round(b.getBoundingClientRect().top))); assert(tops.size === 1, "side by side");
    T.fitResults(); const scr = $("over"); assert(scr.scrollHeight <= scr.clientHeight + 1, `no scrolling (${scr.scrollHeight} / ${scr.clientHeight})`);
    T.toTitle();
  });
  test("v49 GPU fire: the burning ring, a torch and the Cursed skull's green flames are the GPU's when it's on; the KABOOM's cloud is its smoke", () => {
    T.setSetting("gpu", "full"); fresh(); T.calm(); T.gpuFrame(1 / 60); const G = T.gpu();
    if (G.supported) {
      T.setStreak(10); const f0 = T.gpu().flames || 0; for (let i = 0; i < 20; i++) { T.step(1 / 30); T.gpuFrame(1 / 30); }
      assert((T.gpu().flames || 0) > f0 + 40, `the ring's fire is flames on the GPU (${T.gpu().flames})`);
      T.setStreak(0); T.step(0.5); const f1 = T.gpu().flames || 0; T.givePower("blast"); T.freezeRing(0, C.RING_Y); T.throwAt(0, C.RING_Y); T.step(1.3); T.gpuFrame(1 / 60);
      assert((T.gpu().flames || 0) > f1 + 20, `the KABOOM's smoke (${T.gpu().flames})`);
    } else assert(!G.on, "no WebGL here: the 2D fire stays");
    T.setSetting("gpu", "off"); T.gpuFrame(1 / 60); T.toTitle();
  });
  // ── v48: travel on every map, Morty's body section by section, and the Challenge Stage between maps ──
  test("v48 travel: all eight maps travel, each toward its own end boss's lair, and none of it ever stands in the lane", () => {
    const half = 2.4;
    for (let n = 1; n <= 8; n++) {
      fresh(); T.setStage(n); T.snapTravel(); const V = T.travel(), far = T.travelEnd();
      assert(V.on && V.D === 0 && V.props > 60 && V.near > 10, `map ${n} travels, from its start (${JSON.stringify(V)})`);
      assert(V.lair > far + 20 && V.table[3] > V.table[1] && V.table[6] === V.table[5], `map ${n}: a lair far ahead, a road that runs on, still through the end boss (${JSON.stringify(V.table)} lair ${V.lair})`);
      const bad = T.travelSpans().filter(s => s.x1 > -half && s.x0 < half && s.d - far < 16);
      assert(!bad.length, `map ${n}: no scenery in the throw corridor (${JSON.stringify(bad.slice(0, 3))})`);
      T.setHits(25); T.snapTravel(); assert(T.travel().D === T.travelAt(25) && T.travel().shown > 5, `map ${n}: the world comes from the hits (${JSON.stringify(T.travel())})`);
    }
    T.toTitle();
  });
  test("v48 body: each of the first seven end bosses gives back a section of Morty; it flies home and snaps on, stays his, and the Profile shows it", () => {
    const B = T.body(); assert(B.sections.length === 7 && [1, 2, 3, 4, 5, 6, 7].map(B.of).join() === B.sections.join() && B.of(8) === null, `seven sections, one a map, none from the last (${[1, 2, 3, 4, 5, 6, 7, 8].map(B.of)})`);
    T.setStats({ ...ZERO, body: [] }); T.bodyShow(true); beatCrow(1); toHit(C.STAGE_BOSS); T.step(2.9);
    T.hurtBoss(99); T.endThrow(); T.step(3.2); let b = T.body();
    assert(b.cine === "body" && b.show === "leftArm" && b.have.includes("leftArm") && b.run.includes("leftArm"), `the Pumpkin King gives back his Left Arm (${JSON.stringify(b)})`);
    assert(/Left Arm/.test($("stagecard").textContent), "and the card says so");
    T.step(2.8); b = T.body(); assert(b.cine === "reward" && !b.show, `then the shard (${JSON.stringify(b)})`);
    T.step(3); assert(T.state().stage === 2, "then map 2");
    assert(T.cleanBody(["spine", "leftArm", "tail", 7, "leftArm"]).join() === "leftArm,spine", "a save keeps only real sections, once each");
    assert(T.mergeBody(["leftArm"], ["ribs"]).join() === "leftArm,ribs", "and two saves merge to what both have");
    assert(T.drawBodyTo(["leftArm", "ribs"]) > 2000, "his bones draw");
    T.openSheet("profile"); assert(/1 of 7/.test($("profBodyN").textContent), `the Profile shows his bones (${$("profBodyN").textContent})`); T.closeSheet();
    T.bodyShow(false); T.toTitle(); T.setStats(ZERO);
  });
  test("v48 Challenge Stage: after an end boss, ten throws on the road into the next map; rings pay bones, gold ones more, misses are free, and it arrives at the map's start", () => {
    T.setStats(ZERO); T.crossings(true); beatCrow(1); toHit(C.STAGE_BOSS); T.step(2.9);
    T.hurtBoss(99); T.endThrow(); T.step(7.5); let X = T.crossing(), s = T.state();
    assert(X.on && s.stage === 1 && X.map === 2 && X.n === 0 && X.frozen && s.state === "ready", `the crossing, dressed as map 2 (${JSON.stringify(X)}, stage ${s.stage}, ${s.state})`);
    assert(Math.abs(X.goal + 66) < 0.5 && X.rc < C.RC_START + 0.07, `the road starts ten steps before the map (${X.goal})`);
    const lives = s.lives, bones = T.bones(), p0 = X.frozen;
    T.freezeRing(0, C.RING_Y); throwAndSettle(0, C.RING_Y); X = T.crossing();
    assert(X.n === 1 && X.makes === 1 && T.bones() >= bones + 5 && Math.abs(X.goal + 59.4) < 0.5, `a ring: bones and a step along the road (${JSON.stringify(X)})`);
    assert(X.frozen && (X.frozen.x !== p0.x || X.frozen.y !== p0.y), "and the next ring waits somewhere new");
    T.freezeRing(0, C.RING_Y); throwAndSettle(3, C.RING_Y); X = T.crossing(); assert(X.n === 2 && X.makes === 1 && T.state().lives === lives && T.state().state === "ready", `a miss is free: a step on, no skull lost (${JSON.stringify(X)} ${T.state().state} ${T.state().lives}/${lives})`);
    for (let i = 2; i < 10; i++) { const g = T.crossing().gold, b0 = T.bones(); T.freezeRing(0, C.RING_Y); assert(T.state().state === "ready", `throw ${i + 1}: ${T.state().state} ${JSON.stringify(T.crossing())}`); throwAndSettle(0, C.RING_Y); if (g) assert(T.bones() >= b0 + 20, "a gold ring pays more"); }
    X = T.crossing(); assert(X.n === 10 && X.makes === 9 && Math.abs(X.goal) < 0.01, `ten throws, and the road arrives (${JSON.stringify(X)})`);
    T.step(3); s = T.state(); assert(s.stage === 2 && s.phase === "A" && s.stageHits === 0 && !T.crossing().on && T.profile().crossings === 1 && !T.profile().cleanCrossings, `then map 2 itself (${JSON.stringify(s).slice(0, 160)})`);
    T.crossings(false); T.toTitle(); T.setStats(ZERO);
  });
  test("v51 save corruption: any garbage in comes out a sound profile; broken save codes are refused", () => {
    const bad = [{}, null, [], "garbage", 42, { bones: NaN, bestScore: Infinity, makes: -5, name: "x".repeat(400), unlocked: ["skull:bone", "skull:bone", "nope:nope", 7, null], seen: "no", bio: { a: 1 } },
      { bones: 1e300, xp: "9999", achievements: [1, 2, 3], history: "x", fragments: [{}], mastery: null, modes: [], pic: { face: "<script>", frame: 9 }, name: "Mört 💀 \u0000\u202e" }];
    for (const b of bad) {
      const P = T.cleanProfile(b); assert(P && typeof P === "object", `a profile from ${JSON.stringify(b)}`);
      for (const k of ["bones", "bestScore", "makes", "xp"]) assert(Number.isFinite(P[k]) && P[k] >= 0, `${k} is a sane number (${P[k]})`);
      assert(Array.isArray(P.unlocked) && new Set(P.unlocked).size === P.unlocked.length && P.unlocked.every(k => typeof k === "string"), "unlocked: strings, once each");
      assert(typeof P.name === "string" && P.name.length <= 16 && !/[\u0000-\u001f\u202e]/.test(P.name), `a short, clean name (${JSON.stringify(P.name)})`);
      assert(Array.isArray(P.history) && Array.isArray(P.fragments) && typeof P.modes === "object" && !Array.isArray(P.modes), "the lists and maps are the right shape");
    }
    for (const code of ["", "SKULL1.", "SKULL1.!!!!", "SKULL0.abc", "garbage", "SKULL1." + btoa("{not json")]) assert(!T.importCode(code), `refused: ${code.slice(0, 20)}`);
  });
  test("v51 the run's state machine: nothing so far has moved it a way it doesn't know", () => {
    const W = window.SkullToss.debug.warnings().filter(w => w.cat === "STATE"); assert(!W.length, W.map(w => w.msg).join(" | "));
  });
  test("v47 GPU layer: sparks, light and glow on a WebGL canvas screen-blended over the game; Off hides it, and with no WebGL the game plays on", () => {
    T.setSetting("gpu", "full"); fresh(); T.calm(); T.gpuFrame(1 / 60); let G = T.gpu();
    if (G.supported) {
      assert(G.on && !G.hidden && G.blend === "screen", `on, over the picture, screen-blended (${JSON.stringify(G)})`);
      const e0 = G.emitted; T.freezeRing(0, C.RING_Y); T.throwAt(0, C.RING_Y); T.step(1.1); T.gpuFrame(1 / 60); G = T.gpu();
      assert(G.emitted >= e0 + 30 && G.alive >= 30 && G.flashes >= 1, `a perfect throws sparks and a flash of light (${JSON.stringify(G)})`);
      const r = T.ringScreen(0, C.RING_Y, C.RING_Z), px = T.gpuPixel(r.x, r.y); assert(px && px[0] + px[1] + px[2] > 30, `there's light at the ring (${px})`);
      T.step(2); T.setStreak(8); const e1 = T.gpu().emitted; for (let i = 0; i < 20; i++) { T.step(1 / 30); T.gpuFrame(1 / 30); } assert(T.gpu().emitted > e1 + 5, "a burning ring throws embers");
      const b0 = T.gpu().bloom; T.setSetting("gpu", "lite"); for (let i = 0; i < 4; i++) T.gpuFrame(1 / 60); assert(T.gpu().bloom === 0 && T.gpu().on, "Lite: no glow pass, still the sparks and the light"); void b0;
    } else assert(G.hidden && !G.on, "no WebGL here: the layer stays hidden");
    T.setSetting("gpu", "off"); T.gpuFrame(1 / 60); G = T.gpu(); assert(!G.on && G.hidden, "Off: the painted picture only");
    T.gpuFake(false); T.setSetting("gpu", "full"); T.gpuFrame(1 / 60); assert(!T.gpu().on && T.gpu().hidden, "no WebGL: it never switches on");
    T.freezeRing(0, C.RING_Y); assert(throwAndSettle(0, C.RING_Y).lastResult.make, "and the game plays on as it always did");
    T.openSheet("settings"); assert(/can't draw them/.test($("gpuNote").textContent) && document.querySelector('#set-gpu [data-v="full"]').disabled, "Settings says why"); T.closeSheet();
    T.gpuFake(true); T.setSetting("gpu", "off"); T.toTitle();
  });

  (async () => {
    for (const q of queue) {
      if (q.step) { q.fn(); continue; }
      try { await q.fn(); results.push({ name: q.name, pass: true }); }
      catch (e) { results.push({ name: q.name, pass: false, error: e.message }); }
    }
    T.sandbox(false); T.start(); T.pause(false);  // leave the game playable, player's saved data untouched
    window.__skullTossResults = results;
    const passed = results.filter(r => r.pass).length;
    console.table(results);
    const panel = document.createElement("pre");
    panel.style.cssText = "position:fixed;left:12px;right:12px;bottom:12px;z-index:9;max-height:55vh;overflow:auto;margin:0;padding:12px 14px;background:rgba(7,8,11,.92);color:#EDE6D6;font:12px/1.5 ui-monospace,Menlo,monospace;border:1px solid rgba(237,230,214,.2);border-radius:6px;white-space:pre-wrap";
    panel.textContent = `SKULL TOSS SPEC — ${passed}/${results.length} passed\n\n` +
      results.map(r => `${r.pass ? "✓" : "✗"} ${r.name}${r.pass ? "" : "\n    " + r.error}`).join("\n");
    document.body.appendChild(panel);
  })();
})();
