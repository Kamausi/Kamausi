  // ───────────────────────── skull skins ─────────────────────────
  // Same silhouette, different material. Each skin is a flat 1930s palette plus optional layers:
  // behind (before the skull), detail (clipped to the cranium), eyes (socket fill), jawTop, top (over everything),
  // and idle (a little personality it shows when it's waiting around). Looks only: no skin changes the physics.
  const P = (base, shade, hi, line, socket, pupil, crack, extra) => ({ base, shade, hi, line, socket, pupil, crack, ...extra });
  const glintAt = (c, x, y, k) => { if (k < 0.03) return; c.fillStyle = `rgba(255,252,236,${k})`; star(c, x, y, 0.28 * k, 4, 0.18, 0); c.fill(); };
  const SILVER_NEG = P("#1E1E1E", "#343434", "#4A4A4A", "#EFEFEF", "#F4F4F4", "#111111", null);
  function flameTongues(c, t, n, spread, base, colors) {
    for (let i = 0; i < n; i++) {
      const bx = (i / (n - 1) - 0.5) * spread, h = 0.45 + 0.3 * Math.abs(Math.sin(t * 7.3 + i * 1.9)) + (1 - Math.abs(bx) / spread) * 0.35;
      const tipX = bx + Math.sin(t * 9 + i) * 0.12, tipY = base - h;
      c.fillStyle = colors[i % colors.length]; c.beginPath();
      c.moveTo(bx - 0.2, base + 0.1); c.quadraticCurveTo(bx - 0.22, (tipY + base) / 2, tipX, tipY); c.quadraticCurveTo(bx + 0.22, (tipY + base) / 2, bx + 0.2, base + 0.1); c.closePath(); c.fill();
      c.strokeStyle = INK; c.lineWidth = 0.05; c.stroke();
    }
  }
  const SKINS = {
    // the Soul Shop's two skulls (v30): a glow behind them, drawn in skull units
    soul: P("#C8B4F4", "#8E72D4", "#F2ECFF", "#1A0F2E", "#140A24", "#BFF4FF", null, { behind(c, t) { const g = c.createRadialGradient(0, 0, 0.6, 0, 0, 1.55); g.addColorStop(0, `rgba(180,140,255,${0.45 + 0.15 * Math.sin(t * 3)})`); g.addColorStop(1, "rgba(180,140,255,0)"); c.fillStyle = g; c.beginPath(); c.arc(0, 0, 1.55, 0, TAU); c.fill(); } }),
    aurora: P("#A8E8D4", "#5FB8A4", "#E6FFF6", "#0E2A26", "#0A1E1C", "#F4D2FF", null, { behind(c, t) { for (let i = 0; i < 3; i++) { c.strokeStyle = [`rgba(120,240,190,.5)`, `rgba(170,140,255,.45)`, `rgba(120,200,255,.4)`][i]; c.lineWidth = 0.12; c.beginPath(); c.arc(0, 0, 1.25 + i * 0.13 + 0.04 * Math.sin(t * 2 + i), Math.PI * 1.05 + 0.2 * Math.sin(t + i), Math.PI * 1.95 + 0.2 * Math.sin(t * 1.3 + i)); c.stroke(); } } }),
    hex: P("#B08AD0", "#7E5CA0", "#E4D2F4", "#221028", "#1A0C20", "#C6F07A", null),
    bone: P("#F7F1DF", "#D9C9A5", "#FFFDF6", "#111111", "#111111", "#F7F1DF", null, { flat: true }),
    wood: P("#C08A56", "#93623A", "#E4B98A", "#2A1A0E", "#1E130A", "#F2E7C9", null, {
      detail(c) { c.strokeStyle = "#7A4E2C"; c.lineWidth = 0.035; for (let i = 0; i < 7; i++) { const y = -1 + i * 0.26; c.beginPath(); c.moveTo(-1, y); c.bezierCurveTo(-0.4, y + 0.08, 0.2, y - 0.1, 1, y + 0.05); c.stroke(); } c.beginPath(); c.ellipse(0.46, -0.6, 0.1, 0.06, 0.3, 0, TAU); c.stroke(); },
      top(c, t) { const k = (t % 9) < 1.4 ? Math.sin(((t % 9) / 1.4) * Math.PI) : 0; c.fillStyle = "#1E130A"; c.beginPath(); c.arc(-0.5, -0.8, 0.06, 0, TAU); c.fill();
        if (k > 0.05) { c.save(); c.translate(-0.5, -0.8); c.fillStyle = "#E8B4A0"; c.beginPath(); rr(c, -0.04, -0.2 * k, 0.08, 0.2 * k, 0.04); c.fill(); c.fillStyle = INK; c.beginPath(); c.arc(-0.015, -0.18 * k + 0.03, 0.012, 0, TAU); c.arc(0.015, -0.18 * k + 0.03, 0.012, 0, TAU); c.fill(); c.restore(); } }
    }),
    tin: P("#BCC3C3", "#879092", "#F4F7F7", "#1C2224", "#141A1C", "#F2E7C9", null, {
      detail(c) { c.fillStyle = RED; c.fillRect(-1, -0.94, 2, 0.2); c.fillStyle = CREAM; for (let i = -3; i <= 3; i++) { star(c, i * 0.26, -0.84, 0.06); c.fill(); }
        c.fillStyle = "#6E777A"; for (const [x, y] of [[-0.68, -0.45], [0.68, -0.45], [-0.66, 0.22], [0.66, 0.22]]) { c.beginPath(); c.arc(x, y, 0.035, 0, TAU); c.fill(); }
        c.fillStyle = "rgba(155,91,52,.45)"; c.beginPath(); c.ellipse(0.66, -0.02, 0.08, 0.05, 0.4, 0, TAU); c.ellipse(-0.3, -0.72, 0.07, 0.04, 0, 0, TAU); c.fill(); }
    }),
    stone: P("#A8A391", "#7C7766", "#D0CCBC", "#221F18", "#16140F", "#E8E2CE", "rgba(34,31,24,.8)", {
      detail(c) { const rnd = mulberry32(7); c.fillStyle = "rgba(34,31,24,.25)"; for (let i = 0; i < 24; i++) { c.beginPath(); c.arc(rnd() * 2 - 1, rnd() * 2 - 1.2, 0.015 + rnd() * 0.02, 0, TAU); c.fill(); }
        c.fillStyle = "#5E7038"; c.beginPath(); c.ellipse(-0.45, -0.95, 0.35, 0.16, -0.3, 0, TAU); c.ellipse(-0.1, -1.05, 0.25, 0.12, 0, 0, TAU); c.fill(); c.fillStyle = "#7F9447"; c.beginPath(); c.ellipse(-0.5, -0.98, 0.14, 0.06, -0.3, 0, TAU); c.fill(); }
    }),
    silver: P("#E4E4E0", "#A8A8A2", "#FFFFFF", "#111111", "#0E0E0E", "#FFFFFF", "rgba(17,17,17,.6)", {
      flick: t => ((t % 5.3) < 0.09 ? SILVER_NEG : null),
      detail(c) { c.fillStyle = "rgba(0,0,0,.07)"; for (let y = -1.1; y < 0.6; y += 0.09) c.fillRect(-1, y, 2, 0.03); }
    }),
    wax: P("#F1E6C8", "#D8C69C", "#FFFBEE", "#3A2D1C", "#2A2014", "#FFF4D6", null, {
      top(c, t) {
        c.fillStyle = "#F1E6C8"; c.strokeStyle = "#3A2D1C"; c.lineWidth = 0.05;
        for (const [x, y, len] of [[-0.68, 0.12, 0.2], [-0.58, 0.2, 0.1], [0.6, 0.16, 0.16], [0.69, 0.08, 0.1]]) { c.beginPath(); c.moveTo(x - 0.05, y); c.lineTo(x - 0.05, y + len); c.arc(x, y + len, 0.05, Math.PI, 0, true); c.lineTo(x + 0.05, y); c.fill(); c.stroke(); }
        c.strokeStyle = INK; c.lineWidth = 0.04; c.beginPath(); c.moveTo(0, -1.08); c.quadraticCurveTo(0.03, -1.2, 0, -1.26); c.stroke();
        const fl = 1 + 0.15 * Math.sin(t * 17) * Math.sin(t * 5), tip = -1.27 - 0.24 * fl; c.fillStyle = MUSTARD; c.beginPath(); c.moveTo(0, tip); c.quadraticCurveTo(0.12, -1.3, 0, -1.24); c.quadraticCurveTo(-0.12, -1.3, 0, tip); c.fill(); c.strokeStyle = INK; c.lineWidth = 0.03; c.stroke();
      }
    }),
    china: P("#FBF9F4", "#D9DFE8", "#FFFFFF", "#1F2A3C", "#1B2433", "#FBF9F4", "#C49A42", {
      detail(c) { c.strokeStyle = "#3E5E92"; c.lineWidth = 0.035;
        for (const [x, y, s] of [[0, -0.78, 1], [-0.62, -0.5, 0.7], [0.62, -0.5, 0.7]]) { c.beginPath(); for (let k = 0; k <= 24; k++) { const a = k * 0.5, r = 0.01 + k * 0.009 * s; const xx = x + Math.cos(a) * r, yy = y + Math.sin(a) * r; k ? c.lineTo(xx, yy) : c.moveTo(xx, yy); } c.stroke(); }
        c.lineWidth = 0.05; c.beginPath(); c.arc(0, -0.2, 0.84, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }
    }),
    candy: P("#FAF5EC", "#E2D6C4", "#FFFFFF", INK, INK, CREAM, null, {
      detail(c) {
        const cols = [RED, TEAL, MUSTARD, PURPLE];
        for (const s of SOCK) for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU; c.fillStyle = cols[i % 4]; c.beginPath(); c.arc(s.x + Math.cos(a) * (s.rx + 0.08), s.y + Math.sin(a) * (s.ry + 0.08), 0.045, 0, TAU); c.fill(); }
        c.fillStyle = RED; for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; c.beginPath(); c.ellipse(Math.cos(a) * 0.11, -0.84 + Math.sin(a) * 0.11, 0.07, 0.045, a, 0, TAU); c.fill(); }
        c.fillStyle = MUSTARD; c.beginPath(); c.arc(0, -0.84, 0.055, 0, TAU); c.fill();
        c.strokeStyle = TEAL; c.lineWidth = 0.035; for (const sx of [-1, 1]) { c.beginPath(); c.arc(sx * 0.62, 0.3, 0.08, 0, Math.PI * 1.5 * sx); c.stroke(); }
      }
    }),
    pirate: P("#E6D5AE", "#BFA676", "#FAF0D6", INK, INK, CREAM, INK, {
      detail(c) { c.fillStyle = "rgba(110,80,40,.22)"; c.beginPath(); c.ellipse(0.4, -0.75, 0.2, 0.12, 0.5, 0, TAU); c.ellipse(-0.6, 0.1, 0.12, 0.18, 0, 0, TAU); c.fill();
        c.strokeStyle = INK; c.lineWidth = 0.035; c.beginPath(); c.moveTo(-0.55, -0.95); c.lineTo(-0.2, -0.6); for (let i = 1; i < 4; i++) { const k = i / 4, x = -0.55 + 0.35 * k, y = -0.95 + 0.35 * k; c.moveTo(x - 0.05, y + 0.05); c.lineTo(x + 0.05, y - 0.05); } c.stroke(); },
      top(c) { const e = SOCK[1]; c.strokeStyle = INK; c.lineWidth = 0.07; c.beginPath(); c.moveTo(-0.8, e.y - e.ry * 1.05); c.quadraticCurveTo(0, e.y - e.ry * 1.05, 0.84, e.y + e.ry * 0.4); c.stroke(); c.fillStyle = INK; c.beginPath(); c.ellipse(e.x, e.y, e.rx * 1.12, e.ry * 0.98, 0.1, 0, TAU); c.fill(); c.fillStyle = "rgba(242,231,201,.25)"; c.beginPath(); c.ellipse(e.x - e.rx * 0.3, e.y - e.ry * 0.35, 0.08, 0.05, -0.5, 0, TAU); c.fill(); }
    }),
    pumpkin: P("#E07B2C", "#B35A1A", "#F6B06A", "#2A1204", "#2A1204", "#2A1204", null, {
      detail(c) { c.strokeStyle = "rgba(110,40,0,.45)"; c.lineWidth = 0.05; for (const x of [-0.55, -0.2, 0.2, 0.55]) { c.beginPath(); c.moveTo(x * 0.7, -1.08); c.quadraticCurveTo(x * 1.35, -0.2, x * 0.9, 0.9); c.stroke(); } },
      eyes(c, s, i, t, f, pal, eyes) { const fl = 0.85 + 0.15 * Math.sin(t * 13 + i * 2) * Math.sin(t * 4.3); const g = c.createRadialGradient(s.x, s.y + 0.05, 0.02, s.x, s.y, s.ry * 1.1); g.addColorStop(0, `rgba(255,226,140,${fl})`); g.addColorStop(1, "rgba(200,90,20,.9)"); c.fillStyle = g; c.fillRect(s.x - 0.5, s.y - 0.5, 1, 1); drawPupil(c, eyes, s, i, t, f, pal); },
      top(c) { c.fillStyle = "#5A6B2A"; c.strokeStyle = INK; c.lineWidth = 0.04; c.beginPath(); c.moveTo(-0.06, -1.04); c.quadraticCurveTo(-0.02, -1.26, 0.14, -1.3); c.lineTo(0.16, -1.22); c.quadraticCurveTo(0.06, -1.18, 0.07, -1.04); c.closePath(); c.fill(); c.stroke(); }
    }),
    ice: P("#D6EEF4", "#A7CFDC", "#FFFFFF", "#1B3A48", "#163241", "#EFFBFF", "rgba(255,255,255,.95)", {
      jawTop(c, t, drop, pal, bottom) { c.fillStyle = "rgba(225,247,255,.95)"; c.strokeStyle = "#1B3A48"; c.lineWidth = 0.03; for (const [x, l] of [[-0.17, 0.14], [-0.06, 0.22], [0.05, 0.13], [0.16, 0.18]]) { const y0 = bottom - 0.06 - x * x * 2.6; c.beginPath(); c.moveTo(x - 0.05, y0); c.lineTo(x + 0.05, y0); c.lineTo(x, y0 + 0.06 + l); c.closePath(); c.fill(); c.stroke(); } },
      top(c, t) { c.fillStyle = "#FFFFFF"; for (let i = 0; i < 6; i++) { const ph = (t * 0.35 + i / 6) % 1, x = -0.8 + ((i * 0.37) % 1) * 1.6, y = -0.6 + ph * 1.8; c.save(); c.globalAlpha *= 1 - ph; c.fillRect(x - 0.02, y - 0.02, 0.04, 0.04); c.restore(); } }
    }),
    gold: P("#E3B64B", "#B8862A", "#FFF3C0", "#3A2604", "#2A1B04", "#FFF4C8", "rgba(58,38,4,.6)", {
      idle: t => ((t % 6.5) < 1.1 ? "smug" : null),
      top(c, t) { glintAt(c, -0.5, -0.68, Math.pow(Math.max(0, Math.sin(t * 2.2)), 12)); glintAt(c, 0.55, -0.2, Math.pow(Math.max(0, Math.sin(t * 2.2 - 1.6)), 12) * 0.7); }
    }),
    crystal: P("rgba(196,232,240,.9)", "rgba(120,180,205,.92)", "#FFFFFF", "#1C3A4E", "rgba(20,48,66,.92)", "#EFFFFF", "rgba(255,255,255,.7)", {
      detail(c, t) { c.strokeStyle = "rgba(255,255,255,.5)"; c.lineWidth = 0.03; c.beginPath(); c.moveTo(-0.2, -1.05); c.lineTo(-0.05, -0.45); c.lineTo(0.55, -0.78); c.moveTo(-0.05, -0.45); c.lineTo(-0.75, -0.35); c.moveTo(0.55, -0.78); c.lineTo(0.88, -0.1); c.stroke();
        const k = (t * 0.5) % 2.4 - 1.2; const cols = ["rgba(255,120,120,.25)", "rgba(255,220,120,.25)", "rgba(120,255,170,.25)", "rgba(120,170,255,.25)", "rgba(200,120,255,.25)"];
        cols.forEach((col, i) => { c.fillStyle = col; c.beginPath(); c.moveTo(k + i * 0.07, -1.2); c.lineTo(k + i * 0.07 + 0.07, -1.2); c.lineTo(k + i * 0.07 - 0.35, 0.7); c.lineTo(k + i * 0.07 - 0.42, 0.7); c.fill(); }); }
    }),
    clock: P("#CFA457", "#9E7630", "#F7DFA0", "#2E1E08", "#22160A", "#F2E7C9", null, {
      detail(c, t) { c.fillStyle = "#2E1E08"; c.beginPath(); c.arc(0, -0.84, 0.19, 0, TAU); c.fill(); c.save(); c.translate(0, -0.84); c.rotate(t * 1.4); c.fillStyle = "#9E7630"; star(c, 0, 0, 0.15, 8, 0.72, 0); c.fill(); c.fillStyle = "#2E1E08"; c.beginPath(); c.arc(0, 0, 0.05, 0, TAU); c.fill(); c.restore();
        c.fillStyle = "#7A5820"; for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; c.beginPath(); c.arc(Math.cos(a) * 0.23, -0.84 + Math.sin(a) * 0.23, 0.022, 0, TAU); c.fill(); } },
      behind(c, t) { c.save(); c.translate(-0.94, -0.3); c.rotate(Math.sin(t * 3) * 0.2 + t); c.fillStyle = "#CFA457"; c.strokeStyle = INK; c.lineWidth = 0.05; c.beginPath(); c.ellipse(-0.14, 0, 0.14, 0.08, 0, 0, TAU); c.ellipse(0.14, 0, 0.14, 0.08, 0, 0, TAU); c.fill(); c.stroke(); c.restore(); c.fillStyle = "#9E7630"; c.fillRect(-0.94, -0.34, 0.16, 0.08); }
    }),
    radio: P("#E8D8B4", "#C4AE82", "#FBF2DA", INK, INK, CREAM, null, {
      idle: t => null,
      detail(c) { c.fillStyle = "#6E5A3A"; for (let i = 0; i < 6; i++) c.fillRect(0.6, -0.62 + i * 0.1, 0.24, 0.04); c.fillStyle = RED; c.beginPath(); rr(c, -0.24, -0.98, 0.48, 0.16, 0.06); c.fill(); c.strokeStyle = CREAM; c.lineWidth = 0.02; for (let i = 0; i < 8; i++) { c.beginPath(); c.moveTo(-0.2 + i * 0.057, -0.94); c.lineTo(-0.2 + i * 0.057, -0.88); c.stroke(); } },
      eyes(c, s, i, t, f, pal, eyes) {
        if ((t % 7) < 1.2 && !f.glyph && f.mood === "idle") { c.fillStyle = CREAM; c.beginPath(); c.arc(s.x, s.y, s.rx * 0.8, 0, TAU); c.fill(); c.strokeStyle = INK; c.lineWidth = 0.025; for (let k = 0; k < 10; k++) { const a = -Math.PI * 0.9 + k * 0.2; c.beginPath(); c.moveTo(s.x + Math.cos(a) * s.rx * 0.6, s.y + Math.sin(a) * s.rx * 0.6); c.lineTo(s.x + Math.cos(a) * s.rx * 0.74, s.y + Math.sin(a) * s.rx * 0.74); c.stroke(); } const na = -Math.PI * 0.9 + ((t * 2 + i) % 1.8); c.strokeStyle = RED; c.lineWidth = 0.04; c.beginPath(); c.moveTo(s.x, s.y); c.lineTo(s.x + Math.cos(na) * s.rx * 0.7, s.y + Math.sin(na) * s.rx * 0.7); c.stroke(); return; }
        drawPupil(c, eyes, s, i, t, f, pal);
      },
      top(c, t) { c.strokeStyle = INK; c.lineWidth = 0.045; c.beginPath(); c.moveTo(0.3, -1.02); c.lineTo(0.55, -1.42); c.stroke(); c.fillStyle = (t % 1) < 0.5 ? RED : "#D96A5A"; c.beginPath(); c.arc(0.55, -1.42, 0.07, 0, TAU); c.fill(); c.stroke(); }
    }),
    space: P("#D5E4E4", "#9DB8BA", "#FFFFFF", "#1A2A33", "#13212A", "#E9FFF9", null, {
      behind(c) { c.fillStyle = RED; c.strokeStyle = INK; c.lineWidth = 0.05; c.beginPath(); c.moveTo(-0.18, -0.95); c.quadraticCurveTo(0, -1.55, 0.32, -1.45); c.quadraticCurveTo(0.12, -1.25, 0.2, -0.95); c.closePath(); c.fill(); c.stroke(); },
      top(c, t) { c.strokeStyle = "rgba(200,240,255,.55)"; c.lineWidth = 0.05; c.beginPath(); c.arc(0, 0, 1.22, 0, TAU); c.stroke(); c.strokeStyle = "rgba(255,255,255,.7)"; c.lineWidth = 0.07; c.beginPath(); c.arc(0, 0, 1.1, Math.PI * 1.1, Math.PI * 1.4); c.stroke();
        c.strokeStyle = INK; c.lineWidth = 0.04; c.beginPath(); c.moveTo(-0.5, -0.92); c.lineTo(-0.7, -1.3); c.stroke(); c.fillStyle = (t % 0.8) < 0.4 ? GOLD : "#FFF3C0"; c.beginPath(); c.arc(-0.7, -1.3, 0.07, 0, TAU); c.fill(); c.stroke(); }
    }),
    flaming: P("#EBD3A8", "#C9A472", "#FFF4DA", "#2A1206", "#1E0C04", "#FFD27A", "#E8893A", {
      behind(c, t) { flameTongues(c, t, 6, 1.5, -0.55, [RED, EMBER, MUSTARD]); },
      eyes(c, s, i, t, f, pal, eyes) { c.fillStyle = "rgba(232,137,58,.45)"; c.beginPath(); c.arc(s.x, s.y + 0.04, s.rx * 0.6, 0, TAU); c.fill(); drawPupil(c, eyes, s, i, t, f, pal); }
    })
  };

  // ───────────────────────── paint jobs (clipped to the cranium) ─────────────────────────
  function drawPaint(c, id, t) {
    c.save();
    const cap = (col) => { c.fillStyle = col; c.beginPath(); c.moveTo(-1.2, -1.3); c.lineTo(1.2, -1.3); c.lineTo(1.2, -0.62); for (let x = 1.2; x >= -1.2; x -= 0.2) c.quadraticCurveTo(x - 0.1, -0.52, x - 0.2, -0.62); c.closePath(); c.fill(); c.strokeStyle = INK; c.lineWidth = 0.035; c.stroke(); };
    const wash = (col) => { c.globalAlpha *= 0.82; c.fillStyle = col; c.fillRect(-1.2, -1.3, 2.4, 2.6); c.globalAlpha /= 0.82; c.fillStyle = "rgba(0,0,0,.18)"; c.beginPath(); c.rect(-1.2, -1.3, 2.4, 2.6); c.arc(-0.13, -0.3, 0.92, 0, TAU, true); c.fill(); };
    switch (id) {
      case "creamred": cap(RED); c.fillStyle = CREAM; c.fillRect(-1.2, -0.98, 2.4, 0.06); break;
      case "teal": cap(TEAL); c.fillStyle = CREAM; c.fillRect(-1.2, -0.98, 2.4, 0.06); break;
      case "mustard": wash(MUSTARD); cap(INK); break;
      case "midnight": wash(MIDNIGHT); break;
      case "purple": wash(PURPLE); break;
      case "red": wash(RED); break;
      case "stripes": for (let i = -8; i < 8; i++) { if (i % 2) continue; c.fillStyle = RED; c.fillRect(i * 0.16, -1.3, 0.16, 2.6); } break;
      case "dots": c.fillStyle = RED; for (let y = -1.1, row = 0; y < 0.7; y += 0.26, row++) for (let x = -1 + (row % 2) * 0.13; x < 1.1; x += 0.26) { c.beginPath(); c.arc(x, y, 0.07, 0, TAU); c.fill(); } break;
      case "checks": c.fillStyle = "rgba(23,19,15,.78)"; for (let y = -1.3, r = 0; y < 0.7; y += 0.2, r++) for (let x = -1.2 + (r % 2) * 0.2; x < 1.2; x += 0.4) c.fillRect(x, y, 0.2, 0.2); break;
      case "pin": c.fillStyle = INK; for (let x = -1.1; x < 1.1; x += 0.12) c.fillRect(x, -1.3, 0.016, 2.6); break;
      case "stars": { const rnd = mulberry32(31); c.fillStyle = MUSTARD; c.strokeStyle = INK; c.lineWidth = 0.02; for (let i = 0; i < 16; i++) { star(c, rnd() * 2 - 1, rnd() * 1.7 - 1.15, 0.07 + rnd() * 0.04, 5, 0.45, rnd()); c.fill(); c.stroke(); } break; }
      case "news": { c.fillStyle = "rgba(232,216,180,.85)"; c.fillRect(-1.2, -1.3, 2.4, 2.6); c.fillStyle = INK; c.fillRect(-0.6, -1.0, 1.2, 0.12); for (let i = 0; i < 7; i++) c.fillRect(-0.8 + (i % 2) * 0.04, -0.8 + i * 0.07, i % 3 === 2 ? 0.9 : 1.5, 0.025);
        c.fillStyle = "rgba(23,19,15,.35)"; for (let y = -0.2; y < 0.6; y += 0.07) for (let x = -1; x < 1; x += 0.07) { c.beginPath(); c.arc(x, y, 0.012 + 0.012 * ((x + y + 2) % 0.5), 0, TAU); c.fill(); } break; }
      case "floral": { const cols = [RED, TEAL, MUSTARD, PURPLE]; const pts = [[-0.55, -0.75], [0.1, -0.95], [0.6, -0.6], [-0.75, -0.2], [0.75, 0.05], [-0.1, -0.62]];
        pts.forEach(([x, y], i) => { for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU; c.fillStyle = cols[i % 4]; c.beginPath(); c.ellipse(x + Math.cos(a) * 0.07, y + Math.sin(a) * 0.07, 0.06, 0.035, a, 0, TAU); c.fill(); } c.fillStyle = CREAM; c.beginPath(); c.arc(x, y, 0.03, 0, TAU); c.fill(); c.strokeStyle = "#5E7038"; c.lineWidth = 0.02; c.beginPath(); c.moveTo(x + 0.08, y + 0.05); c.quadraticCurveTo(x + 0.18, y + 0.12, x + 0.24, y + 0.06); c.stroke(); }); break; }
      case "spiral": c.strokeStyle = RED; c.lineWidth = 0.07; c.beginPath(); for (let k = 0; k <= 90; k++) { const a = k * 0.28 + t * 0.4, r = k * 0.013; const x = Math.cos(a) * r, y = -0.4 + Math.sin(a) * r; k ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); break;
      default: if (PAINTS[id]) PAINTS[id](c, t);
    }
    c.restore();
  }
