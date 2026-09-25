  // ───────────────────────── the opening (v51): the logo, then the title in the dark, found by two spotlights ─────────────────────────
  // The title screen is already there, whole and working, behind closed curtains and in the dark; the lettering stands
  // in front of the curtains. Two stage lights in the bottom corners click on, hunt about the stage on their own, find
  // SKULL TOSS one after the other and hold on it; then the band hits, the curtains are pulled open, and the lights go
  // off and slide away out of the corners. Nothing waits on it: the buttons work from the start, and a tap skips ahead.
  const INTRO = { on: false, t0: 0, raf: 0, open: 0, lights: [], done: null };
  const INTRO_AT = { on: [0.6, 0.85], search: 0.9, find: [3.3, 3.6], lock: [3.9, 4.2], open: 4.7, end: 6.4 };
  const easeIO = k => (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2);
  function playIntro(done) {
    const T = $("title"), cv = $("introCv");
    INTRO.done = done || null;
    if (reduceMotion) { T.classList.remove("closed"); if (done) done(); return; }
    Object.assign(INTRO, { on: true, t0: performance.now(), open: 0, lights: [{ side: -1, on: 0, clicked: false }, { side: 1, on: 0, clicked: false }] });
    T.classList.add("closed", "dim"); cv.hidden = false;
    cancelAnimationFrame(INTRO.raf); INTRO.raf = requestAnimationFrame(introFrame);
  }
  // skip: straight to the curtains opening (or, once they are, to the end)
  function introSkip() { if (!INTRO.on) return; const e = (performance.now() - INTRO.t0) / 1000; if (e < INTRO_AT.open) INTRO.t0 = performance.now() - INTRO_AT.open * 1000; else INTRO.t0 = performance.now() - INTRO_AT.end * 1000; }
  document.addEventListener("pointerdown", introSkip, true);
  function introOpen() {
    const T = $("title"); INTRO.open = 1;
    T.classList.remove("closed"); T.classList.add("opening"); Sound.toon("stab"); buzz(12);
    setTimeout(() => T.classList.remove("opening"), 1900);
  }
  function introEnd() {
    INTRO.on = false; cancelAnimationFrame(INTRO.raf);
    const T = $("title"); T.classList.remove("closed", "dim", "lit"); $("introCv").hidden = true;
    if (!INTRO.open) introOpen();
    const d = INTRO.done; INTRO.done = null; if (d) d();
  }
  // where each light is pointing, in CSS pixels: hunting about, then onto the lettering
  function introAim(i, e, W, H, logo) {
    const L = INTRO.lights[i], sd = L.side, s = e - INTRO_AT.search;
    const hunt = { x: W * (0.5 + sd * 0.26 * Math.sin(s * (1.3 + i * 0.35) + i * 2.1) - sd * 0.08 * Math.cos(s * 2.3)), y: H * (0.45 + 0.28 * Math.sin(s * (0.9 + i * 0.5) + i)) };
    const home = { x: logo.x + sd * logo.w * 0.08, y: logo.y }, k = clamp((e - INTRO_AT.find[i]) / (INTRO_AT.lock[i] - INTRO_AT.find[i]), 0, 1), q = easeIO(k);
    return { x: hunt.x + (home.x - hunt.x) * q, y: hunt.y + (home.y - hunt.y) * q };
  }
  function introFrame(now) {
    if (!INTRO.on) return;
    const e = (now - INTRO.t0) / 1000, cv = $("introCv"), [c, r] = fitCanvas(cv), W = r.width, H = r.height;
    const lr = document.querySelector("#title .logo").getBoundingClientRect(), logo = { x: lr.left + lr.width / 2, y: lr.top + lr.height / 2, w: lr.width };
    if (e >= INTRO_AT.open && !INTRO.open) introOpen();
    if (e >= INTRO_AT.end) { introEnd(); return; }
    $("title").classList.toggle("lit", e >= INTRO_AT.lock[1] && e < INTRO_AT.open + 0.3);
    // the dark, lifting as the curtains part
    const dark = e < INTRO_AT.open ? 0.84 : 0.84 * (1 - clamp((e - INTRO_AT.open) / 1.4, 0, 1));
    const slide = clamp((e - INTRO_AT.open - 0.15) / 0.8, 0, 1), sq = slide * slide;   // the fixtures slide out once they're off
    const beams = [];
    INTRO.lights.forEach((L, i) => {
      if (!L.clicked && e >= INTRO_AT.on[i]) { L.clicked = true; Sound.toon("switch", L.side * 0.6); }
      const since = e - INTRO_AT.on[i], flick = since < 0 ? 0 : since < 0.05 ? 1 : since < 0.1 ? 0.25 : since < 0.16 ? 1 : since < 0.2 ? 0.55 : 1;
      L.on = e >= INTRO_AT.open ? Math.max(0, 1 - (e - INTRO_AT.open) / 0.18) : flick;
      const fx = W * (0.5 + L.side * 0.5) - L.side * (28 - sq * 120), fy = H - 22 + sq * 110;
      const aim = introAim(i, e, W, H, logo);
      beams.push({ fx, fy, aim, on: L.on, R: Math.max(70, Math.min(W, H) * 0.19) * (e >= INTRO_AT.lock[i] ? 1.12 : 1) });
    });
    // darkness, with each beam cut out of it
    c.fillStyle = `rgba(3,2,8,${dark})`; c.fillRect(0, 0, W, H);
    c.save(); c.globalCompositeOperation = "destination-out";
    for (const B of beams) if (B.on > 0) {
      const g = c.createRadialGradient(B.aim.x, B.aim.y, B.R * 0.35, B.aim.x, B.aim.y, B.R);
      g.addColorStop(0, `rgba(0,0,0,${B.on})`); g.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = g; c.beginPath(); c.arc(B.aim.x, B.aim.y, B.R, 0, TAU); c.fill();
      beamCone(c, B, `rgba(0,0,0,${0.45 * B.on})`);
    }
    c.restore();
    // the warm light itself: a haze down each beam and a pool where it lands
    c.save(); c.globalCompositeOperation = "lighter";
    for (const B of beams) if (B.on > 0) {
      beamCone(c, B, `rgba(255,214,140,${0.1 * B.on})`);
      const g = c.createRadialGradient(B.aim.x, B.aim.y, 0, B.aim.x, B.aim.y, B.R); g.addColorStop(0, `rgba(255,226,160,${0.22 * B.on})`); g.addColorStop(1, "rgba(255,226,160,0)");
      c.fillStyle = g; c.beginPath(); c.arc(B.aim.x, B.aim.y, B.R, 0, TAU); c.fill();
    }
    c.restore();
    for (const B of beams) drawStageLight(c, B.fx, B.fy, Math.atan2(B.aim.y - B.fy, B.aim.x - B.fx), B.on, Math.min(W, H) * 0.075);
    INTRO.raf = requestAnimationFrame(introFrame);
  }
  function beamCone(c, B, fill) {
    const a = Math.atan2(B.aim.y - B.fy, B.aim.x - B.fx), n = { x: -Math.sin(a), y: Math.cos(a) }, w0 = 10;
    c.fillStyle = fill; c.beginPath();
    c.moveTo(B.fx + n.x * w0, B.fy + n.y * w0); c.lineTo(B.aim.x + n.x * B.R * 0.9, B.aim.y + n.y * B.R * 0.9);
    c.lineTo(B.aim.x - n.x * B.R * 0.9, B.aim.y - n.y * B.R * 0.9); c.lineTo(B.fx - n.x * w0, B.fy - n.y * w0); c.closePath(); c.fill();
  }
  // a 1930s stage lantern on a yoke: a black can, a brass rim, a lens that glows when it's on
  function drawStageLight(c, x, y, ang, on, s) {
    c.save(); c.translate(x, y); c.lineJoin = "round";
    c.fillStyle = "#1A1714"; c.strokeStyle = INK; c.lineWidth = 2;
    c.beginPath(); c.moveTo(-s * 0.5, s * 0.9); c.lineTo(0, 0); c.lineTo(s * 0.5, s * 0.9); c.stroke();   // the yoke
    c.rotate(ang);
    c.beginPath(); rr(c, -s * 0.9, -s * 0.42, s * 1.3, s * 0.84, s * 0.14); c.fill(); c.stroke();
    c.fillStyle = "#3A322A"; for (let i = 0; i < 3; i++) c.fillRect(-s * 0.7 + i * s * 0.28, -s * 0.36, s * 0.1, s * 0.72);   // cooling fins
    c.fillStyle = "#C49A42"; c.beginPath(); rr(c, s * 0.34, -s * 0.5, s * 0.16, s * 1.0, s * 0.05); c.fill(); c.stroke();
    const g = c.createRadialGradient(s * 0.5, 0, 0, s * 0.5, 0, s * 0.5); g.addColorStop(0, on > 0 ? `rgba(255,248,220,${0.6 + 0.4 * on})` : "#4A4034"); g.addColorStop(1, on > 0 ? `rgba(255,200,110,${0.5 * on})` : "#2A241C");
    c.fillStyle = g; c.beginPath(); c.ellipse(s * 0.5, 0, s * 0.12, s * 0.42, 0, 0, TAU); c.fill(); c.stroke();
    c.restore();
  }
