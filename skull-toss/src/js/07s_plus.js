  // ───────────────────────── Adventure+ (v51) ─────────────────────────
  // Finish the Adventure and it opens again, remixed: the same eight maps, the same 80 hits each, but the world has
  // gone wrong around a skull that's survived it once. Adventure is learning the world; Adventure+ is mastering it.
  // It isn't everything doubled: several systems get harder a little each, climbing from about 1.25× on the first
  // map to 2× on the last —
  //   the ring    quicker and a little smaller, and now and then it fakes you out: stops dead, or doubles back
  //   decoys      from the third map, one or two ghost rings ride along beside the real one; they fade before the
  //               skull gets there, and only the real one counts
  //   the weather a crosswind on every map from the second, turning with every throw
  //   cracked     clank off the rim and Morty cracks; miss while he's cracked and it costs two skulls; a make mends him
  //   bosses      quicker in everything they do, quicker still in their last phase
  //   scoring     Speed Toss (in within a second and a half of Morty being ready), Trick Shot (in off a bounce), and
  //               a Perfect Map bonus for a map finished without a miss
  //   the print   darker and damaged: a red cast, a jumpier gate, a torn frame now and then, a frame that sticks
  const PLUS = { wind: 0, fake: 0, fakeNext: 0, fakeKind: 0, cracked: false, readyAt: 0, mapMisses: 0, hold: 0, nextHold: 6, decoys: [] };
  const plusOpen = () => (realProfile().storyClears || 0) > 0;
  const plusOn = () => !!game.plus && game.mode === "story" && game.state !== "title";
  const plusK = (st = game.stage || 1) => 1.25 + 0.75 * clamp((st - 1) / 7, 0, 1);   // 1.25× on map 1 … 2× on map 8
  function plusReset() {
    Object.assign(PLUS, { wind: 0, fake: 0, fakeNext: 5 + runRand() * 4, cracked: false, readyAt: game.time, mapMisses: 0, hold: 0, nextHold: 6, decoys: [] });
    if (game.plus) plusDecoys();
  }
  // the ring's targets, pushed: quicker, a touch wider-swinging, a little smaller (never for a boss's own path)
  function plusTargets(T) {
    if (!plusOn() || ring.mode === "boss") return T;
    const f = plusK() - 1;
    return { ...T, omega: T.omega * (1 + 0.5 * f), amp: (T.amp || 0) * (1 + 0.2 * f), rc: Math.max(0.36, T.rc - 0.045 * f) };
  }
  // the fake-out: now and then the ring stops dead for a moment, or doubles back — a multiplier on its phase rate
  function plusPhaseRate(dt) {
    if (!plusOn() || ring.mode === "boss" || boss) return 1;
    if (PLUS.fake > 0) { PLUS.fake -= dt; return PLUS.fakeKind ? -1 : 0.05; }
    PLUS.fakeNext -= dt;
    if (PLUS.fakeNext <= 0 && game.state === "ready") { PLUS.fakeKind = runRand() < 0.5 ? 1 : 0; PLUS.fake = 0.35 + runRand() * 0.35; PLUS.fakeNext = Math.max(3, 9 - plusK() * 2) + runRand() * 4; }
    return 1;
  }
  // the crosswind: a fresh gust each throw, from the second map on
  function plusGust() {
    if (!plusOn() || (game.stage || 1) < 2 || boss) { PLUS.wind = 0; return; }
    PLUS.wind = Math.round(rrIn(-1, 1) * (0.5 + 0.9 * (plusK() - 1)) * 10) / 10; renderWind();
  }
  const plusWind = () => (plusOn() ? PLUS.wind : 0);
  // decoys: ghost rings on the same path, a little ahead or behind the real one
  function plusDecoys() {
    PLUS.decoys = [];
    if (!game.plus || (game.stage || 1) < 3) return;
    const n = (game.stage || 1) >= 6 ? 2 : 1;
    for (let i = 0; i < n; i++) PLUS.decoys.push({ dphase: (i ? -1 : 1) * (0.55 + runRand() * 0.5), wob: runRand() * TAU });
  }
  function drawDecoys() {
    if (!plusOn() || !PLUS.decoys.length || boss || ring.frozen || game.phase === "crossing" || game.phase === "encore") return;
    let fade = 1;
    if (game.state === "flying") fade = clamp((ring.z - skull.pos.z - 1.2) / 2.5, 0, 1);   // gone before the skull gets there
    if (fade <= 0) return;
    ctx.save();
    for (const D of PLUS.decoys) {
      const q = ringAt(ring.phase + D.dphase), p = project(q.x, q.y + Math.sin(game.time * 3 + D.wob) * 0.05, q.z);
      ctx.globalAlpha = 0.55 * fade * (0.8 + 0.2 * Math.sin(game.time * 11 + D.wob));
      drawRingShape(ctx, p.x, p.y, ring.rc * p.s, RING_TUBE * p.s * 2, cos.ring, game.time);
    }
    ctx.restore();
  }
  // a throw's outcome: the crack, the extras, the map's clean sheet
  function plusResolve(R, kind) {
    if (!plusOn()) return 0;
    let extra = 0;
    if (R.make) {
      PLUS.cracked = false;
      if (game.time - PLUS.readyAt < 1.5 && !boss) { extra += 250; plusFly(t("plus.speed")); }
      if (skull.banked || skull.bounces > 0) { extra += 400; plusFly(t("plus.trick")); }
    } else {
      PLUS.mapMisses++;
      if (kind === "clank" || kind === "post") { if (!PLUS.cracked) { PLUS.cracked = true; Sound.toon("clang"); } }
    }
    if (extra) { game.score += extra; updateHud(); }
    return extra;
  }
  function plusFly(word) { flyPoints(word, W / 2, H * 0.3, true); }
  // a miss while cracked costs one skull more (07_game.js takes the first)
  const plusExtraLoss = R => (plusOn() && !R.make && PLUS.cracked && game.lives > 0 ? 1 : 0);
  function plusMapDone() {
    if (!plusOn()) return;
    if (PLUS.mapMisses === 0) { const b = Math.round(5000 * plusK()); game.score += b; flyPoints(`${t("plus.perfect")} +${fmtN(b)}`, W / 2, H * 0.34, true); Sound.toon("fanfare"); }
    PLUS.mapMisses = 0; plusDecoys();
  }
  // the damaged print: a red cast, a torn frame now and then, and a frame that sticks (the draw is skipped: it holds)
  function plusPrintHold(dt) {
    if (!plusOn() || reduceMotion || settings.flashes === "off") return false;
    if (PLUS.hold > 0) { PLUS.hold -= dt; return true; }
    PLUS.nextHold -= dt; if (PLUS.nextHold <= 0) { PLUS.hold = 1 / 12; PLUS.nextHold = 5 + Math.random() * 6; }
    return false;
  }
  function drawPlusPrint() {
    if (!plusOn()) return;
    ctx.save(); ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.globalCompositeOperation = "multiply"; ctx.fillStyle = "#B88A8A"; ctx.globalAlpha = 0.35; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "source-over";
    if (Math.random() < 0.04 && settings.flashes !== "off") { const y = Math.random() * H, h2 = 2 + Math.random() * 6; ctx.globalAlpha = 0.5; ctx.fillStyle = "#F2E7C9"; ctx.fillRect(0, y, W, h2); ctx.fillStyle = "#1A0A0A"; ctx.fillRect(0, y + h2, W, 1.5); }
    if (PLUS.cracked) { ctx.globalAlpha = 0.9; const p = project(0, START_Y, 0), r = SKULL_R * p.s * 1.12; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.5, r * 0.06);
      if (game.state === "ready") { ctx.beginPath(); ctx.moveTo(p.x + r * 0.1, p.y - r * 0.95); ctx.lineTo(p.x - r * 0.05, p.y - r * 0.55); ctx.lineTo(p.x + r * 0.15, p.y - r * 0.3); ctx.lineTo(p.x - r * 0.02, p.y - r * 0.05); ctx.stroke(); } }
    ctx.restore();
  }
  // ── the way in: THE END holds; the reel breaks; ADVENTURE+; "You've done this before."; BONK
  function plusIntro(then) {
    const el = $("plusIntro"); if (!el || reduceMotion || sandbox) { then(); return; }
    el.hidden = false; el.classList.remove("go"); void el.offsetWidth; el.classList.add("go");
    Sound.toon("hiss"); setTimeout(() => Sound.toon("kaboom"), 900); setTimeout(() => Sound.toon("stab"), 1500); setTimeout(() => Sound.toon("bonk"), 3300);
    let done = false; const end = () => { if (done) return; done = true; el.hidden = true; el.classList.remove("go"); then(); };
    setTimeout(end, 3700); el.onpointerdown = end;
  }
