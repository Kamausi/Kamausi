  // ───────────────────────── the cartoon misbehaves ─────────────────────────
  // It's a 1933 print that has been through a fire, and now and then it acts up. Between throws in Story and
  // Arcade (never mid-flight, never in a boss fight or a cut-scene, never in the first five throws of a run) the
  // Mischief Director may roll one of six misbehaviours, at most one a map (one every forty throws in Arcade):
  //   jam        the projector jams: the picture shudders and holds, a burn bubbles through the film, then it runs on
  //   slip       the frame slips and rolls back into the gate, the frame line showing
  //   hand       the animator's gloved hand reaches in and pats Morty (tap it and you've caught him in the act)
  //   wrong      a few frames of the wrong reel's title card are spliced in
  //   wall       Morty turns to the camera and says something he shouldn't
  //   blot       an ink blot lands on the lens and slides off
  // All of it is picture only: nothing touches a throw. Settings → Mischief turns it off; reduced motion skips the
  // slip and the wrong reel; the Flashes setting dims the burn.
  const MISCHIEF = { chance: 0.07, minThrows: 5, arcadeGap: 40, kinds: ["jam", "slip", "hand", "wrong", "wall", "blot"] };
  const misc = { kind: null, t0: 0, dur: 0, lastMap: 0, lastThrow: -99, log: [], x: 0, y: 0 };
  const MISC_DUR = { jam: 1.0, slip: 0.6, hand: 1.8, wrong: 0.5, wall: 0.1, blot: 2.4 };   // (game seconds: a jam's 0.7 s hold comes on top)
  const mischiefOn = () => settings.mischief !== false && !(sandbox && !sandbox.mischiefOn);
  // after a throw has settled: roll for a misbehaviour
  function mischiefAfterThrow() {
    if (!mischiefOn() || misc.kind || boss || game.state !== "ready" || (game.mode !== "story" && game.mode !== "arcade") || game.throws < MISCHIEF.minThrows) return null;
    if (game.mode === "story" ? misc.lastMap === game.stage : game.throws - misc.lastThrow < MISCHIEF.arcadeGap) return null;
    if (runRand() > Flags.get("mischief.chance")) return null;   // (the live config can tune it: 03d_flags.js)
    let pool = MISCHIEF.kinds; if (reduceMotion) pool = pool.filter(k => k !== "slip" && k !== "wrong");
    return misbehave(pool[Math.floor(runRand() * pool.length)]);
  }
  function misbehave(kind) {
    if (misc.kind || game.state === "flying") return null;
    Object.assign(misc, { kind, t0: game.time, dur: MISC_DUR[kind], lastMap: game.stage, lastThrow: game.throws });
    misc.log.push(kind); if (misc.log.length > 20) misc.log.shift();
    Telemetry.emit("mischief", { kind, stage: game.stage });
    if (kind === "jam") { freezeFrame(0.7); Sound.toon("rumble"); }
    else if (kind === "slip") Sound.toon("whoosh");
    else if (kind === "hand") { const p = project(0, START_Y, 0); misc.x = p.x; misc.y = p.y; }
    else if (kind === "wrong") { const n = 1 + ((game.stage + 1 + Math.floor(runRand() * (MAP_COUNT - 1))) % MAP_COUNT); wrongReel(n); }
    else if (kind === "wall") { mortySays("meta", { priority: true }); setMood(rig, "deadpan", game.time); }
    else if (kind === "blot") { misc.x = rrIn(0.15, 0.85) * W; misc.y = rrIn(0.18, 0.4) * H; Sound.toon("plop"); }
    return kind;
  }
  function updateMischief() {
    if (!misc.kind) return;
    if (game.time - misc.t0 >= misc.dur) { if (misc.kind === "wrong") reelEl.hidden = true, reelEl.classList.remove("wrong"); misc.kind = null; }
  }
  // the spliced-in card: the reel card, stamped WRONG REEL, for half a second (it holds nothing up)
  function wrongReel(n) {
    const M = mapData(n);
    reelEl.dataset.kind = "title"; reelEl.classList.add("wrong"); reelEl.hidden = false;
    $("rcK").textContent = t("reel.k"); $("rcReel").textContent = t("reel.of", { reel: M.reel, total: t(`num.${MAP_COUNT}`) }); $("rcTitle").textContent = M.name; $("rcSub").textContent = t("mischief.wrong"); $("rcNote").textContent = "";
  }
  // drawn on the film, over everything: the jam's shudder and burn, the slip's roll, the hand, the blot
  function drawMischief(c) {
    const k = misc.kind; if (!k) return 0;
    const u = clamp((game.time - misc.t0) / misc.dur, 0, 1);
    if (k === "jam" && u > 0.45) {   // the burn: a bright bubble eats through the frame, ringed in brown
      const r = U * 0.5 * Math.pow((u - 0.45) / 0.55, 0.7), x = W * 0.5, y = H * 0.42, g = c.createRadialGradient(x, y, 0, x, y, Math.max(1, r));
      g.addColorStop(0, `rgba(255,248,225,${0.85 * flashK()})`); g.addColorStop(0.75, `rgba(255,214,150,${0.6 * flashK()})`); g.addColorStop(0.92, "rgba(90,45,15,.8)"); g.addColorStop(1, "rgba(90,45,15,0)");
      c.fillStyle = g; c.beginPath(); c.arc(x, y, Math.max(1, r), 0, TAU); c.fill();
    }
    if (k === "slip") {   // the frame line rolls down the screen as the picture drops back into the gate
      const y = H * (1 - u) - 6; c.fillStyle = INK; c.fillRect(0, y, W, 12); c.fillStyle = "rgba(242,231,201,.15)"; c.fillRect(0, y + 12, W, 2);
    }
    if (k === "hand") drawHand(c, u);
    if (k === "blot") {   // lands, then slides slowly down the lens
      const s = U * 0.09 * Math.min(1, u * 8), y = misc.y + u * u * H * 0.35;
      c.fillStyle = "rgba(23,19,15,.92)"; c.beginPath();
      for (let i = 0; i <= 14; i++) { const a = (i / 14) * TAU, rr = s * (0.75 + 0.35 * Math.sin(i * 2.7 + 1)); i ? c.lineTo(misc.x + Math.cos(a) * rr, y + Math.sin(a) * rr) : c.moveTo(misc.x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
      c.closePath(); c.fill(); c.fillRect(misc.x - s * 0.12, y - u * H * 0.2, s * 0.24, u * H * 0.2);
    }
  }
  // the animator's hand: a big white cartoon glove from the right edge, a pat on the head, then away
  function handAt(u) { const out = u < 0.35 ? u / 0.35 : u > 0.75 ? (1 - u) / 0.25 : 1; return { x: W + U * 0.2 - (W + U * 0.2 - misc.x - U * 0.12) * smooth(clamp(out, 0, 1)), y: misc.y - U * 0.18 + (u > 0.4 && u < 0.7 ? Math.abs(Math.sin((u - 0.4) * 30)) * U * 0.04 : 0) }; }
  function drawHand(c, u) {
    const p = handAt(u), s = U * 0.16;
    c.save(); c.translate(p.x, p.y); c.fillStyle = "#FBF6E6"; c.strokeStyle = INK; c.lineWidth = 3;
    c.beginPath(); c.ellipse(s * 1.8, s * 0.1, s * 1.6, s * 0.42, 0, 0, TAU); c.fill(); c.stroke();                       // the cuff and arm
    c.beginPath(); c.ellipse(0, 0, s * 0.7, s * 0.55, 0, 0, TAU); c.fill(); c.stroke();                                 // the palm
    for (let i = 0; i < 3; i++) { c.beginPath(); c.ellipse(-s * 0.72, -s * 0.32 + i * s * 0.3, s * 0.34, s * 0.13, 0.1, 0, TAU); c.fill(); c.stroke(); }   // three fingers and…
    c.beginPath(); c.ellipse(-s * 0.1, -s * 0.62, s * 0.14, s * 0.3, -0.5, 0, TAU); c.fill(); c.stroke();                 // …a thumb: four in all, as the style sheet required
    c.strokeStyle = "rgba(23,19,15,.5)"; c.lineWidth = 2; for (const dy of [-0.2, 0, 0.2]) { c.beginPath(); c.moveTo(s * 0.3, dy * s); c.lineTo(s * 0.55, dy * s); c.stroke(); }
    c.restore();
  }
  // a tap on the hand while it's in the picture: caught in the act
  function handHit(x, y) { if (misc.kind !== "hand") return false; const u = (game.time - misc.t0) / misc.dur, p = handAt(u); return Math.hypot(x - p.x, y - p.y) < U * 0.2; }

  // ───────────────────────── secrets ─────────────────────────
  // Nine things the game never tells you about. Each pays 150 bones once and goes in the Codex's Secrets tab, which
  // shows a hint for the ones still hidden. None can be found in Practice.
  const SECRETS = ["knock", "projector", "upside", "moon", "winks", "name", "thirteen", "caught", "showstopper"];
  const SECRET_PAY = 150;
  function foundSecret(id) {
    const P = realProfile();
    if (inPractice() || P.secrets.includes(id)) return false;
    P.secrets.push(id); addBones(SECRET_PAY);
    if (id === "projector" && !P.unlocked.includes("reel:twostrip")) P.unlocked.push("reel:twostrip");   // the old projector's code: a Two-Strip Color reel
    if (!sandbox) { toast(`<b>${t("secret.found")}</b> · ${t(`secret.${id}.name`)} · +${SECRET_PAY}`); Sound.unlock(); }
    Telemetry.emit("secret", { id }); persist(800); updatePips();
    return true;
  }
  const sec = { pokes: [], keys: [], quietSince: 0, slept: false };
  const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
  function secretPoke(now) {   // Morty on the title, poked thirteen times inside twenty seconds
    sec.pokes = sec.pokes.filter(t0 => now - t0 < 20).concat(now); sec.quietSince = now;
    if (sec.pokes.length >= 13) { sec.pokes = []; foundSecret("knock"); }
  }
  window.addEventListener("keydown", e => {   // the old projector's code, typed on the title screen
    if (screen !== "title" || sheet) return;
    sec.quietSince = uiNow(); sec.keys = sec.keys.concat(e.key.length === 1 ? e.key.toLowerCase() : e.key).slice(-KONAMI.length);
    if (sec.keys.join() === KONAMI.join()) { sec.keys = []; foundSecret("projector"); }
  });
  window.addEventListener("pointerdown", () => { sec.quietSince = uiNow(); sec.slept = false; }, true);
  function secretsTitleIdle(now) {   // left alone on the title for a minute, Morty drops off (Forty Winks)
    if (!sec.quietSince) sec.quietSince = now;
    if (!sec.slept && now - sec.quietSince > 60) { sec.slept = true; setMood(mascot.R, "sleep", now); foundSecret("winks"); }
    return sec.slept;
  }
  function secretsAfterThrow(kind, make) {
    const r = game.run;
    r.overRow = kind === "over" ? (r.overRow || 0) + 1 : 0;
    if (r.overRow >= 3) foundSecret("moon");
    if (make && game.stage === 7 && game.streak >= 13) foundSecret("thirteen");
    if (game.phase === "encore" && cans.length && !cansLeft() && game.throws - (r.bonusT0 || 0) <= 4) foundSecret("showstopper");   // (Can Alley in four throws, the fewest it can be)
  }
  function secretUpward() { game.run.upside = (game.run.upside || 0) + 1; if (game.run.upside >= 5) foundSecret("upside"); }
  function secretName(name) { if (/\bmort(y|imer)\b/i.test(name || "")) foundSecret("name"); }
