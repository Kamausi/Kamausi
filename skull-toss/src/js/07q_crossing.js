  // ───────────────────────── the Challenge Stage: the crossing between maps (v48) ─────────────────────────
  // An end boss doesn't send Morty straight to the next map. After the body part, the shard and (if you want it)
  // Can Alley comes the crossing: the road into the next map, ten throws long. Every throw carries Morty a step along
  // it (the next map's own scenery, coming toward him out of the distance), and a ring waits somewhere new each time,
  // on wings, smaller as the road goes on. Misses are free and nothing can end the run here: it's a change of pace
  // and a reward. Each ring through pays bones, the golden ones (the fifth and the tenth) pay more, and all ten is a
  // clean crossing: a bonus, and your name for it on the profile. At the tenth throw the road arrives exactly where
  // the next map begins, and its title card rolls. The positions come from the run's dice, so a replay sees the same.
  const CROSS = { throws: 10, step: 6.6, lead: 72, per: 5, gold: 20, golds: [4, 9], clean: n => 100 + 50 * n, rc0: 0.06, rc1: -0.06 };
  const crossOn = () => game.phase === "crossing";
  const crossingAt = () => -(CROSS.throws - (game.run.crossN || 0)) * CROSS.step;   // how far along the road: it ends at the map's own start
  function startCrossing(then) {
    const next = game.stage + 1, M = mapData(next);
    game.phase = "crossing"; Object.assign(game.run, { crossN: 0, crossMakes: 0, crossThen: then, crossGold: 0 });
    clearPickups(); clearDirectors(); targets.length = 0; setScene(next - 1); hazardsReset(); VisualSystem.setStage(next);
    setRingMode("tri", false); ring.morph = 1; crossingRing(true); snapRing(); Sound.setAct("A");
    stageCard(t("cross.k"), t("cross.t", { map: M.name }), t("cross.s", { n: CROSS.throws }), 2.4, "gold");
    Sound.toon("whistleUp"); Telemetry.emit("crossing_start", { to: next }); setHint(t("cross.hint"));
    cine("crossing-in", 1.6, null, 0); updateHud();
  }
  const crossGolden = () => CROSS.golds.includes(game.run.crossN || 0);
  // where this throw's ring waits: somewhere new in the ring's space, smaller as the road goes on
  function crossingRing(first = false) {
    const k = (game.run.crossN || 0) / (CROSS.throws - 1), P = BLUEPRINT.ringPlane;
    const x = rrIn(-1.25, 1.25), y = rrIn(Math.max(P.yMin + 0.45, 1.8), 3.0), z = RING_Z + rrIn(-1.0, 1.3);
    if (!first) ring.glide = { from: { x: ring.x, y: ring.y, z: ring.z }, t: 0, dur: 0.6 };
    ring.frozen = { x, y, z }; game.run.crossRc = RC_START + CROSS.rc0 + (CROSS.rc1 - CROSS.rc0) * k;
  }
  function crossingMake() {
    if (!crossOn()) return;
    const gold = crossGolden(), bones = gold ? CROSS.gold : CROSS.per;
    game.run.crossMakes++; if (gold) game.run.crossGold++; addBones(bones);
    const p = project(ring.x, ring.y, ring.z); impact(gold ? t("cross.goldHit") : `+${bones}`, p.x, p.y - ring.rc * p.s - U * 0.12, { fill: GOLD, text: INK, scale: gold ? 0.7 : 0.5, delay: 0.25, bits: false });
  }
  // after each settled throw: a step along the road, and the next ring (or the arrival)
  function crossingCheck() {
    if (!crossOn()) return false;
    game.run.crossN++; profile.crossThrows = (profile.crossThrows || 0) + 1;
    if (game.run.crossN >= CROSS.throws) { crossingDone(); return true; }
    crossingRing(); updateHud(); return true;
  }
  function crossingDone() {
    const then = game.run.crossThen, n = game.run.crossMakes, clean = n >= CROSS.throws, next = game.stage + 1, bonus = clean ? CROSS.clean(game.stage) : 0;
    if (bonus) addBones(bonus);
    profile.crossings = (profile.crossings || 0) + 1; if (clean) profile.cleanCrossings = (profile.cleanCrossings || 0) + 1;
    game.run.crossThen = null; ring.frozen = null;
    stageCard(clean ? t("cross.clean") : t("cross.done"), t("cross.count", { n, total: CROSS.throws }), t("cross.paid", { bones: n * CROSS.per + game.run.crossGold * (CROSS.gold - CROSS.per) + bonus }), 2.2, "gold");
    Sound.toon(clean ? "fanfare" : "xylo"); Telemetry.emit("crossing_done", { to: next, makes: n, clean });
    cine("mini-out", 2.2, () => { if (then) then(); }, 0);
    checkUnlocks(); persist(); updateHud();
  }
