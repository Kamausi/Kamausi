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
        Souls.connect(); Flags.watch(); renderConsent(); PlayData.flush(); GA.start();   // (Souls need the server's functions: 09m_souls.js; live flags: 03d_flags.js; play data: 04g_telemetry.js)
        if (!B.db || !B.me) { this.state = "off"; renderSave(); return; }
        this.me = B.me; this.ref = B.db.doc("data/users/" + B.me.id + "/save");
        Board.init(B.db, B.me); Presence.start(B.db, B.me);   // (v45: the players-online count on the board)
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

  // ───────────────────────── v49: sign in with Google ─────────────────────────
  // Every player starts signed in anonymously (03a_backend.js), so a save follows them only on this browser. Signing in
  // with Google links that anonymous account to their Google account: the same id, the same cloud save, now reachable
  // from any device they sign in on. If their Google account already has a save (they signed in on another device
  // first), the game switches to that account, merges this device's progress into it, and reloads so everything
  // (the save, the board, the Souls wallet) is that account's. Signing out goes back to a fresh anonymous account;
  // this device keeps its copy. Needs the Google provider switched on in the Firebase console
  // (Authentication → Sign-in method → Google) and the site's domain in its authorised domains.
  const Account = {
    busy: false, error: "",
    auth() { return Backend.kind === "firebase" && Backend.app && Backend.app.auth ? Backend.app.auth() : null; },
    available() { return !!this.auth(); },
    google() { const a = this.auth(), u = a && a.currentUser; return u && !u.isAnonymous && (u.providerData || []).some(p => p.providerId === "google.com") ? u : null; },
    async signIn() {
      const auth = this.auth(); if (!auth || this.busy) return;
      const fb = window.firebase, provider = new fb.auth.GoogleAuthProvider(); provider.setCustomParameters({ prompt: "select_account" });
      this.busy = true; this.error = ""; renderAccount();
      try {
        const u = auth.currentUser;
        if (u && u.isAnonymous) {
          try { await u.linkWithPopup(provider); }   // same id: nothing moves, the save simply gains a way back in
          catch (e) {
            if (e && e.code === "auth/credential-already-in-use" && e.credential) { await Cloud.push(); await auth.signInWithCredential(e.credential); await this.adopt(); return; }
            throw e;
          }
        } else await auth.signInWithPopup(provider);
        if (auth.currentUser) await auth.currentUser.reload().catch(() => {});
        const g = this.google(); if (g && Cloud.me) { Cloud.me.name = g.displayName || g.email || ""; Cloud.me.avatarUrl = g.photoURL || ""; }
        if (g && !profile.name && g.displayName) { profile.name = g.displayName.split(" ")[0].slice(0, 16); persist(); }
        toast(`<b>Signed in with Google</b> · your progress now follows you`); Sound.ui("claim"); Telemetry.emit("account", { how: "google" });
      } catch (e) {
        const code = (e && e.code) || "";
        this.error = code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request" ? "" : code === "auth/operation-not-allowed" ? t("acct.notEnabled") : code === "auth/unauthorized-domain" ? t("acct.domain") : code === "auth/popup-blocked" ? t("acct.popup") : t("acct.failed");
      }
      this.busy = false; renderAccount(); renderSave();
    },
    // the Google account already had a save: this device's progress goes into it, then a clean start as that account
    async adopt() {
      const auth = this.auth(), u = auth.currentUser;
      try {
        const ref = Backend.db.doc("data/users/" + u.uid + "/save"), snap = await ref.get(), d = snap.exists ? snap.data() || {} : {};
        const merged = d.profile ? mergeProfiles(realProfile(), d.profile) : realProfile();
        await ref.set({ v: 1, profile: JSON.parse(JSON.stringify(merged)), cos: { ...(d.cos && (Number(d.cos.updatedAt) || 0) > (cos.updatedAt || 0) ? d.cos : cos) }, savedAt: Date.now() });
        store.set(KEYS.profile, JSON.stringify(merged));
      } catch (e) { /* the reload still signs in as them; the next sync merges */ }
      toast(`<b>Welcome back</b> · loading your account`); setTimeout(() => location.reload(), 900);
    },
    async signOut() {
      const auth = this.auth(); if (!auth || this.busy) return;
      this.busy = true; renderAccount();
      try { await Cloud.push(); await auth.signOut(); await auth.signInAnonymously(); } catch (e) { /* the reload sorts it out */ }
      setTimeout(() => location.reload(), 300);
    }
  };
  function renderAccount() {
    const g = Account.google(), ok = Account.available();
    for (const btn of document.querySelectorAll(".google-btn")) {
      btn.disabled = Account.busy || (!ok && Cloud.state !== "connecting");
      const lbl = btn.querySelector(".g-lbl"); if (lbl) lbl.textContent = Account.busy ? t("acct.wait") : g ? t("acct.signOut") : t("acct.signIn");
      btn.classList.toggle("out", !!g);
    }
    const note = $("accountNote");
    if (note) note.textContent = Account.error || (g ? t("acct.as", { who: g.email || g.displayName || "Google" }) : ok ? t("acct.why") : Cloud.state === "connecting" ? t("acct.connecting") : t("acct.offline"));
  }
  document.addEventListener("click", e => { const b = e.target.closest(".google-btn"); if (!b || b.disabled) return; if (Account.google()) Account.signOut(); else Account.signIn(); });
