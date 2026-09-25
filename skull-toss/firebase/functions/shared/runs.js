  // ───────────────────────── checking a run before it goes on the board (shared by the game and the server) ─────────────────────────
  // The leaderboard takes finished Story runs, checked by the server. A run arrives as numbers; these rules decide
  // whether those numbers could have come from the game. The score has a ceiling set by what the run says it did
  // (every make at the richest combo, stage and power-ups; every boss, target and signature shot at its most), and
  // the other numbers must agree with each other and with the clock. A run that used a continue never posts. The
  // ceilings are generous on purpose: an honest run is never refused, and a forged one needs to be modest to pass
  // (the run's input log, kept with it, is there for anything that looks too good).
  const Runs = (() => {
    const L = {
      maps: 8, perfectPts: 250, comboMax: 6, stageMultMax: 1 + 0.25 * 7, powerMax: 9,          // a make: 250 × 6 × 2.75 × 9
      miniBonus: 2500 * 1.5, endBonus: 15000, targetPts: 200, shotPts: 150 * 39,              // per boss, target, signature shot (every shot at once, at its rarest)
      encoreMakes: 60, minSecsPerThrow: 0.75, maxSecs: 6 * 3600, maxThrows: 6000, minNameLen: 0, maxNameLen: 16
    };
    const int = v => (Number.isFinite(Number(v)) ? Math.floor(Number(v)) : NaN);
    // the numbers a run brings, cleaned (anything missing counts as zero)
    function clean(r) {
      const o = {}; r = r && typeof r === "object" ? r : {};
      for (const k of ["score", "hits", "stage", "throws", "secs", "perfects", "bosses", "targets", "shots", "continues", "fragments"]) o[k] = int(r[k] == null ? 0 : r[k]);
      o.mode = String(r.mode || "story"); o.name = cleanName(r.name); o.title = String(r.title || "").slice(0, 24);
      o.look = r.look && typeof r.look === "object" ? Object.fromEntries(Object.entries(r.look).filter(([k, v]) => /^[a-z]{2,10}$/.test(k) && typeof v === "string" && v.length < 24)) : {};
      // v45: what the board's profile card shows (read-only to everyone else): the headstone's bio and picture, rank and level
      o.bio = String(r.bio || "").replace(/[\u0000-\u001f<>]/g, "").slice(0, 120);
      o.pic = r.pic && typeof r.pic === "object" && typeof r.pic.face === "string" && typeof r.pic.frame === "string" ? { face: r.pic.face.slice(0, 12), frame: r.pic.frame.slice(0, 12) } : null;
      o.rank = String(r.rank || "").replace(/[\u0000-\u001f<>]/g, "").slice(0, 32);
      o.level = Math.max(1, Math.min(99, int(r.level) || 1)); o.ach = Math.max(0, Math.min(999, int(r.ach) || 0));
      return o;
    }
    // v45: the boards: the Adventure's (leaderboard/, and the week's), and one for each scored mode (boards/<mode>_<uid>)
    const MODES = ["story", "arcade", "rush", "curtain", "longshot", "gallery"];
    function cleanName(n) { return String(n || "").replace(/[\u0000-\u001f<>]/g, "").replace(/\s+/g, " ").trim().slice(0, L.maxNameLen) || "Nameless soul"; }
    const ceiling = r => {
      const perMake = L.perfectPts * L.comboMax * L.stageMultMax * L.powerMax, makes = r.hits;
      return makes * perMake + r.bosses * (L.endBonus * L.stageMultMax) + r.targets * L.targetPts * L.stageMultMax + r.shots * L.shotPts * L.stageMultMax;
    };
    // { ok } or { ok: false, why }
    function check(raw) {
      const r = clean(raw), bad = why => ({ ok: false, why });
      for (const k of ["score", "hits", "stage", "throws", "secs", "perfects", "bosses", "targets", "shots", "continues", "fragments"]) if (!Number.isFinite(r[k]) || r[k] < 0) return bad("not-a-number:" + k);
      if (!MODES.includes(r.mode)) return bad("no-such-board");
      if (r.mode !== "story" && r.fragments > 0) return bad("fragments");   // (only the Adventure wins shards)
      if (r.continues > 0) return bad("continued");
      if (r.throws < 1 || r.throws > L.maxThrows) return bad("throws");
      if (r.hits > r.throws + L.encoreMakes) return bad("more-hits-than-throws");   // (encore makes are throws too; the margin is for rounding in old saves)
      if (r.perfects > r.hits) return bad("more-perfects-than-hits");
      if (r.stage < 1 || r.stage > L.maps + 1) return bad("stage");
      if (r.bosses > 2 * Math.min(r.stage, L.maps)) return bad("bosses");
      if (r.fragments > Math.min(r.stage, L.maps)) return bad("fragments");
      if (r.secs < r.throws * L.minSecsPerThrow || r.secs > L.maxSecs) return bad("clock");
      if (r.score % 5 !== 0) return bad("score-steps");
      if (r.score > ceiling(r)) return bad("score-ceiling");
      return { ok: true, run: r };
    }
    // the week a time falls in (ISO: weeks start on Monday), for the weekly board
    function weekOf(ms) {
      const d = new Date(ms), day = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - day + 3);
      const y = d.getUTCFullYear(), jan4 = new Date(Date.UTC(y, 0, 4)), wk = 1 + Math.round(((d - jan4) / 864e5 - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7);
      return `${y}-W${String(wk).padStart(2, "0")}`;
    }
    // v50: the day's and the month's boards (UTC)
    const dayOf = ms => new Date(ms).toISOString().slice(0, 10), monthOf = ms => new Date(ms).toISOString().slice(0, 7);
    return { LIMITS: L, MODES, clean, cleanName, check, ceiling, weekOf, dayOf, monthOf };
  })();
  if (typeof module !== "undefined" && module.exports) module.exports = Runs;
