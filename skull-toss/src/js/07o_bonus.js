  // ───────────────────────── v45: Can Alley, the bonus round after an end boss ─────────────────────────
  // After each end boss but the last, once the shard has been shown, Mort's carnival stand is offered: ten tin cans
  // stacked four-three-two-one on a plank in his booth. Take it or skip it (fifteen seconds to choose).
  // Taken, you have twenty-five seconds and misses are free. Each can pays 5 bones; all ten pay a clear bonus (100, and 25 more a map) and, the first time on each
  // map, that map's carnival prize (01b_catalog.js: req cans:<map>).
  // The round itself is the Adventure's "encore" phase (07i_modes.js): free misses, no hazards, no continue, a clock.
  // v56: no ring in front of it any more: Can Alley is a booth (07u_attractions.js). The stack stands on a stand in a
  // red striped booth, numbered cans with weight: a can that's hit flies the way it was pushed and takes every can
  // resting on it; the skull ploughs on through, slowed by each can it meets; and a can that flies knocks over any it
  // runs into, so a glancing hit can start a chain. The whole pyramid in one throw is a CLEAN SWEEP.
  const CANS = { rows: [4, 3, 2, 1], r: 0.13, h: 0.3, gap: 0.03, z: 7.0, base: 1.3, secs: 25, per: 5, offer: 15 };
  const canClearBonus = n => 100 + 25 * n;
  const cans = [];
  let canStand = null;   // the plank the stack stands on: { x0, x1, y, z }
  const cansLeft = () => cans.filter(c => !c.down).length;
  const canPrize = n => CAN_PRIZES[n - 1] ? findItem(CAN_PRIZES[n - 1][0], CAN_PRIZES[n - 1][1]) : null;
  const canFocusY = () => CANS.base + (CANS.rows.length * CANS.h) / 2;
  function canLayout() {
    cans.length = 0;
    const z = CANS.z, w = CANS.r * 2 + CANS.gap, H = CANS.h, y0 = CANS.base;
    let num = 0;
    CANS.rows.forEach((n, row) => { for (let i = 0; i < n; i++) { const x = (i - (n - 1) / 2) * w, y = y0 + row * H + H / 2;
      cans.push({ row, i, num: ++num, hits: 0, x, y, z, down: 0, go: 0, fall: 0, vx: 0, vy: 0, vz: 0, rot: 0, vr: 0, rest: false }); } });
    canStand = { x0: -(CANS.rows[0] * w) / 2 - 0.12, x1: (CANS.rows[0] * w) / 2 + 0.12, y: y0, z };
    ATTR.upBefore = cans.length; ATTR.thisThrow = 0;
  }
  function clearCans() { cans.length = 0; canStand = null; }
  // a can resting on this one (the two below hold each can up)
  const restsOn = (c, o) => o.row === c.row - 1 && (o.i === c.i || o.i === c.i + 1);
  // hit: what struck it, { x, y, z, vx, vy, vz } (the skull, or another can); null: it lost its footing
  function knockCan(c, hit) {
    if (c.down) return;
    c.down = 1; profile.cansDown++; game.run.cans = (game.run.cans || 0) + 1; ATTR.thisThrow = (ATTR.thisThrow || 0) + 1;
    if (hit) {   // it flies off the way it was pushed
      const k = hit.can ? 0.6 : 1;   // (a can knocked by another goes with less than the skull gives)
      Object.assign(c, { go: 1, vx: ((c.x - hit.x) * 6 + hit.vx * 0.35 + aRand(-0.3, 0.3)) * k, vy: (aRand(1.2, 2.0) + Math.max(0, hit.vy) * 0.2) * k, vz: Math.max(0.3, hit.vz * 0.12) * k, vr: aRand(-10, 10) });
      const p = project(c.x, c.y, c.z); Sound.toon("clang", panOf(c.x)); buzz(8);
      if (hit.can) for (let k = 0; k < 3; k++) particles.push({ kind: "dot", x: p.x, y: p.y, vx: rand(-0.2, 0.2) * U, vy: -rand(0.1, 0.3) * U, rot: 0, vr: 0, life: 0.35, max: 0.35, size: rand(1.5, 3), color: "#D8DCE2", g: 0.6, a: 1 });   // (a spark where they clash)
    } else c.fall = 0.1 + aRand(0, 0.08);   // lost its footing: it goes a beat later
    for (const o of cans) if (!o.down && cans.some(b => b.down && restsOn(o, b))) knockCan(o, null);   // and the ones resting on it go too
    renderProgress();
  }
  // in flight: every can the skull meets goes, and each one slows it (four at most, then it's spent)
  function canCheck(s, prev) {
    if (!cans.length || (s.canHits || 0) >= 3 || s.sub) return;
    for (const c of cans) {
      if (c.down || sweptDist(prev, s.pos, c) > SKULL_R + CANS.r * 1.1) continue;
      const v = velAt(s, s.t), first = !s.canHit;
      s.canHit = true; s.canHits = (s.canHits || 0) + 1;
      knockCan(c, { x: s.pos.x, y: s.pos.y, z: s.pos.z, vx: v.x, vy: v.y, vz: v.z });
      s.p0 = { ...s.pos }; s.t = 0; s.v0 = { x: v.x * 0.6 + (s.pos.x - c.x) * 2.2, y: v.y * 0.5 + 0.3, z: v.z * 0.45 }; s.ax = 0;   // the can's weight: slowed and turned
      if (first && !game.result) { s.crossed = true; attrHit("tgt", c, t("cans.hit"), 0, { fx: "clank" }); }
      if (s.v0.z < 2) return;
    }
  }
  function updateCans(dt) {
    for (const c of cans) {
      if (c.fall > 0) { c.fall -= dt; if (c.fall <= 0) Object.assign(c, { go: 1, vx: (c.x >= 0 ? 1 : -1) * aRand(0.2, 0.7), vy: aRand(0.2, 0.7), vz: aRand(0.1, 0.5), vr: aRand(-6, 6) }); continue; }
      if (!c.go || c.rest) continue;
      c.vy -= G * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.z += c.vz * dt; c.rot += c.vr * dt;
      // a can that flies hard into another knocks it over too (the chain)
      if (c.hits < 2 && Math.hypot(c.vx, c.vz) > 1.2) for (const o of cans) if (!o.down && Math.hypot(o.x - c.x, o.y - c.y, o.z - c.z) < CANS.r * 2.15) { c.hits = (c.hits || 0) + 1; knockCan(o, { x: c.x, y: c.y, z: c.z, vx: c.vx, vy: c.vy, vz: c.vz, can: true }); }
      const S = canStand, onStand = S && Math.abs(c.z - S.z) < 0.25 && c.x > S.x0 && c.x < S.x1 && c.y > S.y, floor = onStand ? S.y + CANS.r : CANS.r;   // (on the stand, or the ground)
      if (c.y <= floor) {   // a clatter, a bounce or two, then it lies there
        c.y = floor; if (Math.abs(c.vy) > 1.2) Sound.toon("knock", panOf(c.x));
        c.vy = -c.vy * 0.35; c.vx *= 0.6; c.vz *= 0.6; c.vr *= 0.5;
        if (Math.abs(c.vy) < 0.5) { c.rest = true; c.rot = Math.round((c.rot - Math.PI / 2) / Math.PI) * Math.PI + Math.PI / 2; }   // (on its side)
      }
    }
  }
  // ── drawing (behind the attraction's plane): the stand, then the cans
  function drawCans() {
    if (!canStand) return;
    const S = canStand, a = project(S.x0, S.y, S.z), b = project(S.x1, S.y, S.z), th = 0.07 * a.s, skirt = Math.min(0.3, S.y * 0.3) * a.s;
    ctx.save(); ctx.lineJoin = "round"; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.5, a.s * 0.015);
    for (const x of [S.x0 + 0.1, S.x1 - 0.1]) { const p = project(x, S.y, S.z), g = project(x, 0, S.z); ctx.fillStyle = "#5A3A22"; ctx.fillRect(p.x - th * 0.4, p.y, th * 0.8, g.y - p.y); ctx.strokeRect(p.x - th * 0.4, p.y, th * 0.8, g.y - p.y); }
    const n = 8, sw = (b.x - a.x) / n;   // the striped skirt under the plank
    for (let i = 0; i < n; i++) { ctx.fillStyle = i % 2 ? CREAM : "#C8503A"; ctx.beginPath(); ctx.moveTo(a.x + i * sw, a.y + th); ctx.lineTo(a.x + (i + 1) * sw, a.y + th); ctx.lineTo(a.x + (i + 0.5) * sw, a.y + th + skirt); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = "#8C6239"; ctx.beginPath(); rr(ctx, a.x, a.y, b.x - a.x, th, th * 0.3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "rgba(242,231,201,.22)"; ctx.fillRect(a.x + 2, a.y + 1.5, b.x - a.x - 4, th * 0.25);
    ctx.restore();
    const order = cans.slice().sort((p, q) => q.z - p.z);
    for (const c of order) {
      const p = project(c.x, c.y, c.z), r = CANS.r * p.s, h = CANS.h * p.s;
      if (c.rest) { const g = project(c.x, 0, c.z); ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.beginPath(); ctx.ellipse(g.x, g.y, h * 0.55, r * 0.3, 0, 0, TAU); ctx.fill(); }
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(c.rot); drawCanShape(ctx, r, h, c.num); ctx.restore();
    }
  }
  function drawCanShape(c, r, h, num) {
    c.lineJoin = "round"; c.strokeStyle = INK; c.lineWidth = Math.max(1.2, r * 0.12);
    const g = c.createLinearGradient(-r, 0, r, 0); g.addColorStop(0, "#8A8E96"); g.addColorStop(0.35, "#E4E7EC"); g.addColorStop(1, "#7A7E86");
    c.fillStyle = g; c.beginPath(); c.rect(-r, -h / 2, r * 2, h); c.fill(); c.stroke();
    c.fillStyle = "#C8503A"; c.fillRect(-r, -h * 0.2, r * 2, h * 0.42); c.strokeRect(-r, -h * 0.2, r * 2, h * 0.42);
    if (num) { c.fillStyle = CREAM; c.beginPath(); c.arc(0, 0, r * 0.46, 0, TAU); c.fill(); c.stroke(); c.fillStyle = INK; c.font = `${Math.max(6, Math.round(r * 0.7))}px ${NUMFONT}`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(String(num), 0, r * 0.04); }
    else { c.fillStyle = CREAM; c.beginPath(); c.arc(0, 0, r * 0.3, 0, TAU); c.fill(); c.fillRect(-r * 0.16, r * 0.18, r * 0.32, r * 0.16);
      c.fillStyle = INK; c.beginPath(); c.arc(-r * 0.11, -r * 0.02, r * 0.08, 0, TAU); c.arc(r * 0.11, -r * 0.02, r * 0.08, 0, TAU); c.fill(); }
    c.fillStyle = "#D8DCE2"; c.beginPath(); c.ellipse(0, -h / 2, r, r * 0.28, 0, 0, TAU); c.fill(); c.stroke();
  }

  // ── the offer: Play or Skip, fifteen seconds to choose (a replay takes what the recording chose)
  const bonusEl = $("bonusBox");
  function offerBonus(then) {
    const stage = game.stage, prize = canPrize(stage), won = prize && profile.unlocked.includes(`${CAN_PRIZES[stage - 1][0]}:${prize.id}`);
    if (Replay.play && !Replay.play.R.ev.slice(Replay.play.i).some(e => e[1] === "b")) { then(); return; }   // (a recording from before Can Alley: no offer)
    game.bonus = { t: 0, then };
    cine("offer", 1e9, null);
    $("bonusRule").textContent = t("cans.rule", { n: cans.length || CANS.rows.reduce((a, b) => a + b, 0), secs: CANS.secs });
    $("bonusPay").textContent = t("cans.pay", { per: CANS.per, clear: canClearBonus(stage) });
    $("bonusPrize").textContent = prize ? (won ? t("cans.prizeWon", { name: prize.name }) : t("cans.prize", { name: prize.name, kind: KIND_LABEL[CAN_PRIZES[stage - 1][0]] })) : "";
    bonusEl.hidden = false; renderBonusTimer(); Sound.toon("whistleUp");
    srEl.textContent = t("cans.sr", { secs: CANS.offer });
    if (ui.kbd) $("bonusPlay").focus({ preventScroll: true });
  }
  function renderBonusTimer() { if (game.bonus) $("bonusTimer").textContent = Math.max(0, Math.ceil(CANS.offer - game.bonus.t)); }
  function updateBonusOffer(dt) {
    if (!game.bonus || Replay.play) return;
    game.bonus.t += dt; renderBonusTimer();
    if (game.bonus.t >= CANS.offer) takeBonus(false);
  }
  function takeBonus(play) {
    const B = game.bonus; if (!B) return false;
    Replay.note("b", play ? 1 : 0, 0);
    game.bonus = null; bonusEl.hidden = true; game.cine = null; game.state = "ready";
    Telemetry.emit(play ? "bonus_take" : "bonus_skip", { stage: game.stage });
    if (play) portalTo("bonus", () => startEncore(() => portalTo("map", B.then))); else portalTo("map", B.then);   // (v54: through a portal each way, 07t_portal.js)
    updateHud(); return true;
  }
  $("bonusPlay").addEventListener("click", () => takeBonus(true));
  $("bonusSkip").addEventListener("click", () => takeBonus(false));
