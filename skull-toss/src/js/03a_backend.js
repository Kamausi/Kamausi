  // ───────────────────────── the backend: Firebase, the claude.ai host, or none ─────────────────────────
  // Where the game's server lives. With a Firebase project configured (src/firebase.config.json, see
  // firebase/README.md) the game loads the Firebase SDK, signs the player in anonymously, keeps the cloud save and
  // the leaderboard in Firestore, and calls Cloud Functions for everything that's worth something (Souls, the
  // checked leaderboard). Published as a claude.ai page it uses that host's database for saves and the board, with no
  // functions (so no Souls). Anywhere else there's no server and everything stays in this browser. The dev build can
  // stand the server's own handlers up in the page (useFake) so the spec can drive them.
  const FIREBASE_SDK = "https://www.gstatic.com/firebasejs/10.12.2/";
  const Backend = {
    kind: "none",     // none | host | firebase | fake
    app: null, db: null, me: null, call: null, ready: null, error: null, fakeDocs: null,
    init() {
      if (!this.ready) this.ready = (async () => {
        if (FIREBASE_CONFIG) return this.useFirebase(FIREBASE_CONFIG);
        const host = window.claude; if (host && typeof host.use === "function") return this.useHost(host);
        return this;
      })().catch(e => { this.error = String(e && e.message || e); this.kind = "none"; return this; });
      return this.ready;
    },
    hasFunctions() { return typeof this.call === "function"; },
    async useHost(host) {
      const [user, db] = await Promise.all([host.use("user"), host.use("db")]);
      const me = user ? await user.me() : null;
      if (db && me && me.id) Object.assign(this, { kind: "host", db, me });
      return this;
    },
    // The project's parts come up one at a time: config.services says which exist yet ({ firestore, functions }, both
    // on unless set false). A part that isn't there is treated as absent, the way a game with no server treats it:
    // saves stay on the device, the board is local, the Soul Shop waits. Sign-in can fail too (Anonymous not switched
    // on yet): the app still starts, so Google Analytics works whatever else doesn't.
    async useFirebase(cfg) {
      const svc = { firestore: true, functions: true, ...(cfg.services || {}) }, { services: _services, functionsRegion, ...options } = cfg;   // (options: what Firebase itself takes)
      const need = [["app", "firebase-app-compat.js"], ["auth", "firebase-auth-compat.js"], ...(svc.firestore ? [["firestore", "firebase-firestore-compat.js"]] : []), ...(svc.functions ? [["functions", "firebase-functions-compat.js"]] : [])];
      for (const [part, file] of need) if (!(window.firebase && (part === "app" || window.firebase[part]))) await loadScript(FIREBASE_SDK + file);
      const fb = window.firebase, app = fb.apps.length ? fb.app() : fb.initializeApp(options);
      Object.assign(this, { kind: "firebase", app, cfg });
      let user = null;
      try { const auth = app.auth(); user = auth.currentUser || (await auth.signInAnonymously()).user; } catch (e) { this.error = "sign-in: " + String((e && e.message) || e); }
      const fns = user && svc.functions ? app.functions(functionsRegion || "us-central1") : null;
      Object.assign(this, { db: user && svc.firestore ? app.firestore() : null, me: user ? { id: user.uid, name: user.displayName || "" } : null,
        call: fns ? (name, data) => fns.httpsCallable(name)(data || {}).then(r => r.data) : null });
      return this;
    },
    // the dev build's stand-in: the server's real handlers (firebase/functions/handlers.js) over an in-memory store,
    // with a receipt check that takes "OK:<id>"
    useFake(uid = "tester") {
      const docs = this.fakeDocs = new Map(), copy = o => JSON.parse(JSON.stringify(o));
      const db = { tx: async fn => { const staged = []; const out = await fn({ get: async p => (docs.has(p) ? copy(docs.get(p)) : null), set: (p, o) => staged.push([p, o]) }); for (const [p, o] of staged) docs.set(p, copy(o)); return out; } };
      const H = this.fakeH = makeHandlers(Economy, async ({ receipt, product }) => ({ valid: /^OK:/.test(receipt), product, id: receipt.slice(3) }), Runs, Analytics);
      Object.assign(this, { kind: "fake", db: null, me: { id: uid, name: "" }, ready: Promise.resolve(this), fakeDB: db.tx,
        call: async (name, data) => { if (!H[name]) throw Object.assign(new Error("not-found"), { code: "not-found" }); return H[name]({ db, uid: this.me.id, data: copy(data || {}), now: Date.now() + (this.fakeClock || 0) }); } });
      return this;
    },
    reset() { Object.assign(this, { kind: "none", app: null, cfg: null, db: null, me: null, call: null, ready: null, error: null, fakeDocs: null, fakeH: null, fakeDB: null }); }
  };
  function loadScript(src) {
    return new Promise((ok, fail) => { const s = document.createElement("script"); s.src = src; s.async = true; s.onload = ok; s.onerror = () => fail(new Error("couldn't load " + src)); document.head.appendChild(s); });
  }
