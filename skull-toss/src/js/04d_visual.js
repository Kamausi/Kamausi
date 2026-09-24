  // ───────────────────────── the visual system ─────────────────────────
  // The picture is its own system. Gameplay runs every frame (60 fps), is exact, and never waits for the art;
  // it only tells the visual system what happened: a throw, a hit, a miss, a boss, a power-up. The visual system
  // keeps its own state and does the rest:
  //   · the art registry: vector assets from src/art/<asset> (skull, launcher, target), with versions and anchors
  //   · a 24 fps animation clock: the characters' drawings change 24 times a second while their positions stay
  //     smooth, and the camera exposes on the same beat, so pose and camera move together like shot animation.
  //     A key moment (the release, a contact) starts a fresh drawing on the spot: it lands on the frame.
  //   · state machines for the skull, the target, the launcher, the camera and the boss
  //   · a pose library: every drawing the skull can show, picked on each drawing from the states
  //   · squash and stretch from one table, and one impact system that fans a hit out to the camera, the skull,
  //     the target, particles and the contact sounds, scaled by how hard the hit was
  //   · the shot director (04e_director.js) times all of it: when each part of a moment is seen and heard
  // Gameplay code calls VisualSystem.emit(...) and VisualSystem.triggerImpact(...); it never pokes the art.

  // ── the art registry
  const ASSETS = {};
  function artShape(p) {   // one imported SVG shape → a canvas path (with its transform baked in)
    let path = new Path2D(p.d);
    if (p.m) { const q = new Path2D(); q.addPath(path, new DOMMatrix(p.m)); path = q; }
    return { ...p, path, filled: !!p.fill && p.fill !== "none", stroked: !!p.stroke && p.stroke !== "none" && p.sw > 0 };
  }
  for (const [id, A] of Object.entries(ART_ASSETS)) ASSETS[id] = { meta: A.meta, layers: Object.fromEntries(Object.entries(A.layers).map(([k, v]) => [k, v.map(artShape)])) };
  // paint one layer of an asset in its own colours, in the current transform (asset canvas units)
  function drawLayer(c, id, name) {
    const L = ASSETS[id] && ASSETS[id].layers[name]; if (!L) return false;
    for (const p of L) {
      const a0 = c.globalAlpha; if (p.op != null) c.globalAlpha = a0 * p.op;
      if (p.filled) { c.fillStyle = p.fill; c.fill(p.path, p.rule || "nonzero"); }
      if (p.stroked) { c.strokeStyle = p.stroke; c.lineWidth = p.sw; c.lineCap = p.cap || "butt"; c.lineJoin = p.join || "miter"; c.stroke(p.path); }
      c.globalAlpha = a0;
    }
    return true;
  }

  // ── the animation clock: drawings on 24s (and 12s for slow poses and the background cast)
  // phase: where the current run of 24s started. keyFrame() restarts it, so a release or a contact gets a drawing
  // of its own on the very frame it happens, and the drawings run on in 24ths from there.
  const VCLOCK = { t: 0, fps: 24, f: -1, fresh: true, f12: -1, fresh12: true, n: 0, phase: 0, cut: false, cuts: 0 };
  function tickClock(dt) {
    VCLOCK.fps = visuals.forceAnimationFPS > 0 ? visuals.forceAnimationFPS : 24;
    VCLOCK.t += dt;
    const u = VCLOCK.t - VCLOCK.phase, f = Math.floor(u * VCLOCK.fps), f12 = Math.floor(u * 12);
    VCLOCK.fresh = f !== VCLOCK.f || VCLOCK.cut; VCLOCK.f = f;
    VCLOCK.fresh12 = f12 !== VCLOCK.f12 || VCLOCK.cut; VCLOCK.f12 = f12;
    VCLOCK.cut = false;
    if (VCLOCK.fresh) VCLOCK.n++;
  }
  function keyFrame() { VCLOCK.phase = VCLOCK.t; VCLOCK.cut = true; VCLOCK.cuts++; }
  const clockT = () => VCLOCK.phase + VCLOCK.f / VCLOCK.fps;   // the time on the drawing now showing

  // ── state machines
  // skull:    idle → aim → anticipation (full draw) → launch → smear → flight → impact → rebound → flight / miss
  //           → recover → idle, and ko when the run ends
  // launcher: idle → tension → anticipation → release → recoil → idle
  // target:   idle → hit / perfect / bonk / bossHit → settle → idle; carried by a boss, defeat when one falls
  // camera:   idle → aim → anticipation → throw → impact / perfect / defeat → throw …; boss; transition
  // boss:     none → enter → vulnerable ⇄ attack → hit → … → defeat
  const VSTATE = { skull: "idle", skullAt: 0, target: "idle", targetAt: 0, launcher: "idle", camera: "idle", cameraAt: 0, cameraHold: 0.35, boss: "none", power: "", stage: 1, log: [] };
  const HOLD = { launch: 1 / 24, smear: 2 / 24, impact: 2 / 24, rebound: 0.14, targetHit: 0.35, targetSettle: 0.4, cameraHit: 0.35 };   // how long a state holds
  const TARGET_HIT = { hit: 1, perfect: 1, bonk: 1, bossHit: 1 };
  const since = at => VCLOCK.t - at;
  function setSkullState(s) { if (VSTATE.skull === s) return; VSTATE.skull = s; VSTATE.skullAt = VCLOCK.t; VSTATE.log.push(s); if (VSTATE.log.length > 32) VSTATE.log.shift(); }
  function setTargetState(s) { if (VSTATE.target !== s) { VSTATE.target = s; VSTATE.targetAt = VCLOCK.t; } }
  function setCameraState(s) { if (VSTATE.camera !== s) { VSTATE.camera = s; VSTATE.cameraAt = VCLOCK.t; } }
  function updateStates() {
    const S = VSTATE.skull, st = game.state, age = since(VSTATE.skullAt) + 1e-6;   // (a hair over, so holds of whole drawings end on the drawing)
    if (st === "over") setSkullState("ko");
    else if (st === "flying") {
      if (S === "launch") { if (age >= HOLD.launch) setSkullState("smear"); }
      else if (S === "smear") { if (age >= HOLD.smear * (SHOT.rush ? 1.5 : 1)) setSkullState("flight"); }   // Skull Rush smears a drawing longer
      else if (S === "impact") { if (age >= HOLD.impact) setSkullState("rebound"); }
      else if (S === "rebound") { if (age >= HOLD.rebound) setSkullState(skull.hang > 0 ? "miss" : "flight"); }
      else if (S !== "flight" && S !== "miss") setSkullState("launch");   // a throw nobody announced (keyboard, tests)
    } else if (aim.active && aim.valid) {
      // full draw is the anticipation: the skull strains and shivers but keeps its shape (the launcher takes the strain)
      const full = aim.tension >= 0.9 || (S === "anticipation" && aim.tension >= 0.8);
      if (full && S !== "anticipation") cue("creak", { v: aim.tension });
      setSkullState(full ? "anticipation" : "aim");
    }
    else if (skull.spawn < 1 && (S === "recover" || S === "flight" || S === "impact" || S === "rebound" || S === "miss" || S === "ko")) setSkullState("recover");
    else if (skull.spawn >= 1 || S !== "recover") setSkullState("idle");
    if (boss && !boss.dead) { if (!(TARGET_HIT[VSTATE.target] && since(VSTATE.targetAt) < HOLD.targetHit)) setTargetState("carried"); }
    else if (TARGET_HIT[VSTATE.target] && since(VSTATE.targetAt) >= HOLD.targetHit) setTargetState("settle");
    else if ((VSTATE.target === "settle" && since(VSTATE.targetAt) >= HOLD.targetSettle) || VSTATE.target === "carried" || (VSTATE.target === "defeat" && !boss)) setTargetState("idle");
    const hit = (VSTATE.camera === "impact" || VSTATE.camera === "perfect" || VSTATE.camera === "defeat") && since(VSTATE.cameraAt) < VSTATE.cameraHold;
    if (!hit) setCameraState(game.cine ? "transition" : boss ? "boss" : st === "flying" ? "throw" : aim.active ? (VSTATE.skull === "anticipation" ? "anticipation" : "aim") : "idle");
    VSTATE.launcher = aim.active ? (VSTATE.skull === "anticipation" ? "anticipation" : "tension") : VSTATE.skull === "launch" ? "release"
      : Math.hypot(sling.x, sling.y) > 1 || Math.abs(sling.fy) > 0.5 ? "recoil" : "idle";
    VSTATE.boss = bossState();
    VSTATE.power = Object.keys(powers).filter(powerOn).join(" ");
  }
  // the boss as the picture sees it: coming in, holding still (the window to hit it), winding up, hurt, beaten
  function bossState() {
    const B = boss;
    if (!B) return "none";
    if (B.dead) return "defeat";
    if (B.t < (B.entry || 0)) return "enter";
    if (B.hurt > 0.5) return "hit";
    if (B.state) return B.state();
    if (B.seg && B.plan) { const q = B.pathAt(B.t), S = B.seg, u = B.t - S.t0; return q.tell > 0 || u > S.hold + S.tell ? "attack" : "vulnerable"; }
    if (B.volley) return B.volley.tell > 0 || B.spit > 0 ? "attack" : "vulnerable";
    return "vulnerable";
  }

  // ── squash and stretch, in one table. a < 1 squashes along dir, a > 1 stretches; springs do the overshoot.
  const SQUASH = {
    launch:  { a: 0.6, va: 11, k: 380, d: 9 },              // squashed along the launch line, overshooting into the stretch (the smear)
    perfect: { a: 1.3, k: 300, d: 9, dir: 0 },
    swish:   { a: 1.25, k: 300, d: 10, dir: -Math.PI / 2 },
    rim:     { a: 0.8, k: 320, d: 10, dir: 0 },
    bonk:    { a: 0.55, k: 280, d: 7, dir: 0 },
    short:   { a: 0.55, k: 280, d: 7, dir: Math.PI / 2 },
    ground:  { a: 0.45, k: 260, d: 6, dir: Math.PI / 2 },
    bounce:  { a: 0.7, k: 260, d: 6, dir: Math.PI / 2 },
    flight:  { stretch: 0.12 },                             // extra length at full speed, along the line of flight
    aim:     { squash: 0 }                                  // the skull keeps its shape in the pouch; the launcher takes the strain
  };
  function squashSkull(kind, strength = 1, dir) {
    const Q = SQUASH[kind]; if (!Q || Q.a == null) return;
    const k = clamp(strength, 0.5, 1.5);
    kick(rig, clamp(1 + (Q.a - 1) * k, 0.35, 1.9), (Q.va || 0) * k, dir != null ? dir : Q.dir, Q.k, Q.d);
  }

  // ── the pose library: every drawing the skull can show, as data. The skull is only a skull (no body, no limbs),
  // so a pose is a face, a socket size, and sometimes an extra drawing: the smear, the shiver at full draw.
  //   face:  a face from faceFor ("mood" = whatever the game last set)       eyes: socket scale
  //   twos:  a slow pose, drawn on twos (12 a second); action is drawn on ones (24)
  //   smear: the smear drawing behind the skull                               tremble: the full-draw shiver
  //   effort: strain lines flicking off the cranium
  const POSES = {
    idle:         { face: "mood", twos: true },
    aim:          { face: "aim", twos: true },
    anticipation: { face: "strain", tremble: 0.04, effort: true },
    launch:       { face: "fear", eyes: 1.1 },
    smear:        { face: "fear", eyes: 1.2, smear: true },
    flight:       { face: "mood" },
    impact:       { face: "ouch" },
    rebound:      { face: "mood" },
    perfect:      { face: "perfect" },
    hit:          { face: "excited" },
    miss:         { face: "deadpan" },
    confused:     { face: "confused" },
    dizzy:        { face: "dizzy" },
    bossHit:      { face: "gleeful" },
    bossDefeat:   { face: "triumph" },
    death:        { face: "ko", twos: true }
  };
  const MOOD_POSE = { perfect: "perfect", excited: "hit", confused: "confused", dizzy: "dizzy", deadpan: "miss" };
  const MAKES = { perfect: 1, swish: 1, rim: 1 };
  const SMEAR_K = [1, 0.62, 0.36];                        // the smear thins out over its drawings
  const SHIVER = [[1, 0], [-0.8, 0.6], [0.6, -0.8], [-1, -0.2]];   // the full-draw shiver, one offset a drawing on twos
  const VPOSE = { id: "idle", at: 0, n: 0, hold: null, holdUntil: 0, log: [] };
  function posePick() {
    const S = VSTATE.skull;
    if (S === "ko") return "death";
    if (S === "aim" || S === "anticipation" || S === "launch" || S === "smear") return S;
    if (VPOSE.hold && VCLOCK.t < VPOSE.holdUntil && game.state === "flying") return VPOSE.hold;   // a moment the director holds (a boss hit, a knockout)
    if (S === "impact") return lastImpact && MAKES[lastImpact.kind] ? MOOD_POSE[rig.mood] || "hit" : "impact";   // a make lands on its happy drawing, anything else on the ouch
    if (S === "idle" || S === "recover") return "idle";
    return MOOD_POSE[rig.mood] || (S === "miss" ? "miss" : "flight");
  }
  function poseFace(id, t) {
    const P = POSES[id] || POSES.idle, m = P.face === "mood" ? rig.mood : P.face;
    let f;
    if (m === "aim" || m === "strain") f = faceFor(m, t, { ten: aim.tension, lx: clamp(aim.AX / AIM_X_MAX, -1, 1), ly: clamp(-0.25 - (aim.AY - AIM_Y_MIN) / (AIM_Y_MAX - AIM_Y_MIN), -1, 0) });
    else if (m === "idle") f = faceFor("idle", t, { lx: clamp(ring.x / 2, -0.7, 0.7), ly: -0.5 });
    else f = faceFor(m, t);
    if (P.eyes) { f.sockL *= P.eyes; f.sockR *= P.eyes; }
    return f;
  }

  // ── the target's own squash: a quick spring along the line of a contact
  const targetSq = { v: 0, vv: 0, dir: 0 };

  // ── impacts: one event, many consequences
  // strength 1 is a normal throw meeting the ring; Skull Rush and big drops hit harder, late bounces softer.
  // fx names the moment's recipe (its weight and its timeline, in the director); snd are the contact sounds;
  // star is the contact drawing; tstate the target's reaction; pose a drawing the skull holds after it.
  const IMPACT_REF = (() => { const T = FLIGHT_T, vy = (RING_Y - START_Y + 0.5 * G * T * T) / T - G * T; return Math.hypot(vy, RING_Z / T); })();
  const GROUND_REF = 6;
  const IMPACT_FX = {
    perfect: { fx: "perfect", tstate: "perfect", jolt: ["perfect"], squash: "perfect", flash: 1, sparkle: true, wave: true, pulse: 0.35, spin: 16, hat: [3, 6], freeze: 0.06, slowmo: 0.12, screen: true, cam: "perfect", snd: [["swish", 1]], transient: true },
    swish:   { fx: "hit", tstate: "hit", jolt: ["swish"], squash: "swish", flash: 1, sparkle: true, wave: true, pulse: 0.3, snd: [["swish", 1]] },
    rim:     { fx: "hit", tstate: "hit", jolt: ["swish"], squash: "rim", flash: 1, sparkle: true, wave: true, wobble: 1, target: 0.08, sparks: 12, snd: [["clank", 0.55], ["swish", 1]], transient: true, star: "rim" },
    clank:   { fx: "miss", tstate: "bonk", jolt: ["bonk"], squash: "bonk", wobble: 1, target: 0.12, sparks: 12, hat: [6.5, 14], snd: [["clank", 1], ["bonk", 1]], transient: true, star: "bonk" },
    post:    { fx: "miss", tstate: "bonk", jolt: ["bonk"], squash: "bonk", wobble: 0.6, target: 0.05, sparks: 8, hat: [6.5, 14], snd: [["clank", 0.8], ["bonk", 1]], transient: true, star: "bonk" },
    seed:    { fx: "miss", jolt: ["bonk"], squash: "bonk", sparks: 8, hat: [6.5, 14], snd: [["bonk", 1]], transient: true, star: "bonk" },
    short:   { fx: "miss", jolt: ["bonk", "thud"], squash: "ground", dust: 10, hat: [6.5, 14], snd: [["thud", 1], ["bonk", 1]], transient: true, boing: true, star: "ground" },
    ground:  { fx: "miss", jolt: ["thud"], squash: "ground", dust: 10, snd: [["thud", 1]], transient: true, boing: true, star: "ground" },
    bounce:  { squash: "bounce", dust: 4, snd: [["thud", 0.45]] },
    boss:    { fx: "bossHit", tstate: "bossHit", jolt: ["boss"], snd: [["doonk", 1]], transient: true, screen: true, star: "boss", pose: "bossHit" },
    ko:      { fx: "bossDefeat", tstate: "defeat", jolt: ["ko"], freeze: 0.22, snd: [["doonk", 1], ["ko", 1]], transient: true, screen: true, star: "ko", pose: "bossDefeat", cam: "defeat" },
    blast:   { fx: "perfect", jolt: ["perfect"], freeze: 0.12 },
    death:   { fx: "miss", jolt: ["ko"] }
  };
  let lastImpact = null;
  // o: { at (screen point of the event), hit (screen point of the contact), strength, pan }
  function triggerImpact(kind, o = {}) {
    const I = IMPACT_FX[kind]; if (!I) return;
    const s = o.strength == null ? 1 : o.strength, k = clamp(s, 0.4, 1.6), at = o.at, hit = o.hit || at, pan = o.pan || 0;
    const R = I.fx ? FX_RECIPES[I.fx] : null, fk = clamp(k * (R ? R.intensity / FX_REF : 1), 0.4, 1.6);   // how hard it hit × how big a moment it is
    keyFrame();   // the contact gets a drawing of its own, on the frame it happens
    // the contact itself: jolt, squash (as hard as it physically hit), spin, hat, the target's reaction, the hold
    if (I.jolt) for (const j of I.jolt) camJolt(j, fk);
    if (I.squash) squashSkull(I.squash, s);
    if (I.spin) skull.spin = (skull.spin < 0 ? -1 : 1) * I.spin;
    if (I.hat) hatPop(I.hat[0] * clamp(k, 0.7, 1.3), (Math.random() < 0.5 ? -1 : 1) * I.hat[1]);
    if (I.wobble) ring.wobble = Math.max(ring.wobble, I.wobble * clamp(k, 0.6, 1.3));
    if (I.pulse) ring.wobble = Math.max(ring.wobble, I.pulse);
    if (I.target && hit && at) { targetSq.v = I.target * clamp(k, 0.6, 1.5); targetSq.vv = 0; targetSq.dir = Math.atan2(hit.y - at.y, hit.x - at.x); }
    if (I.tstate) setTargetState(I.tstate);
    if (I.slowmo && !reduceMotion) game.slowmo = I.slowmo;
    if (I.freeze) freezeFrame(I.freeze);   // the contact hold
    if (I.squash) setSkullState("impact");
    VSTATE.cameraHold = R ? R.dur * FX_TIMELINE.settle : HOLD.cameraHit;
    setCameraState(I.cam || (I.jolt ? "impact" : VSTATE.camera));
    lastImpact = { kind, fx: I.fx || null, intensity: R ? R.intensity : 0, strength: +s.toFixed(3), a: +rig.a.toFixed(3), t: +VCLOCK.t.toFixed(3) };
    directImpact(kind, I, { at, hit, pan, k, fk, R });   // …and the director lays out the rest: burst, flash, dust, sounds, settle
  }

  // ── gameplay → visuals
  const powerGlow = { t: 0, color: CREAM };   // a ring of light round the skull when a power-up is picked up
  function visualEmit(event, d = {}) {
    switch (event) {
      case "start": Object.assign(sling, { x: 0, y: 0, vx: 0, vy: 0, fy: 0, vfy: 0, sq: 0, vsq: 0 }); targetSq.v = targetSq.vv = 0; powerGlow.t = 0; lastImpact = null;
        VSTATE.log.length = 0; VPOSE.log.length = 0; setSkullState("idle"); setTargetState("idle"); setCameraState("idle"); VSTATE.stage = game.stage || 1; VPOSE.hold = null; directorReset(); break;
      case "throw": directLaunch(d); break;                // SQUASH → SMEAR → FLY: the band snaps, the camera snaps forward, the hat jumps
      case "score": directScore(d); break;                 // a make: the sting lands as the score pops
      case "miss": setSkullState("miss"); directMiss(); break;   // a clean miss: the hang, the look, the drop
      case "reload": directReload(); break;                // the next skull drops into the pouch
      case "recover": setSkullState("recover"); break;
      case "death": triggerImpact("death"); setSkullState("ko"); break;
      case "power": powerGlow.t = 0.7; powerGlow.color = (POWERS[d.id] && POWERS[d.id].color) || CREAM; break;
      case "transition": setCameraState("transition"); if (d.kind === "mini-out") setTargetState("settle"); break;
    }
  }

  // ── what each entity shows on the current drawing (held between drawings)
  const VENT = { skull: null, hat: null, sling: null, ring: null };
  function sampleEntities(force) {
    if (!force && !VCLOCK.fresh && VENT.skull) return;
    const t = clockT(), id = posePick(), P = POSES[id] || POSES.idle;
    if (id !== VPOSE.id) { VPOSE.id = id; VPOSE.at = VCLOCK.t; VPOSE.n = 0; VPOSE.log.push(id); if (VPOSE.log.length > 32) VPOSE.log.shift(); } else VPOSE.n++;
    // a slow pose keeps each drawing for two frames of film; action gets a new drawing every frame
    if (force || !P.twos || !VENT.skull || VENT.skull.pose !== id || VCLOCK.fresh12) {
      const tr = P.tremble ? SHIVER[VCLOCK.f12 & 3] : null, flying = game.state === "flying";
      VENT.skull = { a: rig.a, dir: rig.dir, tilt: rig.tilt, jaw: rig.jaw, angle: skull.angle, t, face: poseFace(id, t), pose: id,
        tremble: tr ? { x: tr[0] * P.tremble, y: tr[1] * P.tremble } : null, effort: P.effort ? 1 + (VCLOCK.f12 & 1) : 0,
        smear: P.smear ? SMEAR_K[Math.min(VPOSE.n, 2)] : 0, mdir: flying ? screenDir(skull) : rig.dir };
    }
    VENT.hat = hatState();
    VENT.sling = { x: sling.x, y: sling.y, fy: sling.fy, sq: sling.sq || 0 };
    VENT.ring = { t, sq: targetSq.v, dir: targetSq.dir };
  }

  // ── the visual update: everything that only changes the picture
  function visualUpdate(dt, frozen = false) {
    tickClock(dt);
    directorUpdate(dt, frozen);
    if (frozen) { updateCamera(dt); if (VCLOCK.fresh) sampleEntities(); return; }   // hit-stop: the contact drawing holds while the camera settles
    updateWorld(dt);
    ring.wobble = Math.max(0, ring.wobble - dt * 2.4); ring.flash = Math.max(0, ring.flash - dt * 2.6); ring.morph = Math.max(0, (ring.morph || 0) - dt / 1.4);
    targetSq.vv += (-520 * targetSq.v - 16 * targetSq.vv) * dt; targetSq.v += targetSq.vv * dt;
    powerGlow.t = Math.max(0, powerGlow.t - dt);
    if (game.state === "flying") {   // the skull in the air: a trail, a stretch that follows its speed, the "..." of a clean miss
      const s = skull, fade = game.result ? clamp(game.endTimer / 0.3, 0, 1) : 1;
      s.trail.push({ ...s.pos }); const T = TRAILS[cos.trail] || TRAILS.dust; while (s.trail.length > (T.len || 14)) s.trail.shift();
      emitTrail(s, fade, dt);
      if (!s.resting && !(s.hang > 0) && rig.a > 0.8) rig.dir = screenDir(s);
      if (game.result && rig.mood === "deadpan") rig.dots = Math.min(1, rig.dots + dt / 0.55);
    }
    updateHat(dt); updateSling(dt); updateRig(dt);
    const grav = U * 1.6;
    for (const p of particles) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += grav * dt * p.g; p.vx *= 1 - dt * 1.5; if (p.grow) p.size += p.grow * dt; if (p.vr) p.rot += p.vr * dt; }
    particles = particles.filter(p => p.life > 0);
    if (particles.length > PERF.particles) particles.splice(0, particles.length - PERF.particles);   // the budget: the oldest go first
    for (const b of bursts) b.t += dt; bursts = bursts.filter(b => b.t < b.dur);
    if (bursts.length > PERF.bursts) bursts.splice(0, bursts.length - PERF.bursts);
    for (const w of waves) w.t += dt; waves = waves.filter(w => w.t < w.dur);
    game.shake = Math.max(0, game.shake - dt * U * 0.08);
    updateCamera(dt);
    updateStates();
    sampleEntities();
  }

  const VisualSystem = {
    clock: VCLOCK, state: VSTATE, assets: ASSETS, poses: POSES,
    init() { visualEmit("start"); sampleEntities(true); },
    update: visualUpdate,
    render: () => draw(),
    setStage(n) { VSTATE.stage = n; },
    setSkullState, setTargetState, setCameraState,
    triggerImpact,
    triggerCameraJolt: (kind, strength = 1) => camJolt(kind, strength),
    setCamera(o = {}) { for (const k of ["x", "y", "z"]) if (o[k] != null) cam[k] = o[k]; },
    emit: visualEmit,
    cue: (name, o) => cue(name, o),
    entity: id => VENT[id],
    pose: () => VPOSE.id
  };
