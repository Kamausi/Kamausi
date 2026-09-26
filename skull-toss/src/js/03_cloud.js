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
        Account.finishRedirect();   // (v53: back from a sign-in by redirect)
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
  // v50: Apple, Facebook and a Kamausi account (an email and a password, the developer's own sign-in) link the same
  // way. Each needs its provider switched on in the Firebase console (Apple and Facebook need their developer apps).
  const PROVIDERS = { "google.com": "Google", "apple.com": "Apple", "facebook.com": "Facebook", password: "Kamausi" };
  const Account = {
    busy: false, error: "",
    auth() { return Backend.kind === "firebase" && Backend.app && Backend.app.auth ? Backend.app.auth() : null; },
    available() { return !!this.auth(); },
    user() { const a = this.auth(), u = a && a.currentUser; return u && !u.isAnonymous ? u : null; },
    linked(id) { const u = this.user(); return u && (u.providerData || []).some(p => p.providerId === id) ? u : null; },
    google() { return this.linked("google.com"); },
    provider(id) {
      const fb = window.firebase;
      if (id === "google.com") { const p = new fb.auth.GoogleAuthProvider(); p.setCustomParameters({ prompt: "select_account" }); return p; }
      if (id === "facebook.com") return new fb.auth.FacebookAuthProvider();
      if (id === "apple.com") { const p = new fb.auth.OAuthProvider("apple.com"); p.addScope("email"); p.addScope("name"); return p; }
      return null;
    },
    async signIn(id = "google.com", email = "", pass = "", create = false, retried = false) {
      const auth = this.auth(); if (!auth || (this.busy && !retried)) return;
      this.busy = true; this.error = ""; renderAccount();
      try {
        const u = auth.currentUser, fb = window.firebase;
        if (id === "password") {
          const cred = fb.auth.EmailAuthProvider.credential(email, pass);
          if (u && u.isAnonymous && create) await u.linkWithCredential(cred);   // a new account: this save becomes it
          else if (u && u.isAnonymous) { try { await u.linkWithCredential(cred); } catch (e) { if (e && (e.code === "auth/email-already-in-use" || e.code === "auth/credential-already-in-use")) { await Cloud.push(); await auth.signInWithEmailAndPassword(email, pass); await this.adopt(); return; } throw e; } }
          else if (!u && create) await auth.createUserWithEmailAndPassword(email, pass);   // (v55: no session at all yet: make the account, don't try to sign in to one that isn't there)
          else await auth.signInWithEmailAndPassword(email, pass);
        } else {
          const provider = this.provider(id);
          // (v53: phones, installed apps and in-app browsers block or lose popups: they go by redirect instead, and the
          // page comes back signed in; Backend finishes it on load and finishRedirect() below picks it up)
          if (this.redirectOnly()) { await Cloud.push().catch(() => {}); if (u) await u.linkWithRedirect(provider); else await auth.signInWithRedirect(provider); return; }
          if (u && u.isAnonymous) {
            try { await u.linkWithPopup(provider); }   // same id: nothing moves, the save simply gains a way back in
            catch (e) {
              if (e && e.code === "auth/credential-already-in-use" && e.credential) { await Cloud.push(); await auth.signInWithCredential(e.credential); await this.adopt(); return; }
              throw e;
            }
          } else if (u) await u.linkWithPopup(provider);   // already signed in another way: add this one too
          else await auth.signInWithPopup(provider);
        }
        if (auth.currentUser) await auth.currentUser.reload().catch(() => {});
        const g = this.user(); if (g && Cloud.me) { Cloud.me.name = g.displayName || g.email || ""; Cloud.me.avatarUrl = g.photoURL || ""; }
        if (g && !profile.name && g.displayName) { profile.name = g.displayName.split(" ")[0].slice(0, 16); persist(); }
        toast(`<b>Signed in with ${PROVIDERS[id]}</b> · your progress now follows you`); Sound.ui("claim"); Telemetry.emit("account", { how: id.split(".")[0] });
        const box = $("emailBox"); if (box) box.hidden = true;
      } catch (e) {
        const code = (e && e.code) || "";
        // v55: App Check turned the request away. Once, fetch a fresh App Check token and try again; if that can't be had
        // either, say so plainly (it's the project's set-up, not the player: docs in firebase/README.md)
        if (code === "auth/firebase-app-check-token-is-invalid" || code === "auth/firebase-app-check-token-missing") {
          const why = await Backend.appCheckRefresh();
          if (!retried && !why) { this.busy = false; return this.signIn(id, email, pass, create, true); }
          this.error = t("acct.appCheck") + (why ? ` (${why})` : ""); this.busy = false; renderAccount(); renderSave(); return;
        }
        if (id !== "password" && (code === "auth/popup-blocked" || code === "auth/operation-not-supported-in-this-environment" || code === "auth/web-storage-unsupported")) {
          try { const auth2 = this.auth(), u2 = auth2.currentUser, pr = this.provider(id); if (u2) await u2.linkWithRedirect(pr); else await auth2.signInWithRedirect(pr); return; } catch (e2) { /* fall through to the message */ }
        }
        this.error = code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request" ? "" : code === "auth/operation-not-allowed" ? t("acct.notEnabled", { who: PROVIDERS[id] }) : code === "auth/unauthorized-domain" ? t("acct.domain") : code === "auth/popup-blocked" ? t("acct.popup")
          : code === "auth/wrong-password" || code === "auth/invalid-credential" || code === "auth/user-not-found" || code === "auth/invalid-login-credentials" ? t("acct.badLogin") : code === "auth/weak-password" ? t("acct.weak") : code === "auth/invalid-email" ? t("acct.badEmail") : code === "auth/network-request-failed" ? t("acct.offline") : `${t("acct.failed")} (${code || "unknown"})`;   // (v53: the code, so a setup problem can be told apart)
      }
      this.busy = false; renderAccount(); renderSave();
    },
    redirectOnly() {
      const standalone = (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true;
      const inApp = /FBAN|FBAV|Instagram|Line\/|; wv\)|GSA\//.test(navigator.userAgent || "");
      return standalone || inApp || !!window.Capacitor || (window.matchMedia && matchMedia("(pointer: coarse)").matches);
    },
    // back from a redirect sign-in (Backend.useFirebase caught the result): welcome them, or adopt an existing account
    async finishRedirect() {
      const R = Backend.redirect; if (!R) return; Backend.redirect = null;
      const auth = this.auth(); if (!auth) return;
      if (R.ok) { const g = this.user(); if (g && !profile.name && g.displayName) { profile.name = g.displayName.split(" ")[0].slice(0, 16); persist(); }
        toast(`<b>${t("acct.signedIn")}</b> · your progress now follows you`); Sound.ui("claim"); renderAccount(); renderSave(); return; }
      if (R.code === "auth/credential-already-in-use" && R.credential) { try { await auth.signInWithCredential(R.credential); await this.adopt(); } catch (e) { this.error = `${t("acct.failed")} (${(e && e.code) || "unknown"})`; renderAccount(); } return; }
      if (R.code) { this.error = R.code === "auth/operation-not-allowed" ? t("acct.notEnabled", { who: "that" }) : R.code === "auth/unauthorized-domain" ? t("acct.domain") : `${t("acct.failed")} (${R.code})`; renderAccount(); }
    },
    // the account already had a save: this device's progress goes into it, then a clean start as that account
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
    const u = Account.user(), ok = Account.available();
    for (const btn of document.querySelectorAll(".google-btn, .link-btn")) {
      const id = btn.dataset.provider || "google.com", on = !!Account.linked(id);
      btn.disabled = Account.busy || (!ok && Cloud.state !== "connecting");
      const lbl = btn.querySelector(".g-lbl"); if (lbl) lbl.textContent = Account.busy ? t("acct.wait") : id === "google.com" && on ? t("acct.signOut") : on ? t("acct.linked", { who: PROVIDERS[id] }) : id === "google.com" ? t("acct.signIn") : id === "password" ? t("acct.email") : t("acct.with", { who: PROVIDERS[id] });
      btn.classList.toggle("out", on);
    }
    const note = $("accountNote");
    if (location.protocol === "file:") { for (const btn of document.querySelectorAll(".google-btn, .link-btn")) btn.disabled = true; if (note) note.textContent = t("acct.fileCopy"); return; }   // (v53: a downloaded copy can't sign in: Firebase only allows its authorised web addresses)
    if (note) note.textContent = Account.error || (u ? t("acct.as", { who: u.email || u.displayName || "you" }) : ok ? t("acct.why") : Cloud.state === "connecting" ? t("acct.connecting") : t("acct.offline"));
  }
  document.addEventListener("click", e => {
    const b = e.target.closest(".google-btn, .link-btn"); if (!b || b.disabled) return;
    const id = b.dataset.provider || "google.com";
    if (id === "password") { const box = $("emailBox"); if (Account.linked("password")) Account.signOut(); else if (box) { box.hidden = !box.hidden; if (!box.hidden) $("emailIn").focus(); } return; }
    if (Account.linked(id)) { if (id === "google.com") Account.signOut(); return; }
    Account.signIn(id);
  });
  for (const [id, create] of [["emailGo", false], ["emailNew", true]]) { const b = document.getElementById(id); if (b) b.addEventListener("click", () => { const em = $("emailIn").value.trim(), pw = $("passIn").value; if (!em || pw.length < 6) { Account.error = t("acct.fill"); renderAccount(); return; } Account.signIn("password", em, pw, create); }); }
