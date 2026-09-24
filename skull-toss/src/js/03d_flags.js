  // ───────────────────────── remote config and feature flags ─────────────────────────
  // Values the live game can be steered by without a new build: which challenge kinds are in the rotation and how
  // well they pay, how often the print misbehaves, a banner for an event, and a kill switch for anything that has to
  // be turned off in a hurry (the Soul Shop, the board, sharing replays). The defaults are here; a Firebase project
  // overrides them from its config/live document (edited in the console, read by everyone), and the last values seen
  // are kept in this browser so an offline game still follows them.
  // v39 adds the live-ops safety net: an event can be scheduled ahead (event.from / event.until, ISO times: its
  // banner and bonuses run only inside the window), a mode can be taken off the Play sheet (modes.off), a maintenance
  // line can be shown, analytics can be stopped (kill.analytics), and a build older than build.min is asked to reload
  // (the server refuses its Soul and board writes too).
  const FLAG_DEFAULTS = {
    "challenges.off": [], "challenges.bonus": 1, "mischief.chance": 0.07, "event.banner": "", "event.bones": 1, "event.from": "", "event.until": "",
    "kill.souls": false, "kill.board": false, "kill.replays": false, "kill.analytics": false, "kill.ads": false, "modes.off": [], "maintenance": "", "build.min": 0,
    "season.id": "", "analytics.sample": 1
  };
  const EVENT_FLAGS = ["event.banner", "event.bones", "challenges.bonus"];   // (these follow the event's window)
  const FLAGS_KEY = "skullToss.flags.v1";
  const Flags = {
    values: { ...FLAG_DEFAULTS }, source: "defaults", unsub: null,
    load() { try { const v = JSON.parse(store.get(FLAGS_KEY, "null")); if (v && typeof v === "object") { this.merge(v); this.source = "cache"; } } catch (e) {} },
    merge(v) { for (const k of Object.keys(FLAG_DEFAULTS)) if (v[k] !== undefined && typeof v[k] === typeof FLAG_DEFAULTS[k]) this.values[k] = v[k]; },
    get(k, now = Date.now()) { if (EVENT_FLAGS.includes(k) && !this.eventLive(now)) return FLAG_DEFAULTS[k]; return this.values[k] !== undefined ? this.values[k] : FLAG_DEFAULTS[k]; },
    // is the scheduled event on? (no window set: always)
    eventLive(now = Date.now()) {
      const from = Date.parse(this.values["event.from"] || ""), until = Date.parse(this.values["event.until"] || "");
      return !(from && now < from) && !(until && now >= until);
    },
    outdated: () => GAME_BUILD < (Number(Flags.values["build.min"]) || 0),
    modeOff: m => m !== "story" && Flags.get("modes.off").includes(m),
    on(k) { return !!this.get(k); },
    // live values from the server (Firebase only: config/live), cached for next time
    watch() {
      if (Backend.kind !== "firebase" || this.unsub) return;
      this.unsub = Backend.db.doc("config/live").onSnapshot(s => { if (!s.exists) return; this.values = { ...FLAG_DEFAULTS }; this.merge(s.data() || {}); this.source = "live";
        if (!sandbox) store.set(FLAGS_KEY, JSON.stringify(this.values)); Flags.changed(); }, () => {});
    },
    set(v) { this.values = { ...FLAG_DEFAULTS }; this.merge(v || {}); this.source = "set"; this.changed(); },   // (the spec, and the console's preview)
    changed() { if (sheet === "challenges" || sheet === "play") renderSheet(sheet); renderEventBanner(); }
  };
  // the line under the title: a reload request beats maintenance, which beats the event
  function renderEventBanner() {
    const b = $("eventBanner"); if (!b) return;
    const txt = Flags.outdated() ? t("live.update") : Flags.get("maintenance") || Flags.get("event.banner");
    b.hidden = !txt; b.textContent = txt; b.classList.toggle("warn", Flags.outdated() || !!Flags.get("maintenance"));
  }
  setInterval(renderEventBanner, 60000);   // (a scheduled event starts and ends on its own)
