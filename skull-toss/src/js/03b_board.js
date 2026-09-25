  // ───────────────────────── the leaderboard ─────────────────────────
  // When the game is opened as a published page, everyone it's shared with sees one shared board: each
  // player's best run lives in their own document (leaderboard/<their id>), which only they can write.
  // Posting is opt-in, and only the name you put on your headstone is shown. Anywhere else (a downloaded
  // file, signed out) the board shows the best runs on this device instead.
  const BOARD_LOCAL = "skullToss.runs.v1";
  // v45: a board for every scored mode (the server keeps them in boards/<mode>_<uid>; the Adventure's stays in leaderboard/)
  const BOARD_MODES = ["story", "arcade", "rush", "curtain", "longshot", "gallery"];
  const cleanName = n => String(n || "").replace(/[\u0000-\u001f<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 16);
  const Board = {
    state: "local",          // local | loading | live | readonly | error
    db: null, me: null, rows: [], unsub: null, mine: null, tab: "live", period: "week", mode: "story", modeRows: {}, unsubMode: null, fakeLocal: null,
    local(mode = null) {   // (the device's runs, ten a mode; one from before v45 is an Adventure run)
      let v = []; try { v = this.fakeLocal || JSON.parse(store.get(BOARD_LOCAL, "[]")); } catch (e) { v = []; }
      v = Array.isArray(v) ? v : []; return mode ? v.filter(r => (r.mode || "story") === mode).slice(0, 10) : v;
    },
    saveLocal(list) { const keep = BOARD_MODES.flatMap(m => list.filter(r => (r.mode || "story") === m).sort((a, b) => b.score - a.score).slice(0, 10)); if (sandbox) this.fakeLocal = keep; else store.set(BOARD_LOCAL, JSON.stringify(keep)); },
    init(db, me) {
      if (!db || !me || !me.id) return;
      if (Backend.kind === "firebase" && !Backend.hasFunctions()) return;   // (on Firebase only the server's functions write the board: till they're up, it stays on the device)
      this.db = db; this.me = me; this.state = "loading";
      this.db.doc("leaderboard/" + me.id).get().then(snap => { this.mine = snap.exists ? snap.data() : null; this.state = "live"; if (sheet === "board") renderBoard(); }, () => { this.state = "error"; });
    },
    // the entry is your best Story run played to its end in this game (profile.boardBest), never the profile's own
    // bests: those can arrive in a save code, so they stay on your profile and headstone and off the shared board
    entry() {
      const R = profile.boardBest || { score: 0, hits: 0, stage: 1 };
      return { name: cleanName(profile.name) || "Nameless soul", score: R.score, hits: R.hits, stage: R.stage, title: cos.title, look: this.look(), ...this.card(), at: Date.now() };
    },
    look() { return { skull: cos.skull, eyes: cos.eyes, teeth: cos.teeth, paint: cos.paint, hat: cos.hat || "none", glasses: cos.glasses || "none", hair: cos.hair || "none", beard: cos.beard || "none" }; },
    // v45: what everyone else sees on your card when they tap your headstone (read-only to them)
    card() { return { bio: String(profile.bio || "").slice(0, 120), pic: profile.pic || null, rank: rankFor(profile.makes).name, level: levelFor(profile.xp), ach: profile.achievements.length }; },
    // after every run: keep the device's top runs, and (if you've opted in) post a new best to the shared board
    post() {
      if ((sandbox && !this.fake && !this.fakeLocal) || !game.score) return;
      const list = this.local(); list.push({ mode: game.mode, name: cleanName(profile.name) || "You", title: cos.title, ...this.card(), score: game.score, hits: game.hits, stage: game.stage, at: Date.now(), look: this.look() });
      list.sort((a, b) => b.score - a.score); this.saveLocal(list);
      this.push(false, game.mode);
    },
    // with a server (Firebase): the run goes to submitRun, which checks it and writes the board itself (v34); v45: any
    // scored mode's best goes to that mode's board
    submit(mode = "story") {
      const R = mode === "story" ? profile.boardBest : (profile.boardBests || {})[mode]; if (!R || !profile.board || !Backend.hasFunctions()) return Promise.resolve(false);
      const run = { mode, ...R, name: cleanName(profile.name) || "Nameless soul", title: cos.title, look: this.look(), ...this.card() };
      return Backend.call("submitRun", { build: GAME_BUILD, run, log: Replay.last && Replay.last.mode === mode ? Replay.encode(Replay.last) : "" }).then(r => { this.lastSubmit = r; return !!(r && r.accepted); },
        e => { this.lastSubmit = { accepted: false, why: e.message, code: e.code }; return false; });
    },
    push(force = false, mode = "story") {
      if (Flags.on("kill.board") || Flags.outdated()) return Promise.resolve(false);   // (03d_flags.js)
      if (Backend.hasFunctions()) return this.submit(mode);   // (the server writes the board; the page can't)
      if (mode !== "story" || !this.db || !this.me || !profile.board || (sandbox && !this.fake)) return Promise.resolve(false);
      const e = this.entry();
      if (!e.score || (!force && this.mine && this.mine.score >= e.score && this.mine.name === e.name)) return Promise.resolve(false);
      return this.db.doc("leaderboard/" + this.me.id).set(e).then(() => { this.mine = e; if (this.state === "readonly") this.state = "live"; return true; },
        err => { if (err && err.code === "invalid_argument") this.state = "readonly"; if (sheet === "board") renderBoard(); return false; });
    },
    remove() { if (this.db && this.me) return this.db.doc("leaderboard/" + this.me.id).delete().then(() => { this.mine = null; }, () => {}); return Promise.resolve(); },
    watch() {
      if (!this.db || this.unsub) return;
      this.unsub = () => {};   // (claimed before subscribing: a snapshot can arrive before onSnapshot returns)
      try {
        const u = this.db.collection("leaderboard").orderBy("score", "desc").limit(100).onSnapshot(snap => {
          this.rows = snap.docs.map(d => ({ id: d.id, ...(d.data() || {}) })).filter(r => Number.isFinite(+r.score) && +r.score > 0);
          if (this.state === "loading" || this.state === "error") this.state = "live";
          if (sheet === "board") renderBoard();
        }, () => { this.state = "error"; this.unsub = null; if (sheet === "board") renderBoard(); });
        if (this.unsub) this.unsub = u;
      } catch (e) { this.state = "error"; this.unsub = null; }
    },
    // v45: another mode's board (boards/, the mode's own top fifty)
    watchMode(mode) {
      if (!this.db || typeof this.db.collection !== "function") return;
      if (this.unsubMode && this.unsubMode.mode === mode) return;
      if (this.unsubMode) { try { this.unsubMode(); } catch (e) {} this.unsubMode = null; }
      const holder = () => {}; holder.mode = mode; this.unsubMode = holder;
      try {
        const u = this.db.collection("boards").where("mode", "==", mode).orderBy("score", "desc").limit(100).onSnapshot(snap => {
          this.modeRows[mode] = snap.docs.map(d => ({ id: (d.data() || {}).uid || (d.id || "").split("_").slice(1).join("_"), ...(d.data() || {}) })).filter(r => Number.isFinite(+r.score) && +r.score > 0);
          if (sheet === "board") renderBoard(); }, () => { this.unsubMode = null; });
        if (this.unsubMode === holder) { u.mode = mode; this.unsubMode = u; }
      } catch (e) { this.unsubMode = null; }
    },
    unwatch() { if (this.unsub) { try { this.unsub(); } catch (e) {} this.unsub = null; } if (this.unsubWeek) { try { this.unsubWeek(); } catch (e) {} this.unsubWeek = null; } if (this.unsubMode) { try { this.unsubMode(); } catch (e) {} this.unsubMode = null; } },
    // this week's board (v34): the server keeps weekly/<week>_<uid> beside the all-time entry. v50: and the day's
    // (daily/<day>_<uid>) and the month's (monthly/<month>_<uid>); one watched at a time
    weekRows: [], unsubWeek: null,
    watchWeek() {
      const P = { day: ["daily", "day", Runs.dayOf], week: ["weekly", "week", Runs.weekOf], month: ["monthly", "month", Runs.monthOf] }[this.period] || null;
      if (!P || !this.db || typeof this.db.collection !== "function") return;
      if (this.unsubWeek && this.unsubWeek.period === this.period) return;
      if (this.unsubWeek) { try { this.unsubWeek(); } catch (e) {} this.unsubWeek = null; }
      const holder = () => {}; holder.period = this.period; this.unsubWeek = holder; this.weekRows = [];
      try {
        const u = this.db.collection(P[0]).where(P[1], "==", P[2](Date.now())).orderBy("score", "desc").limit(100).onSnapshot(snap => {
          this.weekRows = snap.docs.map(d => ({ id: (d.id || "").split("_").slice(1).join("_"), ...(d.data() || {}) })); if (sheet === "board") renderBoard(); }, () => { this.unsubWeek = null; });
        if (this.unsubWeek === holder) { u.period = holder.period; this.unsubWeek = u; }
      } catch (e) { this.unsubWeek = null; }
    }
  };

  // ── v45: who's about. Each signed-in player keeps presence/<uid> holding the server's clock at their last visit
  // (a write every two minutes while the game is open and in view); the board counts the ones seen in the last five.
  const Presence = {
    db: null, me: null, timer: 0, count: null, at: 0,
    start(db, me) {
      if (!db || !me || !me.id || typeof db.doc !== "function" || !window.firebase || !window.firebase.firestore) return;
      this.db = db; this.me = me; this.beat();
      clearInterval(this.timer); this.timer = setInterval(() => this.beat(), 120000);
      document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") this.beat(); });
    },
    beat() {
      if (!this.db || document.visibilityState === "hidden" || Flags.on("kill.presence")) return;
      try { this.db.doc("presence/" + this.me.id).set({ at: window.firebase.firestore.FieldValue.serverTimestamp() }).catch(() => {}); } catch (e) {}
    },
    refresh() {
      if (!this.db || Date.now() - this.at < 30000) return;
      this.at = Date.now();
      try {
        const since = window.firebase.firestore.Timestamp.fromMillis(Date.now() - 5 * 60000);
        this.db.collection("presence").where("at", ">", since).limit(999).get().then(snap => { this.count = snap.size; if (sheet === "board") renderBoard(); }, () => {});
      } catch (e) {}
    }
  };
