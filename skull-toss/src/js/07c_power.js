  // ───────────────────────── power-ups: little cartoon props that float in the middle of the ring ─────────────────────────
  // They never replace good tossing: you only get one by threading the skull through the MIDDLE of the ring
  // (a harder shot than an ordinary make), and each lasts a few throws. They turn up at random, dealt fairly by the
  // Power-Up Director below. None during a mini-boss; during an end boss only the Ghost Toss it leaves at its thirds.
  const POWERS = {
    rush:    { name: "Skull Rush",    throws: 4, color: "#E8893A", tip: "Quicker flights: less to lead" },
    deadeye: { name: "Deadeye",       throws: 5, color: "#E3B64B", tip: "The perfect window doubles" },
    blast:   { name: "BONK Blast",    uses: 1, throws: 8, color: "#C8503A", tip: "Next make: ×3 and a shockwave" },
    ghost:   { name: "Ghost Toss",    uses: 2, throws: 8, color: "#BFE3DA", tip: "Slip through the rim and seeds" },
    magnet:  { name: "Bone Magnet",   throws: 5, color: "#9BC53D", tip: "+20 bones on every make" },
    second:  { name: "Second Chance", uses: 1, throws: 10, color: "#4FA39C", tip: "Your next miss is free" },
    cursed:  { name: "Cursed Skull",  throws: 5, color: "#9A6BC0", tip: "Ring ×1.5 speed · score ×3" }
  };
  const POWER_IDS = Object.keys(POWERS);
  // ── the Power-Up Director (v45, to the drop rules as written). Drops are rare and fair:
  //   · per hit: a flat 2% on every successful ring hit (a little more each map, +12%, and the tier's powerRate);
  //   · milestones: each stage (a map's first half, and its second after the mini-boss) sets score milestones from
  //     where it began, 2,000 points apart on the first, the gap growing ×1.35 each stage after; crossing one is a
  //     likely drop (60%), and every opportunity that pays nothing makes the next likelier (pity), until one is certain;
  //   · the cap: four drops a stage at most (stage 1 › mini-boss › stage 2 › boss: up to four in each stage, none in
  //     a boss fight but the Pumpkin King's Ghost Tosses, which don't count);
  //   · the cycle: a shuffled bag of all seven props, dealt one at a time, so nothing repeats until every other prop
  //     has had its turn, and the bag is shuffled afresh each time round (never the same order, never back-to-back);
  //     a prop you're carrying, one that ran out in the last five throws, or the Cursed Skull in a first stage waits
  //     in the bag for a later drop;
  //   · readable: never while the ring is hidden in fog, never before the third hit of a stage.
  // The dice are the run's seeded stream (07e_directors.js), so a replay rolls the same.
  //   Stacking: the same prop again refreshes its throws (it never doubles). Different props stack; Cursed Skull and
  //   BONK Blast multiply (×9). Nothing cancels anything.
  const POWER_RULES = { perHit: 0.02, stageScale: 0.12, milestone: 2000, milestoneScale: 1.35, milestoneChance: 0.6, pityStep: 0.1, pityHit: 0.004, certain: 0.3, perStage: 4, fromHit: 3, exclude: 5 };
  const PD = { acc: 0, bag: [], last: "", key: "", n: 0, halves: 0, step: 0, next: 0, gone: {} };   // gone: prop → the throw it ran out on
  function powerDirectorReset() { Object.assign(PD, { acc: 0, bag: [], last: "", key: "", n: 0, halves: 0, step: 0, next: 0, gone: {} }); }
  function dealBag() {   // every prop once, in a fresh order (and never starting on the one just dealt)
    const b = POWER_IDS.slice();
    for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(runRand() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
    if (b[0] === PD.last) [b[0], b[b.length - 1]] = [b[b.length - 1], b[0]];
    return b;
  }
  function rollPower() {
    const ok = id => (id !== "cursed" || game.phase !== "A") && id !== PD.last && !powers[id] && !(PD.gone[id] != null && game.throws - PD.gone[id] < POWER_RULES.exclude);
    if (!PD.bag.length) PD.bag = dealBag();
    let i = PD.bag.findIndex(ok), id;
    if (i >= 0) id = PD.bag.splice(i, 1)[0];
    else { const any = POWER_IDS.filter(ok); id = any.length ? any[Math.floor(runRand() * any.length)] : POWER_IDS.find(x => x !== PD.last && x !== "cursed") || "deadeye"; }   // (nothing left in the bag fits just now)
    PD.last = id; return id;
  }
  // the stage the drops are counted in: a map's first half or its second (Arcade's endless climb: each 30 hits)
  const powerStageKey = () => arcadeLike() && game.stageHits > STAGE_BOSS ? `${game.stage}+${Math.floor(game.stageHits / STAGE_MINI)}` : `${game.stage}${game.phase}`;
  const powers = {};          // id → { left: throws left, uses }
  let pickup = null;          // the prop floating in the ring: { id, t, left, pop }

  const powerOn = id => !!powers[id];
  function givePower(id) {
    const P = POWERS[id]; powers[id] = { left: P.throws, uses: P.uses || 0, t: 0 }; sawIt("power", id);
    renderPowers();
  }
  function usePower(id) {
    const p = powers[id]; if (!p) return;
    if (p.uses) { p.uses--; if (p.uses <= 0) delete powers[id]; } else delete powers[id];
    renderPowers();
  }
  function clearPowers() { for (const k of Object.keys(powers)) delete powers[k]; renderPowers(); }
  function clearPickups() { pickup = null; }
  // every throw spends a charge (bonk blast, ghost and second chance also run out if you never use them)
  function powersAfterThrow() {
    for (const [id, p] of Object.entries(powers)) { p.left--; if (p.left <= 0) { delete powers[id]; PD.gone[id] = game.throws; } }
    if (pickup && !pickup.pop) { pickup.left--; if (pickup.left <= 0) { pickup.pop = -1; } }
    renderPowers();
  }
  function updatePowers(dt) { for (const p of Object.values(powers)) p.t += dt; }
  function pickupSchedule() {   // called as each throw settles: a make is an opportunity, and so is a milestone crossed
    if (boss || pickup || game.state !== "ready" || !game.result || !game.result.make) return;
    const R = POWER_RULES, key = powerStageKey();
    if (key !== PD.key) {   // a new stage: its own four, and milestones from where it began, further apart than the last stage's
      PD.key = key; PD.n = 0; PD.step = Math.round(R.milestone * Math.pow(R.milestoneScale, PD.halves++) / 250) * 250;
      PD.next = game.score - (game.result.pts || 0) + PD.step;
    }
    const milestone = game.score >= PD.next; while (game.score >= PD.next) PD.next += PD.step;
    if (game.stageHits < R.fromHit || PD.n >= R.perStage || HZ.fog > 0.3) return;
    const scale = (1 + R.stageScale * ((game.stage || 1) - 1)) * tierNow().powerRate;
    const chance = milestone ? R.milestoneChance + PD.acc * 2 : R.perHit * scale + PD.acc;
    if (PD.acc < R.certain && runRand() >= chance) { PD.acc += milestone ? R.pityStep : R.pityHit; return; }
    PD.n++; PD.acc = 0; spawnPickup(rollPower());
  }
  function spawnPickup(id) {
    pickup = { id, t: 0, left: 4, pop: 0 };
    Sound.toon("poof");
    srEl.textContent = `${POWERS[id].name} in the ring. Thread the middle to grab it.`;
    if (!profile.powerups) setHint(t("hint.grab"));
  }
  // the grab: the skull has to overlap the power-up as it's drawn (its circle, where it has bobbed to). v45: the window
  // is the whole drawn prop (its wings, flames and reticle poke past the body, so the body's circle is taken a little
  // wider) and most of the skull's width, up to nine-tenths of the hole, and it's judged against where the prop was drawn on that very frame.
  const PICK_R = 0.42, PICK_HIT = 0.46, PICK_OVERLAP = 0.8;   // the icon's drawn radius, and its grab radius, as shares of the ring's; how much of the skull may hang off it
  const pickupBob = () => (pickup ? Math.sin(Math.floor(pickup.t * 12) / 12 * 3) * 0.12 : 0);   // in icon radii, down the screen
  const pickupReach = rc => Math.min(rc * PICK_HIT + SKULL_R * PICK_OVERLAP, (rc - RING_TUBE - SKULL_R) * 0.9);   // (never the very edge of the hole: that stays a plain make)
  function pickupHit(lc) {
    if (!pickup || pickup.pop || !lc) return false;
    const cy = lc.ringY - pickupBob() * ring.rc * PICK_R;   // world y runs up, the bob runs down the screen
    return Math.hypot(lc.x - lc.ringX, lc.y - cy) <= pickupReach(ring.rc);
  }
  function updatePickup(dt) {
    if (!pickup) return;
    pickup.t += dt;
    if (pickup.pop) { pickup.pop += pickup.pop > 0 ? dt : -dt; if (Math.abs(pickup.pop) > 0.45) pickup = null; }
  }
  function collectPickup(at) {
    if (!pickup || pickup.pop) return;
    const id = pickup.id, P = POWERS[id];
    pickup.pop = 0.001; givePower(id); VisualSystem.emit("power", { id }); Telemetry.emit("powerup", { id, stage: game.stage });
    profile.powerups++; game.run.powerups++; challenge("powerups", 1); if (id === "cursed") profile.cursed++;
    profile.powerLog = profile.powerLog || {}; profile.powerLog[id] = (profile.powerLog[id] || 0) + 1;   // (v45: each prop's own count, for the Profile and the achievements)
    mortySays("power." + id, { chance: MORTY.power });
    const p = at || project(ring.x, ring.y, ring.z);
    gpuPickup(p.x, p.y, P.color);   // (08j_gpu.js)
    impact("POP!", p.x, p.y - ring.rc * p.s * 1.2, { fill: P.color, text: INK, scale: 0.75, delay: 0.3, bits: false, sub: P.name });
    for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU, v = U * rand(0.4, 0.8); particles.push({ kind: i % 2 ? "star" : "dot", x: p.x, y: p.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, rot: a, vr: 6, life: 0.5, max: 0.5, size: rand(2, 4), color: i % 3 ? P.color : CREAM, g: 0.3, a: 1 }); }
    Sound.sample("powerup", () => Sound.toon("pop")); if (id === "cursed") Sound.voice.cackle(0, 0.8);
    powerCard(id);
  }
  // v45: what the prop does, in the middle of the screen for a moment (not a toast at the edge)
  const powerCardEl = $("powerCard");
  // v50: a card that pops up in play goes below the ring's lowest reach on this map (or above its highest), never on it
  function placeClearOfRing(el) {
    el.style.top = ""; if (screen !== "play" || !ring) return;
    const Z = mapData(game.stage || 1).sheet.zones.ring, low = project(0, Z.y[0] - ring.rc, Z.z[0]), cur = project(ring.x, ring.y, ring.z);
    const bottom = Math.max(low.y + ring.rc * low.s * 0.2, cur.y + ring.rc * cur.s * (ringFlies() ? 1.6 : 1.1)), r = el.getBoundingClientRect(), h = r.height || 110;
    if (bottom + h + 12 < H * 0.86) el.style.top = `${Math.round(bottom + 12 + h / 2)}px`;
    else { const top = cur.y - ring.rc * cur.s * 1.4; el.style.top = `${Math.round(Math.max(H * 0.2, top - 12 - h / 2))}px`; }
  }
  let powerCardT = 0;
  function powerCard(id) {
    const P = POWERS[id]; if (!powerCardEl) return;
    powerCardEl.style.setProperty("--c", P.color);
    powerCardEl.querySelector("b").textContent = P.name; powerCardEl.querySelector("span").textContent = P.tip;
    const cv = powerCardEl.querySelector("canvas"), c = cv.getContext("2d"); c.clearRect(0, 0, cv.width, cv.height); drawPowerIcon(c, id, cv.width / 2, cv.height / 2 + 4, cv.width * 0.28, 0.4);
    powerCardEl.hidden = false; powerCardEl.classList.remove("show"); void powerCardEl.offsetWidth; powerCardEl.classList.add("show");
    placeClearOfRing(powerCardEl);   // v50: never over the ring
    clearTimeout(powerCardT); powerCardT = setTimeout(() => { powerCardEl.hidden = true; powerCardEl.classList.remove("show"); }, 2300);
  }
  // BONK Blast: a cartoon shockwave that knocks the whole graveyard about
  function bonkBlast(at) {
    usePower("blast");
    for (let i = 0; i < 3; i++) waves.push({ x: at.x, y: at.y, r: ring.rc * at.s * (0.6 + i * 0.25), t: -i * 0.08, dur: 0.7, big: true });
    impact("KABOOM!", at.x, at.y - U * 0.12, { style: "kaboom", scale: 1.05, delay: 0.12 });
    VisualSystem.triggerImpact("blast", { at }); Sound.toon("kaboom");
    for (const b of world.bats) b.vx *= 2.2;
    for (const k of world.walkers) k.scare = 1;
    if (GY.cat) GY.cat.scare = 1.5;
  }
  function magnetBones(at) {
    addBones(20); game.run.magnet = (game.run.magnet || 0) + 20;
    for (let i = 0; i < 6; i++) particles.push({ kind: "bone", x: at.x + rand(-1, 1) * U * 0.2, y: at.y + rand(-1, 1) * U * 0.1, vx: rand(-0.2, 0.2) * U, vy: -U * rand(0.3, 0.6), rot: rand(0, TAU), vr: 8, life: 0.8, max: 0.8, size: rand(6, 9), color: CREAM, g: 0.8, a: 1 });
    caption("+20 bones", at.x, at.y + U * 0.12);
  }

  // ── the HUD badges: which props you're carrying, and for how long
  const powEl = $("powers");
  function renderPowers() {
    if (!powEl) return;
    const ids = POWER_IDS.filter(id => powers[id]);
    powEl.hidden = !ids.length;
    powEl.innerHTML = ids.map(id => { const p = powers[id], n = POWERS[id].uses ? p.uses : p.left;
      return `<span class="pw" style="--c:${POWERS[id].color}" title="${POWERS[id].name}: ${POWERS[id].tip}"><canvas data-pw="${id}" width="44" height="44"></canvas><b>${n}</b></span>`; }).join("");
    for (const cv of powEl.querySelectorAll("canvas")) { const c = cv.getContext("2d"); c.clearRect(0, 0, 44, 44); drawPowerIcon(c, cv.dataset.pw, 22, 23, 15, 0.4); }
  }

  // ── the props themselves: cartoon objects with ink outlines, bouncing on twos
  function drawPowerIcon(c, id, x, y, r, t) {
    const tt = Math.floor(t * 12) / 12, lw = Math.max(1.5, r * 0.11);
    c.save(); c.translate(x, y); c.lineJoin = "round"; c.lineCap = "round"; c.strokeStyle = INK; c.lineWidth = lw;
    const ink = () => { c.fill(); c.stroke(); };
    if (id === "deadeye") {           // a giant eyeball wearing a target reticle
      c.fillStyle = "#F7F1DF"; c.beginPath(); c.arc(0, 0, r, 0, TAU); ink();
      c.strokeStyle = "#C8503A"; c.lineWidth = lw * 0.5; for (let i = 0; i < 5; i++) { const a = i * 1.3 + 0.4; c.beginPath(); c.moveTo(Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.95); c.quadraticCurveTo(Math.cos(a + 0.2) * r * 0.75, Math.sin(a + 0.2) * r * 0.75, Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6); c.stroke(); }
      const lx = Math.sin(tt * 2.2) * r * 0.18, ly = Math.cos(tt * 1.7) * r * 0.1;
      c.strokeStyle = INK; c.lineWidth = lw; c.fillStyle = "#356B68"; c.beginPath(); c.arc(lx, ly, r * 0.46, 0, TAU); ink();
      c.fillStyle = INK; c.beginPath(); c.arc(lx, ly, r * 0.22, 0, TAU); c.fill();
      c.fillStyle = "#fff"; c.beginPath(); c.arc(lx - r * 0.12, ly - r * 0.14, r * 0.08, 0, TAU); c.fill();
      c.strokeStyle = "#C8503A"; c.lineWidth = lw * 0.8; c.beginPath(); c.arc(0, 0, r * 1.25, 0, TAU);
      for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { c.moveTo(ax * r * 0.95, ay * r * 0.95); c.lineTo(ax * r * 1.5, ay * r * 1.5); } c.stroke();
    } else if (id === "rush") {       // a tiny skull with cartoon wings strapped on
      const flap = Math.sin(tt * 18) * 0.5;
      for (const sd of [-1, 1]) {
        c.save(); c.scale(sd, 1); c.rotate(-0.35 - flap * 0.6); c.fillStyle = "#F2E7C9"; c.beginPath(); c.moveTo(r * 0.45, -r * 0.1);
        c.bezierCurveTo(r * 1.1, -r * 1.05, r * 1.75, -r * 0.7, r * 1.7, -r * 0.2); c.quadraticCurveTo(r * 1.45, -r * 0.05, r * 1.5, r * 0.15); c.quadraticCurveTo(r * 1.2, r * 0.05, r * 1.2, r * 0.3); c.quadraticCurveTo(r * 0.9, r * 0.15, r * 0.45, r * 0.25); c.closePath(); ink();
        c.beginPath(); c.moveTo(r * 0.75, -r * 0.1); c.lineTo(r * 1.35, -r * 0.45); c.stroke(); c.restore();
      }
      drawSkull(c, 0, r * 0.05, r * 0.72, { t, look: { ...DEFAULT_COS }, face: faceFor("excited", t), jaw: 0.3 });
      c.strokeStyle = "#E8893A"; c.lineWidth = lw * 0.8; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(-r * (0.3 - i * 0.3), r * 1.05); c.lineTo(-r * (0.3 - i * 0.3) - r * 0.15, r * 1.45); c.stroke(); }
    } else if (id === "blast") {      // a dynamite bundle with a skull painted on the band
      c.rotate(-0.18);
      for (const dx of [-0.52, 0, 0.52]) { c.fillStyle = "#C8503A"; c.beginPath(); rr(c, dx * r - r * 0.27, -r * 0.75, r * 0.54, r * 1.55, r * 0.2); ink(); c.fillStyle = "rgba(255,240,220,.35)"; c.fillRect(dx * r - r * 0.18, -r * 0.65, r * 0.1, r * 1.3); }
      c.fillStyle = "#E8D8B4"; c.beginPath(); rr(c, -r * 0.88, -r * 0.2, r * 1.76, r * 0.46, r * 0.08); ink();
      c.fillStyle = INK; c.beginPath(); c.arc(0, r * 0.02, r * 0.14, 0, TAU); c.fill(); c.fillRect(-r * 0.07, r * 0.1, r * 0.14, r * 0.1);
      c.strokeStyle = INK; c.lineWidth = lw * 0.9; c.beginPath(); c.moveTo(0, -r * 0.75); c.bezierCurveTo(r * 0.1, -r * 1.1, r * 0.45, -r * 0.95, r * 0.5, -r * 1.25); c.stroke();
      c.fillStyle = (tt * 12) % 2 < 1 ? "#FFE36A" : "#E8893A"; star(c, r * 0.52, -r * 1.3, r * 0.34, 7, 0.45, tt * 9); c.fill();
    } else if (id === "ghost") {      // a little translucent ghost sheet
      const wob = Math.sin(tt * 6) * r * 0.08; c.globalAlpha = 0.9;
      c.fillStyle = "#EAF7F2"; c.beginPath(); c.moveTo(-r * 0.8, r * 0.75); c.bezierCurveTo(-r * 0.9, -r * 1.35, r * 0.9, -r * 1.35, r * 0.8, r * 0.75);
      for (let i = 1; i <= 4; i++) { const xx = r * 0.8 - (r * 1.6 * i) / 4; c.quadraticCurveTo(xx + r * 0.2, r * (1.1 + (i % 2 ? 0.1 : -0.05)) + wob, xx, r * 0.75); } c.closePath(); ink();
      c.globalAlpha = 1; c.fillStyle = INK; c.beginPath(); c.ellipse(-r * 0.3, -r * 0.2, r * 0.14, r * 0.22, 0, 0, TAU); c.ellipse(r * 0.3, -r * 0.2, r * 0.14, r * 0.22, 0, 0, TAU); c.fill();
      c.beginPath(); c.ellipse(0, r * 0.25, r * 0.16, r * 0.2, 0, 0, TAU); c.fill();
    } else if (id === "magnet") {     // a horseshoe magnet hanging on to a bone
      c.rotate(Math.sin(tt * 4) * 0.12);
      c.lineWidth = r * 0.62 + lw * 2; c.strokeStyle = INK; c.beginPath(); c.arc(0, -r * 0.1, r * 0.62, Math.PI, 0); c.lineTo(r * 0.62, r * 0.55); c.moveTo(-r * 0.62, -r * 0.1); c.lineTo(-r * 0.62, r * 0.55); c.stroke();
      c.lineWidth = r * 0.62; c.strokeStyle = "#C8503A"; c.beginPath(); c.arc(0, -r * 0.1, r * 0.62, Math.PI, 0); c.lineTo(r * 0.62, r * 0.3); c.moveTo(-r * 0.62, -r * 0.1); c.lineTo(-r * 0.62, r * 0.3); c.stroke();
      c.strokeStyle = "#D8DCE2"; c.beginPath(); c.moveTo(r * 0.62, r * 0.3); c.lineTo(r * 0.62, r * 0.55); c.moveTo(-r * 0.62, r * 0.3); c.lineTo(-r * 0.62, r * 0.55); c.stroke();
      c.lineWidth = lw; c.strokeStyle = INK; c.fillStyle = "#F2E7C9"; c.save(); c.translate(0, r * 1.05); c.rotate(0.08); c.beginPath(); rr(c, -r * 0.55, -r * 0.12, r * 1.1, r * 0.24, r * 0.1);
      for (const bx of [-0.55, 0.55]) for (const by of [-0.13, 0.13]) { c.moveTo(bx * r + r * 0.16, by * r); c.arc(bx * r, by * r, r * 0.16, 0, TAU); } ink(); c.restore();
      c.strokeStyle = "#9BC53D"; c.lineWidth = lw * 0.7; for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(sd * r * 0.9, r * 0.75); c.lineTo(sd * r * 1.15, r * 0.95); c.stroke(); }
    } else if (id === "second") {     // a cartoon heart with a sticking plaster
      const b = 1 + Math.sin(tt * 7) * 0.06; c.scale(b, b);
      c.fillStyle = "#C8503A"; c.beginPath(); c.moveTo(0, r * 0.95); c.bezierCurveTo(-r * 1.5, -r * 0.05, -r * 0.8, -r * 1.25, 0, -r * 0.45); c.bezierCurveTo(r * 0.8, -r * 1.25, r * 1.5, -r * 0.05, 0, r * 0.95); ink();
      c.fillStyle = "rgba(255,230,220,.5)"; c.beginPath(); c.ellipse(-r * 0.5, -r * 0.35, r * 0.2, r * 0.12, -0.6, 0, TAU); c.fill();
      c.save(); c.rotate(-0.6); c.fillStyle = "#E8D8B4"; c.beginPath(); rr(c, -r * 0.75, -r * 0.2, r * 1.5, r * 0.4, r * 0.16); ink(); c.fillStyle = "#C9B58E"; c.fillRect(-r * 0.2, -r * 0.2, r * 0.4, r * 0.4); c.restore();
      c.fillStyle = INK; c.beginPath(); c.arc(-r * 0.3, -r * 0.05, r * 0.09, 0, TAU); c.arc(r * 0.35, -r * 0.1, r * 0.09, 0, TAU); c.fill();
    } else if (id === "cursed") {     // a purple skull with horns, grinning through green flame (v49: the GPU's green fire, when it's on)
      if (!gpuFireAt(c, "cursed", 0, -r * 0.55, r * 1.6, r * 1.1, 1, 1)) for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * 0.38, fl = 1 + 0.25 * Math.sin(tt * 14 + i * 2); c.fillStyle = i % 2 ? "#9BC53D" : "#6FA02A"; c.beginPath(); c.moveTo(Math.cos(a - 0.2) * r * 0.7, Math.sin(a - 0.2) * r * 0.7); c.quadraticCurveTo(Math.cos(a) * r * 1.7 * fl, Math.sin(a) * r * 1.7 * fl, Math.cos(a + 0.2) * r * 0.7, Math.sin(a + 0.2) * r * 0.7); c.fill(); }
      for (const sd of [-1, 1]) { c.fillStyle = "#3A2240"; c.beginPath(); c.moveTo(sd * r * 0.35, -r * 0.55); c.quadraticCurveTo(sd * r * 1.05, -r * 0.8, sd * r * 0.95, -r * 1.35); c.quadraticCurveTo(sd * r * 0.75, -r * 0.8, sd * r * 0.15, -r * 0.7); c.closePath(); ink(); }
      drawSkull(c, 0, r * 0.1, r * 0.78, { t, look: { ...DEFAULT_COS, skull: "hex" }, face: faceFor("excited", t), jaw: 0.25 });
    }
    c.restore();
  }
  // in the world: the prop hangs in the ring's centre, bobbing, and grows a halo when it's about to vanish
  function drawPickup() {
    if (!pickup) return;
    const p = project(ring.x, ring.y, ring.z), R = ring.rc * p.s * PICK_R, pk = pickup;
    let k = easeOutBack(clamp(pk.t / 0.35, 0, 1)), a = 1;
    if (pk.pop > 0) { const q = pk.pop / 0.45; k = 1 + q * 0.8; a = 1 - q; }
    if (pk.pop < 0) { const q = -pk.pop / 0.45; k = 1 - q; }
    if (k <= 0.02) return;
    const bob = pickupBob() * R;
    ctx.save(); ctx.globalAlpha = a;
    const g = ctx.createRadialGradient(p.x, p.y + bob, 0, p.x, p.y + bob, R * 1.9);
    g.addColorStop(0, "rgba(255,240,190,.35)"); g.addColorStop(1, "rgba(255,240,190,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y + bob, R * 1.9, 0, TAU); ctx.fill();
    if (pk.left <= 1 && !pk.pop && Math.floor(pk.t * 6) % 2) { ctx.strokeStyle = CREAM; ctx.setLineDash([3, 4]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(p.x, p.y + bob, R * 1.45, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
    drawPowerIcon(ctx, pk.id, p.x, p.y + bob, R * k, pk.t);
    ctx.restore();
    const c = hexRgb(POWERS[pk.id].color || CREAM); gpuLight(p.x, p.y + bob, R * 3.4, `${c.map(v => Math.round(v * 255)).join(",")}`, 0.3 * a * (0.85 + 0.15 * Math.sin(pk.t * 5)));
  }
  // what the carried power-ups do to the skull's look
  function drawPowerAura(c, x, y, r, t) {
    if (powerOn("cursed")) {
      c.save(); c.globalCompositeOperation = "lighter";
      const g = c.createRadialGradient(x, y, r * 0.4, x, y, r * 1.9); g.addColorStop(0, "rgba(160,90,210,.45)"); g.addColorStop(1, "rgba(160,90,210,0)");
      c.fillStyle = g; c.beginPath(); c.arc(x, y, r * 1.9, 0, TAU); c.fill(); c.restore();
    }
    if (powerOn("second")) {
      const hy = y - r * 1.45 + Math.sin(t * 3) * r * 0.06;
      c.strokeStyle = INK; c.lineWidth = Math.max(3, r * 0.2); c.beginPath(); c.ellipse(x, hy, r * 0.62, r * 0.17, 0, 0, TAU); c.stroke();
      c.strokeStyle = GOLD; c.lineWidth = Math.max(1.5, r * 0.1); c.beginPath(); c.ellipse(x, hy, r * 0.62, r * 0.17, 0, 0, TAU); c.stroke();
    }
    if (powerOn("blast") && Math.floor(t * 12) % 2) { c.fillStyle = "#FFE36A"; for (let i = 0; i < 3; i++) { const a = t * 5 + i * 2.1; star(c, x + Math.cos(a) * r * 1.2, y + Math.sin(a) * r * 1.05, r * 0.2, 5, 0.45, a); c.fill(); } }
  }
  function drawRushWings(c, x, y, r, t, ang = 0) {
    if (!powerOn("rush")) return;
    const flap = Math.sin(Math.floor(t * 12) / 12 * 22) * 0.45;
    c.save(); c.translate(x, y); c.rotate(ang * 0.3); c.lineJoin = "round"; c.strokeStyle = INK; c.lineWidth = Math.max(1.5, r * 0.08);
    for (const sd of [-1, 1]) {
      c.save(); c.scale(sd, 1); c.rotate(-0.25 - flap); c.fillStyle = "#F2E7C9"; c.beginPath(); c.moveTo(r * 0.8, -r * 0.2);
      c.bezierCurveTo(r * 1.4, -r * 1.2, r * 2.1, -r * 0.8, r * 2.0, -r * 0.3); c.quadraticCurveTo(r * 1.7, -r * 0.1, r * 1.75, r * 0.12); c.quadraticCurveTo(r * 1.4, r * 0.02, r * 1.35, r * 0.28); c.quadraticCurveTo(r * 1.1, r * 0.1, r * 0.8, r * 0.15); c.closePath(); c.fill(); c.stroke(); c.restore();
    }
    c.restore();
  }
