  // ───────────────────────── drawing the living graveyard ─────────────────────────
  function seg(c, x1, y1, x2, y2, w, col) { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); }
  function limb(c, x, y, a1, l1, a2, l2, w, col) { // two-segment limb hanging from (x,y); angles from vertical
    const kx = x + Math.sin(a1) * l1, ky = y + Math.cos(a1) * l1, fx = kx + Math.sin(a2) * l2, fy = ky + Math.cos(a2) * l2;
    c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(x, y); c.lineTo(kx, ky); c.lineTo(fx, fy); c.stroke();
  }
  // the wanderers, rubber-hose style: inked limbs, white gloves, pie-cut eyes
  const segI = (c, x1, y1, x2, y2, w, col) => { seg(c, x1, y1, x2, y2, w + 0.03, INK); seg(c, x1, y1, x2, y2, w, col); };
  const limbI = (c, x, y, a1, l1, a2, l2, w, col) => { limb(c, x, y, a1, l1, a2, l2, w + 0.03, INK); limb(c, x, y, a1, l1, a2, l2, w, col); return [x + Math.sin(a1) * l1 + Math.sin(a2) * l2, y + Math.cos(a1) * l1 + Math.cos(a2) * l2]; };
  function glove(c, x, y, r) { c.fillStyle = "#F7F1DF"; c.strokeStyle = INK; c.lineWidth = 0.014; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.stroke(); for (let k = 0; k < 2; k++) { c.beginPath(); c.arc(x + r * (0.5 + k * 0.45), y - r * 0.55, r * 0.42, 0, TAU); c.fill(); c.stroke(); } }
  function pieEye(c, x, y, rx, ry, lx = 0.3) { c.fillStyle = "#F7F1DF"; c.strokeStyle = INK; c.lineWidth = 0.012; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fill(); c.stroke(); const px = x + lx * rx * 0.4, py = y + ry * 0.1; c.fillStyle = INK; c.beginPath(); c.ellipse(px, py, rx * 0.5, ry * 0.62, 0, 0, TAU); c.fill(); c.fillStyle = "#F7F1DF"; c.beginPath(); c.moveTo(px, py); c.arc(px, py, rx * 0.66, -1.3, -0.6); c.closePath(); c.fill(); }
  function drawZombie(c, ph) {
    const bob = Math.abs(Math.sin(ph)) * 0.022, sw = Math.sin(ph), hy = -0.5 + bob, skin = "#86A870", rag = "#6A4A7E", ragD = "#4E3660", pants = "#4A5A6E";
    c.lineCap = "round"; c.lineJoin = "round";
    limbI(c, 0, hy, -sw * 0.18 + 0.05, 0.25, -sw * 0.12, 0.26, 0.075, "#3A4658");                        // dragging leg
    const fa = [0.46, -0.76 + bob + Math.sin(ph * 0.5) * 0.03]; segI(c, 0.12, -0.8 + bob, fa[0], fa[1], 0.05, "#6A8A58"); glove(c, fa[0] + 0.02, fa[1], 0.035);
    limbI(c, 0, hy, sw * 0.35 + 0.05, 0.25, sw * 0.3, 0.26, 0.08, pants);
    segI(c, 0, hy, 0.1, -0.84 + bob, 0.17, rag);
    c.fillStyle = ragD; c.beginPath(); c.moveTo(-0.08, hy - 0.02); c.lineTo(-0.05, hy + 0.08); c.lineTo(0.0, hy + 0.01); c.lineTo(0.05, hy + 0.09); c.lineTo(0.1, hy - 0.02); c.fill();
    c.strokeStyle = "#E8D8B8"; c.lineWidth = 0.008; c.beginPath(); for (let i = 0; i < 4; i++) { const y = hy - 0.08 - i * 0.06; c.moveTo(0.02 + i * 0.012, y); c.lineTo(0.08 + i * 0.012, y - 0.02); } c.stroke();   // (v50: stitches)
    c.fillStyle = "#8A6A3A"; c.strokeStyle = INK; c.lineWidth = 0.01; c.beginPath(); c.rect(0.05, hy - 0.2, 0.06, 0.05); c.fill(); c.stroke();   // a patch
    const na = [0.5, -0.82 + bob + Math.sin(ph * 0.5 + 1) * 0.03]; segI(c, 0.1, -0.82 + bob, na[0], na[1], 0.055, skin); glove(c, na[0] + 0.02, na[1], 0.04);
    c.fillStyle = skin; c.strokeStyle = INK; c.lineWidth = 0.014; c.beginPath(); c.ellipse(0.17, -0.95 + bob, 0.1, 0.09, 0.2, 0, TAU); c.fill(); c.stroke();
    pieEye(c, 0.19, -0.97 + bob, 0.032, 0.04, 0.6); pieEye(c, 0.25, -0.965 + bob, 0.026, 0.034, 0.6);
    c.fillStyle = "#2A1A14"; c.beginPath(); c.ellipse(0.23, -0.9 + bob, 0.03, 0.02 + Math.abs(Math.sin(ph * 0.5)) * 0.015, 0, 0, TAU); c.fill();
    c.strokeStyle = "#2A1A14"; c.lineWidth = 0.008; c.beginPath(); c.moveTo(0.1, -1.0 + bob); c.lineTo(0.16, -1.02 + bob); for (let i = 0; i < 3; i++) { c.moveTo(0.11 + i * 0.02, -1.03 + bob); c.lineTo(0.11 + i * 0.02, -0.99 + bob); } c.stroke();
  }
  function drawSkeleton(c, ph) {
    const bob = Math.abs(Math.sin(ph)) * 0.022, hy = -0.5 + bob, B = "#EDE3C8", Bf = "#B8AE96";
    c.lineCap = "round"; c.lineJoin = "round";
    for (const [p, col] of [[ph + Math.PI, Bf], [ph, B]]) {
      const a = Math.sin(p) * 0.45; limbI(c, 0, hy, a, 0.25, a - Math.max(0, Math.sin(p + 1.2)) * 0.5, 0.25, 0.03, col);
      const ua = -Math.sin(p) * 0.5, hand = limbI(c, 0.02, -0.8 + bob, ua, 0.2, ua + 0.35, 0.18, 0.026, col); glove(c, hand[0], hand[1], 0.03);
    }
    c.strokeStyle = INK; c.lineWidth = 0.06; c.beginPath(); c.moveTo(0, hy); c.quadraticCurveTo(0.05, -0.66 + bob, 0.02, -0.84 + bob); c.stroke(); c.strokeStyle = B; c.lineWidth = 0.035; c.stroke();
    for (const ry of [-0.62, -0.68, -0.74]) { c.lineWidth = 0.034; c.strokeStyle = INK; c.beginPath(); c.ellipse(0.03, ry + bob, 0.075, 0.026, 0, 0, TAU); c.stroke(); c.lineWidth = 0.018; c.strokeStyle = B; c.stroke(); }
    c.fillStyle = B; c.strokeStyle = INK; c.lineWidth = 0.014; c.beginPath(); c.ellipse(0.05, -0.93 + bob, 0.085, 0.08, 0, 0, TAU); c.fill(); c.stroke(); c.beginPath(); rr(c, 0.01, -0.88 + bob, 0.08, 0.05, 0.015); c.fill(); c.stroke();
    c.fillStyle = INK; c.beginPath(); c.ellipse(0.04, -0.935 + bob, 0.024, 0.03, 0, 0, TAU); c.ellipse(0.095, -0.93 + bob, 0.022, 0.028, 0, 0, TAU); c.fill();
    c.fillStyle = "#F7F1DF"; c.beginPath(); c.arc(0.047, -0.94 + bob, 0.008, 0, TAU); c.arc(0.1, -0.935 + bob, 0.007, 0, TAU); c.fill();
    c.strokeStyle = INK; c.lineWidth = 0.008; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(0.03 + i * 0.022, -0.875 + bob); c.lineTo(0.03 + i * 0.022, -0.84 + bob); c.stroke(); }
  }
  function drawWerewolf(c, ph, howl, t) {
    const fur = "#6A4A5A", far = "#4E3644";
    c.lineCap = "round"; c.lineJoin = "round"; c.fillStyle = fur; c.strokeStyle = INK; c.lineWidth = 0.014;
    const head = (x, y, up) => { c.fillStyle = fur; c.beginPath(); c.arc(x, y, 0.085, 0, TAU); c.fill(); c.stroke();
      c.beginPath(); if (up) { c.moveTo(x, y - 0.05); c.lineTo(x + 0.13, y - 0.19); c.lineTo(x + 0.07, y + 0.0); } else { c.moveTo(x + 0.04, y - 0.04); c.lineTo(x + 0.18, y + 0.01); c.lineTo(x + 0.05, y + 0.05); } c.closePath(); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(x - 0.06, y - 0.04); c.lineTo(x - 0.07, y - 0.16); c.lineTo(x + 0.0, y - 0.07); c.closePath(); c.fill(); c.stroke();
      pieEye(c, x + 0.03, y - 0.02, 0.022, 0.028, 0.5); c.fillStyle = "#E8D84A"; };
    if (howl) {
      const b = Math.sin(t * 5) * 0.01;
      limbI(c, -0.02, -0.5, 0.12, 0.26, -0.15, 0.25, 0.08, far); limbI(c, 0.04, -0.5, -0.1, 0.26, 0.12, 0.25, 0.09, fur);
      segI(c, 0, -0.5, 0.06, -0.86, 0.2, fur);
      const h = limbI(c, 0.06, -0.8, 0.9, 0.12, 2.6, 0.12, 0.05, fur); glove(c, h[0], h[1], 0.035);
      c.fillStyle = fur; c.beginPath(); c.moveTo(-0.08, -0.52); c.quadraticCurveTo(-0.3, -0.45, -0.34, -0.25); c.quadraticCurveTo(-0.22, -0.4, -0.04, -0.44); c.closePath(); c.fill(); c.stroke();
      head(0.1, -0.97 + b, true);
      return;
    }
    const s = Math.sin(ph), s2 = Math.sin(ph + Math.PI);
    limbI(c, -0.05, -0.5, s2 * 0.6, 0.24, s2 * 0.6 - 0.5, 0.26, 0.07, far);
    limbI(c, 0.2, -0.72, s * 0.7 + 0.2, 0.26, s * 0.4 + 0.5, 0.26, 0.055, far);
    c.fillStyle = fur; c.beginPath(); c.moveTo(-0.08, -0.52); c.quadraticCurveTo(-0.3, -0.58 + s * 0.03, -0.42, -0.5 + s * 0.04); c.quadraticCurveTo(-0.28, -0.48, -0.06, -0.46); c.closePath(); c.fill(); c.stroke();
    limbI(c, -0.05, -0.5, s * 0.6, 0.24, s * 0.6 - 0.5, 0.26, 0.08, fur);
    segI(c, -0.05, -0.52, 0.2, -0.76, 0.2, fur);
    limbI(c, 0.2, -0.72, s2 * 0.7 + 0.2, 0.26, s2 * 0.4 + 0.5, 0.26, 0.06, fur);
    head(0.32, -0.82, false);
  }
  function drawGhost(c, t, seed) {
    const fy = -(0.25 + Math.sin(t * 1.6 + seed) * 0.08);
    c.save(); c.globalAlpha *= 0.88;
    c.fillStyle = "#F2EEE4"; c.strokeStyle = INK; c.lineWidth = 0.018; c.beginPath(); c.moveTo(-0.28, -0.22 + fy);
    c.bezierCurveTo(-0.3, -0.9 + fy, 0.3, -0.9 + fy, 0.28, -0.22 + fy);
    for (let i = 1; i <= 6; i++) { const x = 0.28 - (0.56 * i) / 6; c.quadraticCurveTo(x + 0.047, -0.1 + fy + Math.sin(i * 1.7 + t * 4) * 0.05, x, -0.2 + fy); }
    c.closePath(); c.fill(); c.stroke();
    c.fillStyle = "rgba(160,190,200,.35)"; c.beginPath(); c.ellipse(0.12, -0.45 + fy, 0.08, 0.2, 0.2, 0, TAU); c.fill();
    const h = [0.3 + Math.sin(t * 3 + seed) * 0.05, -0.5 + fy]; glove(c, h[0], h[1], 0.035); glove(c, -0.3, -0.45 + fy + Math.sin(t * 3) * 0.04, 0.035);
    pieEye(c, -0.08, -0.62 + fy, 0.05, 0.065, 0.2); pieEye(c, 0.08, -0.62 + fy, 0.05, 0.065, 0.2);
    c.fillStyle = INK; c.beginPath(); c.ellipse(0, -0.46 + fy + Math.sin(t * 2) * 0.01, 0.035, 0.05, 0, 0, TAU); c.fill();
    c.restore();
  }
  function drawBat(c, x, y, s, f) {
    const up = -f * 0.9;
    c.save(); c.translate(x, y); c.scale(s, s); c.beginPath();
    c.moveTo(0, 0); c.quadraticCurveTo(-0.6, up - 0.4, -1.6, up); c.quadraticCurveTo(-1.3, up * 0.4 + 0.25, -1.05, up * 0.3 + 0.1);
    c.quadraticCurveTo(-0.8, up * 0.2 + 0.35, -0.55, 0.15); c.quadraticCurveTo(-0.35, 0.35, 0, 0.12);
    c.quadraticCurveTo(0.35, 0.35, 0.55, 0.15); c.quadraticCurveTo(0.8, up * 0.2 + 0.35, 1.05, up * 0.3 + 0.1);
    c.quadraticCurveTo(1.3, up * 0.4 + 0.25, 1.6, up); c.quadraticCurveTo(0.6, up - 0.4, 0, 0); c.fill();
    c.beginPath(); c.ellipse(0, 0.05, 0.22, 0.34, 0, 0, TAU); c.fill();
    c.beginPath(); c.moveTo(-0.14, -0.2); c.lineTo(-0.2, -0.52); c.lineTo(-0.02, -0.27); c.moveTo(0.14, -0.2); c.lineTo(0.2, -0.52); c.lineTo(0.02, -0.27); c.fill();
    if (s > 5) {   // v50: the wing's finger bones and two ember eyes, when it's near enough to see
      c.strokeStyle = "rgba(255,255,255,.16)"; c.lineWidth = 0.05; c.beginPath();
      for (const sd of [-1, 1]) { c.moveTo(0, 0); c.lineTo(sd * 1.6, up); c.moveTo(sd * 0.3, 0.02); c.lineTo(sd * 1.05, up * 0.3 + 0.1); c.moveTo(sd * 0.25, 0.08); c.lineTo(sd * 0.55, 0.15); }
      c.stroke(); c.fillStyle = "#FF7A4A"; c.beginPath(); c.arc(-0.07, -0.08, 0.045, 0, TAU); c.arc(0.07, -0.08, 0.045, 0, TAU); c.fill();
    }
    c.restore();
  }
  function drawCrowSil(c, x, y, s, f) {   // a crow: a heavier body and wide, slow wings
    const up = -f * 0.6; c.save(); c.translate(x, y); c.scale(s * 1.2, s * 1.2); c.beginPath();
    c.moveTo(-0.2, 0); c.quadraticCurveTo(-0.9, up - 0.3, -1.7, up + 0.1); c.lineTo(-1.3, up * 0.3 + 0.2); c.quadraticCurveTo(-0.7, 0.1, -0.2, 0.2);
    c.lineTo(0.2, 0.2); c.quadraticCurveTo(0.7, 0.1, 1.3, up * 0.3 + 0.2); c.lineTo(1.7, up + 0.1); c.quadraticCurveTo(0.9, up - 0.3, 0.2, 0); c.closePath(); c.fill();
    c.beginPath(); c.ellipse(0, 0.1, 0.3, 0.2, 0, 0, TAU); c.fill(); c.beginPath(); c.moveTo(0.28, 0.05); c.lineTo(0.55, 0.12); c.lineTo(0.28, 0.18); c.fill();
    if (s > 5) {   // v50: the flight feathers splayed at the tips, and a bright eye
      c.beginPath(); for (const sd of [-1, 1]) for (let i = 0; i < 4; i++) { const bx = sd * (1.25 + i * 0.13), by = up * (0.5 + i * 0.15) + 0.05; c.moveTo(bx, by); c.lineTo(bx + sd * 0.22, by + 0.12 - i * 0.02); c.lineTo(bx - sd * 0.04, by + 0.14); } c.fill();
      c.strokeStyle = "rgba(255,255,255,.14)"; c.lineWidth = 0.04; c.beginPath(); for (const sd of [-1, 1]) { c.moveTo(sd * 0.25, 0.05); c.quadraticCurveTo(sd * 0.8, up * 0.4 - 0.1, sd * 1.5, up + 0.12); } c.stroke();
      c.fillStyle = "#F2E7C9"; c.beginPath(); c.arc(0.2, 0.05, 0.05, 0, TAU); c.fill();
    }
    c.restore();
  }
  function drawWitch(c, x, y, s, dir, t) {
    const fl = Math.sin(t * 9) * 0.06;
    c.save(); c.translate(x, y); c.scale(dir * s, s); c.fillStyle = INK; c.strokeStyle = INK; c.lineCap = "round"; c.lineJoin = "round";
    c.lineWidth = 0.05; c.beginPath(); c.moveTo(-0.55, 0.12); c.lineTo(0.62, -0.02); c.stroke();
    c.beginPath(); c.moveTo(-0.5, 0.1); c.lineTo(-0.92, -0.06 + fl); c.lineTo(-0.95, 0.26 + fl); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(0.08, -0.42); c.quadraticCurveTo(-0.3, -0.35 + fl, -0.62, -0.2 + fl * 1.5); c.quadraticCurveTo(-0.3, -0.05, 0.02, 0.06); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(-0.06, 0.08); c.lineTo(0.16, 0.08); c.lineTo(0.1, -0.45); c.lineTo(0, -0.45); c.closePath(); c.fill();
    c.lineWidth = 0.045; c.beginPath(); c.moveTo(0.1, 0.06); c.lineTo(0.2, 0.2); c.lineTo(0.28, 0.2); c.stroke();
    c.beginPath(); c.moveTo(0.08, -0.35); c.lineTo(0.3, -0.12); c.lineTo(0.42, 0); c.stroke();
    c.beginPath(); c.arc(0.06, -0.53, 0.085, 0, TAU); c.fill();
    c.beginPath(); c.moveTo(0.13, -0.56); c.lineTo(0.23, -0.5); c.lineTo(0.13, -0.5); c.fill();
    c.beginPath(); c.ellipse(0.04, -0.6, 0.2, 0.035, -0.1, 0, TAU); c.fill();
    c.beginPath(); c.moveTo(-0.08, -0.6); c.lineTo(0.14, -0.62); c.quadraticCurveTo(0.02, -0.8, -0.14, -0.95 + fl * 0.5); c.quadraticCurveTo(-0.06, -0.78, -0.08, -0.6); c.fill();
    c.beginPath(); c.moveTo(-0.02, -0.55); c.quadraticCurveTo(-0.2, -0.45 + fl, -0.25, -0.3 + fl); c.lineTo(-0.02, -0.45); c.fill();
    c.restore();
  }
  // ── cels: a wanderer's pose is painted once into a little cel and then photographed every frame,
  // the way a 1930s studio shot one drawing at a time. Twelve poses to a cycle, so they step on twos.
  const CELS = 12;
  // each cel is trimmed to the drawing it holds, so there is no empty film to photograph
  const CEL_BOX = {
    zombie:   { x0: -0.27, y0: -1.11, x1: 0.65, y1: 0.15 },
    skeleton: { x0: -0.31, y0: -1.08, x1: 0.36, y1: 0.10 },
    werewolf: { x0: -0.53, y0: -1.23, x1: 0.71, y1: 0.13 },
    ghost:    { x0: -0.41, y0: -1.13, x1: 0.47, y1: -0.23 }
  };
  let celS = 0, cels = {};
  function walkerCelsResize() { cels = {}; celS = Math.max(14, projectBase(0, 0, 12.5).s * 1.85); }
  // v53: a walker close to the camera was its far-off drawing stretched, and went soft. Each drawing is now kept at a
  // few sizes (1×, 2×, 4×, 8× the far one) and drawn from the one that covers the size it's seen at, so it stays crisp
  // however near it comes.
  function walkerCel(type, i, howl, mult = 1) {
    const key = type + (howl ? "h" : "") + i + "@" + mult, had = cels[key];
    if (had) return had;
    if (!celS) walkerCelsResize();
    const S = celS * mult, B = CEL_BOX[type], w = Math.ceil((B.x1 - B.x0) * S), h = Math.ceil((B.y1 - B.y0) * S);
    const c = document.createElement("canvas"); c.width = Math.ceil(w * DPR); c.height = Math.ceil(h * DPR);
    const g = c.getContext("2d"), u = (i + 0.5) / CELS;
    g.setTransform(DPR * S, 0, 0, DPR * S, -B.x0 * S * DPR, -B.y0 * S * DPR);
    if (type === "zombie") drawZombie(g, u * TAU);
    else if (type === "skeleton") drawSkeleton(g, u * TAU);
    else if (type === "werewolf") drawWerewolf(g, u * TAU, howl, u * (TAU / 5));
    else drawGhost(g, u * (TAU / 1.6), 0);
    celLight(g, c, type);
    return (cels[key] = { c, w: w / mult, h: h / mult, ax: -B.x0 * S / mult, ay: -B.y0 * S / mult });   // (in the 1× cel's units, so it draws the same size)
  }
  // v50: every cel gets lit — a warm key from the upper left, a cool shadow to the lower right, the feet in shade,
  // and a thin rim of light on the lit edge — painted only over what's drawn (source-atop), once per cel
  function celLight(g, c, type) {
    const w = c.width, h = c.height;
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "source-atop";
    const d = g.createLinearGradient(0, 0, w, h); d.addColorStop(0, "rgba(255,236,200,.22)"); d.addColorStop(0.45, "rgba(255,236,200,0)"); d.addColorStop(0.6, "rgba(20,10,40,0)"); d.addColorStop(1, "rgba(20,10,40,.32)");
    g.fillStyle = d; g.fillRect(0, 0, w, h);
    if (type !== "ghost") { const v = g.createLinearGradient(0, 0, 0, h); v.addColorStop(0.72, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,.3)"); g.fillStyle = v; g.fillRect(0, 0, w, h); }
    g.globalCompositeOperation = "source-atop"; g.globalAlpha = 0.35; g.drawImage(c, -Math.max(1, w * 0.012), -Math.max(1, h * 0.008));   // (a faint offset copy: a rim on the lit edge)
    g.restore();
    if (type === "ghost") { g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "destination-over"; const r = g.createRadialGradient(w / 2, h * 0.45, 0, w / 2, h * 0.45, Math.max(w, h) * 0.6); r.addColorStop(0, "rgba(200,235,255,.28)"); r.addColorStop(1, "rgba(200,235,255,0)"); g.fillStyle = r; g.fillRect(0, 0, w, h); g.restore(); }
  }
  const celIndex = k => {
    const ph = k.type === "ghost" ? world.t * 1.6 + k.ph : k.ph;
    return ((Math.floor((ph / TAU) * CELS) % CELS) + CELS) % CELS;
  };
  function drawWalker(k) {
    const p = project(k.x, 0, k.z - 0), hp = k.h * p.s;
    if (k.scare) { p.y -= Math.sin(Math.min(1, k.scare) * Math.PI) * hp * 0.35; }
    if (p.x < -hp || p.x > W + hp) return;
    const a = k.alpha * clamp(1.1 - (k.z - 12) / 40, 0.6, 1);
    if (a <= 0.01) return;
    if (k.type !== "ghost") { ctx.fillStyle = `rgba(0,0,0,${0.3 * a})`; ctx.beginPath(); ctx.ellipse(p.x, p.y, hp * 0.18, hp * 0.035, 0, 0, TAU); ctx.fill(); }
    const need = hp / celS, mult = need <= 1 ? 1 : need <= 2 ? 2 : need <= 4 ? 4 : 8;
    const cel = walkerCel(k.type, celIndex(k), k.type === "werewolf" && k.state === "howl", mult), sc = hp / celS;
    ctx.save(); ctx.globalAlpha = a; ctx.translate(p.x, p.y); ctx.scale(k.dir * sc, sc);
    ctx.drawImage(cel.c, -cel.ax, -cel.ay, cel.w, cel.h);
    ctx.restore();
  }
  function drawSkyWorld() {
    const w = world, t = w.t;
    planeXform(ctx, 400, "sky");
    ctx.fillStyle = CREAM;
    for (const s of w.twinkles) { ctx.globalAlpha = 0.15 + 0.7 * Math.pow(Math.max(0, Math.sin(t * s.sp + s.ph)), 3); ctx.fillRect(s.x, s.y, s.r, s.r); }
    ctx.globalAlpha = 1;
    if (w.shooting) {
      const s = w.shooting, k = s.t / s.dur, len = U * 0.14, n = Math.hypot(s.vx, s.vy);
      const g = ctx.createLinearGradient(s.x, s.y, s.x - (s.vx / n) * len, s.y - (s.vy / n) * len);
      g.addColorStop(0, `rgba(237,230,214,${0.9 * (1 - k)})`); g.addColorStop(1, "rgba(237,230,214,0)");
      ctx.strokeStyle = g; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - (s.vx / n) * len, s.y - (s.vy / n) * len); ctx.stroke();
    }
    planeXform(ctx, 160, "sky");
    for (const c of w.clouds) { const sp = w.sprites[c.s]; if (!sp) continue; ctx.globalAlpha = c.a; ctx.drawImage(sp.c, c.x, c.y, sp.w, sp.h); }
    ctx.globalAlpha = 1;
    if (moon.r && moon.kind !== "screen") gpuLight(moon.x + camBase.x, moon.y + camBase.y, moon.r * 3.4, "242,231,201", 0.12);   // (the moon's light, on the GPU: 08j_gpu.js)
    if (moonLayer) {   // the clouds pass behind the moon: it is a face in the sky, not weather
      const M = moonLayer; planeXform(ctx, 400, "sky"); ctx.drawImage(M.c, M.x0, M.y0, M.w, M.h);
      const Sc = sceneFX.screen;   // the picture-house screen flickers with the projector (as much as Flashes allows)
      if (Sc) { ctx.fillStyle = `rgba(242,231,201,${(0.04 + 0.05 * Math.sin(t * 23) * Math.sin(t * 7)) * flashK()})`; ctx.fillRect(Sc.x - Sc.w / 2, Sc.y - Sc.h / 2, Sc.w, Sc.h); }
      planeXform(ctx, 160, "sky");
    }
    if (w.bolt && w.bolt.t < 0.26 && !(w.bolt.t > 0.07 && w.bolt.t < 0.14)) {
      ctx.save(); ctx.strokeStyle = CREAM; ctx.lineJoin = "round";
      for (const [pts, lw] of [[w.bolt.pts, 5], [w.bolt.branch, 2.8], [w.bolt.pts, 2.4], [w.bolt.branch, 1.3]]) { ctx.strokeStyle = lw > 2.5 && lw !== 2.4 ? "rgba(242,231,201,.3)" : CREAM; ctx.lineWidth = lw; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); }
      ctx.restore();
    }
    baseXform(ctx);
  }
  function drawSkyLife() {   // bats and the witch fly nearer than the skyline
    const w = world, t = w.t;
    planeXform(ctx, 40, "far");
    ctx.fillStyle = INK;
    for (const b of w.bats) (b.kind === "crow" ? drawCrowSil : drawBat)(ctx, b.x, b.y0 + Math.sin(b.ph * 0.18 * b.wob) * b.amp, b.sz, Math.sin(b.ph));
    if (w.witch) { const k = w.witch; drawWitch(ctx, k.x, k.y0 + Math.sin(k.ph * 2) * U * 0.012, U * 0.09, k.dir, t); }
    baseXform(ctx);
  }
  const walkerNear = k => game.state !== "title" && k.z < ring.z - 0.05;
  function drawNearWorld() {   // the wanderers and the cat between the ring and the camera, far to near, each with its shadow
    const ws = world.walkers.filter(walkerNear).sort((a, b) => b.z - a.z);
    const cat = GY.cat && game.state !== "title" ? GY.cat : null; let catDone = !cat;
    for (const k of ws) { if (!catDone && cat.z > k.z) { drawCat(); catDone = true; } drawWalker(k); }
    if (!catDone) drawCat();
  }
  function drawGroundWorld() {
    // the props are already in back-to-front order; the few wanderers are merged into it
    // v53: only the wanderers beyond the ring's depth go in here, behind the ring and its pole; the nearer ones are drawn
    // after it (drawNearWorld), so one walking between the ring and the camera passes in front of the pole, not behind it
    const ws = world.walkers.filter(k => !walkerNear(k)).sort((a, b) => b.z - a.z);
    let wi = 0, hazed = !TRAVEL.on;
    for (const k of GY.props) {
      if (k.travel) { if (!travelShows(k)) continue; if (!hazed && k.z < TRAVEL_HAZE_Z) { drawTravelHaze(); hazed = true; } }   // (the far scenery softens behind the haze: 06g_travel.js)
      while (wi < ws.length && ws[wi].z > k.z) drawWalker(ws[wi++]);
      if (k.travel) drawTravelProp(k); else drawProp(k);
    }
    if (!hazed) drawTravelHaze();
    while (wi < ws.length) drawWalker(ws[wi++]);
    const f = world.fogSprite;
    if (f) for (const b of world.fog) { const A = groundAt(b.y), x = W / 2 + (b.x - W / 2) * A.k + A.ox + camBase.x; ctx.globalAlpha = b.a; ctx.drawImage(f.c, x, A.y + camBase.y - (f.h * A.k) / 2, f.w * A.k, f.h * A.k); }
    ctx.globalAlpha = 1;
  }
