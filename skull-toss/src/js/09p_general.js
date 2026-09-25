  // ───────────────────────── settings, v50: categories, then one category's settings; Account & General ─────────────────────────
  let setSec = null;   // the open category (null: the list of categories)
  const SET_SECS = ["audio", "graphics", "gameplay", "access", "account"];
  function showSetSec(k) {
    setSec = SET_SECS.includes(k) ? k : null;
    $("setCats").hidden = !!setSec;
    for (const el of $("sheet-settings").querySelectorAll(".set-sec")) el.hidden = el.dataset.sec !== setSec;
    $("h-settings").textContent = setSec ? $("setCats").querySelector(`[data-sec="${setSec}"] b`).textContent : t("ui.settings");   // (the category's own name, as shown)
    const b = $("sheet-settings").querySelector(".sheet-body"); if (b) b.scrollTop = 0;
    if (setSec === "account") renderGeneral();
  }
  $("setCats").addEventListener("click", e => { const b = e.target.closest(".set-cat"); if (b) { showSetSec(b.dataset.sec); Sound.ui("open"); } });
  // back from a category goes to the categories, not out of Settings
  $("sheet-settings").querySelector("[data-back]").addEventListener("click", e => { if (setSec) { e.stopImmediatePropagation(); showSetSec(null); Sound.ui("close"); } }, true);

  // ── notifications: only what the game really has (the daily reset, a challenge set running out, events and seasons).
  // A shell's local notifications when there's one (Capacitor), else the browser's, while the game is open.
  const NOTIF = { notifDaily: "set-notif-daily", notifChal: "set-notif-chal", notifEvents: "set-notif-events" };
  function notifSupport() { return !!Platform.plugin("LocalNotifications") || typeof window.Notification === "function"; }
  // (v53: the switches always work. Where the device won't give the game system notifications (no support, or
  // permission refused), the reminders are shown inside the game when you come back to it instead.)
  const sysNotif = () => notifSupport() && !(typeof window.Notification === "function" && Notification.permission !== "granted" && !Platform.plugin("LocalNotifications"));
  function notifNote() {
    const any = Object.keys(NOTIF).some(k => settings[k]);
    if (!any) return t("notif.off");
    return sysNotif() ? t("notif.on") : t("notif.inGame");
  }
  async function askNotif() {
    const L = Platform.plugin("LocalNotifications");
    try {
      if (L && L.requestPermissions) return (await L.requestPermissions()).display === "granted";
      if (typeof window.Notification !== "function") return false;
      if (Notification.permission === "default") await Notification.requestPermission();
      return Notification.permission === "granted";
    } catch (e) { return false; }
  }
  for (const [k, id] of Object.entries(NOTIF)) $(id).addEventListener("click", async () => {
    const on = !settings[k];
    settings[k] = on; persist(); renderGeneral(); Sound.ui("toggle");
    if (on && notifSupport()) { await askNotif(); renderGeneral(); }   // (asked once, on the tap; a no still leaves the in-game reminders on)
    scheduleNotifs();
  });
  // the in-game reminder: back in the game on a new day with the daily rewards switched on
  function inGameReminder() {
    if (!settings.notifDaily || sysNotif() || document.hidden) return;
    const day = new Date().toISOString().slice(0, 10), key = "skullToss.remindedDay";
    if (store.get(key, "") === day) return; store.set(key, day);
    toast(`<b>${t("notif.dailyTitle")}</b> · ${t("notif.dailyBody")}`);
  }
  document.addEventListener("visibilitychange", () => { try { inGameReminder(); } catch (e) {} });
  setTimeout(() => { try { inGameReminder(); } catch (e) {} }, 6000);
  let notifTimer = 0;
  function msToMidnight() { const n = new Date(), m = new Date(n); m.setHours(24, 0, 5, 0); return m - n; }
  function notify(title, body) {
    const L = Platform.plugin("LocalNotifications");
    try {
      if (L && L.schedule) L.schedule({ notifications: [{ id: 1 + (Date.now() % 100000), title, body }] });
      else if (typeof window.Notification === "function" && Notification.permission === "granted" && document.hidden) {
        // (v53: Android Chrome refuses new Notification(): a page there has to go through its service worker)
        if (navigator.serviceWorker && navigator.serviceWorker.getRegistration) navigator.serviceWorker.getRegistration().then(r => { if (r) r.showNotification(title, { body }); else new Notification(title, { body }); }).catch(() => {});
        else new Notification(title, { body });
      }
    } catch (e) {}
  }
  function scheduleNotifs() {
    clearTimeout(notifTimer);
    if (!settings.notifDaily && !settings.notifChal) return;
    notifTimer = setTimeout(() => { if (settings.notifDaily) notify(t("notif.dailyTitle"), t("notif.dailyBody")); scheduleNotifs(); }, Math.min(msToMidnight(), 2147483000));
  }
  setTimeout(() => { try { scheduleNotifs(); } catch (e) {} }, 2000);   // (once the save has loaded)

  // ── promo codes: the build carries only each code's salted hash (tools/promo.py); a code pays once per player ──
  function cyrb53(s, seed = 0) {
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
  }
  const promoHash = code => cyrb53("skulltoss-promo:" + String(code).toUpperCase().replace(/[^A-Z0-9]/g, ""));
  // v53: the play-test key. It's kept as a PBKDF2-SHA-256 digest (a random salt, 310,000 rounds: see tools/promo.py
  // --master), so the build holds no trace of the code and guessing it would take years. WebCrypto does the work where
  // the page may use it; a downloaded copy (file://, where it may not) uses the small SHA-256 below.
  const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  function sha256(bytes) {
    const K = new Uint32Array([0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2]);
    const H = new Uint32Array([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]);
    const n = bytes.length, len = ((n + 9 + 63) >> 6) << 6, m = new Uint8Array(len); m.set(bytes); m[n] = 0x80;
    const dv = new DataView(m.buffer); dv.setUint32(len - 4, n * 8); dv.setUint32(len - 8, Math.floor(n / 0x20000000));
    const w = new Uint32Array(64), r = (x, k) => (x >>> k) | (x << (32 - k));
    for (let o = 0; o < len; o += 64) {
      for (let i = 0; i < 16; i++) w[i] = dv.getUint32(o + i * 4);
      for (let i = 16; i < 64; i++) { const a = w[i - 15], b = w[i - 2]; w[i] = (w[i - 16] + (r(a, 7) ^ r(a, 18) ^ (a >>> 3)) + w[i - 7] + (r(b, 17) ^ r(b, 19) ^ (b >>> 10))) >>> 0; }
      let [a, b, c, d, e, f, g, hh] = H;
      for (let i = 0; i < 64; i++) { const t1 = (hh + (r(e, 6) ^ r(e, 11) ^ r(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) >>> 0, t2 = ((r(a, 2) ^ r(a, 13) ^ r(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
        hh = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0; }
      H[0] += a; H[1] += b; H[2] += c; H[3] += d; H[4] += e; H[5] += f; H[6] += g; H[7] += hh;
    }
    const out = new Uint8Array(32), ov = new DataView(out.buffer); H.forEach((x, i) => ov.setUint32(i * 4, x)); return out;
  }
  function pbkdf2Slow(pass, salt, iter) {   // PBKDF2-HMAC-SHA-256, one 32-byte block
    let key = pass; if (key.length > 64) key = sha256(key);
    const k = new Uint8Array(64); k.set(key); const ip = k.map(x => x ^ 0x36), op = k.map(x => x ^ 0x5c);
    const hmac = msg => { const a = new Uint8Array(64 + msg.length); a.set(ip); a.set(msg, 64); const b = new Uint8Array(96); b.set(op); b.set(sha256(a), 64); return sha256(b); };
    const s1 = new Uint8Array(salt.length + 4); s1.set(salt); s1[salt.length + 3] = 1;
    let u = hmac(s1); const t = u.slice(); for (let i = 1; i < iter; i++) { u = hmac(u); for (let j = 0; j < 32; j++) t[j] ^= u[j]; }
    return t;
  }
  async function pbkdf2(norm, salt, iter) {
    const pass = new TextEncoder().encode(norm);
    if (window.crypto && crypto.subtle && window.isSecureContext) {
      try { const k = await crypto.subtle.importKey("raw", pass, "PBKDF2", false, ["deriveBits"]); return new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: iter }, k, 256)); } catch (e) { /* the slow way */ }
    }
    return pbkdf2Slow(pass, salt, iter);
  }
  async function masterMatch(norm) {
    for (const M of PROMO_CODES.filter(p => p.master)) {
      const got = await pbkdf2(norm, b64(M.salt), M.iter), want = b64(M.master);
      if (got.length === want.length && got.every((x, i) => x === want[i])) return M;
    }
    return null;
  }
  function grantAll() {   // everything, to play-test it all: every look, every map, every mode, and bones to spend
    profile.allAccess = true; addBones(1000000);
    profile.bestStage = Math.max(profile.bestStage, MAP_DATA.length + 1); profile.storyClears = Math.max(profile.storyClears || 0, 1); profile.bossKills = Math.max(profile.bossKills || 0, 16);
    applyCosmetics(); updateHud();
  }
  // the everyday codes answer at once; only a code that isn't one of them waits on the key check
  async function redeemKey(norm) {
    const M = await masterMatch(norm);
    if (!M) return { ok: false, msg: t("promo.bad") };
    if (profile.allAccess) return { ok: false, msg: t("promo.used") };
    grantAll(); persist(300); updatePips(); return { ok: true, msg: t("promo.all") };
  }
  function redeem(code) {
    const norm = String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (norm.length < 4) return { ok: false, msg: t("promo.short") };
    const hsh = promoHash(norm), P = PROMO_CODES.find(p => p.hash === hsh);
    if (!P) return redeemKey(norm);
    if (!P || (P.until && new Date().toISOString().slice(0, 10) > P.until)) return { ok: false, msg: t("promo.bad") };
    if (profile.redeemed.includes(hsh)) return { ok: false, msg: t("promo.used") };
    const got = [];
    if (P.bones) { addBones(P.bones); got.push(t("promo.bones", { n: P.bones.toLocaleString("en-US") })); }
    if (P.item) { const [kind, id] = P.item.split(":"), it = findItem(kind, id); if (it && !profile.unlocked.includes(P.item)) { profile.unlocked.push(P.item); got.push(it.name); } }
    profile.redeemed.push(hsh); persist(300); updatePips();
    return { ok: true, msg: t("promo.ok", { what: got.join(" + ") || t("promo.nothing") }) };
  }
  $("redeemBtn").addEventListener("click", async () => {
    const btn = $("redeemBtn"); if (btn.disabled) return;
    let r = redeem($("redeemIn").value);
    if (r && typeof r.then === "function") { btn.disabled = true; $("redeemNote").textContent = t("promo.checking"); try { r = await r; } catch (e) { r = { ok: false, msg: t("promo.bad") }; } btn.disabled = false; }
    $("redeemNote").textContent = r.msg; $("redeemNote").classList.toggle("good", r.ok);
    if (r.ok) { $("redeemIn").value = ""; Sound.ui("claim"); toast(r.msg); } else Sound.ui("deny");
  });
  $("redeemIn").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); $("redeemBtn").click(); } });

  // ── support and credits: a small reading sheet ──
  const INFO = ["help", "privacy", "terms", "credits"];
  function openInfo(k) {
    if (!INFO.includes(k)) return;
    $("h-info").textContent = t(`info.${k}.title`);
    const body = $("infoBody"); body.textContent = "";
    for (const para of t(`info.${k}.body`).split("\n")) body.append(h("p", {}, para));
    openSheet("info");
  }
  $("sheet-settings").querySelector(".info-btns").addEventListener("click", e => { const b = e.target.closest("[data-info]"); if (b) openInfo(b.dataset.info); });

  function renderGeneral() {
    for (const [k, id] of Object.entries(NOTIF)) { $(id).setAttribute("aria-checked", String(!!settings[k])); $(id).disabled = false; }
    $("notifNote").textContent = notifNote();
  }
