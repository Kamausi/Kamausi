  // ───────────────────────── the visual debug overlay ─────────────────────────
  // SkullToss.debug.visuals (or ?debug in the address) draws what the game really uses over the picture: the
  // ring's clean, perfect and miss circles, the tube the art should fill, the skull's collision circle and
  // pivot, the moon's disc, and a panel with the frame rate, the camera's exposures and every plane's offset.
  // Handy when dropping in new art: the circles show whether a picture lines up with the game. Off, it's free.
  const visuals = { showFPS: false, showStates: false, showCollisionRadius: false, showPivots: false, showParallax: false, showCamera: false, showAnimationFrame: false, forceAnimationFPS: 0 };
  if (/[?&]debug\b/.test(location.search)) for (const k in visuals) if (k.startsWith("show")) visuals[k] = true;
  // the ` key (under Esc) flips the whole overlay on and off, which also reaches the game inside the published page
  window.addEventListener("keydown", e => {
    if (e.key !== "`" || e.repeat || (e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName))) return;
    const on = !visualsOn(); for (const k in visuals) if (k.startsWith("show")) visuals[k] = on;
  });
  const vstat = { fps: 60, ms: 0 };
  const visualsOn = () => visuals.showFPS || visuals.showStates || visuals.showCollisionRadius || visuals.showPivots || visuals.showParallax || visuals.showCamera || visuals.showAnimationFrame;
  function visualTick(raw, ms) {   // the loop reports the real frame interval and what the frame cost to make
    if (raw > 0 && raw < 0.25) vstat.fps += (1 / raw - vstat.fps) * 0.08;
    vstat.ms += (ms - vstat.ms) * 0.08;
  }
  // the shapes the game plays with, in screen pixels (also what the tests read)
  function visualShapes() {
    const p = project(ring.x, ring.y, ring.z), s = p.s, rc = ring.rc, inner = rc - RING_TUBE - SKULL_R;
    const flying = game.state === "flying" || (game.state === "over" && skull.flightTime > 0);
    const sp = flying ? project(skull.pos.x, skull.pos.y, skull.pos.z) : project(0, START_Y, 0);
    return {
      ring: { x: p.x, y: p.y, clean: inner * s, perfect: inner * 0.38 * (powerOn("deadeye") ? 2 : 1) * s, miss: (rc + RING_TUBE + SKULL_R) * s,
        tubeIn: (rc - RING_TUBE) * s, tubeOut: (rc + RING_TUBE) * s, grab: pickup ? (rc * PICK_R + SKULL_R * PICK_OVERLAP) * s : 0,
        post: ring.mode === "line" ? { half: POST_HALF * s, top: p.y + (rc + RING_TUBE) * s, foot: project(ring.x, 0, ring.z).y } : null },
      skull: { x: sp.x, y: sp.y, r: SKULL_R * sp.s }
    };
  }
  function drawVisualDebug() {
    const c = ctx, V = visuals, onStage = game.state !== "title";
    baseXform(c); c.save(); c.lineWidth = 1.5;
    const ring_ = (x, y, r, col, dash) => { if (r <= 0) return; c.strokeStyle = col; c.setLineDash(dash ? [5, 4] : []); c.beginPath(); c.arc(x, y, r, 0, TAU); c.stroke(); };
    const cross = (x, y, n, col) => { c.strokeStyle = col; c.setLineDash([]); c.beginPath(); c.moveTo(x - n, y); c.lineTo(x + n, y); c.moveTo(x, y - n); c.lineTo(x, y + n); c.stroke(); };
    const tag = (x, y, t, col) => { c.font = "600 10px ui-monospace,Menlo,monospace"; c.fillStyle = col; c.fillText(t, x, y); };
    if (onStage && (V.showCollisionRadius || V.showPivots)) {
      const S = visualShapes(), R = S.ring;
      if (V.showCollisionRadius) {
        ring_(R.x, R.y, R.tubeIn, "rgba(242,231,201,.9)"); ring_(R.x, R.y, R.tubeOut, "rgba(242,231,201,.9)");
        ring_(R.x, R.y, R.clean, "#5CE08A"); ring_(R.x, R.y, R.perfect, "#F5C542"); ring_(R.x, R.y, R.miss, "#FF6B5B", true); ring_(R.x, R.y, R.grab, "#E07BFF", true);
        tag(R.x + R.clean * 0.72, R.y - R.clean * 0.72, "clean", "#5CE08A"); tag(R.x - 18, R.y - R.perfect - 3, "perfect", "#F5C542"); tag(R.x + R.miss * 0.72, R.y - R.miss * 0.72, "miss", "#FF6B5B");
        if (R.post) { c.strokeStyle = "#FF6B5B"; c.setLineDash([5, 4]); c.beginPath(); for (const k of [-1, 1]) { c.moveTo(R.x + k * R.post.half, R.post.top); c.lineTo(R.x + k * R.post.half, R.post.foot); } c.stroke(); }
        ring_(S.skull.x, S.skull.y, S.skull.r, "#58D6FF");
      }
      if (V.showPivots) {
        cross(R.x, R.y, 7, "#5CE08A"); cross(S.skull.x, S.skull.y, 7, "#58D6FF");
        const P = VENT.skull || rig, L = S.skull.r * 1.4 * P.a;   // the squash/stretch axis on the drawing now showing, as long as the stretch
        c.strokeStyle = "#58D6FF"; c.beginPath(); c.moveTo(S.skull.x, S.skull.y); c.lineTo(S.skull.x + Math.cos(P.dir) * L, S.skull.y + Math.sin(P.dir) * L); c.stroke();
        tag(S.skull.x + 9, S.skull.y + 14, `a ${P.a.toFixed(2)}`, "#58D6FF");
        if (moon.r) { planeXform(c, 400, "sky"); ring_(moon.x, moon.y, moon.r, "#F5C542", true); cross(moon.x, moon.y, 6, "#F5C542"); baseXform(c); }
      }
    }
    // the panel
    const lines = [];
    if (V.showFPS) lines.push(`fps ${vstat.fps.toFixed(1)}  frame ${vstat.ms.toFixed(1)} ms`, `dpr ${DPR} (max ${maxDPR})  ${W}x${H}`, `particles ${particles.length}  ${game.state}${boss ? "  boss " + boss.kind : ""}  ring ${ring.mode}`);
    if (V.showStates) {
      lines.push(`skull ${VSTATE.skull}  pose ${VPOSE.id}  target ${VSTATE.target}  launcher ${VSTATE.launcher}  camera ${VSTATE.camera}`);
      lines.push(`stage ${VSTATE.stage}  boss ${VSTATE.boss}${VSTATE.power ? `  power ${VSTATE.power}` : ""}  quality ${DPR >= 2 ? "high" : DPR >= 1.5 ? "medium" : "low"} fx ${Math.round(QUALITY.level * 100)}%${lastImpact ? `  last hit ${lastImpact.kind} x${lastImpact.strength.toFixed(2)}` : ""}`);
      const cu = SHOT.cues.slice(-4).map(c => `${c.name}@${c.t.toFixed(2)}`).join(" ");
      lines.push(`shot #${SHOT.n} ${SHOT.outcome || "-"}${SHOT.outcome ? ` (fx ${fxIntensity(SHOT.outcome).toFixed(2)})` : ""}${cu ? `  cues ${cu}` : ""}`);
      lines.push("art " + Object.entries(ASSETS).map(([id, A]) => `${id} ${A.meta.version}`).join("  "));
    }
    if (V.showAnimationFrame) {
      lines.push(`drawings ${VCLOCK.fps} fps  frame #${VCLOCK.n}  camera exposure #${camS.n || 0}`);
      const w = world.walkers.map(k => `${k.type} ${celIndex(k) + 1}/${CELS}`).join("  ");
      if (w && W >= 700) lines.push(`cels on twos: ${w}`);
    }
    if (V.showCamera) lines.push(`cam ${camOn ? "on" : "off"} (${settings.camera})  x ${cam.x.toFixed(3)} y ${cam.y.toFixed(3)} z ${cam.z.toFixed(3)}`);
    // (a phone has no room for the parallax table)
    if (V.showParallax && W >= 700) for (const [name, zc, plane] of [["sky", 400, "sky"], ["clouds", 160, "sky"], ["far", 70, "far"], ["bats", 40, "far"], ["mid", 30, "world"], ["near", 3.6, "near"], ["fg", 2.4, "fg"]]) {
      const q = camOn ? camAt(zc, plane) : { k: 1, ox: 0, oy: 0 };
      lines.push(`${name.padEnd(6)} z${String(zc).padEnd(4)} k ${q.k.toFixed(3)}  dx ${q.ox.toFixed(1).padStart(6)}  dy ${q.oy.toFixed(1).padStart(6)}`);
    }
    if (lines.length) {   // beside the ring on a wide screen; on a narrow one, on the lawn between the ring's foot and the sling
      const lh = 13, x = 8, y = Math.round(W >= 700 ? H * 0.2 : projectBase(0, 0, RING_Z).y + 10);
      c.font = "600 10.5px ui-monospace,Menlo,monospace";
      // a line too long for a phone wraps at its gaps (the items are two spaces apart)
      const room = W - 28;
      for (let i = 0; i < lines.length; i++) {
        if (c.measureText(lines[i]).width <= room) continue;
        const parts = lines[i].split("  "); let cur = parts.shift(); const out = [];
        for (const q of parts) { if (c.measureText(cur + "  " + q).width <= room) cur += "  " + q; else { out.push(cur); cur = q; } }
        out.push(cur); lines.splice(i, 1, ...out); i += out.length - 1;
      }
      const w = Math.min(W - 16, 12 + Math.max(...lines.map(l => c.measureText(l).width)));
      c.setLineDash([]); c.fillStyle = "rgba(7,8,11,.78)"; c.fillRect(x, y, w, lines.length * lh + 10);
      c.fillStyle = "#EDE6D6"; lines.forEach((l, i) => c.fillText(l, x + 6, y + 15 + i * lh));
    }
    c.restore();
  }
