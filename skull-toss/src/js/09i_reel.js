  // ───────────────────────── the reel's own cards: the leader, main titles, the intermission and THE END ─────────────────────────
  // Skull Toss is a restored 1933 cartoon, so it opens like one: a countdown leader (3, 2, 1, the sweep going round),
  // then each reel's main title card: the reel's number, the map's name and what's odd about it. After Reel Four the
  // picture stops for an intermission; after Reel Eight it ends on THE END, with Morty whole again, and the iris
  // closes on him. Between reels the changeover cues (the round marks in the top corner that told a projectionist to
  // switch machines) flash twice in the film. A card holds the throw like any cut-scene, and a tap, Space or Enter
  // skips it. Settings → Title cards: Full (leader and cards), Short (brief cards, no leader) or Off (the small stage
  // card only).
  const REEL_DUR = { leader: 2.4, title: 2.8, short: 1.4, intermission: 3.6, end: 4.6 };
  const reelEl = $("reelCard"), reelCv = $("reelCv");
  const reelSt = { card: null, t0: 0, shown: [], cues: [], leaderShown: false };
  const cardsMode = () => (sandbox && !sandbox.cardsOn ? "off" : settings.cards);   // (older tests expect play to start at once)
  const NUMBER_WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight"];
  // the cards themselves: kind, the four lines of type, and what the Off setting shows instead
  function titleCard(n, arcade = false) {
    const M = mapData(n);
    return { kind: "title", n, k: arcade ? "Arcade" : "A Morty Bones Cartoon", reel: arcade ? `${M.reel} · no bosses, no end` : `${M.reel} of ${NUMBER_WORDS[MAP_COUNT]}`, title: M.name, sub: M.premise, note: M.blurb,
      fallback: arcade ? () => stageCard("Arcade", M.name, "No bosses, no end: survive as long as you can", 2) : n > 1 ? () => stageCard(M.reel, M.name, M.identity.mechanic.split(":")[0], 2.2) : null };
  }
  const intermissionCard = () => ({ kind: "intermission", k: "A Morty Bones Cartoon", reel: "Intermission", title: "Stretch your bones!",
    sub: `${fmtN(game.score)} points · ${game.hits} hits · ${(game.run.fragments || []).length} of ${MAP_COUNT} pieces back`, note: `Reel ${NUMBER_WORDS[game.stage] || game.stage} after the break` });
  const endCard = () => ({ kind: "end", k: "A Morty Bones Cartoon", reel: "All eight reels restored", title: "The End", sub: "Morty is whole again", note: "",
    fallback: () => stageCard("The End", "Morty is whole again", "All eight reels restored", 3.4, "gold") });

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
    reelSt.card = c; reelSt.t0 = game.time; reelSt.shown.push(c.kind + (c.n ? ":" + c.n : "")); reelSt.lastN = -1;
    reelEl.dataset.kind = c.kind; reelEl.hidden = false;
    $("rcK").textContent = c.k || ""; $("rcReel").textContent = c.reel || ""; $("rcTitle").textContent = c.title || ""; $("rcSub").textContent = c.sub || ""; $("rcNote").textContent = c.note || "";
    reelEl.classList.remove("in"); void reelEl.offsetWidth; reelEl.classList.add("in");
    srEl.textContent = c.kind === "leader" ? "Three, two, one." : [c.reel, c.title, c.sub].filter(Boolean).join(". ");
    Sound.toon(c.kind === "end" ? "fanfare" : c.kind === "leader" ? "tick" : "brass");
    Telemetry.emit("reel_card", { kind: c.kind, n: c.n || 0 });
  }
  function hideReelCard() { reelSt.card = null; reelEl.hidden = true; reelEl.classList.remove("in"); }
  // a tap, Space or Enter: on to the next card (the throw is held until the last one is done)
  function skipReelCard() {
    if (!reelSt.card || !game.cine || game.cine.kind !== "reel") return false;
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
  function drawLeader(c, w, hgt, t, still) {
    const n = Math.max(1, 3 - Math.floor(t / 0.8)), u = still ? 0 : (t % 0.8) / 0.8, cx = w / 2, cy = hgt / 2, R = Math.min(w, hgt) * 0.36;
    if (n !== reelSt.lastN) { reelSt.lastN = n; if (t > 0.05) Sound.toon("tick"); }
    c.fillStyle = "#8C8375"; c.fillRect(0, 0, w, hgt);
    c.fillStyle = "#6E665A"; c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, Math.hypot(w, hgt), -Math.PI / 2, -Math.PI / 2 + u * TAU); c.closePath(); c.fill();
    c.strokeStyle = "#F2E7C9"; c.lineWidth = 3; c.beginPath(); c.moveTo(0, cy); c.lineTo(w, cy); c.moveTo(cx, 0); c.lineTo(cx, hgt); c.stroke();
    c.lineWidth = 4; for (const k of [1, 0.82]) { c.beginPath(); c.arc(cx, cy, R * k, 0, TAU); c.stroke(); }
    c.font = `${R * 1.2}px ${NUMFONT}`; c.textAlign = "center"; c.textBaseline = "middle"; c.lineWidth = 8; c.strokeStyle = INK; c.strokeText(String(n), cx, cy + R * 0.06);
    c.fillStyle = "#F2E7C9"; c.fillText(String(n), cx, cy + R * 0.06);
  }

  // ── where the reel's cards come in
  function introReel(mode, map) {   // a run starts: the leader (once a session) and Reel One's card (Story), or the map's card (Arcade)
    const leader = mode !== "arcade" && !reelSt.leaderShown && cardsMode() === "full";
    if (leader) reelSt.leaderShown = true;
    const list = mode === "arcade" ? [titleCard(map + 1, true)] : (leader ? [{ kind: "leader" }] : []).concat(titleCard(1));
    reelCards(list, () => setHint("Pull down · aim · let go"));
  }
  function nextReel() {   // a map is clear and the next one is set: its card (after the intermission, halfway)
    const list = (game.stage === MAP_COUNT / 2 + 1 ? [intermissionCard()] : []).concat(titleCard(game.stage));
    reelCards(list, () => { updateHud(); });
  }
  function endReel(done) {   // the last boss is down: THE END, then the iris closes on Morty and opens on the headstone
    return reelCards([endCard()], () => {
      game.state = "cine"; game.cine = { kind: "reel", t: 0, dur: 1e9, then: null };   // (no throw while the iris closes)
      irisTo(done, W / 2, H * 0.3);
    });
  }
