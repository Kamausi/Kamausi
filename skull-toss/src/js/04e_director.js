  // ───────────────────────── the shot director ─────────────────────────
  // Every throw is one short scene, and the director runs it from one timeline: the launcher's snap, the skull's
  // squash and smear, the target's reaction, the camera's jolt, the effects and the sounds, each on its beat.
  // Gameplay stays in charge of what happened (the director never touches a score, a hit or a flight path); the
  // director decides when each part of it is seen and heard.
  //
  //   release   snap · squash ─► smear (1 drawing later, with the whoosh) ─► flight
  //   contact   burst: contact sound, impact transient, jolt, contact drawing, sparks ─► flash (.08 s)
  //             ─► boing on the rebound (2 drawings) ─► score sting (.125 s) ─► dust (.14 s) ─► settle (70%)
  //   reload    the next skull drops into the pouch: the bands give, a small boing
  //
  // FX direction: every moment has a recipe, and the recipe's intensity sets how big its picture is, so a bigger
  // moment always reads bigger: launch .42 · miss .58 · hit .72 · perfect 1.00 · boss hit 1.05 · boss defeat 1.35.
  // The camera jolt, the contact drawing, the flash and the dust scale with it (times how hard the hit physically
  // was); the skull's squash only ever follows the physics.
  //
  // Sound direction: the cues sit on the same timeline as the drawings, so each lands with its picture, and a cue
  // never doubles up (the same cue inside its gap is dropped): creak at full draw → snap → whoosh → contact
  // → transient → score sting → boing → the plop of the next skull.

  // ── FX direction
  const FX_RECIPES = {
    launch:     { intensity: 0.42, dur: 0.35 },
    miss:       { intensity: 0.58, dur: 0.6 },
    hit:        { intensity: 0.72, dur: 0.7 },
    perfect:    { intensity: 1.0,  dur: 0.9 },
    bossHit:    { intensity: 1.05, dur: 0.9 },
    bossDefeat: { intensity: 1.35, dur: 1.6 }
  };
  const FX_TIMELINE = { burst: 0, flash: 0.08, rebound: 2 / 24, sting: 0.125, dust: 0.14, settle: 0.7 };   // seconds after the moment; settle is a share of the recipe
  const FX_REF = FX_RECIPES.hit.intensity;   // the effects were tuned on a normal hit; the recipes scale from there
  const fxIntensity = cls => (FX_RECIPES[cls] ? FX_RECIPES[cls].intensity : 0);
  function fxTimeline(cls) {   // when each layer of a moment lands, in seconds after it
    const R = FX_RECIPES[cls]; if (!R) return null;
    const T = FX_TIMELINE;
    return { burst: T.burst, flash: T.flash, rebound: +T.rebound.toFixed(3), sting: T.sting, dust: T.dust, settle: +(R.dur * T.settle).toFixed(3), end: R.dur };
  }

  // ── render quality: the adaptive loop lowers the effects before it lowers the resolution
  // (it never touches input, physics, collisions, timing or the characters' drawings)
  const QUALITY = { level: 1, particles: 1, dust: 1, grain: 1 };
  function setQuality(level) {
    const q = clamp(level, 0.5, 1);
    Object.assign(QUALITY, { level: q, particles: q, dust: q, grain: q });
    return q;
  }

  // ── the timeline
  const SHOT = { n: 0, t0: -9, rush: false, outcome: null, contact: null, beats: [], cues: [] };
  const FX_RANK = { launch: 0, miss: 1, hit: 2, perfect: 3, bossHit: 4, bossDefeat: 5 };
  let inkStars = [];
  function beat(after, fn, name) { SHOT.beats.push({ at: VCLOCK.t + after, fn, name }); }
  function directorReset() { SHOT.beats.length = 0; SHOT.cues.length = 0; SHOT.outcome = null; SHOT.contact = null; SHOT.rush = false; inkStars = []; for (const k in cueAt) delete cueAt[k]; }
  function directorUpdate(dt, frozen) {
    if (!frozen) { for (const s of inkStars) s.t += dt; inkStars = inkStars.filter(s => s.t < s.n / 24); if (inkStars.length > PERF.inkStars) inkStars.splice(0, inkStars.length - PERF.inkStars); }
    if (!SHOT.beats.length) return;
    const now = VCLOCK.t + 1e-6, due = SHOT.beats.filter(b => b.at <= now);
    if (!due.length) return;
    SHOT.beats = SHOT.beats.filter(b => b.at > now);
    for (const b of due) b.fn();
  }

  // ── sound direction (v12)
  // gap: the shortest time between two of the same cue (inside it, the second is the same moment and is dropped)
  const CUES = {
    creak:     { gap: 0.9,  play: o => Sound.cue("creak", o) },                   // full draw: the band and the leather groan
    snap:      { gap: 0.2,  play: o => Sound.release(o.p || 0) },                  // release: rubber slap, thump, twang
    whistle:   { gap: 0.3,  play: o => Sound.toon("whistleUp", o.pan) },
    whoosh:    { gap: 0.2,  play: o => Sound.cue("whoosh", o) },                   // the smear
    swish:     { gap: 0.15, play: o => Sound.swish(!!o.perfect, o.pan) },          // through the ring
    clank:     { gap: 0.08, play: o => Sound.clank(o.v, o.pan) },                  // the iron rim
    thud:      { gap: 0.08, play: o => Sound.thud(o.v, o.pan) },                   // the ground
    bonk:      { gap: 0.15, play: o => Sound.toon("bonk", o.pan) },                // the skull's own "ow"
    doonk:     { gap: 0.15, play: o => Sound.toon("doonk", o.pan) },               // a boss takes it
    caw:       { gap: 0.3,  play: o => Sound.toon("caw", o.pan) },
    ko:        { gap: 0.5,  play: () => Sound.toon("ko") },
    transient: { gap: 0.06, play: o => Sound.cue("transient", o) },               // the crack of the contact, sized by the moment
    sting:     { gap: 0.2,  play: o => { Sound.toon(o.perfect ? "xylo" : "ding"); if (o.streak >= 2) Sound.ui("combo", o.streak); } },
    boing:     { gap: 0.2,  play: o => Sound.toon("boing", o.pan) },              // the rebound
    plop:      { gap: 0.4,  play: o => Sound.cue("plop", o) }                      // the next skull lands in the pouch
  };
  const cueAt = {};
  function cue(name, o = {}) {
    const C = CUES[name]; if (!C) return false;
    const last = cueAt[name];
    if (last != null && VCLOCK.t - last < C.gap) return false;   // the same cue for the same moment: once
    cueAt[name] = VCLOCK.t;
    SHOT.cues.push({ name, t: +(VCLOCK.t - SHOT.t0).toFixed(3) }); if (SHOT.cues.length > 24) SHOT.cues.shift();
    C.play(o);
    return true;
  }

  // ── the release
  function directLaunch(d) {
    SHOT.n++; SHOT.t0 = VCLOCK.t; SHOT.beats.length = 0; SHOT.cues.length = 0; SHOT.outcome = "launch"; SHOT.contact = null; SHOT.rush = powerOn("rush"); VPOSE.hold = null;
    const v = velAt(skull, 0), p = clamp((d.AY - AIM_Y_MIN) / (AIM_Y_MAX - AIM_Y_MIN), 0, 1);
    skull.launchSpeed = Math.hypot(v.x, v.y, v.z);
    keyFrame();   // the release is a key drawing: it lands on the frame you let go
    squashSkull("launch", 1, screenDir(skull)); rig.tilt = 0; rig.tiltT = 0; rig.dots = 0;
    cue("snap", { p }); cue("whistle"); Sound.flightStart();
    const rest = project(0, START_Y, 0), pouch = { x: rest.x + skull.pullOff.x, y: rest.y + skull.pullOff.y };
    camRelease(); hatPop(4.2); slingRelease(d.AX, d.AY);
    airPuff(pouch.x, pouch.y, SKULL_R * rest.s, fxIntensity("launch") * (0.7 + 0.6 * p));
    beat(HOLD.launch, () => cue("whoosh", { v: 0.55 + 0.45 * p + (SHOT.rush ? 0.3 : 0) }), "whoosh");
    setSkullState("launch"); setCameraState("throw");
  }
  // the band's snap throws a little air out of the pouch
  function airPuff(x, y, r, k) {
    const n = Math.round((3 + 8 * k) * QUALITY.particles);
    for (let i = 0; i < n; i++) {
      const a = (i / Math.max(1, n - 1)) * Math.PI + rand(-0.15, 0.15), sp = r * rand(2.5, 5) * (0.6 + k);
      particles.push({ kind: "puff", x: x + Math.cos(a) * r * 0.7, y: y + Math.sin(a) * r * 0.35 + r * 0.45, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.35, life: rand(0.16, 0.28), max: 0.28, size: r * rand(0.1, 0.18), grow: r * 1.1, color: CREAM, g: 0, a: 0.45 });
    }
  }

  // ── a contact (from triggerImpact, which has already done the contact itself: jolt, squash, hold)
  function directImpact(kind, I, o) {
    const R = o.R, cls = I.fx || null, T = FX_TIMELINE, w = R ? R.intensity : 0.4;
    SHOT.contact = { kind, fx: cls, t: +VCLOCK.t.toFixed(3), since: +(VCLOCK.t - SHOT.t0).toFixed(3) };
    if (cls && (SHOT.outcome == null || (FX_RANK[cls] || 0) >= (FX_RANK[SHOT.outcome] || 0))) SHOT.outcome = cls;   // the biggest moment of the throw
    // burst, on the contact
    for (const [name, v] of I.snd || []) cue(name, { v: v * clamp(o.k, 0.3, 1.2), pan: o.pan, perfect: kind === "perfect" });
    if (I.transient) cue("transient", { v: clamp(w * o.k, 0.25, 1.5), pan: o.pan });
    if (I.sparks && o.hit) sparks(o.hit, Math.max(2, Math.round(I.sparks * clamp(o.fk, 0.6, 1.5) * QUALITY.particles)));
    if (I.sparkle && o.at) sparkle(o.at, kind === "perfect");
    gpuImpact(kind, o.at, o.hit);   // the GPU's sparks and flash of light (08j_gpu.js)
    if (I.star) impactStar(o.hit || o.at, I.star, w * clamp(o.k, 0.6, 1.4), I.star === "ground" && game.state === "flying" && skull.pos.z > ring.z + 0.05);
    if (I.pose) { VPOSE.hold = I.pose; VPOSE.holdUntil = VCLOCK.t + (R ? R.dur : 0.6); }
    // flash, two drawings on
    if (I.flash || I.wave || I.screen) beat(T.flash, () => {
      if (I.flash) ring.flash = Math.max(ring.flash, I.flash);
      if (I.wave && o.at) waves.push({ x: o.at.x, y: o.at.y, r: ring.rc * o.at.s, t: 0, dur: 0.5 });
      if (I.screen) screenFlash(w);
    }, "flash");
    if (I.boing) beat(T.rebound, () => cue("boing", { pan: o.pan }), "boing");
    if (I.dust && o.at) beat(T.dust, () => dust(o.at, Math.max(2, Math.round(I.dust * clamp(o.fk, 0.5, 1.3) * QUALITY.dust))), "dust");
    if (R) beat(R.dur * T.settle, () => { if (TARGET_HIT[VSTATE.target]) setTargetState("settle"); }, "settle");
  }
  // the camera-flash frame: stronger the bigger the moment
  function screenFlash(w) {   // Settings → Flashes: Reduced swaps every flash for one soft one; Off skips them
    const cls = settings.flashes === "off" || reduceMotion ? "" : settings.flashes === "reduced" ? "soft" : w >= 1.3 ? "ko" : w > 1 ? "boss" : "perfect";
    flashEl.dataset.last = cls || "none";
    if (!cls || sandbox) return;
    flashEl.className = "flash"; void flashEl.offsetWidth; flashEl.classList.add(cls);
  }
  // a make: the sting lands as the score pops (three drawings after the contact)
  function directScore(d) {
    if (SHOT.outcome == null || SHOT.outcome === "launch") SHOT.outcome = d.kind === "perfect" ? "perfect" : "hit";
    beat(FX_TIMELINE.sting, () => cue("sting", { perfect: d.kind === "perfect", streak: d.streak || 0 }), "sting");
  }
  // a clean miss: nothing touched, so nothing bursts; the skull's take is the whole moment
  function directMiss() {
    if (SHOT.outcome == null || SHOT.outcome === "launch") SHOT.outcome = "miss";
    SHOT.contact = { kind: "whiff", fx: "miss", t: +VCLOCK.t.toFixed(3), since: +(VCLOCK.t - SHOT.t0).toFixed(3) };
  }
  // the next skull drops into the pouch: as it pops to full size, the bands give under it
  function directReload() {
    beat(0.18, () => { sling.vy += U * 0.35; if (game.state === "ready") cue("plop"); }, "reload");
  }

  // ── the contact drawing: the cartoon impact star, three drawings long (a knockout gets five)
  const STAR_STYLE = {
    rim:    { fill: CREAM,   size: 1.0,  pts: 8 },
    bonk:   { fill: MUSTARD, size: 1.45, pts: 10 },
    ground: { fill: CREAM,   size: 1.5,  pts: 9, flat: 0.42 },
    boss:   { fill: RED,     size: 1.8,  pts: 11 },
    ko:     { fill: GOLD,    size: 2.6,  pts: 12, n: 5 }
  };
  // behind: the contact is further away than the ring (a landing behind it), so its star goes behind the ring too
  function impactStar(p, style, w, behind = false) {
    const S = STAR_STYLE[style]; if (!p || !S) return;
    const r = SKULL_R * (p.s || U / 9) * S.size * clamp(w / FX_REF, 0.7, 2);
    inkStars.push({ x: p.x, y: p.y, r, style, behind, t: 0, n: S.n || 3, seed: (Math.random() * 1e6) | 0, rot: rand(-0.3, 0.3) });
  }

  // ── what the director is doing (the debug overlay and the tests read this)
  function fxState() {
    return { shot: SHOT.n, outcome: SHOT.outcome, intensity: fxIntensity(SHOT.outcome), contact: SHOT.contact && { ...SHOT.contact },
      pending: SHOT.beats.map(b => ({ name: b.name, in: +(b.at - VCLOCK.t).toFixed(3) })), cues: SHOT.cues.map(c => ({ ...c })), stars: inkStars.map(s => ({ style: s.style, r: +s.r.toFixed(1), drawing: Math.floor(s.t * 24) })), quality: QUALITY.level };
  }
