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
    db: null, me: null, call: null, ready: null, error: null, fakeDocs: null,
    init() {
      if (!this.ready) this.ready = (async () => {
        if (FIREBASE_CONFIG) return this.useFirebase();
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
    async useFirebase() {
      for (const f of ["firebase-app-compat.js", "firebase-auth-compat.js", "firebase-firestore-compat.js", "firebase-functions-compat.js"]) await loadScript(FIREBASE_SDK + f);
      const fb = window.firebase, app = fb.apps.length ? fb.app() : fb.initializeApp(FIREBASE_CONFIG), auth = app.auth();
      const user = auth.currentUser || (await auth.signInAnonymously()).user;
      const fns = app.functions(FIREBASE_CONFIG.functionsRegion || "us-central1");
      Object.assign(this, { kind: "firebase", db: app.firestore(), me: { id: user.uid, name: user.displayName || "" },
        call: (name, data) => fns.httpsCallable(name)(data || {}).then(r => r.data) });
      return this;
    },
    // the dev build's stand-in: the server's real handlers (firebase/functions/handlers.js) over an in-memory store,
    // with a receipt check that takes "OK:<id>"
    useFake(uid = "tester") {
      const docs = this.fakeDocs = new Map(), copy = o => JSON.parse(JSON.stringify(o));
      const db = { tx: async fn => { const staged = []; const out = await fn({ get: async p => (docs.has(p) ? copy(docs.get(p)) : null), set: (p, o) => staged.push([p, o]) }); for (const [p, o] of staged) docs.set(p, copy(o)); return out; } };
      const H = makeHandlers(Economy, async ({ receipt, product }) => ({ valid: /^OK:/.test(receipt), product, id: receipt.slice(3) }));
      Object.assign(this, { kind: "fake", db: null, me: { id: uid, name: "" }, ready: Promise.resolve(this),
        call: async (name, data) => { if (!H[name]) throw Object.assign(new Error("not-found"), { code: "not-found" }); return H[name]({ db, uid: this.me.id, data: copy(data || {}), now: Date.now() }); } });
      return this;
    },
    reset() { Object.assign(this, { kind: "none", db: null, me: null, call: null, ready: null, error: null, fakeDocs: null }); }
  };
  function loadScript(src) {
    return new Promise((ok, fail) => { const s = document.createElement("script"); s.src = src; s.async = true; s.onload = ok; s.onerror = () => fail(new Error("couldn't load " + src)); document.head.appendChild(s); });
  }
