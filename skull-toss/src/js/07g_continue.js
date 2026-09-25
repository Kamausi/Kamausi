  // ───────────────────────── one more skull: continues, and runs that survive a reload ─────────────────────────
  // When the last skull goes, the run can go on: spend bones (200, then 400, then 800), or watch a short reel where
  // the build has an ad provider (Ads, below: a native build plugs one in; the web build has none). One continue
  // per map and three per Story run; one per Arcade run. You have eight seconds to choose, and No thanks ends the run
  // as before. A continue gives back one skull and nothing else: the score stays, the combo was already broken by the
  // miss. A run that used a continue still counts for your own best, but never for the leaderboard.
  const CONTINUE = { costs: [200, 400, 800], perRun: 3, window: 8 };
  // the ad provider interface: available() says whether a reel can be shown now; show() resolves true once it was
  // watched to the end. V40's native shells replace this; tests fake it.
  let Ads = { available: () => false, show: () => Promise.resolve(false) };
  const contEl = $("continueBox");
  function continueRule() {
    if (Replay.play) return Replay.contRule();   // (a replay offers one exactly when the recording decided one)
    if ((sandbox && !sandbox.contOn) || !modeOf().cont || game.phase === "encore" || game.phase === "crossing") return { ok: false };   // (older tests expect the last skull to end the run)
    const used = game.run.continues || 0, maps = game.run.contMaps || [];
    if (game.mode === "arcade" ? used >= 1 : used >= CONTINUE.perRun || maps.includes(game.stage)) return { ok: false };
    const cost = CONTINUE.costs[Math.min(used, CONTINUE.costs.length - 1)], pay = profile.bones >= cost, ad = Ads.available();
    return { ok: pay || ad, cost, pay, ad };
  }
  function offerContinue() {
    const R = continueRule(); if (!R.ok) return false;
    game.state = "continue"; game.cont = { t: 0, cost: R.cost };
    resetSkull(); VisualSystem.emit("death"); Sound.flightStop(true); showCombo(0); setHint("");
    $("contBones").textContent = t("cont.bones", { n: fmtN(R.cost) }); $("contBones").disabled = !R.pay;
    $("contSub").textContent = R.pay ? t("cont.have", { n: fmtN(profile.bones) }) : t("cont.short");
    $("contAd").hidden = !R.ad; contEl.hidden = false; renderContinueTimer();
    Sound.toon("whistleDown"); Telemetry.emit("continue_offer", { stage: game.stage, cost: R.cost, pay: R.pay, ad: R.ad, n: game.run.continues || 0 });
    srEl.textContent = t("cont.sr", { n: R.cost, secs: CONTINUE.window });
    saveRunSnapshot(true); mortySays("continue", { priority: true });
    const f = !$("contBones").disabled ? $("contBones") : !$("contAd").hidden ? $("contAd") : $("contNo"); if (ui.kbd) f.focus({ preventScroll: true });
    return true;
  }
  function renderContinueTimer() { if (game.cont) $("contTimer").textContent = Math.max(0, Math.ceil(CONTINUE.window - game.cont.t)); }
  function updateContinue(dt) {
    if (game.state !== "continue" || !game.cont || game.cont.waiting) return;
    game.cont.t += dt; renderContinueTimer();
    if (game.cont.t >= CONTINUE.window) declineContinue("timeout");
  }
  function takeContinue(method) {
    if (game.state !== "continue") return false;
    Replay.note("c", method === "ad" ? 1 : 0, 0);
    const cost = game.cont.cost;
    if (method === "bones" && !Replay.play) { if (profile.bones < cost) return false; profile.bones -= cost; profile.bonesSpent += cost; renderBones(); }
    contEl.hidden = true; game.cont = null;
    game.run.continues = (game.run.continues || 0) + 1; game.run.contMaps = (game.run.contMaps || []).concat(game.stage); profile.continues++;
    game.lives = 1; game.streak = 0; game.perfStreak = 0;
    Telemetry.emit("continue_take", { method, cost: method === "bones" ? cost : 0, stage: game.stage });
    const p = project(0, START_Y, 0); impact(t("cont.encore"), W / 2, p.y - U * 0.28, { fill: GOLD, text: INK, scale: 1, bits: true, sub: t("cont.encoreSub") });
    Sound.toon("encore"); buzz([20, 40, 20]); mortySays("encore", { priority: true });
    persist(300);
    settleThrow();   // pick the run up where the last throw left it
    updateHud(); return true;
  }
  function declineContinue(why = "no") {
    if (game.state !== "continue") return;
    Replay.note("n");
    contEl.hidden = true; game.cont = null;
    Telemetry.emit("continue_decline", { why, stage: game.stage });
    gameOver();
  }
  $("contBones").addEventListener("click", () => takeContinue("bones"));
  $("contNo").addEventListener("click", () => declineContinue("no"));
  $("contAd").addEventListener("click", () => {
    if (!game.cont || game.cont.waiting) return;
    game.cont.waiting = true; $("contAd").disabled = true;   // the clock stops while the reel plays
    Ads.show().then(ok => { $("contAd").disabled = false; if (!game.cont) return; game.cont.waiting = false; if (ok) takeContinue("ad"); else declineContinue("ad-failed"); });
  });

  // ── the run snapshot: the run so far, kept in this browser, so a page the phone reclaimed (during an ad, say) can
  // pick up again. Taken as each throw settles and when a continue is offered; cleared when the run ends. A run
  // caught in a boss fight comes back at the start of that fight.
  const RUN_KEY = "skullToss.run.v1", RUN_MAX_AGE = 24 * 3600 * 1000;
  function saveRunSnapshot(cont = false) {
    if ((sandbox && !sandbox.snapOn) || !modeOf().cont || Replay.play) return;   // (the spec keeps its snapshots apart from the player's)
    const cross = game.phase === "crossing" || game.phase === "encore";   // (between maps: a reload picks up at the next one's start)
    const phase = game.phase === "mini" ? "A" : game.phase === "boss" ? "B" : cross ? "A" : game.phase;
    const stageHits = game.phase === "mini" ? STAGE_MINI : game.phase === "boss" ? STAGE_BOSS : cross ? 0 : game.stageHits;
    const S = { v: 1, at: Date.now(), mode: game.mode, plus: game.plus ? 1 : 0, map: game.map, stage: game.stage + (cross ? 1 : 0), phase, stageHits, hits: game.hits, score: game.score,
      lives: cont ? 0 : game.lives, slots: game.slots, streak: game.streak, perfStreak: game.perfStreak, peakLives: game.peakLives, throws: game.throws,
      run: { ...game.run, t0: undefined }, secs: game.time - (game.run.t0 || 0), powers: JSON.parse(JSON.stringify(powers)), seed: game.seed, wind: HZ.wind, cont };
    const txt = JSON.stringify(S); if (sandbox) sandbox.snap = txt; else store.set(RUN_KEY, txt);
  }
  function clearRunSnapshot() { if (sandbox) { sandbox.snap = null; return; } store.set(RUN_KEY, ""); }
  function readRunSnapshot() {
    let S = null; try { S = JSON.parse(sandbox ? sandbox.snap || "null" : store.get(RUN_KEY, "") || "null"); } catch (e) {}
    return S && S.v === 1 && Date.now() - S.at < RUN_MAX_AGE && S.stage >= 1 ? S : null;
  }
  function resumeRunSnapshot() {
    const S = readRunSnapshot(); if (!S) return false;
    startGame({ mode: S.mode, map: S.map, seed: (S.seed ^ S.throws) >>> 0, quiet: true, plus: !!S.plus });
    Object.assign(game, { stage: S.stage, phase: S.phase === "A" || S.phase === "B" ? S.phase : "A", stageHits: S.stageHits, hits: S.hits, score: S.score, lives: Math.max(0, S.lives),
      slots: S.slots, streak: S.streak, perfStreak: S.perfStreak, peakLives: S.peakLives, throws: S.throws });
    Object.assign(game.run, S.run || {}); game.run.t0 = game.time - (S.secs || 0);
    for (const [id, p] of Object.entries(S.powers || {})) if (POWERS[id]) powers[id] = { left: p.left, uses: p.uses, t: 0 };
    VisualSystem.setStage(game.stage); setScene(game.stage - 1); hazardsReset(); HZ.wind = S.wind || 0; renderWind();
    setRingMode(game.phase === "B" ? bMode() : "line", false); snapRing(); renderPowers();
    hideStageCard(); stageCard(mapData(game.stage).reel, t("card.resume.t"), t("card.resume.s", { score: fmtN(game.score), hits: game.hits }), 2.2);
    Telemetry.emit("run_resume", { stage: game.stage, score: game.score, cont: !!S.cont }); mortySays("resume", { priority: true });
    if (S.cont || game.lives <= 0) { game.lives = 0; if (!offerContinue()) gameOver(); }
    else if (!stageCheck()) setHint(t("hint.start"));
    updateHud(); return true;
  }
  function renderResumeOffer() { const b = $("resumeRunBtn"); if (b) b.hidden = !readRunSnapshot(); }
  $("resumeRunBtn").addEventListener("click", () => { if (!resumeRunSnapshot()) renderResumeOffer(); });

  // ── while you decide: Morty's ghost hovers over the skull in the pouch, waiting to see what you'll do
  function drawContinueGhost() {
    if (game.state !== "continue" || !game.cont) return;
    const rest = project(0, START_Y, 0), r = SKULL_R * rest.s * 1.12, t = game.cont.t, bob = Math.sin(t * 2.6) * r * 0.15;
    ctx.save(); ctx.translate(rest.x + Math.sin(t * 1.3) * r * 0.4, rest.y + r * 0.5 + bob); ctx.scale(r * 2.2, r * 2.2); ctx.globalAlpha = 0.85;
    drawGhost(ctx, t, 0); ctx.restore();
  }
