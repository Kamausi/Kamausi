  // ───────────────────────── cloud save ─────────────────────────
  // When the game is opened as a published page while signed in, progress is kept in a private
  // per-player document (data/users/<id>/save) and merged with this device's copy. Anywhere else
  // (a downloaded file, no sign-in) everything simply stays in this browser.
  const Cloud = {
    state: "off",      // off | connecting | ok | busy | error
    ref: null, me: null, writing: false, dirty: false, timer: 0, lastSync: 0,
    async init() {   // the backend decides where the save lives: Firebase, the claude.ai host, or nowhere (03a_backend.js)
      const host = window.claude;
      if (!FIREBASE_CONFIG && (!host || typeof host.use !== "function")) { this.state = "off"; renderSave(); return; }
      this.state = "connecting"; renderSave();
      try {
        const B = await Backend.init();
        Souls.connect(); Flags.watch();   // (Souls need the server's functions: 09m_souls.js; live flags: 03d_flags.js)
        if (!B.db || !B.me) { this.state = "off"; renderSave(); return; }
        this.me = B.me; this.ref = B.db.doc("data/users/" + B.me.id + "/save");
        Board.init(B.db, B.me);
        await this.pull();
      } catch (e) { this.state = "error"; renderSave(); }
    },
    async pull() {
      if (!this.ref || sandbox) return;
      this.state = "busy"; renderSave();
      try {
        const snap = await this.ref.get();
        if (snap.exists) {
          const d = snap.data() || {};
          if (d.profile) { if (modeSt.real) modeSt.real = mergeProfiles(modeSt.real, d.profile); else profile = mergeProfiles(profile, d.profile); }
          if (d.cos && (Number(d.cos.updatedAt) || 0) > (cos.updatedAt || 0)) cos = cleanCos(d.cos);
          ensureDaily(); applyCosmetics(); updateHud(); if (sheet) renderSheet(sheet);
          const p = JSON.stringify(realProfile()); store.set(KEYS.profile, p); store.set(KEYS.cos, JSON.stringify(cos)); store.set(KEYS.best, realProfile().best);
        }
        this.state = "ok"; this.lastSync = Date.now(); renderSave();
        await this.push();
      } catch (e) { this.state = "error"; renderSave(); }
    },
    schedule(delay) {
      if (!this.ref || sandbox) return;
      clearTimeout(this.timer); this.timer = setTimeout(() => this.push(), delay);
    },
    async push() {
      if (!this.ref || sandbox) return;
      if (this.writing) { this.dirty = true; return; }
      this.writing = true; this.state = "busy"; renderSave();
      try {
        await this.ref.set({ v: 1, profile: JSON.parse(JSON.stringify(realProfile())), cos: { ...cos }, savedAt: Date.now() });
        this.state = "ok"; this.lastSync = Date.now();
      } catch (e) {
        this.state = "error";
        if (e && e.code === "unavailable") setTimeout(() => this.schedule(0), 1500 + Math.random() * 1500);
      }
      this.writing = false; renderSave();
      if (this.dirty) { this.dirty = false; this.schedule(1500); }
    }
  };
