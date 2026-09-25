  // ───────────────────────── water (v51): reflections, ripples, and the collision view ─────────────────────────
  // On the maps with water (the Drowned Theater, the Black Marsh) whatever stands above it is mirrored in it. The
  // reflection belongs to the object; the ripple belongs to the water. Each reflector is drawn again, by its own
  // drawing code, into an off-screen layer, mirrored about the water line at its own depth (and a little squashed);
  // the layer is then laid on the water in thin wavering strips, under the objects themselves and never on the
  // boardwalk. Three classes, by what they are: gameplay (the ring and its post, the skull, a boss) reflect clearly;
  // scenery near the water softly; far scenery faintly. None of it touches a hit test: collisions stay with the
  // objects, in the world. A skull that comes down in the water sets off ripples, and the reflections shiver a while.
  const WATER = { cv: null, g: null, ripples: [], shiver: 0, reflecting: false };
  const REFLECT = { gameplay: 0.95, near: 0.6, far: 0.22, squash: 0.86 };
  const waterOn = () => !!(look().ambient && look().ambient.water);
  // is this point of the water plane open water (not the boardwalk)?
  function overWater(x, z) { if (!waterOn()) return false; const zEnd = RING_Z + 1.2; if (z > zEnd || z < 0) return true; const half = 0.75 + (0.6 - 0.75) * (z / zEnd); return Math.abs(x) > half + 0.02; }
  // draw one reflector: its own drawing, mirrored about the water line at depth z, into the reflection layer
  function reflectOne(z, x, alpha, fn) {
    const g = WATER.g, gy = project(x, 0, z).y;
    g.save(); g.setTransform(DPR, 0, 0, DPR, 0, 0); g.globalAlpha = alpha;
    g.translate(0, gy * (1 + REFLECT.squash)); g.scale(1, -REFLECT.squash);
    try { fn(); } catch (e) { Debug.warn("RENDER", e, "reflection"); }
    g.restore();
  }
  function drawWaterReflections() {
    if (!waterOn() || QUALITY.level < 0.75) return;   // (a phone that's struggling drops the reflections before anything else)
    const need = cvs.width, needH = cvs.height;
    if (!WATER.cv) { WATER.cv = document.createElement("canvas"); WATER.g = WATER.cv.getContext("2d"); }
    if (WATER.cv.width !== need || WATER.cv.height !== needH) { WATER.cv.width = need; WATER.cv.height = needH; }
    const g = WATER.g; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, need, needH);
    const main = ctx; WATER.reflecting = true; ctx = g;
    try {
      // scenery, far to near (props are kept in back-to-front order)
      for (const k of GY.props) {
        if (k.kind === "digger" || (k.travel && !travelShows(k)) || !overWater(k.x, k.z + 0.3)) continue;
        reflectOne(k.z, k.x, k.z > 16 ? REFLECT.far : REFLECT.near, () => (k.travel ? drawTravelProp(k) : drawProp(k)));
      }
      if (game.state !== "title") {
        if (boss && boss.draw) reflectOne(ring.z + 2, ring.x, REFLECT.gameplay * 0.8, () => { boss.draw(false); boss.draw(true); });
        reflectOne(ring.z, ring.x, REFLECT.gameplay, () => drawRing());
        if (game.state === "flying" && skull.alpha > 0) reflectOne(skull.pos.z, skull.pos.x, REFLECT.gameplay, () => drawFlyingSkull());
      }
    } finally { ctx = main; WATER.reflecting = false; }
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "source-atop"; g.fillStyle = "rgba(6,14,16,.32)"; g.fillRect(0, 0, need, needH); g.restore();   // (darker and duller than the thing itself, as water gives it back)
    // lay it on the water in thin strips, each nudged sideways by the swell (more toward the viewer, more after a splash)
    const t = game.time, band = Math.max(2, Math.round(3 * DPR)), top = Math.max(0, Math.round((HY + camBase.y) * DPR));
    const lane = laneScreenPoly();
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.beginPath(); ctx.rect(0, top, need, needH - top); if (lane) { ctx.moveTo(lane[0].x * DPR, lane[0].y * DPR); for (const q of lane) ctx.lineTo(q.x * DPR, q.y * DPR); ctx.closePath(); }
    ctx.clip("evenodd");
    ctx.globalAlpha = 0.34;
    for (let y = top; y < needH; y += band) {
      const depth = (y - top) / Math.max(1, needH - top), amp = (1.2 + depth * 5 + WATER.shiver * 9) * DPR;
      const dx = Math.sin(y * 0.09 / DPR + t * 2.1) * amp + Math.sin(y * 0.031 / DPR - t * 1.3) * amp * 0.5;
      ctx.drawImage(WATER.cv, 0, y, need, band, dx, y, need, band);
    }
    ctx.restore();
  }
  // the boardwalk's outline on screen (it reflects nothing, and nothing reflects in it)
  function laneScreenPoly() {
    if (look().lane !== "boardwalk") return null;
    const zEnd = RING_Z + 1.2, P = (x, z) => project(x, 0, z);
    return [P(-0.75, 0.05), P(0.75, 0.05), P(0.6, zEnd), P(-0.6, zEnd)];
  }
  // ── ripples: rings spreading on the water from where something came down in it, drawn on the water plane
  function waterRipple(x, z, strength = 1) {
    if (!overWater(x, z)) return false;
    WATER.ripples.push({ x, z, t: 0, s: clamp(strength, 0.3, 1.6) }); if (WATER.ripples.length > 12) WATER.ripples.shift();
    WATER.shiver = Math.min(1, WATER.shiver + 0.5 * strength); Sound.toon("splash", panOf(x));
    return true;
  }
  function updateWater(dt) {
    WATER.shiver = Math.max(0, WATER.shiver - dt * 0.8);
    for (const R of WATER.ripples) R.t += dt;
    WATER.ripples = WATER.ripples.filter(R => R.t < 1.6 + R.s * 0.4);
  }
  function drawRipples() {
    if (!WATER.ripples.length) return;
    ctx.save(); ctx.lineWidth = 1.5;
    for (const R of WATER.ripples) {
      const p = project(R.x, 0, R.z), life = 1.6 + R.s * 0.4;
      for (let i = 0; i < 3; i++) {
        const u = R.t - i * 0.18; if (u <= 0) continue;
        const rad = (0.15 + u * 0.9 * R.s) * p.s, a = Math.max(0, 1 - u / life) * 0.6;
        ctx.strokeStyle = `rgba(210,235,230,${a})`; ctx.beginPath(); ctx.ellipse(p.x, p.y, rad, rad * 0.26, 0, 0, TAU); ctx.stroke();
      }
    }
    ctx.restore();
  }

  // ── the collision view (a debug switch: ?collisions, or SkullToss.debug.collisions(true)). Read-only: it draws what the
  // hit tests test. Green: solid; blue: a trigger (the water, the props that react); red: danger; yellow: scoring
  // (the ring's clean window, the targets); purple: the camera's safe frame.
  const COLL = { on: /[?&]collisions\b/.test(location.search) };
  function drawCollisionDebug() {
    if (!COLL.on || game.state === "title") return;
    const C = { solid: "#5BD86A", trigger: "#4AA8FF", danger: "#FF5A4A", score: "#FFD23A", camera: "#C080FF" };
    ctx.save(); baseXform(ctx); ctx.lineWidth = 1.5; ctx.font = "700 10px sans-serif";
    const circle = (x, y, z, r, col, dash) => { const p = project(x, y, z); ctx.strokeStyle = col; ctx.setLineDash(dash ? [4, 3] : []); ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(1.5, r * p.s), 0, TAU); ctx.stroke(); };
    const box = (x0, x1, y0, y1, z0, z1, col) => { ctx.strokeStyle = col; ctx.setLineDash([]); const c = [];
      for (const z of [z0, z1]) for (const y of [y0, y1]) for (const x of [x0, x1]) c.push(project(x, y, z));
      for (const [a, b] of [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]]) { ctx.beginPath(); ctx.moveTo(c[a].x, c[a].y); ctx.lineTo(c[b].x, c[b].y); ctx.stroke(); } };
    // the ring: its clean window, and the tube
    circle(ring.x, ring.y, ring.z, ring.rc - RING_TUBE - SKULL_R, C.score, true);
    circle(ring.x, ring.y, ring.z, ring.rc + RING_TUBE, C.solid);
    for (const T of targets) if (!T.pop) circle(T.x, T.y, T.z, TARGET_R * (T.sz || 1), C.score);
    for (const I of OB.list) {
      if (I.kind === "bumper") { const c = bumperAt(I); circle(c.x, c.y, c.z, I.r, C.solid); }
      else if (I.kind === "bar") { const E = barEnds(I), a = project(E.a.x, E.a.y, E.a.z), b = project(E.b.x, E.b.y, E.b.z); ctx.strokeStyle = C.solid; ctx.lineWidth = Math.max(2, BAR_R * 2 * a.s); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.lineWidth = 1.5; }
      else if (I.kind === "spikes") box(I.span[0], I.span[1], 0, I.h * spikesRaise(I), I.z - 0.14, I.z + 0.14, C.danger);
      else if (I.kind === "cannon") for (const b of I.balls) { const q = ballAt(I, b); circle(q.x, q.y, q.z, BALL_R, C.danger); }
      else if (I.kind === "magnet") circle(I.at[0], I.at[1], I.at[2], MAG_CORE, C.solid);
      else if (I.kind === "crusher") { const [x0, x1, z0, z1] = I.box, B = crusherBottom(I); box(x0, x1, B.y, B.y + CRUSHER_TALL, z0, z1, C.danger); }
      else if (I.kind === "barrier") { const [x0, x1, y0, y1, z] = I.box; box(x0, x1, y0, y1, z, z + 0.02, C.solid); }
    }
    for (const h of HZ.list) if (h.x != null && h.y != null && h.z != null) circle(h.x, h.y, h.z, h.r || 0.25, C.danger);
    for (const sd of seeds) if (sd.live) circle(sd.x, sd.y, sd.z, SEED_R, C.danger);
    for (const k of GY.props) if (k.kind !== "digger" && (!k.travel || travelShows(k)) && k.z < 14) { const tall = k.tall || (PROP_SPRITES[k.kind] ? PROP_SPRITES[k.kind][1] : 1.4) * (k.size || 1); box(k.x - 1, k.x + 1, 0, tall, k.z - 0.9, k.z + 0.9, C.trigger); }
    const lane = laneScreenPoly();
    if (waterOn()) { ctx.strokeStyle = C.trigger; ctx.setLineDash([6, 4]); const p0 = project(-6, 0, 0.5), p1 = project(6, 0, 0.5); ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke(); ctx.fillStyle = C.trigger; ctx.fillText("WATER", 8, p0.y - 4);
      if (lane) { ctx.strokeStyle = C.solid; ctx.beginPath(); lane.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); ctx.closePath(); ctx.stroke(); } }
    ctx.strokeStyle = C.camera; ctx.setLineDash([8, 5]); ctx.strokeRect(W * 0.08, H * 0.12, W * 0.84, H * 0.7);   // the safe frame the play keeps inside
    ctx.setLineDash([]); ctx.fillStyle = C.camera; ctx.fillText("SAFE FRAME", W * 0.08 + 4, H * 0.12 + 12);
    if (game.state === "flying") circle(skull.pos.x, skull.pos.y, skull.pos.z, SKULL_R, "#FFFFFF");
    ctx.restore();
  }
