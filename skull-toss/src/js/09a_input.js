  // ───────────────────────── input ─────────────────────────
  function pullOffset() {
    const L = pullMax(), maxLen = U * 0.2;
    let x, y;
    if (aim.source === "pointer") { x = (aim.cx - aim.sx) * 0.6; y = (aim.cy - aim.sy) * 0.6; if (aim.upward) { x *= 0.25; y *= 0.25; } }
    else { x = aim.nx * L * 0.8 * 0.6; y = aim.ny * L * 0.6; }
    const len = Math.hypot(x, y);
    if (len > maxLen) { x *= maxLen / len; y *= maxLen / len; }
    return { x, y };
  }
  function refreshAim() {
    if (aim.source === "pointer") {
      const m = mapDrag(aim.cx - aim.sx, aim.cy - aim.sy);
      aim.nx = m.nx; aim.ny = m.ny; aim.valid = m.valid; aim.upward = m.upward;
      aim.tension = aim.upward ? 0 : clamp(Math.hypot(aim.cx - aim.sx, aim.cy - aim.sy) / pullMax(), 0, 1);
    } else { aim.valid = true; aim.upward = false; aim.tension = clamp(Math.hypot(aim.nx * 0.8, aim.ny), 0, 1); }
    const a = aimPoint(aim.nx, aim.ny); aim.AX = a.AX; aim.AY = a.AY;
    if (aim.upward) setHint("Pull down, not up", true);
    else if (hintEl.textContent === "Pull down, not up") setHint("");
  }
  function release() {
    if (!aim.active) return;
    if (aim.valid) { skull.pullOff = pullOffset(); launch(aim.AX, aim.AY); }
    else { aim.active = false; cvs.classList.remove("aiming"); Sound.slack(); if (aim.upward) setHint("Pull down, then let go", true); }
  }
  function cancelAim() { if (!aim.active) return; aim.active = false; cvs.classList.remove("aiming"); Sound.pullEnd(); }

  const firstGesture = () => { userActed = true; Sound.init(); };
  document.addEventListener("pointerdown", firstGesture, true);
  document.addEventListener("keydown", firstGesture, true);

  cvs.addEventListener("pointerdown", e => {
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
    if (sheet) { if (k === "Escape") { closeSheet(); e.preventDefault(); } return; }
    if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
    if (screen === "pause") { if (k === "Escape" || k === "p" || k === "P") { resumeRun(); e.preventDefault(); } return; }
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

  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", () => {
    Sound.suspend(document.hidden);
    if (document.hidden) { if (inRun() && !paused && !sandbox) pauseRun(); }
    else Cloud.pull();
  });
