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
  function notifNote() {
    if (!notifSupport()) return t("notif.none");
    if (typeof window.Notification === "function" && Notification.permission === "denied" && !Platform.plugin("LocalNotifications")) return t("notif.blocked");
    return Object.keys(NOTIF).some(k => settings[k]) ? t("notif.on") : t("notif.off");
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
    if (on && !(await askNotif())) { $("notifNote").textContent = notifSupport() ? t("notif.blocked") : t("notif.none"); Sound.ui("deny"); return; }
    settings[k] = on; persist(); renderGeneral(); scheduleNotifs(); Sound.ui("toggle");
  });
  let notifTimer = 0;
  function msToMidnight() { const n = new Date(), m = new Date(n); m.setHours(24, 0, 5, 0); return m - n; }
  function notify(title, body) {
    const L = Platform.plugin("LocalNotifications");
    try {
      if (L && L.schedule) L.schedule({ notifications: [{ id: 1 + (Date.now() % 100000), title, body }] });
      else if (typeof window.Notification === "function" && Notification.permission === "granted" && document.hidden) new Notification(title, { body });
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
  function redeem(code) {
    const norm = String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (norm.length < 4) return { ok: false, msg: t("promo.short") };
    const hsh = promoHash(norm), P = PROMO_CODES.find(p => p.hash === hsh);
    if (!P || (P.until && new Date().toISOString().slice(0, 10) > P.until)) return { ok: false, msg: t("promo.bad") };
    if (profile.redeemed.includes(hsh)) return { ok: false, msg: t("promo.used") };
    const got = [];
    if (P.bones) { addBones(P.bones); got.push(t("promo.bones", { n: P.bones.toLocaleString("en-US") })); }
    if (P.item) { const [kind, id] = P.item.split(":"), it = findItem(kind, id); if (it && !profile.unlocked.includes(P.item)) { profile.unlocked.push(P.item); got.push(it.name); } }
    profile.redeemed.push(hsh); persist(300); updatePips();
    return { ok: true, msg: t("promo.ok", { what: got.join(" + ") || t("promo.nothing") }) };
  }
  $("redeemBtn").addEventListener("click", () => {
    const r = redeem($("redeemIn").value);
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
    for (const [k, id] of Object.entries(NOTIF)) { $(id).setAttribute("aria-checked", String(!!settings[k])); $(id).disabled = !notifSupport(); }
    $("notifNote").textContent = notifNote();
  }
