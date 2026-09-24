  // ───────────────────────── telemetry, and play analytics with consent ─────────────────────────
  // Telemetry is the game's own log of what happened in play: runs starting and ending, throws, bosses, power-ups.
  // It lives in memory for this session (the last 500 events); read it from the console with SkullToss.telemetry().
  // Play analytics (v39) send a cut-down copy of it to the server, for diagnosis only (where players stop, what's
  // too hard, what goes unused), and only if the player says yes. The game asks once, after the first run, and
  // Settings → Share play data changes it any time. A browser's Global Privacy Control or Do Not Track counts as a
  // no without asking. What may be sent, field by field, is firebase/functions/shared/analytics.js: never a name,
  // never the save, never anything typed. Nothing is sent without a server, in a replay, or while the spec runs.
  const TELEMETRY_MAX = 500;
  const Telemetry = {
    started: Date.now(), events: [], errors: [],
    emit(name, data = {}) {   // t: milliseconds since the page opened
      const e = { name, t: Math.round(performance.now()), ...data };
      if (Replay.play) e.replay = true;   // (a replay's events are the recording's, not this player's)
      this.events.push(e);
      if (this.events.length > TELEMETRY_MAX) this.events.splice(0, this.events.length - TELEMETRY_MAX);
      firstFrom(name, data);
      PlayData.add(e);
    }
  };

  // ── the funnel: the first time each player does each thing (on the profile, so it's once per player, not per device)
  function firstTime(what) {
    if (Replay.play || !Analytics.FIRSTS.includes(what)) return false;
    const P = realProfile(); if (!Array.isArray(P.firsts)) P.firsts = [];
    if (P.firsts.includes(what)) return false;
    P.firsts.push(what);
    const e = { name: "first", t: Math.round(performance.now()), what, runs: P.games, mins: Math.round((Date.now() - PlayData.install().since) / 6000) / 10 };
    Telemetry.events.push(e); PlayData.add(e);
    return true;
  }
  // which play events are firsts
  function firstFrom(name, d) {
    if (name === "throw") { firstTime("throw"); firstTime(d.make ? "hit" : "miss"); }
    else if (name === "run_start" && realProfile().games > 0) firstTime("retry");
    else if (name === "target" || name === "powerup" || name === "story_complete") firstTime(name === "story_complete" ? "story" : name);
    else if (name === "codex" && /^hazard:/.test(d.key)) firstTime("hazard");
    else if (name === "boss_start") firstTime(d.tier === "end" ? "endboss" : "miniboss");
    else if (name === "boss_down") firstTime("bossdown");
    else if (name === "chal_claim") { firstTime("challenge"); firstTime("reward"); }
    else if (name === "mastery" || name === "level_up" || name === "secret") firstTime("reward");
    else if (name === "shop_buy" || name === "equip") firstTime("cosmetic");
    else if (name === "scene" && (d.map === 2 || d.map === 5)) firstTime("map" + d.map);
  }

  // ── what's sent, when, and only with consent
  const INSTALL_KEY = "skullToss.install.v1";
  const PlayData = {
    q: [], sent: 0, busy: null, runs: 0, errorsSent: 0, session: Math.random().toString(36).slice(2, 12), sessionAt: Date.now(), hiddenAt: 0, _install: null,
    // this browser's anonymous install (for sampling: the same install is always in or out)
    install() {
      if (this._install) return this._install;
      let v = null; try { v = JSON.parse(store.get(INSTALL_KEY, "null")); } catch (e) {}
      if (!v || typeof v.id !== "string") { v = { id: Math.random().toString(36).slice(2) + Date.now().toString(36), since: Date.now() }; if (!sandbox) store.set(INSTALL_KEY, JSON.stringify(v)); }
      return (this._install = v);
    },
    privacySignal: () => navigator.globalPrivacyControl === true || navigator.doNotTrack === "1" || window.doNotTrack === "1",
    // "ask" until answered; with a privacy signal, "no" unless the player turned it on themselves
    consent() { return settings.analytics === "yes" || settings.analytics === "no" ? settings.analytics : this.privacySignal() ? "no" : "ask"; },
    allowed() {
      return this.consent() === "yes" && !Flags.on("kill.analytics") && Analytics.sampled(this.install().id, Flags.get("analytics.sample"))
        && !(sandbox && !sandbox.analyticsOn) && !Replay.play;
    },
    add(e) {
      if (!this.allowed() || e.replay) return;
      const c = Analytics.clean(e); if (!c) return;
      GA.log(c);   // (Google Analytics gets the same cut-down event, below)
      this.q.push(c); if (this.q.length > 300) this.q.splice(0, this.q.length - 300);
      if (this.q.length >= 40 || e.name === "run_end") this.flush();
    },
    flush() {
      if (this.busy) return this.busy;   // (one batch in flight at a time)
      if (!this.allowed() || !this.q.length || !Backend.hasFunctions()) return Promise.resolve(false);
      const batch = this.q.splice(0, Analytics.MAX_BATCH);
      return (this.busy = Backend.call("logEvents", { session: this.session, build: GAME_BUILD, events: batch })
        .then(() => { this.sent += batch.length; return true; })
        .catch(e => { if (e && e.code === "resource-exhausted") this.q.unshift(...batch); return false; })   // (anything else was refused for good)
        .finally(() => { this.busy = null; }));
    },
    set(v) {
      settings.analytics = v; persist(); this.q = [];
      if (v !== "yes") GA.stop();
      if (v === "yes") {   // (this session so far goes too: the player has just agreed to share it)
        GA.start();
        const before = Telemetry.events.slice(-150); this.sessionStart(); for (const e of before) this.add(e);
        Telemetry.emit("consent", { v }); this.flush();
      }
      renderConsent(); if (sheet === "settings") renderSettings();
    },
    sessionStart() {
      Telemetry.emit("session_start", { build: GAME_BUILD, lang: LANG, standalone: !!(window.matchMedia && matchMedia("(display-mode: standalone)").matches), touch: "ontouchstart" in window,
        w: Math.round(innerWidth), h: Math.round(innerHeight), rm: reduceMotion, tier: QUALITY.level, returning: realProfile().games > 0 });
    },
    sessionEnd() { Telemetry.emit("session_end", { secs: Math.round((Date.now() - this.sessionAt) / 1000), runs: this.runs, screen: sheet || screen, in_run: screen === "play" && game.state !== "over" }); this.flush(); },
    // an uncaught error: kept here (SkullToss.errors()), and sent (five a session at most) with consent
    error(msg, src) {
      const e = { msg: String(msg || "error").slice(0, 200), src: String(src || "").replace(/^.*\//, "").slice(0, 60), at: Date.now() };
      Telemetry.errors.push(e); if (Telemetry.errors.length > 20) Telemetry.errors.shift();
      if (this.errorsSent++ < 5) Telemetry.emit("error", { msg: e.msg, src: e.src, build: GAME_BUILD });
    }
  };
  window.addEventListener("error", e => PlayData.error(e.message, e.filename ? `${e.filename}:${e.lineno}` : ""));
  window.addEventListener("unhandledrejection", e => PlayData.error(e.reason && (e.reason.message || e.reason), "promise"));
  // leaving the page ends the session (and sends what's queued); coming back after half an hour starts a new one
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { PlayData.hiddenAt = Date.now(); PlayData.sessionEnd(); }
    else if (PlayData.hiddenAt && Date.now() - PlayData.hiddenAt > 30 * 60e3) { Object.assign(PlayData, { session: Math.random().toString(36).slice(2, 12), sessionAt: Date.now(), runs: 0 }); PlayData.sessionStart(); }
  });
  setInterval(() => PlayData.flush(), 30000);
  // ── Google Analytics (v43): the Firebase console's daily players and retention. The same rule as everything above:
  // nothing until the player says yes. Only then is Google's SDK loaded at all (so nobody who hasn't agreed gets its
  // cookie), with advertising features off: no Google signals, no ad personalisation, ad storage denied. It gets
  // the same cut-down events (shared/analytics.js); Google counts sessions and returning players itself. Needs a
  // measurementId in src/firebase.config.json (the web app's config in the Firebase console).
  const GA_NAMES = { session_start: null, session_end: null, error: "game_error" };   // (Google's own names: it keeps sessions itself)
  let gaTest = null;   // (the spec's stand-in: { measurementId, sdk })
  const GA = {
    state: "off", sdk: null, pending: [],   // state: off | loading | on | failed
    config: () => (gaTest || (Backend.kind === "firebase" && Backend.app && Backend.cfg) || null),   // (the app is enough: no database or sign-in needed)
    configured() { const c = this.config(); return !!(c && c.measurementId); },
    wanted() { return this.configured() && PlayData.allowed(); },
    async start() {
      if (this.state === "loading" || this.state === "on" || !this.wanted()) return false;
      this.state = "loading";
      try {
        window.dataLayer = window.dataLayer || []; window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
        window.gtag("consent", "default", { analytics_storage: "granted", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
        window.gtag("set", { allow_google_signals: false, allow_ad_personalization_signals: false });
        if (gaTest) this.sdk = gaTest.sdk;
        else {
          if (!window.firebase || !window.firebase.analytics) await loadScript(FIREBASE_SDK + "firebase-analytics-compat.js");
          if (!(await window.firebase.analytics.isSupported())) { this.state = "failed"; return false; }   // (some app webviews can't)
          this.sdk = window.firebase.analytics();
        }
        this.sdk.setAnalyticsCollectionEnabled(true); this.state = "on";
        for (const c of this.pending.splice(0)) this.log(c);
        return true;
      } catch (e) { this.state = "failed"; return false; }
    },
    stop() { this.pending = []; if (this.sdk) try { this.sdk.setAnalyticsCollectionEnabled(false); } catch (e) {} if (this.state === "on") this.state = "off"; },
    log(c) {
      if (!this.wanted()) return;
      if (this.state !== "on") { if (this.state === "loading" && this.pending.length < 200) this.pending.push(c); return; }
      let name = c.name; if (Object.prototype.hasOwnProperty.call(GA_NAMES, name)) { name = GA_NAMES[name]; if (!name) return; }
      const params = {}; for (const [k, v] of Object.entries(c)) if (k !== "name" && k !== "t") params[k] = v;
      try { this.sdk.logEvent(name, params); } catch (e) {}
    }
  };
  // the question, asked once on the title after the first finished run (and only where there's somewhere to send to)
  const canShare = () => Backend.hasFunctions() || GA.configured();
  function renderConsent() {
    const c = $("consentCard"); if (!c) return;
    c.hidden = PlayData.consent() !== "ask" || !canShare() || realProfile().games < 1 || Replay.play || !!sandbox && !sandbox.analyticsOn;
  }
  $("consentYes").addEventListener("click", () => { PlayData.set("yes"); toast(t("consent.thanks")); Sound.ui("claim"); });
  $("consentNo").addEventListener("click", () => { PlayData.set("no"); Sound.ui("tick"); });
