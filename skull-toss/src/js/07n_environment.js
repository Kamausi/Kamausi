  // ───────────────────────── the environment layer (v44): anchors, reactions, lighting, shadows ─────────────────────────
  // The Spatial & Environmental Blueprint (src/maps/blueprint.json, docs/SPATIAL_BLUEPRINT.md) says the environment is
  // designed around the throw. This is the part of it that runs:
  //   anchors   the ring belongs to the map: it hangs from a branch, an arch, a signpost's arm, a theatre's fly rope or
  //             a gear rail, stands on a post, is held up by a giant hand, or dangles on a chain out of the dark. In the
  //             first half the hanger carries it; when it grows wings the hanger is left swinging, snapped.
  //   reactions when Morty hits something it answers: moves, rotates, bends, cracks, falls, squeaks, shakes or reacts
  //             (the map sheet says which, prop by prop). A reaction is looks only: it never changes a throw.
  //   lighting  each map's key light: shadows fall away from it, the ring gets a backing and a rim so it reads on any
  //             background, and in a boss fight the scenery dims and a spot finds the ring.
  //   shadows   the skull's shadow shrinks, fades and slides along the light the higher it flies; it meets the skull
  //             at landing. Nothing joins the ring to its shadow.
  const mapSheet = () => stageDef().map.sheet;
  const anchorKind = () => stageDef().map.anchor;
  const anchorDef = () => BLUEPRINT.anchors[anchorKind()] || BLUEPRINT.anchors.post;
  const ringZ0 = () => RING_Z + (stageDef().map.ring.depth || 0);   // the ring's first-half depth (the Bone Desert stands it further off)
  const LIGHT = () => { const L = mapSheet().lighting; return { x: L.key[0], y: L.key[1], ring: L.ring, rim: L.rim, boss: L.boss, ambient: L.ambient }; };
  // how far a shadow slides along the ground for something h metres up (away from the light)
  const shadowShift = h => -LIGHT().x * h * BLUEPRINT.shadow.skull.offset;

  // ── anchors: where the support is, and whether the hanger holds the ring now
  const ENV = { anchor: { t: -9, s: 0 }, reacts: 0 };
  const anchorHolds = () => (ring.mode === "line" || ring.mode === "static") && !ring.frozen && game.state !== "title";
  function anchorReact(strength = 1) { ENV.anchor = { t: game.time, s: clamp(strength, 0.3, 1.6) }; }
  const anchorShake = () => { const u = game.time - ENV.anchor.t; return u < 0 || u > 1.4 ? 0 : ENV.anchor.s * Math.exp(-u * 3.2) * Math.sin(u * 26); };
  // the overhead supports: a gnarled branch, a gilded arch, a signpost's arm, the fly batten, the gear rail, the dark
  function drawAnchorSupport() {
    const k = anchorKind(), A = anchorDef(); if (A.support !== "overhead" || game.state === "title" || game.phase === "crossing") return;   // (on the road between maps there's nothing to hang from)
    const z = ringZ0(), y = A.y, sh = anchorShake(), P = (x, yy) => project(x, yy, z);
    const L = P(-3.4, y), R = P(3.4, y), s = P(0, y).s;
    ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round";
    if (k === "branch") {   // in from the left, thick at the trunk, twigs and a few leaves; it bends when the ring is knocked
      const bend = sh * 0.12, tip = P(2.9, y + 0.1 + bend), mid = P(0.2, y + 0.18 - bend * 0.6), base = P(-4.2, y - 0.3);
      for (const [col, w] of [[INK, 0.2], ["#4A3A2E", 0.14]]) { ctx.strokeStyle = col; ctx.lineWidth = Math.max(3, w * s); ctx.beginPath(); ctx.moveTo(base.x, base.y); ctx.quadraticCurveTo(mid.x, mid.y, tip.x, tip.y); ctx.stroke(); }
      ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.5, 0.04 * s);
      for (const [x0, dx, dy] of [[-1.6, -0.3, 0.5], [0.9, 0.3, 0.45], [2.2, 0.35, -0.3], [-0.4, 0.2, 0.55]]) { const a = P(x0, y + 0.12 - bend * 0.4), b = P(x0 + dx, y + 0.12 + dy - bend * 0.4); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        ctx.fillStyle = "#C8642A"; ctx.beginPath(); ctx.ellipse(b.x, b.y, 0.08 * s, 0.045 * s, 0.6, 0, TAU); ctx.fill(); ctx.stroke(); }
    } else if (k === "arch") {   // two gilded pillars either side of the lane and a scrolled crossbar
      for (const sd of [-1, 1]) { const top = P(sd * 2.75, y + 0.2), bot = project(sd * 2.75, 0, z), w = 0.22 * s; ctx.fillStyle = "#8E7A4A"; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.fillRect(top.x - w / 2, top.y, w, bot.y - top.y); ctx.strokeRect(top.x - w / 2, top.y, w, bot.y - top.y);
        ctx.fillStyle = GOLD; ctx.beginPath(); ctx.arc(top.x, top.y, w * 0.55, 0, TAU); ctx.fill(); ctx.stroke(); }
      const jx = sh * 0.02 * s, a = P(-2.75, y + 0.2), b = P(2.75, y + 0.2), crest = P(0, y + 0.62);
      for (const [col, w] of [[INK, 0.16], [GOLD, 0.1]]) { ctx.strokeStyle = col; ctx.lineWidth = Math.max(3, w * s); ctx.beginPath(); ctx.moveTo(a.x + jx, a.y); ctx.quadraticCurveTo(crest.x + jx, crest.y, b.x + jx, b.y); ctx.stroke(); }
      ctx.fillStyle = GOLD; ctx.strokeStyle = INK; ctx.lineWidth = 2; star(ctx, crest.x + jx, crest.y + 0.05 * s, 0.16 * s, 5, 0.45, -Math.PI / 2); ctx.fill(); ctx.stroke();
    } else if (k === "sign") {   // a signpost on the left, its arm out across the lane, pointing back the way you came
      const post = P(-2.8, y + 0.4), foot = project(-2.8, 0, z), w = 0.14 * s, rot = sh * 0.05;
      ctx.fillStyle = "#5A4232"; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.fillRect(post.x - w / 2, post.y, w, foot.y - post.y); ctx.strokeRect(post.x - w / 2, post.y, w, foot.y - post.y);
      ctx.save(); ctx.translate(post.x, P(0, y).y); ctx.rotate(rot); const len = R.x - post.x + 0.3 * s, h = 0.26 * s;
      ctx.fillStyle = "#7A5A3A"; ctx.beginPath(); ctx.moveTo(0, -h / 2); ctx.lineTo(len, -h / 2); ctx.lineTo(len + h * 0.6, 0); ctx.lineTo(len, h / 2); ctx.lineTo(0, h / 2); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "rgba(30,20,10,.7)"; ctx.font = `bold ${Math.round(h * 0.6)}px ${UIFONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("← THIS WAY", len * 0.55, h * 0.04);
      ctx.restore();
    } else if (k === "rope") {   // the fly batten, a pipe across the flies, a sandbag counterweight on its line
      ctx.strokeStyle = INK; ctx.lineWidth = Math.max(4, 0.09 * s); ctx.beginPath(); ctx.moveTo(L.x, L.y + sh * 3); ctx.lineTo(R.x, R.y + sh * 3); ctx.stroke(); ctx.strokeStyle = "#3A3E46"; ctx.lineWidth = Math.max(2, 0.05 * s); ctx.stroke();
      for (const x of [-2.2, 2.2]) { const a = P(x, y), b = P(x, y + 3); ctx.strokeStyle = "rgba(20,14,8,.8)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
      const bag = P(3.0, y - 0.7 + sh * 0.1); ctx.strokeStyle = "#8A6A40"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(R.x - 0.3 * s, R.y); ctx.lineTo(bag.x, bag.y); ctx.stroke();
      ctx.fillStyle = "#8A7A58"; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(bag.x, bag.y + 0.12 * s, 0.14 * s, 0.18 * s, 0, 0, TAU); ctx.fill(); ctx.stroke();
    } else if (k === "gear") {   // a brass rail along the roof, a trolley on it, and a cog that turns as it runs
      for (const [col, w] of [[INK, 0.14], ["#8A6A3A", 0.08]]) { ctx.strokeStyle = col; ctx.lineWidth = Math.max(3, w * s); ctx.beginPath(); ctx.moveTo(L.x, L.y); ctx.lineTo(R.x, R.y); ctx.stroke(); }
      ctx.fillStyle = "#3A342E"; for (const x of [-3.0, 3.0]) { const q = P(x, y), b = P(x, y + 2); ctx.fillRect(q.x - 0.06 * s, b.y, 0.12 * s, q.y - b.y); }
    } else if (k === "chain") {   // the dark holds it: nothing but a faint beam far up, and the chain coming down out of it
      const a = P(-3, y + 0.4), b = P(3, y + 0.4); ctx.strokeStyle = "rgba(180,140,255,.18)"; ctx.lineWidth = Math.max(2, 0.06 * s); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    ctx.restore();
  }
  // the hanger: rope, chain, rod or hand from the support to the ring (or, once the ring has flown, what's left of it)
  function drawAnchorHanger(p, r, lw) {
    const k = anchorKind(), A = anchorDef(), z = ring.z, s = p.s, holds = anchorHolds();
    if (A.support === "ground") {
      if (k === "post") { if (!holds) return false; const base = project(ring.x, 0, z), pw = POST_HALF * 2 * p.s, top = p.y + r + lw * 0.35, PL = POLES[cos.pole]; if ((PL && PL.hang) || base.y > top) drawPole(p.x, top, base.y, pw, p.s, cos.pole, ctx, game.time, p.y - r - lw * 0.4); return true; }
      if (k === "hand") { drawBoneHand(holds ? ring.x : 0, holds ? ring.y - ring.rc : 1.2, holds ? z : ringZ0(), holds); return true; }
      return false;
    }
    const topY = A.y, sway = anchorShake();
    if (!holds) {   // snapped: a short end left swinging from the support over the lane
      if (game.state === "title" || ring.mode === "boss" || game.phase === "crossing") return false;
      const t = game.time, top = project(0, topY, ringZ0()), end = project(Math.sin(t * 1.6) * 0.25, topY - 0.55, ringZ0());
      hangerLine(k, top, end, top.s); return false;
    }
    const top = project(ring.x + sway * 0.08, topY, z), at = { x: p.x, y: p.y - r - lw * 0.45 };
    hangerLine(k, top, at, s);
    if (k === "gear") {   // the trolley's cog turns with how far the ring has slid
      const g = project(ring.x, topY, z), R = 0.2 * s, a = ring.x * 3 + sway; ctx.save(); ctx.translate(g.x, g.y); ctx.rotate(a); ctx.fillStyle = "#C49A42"; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath();
      for (let i = 0; i < 20; i++) { const b = (i / 20) * TAU, rr2 = i % 2 ? R : R * 1.25; ctx.lineTo(Math.cos(b) * rr2, Math.sin(b) * rr2); } ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(0, 0, R * 0.3, 0, TAU); ctx.fill(); ctx.restore();
    } else if (k === "arch" || k === "rope") { const g = project(ring.x, topY, z); ctx.fillStyle = k === "arch" ? GOLD : "#3A3E46"; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); rr(ctx, g.x - 0.12 * s, g.y - 0.06 * s, 0.24 * s, 0.12 * s, 0.04 * s); ctx.fill(); ctx.stroke(); }
    return true;
  }
  function hangerLine(k, a, b, s) {
    ctx.save(); ctx.lineCap = "round";
    if (k === "chain" || k === "arch") {   // links, alternately flat and edge-on
      const n = Math.max(3, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / Math.max(5, 0.1 * s))), ang = Math.atan2(b.y - a.y, b.x - a.x);
      for (let i = 0; i < n; i++) { const u = (i + 0.5) / n, x = a.x + (b.x - a.x) * u, y = a.y + (b.y - a.y) * u; ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
        ctx.strokeStyle = INK; ctx.lineWidth = Math.max(2, 0.035 * s); ctx.beginPath(); ctx.ellipse(0, 0, Math.max(3, 0.06 * s), i % 2 ? Math.max(1, 0.012 * s) : Math.max(2, 0.03 * s), 0, 0, TAU); ctx.stroke();
        ctx.strokeStyle = k === "arch" ? GOLD : "#8A8E96"; ctx.lineWidth = Math.max(1, 0.018 * s); ctx.stroke(); ctx.restore(); }
    } else if (k === "gear") {   // a brass rod
      for (const [col, w] of [[INK, 0.07], ["#C49A42", 0.04]]) { ctx.strokeStyle = col; ctx.lineWidth = Math.max(2, w * s); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
    } else {   // rope, with a twist drawn along it
      for (const [col, w] of [[INK, 0.05], ["#B08A58", 0.03]]) { ctx.strokeStyle = col; ctx.lineWidth = Math.max(1.8, w * s); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
      ctx.strokeStyle = "rgba(60,40,20,.7)"; ctx.lineWidth = 1; const n = Math.round(Math.hypot(b.x - a.x, b.y - a.y) / 6);
      for (let i = 1; i < n; i++) { const u = i / n, x = a.x + (b.x - a.x) * u, y = a.y + (b.y - a.y) * u; ctx.beginPath(); ctx.moveTo(x - 2, y - 1); ctx.lineTo(x + 2, y + 1); ctx.stroke(); }
    }
    ctx.restore();
  }
  // the Bone Desert's anchor: a skeleton's hand up out of the sand, fingers round the bottom of the ring
  function drawBoneHand(x, yTop, z, holding) {
    const base = project(x, 0, z), s = base.s, w = 0.1 * s, sh = anchorShake() * 0.04 * s;
    ctx.save(); ctx.lineCap = "round"; ctx.strokeStyle = INK;
    for (const dx of [-0.07, 0.07]) { const a = project(x + dx, 0, z), b = project(x + dx * 0.6, yTop - 0.42, z); ctx.lineWidth = w * 1.1; ctx.beginPath(); ctx.moveTo(a.x + sh, a.y); ctx.lineTo(b.x + sh, b.y); ctx.stroke(); ctx.strokeStyle = "#EDE3C8"; ctx.lineWidth = w * 0.7; ctx.stroke(); ctx.strokeStyle = INK; }
    const palm = project(x, yTop - 0.28, z);
    ctx.fillStyle = "#EDE3C8"; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(palm.x + sh, palm.y, 0.16 * s, 0.11 * s, 0, 0, TAU); ctx.fill(); ctx.stroke();
    for (let i = 0; i < 4; i++) {   // fingers: curled round the rim when holding, spread when not
      const fx = -0.15 + i * 0.1, tip = holding ? project(x + fx * 1.1, yTop + 0.06, z) : project(x + fx * 1.6, yTop + 0.18, z);
      ctx.lineWidth = w * 0.7; ctx.strokeStyle = INK; ctx.beginPath(); ctx.moveTo(palm.x + fx * s + sh, palm.y - 0.05 * s); ctx.lineTo(tip.x + sh, tip.y); ctx.stroke(); ctx.strokeStyle = "#EDE3C8"; ctx.lineWidth = w * 0.42; ctx.stroke();
    }
    ctx.fillStyle = "rgba(90,50,20,.35)"; ctx.beginPath(); ctx.ellipse(base.x, base.y, 0.3 * s, 0.06 * s, 0, 0, TAU); ctx.fill();   // the little mound of sand it came up through
    ctx.restore();
  }

  // ── reactions: a prop the skull passes through, lands by or knocks (a bonk nearby) answers in its map's way
  const REACT_DUR = { move: 1.1, rotate: 1.0, bend: 1.2, crack: 0.5, fall: 0.7, squeak: 0.5, shake: 0.6, react: 0.9 };
  function reactionFor(kind) {
    const S = mapData(sceneMap + 1).sheet; for (const it of S.interactions) if (it.on === kind) return it.does;   // (the scenery's own map: v49, so the crossing's props answer the next map's way)
    return kind === "tuft" || kind === "reeds" || kind === "corn" ? "bend" : kind === "stone" || kind === "slab" ? "shake" : null;
  }
  function reactProp(k, dir = 1, strength = 1) {
    const does = reactionFor(k.fam || k.kind); if (!does || (k.react && game.time - k.react.t0 < 0.25)) return false;
    k.react = { does, t0: game.time, dir: dir < 0 ? -1 : 1, s: clamp(strength, 0.4, 1.4) };
    if (does === "crack") k.cracked = true;
    if (does === "fall") k.fallen = k.react.dir;
    ENV.reacts++;
    const p = project(k.x, 0.8, k.z), pan = panOf(k.x);
    if (does === "squeak") Sound.toon("boing", pan); else if (does === "crack") Sound.toon("bonk", pan); else if (does === "fall") Sound.toon("bonk", pan); else if (does === "shake" || does === "rotate") Sound.toon("tick", pan);
    if (does === "squeak" && Math.random() < 0.6) caption("SQUEAK!", p.x, p.y - U * 0.04);
    return true;
  }
  // how a reacting prop is drawn this frame (applied in drawProp, inside the prop's own transform)
  function reactXform(k) {
    const R = k.react; if (!R && !k.fallen) return;
    const u = R ? (game.time - R.t0) / REACT_DUR[R.does] : 9, live = u >= 0 && u < 1, e = live ? (1 - u) : 0, osc = Math.sin(u * TAU * 2.5);
    if (k.fallen) { const f = R && R.does === "fall" && live ? easeOutBack(Math.min(1, u * 1.6)) : 1; ctx.rotate(k.fallen * 1.35 * f); return; }
    if (!live) { k.react = null; return; }
    const s = R.s, d = R.dir;
    if (R.does === "bend") ctx.transform(1, 0, -d * 0.35 * s * e * (0.4 + 0.6 * osc), 1, 0, 0);
    else if (R.does === "rotate") ctx.rotate(d * 0.5 * s * e * osc);
    else if (R.does === "move") ctx.translate(d * 0.25 * s * e * U * 0.2 * (0.5 + 0.5 * osc), 0);
    else if (R.does === "shake" || R.does === "crack") ctx.translate(Math.sin(u * 60) * 3 * s * e, 0);
    else if (R.does === "squeak") ctx.scale(1 + 0.18 * s * e * osc, 1 - 0.22 * s * e * osc);
    else if (R.does === "react") ctx.translate(0, -Math.abs(Math.sin(u * Math.PI * 2)) * 10 * s * e);
  }
  function drawCrack(k, sp) {   // a crack, drawn in once and kept for the rest of the map
    if (!k.cracked) return;
    ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.5, sp.S * 0.025); ctx.beginPath(); ctx.moveTo(-0.05 * sp.S, -sp.ay * 0.95); ctx.lineTo(0.06 * sp.S, -sp.ay * 0.7); ctx.lineTo(-0.04 * sp.S, -sp.ay * 0.5); ctx.lineTo(0.05 * sp.S, -sp.ay * 0.3); ctx.stroke();
  }
  // the skull as it flies: brushing a prop, or landing by one, sets it off; the anchor's support answers an over-throw
  function envAfterFlight(s, prev) {
    if (!GY.props.length || s.alpha <= 0) return;
    const P = s.pos;
    for (const k of GY.props) {
      if (k.kind === "digger" || Math.abs(k.z - P.z) > 0.9 || Math.abs(k.x - P.x) > 1.0) continue;
      const tall = k.tall || (PROP_SPRITES[k.kind] ? PROP_SPRITES[k.kind][1] : 1.4) * (k.size || 1);
      if (P.y < tall) reactProp(k, P.x - prev.x >= 0 ? 1 : -1, 1);
    }
    const A = anchorDef();
    if (A.support === "overhead" && Math.abs(P.z - ringZ0()) < 0.3 && P.y > A.y - 0.3 && P.y < A.y + 0.5 && Math.abs(P.x) < 3.2 && game.time - ENV.anchor.t > 0.6) { anchorReact(1); Sound.toon("bonk", panOf(P.x)); }
  }
  function envImpact(x, z, strength = 1) {   // a landing or a bonk shakes what's near it
    for (const k of GY.props) { const d = Math.hypot(k.x - x, k.z - z); if (k.kind !== "digger" && d < 1.6 * strength) reactProp(k, k.x - x >= 0 ? 1 : -1, strength * (1 - d / (1.8 * strength))); }
  }
  function envReset() { ENV.anchor = { t: -9, s: 0 }; for (const k of GY.props) { k.react = null; k.cracked = false; k.fallen = 0; } }

  // ── lighting: the ring's backing and rim (readable on any map), the boss's dimmed scenery and spot
  function drawRingLight(x, y, r, lw) {
    const Lt = LIGHT(), a = Lt.ring;
    // v54: no dark backing any more (it read as a see-through black halo round the ring and a dark rim inside it). What
    // keeps the ring clear of the sky now is its own ink line and a soft glow in its own colour, outside it only: the
    // hole stays clear and nothing round the ring is darkened.
    const R = RINGS[cos.ring] || RINGS.hoop, E = ringOuter(r, lw, cos.ring), G = E + Math.max(4, lw * 1.2);
    const g = ctx.createRadialGradient(x, y, E * 0.98, x, y, G);
    g.addColorStop(0, `rgba(${R.rgb},${0.28 * a})`); g.addColorStop(1, `rgba(${R.rgb},0)`);
    ctx.save(); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, G, 0, TAU); ctx.arc(x, y, E * 0.98, 0, TAU, true); ctx.fill(); ctx.restore();
    return () => {   // the rim light on the side the key comes from, drawn over the ring
      const ang = Math.atan2(-Lt.y, Lt.x);
      ctx.save(); ctx.lineCap = "round"; ctx.strokeStyle = Lt.rim; ctx.lineWidth = Math.max(1.5, lw * 0.35); ctx.beginPath(); ctx.arc(x, y, r + lw * 0.55, ang - 0.7, ang + 0.7); ctx.stroke(); ctx.restore();
    };
  }
  function drawBossLight() {
    if (!boss || boss.dead || game.state === "title") return;
    const k = clamp(boss.t / 1.4, 0, 1) * BLUEPRINT.lighting.boss.dim, p = project(ring.x, ring.y, ring.z), R = ring.rc * p.s * BLUEPRINT.lighting.boss.spot * 2.2, rgb = rgbOf(LIGHT().boss);
    ctx.save(); ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const g = ctx.createRadialGradient(p.x, p.y, R * 0.6, p.x, p.y, Math.max(W, H));
    g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(0.18, `rgba(6,4,10,${k * 0.6})`); g.addColorStop(1, `rgba(6,4,10,${k})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const s = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, R); s.addColorStop(0, `rgba(${rgb},${0.1 * k / BLUEPRINT.lighting.boss.dim})`); s.addColorStop(1, `rgba(${rgb},0)`);
    ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = s; ctx.beginPath(); ctx.arc(p.x, p.y, R, 0, TAU); ctx.fill();
    ctx.restore();
  }
