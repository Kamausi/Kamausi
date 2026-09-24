  // ───────────────────────── career: experience, levels and the runs you've had ─────────────────────────
  // Every real run earns experience (Practice plays on a copy, so it earns none): a point a hit, two a perfect,
  // 25 a boss, 50 a piece of Morty, 10 a signature shot, 3 a bonus target, a point per 5,000 score, and 300 for
  // finishing the story. Fifty career levels sit on a curve that asks more each time; each level pays 25 bones ×
  // the level, and levels 5, 10, 20, 30, 40 and 50 bring a title. The rank (by makes) stays as it was: the career
  // level is how much you've played, the rank how well. The last ten runs are kept for the Profile.
  const CAREER = { maxLevel: 50, k: 60, p: 1.6, bonesPer: 25, titles: { 5: "understudy", 10: "topbill", 20: "matinee", 30: "boxoffice", 40: "legend", 50: "equal" } };
  const xpForLevel = L => (L <= 1 ? 0 : Math.round((CAREER.k * Math.pow(L - 1, CAREER.p)) / 10) * 10);   // the experience that reaches level L
  function levelFor(xp) { let L = 1; while (L < CAREER.maxLevel && xp >= xpForLevel(L + 1)) L++; return L; }
  function runXp(r = game.run) {
    return game.hits + (r.perfects || 0) * 2 + (r.bosses || 0) * 25 + (r.fragments || []).length * 50 + (r.shots || []).length * 10
      + (r.targets || 0) * 3 + Math.floor(game.score / 5000) + (r.story ? 300 : 0);
  }
  // at the end of a run: the experience, any levels gained (and their bones), and the run for the log
  function careerAfterRun() {
    const r = game.run, xp = runXp(r), from = levelFor(profile.xp);
    profile.xp += xp; const to = levelFor(profile.xp);
    r.xp = xp; r.levelUp = null;
    if (to > from) {
      let bones = 0; for (let L = from + 1; L <= to; L++) bones += CAREER.bonesPer * L;
      addBones(bones); r.levelUp = { from, to, bones }; r.bossBones = (r.bossBones || 0);
      Telemetry.emit("level_up", { from, to });
      if (!sandbox) toast(`<b>${t("career.levelUp", { n: to })}</b> · +${fmtN(bones)} ${t("career.bones")}`);
    }
    streakAfterRun();
    profile.history = [{ mode: game.mode, map: game.map, stage: game.stage, score: game.score, hits: game.hits, won: !!r.story, xp, at: Date.now() }].concat(profile.history || []).slice(0, 10);
    return r.levelUp;
  }
  // the daily streak (v37): the first run of a day extends it (or starts it again after a day missed); it pays 20
  // bones a day of it, up to a week's worth
  function streakAfterRun(now = new Date()) {
    const today = dayKey(now), y = new Date(now); y.setDate(y.getDate() - 1);
    if (profile.streakLast === today) return 0;
    profile.streakDays = profile.streakLast === dayKey(y) ? profile.streakDays + 1 : 1; profile.streakLast = today;
    const pay = Math.round(20 * Math.min(7, profile.streakDays) * Math.max(1, Number(Flags.get("event.bones")) || 1));
    addBones(pay); game.run.streak = { days: profile.streakDays, bones: pay };
    if (!sandbox && profile.streakDays > 1) toast(`<b>${t("streak.toast", { n: profile.streakDays })}</b> · +${pay}`);
    return pay;
  }
