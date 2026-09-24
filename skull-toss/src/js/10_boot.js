  // ───────────────────────── loop + boot ─────────────────────────
  let last = 0, manual = false, slow = 0, frames = 0;
  // The simulation runs on a fixed step. Each frame's time goes into an accumulator and the game advances in whole
  // SIM_STEPs, so a throw plays out the same at 60, 90, 120 or 144 Hz, and the same inputs on the same steps give the
  // same run (what replays and shot checks will need). The picture is still drawn once a frame. The spec steps the
  // game with the same SIM_STEP.
  const SIM_STEP = 1 / 240;
  let simAcc = 0;
  function advance(dt) {
    if (paused) { simAcc = 0; return 0; }
    simAcc += dt; let n = 0;
    while (simAcc >= SIM_STEP - 1e-9) { update(SIM_STEP); simAcc -= SIM_STEP; n++; }
    return n;
  }
  function frame(ts) {
    const t0 = performance.now(), raw = Math.max(0, (ts - last) / 1000), real = Math.min(1 / 30, raw); last = ts;
    // adaptive quality: if frames keep running long (a busy phone), first draw fewer particles, less dust and
    // lighter film grain, and only then render fewer pixels, so the device isn't starved (a starved CPU is what
    // makes audio crackle). Input, physics, timing and the characters' drawings are never touched.
    if (!document.hidden && raw < 0.25) { frames++; if (raw > 1 / 40) slow++; }
    if (frames >= 120) { if (slow > 60) { if (QUALITY.level > 0.5) setQuality(QUALITY.level - 0.25); else if (maxDPR > 1) { maxDPR = Math.max(1, maxDPR - 0.5); resize(); } } frames = 0; slow = 0; }
    let dt = real;
    if (!manual) { pollPad(); if (game.slowmo > 0 && !paused) { game.slowmo -= dt; dt *= 0.3; } advance(dt * (Replay.play ? Replay.speed : 1)); }
    if (aim.active && !paused) Sound.pull(aim.tension);
    VisualSystem.render(); drawUI(ts);
    if (visualsOn()) visualTick(raw, performance.now() - t0);
    requestAnimationFrame(frame);
  }
  loadAll(); Flags.load();
  { const q = (location.search.match(/[?&]lang=([\w-]+)/) || [])[1]; if (q || settings.lang !== "en") setLang(q || settings.lang); }   // ?lang=pseudo tries the text-length locale
  welcomeGift(); ensureDaily(); applyCosmetics(); applyAccess(); layOutProps(); resize(); snapRing(); VisualSystem.init(); showScreen("title", false); updateHud();
  firstTime("launch"); if (PlayData.consent() === "yes") PlayData.sessionStart();   // (play data: 04g_telemetry.js)
  requestAnimationFrame(frame);
  Cloud.init();
  // canvas-only fonts are never fetched unless asked for; once they're in, redraw anything painted once
  if (document.fonts && document.fonts.load) Promise.all(['40px "Bangers"', '40px "Luckiest Guy"', '40px "Bebas Neue"', '800 14px "Nunito Sans"'].map(f => document.fonts.load(f))).then(() => { if (sheet) renderSheet(sheet); fitLogo(); }).catch(() => {});

  // ───────────────────────── the console handle ─────────────────────────
  // Every build carries the visual debug overlay's switches and the read-only animation inspectors (see the README).
  // Nothing here can change a score, a balance or a save; the test hooks that can are in the dev build only.
  window.SkullToss = {
    debug: {
      visuals,
      // the animation side under the names the plan uses: the pose library, the FX recipes and their timeline
      visualAnimation: {
        poseLibrary: () => Object.keys(POSES), pose: () => VPOSE.id, samplePose: (id, t = 0) => { const f = poseFace(id, t); return { ...POSES[id], mood: f.mood, glyph: f.glyph, jaw: f.jawT }; },
        fxRecipes: () => JSON.parse(JSON.stringify(FX_RECIPES)), fxRecipe: cls => FX_RECIPES[cls] ? { ...FX_RECIPES[cls] } : null, fxTimeline: cls => fxTimeline(cls), fxIntensity: cls => fxIntensity(cls), fxState: () => fxState(),
        cues: () => Object.keys(CUES), quality: () => ({ ...QUALITY }), setQuality: q => setQuality(q)
      }
    },
    telemetry: () => Telemetry.events.map(e => ({ ...e })),   // this session's play events (a copy; see 04g_telemetry.js)
    errors: () => Telemetry.errors.map(e => ({ ...e })),       // uncaught errors this session
    economy: () => economyAudit(),                              // the economy's rules, checked, and its pacing (04b_economy.js)
    version: () => ({ build: GAME_BUILD, version: GAME_VERSION, schema: SAVE_SCHEMA, flags: Flags.source })
  };
