  // ───────────────────────── screens + transitions ─────────────────────────
  function applyScreen(name) {
    for (const k of Object.keys(SCREENS)) SCREENS[k].hidden = k !== name;
    hud.hidden = name !== "play";
    comboEl.style.visibility = name === "play" ? "" : "hidden";
    if (name === "title") { mascot.enter = true; fitLogo(); }
    if (name === "over") { ui.shownAt = uiNow(); countUp($("resBones"), game.run.bones, 700); }
    if (name !== "play") gameOverCard(false);
    const focus = { title: "play", pause: "resumeBtn", over: "again" }[name];
    if (focus && !sheet && ui.kbd) $(focus).focus({ preventScroll: true });
  }
  // big scene changes iris out and back in, like the end of an old cartoon; pausing is instant
  function showScreen(name, fx = true) {
    const prev = screen; screen = name;
    if (name === "title") renderResumeOffer();
    if (fx && prev !== name && name !== "pause" && prev !== "pause") irisTo(() => applyScreen(name)); else applyScreen(name);
  }
  // GAME OVER pops up over the picture when the last skull is gone; the headstone follows it
  const GAME_OVER_HOLD = 1.6;   // seconds the words hold before the results
  function gameOverCard(on, words = ["Game", "Over"]) {
    const el = $("gameOver");
    if (!on) { el.hidden = true; return; }
    const card = el.firstElementChild; let i = 0;
    card.innerHTML = words.map(w => `<span class="go-w">${[...w.toUpperCase()].map(ch => `<i style="--i:${i++}">${ch}</i>`).join("")}</span>`).join("");
    el.classList.toggle("won", words[0] === "The"); el.hidden = false; card.style.animation = "none"; void card.offsetWidth; card.style.animation = "";
    for (const i of card.querySelectorAll("i")) { i.style.animation = "none"; void i.offsetWidth; i.style.animation = ""; }
  }
  function pauseRun() {
    if (!inRun() || paused) return;
    paused = true; cancelAim(); Sound.setPaused(true);
    $("pauseScore").textContent = fmtN(game.score);
    showScreen("pause"); Sound.ui("open");
  }
  function resumeRun() {
    if (!paused) return;
    closeSheet(false); paused = false; Sound.setPaused(false);
    showScreen("play"); Sound.ui("close");
  }
  function toTitle() {
    closeSheet(false); paused = false; Sound.setPaused(false); cancelAim(); Sound.flightStop(true);
    game.state = "title"; game.score = 0; game.hits = 0; game.lives = START_LIVES; game.slots = START_LIVES; game.streak = 0;
    stageReset(); clearPowers(); clearPickups(); setScene(0); snapRing(); Sound.setAct("menu");
    particles = []; bursts = []; waves = []; clearFlies(); resetSkull(); showCombo(0); setHint("");
    showScreen("title"); updateHud();
  }
  $("play").addEventListener("click", () => openSheet("play"));   // Story or Arcade?
  $("again").addEventListener("click", () => startGame({ mode: game.mode, map: game.map }));   // the same again (the same map, in Arcade)

  // ───────────────────────── Play: Story or Arcade, and Arcade's map ─────────────────────────
  const clockStr = s => `${Math.floor(s / 60)}:${String(Math.floor(s) % 60).padStart(2, "0")}`;
  function renderPlay(maps = false) {
    $("modePick").hidden = maps; $("mapPick").hidden = !maps;
    $("h-play").textContent = maps ? "Arcade" : "Play";
    const reached = Math.min(profile.bestStage, MAP_COUNT), done = profile.storyClears > 0;
    $("storyBest").textContent = profile.bestScore > 0 ? `Best ${fmtN(profile.bestScore)} · ${done ? `finished ${profile.storyClears > 1 ? profile.storyClears + " times" : ""}` : `reached map ${reached}`} · ${profile.fragments.length}/8 pieces` : "";
    const played = STAGES.map((S, i) => arcadeRec(i)).filter(a => a.runs), longest = played.length ? Math.max(...played.map(a => a.secs)) : 0;
    $("arcadeBest").textContent = played.length ? `Longest run ${clockStr(longest)}` : "";
    $("mapList").innerHTML = STAGES.map((S, i) => {
      const A = arcadeRec(i), open = mapUnlocked(i);
      if (!open) return `<button class="map-card locked" type="button" data-map="${i}" aria-disabled="true" style="--tint:${S.map.look.sky[1]}"><span class="n">Map ${i + 1}</span><b>${S.name}</b><span class="d">Reach it in Story to play it here</span><span class="rec"><span><i>Locked</i></span></span></button>`;
      return `<button class="map-card" type="button" data-map="${i}" style="--tint:${S.map.look.sky[1]}"><span class="n">Map ${i + 1}</span><b>${S.name}</b><span class="d">${S.blurb}</span>`
        + `<span class="rec">${A.runs ? `<span><i>Best</i> ${fmtN(A.score)}</span><span><i>Longest</i> ${clockStr(A.secs)}</span>` : "<span><i>Not played yet</i></span>"}</span></button>`;
    }).join("");
  }
  $("modePick").addEventListener("click", e => {
    const b = e.target.closest("[data-mode]"); if (!b) return;
    if (b.dataset.mode === "story") { closeSheet(false); startGame({ mode: "story" }); }
    else { Sound.ui("flick"); renderPlay(true); const f = $("mapList").querySelector("button"); if (f && ui.kbd) f.focus({ preventScroll: true }); }
  });
  $("mapList").addEventListener("click", e => { const b = e.target.closest("[data-map]"); if (!b) return; if (!mapUnlocked(+b.dataset.map)) { Sound.ui("deny"); return; } closeSheet(false); startGame({ mode: "arcade", map: +b.dataset.map }); });
  // in the map list, Back steps back to the two modes rather than closing
  $("sheet-play").querySelector("[data-back]").addEventListener("click", e => { if (!$("mapPick").hidden) { e.stopImmediatePropagation(); renderPlay(false); Sound.ui("close"); } }, true);
  $("toMenu").addEventListener("click", toTitle);
  $("pauseBtn").addEventListener("click", pauseRun);
  $("resumeBtn").addEventListener("click", resumeRun);
  $("quitBtn").addEventListener("click", e => arm(e.currentTarget, "Tap again to end the run", () => {
    closeSheet(false); paused = false; Sound.setPaused(false); screen = "play"; endRun();
  }));
  // every sign cracks and knocks when pressed
  document.addEventListener("pointerdown", e => { const b = e.target.closest(".btn"); if (b && !b.disabled) { b.classList.remove("cracked"); void b.offsetWidth; b.classList.add("cracked"); Sound.toon("knock"); } });

  let armed = null, armTimer = 0; // two-tap confirm for destructive buttons
  function arm(btn, label, action) {
    if (armed === btn) { disarm(); action(); return; }
    disarm(); armed = btn; btn.dataset.label = btn.innerHTML; btn.textContent = label; btn.classList.add("confirm");
    armTimer = setTimeout(disarm, 3000); Sound.ui("tick");
  }
  function disarm() { if (!armed) return; armed.innerHTML = armed.dataset.label; armed.classList.remove("confirm"); armed = null; clearTimeout(armTimer); }

  // ───────────────────────── points that fly into the score ─────────────────────────
  const flies = new Set();
  function flyPoints(text, x, y, perfect) {
    if (reduceMotion || sandbox) { setScoreText(game.score); return; }   // no flight: the score just updates
    pendingFly++;
    const el = document.createElement("div"); el.className = "fly"; el.textContent = text;
    if (perfect) el.style.fontSize = "44px";
    document.body.appendChild(el); flies.add(el);
    const r = scoreEl.getBoundingClientRect(), tx = r.left + r.width * 0.5, ty = r.top + r.height * 0.5;
    const dur = reduceMotion || sandbox || !el.animate ? 0 : 520;
    const at = (px, py, s) => `translate(${px}px,${py}px) translate(-50%,-50%) scale(${s})`;
    if (dur) el.animate([{ transform: at(x, y, 0.5), opacity: 0 }, { transform: at(x, y - 26, 1.15), opacity: 1, offset: 0.28 }, { transform: at(tx, ty, 0.5), opacity: 0.85 }],
      { duration: dur, easing: "cubic-bezier(.55,0,.75,.4)", fill: "forwards" });
    else el.style.opacity = "0";
    setTimeout(() => {
      if (!flies.delete(el)) return;
      el.remove(); pendingFly = Math.max(0, pendingFly - 1);
      if (!pendingFly) { setScoreText(game.score); bump(scoreEl); }
    }, dur);
  }
  function clearFlies() { for (const el of flies) el.remove(); flies.clear(); pendingFly = 0; setScoreText(game.score); }

  function countUp(el, to, ms) {
    const t0 = performance.now();
    if (!to || reduceMotion || sandbox) { el.textContent = to; return; }
    const step = now => {
      const k = clamp((now - t0) / ms, 0, 1), v = Math.round(to * (1 - Math.pow(1 - k, 3)));
      el.textContent = v;
      if (k < 1) requestAnimationFrame(step); else { renderBones(); for (const b of document.querySelectorAll(".bones")) bump(b); Sound.ui("claim"); }
    };
    el.textContent = "0"; requestAnimationFrame(step);
  }

  // ───────────────────────── results ─────────────────────────
  function titleName() { const it = findItem("title", cos.title); return it ? it.name : "Grave Rookie"; }
  // how the round is graded: mostly how clean the tossing was, with credit for getting deep into a stage
  const GRADES = [[0.93, "S"], [0.85, "A+"], [0.77, "A"], [0.69, "A-"], [0.61, "B+"], [0.53, "B"], [0.45, "B-"],
    [0.37, "C+"], [0.29, "C"], [0.21, "C-"], [0.12, "D"], [0, "F"]];
  function runGrade() {
    const r = game.run, t = Math.max(1, game.throws);
    const clean = (r.perfects * 3 + r.swishes * 2 + r.rims) / (t * 3);          // 1.0 = every toss a perfect
    const reach = Math.min(0.26, (game.hits / 50) * 0.1 + r.bosses * 0.07 + (game.stage - 1) * 0.05);
    const v = clamp(clean * 0.82 + reach, 0, 1);
    return { grade: (GRADES.find(g => v >= g[0]) || GRADES[GRADES.length - 1])[1], stars: v >= 0.72 ? 3 : v >= 0.48 ? 2 : v >= 0.24 ? 1 : 0, v };
  }
  const mmss = s => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s) % 60).padStart(2, "0")}`;   // floored like every clock (rounding showed 59.8 s as 00:00)
  function renderResults() {
    const r = game.run, g = runGrade();
    $("epitaph").textContent = profile.name || "a nameless soul";
    $("over").classList.toggle("won", !!r.story); $("over").querySelector(".rip").innerHTML = r.story ? "The end<i>!</i>" : "Here lies<i>…</i>";
    const arcade = game.mode === "arcade";
    const rows = [["Score", `<b id="final">${fmtN(game.score)}</b>`], [arcade ? "Survived" : "Time", mmss(r.secs || 0)], ["Hits", game.hits],
      ["Perfect", `${r.perfects}/${game.throws}`], ["Best combo", `×${r.bestCombo}`]];
    if (r.bosses) rows.splice(4, 0, ["Bosses", r.bosses]);
    if (r.powerups) rows.push(["Power-ups", r.powerups]);
    if (r.fragments && r.fragments.length) rows.push(["Morty's pieces", r.fragments.map(f => FRAGMENTS[f].name).join(", ")]);
    rows.push(["Skill level", g.stars ? `<span class="stars">${"★".repeat(g.stars)}</span>` : "—"]);
    $("resStats").innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("");
    $("resGrade").textContent = g.grade;
    $("resGrade").parentElement.classList.toggle("top", g.v >= 0.69);
    const best = game.newBest && game.score > 0, longer = arcade && r.newTime && r.secs > 0;
    $("newBest").hidden = !(best || longer || r.story);
    $("newBest").textContent = r.story && !best ? "Morty is whole again!" : !arcade ? "A brand new record!" : best ? `New best on ${STAGES[game.map].name}!` : "Your longest run on this map!";
    $("resTitle").textContent = best || longer ? "" : arcade ? `Arcade · ${STAGES[game.map].name}` : titleName();
    $("resBones").textContent = r.bones;
    const A = arcade ? arcadeRec() : null;
    $("bestLine").innerHTML = arcade ? `Map best <b>${fmtN(A.score)}</b> · longest <b>${mmss(A.secs)}</b>` : `Best <b>${fmtN(profile.bestScore)}</b> · ${rankFor(profile.makes).name}`;
    // the progress panel: what's next in the Vault, with the bones this run earned sitting in its top-right corner
    const nx = nextUnlock(), txt = $("nextText"), bar = $("nextBar");
    bar.hidden = !nx;
    if (!nx) { txt.innerHTML = "The Skull Vault is yours: <b>everything's unlocked</b>"; return; }
    const name = `${nx.it.name} ${KIND_LABEL[nx.kind]}`, need = (nx.it.price || 0) - profile.bones;
    const goal = nx.it.req ? `${REQ_TEXT[nx.it.req[0]](nx.it.req[1]).toLowerCase()} (${Math.min(nx.have, nx.it.req[1])}/${nx.it.req[1]})` : "";
    txt.innerHTML = nx.it.price && need <= 0 ? `<b>${name}</b> is in reach · ${nx.it.price.toLocaleString("en-US")} bones in the Skull Vault`
      : `Next: <b>${name}</b> · ${nx.it.price ? `${need.toLocaleString("en-US")} more bones` : ""}${nx.it.price && goal ? ", or " : ""}${goal}`;
    bar.firstElementChild.style.width = `${Math.round(clamp(nx.k, 0, 1) * 100)}%`;
  }

  // ───────────────────────── the skull on stage (menu) and asleep (results) ─────────────────────────
  const ui = { px: -1, py: -1, shownAt: 0, tick: -1, kbd: false, last: 0 };
  const mascot = { R: makeRig(), y: 0, vy: 0, spin: 0, ang: 0, nextHop: 2, pokeAt: -9, enter: true };
  // the logo grows to fill whatever height the menu leaves free (and never wider than the screen)
  function fitLogo() {
    const scr = $("title"); if (scr.hidden) return;
    const logo = scr.querySelector(".logo"), vw = window.innerWidth, curtain = clamp(vw * 0.07, 16, 130), maxW = Math.min(vw - 2 * curtain - 18, 640);   // clear of the curtains
    let lo = 44, hi = 200;
    for (let i = 0; i < 11; i++) {
      const mid = (lo + hi) / 2; logo.style.fontSize = mid + "px";
      const wide = Math.max(...[...logo.children].map(el => el.scrollWidth));
      if (scr.scrollHeight <= scr.clientHeight + 1 && wide <= maxW) lo = mid; else hi = mid;
    }
    logo.style.fontSize = Math.floor(lo) + "px";
  }
  window.addEventListener("resize", () => fitLogo());
  window.addEventListener("keydown", e => { if (e.key === "Tab" || e.key.startsWith("Arrow") || e.key === "Enter") ui.kbd = true; }, true);
  window.addEventListener("pointerdown", () => { ui.kbd = false; }, true);
  const uiNow = () => performance.now() / 1000;
  window.addEventListener("pointermove", e => { ui.px = e.clientX; ui.py = e.clientY; }, { passive: true });
  $("mascot").addEventListener("pointerdown", () => {   // poke it: BOING
    const T = uiNow(); mascot.pokeAt = T; mascot.vy = -560; mascot.spin = (Math.random() < 0.5 ? -1 : 1) * 14;
    kick(mascot.R, 0.5, 0, Math.PI / 2, 260, 6); setMood(mascot.R, "happy", T); Sound.toon("boing");
  });
  function fitCanvas(cv) {
    const r = cv.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1), w = Math.round(r.width * d), h = Math.round(r.height * d);
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    const c = cv.getContext("2d"); c.setTransform(d, 0, 0, d, 0, 0); c.clearRect(0, 0, r.width, r.height);
    return [c, r];
  }
  const LOGO_SKULL = { r: 0.49, base: 0.14 };   // skull radius and baseline, in ems of the logo
  const MASCOT_SPILL = { side: 0.75, top: 0.15, bottom: 0.55 };   // how far (in ems) the canvases spill past the letter slot (see the CSS)
  function drawMascot(T, dt) {
    const [cb] = fitCanvas($("mascotBack")), [c, r] = fitCanvas($("mascotFront")); if (!r.width) return;
    const M = mascot, R = M.R, fs = parseFloat(getComputedStyle($("mascot")).fontSize) || 100;
    const sr = fs * LOGO_SKULL.r, floor = r.height - fs * MASCOT_SPILL.bottom - fs * LOGO_SKULL.base - sr * SKULL_BOTTOM;   // the jaw sits on the letters' baseline
    if (M.enter) { M.enter = false; M.y = -(floor - sr * 1.3); M.vy = 0; }        // drop in from the top of its canvas
    // a little rubber physics: drop in, hop now and then, squash on every landing
    M.vy += 2400 * dt; M.y += M.vy * dt;
    if (M.y >= 0) { if (M.vy > 180) { kick(R, clamp(1 - M.vy / 1400, 0.45, 0.85), 0, Math.PI / 2, 280, 7); if (M.vy > 500) Sound.toon("knock"); } M.y = 0; M.vy = M.vy > 180 ? -M.vy * 0.28 : 0; }
    if (M.y === 0 && M.vy === 0 && T > M.nextHop) { M.vy = -380; kick(R, 1.22, 0, Math.PI / 2, 300, 10); M.nextHop = T + 2.6 + Math.random() * 2.4; }
    M.spin *= Math.max(0, 1 - dt * 3); M.ang += M.spin * dt; if (Math.abs(M.spin) < 0.5) M.ang *= Math.max(0, 1 - dt * 6);
    if (T - M.pokeAt > 1.1 && R.mood === "happy") setMood(R, "idle", T);
    const quirk = SKINS[cos.skull] && SKINS[cos.skull].idle ? SKINS[cos.skull].idle(T) : null;
    if (R.mood !== "happy") setMood(R, quirk || "idle", T);
    R.aT = 1 + 0.02 * Math.sin(T * 2.4); R.tiltT = 0.1 * Math.sin(T * 1.5);
    const cx = r.width / 2, cy = floor + M.y;
    let lx = 0, ly = 0.1;
    if (ui.px >= 0) { const dx = ui.px - (r.left + cx), dy = ui.py - (r.top + cy), d = Math.hypot(dx, dy) || 1, m = Math.min(1, d / 200); lx = (dx / d) * m; ly = (dy / d) * m; }
    const f = faceFor(R.mood, T, { lx, ly, seed: 1.7 }); R.jawT = f.jawT; stepRig(R, dt);
    const sink = R.a < 1 ? sr * (1 - R.a) * 0.9 : 0;
    drawAura(cb, cx, cy + sink, sr, T, false);   // the aura's far side, behind the lettering; its near side goes over it
    drawSkull(c, cx, cy + sink, sr, { ang: M.ang + R.tilt, a: R.a, dir: R.dir, t: T, look: cos, face: f, jaw: R.jaw });
    drawAura(c, cx, cy + sink, sr, T, true); drawHat(c, cx, cy + sink, sr, M.ang + R.tilt, T, null, 1, cos.hat, R.a, R.dir);
  }
  // the round is over, so the skull has left the building: X eyes, jaw hanging open, and a wisp where the rest of him was
  function drawSleeper(T) {
    const [c, r] = fitCanvas($("sleeper")); if (!r.width) return;
    const s = r.width, k = easeOutBack(clamp((T - ui.shownAt) / 0.3, 0, 1));
    const cx = s * 0.47, cy = s * 0.44 + Math.sin(T * 1.5) * s * 0.02, sr = s * 0.25 * k, wob = Math.sin(T * 2.2) * sr * 0.14;
    c.lineJoin = "round"; c.lineCap = "round";
    c.fillStyle = CREAM; c.strokeStyle = INK; c.lineWidth = Math.max(1.6, s * 0.026);
    c.beginPath();                                   // the wisp, trailing off under the jaw
    c.moveTo(cx - sr * 0.5, cy + sr * 0.5);
    c.quadraticCurveTo(cx - sr * 0.66, cy + sr * 1.2, cx - sr * 0.08 + wob, cy + sr * 1.36);
    c.quadraticCurveTo(cx + sr * 0.52 + wob, cy + sr * 1.52, cx + sr * 0.2, cy + sr * 1.98);
    c.quadraticCurveTo(cx + sr * 0.06, cy + sr * 1.4, cx + sr * 0.5, cy + sr * 0.5);
    c.closePath(); c.fill(); c.stroke();
    for (let i = 0; i < 2; i++) {                    // two motes drifting off it
      const p = ((T * 0.5 + i * 0.5) % 1), rr = sr * (0.13 - 0.06 * p);
      c.globalAlpha = Math.sin(p * Math.PI) * 0.9;
      c.beginPath(); c.arc(cx - sr * (0.7 + p * 0.55), cy + sr * (1.75 + p * 0.55), rr, 0, TAU); c.fill(); c.stroke();
    }
    c.globalAlpha = 1;
    const f = faceFor("idle", T); f.glyph = "x"; f.jawT = 0.66; f.sockL = f.sockR = 1.06; f.blink = 0;
    const ang = -0.09 + Math.sin(T * 1.5) * 0.06;
    drawSkull(c, cx, cy, sr, { ang, a: 1, dir: 0, t: T, look: cos, face: f });
    drawHat(c, cx, cy, sr, ang, T, null, 1, cos.hat, 1, 0);
    c.strokeStyle = INK; c.lineWidth = Math.max(1.6, s * 0.022);   // the knocked-out ticks
    for (const [a, l] of [[-2.55, 0.32], [-2.05, 0.22], [-0.6, 0.32], [-1.1, 0.22]]) {
      const x0 = cx + Math.cos(a) * sr * 1.3, y0 = cy + Math.sin(a) * sr * 1.3;
      c.beginPath(); c.moveTo(x0, y0); c.lineTo(x0 + Math.cos(a) * sr * l, y0 + Math.sin(a) * sr * l); c.stroke();
    }
  }
  function drawUI(now) {
    const T = now / 1000, dt = Math.min(1 / 20, Math.max(0, T - (ui.last || T))); ui.last = T;
    if (screen === "title" && !titleEl.hidden) drawMascot(T, dt);
    else if (screen === "over" && !overEl.hidden) drawSleeper(T);
    if (sheet === "customize") drawShopPreview(T, dt);
    if (sheet === "store") drawCart(T, dt);
    if (sheet === "challenges") { const s = Math.floor(T); if (s !== ui.tick) { ui.tick = s; tickChallenges(); } }
    filmFrame(now);
  }
