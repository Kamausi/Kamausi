  // ───────────────────────── the leaderboard ─────────────────────────
  // When the game is opened as a published page, everyone it's shared with sees one shared board: each
  // player's best run lives in their own document (leaderboard/<their id>), which only they can write.
  // Posting is opt-in, and only the name you put on your headstone is shown. Anywhere else (a downloaded
  // file, signed out) the board shows the best runs on this device instead.
  const BOARD_LOCAL = "skullToss.runs.v1";
  const cleanName = n => String(n || "").replace(/[\u0000-\u001f<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 16);
  const Board = {
    state: "local",          // local | loading | live | readonly | error
    db: null, me: null, rows: [], unsub: null, mine: null, tab: "live",
    local() { try { const v = JSON.parse(store.get(BOARD_LOCAL, "[]")); return Array.isArray(v) ? v.slice(0, 20) : []; } catch (e) { return []; } },
    saveLocal(list) { if (!sandbox) store.set(BOARD_LOCAL, JSON.stringify(list.slice(0, 20))); },
    init(db, me) {
      if (!db || !me || !me.id) return;
      this.db = db; this.me = me; this.state = "loading";
      this.db.doc("leaderboard/" + me.id).get().then(snap => { this.mine = snap.exists ? snap.data() : null; this.state = "live"; if (sheet === "board") renderBoard(); }, () => { this.state = "error"; });
    },
    // the entry is your best Story run played to its end in this game (profile.boardBest), never the profile's own
    // bests: those can arrive in a save code, so they stay on your profile and headstone and off the shared board
    entry() {
      const R = profile.boardBest || { score: 0, hits: 0, stage: 1 };
      return { name: cleanName(profile.name) || "Nameless soul", score: R.score, hits: R.hits, stage: R.stage,
        title: cos.title, look: { skull: cos.skull, eyes: cos.eyes, teeth: cos.teeth, paint: cos.paint, hat: cos.hat || "none" }, at: Date.now() };
    },
    // after every run: keep the device's top runs, and (if you've opted in) post a new best to the shared board
    post() {
      if ((sandbox && !this.fake) || !game.score) return;
      const list = this.local(); list.push({ name: cleanName(profile.name) || "You", score: game.score, hits: game.hits, stage: game.stage, at: Date.now(), look: { skull: cos.skull, eyes: cos.eyes, teeth: cos.teeth, paint: cos.paint, hat: cos.hat || "none" } });
      list.sort((a, b) => b.score - a.score); this.saveLocal(list);
      this.push();
    },
    // with a server (Firebase): the run goes to submitRun, which checks it and writes the board itself (v34)
    submit() {
      const R = profile.boardBest; if (!R || !profile.board || !Backend.hasFunctions()) return Promise.resolve(false);
      const run = { mode: "story", ...R, name: cleanName(profile.name) || "Nameless soul", title: cos.title, look: this.entry().look };
      return Backend.call("submitRun", { build: GAME_BUILD, run, log: Replay.last && Replay.last.mode === "story" ? Replay.encode(Replay.last) : "" }).then(r => { this.lastSubmit = r; return !!(r && r.accepted); },
        e => { this.lastSubmit = { accepted: false, why: e.message, code: e.code }; return false; });
    },
    push(force = false) {
      if (Flags.on("kill.board") || Flags.outdated()) return Promise.resolve(false);   // (03d_flags.js)
      if (Backend.hasFunctions()) return this.submit();   // (the server writes the board; the page can't)
      if (!this.db || !this.me || !profile.board || (sandbox && !this.fake)) return Promise.resolve(false);
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
        const u = this.db.collection("leaderboard").orderBy("score", "desc").limit(50).onSnapshot(snap => {
          this.rows = snap.docs.map(d => ({ id: d.id, ...(d.data() || {}) })).filter(r => Number.isFinite(+r.score) && +r.score > 0);
          if (this.state === "loading" || this.state === "error") this.state = "live";
          if (sheet === "board") renderBoard();
        }, () => { this.state = "error"; this.unsub = null; if (sheet === "board") renderBoard(); });
        if (this.unsub) this.unsub = u;
      } catch (e) { this.state = "error"; this.unsub = null; }
    },
    unwatch() { if (this.unsub) { try { this.unsub(); } catch (e) {} this.unsub = null; } if (this.unsubWeek) { try { this.unsubWeek(); } catch (e) {} this.unsubWeek = null; } },
    // this week's board (v34): the server keeps weekly/<week>_<uid> beside the all-time entry
    weekRows: [], unsubWeek: null,
    watchWeek() {
      if (!this.db || this.unsubWeek || typeof this.db.collection !== "function") return;
      this.unsubWeek = () => {};
      try {
        const u = this.db.collection("weekly").where("week", "==", Runs.weekOf(Date.now())).orderBy("score", "desc").limit(50).onSnapshot(snap => {
          this.weekRows = snap.docs.map(d => ({ id: (d.id || "").split("_").slice(1).join("_"), ...(d.data() || {}) })); if (sheet === "board") renderBoard(); }, () => { this.unsubWeek = null; });
        if (this.unsubWeek) this.unsubWeek = u;
      } catch (e) { this.unsubWeek = null; }
    }
  };
