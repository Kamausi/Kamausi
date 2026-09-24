  // ───────────────────────── Morty's body parts and the new slots (v44) ─────────────────────────
  // Drawn in skull units (r = 1, the cranium's crown at about y = −1.05, the jaw from y ≈ 0.45), inside drawSkull, so
  // every place that draws Morty (the play, the Vault, the board, the icons) draws them too. Wings go behind the skull;
  // hair sits on the crown (under any hat), facial hair on the jaw and drops with it. Wizard Mort adds his beard here and
  // his hat as a hat (hatOf). The launcher's frames are at the end.
  const HAIR_COL = { bun: "#3A2A1E", flattop: "#2A2220", pompadour: "#2A1E18", pigtails: "#C8642A", mohawk: "#A94332", mullet: "#6A4A2E", afro: "#2A1E18", flame: "#E8893A", vines: "#5E7A36", quiff: "#1E1C22", moss: "#5A6A4A" };
  const inkB = (c, col) => { c.fillStyle = col; c.fill(); c.stroke(); };
  const HAIR = {
    bun(c) { c.beginPath(); c.ellipse(0, -1.02, 0.62, 0.16, 0, Math.PI, 0); inkB(c, HAIR_COL.bun); c.beginPath(); c.arc(0.05, -1.22, 0.2, 0, TAU); inkB(c, HAIR_COL.bun); },
    flattop(c) { c.beginPath(); c.moveTo(-0.62, -0.85); c.lineTo(-0.58, -1.3); c.lineTo(0.58, -1.3); c.lineTo(0.62, -0.85); c.quadraticCurveTo(0, -1.02, -0.62, -0.85); inkB(c, HAIR_COL.flattop); },
    pompadour(c, t) { c.beginPath(); c.moveTo(-0.66, -0.82); c.quadraticCurveTo(-0.7, -1.2, -0.2, -1.22); c.bezierCurveTo(0.4, -1.5, 0.95, -1.35, 0.72, -1.05); c.quadraticCurveTo(0.7, -0.9, 0.64, -0.82); c.quadraticCurveTo(0, -1.0, -0.66, -0.82); inkB(c, HAIR_COL.pompadour);
      c.strokeStyle = "rgba(255,255,255,.3)"; c.beginPath(); c.moveTo(-0.1, -1.24); c.quadraticCurveTo(0.35, -1.4, 0.6, -1.2); c.stroke(); c.strokeStyle = INK; void t; },
    pigtails(c, t) { c.beginPath(); c.ellipse(0, -0.98, 0.64, 0.2, 0, Math.PI, 0); inkB(c, HAIR_COL.pigtails); for (const sd of [-1, 1]) { const sw = Math.sin(t * 3 + sd) * 0.08; c.beginPath(); c.ellipse(sd * 0.85, -0.6 + sw, 0.14, 0.34, sd * 0.4, 0, TAU); inkB(c, HAIR_COL.pigtails); } },
    mohawk(c) { c.beginPath(); c.moveTo(-0.12, -0.95); for (let i = 0; i <= 6; i++) { const x = -0.5 + i * 0.17; c.lineTo(x * 0.5, -1.05 - (i % 2 ? 0.25 : 0.55) + Math.abs(x) * 0.3); } c.lineTo(0.12, -0.95); c.closePath(); inkB(c, HAIR_COL.mohawk); },
    mullet(c) { c.beginPath(); c.moveTo(-0.64, -0.8); c.quadraticCurveTo(-0.6, -1.25, 0, -1.2); c.quadraticCurveTo(0.6, -1.25, 0.64, -0.8); c.lineTo(0.9, -0.2); c.lineTo(0.66, -0.4); c.lineTo(0.62, -0.84); c.quadraticCurveTo(0, -1.0, -0.62, -0.84); c.closePath(); inkB(c, HAIR_COL.mullet); },
    afro(c) { for (const [x, y, r] of [[-0.55, -0.95, 0.32], [0.55, -0.95, 0.32], [-0.3, -1.25, 0.34], [0.3, -1.25, 0.34], [0, -1.35, 0.34]]) { c.beginPath(); c.arc(x, y, r, 0, TAU); inkB(c, HAIR_COL.afro); } },
    flame(c, t) { for (let i = 0; i < 5; i++) { const x = -0.5 + i * 0.25, h = 0.45 + 0.15 * Math.sin(t * 9 + i * 1.7); c.beginPath(); c.moveTo(x - 0.15, -0.9); c.quadraticCurveTo(x - 0.1, -1.0 - h * 0.6, x + Math.sin(t * 7 + i) * 0.06, -1.0 - h); c.quadraticCurveTo(x + 0.12, -1.0 - h * 0.5, x + 0.15, -0.9); c.closePath(); inkB(c, i % 2 ? "#E8893A" : "#F5C84A"); } },
    vines(c, t) { c.lineWidth = 0.1; c.strokeStyle = INK; for (let i = 0; i < 5; i++) { const x = -0.55 + i * 0.27, cx = x + Math.sin(t * 2 + i) * 0.05; c.beginPath(); c.moveTo(x, -0.92); c.bezierCurveTo(x - 0.2, -1.2, cx + 0.3, -1.35, cx, -1.18); c.stroke(); c.strokeStyle = HAIR_COL.vines; c.lineWidth = 0.06; c.stroke(); c.strokeStyle = INK; c.lineWidth = 0.1; }
      c.lineWidth = 0.04; c.beginPath(); c.ellipse(0.35, -1.26, 0.13, 0.07, 0.6, 0, TAU); inkB(c, "#7F9447"); },
    quiff(c) { c.beginPath(); c.moveTo(-0.64, -0.84); c.quadraticCurveTo(-0.5, -1.2, 0.1, -1.18); c.bezierCurveTo(0.2, -1.7, 1.05, -1.6, 0.85, -1.2); c.quadraticCurveTo(0.7, -1.0, 0.62, -0.84); c.quadraticCurveTo(0, -1.0, -0.64, -0.84); inkB(c, HAIR_COL.quiff);
      c.strokeStyle = GOLD; c.lineWidth = 0.04; c.beginPath(); c.moveTo(0.2, -1.35); c.quadraticCurveTo(0.5, -1.55, 0.8, -1.3); c.stroke(); c.strokeStyle = INK; },
    moss(c, t) { c.beginPath(); c.ellipse(0, -1.0, 0.66, 0.2, 0, Math.PI, 0); inkB(c, HAIR_COL.moss); c.strokeStyle = "#6A7A60"; c.lineWidth = 0.035;
      for (let i = 0; i < 9; i++) { const x = -0.6 + i * 0.15, len = 0.25 + ((i * 7) % 5) * 0.08; c.beginPath(); c.moveTo(x, -0.95); c.lineTo(x + Math.sin(t * 2 + i) * 0.04, -0.95 + len); c.stroke(); } c.strokeStyle = INK; }
  };
  const BEARD = {
    pencil(c) { c.lineWidth = 0.06; c.beginPath(); c.moveTo(-0.3, 0.3); c.quadraticCurveTo(0, 0.24, 0.3, 0.3); c.stroke(); },
    goatee(c) { c.beginPath(); c.moveTo(-0.16, 0.72); c.quadraticCurveTo(0, 1.15, 0.16, 0.72); c.closePath(); inkB(c, "#3A2A1E"); },
    chops(c) { for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(sd * 0.62, 0.0); c.quadraticCurveTo(sd * 0.72, 0.5, sd * 0.4, 0.72); c.lineTo(sd * 0.42, 0.3); c.closePath(); inkB(c, "#6A4A2E"); } },
    lumberjack(c) { c.beginPath(); c.moveTo(-0.58, 0.2); c.quadraticCurveTo(-0.62, 1.05, 0, 1.2); c.quadraticCurveTo(0.62, 1.05, 0.58, 0.2); c.quadraticCurveTo(0.3, 0.62, 0, 0.6); c.quadraticCurveTo(-0.3, 0.62, -0.58, 0.2); inkB(c, "#8A4A22"); },
    braids(c) { c.beginPath(); c.moveTo(-0.5, 0.35); c.quadraticCurveTo(0, 0.95, 0.5, 0.35); c.quadraticCurveTo(0, 0.7, -0.5, 0.35); inkB(c, "#C8A04A"); for (const sd of [-1, 1]) { for (let i = 0; i < 3; i++) { c.beginPath(); c.ellipse(sd * 0.2, 0.8 + i * 0.16, 0.08, 0.09, 0, 0, TAU); inkB(c, "#C8A04A"); } } },
    cobweb(c) { c.strokeStyle = "rgba(230,230,240,.85)"; c.lineWidth = 0.025; for (let i = 0; i <= 6; i++) { const a = Math.PI * (0.15 + i * 0.117); c.beginPath(); c.moveTo(0, 0.45); c.lineTo(Math.cos(a) * 0.7, 0.45 + Math.sin(a) * 0.7); c.stroke(); }
      for (const r of [0.25, 0.45, 0.65]) { c.beginPath(); for (let i = 0; i <= 6; i++) { const a = Math.PI * (0.15 + i * 0.117); (i ? c.lineTo : c.moveTo).call(c, Math.cos(a) * r, 0.45 + Math.sin(a) * r); } c.stroke(); } c.strokeStyle = INK; },
    handlebar(c) { for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(0, 0.3); c.bezierCurveTo(sd * 0.35, 0.18, sd * 0.55, 0.42, sd * 0.72, 0.1); c.bezierCurveTo(sd * 0.72, 0.3, sd * 0.4, 0.42, 0, 0.36); c.closePath(); inkB(c, GOLD); } },
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
  // behind the skull: the wings, flapping (on twos) when it flies
  function drawBodyBehind(c, look, t) {
    const W1 = WINGS[look.wings]; if (!W1) return;
    const flap = Math.sin(Math.floor(t * 12) / 12 * 9) * 0.18;
    c.save(); c.lineWidth = 0.05; c.strokeStyle = INK; c.lineJoin = "round";
    for (const sd of [-1, 1]) { c.save(); c.scale(sd, 1); c.rotate(-0.1 - flap); W1(c, t, sd); c.restore(); }
    c.restore();
  }
  // in front: hair on the crown, facial hair on the jaw (dropped with it), and Wizard Mort's beard
  function drawBodyFront(c, look, t, jawDrop) {
    c.save(); c.lineWidth = 0.05; c.strokeStyle = INK; c.lineJoin = "round"; c.lineCap = "round";
    if (HAIR[look.hair]) HAIR[look.hair](c, t);
    if (GLASSES[look.glasses]) { c.save(); GLASSES[look.glasses](c, t, SOCK[0].x < SOCK[1].x ? SOCK : [SOCK[1], SOCK[0]]); c.restore(); }   // (v45: over the sockets)
    c.translate(0, jawDrop);
    if (look.wizard === "mort" || look.wizard === "apprentice") {   // the wizard's beard: long and white, the apprentice's still short
      const L = look.wizard === "mort" ? 1.6 : 0.95; c.beginPath(); c.moveTo(-0.55, 0.3); c.quadraticCurveTo(-0.5, L * 0.8, 0.05 + Math.sin(t * 2) * 0.05, L); c.quadraticCurveTo(0.5, L * 0.8, 0.55, 0.3); c.quadraticCurveTo(0, 0.62, -0.55, 0.3); inkB(c, "#F4F0E8");
      c.strokeStyle = "rgba(160,150,140,.7)"; c.lineWidth = 0.03; for (const x of [-0.2, 0.05, 0.28]) { c.beginPath(); c.moveTo(x, 0.55); c.quadraticCurveTo(x + 0.05, L * 0.7, x * 0.4, L * 0.92); c.stroke(); } c.strokeStyle = INK; c.lineWidth = 0.05;
    } else if (BEARD[look.beard]) BEARD[look.beard](c, t);
    c.restore();
  }
  // the hat Morty wears: Wizard Mort's, when he's the wizard
  const hatOf = (L = cos) => (L.wizard === "mort" || L.wizard === "apprentice" ? "wiz_" + L.wizard : L.hat);
  Object.assign(HATS, {
    wiz_apprentice(c) { brimEllipse(c, -0.86, 0.8, 0.13, "#3A4A8A"); c.fillStyle = "#3A4A8A"; c.beginPath(); c.moveTo(-0.5, -0.88); c.quadraticCurveTo(-0.1, -1.4, 0.15, -1.85); c.quadraticCurveTo(0.2, -1.4, 0.5, -0.88); c.closePath(); inkFill(c); c.fillStyle = MUSTARD; star(c, 0.0, -1.2, 0.12, 5, 0.45, -Math.PI / 2); c.fill(); },
    wiz_mort(c, t) { brimEllipse(c, -0.86, 1.0, 0.15, "#2A2060"); c.fillStyle = "#2A2060"; c.beginPath(); c.moveTo(-0.58, -0.88); c.quadraticCurveTo(-0.2, -1.7, 0.25, -2.35); c.quadraticCurveTo(0.6, -2.4, 0.75, -2.15 + Math.sin(t * 2) * 0.05); c.quadraticCurveTo(0.35, -2.1, 0.3, -1.7); c.quadraticCurveTo(0.35, -1.2, 0.58, -0.88); c.closePath(); inkFill(c);
      c.fillStyle = "#F5D84A"; for (const [x, y, r] of [[-0.15, -1.2, 0.13], [0.2, -1.55, 0.09], [-0.25, -0.98, 0.07]]) { star(c, x, y, r, 5, 0.45, t * 0.8); c.fill(); }
      c.fillStyle = "#E8E0FF"; c.beginPath(); c.arc(0.1, -1.05, 0.07, 0, TAU); c.fill(); c.strokeStyle = "#0A0A10"; c.lineWidth = 0.035; c.beginPath(); c.arc(0.1, -1.05, 0.05, 0, TAU); c.stroke(); }   // (a little Black Ring on the band)
  });
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
