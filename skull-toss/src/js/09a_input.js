  // ───────────────────────── input ─────────────────────────
  function pullOffset() {
    const L = pullMax(), maxLen = U * 0.2;
    let x, y;
    if (aim.source !== "key") { x = (aim.cx - aim.sx) * 0.6; y = (aim.cy - aim.sy) * 0.6; if (aim.upward) { x *= 0.25; y *= 0.25; } }
    else { x = aim.nx * L * 0.8 * 0.6; y = aim.ny * L * 0.6; }
    const len = Math.hypot(x, y);
    if (len > maxLen) { x *= maxLen / len; y *= maxLen / len; }
    return { x, y };
  }
  function refreshAim() {
    if (aim.source !== "key") {   // a finger, a mouse or the gamepad's stick: all three are a drag
      const m = mapDrag(aim.cx - aim.sx, aim.cy - aim.sy);
      aim.nx = m.nx; aim.ny = m.ny; aim.valid = m.valid; aim.upward = m.upward;
      aim.tension = aim.upward ? 0 : clamp(Math.hypot(aim.cx - aim.sx, aim.cy - aim.sy) / pullMax(), 0, 1);
    } else { aim.valid = true; aim.upward = false; aim.tension = clamp(Math.hypot(aim.nx * 0.8, aim.ny), 0, 1); }
    const a = aimPoint(aim.nx, aim.ny); aim.AX = a.AX; aim.AY = a.AY;
    if (aim.upward) setHint(t("hint.pullDown"), true);
    else if (hintEl.textContent === t("hint.pullDown")) setHint("");
  }
  function release() {
    if (!aim.active) return;
    if (aim.valid) { skull.pullOff = pullOffset(); launch(aim.AX, aim.AY); }
    else { aim.active = false; cvs.classList.remove("aiming"); Sound.slack(); if (aim.upward) { setHint(t("hint.pullRelease"), true); secretUpward(); } }
  }
  function cancelAim() { if (!aim.active) return; aim.active = false; cvs.classList.remove("aiming"); Sound.pullEnd(); }

  const firstGesture = () => { userActed = true; Sound.init(); };
  document.addEventListener("pointerdown", firstGesture, true);
  document.addEventListener("keydown", firstGesture, true);

  cvs.addEventListener("pointerdown", e => {
    if (Replay.play) return;   // (watching: the recording does the throwing)
    if (handHit(e.clientX, e.clientY)) { e.preventDefault(); misc.kind = null; foundSecret("caught"); Sound.toon("boing"); return; }   // caught the animator in the act
    if (game.state !== "ready" || aim.active || paused || sheet || screen !== "play") return;
    e.preventDefault();
    Object.assign(aim, { active: true, source: "pointer", id: e.pointerId, sx: e.clientX, sy: e.clientY, cx: e.clientX, cy: e.clientY });
    try { cvs.setPointerCapture(e.pointerId); } catch (_) {}
    cvs.classList.add("aiming"); refreshAim(); Sound.pullStart(); skullGrabbed();
  });
  cvs.addEventListener("pointermove", e => {
    if (!aim.active || aim.source !== "pointer" || e.pointerId !== aim.id) return;
    e.preventDefault(); aim.cx = e.clientX; aim.cy = e.clientY; refreshAim();
  });
  cvs.addEventListener("pointerup", e => { if (aim.active && aim.source === "pointer" && e.pointerId === aim.id) release(); });
  cvs.addEventListener("pointercancel", () => { if (aim.source === "pointer") cancelAim(); });
  cvs.addEventListener("contextmenu", e => e.preventDefault());

  window.addEventListener("keydown", e => {
    const k = e.key;
    if (Replay.play && screen === "play") { if (k === "Escape") { Replay.stop(true); e.preventDefault(); } return; }
    if (sheet) { if (k === "Escape") { $("sheet-" + sheet).querySelector("[data-back]").click(); e.preventDefault(); } return; }
    if (game.state === "continue") { if (k === "Escape") { declineContinue("no"); e.preventDefault(); } return; }
    if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
    if (screen === "pause") { if (k === "Escape" || k === "p" || k === "P") { resumeRun(); e.preventDefault(); } return; }
    if (reelSt.card && (k === " " || k === "Enter")) { skipReelCard(); e.preventDefault(); return; }
    if (screen !== "play" || game.state !== "ready") {
      if (inRun() && (k === "Escape" || k === "p" || k === "P")) { pauseRun(); e.preventDefault(); }
      return;
    }
    const arrows = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];
    if (arrows.includes(k) && !(aim.active && aim.source === "key")) { Object.assign(aim, { active: true, source: "key", nx: 0, ny: 0.42 }); Sound.pullStart(); skullGrabbed(); }
    if (k === "ArrowLeft") aim.nx = clamp(aim.nx + 0.035, -1, 1);
    else if (k === "ArrowRight") aim.nx = clamp(aim.nx - 0.035, -1, 1);
    else if (k === "ArrowUp") aim.ny = clamp(aim.ny + 0.025, 0, 1);
    else if (k === "ArrowDown") aim.ny = clamp(aim.ny - 0.025, 0, 1);
    else if ((k === " " || k === "Enter") && aim.active && aim.source === "key") { release(); e.preventDefault(); return; }
    else if (k === "Escape" || k === "p" || k === "P") { if (aim.active) cancelAim(); else pauseRun(); e.preventDefault(); return; }
    else return;
    e.preventDefault(); refreshAim();
  });

  // ── the gamepad: its left stick is a virtual drag, so it aims exactly as a finger pulling the pouch does ──
  // Pull the stick down (sideways steers: left throws right) and press A or the right trigger to let go. B lets the
  // band go slack, and so does letting the stick spring back to the middle. Start pauses and resumes. The menus are
  // still pointer and keyboard. Polled once a frame from the loop (and by the spec).
  const PAD_DEAD = 0.22;   // stick travel ignored around the middle
  const padIn = { prev: [] };   // the buttons held on the last poll
  function firstPad() {
    try { for (const g of navigator.getGamepads ? navigator.getGamepads() : []) if (g && g.connected !== false) return g; } catch (e) {}
    return null;
  }
  function pollPad() {
    const gp = firstPad();
    if (Replay.play) return;
    if (!gp) { if (aim.active && aim.source === "pad") cancelAim(); padIn.prev = []; return; }
    const held = i => !!(gp.buttons[i] && (gp.buttons[i].pressed || gp.buttons[i].value > 0.5)), pressed = i => held(i) && !padIn.prev[i];
    const sx = gp.axes[0] || 0, sy = gp.axes[1] || 0, mag = Math.hypot(sx, sy);
    if (pressed(9)) {
      if (screen === "pause") resumeRun();
      else if (inRun() && !sheet) { cancelAim(); pauseRun(); }
    } else if (reelSt.card && !paused && !sheet && (pressed(0) || pressed(7))) skipReelCard();   // A skips a title card
    else if (screen === "play" && game.state === "ready" && !paused && !sheet) {
      if (mag > PAD_DEAD) {
        const L = pullMax(), k = Math.min(1, (mag - PAD_DEAD) / (1 - PAD_DEAD)) / mag;   // full travel is a full draw
        if (!(aim.active && aim.source === "pad")) { Object.assign(aim, { active: true, source: "pad", sx: 0, sy: 0 }); cvs.classList.add("aiming"); Sound.pullStart(); skullGrabbed(); }
        aim.cx = sx * k * L; aim.cy = sy * k * L; refreshAim();
        if (pressed(0) || pressed(7)) release();
        else if (pressed(1)) cancelAim();
      } else if (aim.active && aim.source === "pad") cancelAim();
    }
    padIn.prev = gp.buttons.map((b, i) => held(i));
  }

  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", () => {
    Sound.suspend(document.hidden);
    if (document.hidden) { if (inRun() && !paused && !sandbox) { pauseRun(); saveRunSnapshot(); } }
    else Cloud.pull();
  });
