  // ───────────────────────── Morty's body parts and the new slots (v44) ─────────────────────────
  // Drawn in skull units (r = 1, the cranium's crown at about y = −1.05, the jaw from y ≈ 0.45), inside drawSkull, so
  // every place that draws Morty (the play, the Vault, the board, the icons) draws them too. Wings go behind the skull;
  // hair sits on the crown (under any hat), facial hair on the jaw and drops with it. Wizard Mort adds his beard here and
  // his hat as a hat (hatOf). The launcher's frames are at the end.
  const HAIR_COL = { bun: "#3A2A1E", flattop: "#2A2220", pompadour: "#2A1E18", pigtails: "#C8642A", mohawk: "#A94332", mullet: "#6A4A2E", afro: "#2A1E18", flame: "#E8893A", vines: "#5E7A36", quiff: "#1E1C22", moss: "#5A6A4A" };
  const inkB = (c, col) => { c.fillStyle = col; c.fill(); c.stroke(); };
  // v50: hair with body — a sheen from the crown down, a few strands and a highlight, all inside the shape, then the ink
  const shadeHex = (hex, k) => { const n = parseInt(hex.slice(1), 16), f = v => Math.round(clamp(k > 0 ? v + (255 - v) * k : v * (1 + k), 0, 255)); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; };
  const hairB = (c, col, y0 = -1.6, y1 = -0.75) => {
    const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, shadeHex(col, 0.28)); g.addColorStop(0.55, col); g.addColorStop(1, shadeHex(col, -0.35));
    c.fillStyle = g; c.fill(); c.save(); c.clip();
    c.strokeStyle = shadeHex(col, -0.45); c.lineWidth = 0.022;
    for (let i = 0; i < 9; i++) { const x = -0.7 + i * 0.175; c.beginPath(); c.moveTo(x, y1 + 0.05); c.quadraticCurveTo(x + 0.12, (y0 + y1) / 2, x + 0.02, y0); c.stroke(); }
    c.strokeStyle = "rgba(255,255,255,.28)"; c.lineWidth = 0.05; c.beginPath(); c.moveTo(-0.4, y0 + (y1 - y0) * 0.45); c.quadraticCurveTo(-0.05, y0 + (y1 - y0) * 0.2, 0.3, y0 + (y1 - y0) * 0.38); c.stroke();
    c.restore(); c.strokeStyle = INK; c.lineWidth = 0.05; c.stroke();
  };
  const HAIR = {
    bun(c) { c.beginPath(); c.ellipse(0, -1.02, 0.62, 0.16, 0, Math.PI, 0); hairB(c, HAIR_COL.bun); c.beginPath(); c.arc(0.05, -1.22, 0.2, 0, TAU); hairB(c, HAIR_COL.bun); },
    flattop(c) { c.beginPath(); c.moveTo(-0.62, -0.85); c.lineTo(-0.58, -1.3); c.lineTo(0.58, -1.3); c.lineTo(0.62, -0.85); c.quadraticCurveTo(0, -1.02, -0.62, -0.85); hairB(c, HAIR_COL.flattop); },
    pompadour(c, t) { c.beginPath(); c.moveTo(-0.66, -0.82); c.quadraticCurveTo(-0.7, -1.2, -0.2, -1.22); c.bezierCurveTo(0.4, -1.5, 0.95, -1.35, 0.72, -1.05); c.quadraticCurveTo(0.7, -0.9, 0.64, -0.82); c.quadraticCurveTo(0, -1.0, -0.66, -0.82); hairB(c, HAIR_COL.pompadour);
      c.strokeStyle = "rgba(255,255,255,.3)"; c.beginPath(); c.moveTo(-0.1, -1.24); c.quadraticCurveTo(0.35, -1.4, 0.6, -1.2); c.stroke(); c.strokeStyle = INK; void t; },
    pigtails(c, t) { c.beginPath(); c.ellipse(0, -0.98, 0.64, 0.2, 0, Math.PI, 0); hairB(c, HAIR_COL.pigtails); for (const sd of [-1, 1]) { const sw = Math.sin(t * 3 + sd) * 0.08; c.beginPath(); c.ellipse(sd * 0.85, -0.6 + sw, 0.14, 0.34, sd * 0.4, 0, TAU); hairB(c, HAIR_COL.pigtails); } },
    mohawk(c) { c.beginPath(); c.moveTo(-0.12, -0.95); for (let i = 0; i <= 6; i++) { const x = -0.5 + i * 0.17; c.lineTo(x * 0.5, -1.05 - (i % 2 ? 0.25 : 0.55) + Math.abs(x) * 0.3); } c.lineTo(0.12, -0.95); c.closePath(); hairB(c, HAIR_COL.mohawk); },
    mullet(c) { c.beginPath(); c.moveTo(-0.64, -0.8); c.quadraticCurveTo(-0.6, -1.25, 0, -1.2); c.quadraticCurveTo(0.6, -1.25, 0.64, -0.8); c.lineTo(0.9, -0.2); c.lineTo(0.66, -0.4); c.lineTo(0.62, -0.84); c.quadraticCurveTo(0, -1.0, -0.62, -0.84); c.closePath(); hairB(c, HAIR_COL.mullet); },
    afro(c) { for (const [x, y, r] of [[-0.55, -0.95, 0.32], [0.55, -0.95, 0.32], [-0.3, -1.25, 0.34], [0.3, -1.25, 0.34], [0, -1.35, 0.34]]) { c.beginPath(); c.arc(x, y, r, 0, TAU); hairB(c, HAIR_COL.afro); } },
    flame(c, t) { if (gpuFireAt(c, "hair", 0, -0.92, 1.15, 0.6)) return; for (let i = 0; i < 5; i++) { const x = -0.5 + i * 0.25, h = 0.45 + 0.15 * Math.sin(t * 9 + i * 1.7); c.beginPath(); c.moveTo(x - 0.15, -0.9); c.quadraticCurveTo(x - 0.1, -1.0 - h * 0.6, x + Math.sin(t * 7 + i) * 0.06, -1.0 - h); c.quadraticCurveTo(x + 0.12, -1.0 - h * 0.5, x + 0.15, -0.9); c.closePath(); inkB(c, i % 2 ? "#E8893A" : "#F5C84A"); } },
    vines(c, t) { c.lineWidth = 0.1; c.strokeStyle = INK; for (let i = 0; i < 5; i++) { const x = -0.55 + i * 0.27, cx = x + Math.sin(t * 2 + i) * 0.05; c.beginPath(); c.moveTo(x, -0.92); c.bezierCurveTo(x - 0.2, -1.2, cx + 0.3, -1.35, cx, -1.18); c.stroke(); c.strokeStyle = HAIR_COL.vines; c.lineWidth = 0.06; c.stroke(); c.strokeStyle = INK; c.lineWidth = 0.1; }
      c.lineWidth = 0.04; c.beginPath(); c.ellipse(0.35, -1.26, 0.13, 0.07, 0.6, 0, TAU); inkB(c, "#7F9447"); },
    quiff(c) { c.beginPath(); c.moveTo(-0.64, -0.84); c.quadraticCurveTo(-0.5, -1.2, 0.1, -1.18); c.bezierCurveTo(0.2, -1.7, 1.05, -1.6, 0.85, -1.2); c.quadraticCurveTo(0.7, -1.0, 0.62, -0.84); c.quadraticCurveTo(0, -1.0, -0.64, -0.84); hairB(c, HAIR_COL.quiff);
      c.strokeStyle = GOLD; c.lineWidth = 0.04; c.beginPath(); c.moveTo(0.2, -1.35); c.quadraticCurveTo(0.5, -1.55, 0.8, -1.3); c.stroke(); c.strokeStyle = INK; },
    moss(c, t) { c.beginPath(); c.ellipse(0, -1.0, 0.66, 0.2, 0, Math.PI, 0); hairB(c, HAIR_COL.moss); c.strokeStyle = "#6A7A60"; c.lineWidth = 0.035;
      for (let i = 0; i < 9; i++) { const x = -0.6 + i * 0.15, len = 0.25 + ((i * 7) % 5) * 0.08; c.beginPath(); c.moveTo(x, -0.95); c.lineTo(x + Math.sin(t * 2 + i) * 0.04, -0.95 + len); c.stroke(); } c.strokeStyle = INK; }
  };
  // v50: a moustache sits on the upper lip, just above the top teeth (they don't drop with the jaw), under the nose
  const MOUSTACHE_Y = () => UPPER_TOP - Math.max(0.03, (UPPER_TOP - NOSE_BOT) * 0.35);
  const MOUSTACHES = { pencil: 1, handlebar: 1 };
  const BEARD = {
    pencil(c) { const y = MOUSTACHE_Y(); c.lineWidth = 0.075; c.strokeStyle = "#2A1E18"; c.beginPath(); c.moveTo(-0.32, y + 0.03); c.quadraticCurveTo(-0.16, y - 0.035, 0, y + 0.005); c.quadraticCurveTo(0.16, y - 0.035, 0.32, y + 0.03); c.stroke(); c.strokeStyle = INK; },
    goatee(c) { c.beginPath(); c.moveTo(-0.16, 0.72); c.quadraticCurveTo(0, 1.15, 0.16, 0.72); c.closePath(); inkB(c, "#3A2A1E"); },
    chops(c) { for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(sd * 0.62, 0.0); c.quadraticCurveTo(sd * 0.72, 0.5, sd * 0.4, 0.72); c.lineTo(sd * 0.42, 0.3); c.closePath(); inkB(c, "#6A4A2E"); } },
    lumberjack(c) { c.beginPath(); c.moveTo(-0.58, 0.2); c.quadraticCurveTo(-0.62, 1.05, 0, 1.2); c.quadraticCurveTo(0.62, 1.05, 0.58, 0.2); c.quadraticCurveTo(0.3, 0.62, 0, 0.6); c.quadraticCurveTo(-0.3, 0.62, -0.58, 0.2); inkB(c, "#8A4A22"); },
    braids(c) { c.beginPath(); c.moveTo(-0.5, 0.35); c.quadraticCurveTo(0, 0.95, 0.5, 0.35); c.quadraticCurveTo(0, 0.7, -0.5, 0.35); inkB(c, "#C8A04A"); for (const sd of [-1, 1]) { for (let i = 0; i < 3; i++) { c.beginPath(); c.ellipse(sd * 0.2, 0.8 + i * 0.16, 0.08, 0.09, 0, 0, TAU); inkB(c, "#C8A04A"); } } },
    cobweb(c) { c.strokeStyle = "rgba(230,230,240,.85)"; c.lineWidth = 0.025; for (let i = 0; i <= 6; i++) { const a = Math.PI * (0.15 + i * 0.117); c.beginPath(); c.moveTo(0, 0.45); c.lineTo(Math.cos(a) * 0.7, 0.45 + Math.sin(a) * 0.7); c.stroke(); }
      for (const r of [0.25, 0.45, 0.65]) { c.beginPath(); for (let i = 0; i <= 6; i++) { const a = Math.PI * (0.15 + i * 0.117); (i ? c.lineTo : c.moveTo).call(c, Math.cos(a) * r, 0.45 + Math.sin(a) * r); } c.stroke(); } c.strokeStyle = INK; },
    handlebar(c) { const y = MOUSTACHE_Y(); for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(0, y - 0.03); c.bezierCurveTo(sd * 0.35, y - 0.14, sd * 0.55, y + 0.1, sd * 0.74, y - 0.24); c.bezierCurveTo(sd * 0.74, y - 0.02, sd * 0.4, y + 0.1, 0, y + 0.05); c.closePath(); hairB(c, GOLD, y - 0.25, y + 0.1); } },
    roots(c, t) { c.strokeStyle = INK; for (let i = 0; i < 6; i++) { const x = -0.45 + i * 0.18, sw = Math.sin(t * 1.5 + i) * 0.04; for (const [col, w] of [[INK, 0.09], ["#8A6A48", 0.05]]) { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(x, 0.45); c.quadraticCurveTo(x + 0.1 + sw, 0.8, x - 0.05, 1.1 + (i % 2) * 0.12); c.stroke(); } } c.strokeStyle = INK; }
  };
  const wingShape = (c, feather) => { c.beginPath(); c.moveTo(0.5, -0.1); c.bezierCurveTo(1.0, -1.1, 1.9, -1.1, 2.1, -0.5); for (let i = 0; i < 4; i++) c.quadraticCurveTo(2.0 - i * 0.3, -0.2 + (feather ? 0.15 : 0.05), 1.85 - i * 0.35, 0.15 + i * 0.05); c.quadraticCurveTo(0.9, 0.35, 0.5, 0.2); c.closePath(); };
  const WINGS = {
    butterfly(c, t, sd) { c.beginPath(); c.ellipse(1.2, -0.5, 0.75, 0.5, -0.4, 0, TAU); inkB(c, "#E3B64B"); c.beginPath(); c.ellipse(1.0, 0.25, 0.45, 0.3, 0.4, 0, TAU); inkB(c, "#C8642A"); c.fillStyle = INK; c.beginPath(); c.arc(1.35, -0.55, 0.12, 0, TAU); c.fill(); void t; void sd; },
    bat(c) { c.beginPath(); c.moveTo(0.5, -0.2); c.lineTo(1.2, -0.9); c.lineTo(2.1, -0.6); c.quadraticCurveTo(1.8, -0.35, 1.9, 0.0); c.quadraticCurveTo(1.55, -0.1, 1.45, 0.25); c.quadraticCurveTo(1.15, 0.05, 0.95, 0.3); c.quadraticCurveTo(0.8, 0.1, 0.5, 0.15); c.closePath(); inkB(c, "#2A2230"); },
    angel(c) { wingShape(c, true); inkB(c, "#F4F0E8"); c.strokeStyle = "rgba(180,170,150,.8)"; c.lineWidth = 0.03; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(0.8, -0.05); c.lineTo(1.8 - i * 0.35, -0.5 + i * 0.2); c.stroke(); } c.strokeStyle = INK; },
    dragon(c) { c.beginPath(); c.moveTo(0.5, -0.2); c.lineTo(1.3, -1.2); c.lineTo(2.3, -0.9); c.quadraticCurveTo(2.0, -0.5, 2.1, -0.1); c.quadraticCurveTo(1.7, -0.2, 1.6, 0.2); c.quadraticCurveTo(1.25, 0.0, 1.05, 0.35); c.quadraticCurveTo(0.8, 0.1, 0.5, 0.15); c.closePath(); inkB(c, "#3E6A42"); c.strokeStyle = "#A8C870"; c.lineWidth = 0.04; c.beginPath(); c.moveTo(0.6, -0.15); c.lineTo(1.3, -1.15); c.stroke(); c.strokeStyle = INK; },
    crow(c) { wingShape(c, true); inkB(c, "#2B2B33"); },
    vulture(c) { wingShape(c, true); inkB(c, "#5A4232"); c.fillStyle = "#E4DAC4"; c.beginPath(); c.ellipse(0.8, -0.2, 0.2, 0.12, -0.5, 0, TAU); c.fill(); },
    clockwork(c, t) { wingShape(c, false); inkB(c, "#C49A42"); c.save(); c.translate(1.1, -0.45); c.rotate(t * 1.5); c.beginPath(); for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU, r = i % 2 ? 0.2 : 0.26; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); inkB(c, "#8A6A3A"); c.restore(); },
    shadow(c, t) { c.globalAlpha *= 0.85; wingShape(c, true); inkB(c, "#0E0C14"); c.strokeStyle = `rgba(180,140,255,${0.4 + 0.3 * Math.sin(t * 3)})`; c.lineWidth = 0.05; wingShape(c, true); c.stroke(); c.strokeStyle = INK; }
  };
  // ── v50: masks, over the face. Each one cuts its eye holes where the sockets are (S: left then right)
  const eyeHoles = (c, S, k = 1) => { for (const s of S) { c.moveTo(s.x + s.rx * k, s.y); c.ellipse(s.x, s.y, s.rx * k, s.ry * k, 0, 0, TAU, true); } };
  const MASK_HOOD = { paperbag: 1, luchador: 1, ghost: 1 };   // (these cover the crown: the hair stays under them)
  const MASKS = {
    paperbag(c, t, S) {   // a brown paper bag, crumpled at the top, two holes torn for the eyes
      c.beginPath(); c.moveTo(-0.86, 1.08); c.lineTo(-0.9, -1.12);
      for (let i = 0; i <= 8; i++) c.lineTo(-0.9 + i * 0.225, -1.18 - (i % 2 ? 0.1 : 0) + Math.sin(i * 2.3) * 0.03);
      c.lineTo(0.86, 1.08); c.closePath(); eyeHoles(c, S, 1.02);
      const g = c.createLinearGradient(-0.9, 0, 0.9, 0); g.addColorStop(0, "#A9814F"); g.addColorStop(0.45, "#C9A06A"); g.addColorStop(1, "#8E6A3E");
      c.fillStyle = g; c.fill("evenodd"); c.lineWidth = 0.06; c.strokeStyle = INK; c.stroke();
      c.strokeStyle = "rgba(90,60,30,.55)"; c.lineWidth = 0.03; c.beginPath(); c.moveTo(-0.62, -1.1); c.lineTo(-0.55, 1.05); c.moveTo(0.6, -1.12); c.lineTo(0.66, 1.05); c.moveTo(-0.9, -0.86); c.lineTo(0.9, -0.84); c.stroke();
      c.strokeStyle = INK; c.lineWidth = 0.055; c.beginPath(); c.moveTo(-0.28, 0.5); c.quadraticCurveTo(0, 0.64 + Math.sin(t * 2) * 0.03, 0.28, 0.5); c.stroke();
    },
    hockey(c, t, S) {   // a goalie's mask, white, with its breathing holes and red chevrons
      c.beginPath(); c.ellipse(0, -0.12, 0.66, 0.92, 0, 0, TAU); eyeHoles(c, S, 1.0);
      const g = c.createRadialGradient(-0.2, -0.5, 0.1, 0, -0.1, 1); g.addColorStop(0, "#FFFFFF"); g.addColorStop(1, "#D8D2C4"); c.fillStyle = g; c.fill("evenodd"); c.lineWidth = 0.06; c.strokeStyle = INK; c.stroke();
      c.fillStyle = INK; for (const [x, y] of [[-0.18, 0.28], [0, 0.34], [0.18, 0.28], [-0.1, 0.5], [0.1, 0.5], [0, 0.64], [-0.3, 0.1], [0.3, 0.1]]) { c.beginPath(); c.arc(x, y, 0.035, 0, TAU); c.fill(); }
      c.strokeStyle = "#C0392B"; c.lineWidth = 0.06; for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(sd * 0.12, -0.9); c.lineTo(sd * 0.3, -0.7); c.lineTo(sd * 0.12, -0.5); c.stroke(); }
    },
    luchador(c, t, S) {   // a wrestler's hood: bright, with flames round the eyes and a stripe over the crown
      c.beginPath(); c.moveTo(-0.76, 0.42); c.bezierCurveTo(-0.9, -0.6, -0.55, -1.2, 0, -1.18); c.bezierCurveTo(0.55, -1.2, 0.9, -0.6, 0.76, 0.42); c.quadraticCurveTo(0, 0.3, -0.76, 0.42); c.closePath(); eyeHoles(c, S, 1.12);
      c.fillStyle = "#2F6FD0"; c.fill("evenodd"); c.lineWidth = 0.06; c.strokeStyle = INK; c.stroke();
      c.save(); c.clip("evenodd"); c.fillStyle = "#F5C84A"; c.fillRect(-0.12, -1.3, 0.24, 1.8); c.restore();
      for (const s of S) { c.beginPath(); c.ellipse(s.x, s.y, s.rx * 1.35, s.ry * 1.35, 0, 0, TAU); c.moveTo(s.x + s.rx * 1.12, s.y); c.ellipse(s.x, s.y, s.rx * 1.12, s.ry * 1.12, 0, 0, TAU, true); c.fillStyle = "#FFFFFF"; c.fill("evenodd"); c.lineWidth = 0.035; c.stroke(); }
      c.fillStyle = "#E8505B"; for (const sd of [-1, 1]) { const s = S[sd < 0 ? 0 : 1]; c.beginPath(); c.moveTo(s.x + sd * s.rx * 1.3, s.y - s.ry * 0.4); c.quadraticCurveTo(s.x + sd * s.rx * 2.2, s.y - s.ry * 1.6, s.x + sd * s.rx * 1.6, s.y - s.ry * 2.1); c.quadraticCurveTo(s.x + sd * s.rx * 1.5, s.y - s.ry * 1.2, s.x + sd * s.rx * 1.0, s.y - s.ry * 1.25); c.closePath(); c.fill(); c.lineWidth = 0.03; c.stroke(); }
    },
    masquerade(c, t, S) {   // a gilded eye mask with a plume
      const [L, R] = S, y = (L.y + R.y) / 2, w = R.x - L.x;
      c.beginPath(); c.moveTo(L.x - L.rx * 2.0, y - L.ry * 0.4); c.quadraticCurveTo(L.x, y - L.ry * 2.2, 0, y - L.ry * 0.9); c.quadraticCurveTo(R.x, y - R.ry * 2.2, R.x + R.rx * 2.0, y - R.ry * 0.4);
      c.quadraticCurveTo(R.x + R.rx * 1.2, y + R.ry * 1.6, 0.02, y + R.ry * 0.5); c.quadraticCurveTo(L.x - L.rx * 1.2, y + L.ry * 1.6, L.x - L.rx * 2.0, y - L.ry * 0.4); c.closePath(); eyeHoles(c, S, 1.0);
      const g = c.createLinearGradient(0, y - 0.4, 0, y + 0.3); g.addColorStop(0, "#FFE38A"); g.addColorStop(1, "#A77A22"); c.fillStyle = g; c.fill("evenodd"); c.lineWidth = 0.05; c.strokeStyle = INK; c.stroke();
      const sw = Math.sin(t * 2) * 0.05; c.beginPath(); c.moveTo(R.x + R.rx * 1.6, y - R.ry * 0.8); c.bezierCurveTo(R.x + 0.5, y - 1.0, R.x + 0.1 + sw, y - 1.3, R.x + 0.55 + sw, y - 1.55); c.bezierCurveTo(R.x + 0.7, y - 1.1, R.x + 0.6, y - 0.9, R.x + R.rx * 1.9, y - R.ry * 0.5); c.closePath(); c.fillStyle = "#7A3AA8"; c.fill(); c.lineWidth = 0.035; c.stroke(); void w;
    },
    plague(c, t, S) {   // a plague doctor's beak, leather, with round glass eyes
      const [L, R] = S, y = (L.y + R.y) / 2;
      c.beginPath(); c.moveTo(-0.72, y - 0.5); c.quadraticCurveTo(0, y - 0.85, 0.72, y - 0.5); c.lineTo(0.66, y + 0.3); c.quadraticCurveTo(0.3, y + 0.35, 0.18, y + 0.5); c.quadraticCurveTo(0.1, y + 1.3, 0.02, y + 1.55); c.quadraticCurveTo(-0.1, y + 1.2, -0.18, y + 0.5); c.quadraticCurveTo(-0.3, y + 0.35, -0.66, y + 0.3); c.closePath();
      const g = c.createLinearGradient(-0.7, 0, 0.7, 0); g.addColorStop(0, "#3A2A1E"); g.addColorStop(0.5, "#6A4A2E"); g.addColorStop(1, "#2E2018"); c.fillStyle = g; c.fill(); c.lineWidth = 0.06; c.strokeStyle = INK; c.stroke();
      for (const s of S) { c.beginPath(); c.arc(s.x, s.y, Math.max(s.rx, s.ry) * 1.05, 0, TAU); const gg = c.createRadialGradient(s.x - 0.05, s.y - 0.05, 0, s.x, s.y, 0.3); gg.addColorStop(0, "rgba(220,240,200,.85)"); gg.addColorStop(1, "rgba(60,90,70,.9)"); c.fillStyle = gg; c.fill(); c.lineWidth = 0.09; c.strokeStyle = "#C49A42"; c.stroke(); c.lineWidth = 0.03; c.strokeStyle = INK; c.stroke(); }
      c.strokeStyle = "rgba(0,0,0,.4)"; c.lineWidth = 0.025; c.beginPath(); c.moveTo(0, y + 0.45); c.lineTo(0.02, y + 1.45); c.stroke();
    },
    gilded(c, t, S) {   // a Venetian full face in gold leaf, a painted brow and lips, a ribbon behind
      c.strokeStyle = "#8A2A3A"; c.lineWidth = 0.07; for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(sd * 0.68, -0.3); c.quadraticCurveTo(sd * 1.0, -0.1 + Math.sin(t * 2 + sd) * 0.05, sd * 0.95, 0.35); c.stroke(); }
      c.beginPath(); c.moveTo(0, -1.0); c.bezierCurveTo(0.62, -1.02, 0.72, -0.4, 0.62, 0.15); c.bezierCurveTo(0.5, 0.75, 0.2, 0.95, 0, 0.98); c.bezierCurveTo(-0.2, 0.95, -0.5, 0.75, -0.62, 0.15); c.bezierCurveTo(-0.72, -0.4, -0.62, -1.02, 0, -1.0); c.closePath(); eyeHoles(c, S, 1.0);
      const g = c.createLinearGradient(-0.6, -1, 0.6, 1); g.addColorStop(0, "#FFF0B0"); g.addColorStop(0.4, "#E3B64B"); g.addColorStop(1, "#8A6420"); c.fillStyle = g; c.fill("evenodd"); c.lineWidth = 0.06; c.strokeStyle = INK; c.stroke();
      c.strokeStyle = "#7A1E2E"; c.lineWidth = 0.035; for (const s of S) { c.beginPath(); c.moveTo(s.x - s.rx * 1.3, s.y - s.ry * 1.25); c.quadraticCurveTo(s.x, s.y - s.ry * 2.0, s.x + s.rx * 1.3, s.y - s.ry * 1.25); c.stroke(); }
      c.fillStyle = "#A8283A"; c.beginPath(); c.moveTo(-0.16, 0.55); c.quadraticCurveTo(0, 0.48, 0.16, 0.55); c.quadraticCurveTo(0, 0.66, -0.16, 0.55); c.fill();
      const tw = 0.5 + 0.5 * Math.sin(t * 3); c.fillStyle = `rgba(255,255,240,${0.5 + 0.4 * tw})`; star(c, -0.38, -0.62, 0.07 * (0.7 + tw * 0.5), 4, 0.3, 0); c.fill();
    },
    ghost(c, t, S) {   // a bedsheet with two holes cut in it
      c.beginPath(); c.moveTo(-0.9, 1.1); c.bezierCurveTo(-0.95, -0.2, -0.9, -1.25, 0, -1.25); c.bezierCurveTo(0.9, -1.25, 0.95, -0.2, 0.9, 1.1);
      for (let i = 0; i <= 6; i++) { const x = 0.9 - i * 0.3; c.quadraticCurveTo(x - 0.15, 1.1 + (i % 2 ? -0.1 : 0.12) + Math.sin(t * 3 + i) * 0.04, x - 0.3, 1.1); }
      c.closePath(); eyeHoles(c, S, 0.95);
      const g = c.createRadialGradient(-0.3, -0.6, 0.1, 0, 0, 1.4); g.addColorStop(0, "#FFFFFF"); g.addColorStop(1, "#D6D8E4"); c.fillStyle = g; c.fill("evenodd"); c.lineWidth = 0.055; c.strokeStyle = INK; c.stroke();
      c.strokeStyle = "rgba(120,125,150,.45)"; c.lineWidth = 0.03; c.beginPath(); c.moveTo(-0.4, 0.2); c.quadraticCurveTo(-0.5, 0.7, -0.45, 1.05); c.moveTo(0.42, 0.25); c.quadraticCurveTo(0.52, 0.7, 0.48, 1.05); c.stroke();
    }
  };
  // behind the skull: the wings, flapping (on twos) when it flies
  function drawBodyBehind(c, look, t) {
    const W1 = WINGS[look.wings]; if (!W1) return;
    const flap = Math.sin(Math.floor(t * 12) / 12 * 9) * 0.18;
    c.save(); c.lineWidth = 0.05; c.strokeStyle = INK; c.lineJoin = "round";
    for (const sd of [-1, 1]) { c.save(); c.scale(sd, 1); c.rotate(-0.1 - flap); W1(c, t, sd); c.restore(); }
    c.restore();
  }
  // in front: hair on the crown, facial hair on the jaw (dropped with it)
  function drawBodyFront(c, look, t, jawDrop, socks = SOCK) {
    c.save(); c.lineWidth = 0.05; c.strokeStyle = INK; c.lineJoin = "round"; c.lineCap = "round";
    const S = socks[0].x < socks[1].x ? socks : [socks[1], socks[0]];
    if (MASKS[look.mask]) { c.save(); MASKS[look.mask](c, t, S); c.restore(); }   // (v50: a mask over the face, under the hair)
    if (HAIR[look.hair] && !(MASKS[look.mask] && MASK_HOOD[look.mask])) HAIR[look.hair](c, t);
    if (GLASSES[look.glasses]) { c.save(); GLASSES[look.glasses](c, t, S); c.restore(); }   // (v45: over the sockets; v50: as the face moves them)
    if (MOUSTACHES[look.beard]) { c.save(); BEARD[look.beard](c, t); c.restore(); }   // (v50: a moustache stays on the lip)
    c.translate(0, jawDrop);
    if (BEARD[look.beard] && !MOUSTACHES[look.beard]) BEARD[look.beard](c, t);
    c.restore();
  }
  // the hat Morty wears (v49: the Wizard Mort shelf, and its hats, are gone)
  const hatOf = (L = cos) => L.hat;
  // the launcher's frames: wood, bone, iron, candy, gold, neon (the classic is the drawn asset)
  const LAUNCHERS = { branch: { wood: "#6A4A2E", hi: "rgba(242,231,201,.25)" }, bone: { wood: "#E4DAC4", hi: "#FFF8EA" }, iron: { wood: "#3A3E46", hi: "#8A8E96" },
    candy: { wood: "#F4ECDA", stripe: "#C0392B", hi: "#FFFFFF" }, gold: { wood: "#C49A42", hi: "#FFF3C4" }, neon: { wood: "#B48CFF", hi: "#F2ECFF", glow: "rgba(180,140,255,.9)" } };
  function drawFrameLauncher(sx, sy, r, off, fy, id) {
    const L = LAUNCHERS[id], kx = sx + off.x, ky = sy + off.y; sy += fy;
    const aL = { x: sx - r * 1.6, y: sy - r * 0.15 }, aR = { x: sx + r * 1.6, y: sy - r * 0.15 }, fork = { x: sx, y: sy + r * 1.35 };
    ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round";
    const wood = w => { ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(sx, sy + r * 2.8); ctx.lineTo(fork.x, fork.y); ctx.lineTo(aL.x, aL.y); ctx.moveTo(fork.x, fork.y); ctx.lineTo(aR.x, aR.y); ctx.stroke(); };
    if (L.glow) { ctx.shadowColor = L.glow; ctx.shadowBlur = 10; }
    ctx.strokeStyle = INK; wood(Math.max(6, r * 0.36)); ctx.shadowBlur = 0; ctx.strokeStyle = L.wood; wood(Math.max(3.5, r * 0.24));
    if (L.stripe) { ctx.strokeStyle = L.stripe; ctx.setLineDash([r * 0.2, r * 0.2]); wood(Math.max(3, r * 0.2)); ctx.setLineDash([]); }
    ctx.strokeStyle = L.hi; ctx.lineWidth = Math.max(1, r * 0.05); ctx.beginPath(); ctx.moveTo(sx - r * 0.05, sy + r * 2.7); ctx.lineTo(fork.x - r * 0.05, fork.y); ctx.lineTo(aL.x + 1, aL.y); ctx.stroke();
    drawBands(ctx, [[aL, { x: kx - r * 0.8, y: ky + r * 0.35 }], [aR, { x: kx + r * 0.8, y: ky + r * 0.35 }]], Math.max(3.5, r * 0.16), Math.max(1.8, r * 0.08), { color: "#A94332", outline: INK }, cos.band, game.time);
    ctx.fillStyle = "#5A3A22"; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.5, r * 0.07); ctx.beginPath(); ctx.ellipse(kx, ky + r * 0.72, r * 0.85, r * 0.3, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = L.hi; for (const a of [aL, aR]) { ctx.beginPath(); ctx.arc(a.x, a.y, Math.max(2.5, r * 0.11), 0, TAU); ctx.fill(); ctx.stroke(); }
    ctx.restore();
  }

  // ── v45: glasses, over the sockets (their centres and sizes are the skull art's own, 08a_skull.js: SOCK), left then right
  const lensR = s => Math.max(s.rx, s.ry) * 1.12;
  const lensCircle = (c, x, y, r) => { c.beginPath(); c.arc(x, y, r, 0, TAU); };
  const lensBox = (c, x, y, r) => { c.beginPath(); rr(c, x - r * 1.1, y - r * 0.82, r * 2.2, r * 1.64, r * 0.42); };
  const lensDrop = (c, x, y, r) => { c.beginPath(); c.moveTo(x - r * 1.05, y - r * 0.7); c.lineTo(x + r * 1.05, y - r * 0.7); c.quadraticCurveTo(x + r * 1.15, y + r * 0.5, x + r * 0.2, y + r * 1.0); c.quadraticCurveTo(x - r * 1.1, y + r * 0.9, x - r * 1.05, y - r * 0.7); c.closePath(); };
  const lensHeart = (c, x, y, r) => { c.beginPath(); c.moveTo(x, y + r * 1.0); c.bezierCurveTo(x - r * 1.6, y - r * 0.1, x - r * 0.8, y - r * 1.3, x, y - r * 0.45); c.bezierCurveTo(x + r * 0.8, y - r * 1.3, x + r * 1.6, y - r * 0.1, x, y + r * 1.0); c.closePath(); };
  const lensStar = (c, x, y, r) => { star(c, x, y, r * 1.35, 5, 0.52, -Math.PI / 2); };
  function glassFrames(c, S, shape, fill, frame, w = 0.06, o = {}) {
    const [L, R] = S, rl = lensR(L), rr2 = lensR(R);
    c.lineJoin = "round"; c.lineCap = "round";
    if (o.arms !== false) { c.strokeStyle = INK; c.lineWidth = w + 0.05; c.beginPath(); c.moveTo(L.x - rl * 1.05, L.y - rl * 0.2); c.lineTo(L.x - rl * 1.7, L.y - rl * 0.45); c.moveTo(R.x + rr2 * 1.05, R.y - rr2 * 0.2); c.lineTo(R.x + rr2 * 1.7, R.y - rr2 * 0.45); c.stroke(); c.strokeStyle = frame; c.lineWidth = w; c.stroke(); }
    c.strokeStyle = INK; c.lineWidth = w + 0.05; c.beginPath(); c.moveTo(L.x + rl * 0.9, L.y - rl * 0.25); c.quadraticCurveTo((L.x + R.x) / 2, L.y - rl * 0.6, R.x - rr2 * 0.9, R.y - rr2 * 0.25); c.stroke(); c.strokeStyle = frame; c.lineWidth = w; c.stroke();
    [L, R].forEach((s, i) => { const r = lensR(s); shape(c, s.x, s.y, r); c.fillStyle = typeof fill === "function" ? fill(i, s, r) : fill; c.fill(); c.lineWidth = w + 0.05; c.strokeStyle = INK; c.stroke(); c.lineWidth = w; c.strokeStyle = frame; c.stroke(); });
    if (o.glare !== false) { c.strokeStyle = "rgba(255,255,255,.6)"; c.lineWidth = 0.05; for (const s of [L, R]) { const r = lensR(s); c.beginPath(); c.moveTo(s.x - r * 0.55, s.y - r * 0.05); c.lineTo(s.x - r * 0.15, s.y - r * 0.5); c.stroke(); } }
  }
  const GLASSES = {
    round(c, t, S) { glassFrames(c, S, lensCircle, "rgba(200,230,255,.16)", "#C49A42", 0.05); },
    shades(c, t, S) { glassFrames(c, S, lensBox, "#15131A", "#15131A", 0.08); },
    nerd(c, t, S) { glassFrames(c, S, lensBox, "rgba(200,230,255,.14)", "#1E1C22", 0.13); const m = (S[0].x + S[1].x) / 2, y = S[0].y - lensR(S[0]) * 0.35; c.fillStyle = "#F4F0E6"; c.strokeStyle = INK; c.lineWidth = 0.035; c.beginPath(); c.rect(m - 0.09, y - 0.1, 0.18, 0.2); c.fill(); c.stroke(); },
    threed(c, t, S) { glassFrames(c, S, lensBox, i => (i ? "rgba(70,200,230,.7)" : "rgba(220,50,60,.7)"), "#F4F0E6", 0.1); },
    heart(c, t, S) { glassFrames(c, S, lensHeart, "rgba(245,120,170,.75)", "#E8505B", 0.06); },
    aviator(c, t, S) { glassFrames(c, S, lensDrop, (i, s, r) => { const g = c.createLinearGradient(0, s.y - r, 0, s.y + r); g.addColorStop(0, "rgba(90,50,20,.9)"); g.addColorStop(1, "rgba(200,140,60,.6)"); return g; }, "#D8B45A", 0.045); },
    star(c, t, S) { glassFrames(c, S, lensStar, "rgba(255,220,80,.8)", "#E8505B", 0.06, { glare: false }); },
    monocle(c, t, S) {   // one lens, on the right, and its chain
      const R = S[1], r = lensR(R); c.lineJoin = "round"; lensCircle(c, R.x, R.y, r); c.fillStyle = "rgba(200,230,255,.18)"; c.fill(); c.lineWidth = 0.1; c.strokeStyle = INK; c.stroke(); c.lineWidth = 0.055; c.strokeStyle = "#D8B45A"; c.stroke();
      c.strokeStyle = "#D8B45A"; c.lineWidth = 0.03; c.setLineDash([0.06, 0.04]); c.beginPath(); c.moveTo(R.x + r * 0.7, R.y + r * 0.7); c.quadraticCurveTo(R.x + r * 1.4, R.y + r * 2.4, R.x + r * 0.4, R.y + r * 3.2); c.stroke(); c.setLineDash([]);
      c.strokeStyle = "rgba(255,255,255,.6)"; c.lineWidth = 0.05; c.beginPath(); c.moveTo(R.x - r * 0.55, R.y - r * 0.05); c.lineTo(R.x - r * 0.15, R.y - r * 0.5); c.stroke();
    },
    goggles(c, t, S) {   // brass flying goggles, strap round the back
      c.strokeStyle = "#5A3A22"; c.lineWidth = 0.16; c.beginPath(); c.moveTo(S[0].x - lensR(S[0]) * 1.2, S[0].y); c.lineTo(-1.05, S[0].y - 0.08); c.moveTo(S[1].x + lensR(S[1]) * 1.2, S[1].y); c.lineTo(1.05, S[1].y - 0.08); c.stroke();
      glassFrames(c, S, lensCircle, (i, s, r) => { const g = c.createRadialGradient(s.x - r * 0.3, s.y - r * 0.3, 0, s.x, s.y, r); g.addColorStop(0, "rgba(180,240,200,.8)"); g.addColorStop(1, "rgba(40,110,80,.85)"); return g; }, "#C49A42", 0.12, { arms: false });
    },
    bandit(c, t, S) {   // a bandit's mask: a black band with the sockets showing through
      const [L, R] = S, rl = lensR(L), y = (L.y + R.y) / 2;
      c.beginPath(); c.moveTo(L.x - rl * 1.8, y - rl * 0.6); c.quadraticCurveTo(0, y - rl * 1.5, R.x + rl * 1.8, y - rl * 0.6); c.quadraticCurveTo(R.x + rl * 1.6, y + rl * 0.9, R.x + rl * 0.3, y + rl * 1.1); c.quadraticCurveTo(0, y + rl * 0.5, L.x - rl * 0.3, y + rl * 1.1); c.quadraticCurveTo(L.x - rl * 1.6, y + rl * 0.9, L.x - rl * 1.8, y - rl * 0.6); c.closePath();
      for (const s of S) { c.moveTo(s.x + s.rx * 0.95, s.y); c.ellipse(s.x, s.y, s.rx * 0.95, s.ry * 0.95, 0, 0, TAU, true); }
      c.fillStyle = "#15131A"; c.fill("evenodd"); c.strokeStyle = INK; c.lineWidth = 0.05; c.stroke();
      c.strokeStyle = "#15131A"; c.lineWidth = 0.07; for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(sd * (Math.abs(R.x) + rl * 1.7), y - rl * 0.5); c.quadraticCurveTo(sd * (Math.abs(R.x) + rl * 2.4), y + rl * 0.2, sd * (Math.abs(R.x) + rl * 2.1), y + rl * 1.2); c.stroke(); }
    },
    visor(c, t, S) {   // a neon visor across both sockets
      const [L, R] = S, rl = lensR(L), y = (L.y + R.y) / 2, k = 0.75 + 0.25 * Math.sin(t * 4);
      c.beginPath(); rr(c, L.x - rl * 1.4, y - rl * 0.6, R.x - L.x + rl * 2.8, rl * 1.2, rl * 0.6);
      c.fillStyle = `rgba(80,240,255,${0.35 + 0.25 * k})`; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.1; c.stroke(); c.strokeStyle = "#50F0FF"; c.lineWidth = 0.05; c.stroke();
      c.globalCompositeOperation = "lighter"; c.strokeStyle = `rgba(80,240,255,${0.25 * k})`; c.lineWidth = 0.22; c.stroke(); c.globalCompositeOperation = "source-over";
      c.strokeStyle = "rgba(255,255,255,.8)"; c.lineWidth = 0.035; c.beginPath(); c.moveTo(L.x - rl * 0.9, y - rl * 0.25); c.lineTo(R.x + rl * 0.9, y - rl * 0.25); c.stroke();
    }
  };
