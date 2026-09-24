  // ───────────────────────── signature shots ─────────────────────────
  // Some makes deserve a name. As a make goes through the ring it's judged against twelve signature shots: how deep
  // or how near the ring was, how far you led it, how far the wind carried the skull, a hazard it slipped past,
  // how dead-centre a perfect was, a perfect on the last skull or one that puts a boss down, three perfects running,
  // a Ghost Toss that phased through, a ring at the edge of the frame, and (as it flies on) a bonus target behind
  // the ring. Each pays 150 points × its rarity × the stage. Its name comes up over the picture and the cartoon camera
  // does something the rostrum can't (below). A throw can earn several: the rarest takes the card and the rest are
  // listed under it. Every one is counted on the profile (profile.shots), which the Shot Book builds on.
  const SHOT_PAY = 150, NEAR_PASS = 0.45;   // NEAR_PASS: how close (m) a hazard can pass and still count as threading the needle
  const SHOTS = [
    { id: "knockout",   rare: 5, cam: "hold",  test: F => F.perfect && F.bossDown },
    { id: "buzzer",     rare: 5, cam: "hold",  test: F => F.perfect && F.lastSkull },
    { id: "hattrick",   rare: 4, cam: "hold",  test: F => F.perfect && F.perfStreak === 3 },
    { id: "twofer",     rare: 4, cam: "crash", test: F => F.target },
    { id: "needle",     rare: 4, cam: "whip",  test: F => F.close },
    { id: "deadcentre", rare: 3, cam: "crash", test: F => F.perfect && F.d <= F.perfR * 0.3 },
    { id: "longbomb",   rare: 3, cam: "crash", test: F => F.ringZ >= 7.6 },
    { id: "windrider",  rare: 3, cam: "whip",  test: F => Math.abs(F.drift) >= 0.6 },
    { id: "leading",    rare: 2, cam: "whip",  test: F => F.lead >= 1.4 },
    { id: "pointblank", rare: 2, cam: "crash", test: F => F.ringZ <= 5 },
    { id: "corner",     rare: 2, cam: "whip",  test: F => Math.abs(F.ringX) >= 1.9 || F.ringY >= 3.35 || F.ringY <= 1.45 },
    { id: "phantom",    rare: 2, cam: "crash", test: F => F.ghosted }
  ];
  const SHOT_IDS = SHOTS.map(s => s.id), SHOT_BY = Object.fromEntries(SHOTS.map(s => [s.id, s]));
  const shotsOn = () => !(sandbox && !sandbox.shotsOn);   // (older tests count points without them)
  // what the throw did, read at the crossing (a make only)
  function flightFacts(kind) {
    const C = game.lastCross, s = skull, L = s.launchRing || { x: C.ringX, y: C.ringY, z: C.ringZ }, tc = C.t || s.flightTime;
    return { kind, perfect: kind === "perfect", d: C.d, perfR: C.perfR || 0, ringX: C.ringX, ringY: C.ringY, ringZ: C.ringZ,
      drift: 0.5 * (s.ax0 || 0) * tc * tc, lead: Math.hypot(C.ringX - L.x, C.ringY - L.y, C.ringZ - L.z),
      lastSkull: game.lives === 1, perfStreak: game.perfStreak, bossDown: !!(boss && boss.dead), ghosted: !!s.ghosted, close: !!s.close, target: false };
  }
  // judge a make as it goes through (called from resolve); the target shot is judged when the skull reaches one
  function judgeShots(kind, x, y) {
    if (!shotsOn()) return [];
    const F = flightFacts(kind), got = SHOTS.filter(S => S.test(F)).map(S => S.id);
    skull.shots = got.slice();
    if (got.length) awardShots(got, x, y);
    return got;
  }
  function targetShot(x, y) {   // a make that flies on into a bonus target: Two for One (once a throw)
    if (!shotsOn() || !game.result || !game.result.make || (skull.shots || []).includes("twofer")) return;
    (skull.shots = skull.shots || []).push("twofer"); awardShots(["twofer"], x, y);
  }
  function awardShots(ids, x, y) {
    ids = ids.slice().sort((a, b) => SHOT_BY[b].rare - SHOT_BY[a].rare);
    let pts = 0;
    for (const id of ids) {
      const S = SHOT_BY[id], p = Math.round((SHOT_PAY * S.rare * stageMult()) / 5) * 5;
      pts += p; profile.shots[id] = (profile.shots[id] || 0) + 1;
      game.run.shots = (game.run.shots || []).concat(id);
      if (profile.shots[id] === 1 && !sandbox) toast(`<b>${t("shot.new")}</b> · ${t(`shot.${id}.name`)}`);
      Telemetry.emit("signature", { id, stage: game.stage });
    }
    game.score += pts; profile.scoreTotal += pts; if (game.result) game.result.pts += pts;
    const top = ids[0], more = ids.length - 1;
    impact(t(`shot.${top}.name`).toUpperCase() + "!", W / 2, H * 0.58, { fill: GOLD, text: INK, scale: 0.72, delay: 0.45, bits: true,
      sub: more ? t("shot.bonusMore", { pts: fmtN(pts), n: more }) : t("shot.bonus", { pts: fmtN(pts) }) });
    flyPoints(`+${fmtN(pts)}`, W / 2, H * 0.62, true);
    camMove(SHOT_BY[top].cam, { x, y });
    mortySays("sig", { priority: SHOT_BY[top].rare >= 4, chance: 0.6 });
    challenge("shots", ids.length);
    srEl.textContent = `${t("shot.sr")}: ${ids.map(id => t(`shot.${id}.name`)).join(", ")}. +${pts}`;
  }

  // ───────────────────────── the cartoon camera ─────────────────────────
  // Moves the rostrum camera (04c_camera.js) can't make, because they move the whole painted frame rather than the
  // planes: a crash zoom (the frame punches in and springs back), a whip pan (a fast slide, the picture smeared), a
  // Dutch tilt (the frame leans for a beat, scaled up so no corner shows) and a hold (the reel stops and an iris
  // spot closes round the skull, then opens). A boss walks on to a Dutch tilt. They're done on the canvas element
  // itself, so the HUD stays level.
  // Camera: Gentle halves them; Still, or reduced motion, leaves them out (the hold still holds, without the iris).
  const CAMFX = {
    crash: { dur: 0.55, at: u => ({ s: 1 + 0.08 * Math.sin(Math.min(1, u / 0.25) * Math.PI / 2) * (u < 0.25 ? 1 : Math.max(0, 1 - (u - 0.25) / 0.75)) }) },
    whip:  { dur: 0.45, at: u => ({ x: 0.05 * Math.sin(u * TAU) * (1 - u), blur: 2.5 * Math.sin(u * Math.PI) }) },
    dutch: { dur: 1.3,  at: u => { const e = Math.sin(Math.min(1, u / 0.2, (1 - u) / 0.3) * Math.PI / 2); return { r: 3 * e, s: 1 + 0.11 * e }; } },
    hold:  { dur: 0.6,  at: () => ({}) }
  };
  const camfx = { kind: null, t0: 0, dur: 0, amp: 1, applied: "", log: [] };
  const camFxAmp = () => (reduceMotion || settings.camera === "still" ? 0 : settings.camera === "gentle" ? 0.5 : 1);
  function camMove(kind, at) {
    const M = CAMFX[kind]; if (!M) return;
    camfx.log.push(kind); if (camfx.log.length > 12) camfx.log.shift();
    if (kind === "hold") { freezeFrame(0.5); if (camFxAmp() && at) irisSpot(at.x, at.y, 0.9); }
    if (!camFxAmp()) return;
    Object.assign(camfx, { kind, t0: game.time, dur: M.dur, amp: camFxAmp() });
  }
  function updateCamFx() {
    let css = "", blur = 0;
    if (camfx.kind) {
      const u = (game.time - camfx.t0) / camfx.dur;
      if (u >= 1 || u < 0) camfx.kind = null;
      else {
        const v = CAMFX[camfx.kind].at(u), A = camfx.amp, s = 1 + ((v.s || 1) - 1) * A;
        css = `translateX(${((v.x || 0) * A * W).toFixed(1)}px) rotate(${((v.r || 0) * A).toFixed(2)}deg) scale(${s.toFixed(4)})`; blur = (v.blur || 0) * A;
      }
    }
    if (misc.kind === "jam" && game.time - misc.t0 < misc.dur * 0.55) css += ` translateY(${(Math.sin(performance.now() * 0.09) * 2.2).toFixed(1)}px)`;   // (real time: the game's clock is held)
    else if (misc.kind === "slip") css += ` translateY(${(-(1 - clamp((game.time - misc.t0) / misc.dur, 0, 1)) * H).toFixed(1)}px)`;
    const key = css + "|" + blur.toFixed(1);
    if (key !== camfx.applied) { camfx.applied = key; cvs.style.transform = css; cvs.style.filter = blur > 0.2 ? `blur(${blur.toFixed(1)}px)` : ""; }
  }
