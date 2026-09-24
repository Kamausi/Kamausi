  // ───────────────────────── the Director's Challenge ─────────────────────────
  // Every week H.K., head of production (the one who wrote the first memo), sends down a note: one map, one twist,
  // one seed, the same for everyone, and three things he'd like to see on film. Anyone can play it, whatever they've
  // reached in Story: he lends you the reel. It plays like Arcade (no bosses, the ring goes 3D at 25 hits, three
  // skulls, no continues) with the twist on top. Each note met is a star for the week, paying bones the first time;
  // the week's best score is kept beside them. A new week, a new note.
  const TWISTS = {
    wind:    { apply: () => { HZ.kind = "wind"; } },                       // Double Wind: wind on any map, and twice as strong
    cursed:  { apply: () => { powers.cursed = { left: 1e9, uses: 0, t: 0 }; renderPowers(); } },   // the Cursed Reel: ×3 score, a quicker ring, all run
    shrink:  { perMake: () => { ring.rcShrink = (ring.rcShrink || 0) + 0.004; } },   // the Shrinking Ring: a little smaller every make
    fog:     { apply: () => { HZ.kind = "fog"; } },                        // Night Shoot: the bayou's fog, on any map
    rush:    { speed: 1.3 },                                              // Rush Hour: the ring 30% quicker
    bonanza: { targets: 2 }                                               // Bonus Bonanza: twice the bonus targets
  };
  const TWIST_IDS = Object.keys(TWISTS);
  const NOTE_POOL = [
    { id: "score", range: [15, 45], step: 5, scale: 1000, have: r => game.score },
    { id: "perfects", range: [3, 9], have: r => r.perfects || 0 },
    { id: "combo", range: [5, 12], have: r => r.bestCombo || 0 },
    { id: "targets", range: [2, 6], have: r => r.targets || 0 },
    { id: "hits", range: [20, 45], step: 5, have: r => game.hits },
    { id: "shots", range: [1, 3], have: r => (r.shots || []).length }
  ];
  const DIRECTOR_PAY = [100, 200, 400];
  const nextUtcMonday = (now = Date.now()) => { const d = new Date(now), back = (d.getUTCDay() + 6) % 7; return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - back + 7); };   // (the weeks are UTC, as the board's)
  let directorOverride = null;   // (the spec tries each twist and note)
  // this week's challenge (the same for everyone: seeded by the week)
  function directorOf(week = Runs.weekOf(Date.now())) {
    const rnd = mulberry32(hashStr("director:" + week)), pool = NOTE_POOL.slice(), notes = [];
    const map = Math.floor(rnd() * MAP_COUNT), twist = TWIST_IDS[Math.floor(rnd() * TWIST_IDS.length)], seed = hashStr("director-seed:" + week);
    while (notes.length < 3) { const N = pool.splice(Math.floor(rnd() * pool.length), 1)[0]; let k = N.range[0] + Math.floor(rnd() * (N.range[1] - N.range[0] + 1)); if (N.step) k = Math.max(N.step, Math.round(k / N.step) * N.step); notes.push({ id: N.id, n: k * (N.scale || 1) }); }
    notes.sort((a, b) => NOTE_POOL.findIndex(N => N.id === a.id) - NOTE_POOL.findIndex(N => N.id === b.id));
    return { week, map, twist, seed, notes };
  }
  // the challenge this run plays: this week's (or the spec's), or, watching a replay, the one it was recorded under
  const directorNow = () => (Replay.play && Replay.play.R.dir ? { ...Replay.play.R.dir } : { ...directorOf(), ...(directorOverride || {}) });
  const directorRec = (week = Runs.weekOf(Date.now())) => { const P = realProfile(); return P.director && P.director.week === week ? P.director : { week, best: 0, stars: [false, false, false], runs: 0 }; };
  // the run's twist, on top of Arcade's rules
  function directorBegin() {
    const D = game.director = directorNow(), T = TWISTS[D.twist]; ring.rcShrink = 0;
    if (T.apply) T.apply();
    if (D.twist === "wind") HZ.windMul = 2;
    snapRing();   // (the twist's ring from the first frame)
    stageCard(t("director.k"), t(`director.twist.${D.twist}.name`), t(`director.twist.${D.twist}.line`), 2.6, "gold");
  }
  const directorSpeed = () => (game.mode === "director" && game.director ? TWISTS[game.director.twist].speed || 1 : 1);
  const directorTargets = () => (game.mode === "director" && game.director ? TWISTS[game.director.twist].targets || 1 : 1);
  function directorMake() { if (game.mode === "director" && game.director && TWISTS[game.director.twist].perMake) TWISTS[game.director.twist].perMake(); }
  // the run is over: which notes it met (stars pay the first time this week), and the week's best
  function directorAfterRun() {
    if (game.mode !== "director" || !game.director) return null;
    const D = game.director, P = profile, rec = P.director && P.director.week === D.week ? P.director : (P.director = { week: D.week, best: 0, stars: [false, false, false], runs: 0 });
    const met = D.notes.map(N => NOTE_POOL.find(X => X.id === N.id).have(game.run) >= N.n);
    let pay = 0; met.forEach((m, i) => { if (m && !rec.stars[i]) { rec.stars[i] = true; pay += DIRECTOR_PAY[i]; } });
    if (pay) addBones(pay);
    game.newBest = game.score > rec.best; rec.best = Math.max(rec.best, game.score); rec.runs++;
    game.run.director = { met, pay, stars: rec.stars.slice() };
    Telemetry.emit("director_end", { week: D.week, twist: D.twist, met, score: game.score });
    return game.run.director;
  }
  const noteText = N => t(`director.note.${N.id}`, { n: fmtN(N.n) });
  // the card on the Play sheet: this week's note, its stars, your best, and a button to take it
  function renderDirectorCard() {
    const D = directorOf(), R = directorRec(D.week), got = R.stars.filter(Boolean).length;
    $("directorCard").innerHTML = `<p class="dk">${t("director.k")}</p><p class="from">${t("director.from")}</p>`
      + `<b class="dt">${t("director.week", { map: STAGES[D.map].name, twist: t(`director.twist.${D.twist}.name`) })}</b><p class="quote">${t(`director.twist.${D.twist}.line`)}</p>`
      + `<ul class="notes">${D.notes.map((N, i) => `<li class="${R.stars[i] ? "got" : ""}"><i>${R.stars[i] ? "★" : "☆"}</i>${noteText(N)} <em>+${DIRECTOR_PAY[i]}</em></li>`).join("")}</ul>`
      + `<p class="meta">${t("director.stars", { n: got })}${R.best ? ` · ${t("director.best", { n: fmtN(R.best) })}` : ""} · ${t("director.left", { d: fmtCountdown(nextUtcMonday() - Date.now()) })}</p>`
      + `<button class="btn primary sm" type="button" data-mode="director">${t("director.play")}</button>`;
  }
