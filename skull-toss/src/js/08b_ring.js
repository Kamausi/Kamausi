  // ───────────────────────── drawing: rings (all styles; collision is the same for every one) ─────────────────────────
  function tubeRing(c, x, y, r, lw, R, t, flash) {
    const flick = R.flicker ? 0.8 + 0.2 * Math.sin(t * 11) * Math.sin(t * 3.7) : 1;
    c.save(); c.globalAlpha *= flick;
    for (const [w, a] of [[3.4 + flash * 2, 0.07 + flash * 0.08], [2.1, 0.14 + flash * 0.1]]) { // soft glow, no blur filter
      c.lineWidth = lw * w; c.strokeStyle = `rgba(${R.rgb},${a})`; c.beginPath(); c.arc(x, y, r, 0, TAU); c.stroke();
    }
    c.lineWidth = lw * 1.32; c.strokeStyle = INK; c.beginPath(); c.arc(x, y, r, 0, TAU); c.stroke();
    c.lineWidth = lw; c.strokeStyle = R.color; c.beginPath(); c.arc(x, y, r, 0, TAU); c.stroke();
    c.restore();
    c.lineCap = "round";
    c.lineWidth = lw * 0.34; c.strokeStyle = R.shade; c.beginPath(); c.arc(x, y, r + lw * 0.22, 0.12 * Math.PI, 0.88 * Math.PI); c.stroke();
    c.lineWidth = lw * 0.2; c.strokeStyle = R.hi; c.beginPath(); c.arc(x, y, r - lw * 0.14, 1.12 * Math.PI, 1.62 * Math.PI); c.stroke();
    c.lineCap = "butt";
  }
  function boneRing(c, x, y, r, lw, t) {
    // nine bones laid end to end, knuckle to knuckle, around the hole
    const n = 9, seg = TAU / n, len = 2 * r * Math.sin(seg / 2) * 1.04, w = lw * 0.62, k = lw * 0.5, d = r * Math.cos(seg / 2);
    c.save(); c.translate(x, y);
    for (const [w, a] of [[3, 0.06], [1.9, 0.12]]) { c.strokeStyle = `rgba(237,230,214,${a})`; c.lineWidth = lw * w; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.stroke(); }
    const shape = (o) => {
      c.beginPath();
      rr(c, d - w / 2 - o, -len / 2 + k * 0.6, w + 2 * o, len - k * 1.2, w / 2);
      for (const sy of [-1, 1]) for (const sx of [-1, 1]) { c.moveTo(d + sx * k * 0.62 + k + o, sy * (len / 2 - k * 0.75)); c.arc(d + sx * k * 0.62, sy * (len / 2 - k * 0.75), k + o, 0, TAU); }
    };
    for (let pass = 0; pass < 2; pass++) for (let i = 0; i < n; i++) {
      c.save(); c.rotate((i + 0.5) * seg + t * 0.05);
      if (pass === 0) { c.fillStyle = "#15110C"; shape(lw * 0.1); c.fill(); }
      else {
        const g = c.createLinearGradient(d - w, 0, d + w, 0);
        g.addColorStop(0, "#FFF8EA"); g.addColorStop(0.55, "#DDD1B7"); g.addColorStop(1, "#A3957A");
        c.fillStyle = g; shape(0); c.fill();
        c.strokeStyle = "rgba(90,75,55,.45)"; c.lineWidth = lw * 0.06;
        c.beginPath(); c.moveTo(d + w * 0.1, -len * 0.18); c.lineTo(d + w * 0.1, len * 0.14); c.stroke();
      }
      c.restore();
    }
    c.restore();
  }
  function chainRing(c, x, y, r, lw, R) {
    const n = 16, seg = TAU / n, ll = r * seg * 0.72;
    c.save(); c.translate(x, y);
    for (let pass = 0; pass < 2; pass++) for (let i = 0; i < n; i++) {
      c.save(); c.rotate(i * seg); c.translate(r, 0);
      const flat = i % 2 === 0;
      c.beginPath(); c.ellipse(0, 0, flat ? lw * 0.62 : lw * 0.26, ll, 0, 0, TAU);
      if (pass === 0) { c.strokeStyle = "#101216"; c.lineWidth = lw * 0.5; c.stroke(); }
      else {
        c.strokeStyle = R.color; c.lineWidth = lw * 0.3; c.stroke();
        c.strokeStyle = R.hi; c.lineWidth = lw * 0.09; c.beginPath(); c.ellipse(-lw * 0.05, 0, flat ? lw * 0.5 : lw * 0.18, ll * 0.85, 0, Math.PI * 1.1, Math.PI * 1.6); c.stroke();
      }
      c.restore();
    }
    c.restore();
  }
  function thornRing(c, x, y, r, lw, R, t) {
    c.save(); c.translate(x, y); c.lineCap = "round";
    c.strokeStyle = "#1D2613"; c.lineWidth = lw * 0.8; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.stroke();
    for (const [ph, col, wdt] of [[0, "#3E5226", 0.34], [Math.PI, "#55702F", 0.26]]) {
      c.strokeStyle = col; c.lineWidth = lw * wdt; c.beginPath();
      for (let i = 0; i <= 96; i++) { const a = (i / 96) * TAU, rr2 = r + Math.sin(a * 11 + ph) * lw * 0.22; const px = Math.cos(a) * rr2, py = Math.sin(a) * rr2; i ? c.lineTo(px, py) : c.moveTo(px, py); }
      c.stroke();
    }
    c.fillStyle = "#141B0C";
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * TAU + 0.1, out = i % 3 !== 1 ? 1 : -1, base = r + out * lw * 0.3, tip = r + out * lw * 1.05;
      const ca = Math.cos(a), sa = Math.sin(a), px = -sa, py = ca, bw = lw * 0.2;
      c.beginPath(); c.moveTo(ca * base + px * bw, sa * base + py * bw); c.lineTo(ca * tip, sa * tip); c.lineTo(ca * base - px * bw, sa * base - py * bw); c.closePath(); c.fill();
    }
    c.fillStyle = "#C0182A";
    for (const a of [0.7, 2.4, 3.9, 5.3]) { c.beginPath(); c.arc(Math.cos(a) * (r + lw * 0.4), Math.sin(a) * (r + lw * 0.4), lw * 0.18, 0, TAU); c.fill(); }
    c.restore();
  }
  function fireRing(c, x, y, r, lw, R, t, flash) {
    tubeRing(c, x, y, r, lw * 0.9, R, t, flash);
    c.save(); c.translate(x, y); c.globalCompositeOperation = "lighter";
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * TAU + t * 0.4, h = lw * (1.1 + 0.9 * Math.abs(Math.sin(t * 6 + i * 1.3))), bw = lw * 0.55;
      const ca = Math.cos(a), sa = Math.sin(a), px = -sa, py = ca, b0 = r + lw * 0.2, tip = b0 + h, sway = Math.sin(t * 8 + i) * lw * 0.3;
      const g = c.createLinearGradient(ca * b0, sa * b0, ca * tip, sa * tip);
      g.addColorStop(0, "rgba(255,120,40,.85)"); g.addColorStop(1, "rgba(255,220,140,0)");
      c.fillStyle = g; c.beginPath(); c.moveTo(ca * b0 + px * bw, sa * b0 + py * bw);
      c.quadraticCurveTo(ca * (b0 + h * 0.5) + px * (bw + sway), sa * (b0 + h * 0.5) + py * (bw + sway), ca * tip + px * sway, sa * tip + py * sway);
      c.quadraticCurveTo(ca * (b0 + h * 0.5) - px * bw, sa * (b0 + h * 0.5) - py * bw, ca * b0 - px * bw, sa * b0 - py * bw); c.closePath(); c.fill();
    }
    c.restore();
  }
  function portalRing(c, x, y, r, lw, R, t, flash) {
    c.save(); c.translate(x, y);
    const g = c.createRadialGradient(0, 0, r * 0.2, 0, 0, r);
    g.addColorStop(0, "rgba(40,10,80,0)"); g.addColorStop(0.8, "rgba(60,20,120,.18)"); g.addColorStop(1, "rgba(90,40,180,.32)");
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
    c.globalCompositeOperation = "lighter"; c.lineCap = "round";
    for (let i = 0; i < 4; i++) {
      const rad = r * (0.86 - i * 0.14), a0 = t * (1.2 + i * 0.5) * (i % 2 ? -1 : 1) + i;
      c.strokeStyle = `rgba(180,140,255,${0.32 - i * 0.05})`; c.lineWidth = lw * (0.26 - i * 0.04);
      c.beginPath(); c.arc(0, 0, rad, a0, a0 + Math.PI * 0.9); c.stroke();
      c.beginPath(); c.arc(0, 0, rad, a0 + Math.PI, a0 + Math.PI * 1.6); c.stroke();
    }
    c.restore();
    tubeRing(c, x, y, r, lw, R, t, flash);
  }
  function hoopRing(c, x, y, r, lw, R, t) {   // a circus hoop: red and cream candy stripes, inked
    c.save(); c.translate(x, y);
    c.lineWidth = lw * 1.36; c.strokeStyle = INK; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.stroke();
    c.lineWidth = lw; c.strokeStyle = CREAM; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.stroke();
    const n = 16, seg = TAU / n; c.strokeStyle = R.color; c.lineCap = "butt";
    for (let i = 0; i < n; i += 2) { const a = i * seg + t * 0.3; c.beginPath(); c.arc(0, 0, r, a, a + seg); c.stroke(); }
    c.lineCap = "round"; c.lineWidth = lw * 0.22; c.strokeStyle = "rgba(255,250,236,.75)"; c.beginPath(); c.arc(0, 0, r - lw * 0.18, Math.PI * 1.12, Math.PI * 1.6); c.stroke();
    c.lineWidth = lw * 0.3; c.strokeStyle = "rgba(23,19,15,.35)"; c.beginPath(); c.arc(0, 0, r + lw * 0.2, Math.PI * 0.12, Math.PI * 0.88); c.stroke();
    c.restore(); c.lineCap = "butt";
  }
  // painted rings: art/rings/<id>.webp, scaled so the hole in the picture is the hole you throw through
  const ringImgs = {};
  function ringArt(id) {
    const A = RING_ART[id];
    if (!A) return null;
    let im = ringImgs[id];
    if (!im) { im = ringImgs[id] = new Image(); im.decoding = "async"; im.src = A.src; }
    return im.complete && im.naturalWidth ? { im, A } : null;
  }
  function paintedRing(c, x, y, r, lw, art, flash) {
    const { im, A } = art, hole = Math.max(1, r - lw / 2), half = hole / A.inner;
    if (flash > 0) {                                   // a warm bloom behind it when a skull drops through
      const g = c.createRadialGradient(x, y, hole * 0.6, x, y, half * 1.25);
      g.addColorStop(0, `rgba(255,236,190,${flash * 0.35})`); g.addColorStop(1, "rgba(255,236,190,0)");
      c.fillStyle = g; c.fillRect(x - half * 1.3, y - half * 1.3, half * 2.6, half * 2.6);
    }
    c.drawImage(im, x - half, y - half, half * 2, half * 2);
    if (flash > 0) {                                   // and the ring itself lights up
      c.save(); c.globalCompositeOperation = "lighter"; c.globalAlpha = flash * 0.55;
      c.drawImage(im, x - half, y - half, half * 2, half * 2); c.restore();
    }
  }
  function drawRingShape(c, x, y, r, lw, id, t, flash = 0) {
    const R = RINGS[id] || RINGS.hoop;
    const art = ringArt(id);
    if (art) { paintedRing(c, x, y, r, lw, art, flash); return; }
    if (R.style === "hoop") hoopRing(c, x, y, r, lw, R, t);
    else if (R.style === "bones") boneRing(c, x, y, r, lw, t);
    else if (R.style === "chain") chainRing(c, x, y, r, lw, R);
    else if (R.style === "thorn") thornRing(c, x, y, r, lw, R, t);
    else if (R.style === "fire") fireRing(c, x, y, r, lw, R, t, flash);
    else if (R.style === "portal") portalRing(c, x, y, r, lw, R, t, flash);
    else if (RING_STYLES[R.style]) RING_STYLES[R.style](c, x, y, r, lw, R, t, flash);
    else tubeRing(c, x, y, r, lw, R, t, flash);
    if (flash > 0) { c.lineWidth = lw; c.strokeStyle = `rgba(255,248,236,${flash * 0.9})`; c.beginPath(); c.arc(x, y, r, 0, TAU); c.stroke(); }
  }
