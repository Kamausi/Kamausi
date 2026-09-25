  // ───────────────────────── Morty's body, section by section (v48) ─────────────────────────
  // Morty arrived in this world as a skull: head intact, jaw and all, and nothing else. Each of the first seven end
  // bosses has one section of his body (src/maps/*.json: sheet.reward.section): the Pumpkin King coughs up his Left
  // Arm with the first shard, and so on through the right arm, the ribs, the spine, the pelvis and both legs. When
  // an end boss goes down, the section flies home and snaps on, and it stays his (profile.body), shown in the
  // Profile with what's still missing pencilled in. The eighth boss gives back no bone: its shard closes the Black
  // Ring. (Each end boss still leaves a look behind too, his to wear: 01b_catalog.js.)
  const sectionOf = n => (mapData(n).sheet.reward || {}).section || null;
  const bodyHas = id => (profile.body || []).includes(id);
  // ── the drawing: rubber-hose bones hung under the skull, in the skull's own scale (r: the skull's radius)
  function boneStroke(c, pts, w) {   // a bone along a path: ink under cream, a knob at each end
    const line = col => { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.strokeStyle = col; c.stroke(); };
    c.lineCap = "round"; c.lineJoin = "round"; c.lineWidth = w * 1.55; line(INK); c.lineWidth = w; line("#EDE3C8");
    for (const [x, y] of [pts[0], pts[pts.length - 1]]) for (const s of [-1, 1]) { c.beginPath(); c.arc(x + s * w * 0.32, y, w * 0.42, 0, TAU); c.fillStyle = "#EDE3C8"; c.fill(); c.lineWidth = w * 0.22; c.strokeStyle = INK; c.stroke(); }
  }
  const BODY_PARTS = {   // each in skull radii, the skull's centre at 0, 0
    spine(c, r) { for (let i = 0; i < 7; i++) { const y = r * (1.0 + i * 0.27); c.beginPath(); rr(c, -r * 0.16, y, r * 0.32, r * 0.2, r * 0.06); c.fillStyle = "#EDE3C8"; c.fill(); c.lineWidth = r * 0.05; c.strokeStyle = INK; c.stroke(); } },
    ribs(c, r) { for (let i = 0; i < 4; i++) { const y = r * (1.28 + i * 0.22), w = r * (0.78 - i * 0.08); for (const s of [-1, 1]) boneStroke(c, [[s * r * 0.14, y], [s * w * 0.75, y - r * 0.02], [s * w, y + r * 0.22]], r * 0.1); } },
    pelvis(c, r) { c.beginPath(); c.moveTo(0, r * 2.85); for (const s of [1, -1]) { c.quadraticCurveTo(s * r * 0.75, r * 2.6, s * r * 0.62, r * 3.05); c.quadraticCurveTo(s * r * 0.3, r * 3.25, 0, r * 3.05); } c.closePath();
      c.fillStyle = "#EDE3C8"; c.fill(); c.lineWidth = r * 0.06; c.strokeStyle = INK; c.stroke(); for (const s of [-1, 1]) { c.beginPath(); c.ellipse(s * r * 0.3, r * 2.93, r * 0.1, r * 0.07, 0, 0, TAU); c.fillStyle = INK; c.fill(); } },
    leftArm(c, r, t) { boneArm(c, r, 1, t); }, rightArm(c, r, t) { boneArm(c, r, -1, t); },
    leftLeg(c, r) { boneLeg(c, r, 1); }, rightLeg(c, r) { boneLeg(c, r, -1); }
  };
  function boneArm(c, r, s, t = 0) {   // Morty's left is on your right, as he faces you; a white rubber-hose glove on the end
    const wave = Math.sin(t * 3 + s) * 0.08;
    const sh = [s * r * 0.62, r * 1.2], el = [s * r * 1.0, r * 1.8], wr = [s * r * (1.2 + wave), r * 2.35];
    boneStroke(c, [sh, el], r * 0.12); boneStroke(c, [el, wr], r * 0.1);
    c.fillStyle = "#F7F1DF"; c.strokeStyle = INK; c.lineWidth = r * 0.05; c.beginPath(); c.arc(wr[0], wr[1] + r * 0.12, r * 0.2, 0, TAU); c.fill(); c.stroke();
    for (let i = 0; i < 3; i++) { c.beginPath(); c.ellipse(wr[0] + s * r * (0.04 + i * 0.1) - s * r * 0.08, wr[1] + r * 0.3, r * 0.055, r * 0.1, 0, 0, TAU); c.fill(); c.stroke(); }
    c.beginPath(); c.moveTo(wr[0] - r * 0.18, wr[1] - r * 0.04); c.lineTo(wr[0] + r * 0.18, wr[1] - r * 0.04); c.lineWidth = r * 0.07; c.stroke();
  }
  function boneLeg(c, r, s) {
    const hip = [s * r * 0.3, r * 3.05], kn = [s * r * 0.4, r * 3.95], an = [s * r * 0.36, r * 4.8];
    boneStroke(c, [hip, kn], r * 0.14); boneStroke(c, [kn, an], r * 0.12);
    c.fillStyle = "#1E1A18"; c.strokeStyle = INK; c.lineWidth = r * 0.05; c.beginPath(); c.ellipse(an[0] + s * r * 0.14, an[1] + r * 0.1, r * 0.3, r * 0.13, 0, 0, TAU); c.fill(); c.stroke();   // a cartoon shoe
  }
  // the whole of him as he stands: what he has in bone, what's missing pencilled in (ghost), new: a section on its way home
  function drawBody(c, x, y, r, have, o = {}) {
    c.save(); c.translate(x, y);
    for (const id of ["spine", "ribs", "pelvis", "leftLeg", "rightLeg", "leftArm", "rightArm"]) {
      const owned = have.includes(id), isNew = o.newId === id;
      if (!owned && !isNew) { if (o.ghosts) { c.save(); c.globalAlpha *= 0.16; c.setLineDash([r * 0.08, r * 0.1]); BODY_PARTS[id](c, r, o.t); c.restore(); } continue; }
      if (isNew) { const k = o.k == null ? 1 : o.k; if (k <= 0) continue; c.save(); c.translate((1 - k) * r * (id.startsWith("right") ? -5 : 5), -(1 - k) * r * 4); c.rotate((1 - k) * 2.2); BODY_PARTS[id](c, r, o.t); c.restore(); continue; }
      BODY_PARTS[id](c, r, o.t);
    }
    c.restore();
    drawSkull(c, x, y, r, { t: o.t || 0, face: o.face || faceFor(o.happy ? "perfect" : "idle", o.t || 0) });
  }
  // ── the reward: after the end boss goes down, the section flies home and snaps on
  function bodyReward(then) {
    const id = sectionOf(game.stage); if (!id || game.mode !== "story") { then(); return; }
    const fresh = !bodyHas(id);
    if (fresh) profile.body = (profile.body || []).concat(id);
    game.run.sections = (game.run.sections || []).concat(id);
    Telemetry.emit("body", { id, fresh, stage: game.stage });
    checkUnlocks(); persist();
    if (sandbox && !sandbox.bodyOn) { then(); return; }   // (older tests expect the shard straight after the boss)
    stageCard(t("body.k"), t(`body.${id}`), t("body.s", { n: profile.body.length, total: BODY_SECTIONS.length }), 2.6, "gold");
    Sound.toon("whistleUp"); game.run.bodyShow = { id, t0: game.time };
    cine("body", 2.6, () => { game.run.bodyShow = null; then(); }, 0.3);
  }
  function drawBodyShow() {
    const S = game.run && game.run.bodyShow; if (!S || !game.cine || game.cine.kind !== "body") return;
    const u = game.time - S.t0, k = smooth(clamp((u - 0.35) / 0.8, 0, 1)), a = clamp(u / 0.3, 0, 1) * clamp((2.6 - u) / 0.3, 0, 1);
    ctx.save(); ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.globalAlpha = a;
    ctx.fillStyle = "rgba(10,7,6,.72)"; ctx.fillRect(0, 0, W, H);
    const r = Math.min(H * 0.075, W * 0.11), x = W / 2, y = H * 0.36 - r * 2.2;
    drawBody(ctx, x, y, r, (profile.body || []).filter(b => b !== S.id), { newId: S.id, k, t: game.time, ghosts: true, happy: k >= 1 });
    if (k >= 1 && u < 1.6) { ctx.globalAlpha = a * (1 - (u - 1.15) / 0.45); ctx.strokeStyle = "#FFE08A"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x + (S.id.startsWith("right") ? -1 : 1) * r * 0.9, y + r * 1.8, r * (0.4 + (u - 1.15) * 1.5), 0, TAU); ctx.stroke(); }
    ctx.restore();
    if (k >= 1 && !S.snapped) { S.snapped = true; Sound.toon("clang"); gpuBurst(x, y + r * 1.8, GPU_FX.pickup); }
  }
  // ── the Profile: his bones so far
  function renderBodyCard() {
    const cv = $("profBody"); if (!cv) return;
    const [c, R] = fitCanvas(cv); if (!R.width) return;
    c.clearRect(0, 0, R.width, R.height);
    const have = profile.body || [], r = Math.min(R.height / 6.4, R.width / 3.2);
    drawBody(c, R.width / 2, r * 1.05, r, have, { ghosts: true, t: 0 });
    $("profBodyN").textContent = t("body.count", { n: have.length, total: BODY_SECTIONS.length });
  }
