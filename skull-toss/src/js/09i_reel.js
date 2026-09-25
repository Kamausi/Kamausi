  // ───────────────────────── the reel's own cards: the leader, main titles, the intermission and THE END ─────────────────────────
  // Skull Toss is a restored 1933 cartoon, so it opens like one: each reel's main title card, then (the first run of a
  // session, v49: after the card) the countdown leader (3, 2, 1, the sweep going round) straight into play. The card: the reel's number, the map's name and what's odd about it. After Reel Four the
  // picture stops for an intermission; after Reel Eight it ends on THE END, with Morty whole again, and the iris
  // closes on him. Between reels the changeover cues (the round marks in the top corner that told a projectionist to
  // switch machines) flash twice in the film. A card holds the throw like any cut-scene, and a tap, Space or Enter
  // skips it. Settings → Title cards: Full (leader and cards), Short (brief cards, no leader) or Off (the small stage
  // card only).
  const REEL_DUR = { leader: 3.5, title: 2.8, short: 1.4, intermission: 3.6, end: 4.6 };
  const reelEl = $("reelCard"), reelCv = $("reelCv");
  const reelSt = { card: null, t0: 0, shown: [], cues: [], leaderShown: false };
  const cardsMode = () => (sandbox && !sandbox.cardsOn ? "off" : settings.cards);   // (older tests expect play to start at once)
  // the cards themselves: kind, the four lines of type, and what the Off setting shows instead (the map's own words come from its data)
  function titleCard(n, mode = "story") {   // mode: Story's reels, or the map an Arcade or Practice run opens on
    const M = mapData(n), prac = mode === "practice", arcade = mode === "arcade";
    if (prac) return { kind: "title", n, k: t("mode.practice.name"), reel: t("reel.practice", { reel: M.reel }), title: M.name, sub: M.premise, note: M.blurb,
      fallback: () => stageCard(t("mode.practice.name"), M.name, t("mode.practice.rule"), 2) };
    return { kind: "title", n, k: arcade ? t("card.arcade.k") : t("reel.k"), reel: arcade ? t("reel.arcade", { reel: M.reel }) : t("reel.of", { reel: M.reel, total: t(`num.${MAP_COUNT}`) }), title: M.name, sub: M.premise, note: M.blurb,
      fallback: arcade ? () => stageCard(t("card.arcade.k"), M.name, t("card.arcade.s"), 2) : n > 1 ? () => stageCard(M.reel, M.name, M.identity.mechanic.split(":")[0], 2.2) : null };
  }
  const intermissionCard = () => ({ kind: "intermission", k: t("reel.k"), reel: t("reel.intermission"), title: t("reel.stretch"),
    sub: t("reel.soFar", { score: fmtN(game.score), hits: game.hits, n: (game.run.fragments || []).length, total: MAP_COUNT }), note: t("reel.afterBreak", { n: t(`num.${game.stage}`) }) });
  const endCard = () => ({ kind: "end", k: t("reel.k"), reel: t("reel.restored"), title: t("reel.theEnd"), sub: t("reel.whole"), note: "",
    fallback: () => stageCard(t("reel.theEnd"), t("reel.whole"), t("reel.restored"), 3.4, "gold") });

  // play cards in order, holding the throw; then() runs after the last one (at once, if cards are off)
  function reelCards(list, then) {
    const mode = cardsMode(), L = mode === "off" ? [] : list.filter(c => mode === "full" || c.kind !== "leader");
    if (!L.length) { for (const c of list) if (c.fallback) c.fallback(); if (then) then(); return false; }
    const next = i => {
      if (i >= L.length) { hideReelCard(); if (then) then(); return; }
      const c = L[i]; showReelCard(c);
      cine("reel", c.kind === "title" && mode === "short" ? REEL_DUR.short : REEL_DUR[c.kind], () => next(i + 1));
    };
    hideStageCard(); next(0); return true;
  }
  function showReelCard(c) {
    reelSt.card = c; reelSt.t0 = game.time; reelSt.rotAt = null; reelEl.style.opacity = ""; reelSt.shown.push(c.kind + (c.n ? ":" + c.n : "")); reelSt.lastN = -1;
    reelEl.dataset.kind = c.kind; reelEl.hidden = false;
    $("rcK").textContent = c.k || ""; $("rcReel").textContent = c.reel || ""; $("rcTitle").textContent = c.title || ""; $("rcSub").textContent = c.sub || ""; $("rcNote").textContent = c.note || "";
    reelEl.classList.remove("in"); void reelEl.offsetWidth; reelEl.classList.add("in");
    srEl.textContent = c.kind === "leader" ? t("reel.countdown") : [c.reel, c.title, c.sub].filter(Boolean).join(". ");
    if (c.kind === "title" && c.n) Sound.motif("map" + c.n); else Sound.toon(c.kind === "end" ? "fanfare" : c.kind === "leader" ? "tick" : "brass");   // each reel's own phrase (02e_audio_sets.js) if (c.kind === "end") mortySays("end", { priority: true });
    Telemetry.emit("reel_card", { kind: c.kind, n: c.n || 0 });
  }
  function hideReelCard() { reelSt.card = null; reelEl.hidden = true; reelEl.classList.remove("in"); reelEl.style.opacity = ""; reelSt.rotAt = null; }
  // a tap, Space or Enter: on to the next card (the throw is held until the last one is done)
  function skipReelCard() {
    if (!reelSt.card || !game.cine || game.cine.kind !== "reel") return false;
    Replay.note("s");
    game.cine.t = game.cine.dur; Sound.ui("tick"); return true;
  }
  reelEl.addEventListener("pointerdown", e => { e.preventDefault(); skipReelCard(); });

  // the changeover cues: two flashes of a round mark in the top corner, the first as the old reel runs out
  function changeoverCues(dur) { reelSt.cues.push(game.time + 0.25, game.time + Math.max(0.6, dur - 0.55)); if (reelSt.cues.length > 8) reelSt.cues.splice(0, reelSt.cues.length - 8); }
  function drawCueMarks(c) {
    for (const at of reelSt.cues) {
      const age = game.time - at; if (age < 0 || age > 0.34) continue;   // four frames at 12 fps, as on a print
      const x = W * 0.86, y = H * 0.16, r = Math.max(7, U * 0.03), g = c.createRadialGradient(x, y, 0, x, y, r * 1.3);
      g.addColorStop(0, "rgba(242,231,201,.85)"); g.addColorStop(0.7, "rgba(242,231,201,.7)"); g.addColorStop(1, "rgba(242,231,201,0)");
      c.fillStyle = g; c.beginPath(); c.arc(x, y, r * 1.3, 0, TAU); c.fill();
      c.strokeStyle = "rgba(23,19,15,.55)"; c.lineWidth = 1.5; c.beginPath(); c.arc(x, y, r, 0, TAU); c.stroke();
    }
  }

  // ── the card's artwork: an Art Deco frame, and the leader or Morty inside it
  function drawReelCard() {
    const C = reelSt.card; if (!C || reelEl.hidden) return;
    const [c, r] = fitCanvas(reelCv); if (!r.width) return;
    const w = r.width, hgt = r.height, t = game.time - reelSt.t0, still = reduceMotion;
    if (C.kind === "leader") { drawLeader(c, w, hgt, t, still); return; }
    // the frame: a double rule, fans in the corners, a roundel at the top with the reel's number
    const m = Math.min(w, hgt) * 0.05, ink = "rgba(242,231,201,.8)";
    c.strokeStyle = ink; c.lineWidth = 3; c.strokeRect(m, m, w - 2 * m, hgt - 2 * m);
    c.lineWidth = 1.2; c.strokeRect(m + 7, m + 7, w - 2 * m - 14, hgt - 2 * m - 14);
    const fan = Math.min(w, hgt) * 0.09;
    for (const [cx, cy, a0] of [[m, m, 0], [w - m, m, Math.PI / 2], [w - m, hgt - m, Math.PI], [m, hgt - m, Math.PI * 1.5]]) {
      c.save(); c.translate(cx, cy); c.rotate(a0);
      for (let i = 0; i <= 5; i++) { const a = (i / 5) * Math.PI / 2; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * fan, Math.sin(a) * fan); c.stroke(); }
      c.beginPath(); c.arc(0, 0, fan * 0.55, 0, Math.PI / 2); c.stroke(); c.beginPath(); c.arc(0, 0, fan, 0, Math.PI / 2); c.stroke();
      c.restore();
    }
    if (C.kind === "title" && C.n) {
      const R = Math.min(w, hgt) * 0.07, cx = w / 2, cy = m + R * 0.4;
      c.fillStyle = "#26364A"; c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.fill(); c.lineWidth = 3; c.strokeStyle = ink; c.stroke();
      c.fillStyle = "#F2E7C9"; c.font = `${R * 1.25}px ${NUMFONT}`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(String(C.n), cx, cy + R * 0.08);
    }
    // Morty: peeking up from the bottom of a title card, taking a bow at the end (and a wink before the iris closes)
    const big = C.kind === "end", sr = Math.min(w, hgt) * (big ? 0.12 : 0.075), cx = big ? w / 2 : w - m - fan - sr * 1.2, bob = still ? 0 : Math.sin(t * 3) * sr * 0.05;
    const cy = big ? hgt * 0.26 : hgt - m - sr * 0.9 + (still ? 0 : Math.max(0, 1 - t / 0.45) * sr * 1.6);
    const mood = big ? (t > 2.6 && t < 3.3 ? "gleeful" : "triumph") : C.kind === "intermission" ? "smug" : "excited";
    c.save(); if (!big) { c.beginPath(); c.rect(0, 0, w, hgt - m - 8); c.clip(); }
    drawSkull(c, cx, cy + bob, sr, { t, look: cos, face: faceFor(mood, t) });
    drawHat(c, cx, cy + bob, sr, 0, t, null, 1, big ? "tophat" : cos.hat);
    c.restore();
  }
  // the Academy leader: grey film, a cross and two circles, the sweep going round once a second, the number in the middle
  // the countdown: 3, 2, 1 with the sweep going round, then (v50) the print corrupts into the map: it flickers,
  // tears into glitching strips, burns through in spreading holes that show the picture beneath, and fades away
  const LEADER_COUNT = 2.4, LEADER_ROT = 1.1;
  const leaderRot = t => clamp((t - LEADER_COUNT) / LEADER_ROT, 0, 1);   // 0 while it counts, then 0→1 as it corrupts
  function drawLeader(c, w, hgt, t, still) {
    const tc = Math.min(t, LEADER_COUNT - 0.001), n = Math.max(1, 3 - Math.floor(tc / 0.8)), u = still ? 0 : (tc % 0.8) / 0.8, cx = w / 2, cy = hgt / 2, R = Math.min(w, hgt) * 0.36;
    if (n !== reelSt.lastN) { reelSt.lastN = n; if (t > 0.05) Sound.toon("tick"); }
    c.fillStyle = "#8C8375"; c.fillRect(0, 0, w, hgt);
    c.fillStyle = "#6E665A"; c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, Math.hypot(w, hgt), -Math.PI / 2, -Math.PI / 2 + u * TAU); c.closePath(); c.fill();
    c.strokeStyle = "#F2E7C9"; c.lineWidth = 3; c.beginPath(); c.moveTo(0, cy); c.lineTo(w, cy); c.moveTo(cx, 0); c.lineTo(cx, hgt); c.stroke();
    c.lineWidth = 4; for (const k of [1, 0.82]) { c.beginPath(); c.arc(cx, cy, R * k, 0, TAU); c.stroke(); }
    c.font = `${R * 1.2}px ${NUMFONT}`; c.textAlign = "center"; c.textBaseline = "middle"; c.lineWidth = 8; c.strokeStyle = INK; c.strokeText(String(n), cx, cy + R * 0.06);
    c.fillStyle = "#F2E7C9"; c.fillText(String(n), cx, cy + R * 0.06);
    const k = leaderRot(t);
    if (k <= 0) { reelEl.style.opacity = ""; return; }
    if (reelSt.rotAt == null) { reelSt.rotAt = 1; Sound.toon("hiss"); }
    reelEl.style.opacity = String(1 - k * k);   // the fade
    if (still) return;
    const rnd = mulberry32(((t * 24) | 0) * 7919 + 13), cv = c.canvas, dpr = cv.width / w;
    if (rnd() < 0.35 + k * 0.4) { c.fillStyle = rnd() < 0.5 ? `rgba(255,250,235,${0.25 + rnd() * 0.4})` : `rgba(10,8,6,${0.3 + rnd() * 0.4})`; c.fillRect(0, 0, w, hgt); }   // flicker
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0);   // glitch: strips of the frame torn sideways, one channel slipping
    for (let i = 0, m = 3 + ((k * 9) | 0); i < m; i++) { const y = rnd() * cv.height, hh = (4 + rnd() * 40 * (0.5 + k)) * dpr, dx = (rnd() - 0.5) * 80 * dpr * (0.4 + k); c.drawImage(cv, 0, y, cv.width, hh, dx, y, cv.width, hh); }
    c.globalCompositeOperation = "lighter"; c.globalAlpha = 0.35; c.drawImage(cv, (6 + 10 * k) * dpr, 0); c.restore();
    c.save();   // burn: holes open and spread, charred and glowing at the edge, the picture showing through
    const holes = [[0.3, 0.4, 0], [0.72, 0.62, 0.12], [0.5, 0.2, 0.25], [0.18, 0.78, 0.35], [0.85, 0.25, 0.45]];
    for (const [hx, hy, at] of holes) {
      const g = clamp((k - at) / (1 - at), 0, 1); if (g <= 0) continue;
      const x = hx * w, y = hy * hgt, r = g * g * Math.hypot(w, hgt) * 0.55 + 4;
      const gr = c.createRadialGradient(x, y, r * 0.7, x, y, r * 1.18); gr.addColorStop(0, "rgba(20,8,2,.95)"); gr.addColorStop(0.35, "rgba(255,120,30,.9)"); gr.addColorStop(0.6, "rgba(90,40,10,.6)"); gr.addColorStop(1, "rgba(60,30,10,0)");
      c.globalCompositeOperation = "source-over"; c.fillStyle = gr; c.beginPath(); c.arc(x, y, r * 1.18, 0, TAU); c.fill();
      c.globalCompositeOperation = "destination-out"; c.beginPath();
      for (let a = 0; a <= 24; a++) { const an = (a / 24) * TAU, rr2 = r * (0.8 + 0.12 * Math.sin(an * 5 + at * 20) + 0.06 * Math.sin(an * 11 + t * 3)); a ? c.lineTo(x + Math.cos(an) * rr2, y + Math.sin(an) * rr2) : c.moveTo(x + Math.cos(an) * rr2, y + Math.sin(an) * rr2); }
      c.closePath(); c.fill();
    }
    c.restore();
  }

  // ── where the reel's cards come in
  function introReel(mode, map) {   // a run starts: Reel One's card and the countdown (Story), or the map's card (Arcade, Practice)
    const leader = Replay.play ? !!Replay.play.R.leader : mode === "story" && cardsMode() === "full";   // (v50: every Adventure run; a replay shows it if the run did)
    reelSt.introLeader = leader;
    const list = mode !== "story" ? [titleCard(map + 1, mode)] : [titleCard(1)].concat(leader ? [{ kind: "leader" }] : []);   // (v49: the map's card, then the countdown into play)
    reelCards(list, () => { setHint(t("hint.start")); mortySays(`map.${game.stage}`, { priority: true }); });
  }
  function nextReel() {   // a map is clear and the next one is set: its card (after the intermission, halfway)
    const list = (game.stage === MAP_COUNT / 2 + 1 ? [intermissionCard()] : []).concat(titleCard(game.stage), cardsMode() === "full" ? [{ kind: "leader" }] : []);   // (v50: and the countdown into each map)
    reelCards(list, () => { updateHud(); mortySays(`map.${game.stage}`, { priority: true }); });
  }
  function endReel(done) {   // the last boss is down: THE END, then the iris closes on Morty and opens on the headstone
    return reelCards([endCard()], () => {
      game.state = "cine"; game.cine = { kind: "reel", t: 0, dur: 1e9, then: null };   // (no throw while the iris closes)
      irisTo(done, W / 2, H * 0.3);
    });
  }
