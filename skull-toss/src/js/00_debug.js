  // ───────────────────────── structured warnings (v51) ─────────────────────────
  // Where the game shrugs off a failure it can live without (a browser that won't give a feature, a store that says
  // no), it says so here by category instead of swallowing it silently. The dev build and ?debug print them; a
  // published build only keeps the last fifty in memory, for SkullToss.warnings() and the play-data error report.
  const DEBUG_CATS = ["AUDIO", "SAVE", "CLOUD", "AUTH", "LEADERBOARD", "INPUT", "RENDER", "PLATFORM", "ECONOMY", "GAMEPLAY", "STATE"];
  const Debug = {
    log: [], loud: /[?&](debug|test)\b/.test(location.search),
    warn(cat, err, context = "") { return this.note("warn", cat, err, context); },
    error(cat, err, context = "") { return this.note("error", cat, err, context); },
    note(level, cat, err, context) {
      const e = { level, cat: DEBUG_CATS.includes(cat) ? cat : "GAMEPLAY", msg: String((err && err.message) || err || "").slice(0, 200), context: String(context).slice(0, 80), at: Date.now() };
      this.log.push(e); if (this.log.length > 50) this.log.shift();
      if (this.loud && typeof console !== "undefined") (level === "error" ? console.error : console.warn)(`[${e.cat}] ${e.context}: ${e.msg}`);
      return e;
    }
  };
