  // ───────────────────────── slingshot mapping ─────────────────────────
  function pullMax() { return U * 0.38; }
  function mapDrag(dx, dy) {
    const L = pullMax();
    const nx = clamp(dx / (L * 0.8), -1, 1), ny = clamp(dy / L, 0, 1);
    const len = Math.hypot(dx, dy), upward = dy < -L * 0.12;
    return { nx, ny, upward, valid: len >= L * 0.1 && !upward };
  }
  function aimPoint(nx, ny) { return { AX: -nx * AIM_X_MAX, AY: AIM_Y_MIN + ny * (AIM_Y_MAX - AIM_Y_MIN) }; }
  // every throw reaches the ring's resting plane at the aim point after flightT() seconds (Skull Rush makes that quicker)
  const flightT = () => FLIGHT_T * (powerOn("rush") ? 0.62 : 1);
  function aimVelocity(AX, AY) { const T = flightT(); return { x: AX / T, y: (AY - START_Y + 0.5 * G * T * T) / T, z: RING_Z / T }; }

  // ───────────────────────── DOM ─────────────────────────
  const cvs = document.getElementById("stage");
  const ctx = cvs.getContext("2d");
  const $ = id => document.getElementById(id);
  const hud = $("hud"), scoreEl = $("score"), hitsEl = $("hits"), livesEl = $("lives"), bestEl = $("best"), hintEl = $("hint");
  const comboEl = $("combo"), comboN = $("comboN"), comboWordEl = $("comboWord");
  const titleEl = $("title"), pauseEl = $("pause"), overEl = $("over"), flashEl = $("flash"), toastEl = $("toast"), srEl = $("sr");
  const vigEl = $("vig");
  const SCREENS = { title: titleEl, pause: pauseEl, over: overEl };

  for (let i = 0; i < MAX_LIVES; i++) livesEl.insertAdjacentHTML("beforeend", '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-skull"/></svg>');
  const lifeIcons = [...livesEl.querySelectorAll("svg")];

  // accessibility: how strong a flash may be (screen flashes, lightning, the film's flicker), and the page's text size
  const flashK = () => settings.flashes === "off" ? 0 : settings.flashes === "reduced" ? 0.3 : 1;
  function applyAccess() {
    const r = document.documentElement;
    r.classList.remove("hc"); r.dataset.text = settings.text; r.dataset.flashes = settings.flashes;
  }
  let userActed = false; // browsers allow audio + vibration only after a real tap
  const buzz = ms => { if (!userActed || sandbox || !settings.vibe) return; try { Platform.haptic(ms); } catch (e) {} };

  // ───────────────────────── state ─────────────────────────
  const freshRun = () => ({ perfects: 0, swishes: 0, rims: 0, misses: 0, bestCombo: 0, bones: 0, powerups: 0, bosses: 0, t0: 0, secs: 0, continues: 0, contMaps: [] });
  // score: the arcade number (leaderboards). hits: every make, the progression that summons the bosses.
  const game = { state: "title", mode: "story", map: 0, score: 0, hits: 0, stage: 1, stageHits: 0, phase: "A", cine: null, freeze: 0,
    lives: START_LIVES, slots: START_LIVES, streak: 0, perfStreak: 0, peakLives: START_LIVES, throws: 0,
    time: 0, endTimer: 0, overAt: 0, result: null, lastCross: null, newBest: false, shake: 0, slowmo: 0, run: freshRun() };
  const ring = { phase: 0, amp: 0.55, omega: 0.6, rc: RC_START, bob: 0, x: 0, y: RING_Y, z: RING_Z, wobble: 0, flash: 0, frozen: null,
    mode: "line", tri: { a: 1.25, seq: [0, 1, 2] }, glide: null };
  let boss = null;           // the Crow King or the Pumpkin King, while one is on stage
  const skull = { p0: { x: 0, y: START_Y, z: 0 }, v0: { x: 0, y: 0, z: 0 }, t: 0, pos: { x: 0, y: START_Y, z: 0 },
    crossed: false, resting: true, bounces: 0, angle: 0, spin: 0, spawn: 1, alpha: 1, flightTime: 0, pullOff: { x: 0, y: 0 }, trail: [], emit: 0 };
  const aim = { active: false, source: null, id: null, sx: 0, sy: 0, cx: 0, cy: 0, nx: 0, ny: 0.42, AX: 0, AY: RING_Y, valid: false, upward: false, tension: 0 };
  let particles = [], bursts = [], waves = [], pendingFly = 0;
  const rig = makeRig();      // the skull's squash-and-stretch springs and its current mood
  let paused = false;        // a run is frozen (pause screen, or a sheet opened from it)
  let sheet = null;          // the open sheet: customize | challenges | settings | profile
  let screen = "title";      // title | play | pause | over
  const inRun = () => game.state === "ready" || game.state === "flying" || game.state === "cine";

  let toastTimer = 0;
  function toast(html) { toastEl.hidden = true; void toastEl.offsetWidth; toastEl.innerHTML = html; toastEl.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { toastEl.hidden = true; }, 3100); }
  function applyCosmetics() { document.documentElement.style.setProperty("--ring", RINGS[cos.ring].color); applyReel(); }
  function bump(el) { el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); }

  // the score is drawn twice (an inked back plate + the gradient face), so both copies change together
  function setScoreText(v) { const t = fmtN(v); if (scoreEl.dataset.v !== t) { scoreEl.dataset.v = t; scoreEl.firstElementChild.textContent = t; } }
  function updateHud() {
    if (!pendingFly) setScoreText(game.score);
    hitsEl.textContent = game.hits;
    const bestSoFar = game.mode === "arcade" ? arcadeRec().score : profile.bestScore;   // Arcade shows this map's best
    bestEl.textContent = `Best ${fmtN(Math.max(bestSoFar, game.state === "title" ? 0 : game.score))}`;
    lifeIcons.forEach((el, i) => {
      el.style.display = i < Math.max(START_LIVES, game.slots) ? "" : "none";
      el.classList.toggle("lost", i >= game.lives);
      el.classList.toggle("bonus", i >= START_LIVES);
    });
    const tb = $("titleBest");
    tb.innerHTML = profile.bestScore > 0 ? t("title.best", { score: fmtN(profile.bestScore), rank: rankFor(profile.makes).name })
      : profile.best > 0 ? t("title.bestHits", { hits: profile.best, rank: rankFor(profile.makes).name }) : t("hint.start");
    renderBones(); renderProgress(); renderPowers(); renderWind();
    Sound.setTension(inRun() && game.lives === 1);
    updatePips();
  }
  function setHint(text, warn = false) { hintEl.textContent = text; hintEl.hidden = !text; hintEl.classList.toggle("warn", !!warn); }
  function rankFor(makes) { let i = 0; while (i + 1 < RANKS.length && makes >= RANKS[i + 1][0]) i++; return { name: RANKS[i][1], from: RANKS[i][0], next: RANKS[i + 1] }; }

  // ───────────────────────── combo meter ─────────────────────────
  function showCombo(n) {
    if (n < 2) { comboEl.hidden = true; return; }
    comboN.textContent = n; comboWordEl.textContent = comboWord(n);
    comboEl.hidden = false; comboEl.classList.toggle("hot", n >= 8);
    comboEl.classList.remove("pop"); void comboEl.offsetWidth; comboEl.classList.add("pop");
  }

  // ───────────────────────── projection & layout ─────────────────────────
  let W = 0, H = 0, DPR = 1, U = 1, F = 1, HY = 0, CAMY = 2, maxDPR = 2;
  function resize() {
    W = window.innerWidth; H = window.innerHeight; DPR = Math.min(window.devicePixelRatio || 1, maxDPR);
    cvs.width = Math.round(W * DPR); cvs.height = Math.round(H * DPR);
    U = Math.min(W, H * 0.62); F = U * 1.75;
    // Solve camera height + horizon so the skull rests at 77% and the ring hangs at 34% of the screen.
    const syS = H * 0.77, syR = H * 0.34, zs = CAM_BACK, zr = RING_Z + CAM_BACK;
    CAMY = ((syS - syR) / F + START_Y / zs - RING_Y / zr) / (1 / zs - 1 / zr);
    HY = syS - (CAMY - START_Y) * F / zs;
    buildSky(); buildFar(); buildGround(); buildMid(); buildForeground(); buildVignette(); worldResize();
  }
