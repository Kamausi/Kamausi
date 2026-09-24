  // ───────────────────────── play analytics: what may be sent (shared by the game and the server) ─────────────────────────
  // Analytics are for diagnosis: where players stop, what's too hard, what goes unused. They are sent only with the
  // player's consent (asked once, changed any time in Settings), and only these events, with only these fields,
  // each a number, a true/false or a short word. Nothing names the player: the server files a batch under the
  // anonymous sign-in and keeps it for 30 days; the daily counts it adds up carry no one's id at all.
  // The game filters with this list before anything leaves the device, and the server filters again on arrival.
  const Analytics = (() => {
    const EVENTS = {
      session_start: ["build", "lang", "standalone", "touch", "w", "h", "rm", "tier", "returning"],
      session_end:   ["secs", "runs", "screen", "in_run"],
      first:         ["what", "runs", "mins"],                           // the first time a player does each thing (the funnel)
      consent:       ["v"],
      run_start:     ["mode", "map", "stage", "career"],
      run_end:       ["mode", "map", "score", "hits", "stage", "phase", "tier", "secs", "throws", "misses", "perfects", "continues", "powerups", "bosses", "quit"],
      run_resume:    ["stage", "score", "cont"],
      boss_start:    ["kind", "stage", "tier"],
      boss_down:     ["kind", "stage", "flawless", "tries"],
      powerup:       ["id", "stage"],
      target:        ["kind", "stage"],
      continue_offer: ["stage", "cost", "pay", "ad", "n"],
      continue_take:  ["method", "cost", "stage"],
      continue_decline: ["why", "stage"],
      mode_end:      ["mode", "value", "best"],
      director_end:  ["week", "twist", "stars", "score"],
      story_complete: ["score", "secs"],
      fragment:      ["id", "fresh", "stage"],
      level_up:      ["from", "to"],
      mastery:       ["cat", "id", "tier"],
      secret:        ["id"],
      signature:     ["id", "stage"],
      replay_watch:  ["mode", "score"],
      shop_buy:      ["kind", "id", "price", "cur"],
      equip:         ["kind", "id"],
      chal_claim:    ["period", "kind"],
      sheet:         ["id"],
      error:         ["msg", "src", "build"]
    };
    const FIRSTS = ["launch", "throw", "hit", "miss", "retry", "target", "hazard", "powerup", "miniboss", "endboss", "bossdown", "reward", "cosmetic", "challenge", "save", "map2", "map5", "story"];
    const MAX_BATCH = 50, MAX_STR = 60, KEEP_DAYS = 30;
    const NAME = /^[a-z][a-z0-9_]{0,23}$/;
    // one event, cut down to what may be sent (or null)
    function clean(e) {
      if (!e || typeof e !== "object" || !Object.prototype.hasOwnProperty.call(EVENTS, e.name)) return null;
      const out = { name: e.name, t: Math.max(0, Math.floor(Number(e.t) || 0)) };
      for (const k of EVENTS[e.name]) {
        const v = e[k];
        if (typeof v === "number" && isFinite(v)) out[k] = Math.round(v * 1000) / 1000;
        else if (typeof v === "boolean") out[k] = v;
        else if (typeof v === "string" && v.length) out[k] = v.slice(0, MAX_STR);
      }
      return out;
    }
    const cleanBatch = list => (Array.isArray(list) ? list.slice(0, MAX_BATCH).map(clean).filter(Boolean) : []);
    // a stable yes/no for sampling: the same install is always in or always out
    const sampled = (id, rate) => { let h = 2166136261; const s = String(id); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296 < Math.max(0, Math.min(1, Number(rate))); };
    return { EVENTS, FIRSTS, MAX_BATCH, MAX_STR, KEEP_DAYS, NAME, clean, cleanBatch, sampled };
  })();
  if (typeof module !== "undefined" && module.exports) module.exports = Analytics;
