  // ───────────────────────── remote config and feature flags ─────────────────────────
  // Values the live game can be steered by without a new build: which challenge kinds are in the rotation and how
  // well they pay, how often the print misbehaves, a banner for an event, and a kill switch for anything that has to
  // be turned off in a hurry (the Soul Shop, the board, sharing replays). The defaults are here; a Firebase project
  // overrides them from its config/live document (edited in the console, read by everyone), and the last values seen
  // are kept in this browser so an offline game still follows them.
  const FLAG_DEFAULTS = {
    "challenges.off": [], "challenges.bonus": 1, "mischief.chance": 0.07, "event.banner": "", "event.bones": 1,
    "kill.souls": false, "kill.board": false, "kill.replays": false, "season.id": "", "analytics.sample": 1
  };
  const FLAGS_KEY = "skullToss.flags.v1";
  const Flags = {
    values: { ...FLAG_DEFAULTS }, source: "defaults", unsub: null,
    load() { try { const v = JSON.parse(store.get(FLAGS_KEY, "null")); if (v && typeof v === "object") { this.merge(v); this.source = "cache"; } } catch (e) {} },
    merge(v) { for (const k of Object.keys(FLAG_DEFAULTS)) if (v[k] !== undefined && typeof v[k] === typeof FLAG_DEFAULTS[k]) this.values[k] = v[k]; },
    get(k) { return this.values[k] !== undefined ? this.values[k] : FLAG_DEFAULTS[k]; },
    on(k) { return !!this.get(k); },
    // live values from the server (Firebase only: config/live), cached for next time
    watch() {
      if (Backend.kind !== "firebase" || this.unsub) return;
      this.unsub = Backend.db.doc("config/live").onSnapshot(s => { if (!s.exists) return; this.values = { ...FLAG_DEFAULTS }; this.merge(s.data() || {}); this.source = "live";
        if (!sandbox) store.set(FLAGS_KEY, JSON.stringify(this.values)); Flags.changed(); }, () => {});
    },
    set(v) { this.values = { ...FLAG_DEFAULTS }; this.merge(v || {}); this.source = "set"; this.changed(); },   // (the spec, and the console's preview)
    changed() { if (sheet === "challenges") renderSheet("challenges"); renderEventBanner(); }
  };
  function renderEventBanner() { const b = $("eventBanner"); if (!b) return; const txt = Flags.get("event.banner"); b.hidden = !txt; b.textContent = txt; }
