  // ───────────────────────── the lost reel: grain, dust, scratches, gate weave, iris ─────────────────────────
  // A separate canvas over everything, redrawn at 12 fps (film speed) so it costs almost nothing.
  // It never blocks input and it never covers the score in anything heavier than faint grain.
  const filmCv = $("film"), fctx = filmCv.getContext("2d");
  const film = { last: 0, weave: { x: 0, y: 0 }, scratches: [], tiles: [], tile: 0, iris: null, w: 0, h: 0, burn: 0 };
  const REELS = {
    standard: { dust: 1, scratch: 1, weave: 1, flicker: 0.6 },
    lost:     { dust: 2.6, scratch: 2.6, weave: 1.4, flicker: 1.2, tint: "rgba(120,80,30,.07)" },
    silent:   { dust: 1.6, scratch: 1.4, weave: 1.2, flicker: 1.6 },
    techni:   { dust: 0.6, scratch: 0.5, weave: 0.8, flicker: 0.4, tint: "rgba(255,120,60,.04)" },
    damaged:  { dust: 1.8, scratch: 2.2, weave: 3, flicker: 2.8, burns: true }
  };
  function makeGrain() {
    for (let k = 0; k < 4; k++) {
      const c = document.createElement("canvas"); c.width = c.height = 128;
      const g = c.getContext("2d"), img = g.createImageData(128, 128), d = img.data;
      for (let i = 0; i < d.length; i += 4) { const v = (Math.random() * 255) | 0; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
      g.putImageData(img, 0, 0); film.tiles.push(c);
    }
  }
  function applyReel() { document.body.dataset.reel = cos.reel || "standard"; }
  const gateWeave = () => film.weave;
  function filmTick(R, lvl) {
    const full = lvl === "full" && !reduceMotion;
    film.weave = full ? { x: (Math.random() - 0.5) * 0.9 * R.weave, y: (Math.random() - 0.5) * 1.1 * R.weave } : { x: 0, y: 0 };
    film.tile = (film.tile + 1) % 4;
    film.scratches = film.scratches.map(s => ({ ...s, x: s.x + s.dx, life: s.life - 1 })).filter(s => s.life > 0);
    if (full && Math.random() < 0.08 * R.scratch * QUALITY.grain) film.scratches.push({ x: Math.random() * film.w, dx: (Math.random() - 0.5) * 2, life: 3 + ((Math.random() * 8) | 0), light: Math.random() < 0.7, a: 0.08 + Math.random() * 0.12 });
    if (R.burns && full && flashK() === 1 && Math.random() < 0.012) film.burn = 3;
    else film.burn = Math.max(0, film.burn - 1);
  }
  function filmFrame(now) {
    const d = Math.min(1.5, window.devicePixelRatio || 1), w = Math.round(W * d), h = Math.round(H * d);
    if (filmCv.width !== w || filmCv.height !== h) { filmCv.width = w; filmCv.height = h; film.w = W; film.h = H; film.last = 0; }
    const lvl = settings.film, R = REELS[cos.reel] || REELS.standard;
    const due = now - film.last > 83;
    if (!due && !film.iris && !film.spot) return;
    if (due) { film.last = now; filmTick(R, lvl); }
    const c = fctx; c.setTransform(d, 0, 0, d, 0, 0); c.clearRect(0, 0, W, H);
    if (lvl !== "off" && !sandbox) {
      if (!film.tiles.length) makeGrain();
      const pat = c.createPattern(film.tiles[film.tile], "repeat");
      c.save(); c.translate((Math.random() * 128) | 0, (Math.random() * 128) | 0); c.globalAlpha = lvl === "full" ? 0.06 : 0.035; c.fillStyle = pat; c.fillRect(-128, -128, W + 256, H + 256); c.restore();
      if (R.tint) { c.fillStyle = R.tint; c.fillRect(0, 0, W, H); }
      const g = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.hypot(W, H) * 0.62);
      g.addColorStop(0, "rgba(10,8,6,0)"); g.addColorStop(1, lvl === "full" ? "rgba(10,8,6,.32)" : "rgba(10,8,6,.18)"); c.fillStyle = g; c.fillRect(0, 0, W, H);
      if (lvl === "full" && !reduceMotion) {
        const n = Math.round(Math.random() * 3 * R.dust * QUALITY.grain);
        for (let i = 0; i < n; i++) {
          const x = Math.random() * W, y = Math.random() * H, s = 0.6 + Math.random() * 2.2, ink = Math.random() < 0.7;
          c.globalAlpha = 0.35 + Math.random() * 0.35; c.fillStyle = ink ? INK : CREAM; c.strokeStyle = c.fillStyle;
          if (Math.random() < 0.3) { c.lineWidth = 0.8; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + s * 4, y + s * 2, x + s * 2, y + s * 6); c.stroke(); }
          else { c.beginPath(); c.arc(x, y, s, 0, TAU); c.fill(); }
        }
        for (const s of film.scratches) { c.globalAlpha = s.a; c.fillStyle = s.light ? CREAM : INK; c.fillRect(s.x, 0, 1, H); }
        c.globalAlpha = 1;
        drawCueMarks(c);   // the changeover cues between reels (09i_reel.js)
        const fl = (Math.random() - 0.5) * 0.05 * R.flicker * flashK();   // (the flicker is a flash too)
        c.fillStyle = fl > 0 ? `rgba(242,231,201,${fl})` : `rgba(10,8,6,${-fl})`; c.fillRect(0, 0, W, H);
        if (film.burn) { const bx = W * 0.8, by = H * 0.2, gr = c.createRadialGradient(bx, by, 0, bx, by, U * 0.4); gr.addColorStop(0, "rgba(255,244,210,.5)"); gr.addColorStop(1, "rgba(255,200,120,0)"); c.fillStyle = gr; c.fillRect(0, 0, W, H); }
      }
    }
    if (film.iris) drawIris(c, now);
    if (film.spot) drawSpot(c, now);
  }
  // the iris spot: the picture closes to a circle round one thing, holds, and opens again (a signature shot's hold)
  function irisSpot(x, y, dur = 0.9) { film.spot = { t0: performance.now(), x, y, dur: dur * 1000 }; }
  function drawSpot(c, now) {
    const S = film.spot, u = (now - S.t0) / S.dur; if (u >= 1) { film.spot = null; return; }
    const max = Math.hypot(W, H), small = U * 0.3, k = u < 0.25 ? 1 - Math.pow(u / 0.25, 1.4) : u < 0.7 ? 0 : Math.pow((u - 0.7) / 0.3, 1.3);
    const r = small + (max - small) * k;
    c.fillStyle = "rgba(23,19,15,.88)"; c.beginPath(); c.rect(0, 0, W, H); c.arc(S.x, S.y, r, 0, TAU, true); c.fill();
    c.strokeStyle = "rgba(242,231,201,.3)"; c.lineWidth = 2; c.beginPath(); c.arc(S.x, S.y, r, 0, TAU); c.stroke();
  }
  // the iris: the picture closes to a circle and opens on the next scene
  function irisTo(fn, cx = W / 2, cy = H / 2) {
    if (sandbox || reduceMotion || document.hidden || film.iris) { fn(); return; }
    film.iris = { t0: performance.now(), close: 190, open: 260, cx, cy, fn, swapped: false };
    Sound.toon("iris");
  }
  function drawIris(c, now) {
    const I = film.iris, t = now - I.t0, max = Math.hypot(Math.max(I.cx, W - I.cx), Math.max(I.cy, H - I.cy)) + 4;
    let k;
    if (t < I.close) k = 1 - Math.pow(t / I.close, 1.6);
    else { if (!I.swapped) { I.swapped = true; I.fn(); } k = Math.pow(Math.min(1, (t - I.close) / I.open), 1.3); }
    if (t >= I.close + I.open) { film.iris = null; return; }
    const r = Math.max(0, max * k);
    c.fillStyle = INK; c.beginPath(); c.rect(0, 0, W, H); c.arc(I.cx, I.cy, r, 0, TAU, true); c.fill();
    if (r > 2) { c.strokeStyle = "rgba(242,231,201,.25)"; c.lineWidth = 2; c.beginPath(); c.arc(I.cx, I.cy, r, 0, TAU); c.stroke(); }
  }
