  // ───────────────────────── the feel of a throw (v51) ─────────────────────────
  // The last miss stays on the stage as a faint trail of ink dots while you line up the next one (with a small cross
  // where it passed the ring, if it went close), so every throw teaches the next. A make wipes it. The pull buzzes
  // a little harder at each quarter of the draw (on devices that can).
  const ghostShot = { cur: [], last: null, near: null, lastAt: -1, tension: 0 };
  const GHOST_STEP = 0.028;   // seconds of flight between recorded points
  function ghostReset() { ghostShot.cur = []; ghostShot.last = null; ghostShot.near = null; ghostShot.lastAt = -1; antic.k = 0; antic.want = 0; antic.from = 0; }
  function ghostRecord(s) {
    if (Replay.play || s.hang > 0) return;
    if (s.flightTime - ghostShot.lastAt < GHOST_STEP && ghostShot.cur.length) return;
    ghostShot.lastAt = s.flightTime; if (ghostShot.cur.length < 240) ghostShot.cur.push({ x: s.pos.x, y: s.pos.y, z: s.pos.z });
  }
  function ghostLaunch() { ghostShot.cur = []; ghostShot.lastAt = -1; ghostShot.tension = 0; antic.from = game.stageHits || 0; }
  // the throw's outcome: a make clears the trail; a miss becomes the next throw's reference
  function ghostResolve(make) {
    if (Replay.play) return;
    if (make) { ghostShot.last = null; ghostShot.near = null; return; }
    ghostShot.last = ghostShot.cur.slice(); const L = game.lastCross;
    ghostShot.near = L && skull.crossed && L.d < L.rc * 2.2 ? { x: L.x, y: L.y, z: L.ringZ } : null;
  }
  function drawGhostShot() {
    const G0 = ghostShot.last; if (!G0 || G0.length < 3 || game.state !== "ready" || settings.guide === "off") return;
    const rest = project(0, START_Y, 0), kr = SKULL_R * rest.s * 1.6;
    ctx.save(); let lx = null, ly = null, i = 0;
    for (const q of G0) {
      const p = project(q.x, q.y, q.z); if (p.s <= 0) continue;
      if (Math.hypot(p.x - rest.x, p.y - rest.y) < kr) continue;
      const r = clamp(SKULL_R * 0.13 * p.s, 1, 3);
      if (lx !== null && Math.hypot(p.x - lx, p.y - ly) < Math.max(10, r * 4)) continue;
      lx = p.x; ly = p.y; i++;
      ctx.globalAlpha = 0.3 * (1 - Math.min(0.6, i / 60)); ctx.fillStyle = "#F2E7C9"; ctx.strokeStyle = "rgba(23,19,15,.6)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill(); ctx.stroke();
    }
    const N = ghostShot.near;
    if (N) { const p = project(N.x, N.y, N.z), k = Math.max(4, SKULL_R * 0.35 * p.s); ctx.globalAlpha = 0.55; ctx.strokeStyle = "#E8505B"; ctx.lineWidth = Math.max(1.5, k * 0.3); ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(p.x - k, p.y - k); ctx.lineTo(p.x + k, p.y + k); ctx.moveTo(p.x + k, p.y - k); ctx.lineTo(p.x - k, p.y + k); ctx.stroke(); }
    ctx.restore();
  }
  // the pull: a small buzz at each quarter of the draw, and a firmer one at full draw
  function pullHaptics() {
    const q = Math.floor(clamp(aim.tension || 0, 0, 1) * 4);
    if (q > ghostShot.tension && aim.active) buzz(q >= 4 ? 14 : 4 + q * 2);
    ghostShot.tension = aim.active ? q : 0;
  }
  // ── the camera commits early (v51). From the moment the skull leaves, the flight is predicted with the same physics
  // it flies by (and again every frame, so a fan or a moving ring that changes it is noticed); if it's going through
  // the ring, the world starts carrying Morty on toward the next step while the skull is still in the air, up to
  // just under half the step before it arrives. If the prediction turns to a miss, or it misses after all, the world
  // eases back to where it was. STATIC → ANTICIPATING → FOLLOWING, and back.
  const antic = { k: 0, want: 0, from: 0, state: "static", predicted: false };
  const ANTIC_MAX = 0.45;
  function predictMake(s) {
    if (s.crossed || s.hang > 0 || s.v0.z <= 0) return null;
    const tc = crossTime(s, 5, tau => ring.phase + ring.omega * (tau - s.t)); if (!(tc < Infinity)) return null;
    const p = posAt(s, tc), rp = ringAt(ring.phase + ring.omega * (tc - s.t));
    return Math.hypot(p.x - rp.x, p.y - rp.y) < ring.rc - RING_TUBE - SKULL_R * 0.5 ? { tc } : null;
  }
  function updateAnticipation(dt) {
    const s = skull, R = game.result;
    let want = 0;
    if (game.state === "flying" && TRAVEL.on && game.mode === "story" && !Replay.play) {
      if (!R) { const P = predictMake(s); antic.predicted = !!P; if (P) want = ANTIC_MAX * smooth(clamp(s.t / Math.max(0.05, P.tc), 0, 1)); }
      else if (R.make) want = ANTIC_MAX;   // it went in: hold on while the hit is counted (the travel takes it from there)
    } else antic.predicted = false;
    antic.want = want; antic.k += (want - antic.k) * (1 - Math.exp(-dt * 7)); if (antic.k < 0.002 && !want) antic.k = 0;
    antic.state = want > 0 ? (antic.k > ANTIC_MAX * 0.6 ? "following" : "anticipating") : "static";
  }
  // how far the world may run ahead of the counted hits right now
  function anticipatedGoal() {
    if (!antic.k || !TRAVEL.on || game.phase === "crossing") return -Infinity;
    const a = travelAt(antic.from), b = travelAt(antic.from + 1);
    return b > a ? a + (b - a) * antic.k : -Infinity;
  }

  // ── the wind as a tool (v53, after Paper Toss): a make that only went in because the wind carried it. Aimed off the
  // ring on purpose, so that thrown straight it would have missed the clean window, and the crosswind bent it through.
  // A steady wind is an acceleration (the physics doesn't change), so this is a skill, not luck: +150, +300 in a strong one.
  function windCurve(R) {
    if (!R.make || Replay.play || !skull.v0) return 0;
    const ax = skull.ax || 0; if (Math.abs(ax) < 0.6) return 0;
    const L = skull.launchRing || ring, tc = L.z / skull.v0.z, straight = skull.v0.x * tc, clean = ring.rc - RING_TUBE - SKULL_R;
    if (Math.abs(straight - L.x) <= clean) return 0;   // (it'd have gone in anyway)
    const pts = Math.abs(ax) >= 1.4 ? 300 : 150;
    game.score += pts; flyPoints(`${t("feel.windCurve")} +${pts}`, W / 2, H * 0.27, true); Sound.toon("whistleUp"); updateHud();
    game.run.windCurves = (game.run.windCurves || 0) + 1;
    return pts;
  }
