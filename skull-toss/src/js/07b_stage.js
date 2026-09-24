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
  // tint: each stage's colour grade (a soft wash over the graveyard, so the maps read as different places);
  // blurb: how its ring behaves, for the Arcade map list
  const STAGES = [
    { name: "Moonshine Cemetery",  speed: 1.0,  tri: { a: 1.25, up: 0.8, near: 1.2, far: 1.3, skew: 0 },    seqs: [[0, 1, 2], [0, 2, 1]],                   mods: [],
      tint: null, blurb: "The gentlest ring: it slides side to side, then flies a small triangle" },
    { name: "The Crooked Crypts",  speed: 1.08, tri: { a: 1.35, up: 0.85, near: 1.3, far: 1.4, skew: 0.2 },  seqs: [[0, 1, 2], [0, 2, 1], [0, 1, 2, 1]],      mods: ["bob"],
      tint: "#6C4F9E", blurb: "A quicker ring that bobs as it slides, and a lopsided triangle" },
    { name: "Pumpkin Patch Hollow", speed: 1.15, tri: { a: 1.45, up: 0.9, near: 1.35, far: 1.5, skew: -0.25 }, seqs: [[0, 2, 1], [0, 1, 2, 1], [1, 0, 2, 0]],  mods: ["bob", "shrink"],
      tint: "#D2782C", blurb: "Bobbing and smaller, over a wider triangle" },
    { name: "The Bone Orchard",    speed: 1.22, tri: { a: 1.55, up: 1.0, near: 1.45, far: 1.6, skew: 0.35 }, seqs: [[0, 1, 2, 1], [0, 2, 0, 1, 2, 1], [2, 1, 0]], mods: ["bob", "shrink"],
      tint: "#5E8C45", blurb: "The fastest, smallest ring, on the widest triangle of all" }
  ];
  function stageDef(n = game.stage || 1) {   // past the last one, the list loops and keeps getting faster
    const i = (n - 1) % STAGES.length, loops = Math.floor((n - 1) / STAGES.length), S = STAGES[i];
    return { ...S, speed: S.speed + loops * 0.3, n };
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
    if (ring.mode === "tri") {
      const seq = ring.tri.seq, n = seq.length, i = Math.floor(p), f = smooth(p - i), V = triVerts();
      const A = V[seq[((i % n) + n) % n]], B = V[seq[(((i + 1) % n) + n) % n]];
      return { x: A.x + (B.x - A.x) * f, y: A.y + (B.y - A.y) * f, z: A.z + (B.z - A.z) * f };
    }
    return { x: ring.amp * Math.sin(p), y: RING_Y + ring.bob * Math.sin(p * 1.7), z: RING_Z };
  }
  const ringFlat = () => !!ring.frozen || ring.mode === "line" || (ring.mode === "boss" && !!boss && !!boss.flat);
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
    const st = game.stage || 1, S = stageDef(st), h = game.stageHits || 0, cursed = powerOn("cursed") ? 1.5 : 1;
    if (game.state === "title") { const L = level(0); return { mode: "line", ...L }; }
    if (ring.mode === "tri") {
      const L = level(16 + (h - STAGE_MINI) * 0.25 + (st - 1) * 4);
      return { rc: L.rc - (hasMod("shrink") ? 0.05 : 0), omega: cursed * S.speed * arcadeRamp() / Math.max(0.72, 1.9 - (h - STAGE_MINI) * 0.042), amp: 0, bob: 0 };
    }
    if (ring.mode === "boss") return { rc: boss ? boss.rc : ring.rc, omega: 1, amp: 0, bob: 0 };
    const L = level(Math.min(h, STAGE_MINI) * 0.65 + (st - 1) * 3);
    return { amp: L.amp, omega: L.omega * cursed * S.speed, rc: L.rc - (hasMod("shrink") ? 0.05 : 0), bob: Math.max(L.bob, hasMod("bob") ? 0.16 : 0) };
  }
  // Arcade never ends, so past the story's top speed its ring keeps winding up: 6% quicker every 10 hits, to 1.6×
  const arcadeRamp = () => (game.mode === "arcade" ? Math.min(1.6, 1 + 0.06 * Math.floor(Math.max(0, (game.stageHits || 0) - STAGE_BOSS) / 10)) : 1);
  function snapRing() { const T = ringTargets(); ring.amp = T.amp; ring.omega = T.omega; ring.rc = T.rc; ring.bob = T.bob; }
  function setRingMode(mode, keepPos = true) {
    const here = { x: ring.x, y: ring.y, z: ring.z };
    ring.mode = mode; ring.phase = 0;
    if (mode === "tri") { ring.tri = { ...stageDef().tri, seq: triSequence(game.stage || 1) }; }
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
    boss = null; seeds.length = 0; setRingMode("line", false); hideStageCard();
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
    stageCard("The ring goes 3D", "Left, right, up, down, near and far", "It only gets quicker from here", 2.2, "gold");
    cine("mini-out", 2.2, () => { snapRing(); setHint("Watch the ring: its flight repeats"); updateHud(); }, 0.45);
    setRingMode("tri"); snapRing(); ring.morph = 1; Sound.setAct("B");
    updateHud();
  }
  function startMiniBoss() {
    game.phase = "mini"; clearPickups(); clearPowers(); Sound.toon("brass"); Sound.setAct("boss");
    boss = makeCrowKing(game.stage); setRingMode("boss"); snapRing(); Telemetry.emit("boss_start", { kind: boss.kind, stage: game.stage });
    stageCard("Mini-boss", "The Crow King", `Toss through his ring ${boss.max} times`, 2.3, "boss");
    cine("mini-in", 2.3, () => setHint("He swoops near and far: lead the ring"));
    updateHud();
  }
  function miniBossDown() {
    profile.miniKills++; if (boss.flawless) profile.miniFlawless++; game.run.bosses++;
    const bonus = Math.round(2500 * stageMult() * (boss.flawless ? 1.5 : 1));
    game.score += bonus; flyPoints(`+${fmtN(bonus)}`, W / 2, H * 0.36, true); Sound.toon("fanfare");
    stageCard("Mini-boss defeated!", "The ring goes 3D", `Left, right, up, down, near and far${boss.flawless ? " · flawless!" : ""}`, 2.6, "gold");
    // the rules change: the camera pulls back, the ring shakes loose and grows wings, the band changes key
    cine("mini-out", 2.6, () => { boss = null; game.phase = "B"; snapRing(); setHint("Watch the ring: its flight repeats"); updateHud(); }, 0.55);
    setRingMode("tri"); snapRing(); ring.morph = 1; Sound.setAct("B");
    checkUnlocks(); persist(); updateHud();
    challenge("bosses", 1);
  }
  function startMainBoss() {
    game.phase = "boss"; clearPickups(); clearPowers(); Sound.toon("brass"); Sound.setAct("boss");
    boss = makePumpkinKing(game.stage); setRingMode("boss"); snapRing(); Telemetry.emit("boss_start", { kind: boss.kind, stage: game.stage });
    stageCard("Main boss", "The Pumpkin King", "Seeds knock Morty away. Time your toss.", 2.6, "boss");
    cine("boss-in", 2.6, () => setHint("Throw between his seed volleys"), 0.35);
    updateHud();
  }
  function mainBossDown() {
    profile.bossKills++; if (boss.flawless) profile.bossFlawless++; game.run.bosses++;
    profile.bestStage = Math.max(profile.bestStage, game.stage + 1);
    const bonus = Math.round((10000 + (boss.flawless ? 5000 : 0)) * stageMult());
    game.score += bonus; flyPoints(`+${fmtN(bonus)}`, W / 2, H * 0.36, true);
    const bones = 150 + game.stage * 50; addBones(bones); game.run.bossBones = (game.run.bossBones || 0) + bones;
    stageCard(`Stage ${game.stage} clear!`, "The Pumpkin King falls", `+${bones} bones · a skull back${boss.flawless ? " · flawless!" : ""}`, 2.8, "gold");
    Sound.toon("fanfare");
    cine("boss-out", 2.8, () => {
      boss = null; seeds.length = 0; game.stage++; game.stageHits = 0; game.phase = "A"; VisualSystem.setStage(game.stage);
      if (game.lives < MAX_LIVES) { game.lives++; game.slots = Math.max(game.slots, game.lives); }
      setRingMode("line"); snapRing(); Sound.setAct("A");
      const S = stageDef();
      stageCard(`Stage ${game.stage}`, S.name, S.mods.length ? "Everything's a little faster, and a little stranger" : "Everything's a little faster", 2);
      updateHud();
    }, 0.4);
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
      progLbl.textContent = h < STAGE_MINI ? `${STAGE_MINI - h} to the Crow King` : `${STAGE_BOSS - h} to the Pumpkin King`;
      delete progEl.dataset.boss;
    }
    progEl.querySelector(".mini").classList.toggle("done", (game.stageHits || 0) >= STAGE_MINI);
  }
