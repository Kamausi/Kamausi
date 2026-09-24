  // ───────────────────────── the platform layer: the web, the app stores' shells, and the desktop (Steam) ─────────────────────────
  // One build runs everywhere. Where it's running is worked out once, at boot, and everything that differs goes
  // through Platform: haptics, full screen, going to the background and back, Android's back button, the store
  // (Payments), rewarded reels (Ads), the storefront's achievements, and a first guess at the device's quality tier.
  //   web        a browser, or the installed web app (a service worker keeps it playable offline: tools/package.py)
  //   ios, android  the Capacitor shell (platforms/capacitor): native haptics, in-app purchases, AdMob
  //   desktop, steam  the Electron shell (platforms/electron): a window with full screen and Quit, Steam when it's running
  // The shells' plugins are looked up, never required: missing one leaves that feature off, and the web build carries
  // no native code at all. Store and ad ids come from src/platform.config.json (PLATFORM_CONFIG).
  const Platform = {
    id: "web", shell: null, caps: {}, ready: false,
    detect() {
      const cap = window.Capacitor, desk = window.skullTossDesktop;
      if (cap && typeof cap.isNativePlatform === "function" && cap.isNativePlatform()) { this.id = cap.getPlatform(); this.shell = "capacitor"; }
      else if (desk && typeof desk === "object") { this.id = desk.steam && desk.steam.ok ? "steam" : "desktop"; this.shell = "electron"; }
      else { this.id = "web"; this.shell = null; }
      const nav = navigator, mm = q => !!(window.matchMedia && matchMedia(q).matches);
      this.caps = {
        touch: "ontouchstart" in window || nav.maxTouchPoints > 0,
        haptics: !!this.plugin("Haptics") || typeof nav.vibrate === "function",
        fullscreen: this.shell === "electron" ? true : this.shell ? false : !!(document.fullscreenEnabled || document.webkitFullscreenEnabled),
        installed: this.shell !== null || mm("(display-mode: standalone)") || mm("(display-mode: fullscreen)") || nav.standalone === true,
        lowEnd: (nav.deviceMemory > 0 && nav.deviceMemory <= 2) || (nav.hardwareConcurrency > 0 && nav.hardwareConcurrency <= 2),
        software: /swiftshader|llvmpipe|software|basic render/i.test(gpuName()),
        quit: this.shell === "electron"
      };
      return this;
    },
    plugin(name) { const c = window.Capacitor; return (c && c.Plugins && c.Plugins[name]) || null; },
    desk: () => window.skullTossDesktop || null,
    // a buzz: the shell's haptic engine where there is one (iOS has no navigator.vibrate), else the browser's
    haptic(ms) {
      const H = this.plugin("Haptics");
      if (H) { const n = Array.isArray(ms) ? ms[0] : ms; try { (n >= 16 ? H.impact({ style: n >= 24 ? "HEAVY" : "MEDIUM" }) : H.impact({ style: "LIGHT" })).catch(() => {}); } catch (e) {} return true; }
      try { if (navigator.vibrate) { navigator.vibrate(ms); return true; } } catch (e) {}
      return false;
    },
    isFullscreen() { const D = this.desk(); return D && D.isFullscreen ? !!D.isFullscreen() : !!(document.fullscreenElement || document.webkitFullscreenElement); },
    setFullscreen(on) {
      const D = this.desk(); if (D && D.setFullscreen) { D.setFullscreen(!!on); return true; }
      const el = document.documentElement;
      try {
        if (on && !this.isFullscreen()) (el.requestFullscreen || el.webkitRequestFullscreen).call(el, { navigationUI: "hide" });
        else if (!on && this.isFullscreen()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
        return true;
      } catch (e) { return false; }
    },
    quit() { const D = this.desk(); if (D && D.quit) D.quit(); else { const A = this.plugin("App"); if (A && A.exitApp) A.exitApp(); } },
    // an achievement reached: the storefront hears too (Steam's API names are the game's ids, upper-cased with
    // underscores: first-toss → FIRST_TOSS; platforms/electron/steam-achievements.csv lists them)
    achievement(id) { const D = this.desk(); if (D && D.steam && D.steam.ok && D.steam.activate) try { D.steam.activate(steamName(id)); } catch (e) {} },
    // the shell's lifecycle, fed into the same handling a browser tab gets (09a_input.js: pause and keep the run)
    wire() {
      const A = this.plugin("App");
      if (A && A.addListener) {
        A.addListener("appStateChange", s => onBackground(!s.isActive));
        A.addListener("backButton", () => backButton());
      }
      const SO = this.plugin("ScreenOrientation"), SB = this.plugin("StatusBar");   // a phone plays upright, edge to edge; a tablet turns freely
      try { if (SO && Math.min(screen.width, screen.height) < 600) SO.lock({ orientation: "portrait" }).catch(() => {}); if (SB) SB.hide().catch(() => {}); } catch (e) {}
      const D = this.desk(); if (D && D.onBlur) D.onBlur(hidden => onBackground(hidden));
    },
    init() {
      if (this.ready) return this; this.ready = true;
      this.detect(); this.wire();
      Payments = storePayments() || Payments; Ads = admobAds() || Ads;
      document.documentElement.dataset.platform = this.id;
      // a first guess at the quality tier, before the frame-time watcher has anything to go on (not under test)
      if (!navigator.webdriver && (this.caps.lowEnd || this.caps.software)) setQuality(this.caps.software ? 0.5 : 0.75);
      registerServiceWorker();
      return this;
    }
  };
  const steamName = id => String(id).toUpperCase().replace(/[^A-Z0-9]+/g, "_");
  // what the GPU calls itself (for spotting software rendering), without keeping a context
  function gpuName() {
    try {
      const cv = document.createElement("canvas"), gl = cv.getContext("webgl") || cv.getContext("experimental-webgl"); if (!gl) return "";
      const ext = gl.getExtension("WEBGL_debug_renderer_info"), name = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
      const lose = gl.getExtension("WEBGL_lose_context"); if (lose) lose.loseContext();
      return String(name || "");
    } catch (e) { return ""; }
  }
  // going to the background (an app switch, a call, the desktop window minimised): pause the run and keep it
  let bgHidden = false;
  function onBackground(hidden) {
    if (hidden === bgHidden) return; bgHidden = hidden;
    if (document.hidden === hidden) return;   // (the page's own visibilitychange has seen to it: 09a_input.js)
    Sound.suspend(hidden);
    if (hidden) { if (inRun() && !paused && !(sandbox && !sandbox.bgOn)) { pauseRun(); saveRunSnapshot(); } PlayData.sessionEnd(); }
  }
  // Android's back button: close what's open, pause a run (and back again resumes it), step back from the headstone to
  // the title, and only from the title leave the app
  function backButton() {
    if (sheet) { closeSheet(); return "sheet"; }
    if (screen === "play" && inRun() && !paused) { pauseRun(); return "pause"; }
    if (screen === "pause") { resumeRun(); return "resume"; }
    if (screen !== "title") { toTitle(); return "title"; }
    Platform.quit(); return "quit";
  }
  // ── the store: Soul packs through the platform's own in-app purchases (cordova-plugin-purchase in the Capacitor
  // shell). Buying resolves { platform, receipt, finish }: the server credits the receipt (Souls.redeem), and only
  // then is the purchase finished (consumed). One the app never saw through (the app closed mid-purchase, the network
  // dropped) comes back at the next launch and is credited then; the server never credits a receipt twice.
  function storePayments() {
    const C = window.CdvPurchase; if (!C || !C.store || (Platform.id !== "ios" && Platform.id !== "android")) return null;
    const { store, ProductType } = C, plat = Platform.id === "ios" ? C.Platform.APPLE_APPSTORE : C.Platform.GOOGLE_PLAY;
    const ids = PLATFORM_CONFIG.products || {}, idOf = p => ids[p] || p, packOf = id => Object.keys(Economy.PACKS).find(p => idOf(p) === id);
    const waiting = new Map();   // product → { ok, fail } for the purchase in progress
    const receiptOf = tx => (Platform.id === "ios" ? String(tx.transactionId) : String((tx.nativePurchase && tx.nativePurchase.purchaseToken) || tx.purchaseId || tx.transactionId));
    store.register(Object.keys(Economy.PACKS).map(p => ({ id: idOf(p), type: ProductType.CONSUMABLE, platform: plat })));
    store.when().approved(tx => {
      const product = packOf(tx.products && tx.products[0] && tx.products[0].id); if (!product) return;
      const P = { platform: Platform.id === "ios" ? "apple" : "google", receipt: receiptOf(tx), product, finish: () => tx.finish() };
      const w = waiting.get(product); waiting.delete(product);
      if (w) w.ok(P); else Payments.orphan(P);
    });
    store.initialize([plat]).catch(() => {});
    return {
      available: () => store.products.some(p => p.canPurchase) && !Flags.on("kill.souls"),
      price: product => { const p = store.get(idOf(product), plat); return (p && p.pricing && p.pricing.price) || null; },
      buy: product => new Promise((ok, fail) => {
        const p = store.get(idOf(product), plat), offer = p && p.getOffer(); if (!offer) { fail(new Error("no-product")); return; }
        waiting.set(product, { ok, fail });
        offer.order().then(err => { if (err) { waiting.delete(product); fail(err); } });
      }),
      orphan: P => Souls.redeemLater(P)
    };
  }
  // ── rewarded reels for a continue: AdMob in the Capacitor shell (@capacitor-community/admob). Opt-in only (the player
  // taps "watch a reel"), non-personalised, and asked for consent where the law wants it (Google's UMP form).
  function admobAds() {
    const A = Platform.plugin("AdMob"), cfg = PLATFORM_CONFIG.admob || {}, adId = cfg.rewarded && cfg.rewarded[Platform.id];
    if (!A || !adId) return null;
    let ready = false, started = false;
    const prepare = () => A.prepareRewardVideoAd({ adId, isTesting: !!cfg.test, npa: true }).then(() => { ready = true; }, () => { ready = false; });
    const start = () => {
      if (started) return; started = true;
      A.initialize({ initializeForTesting: !!cfg.test })
        .then(() => (A.requestConsentInfo ? A.requestConsentInfo() : null))
        .then(info => (info && info.isConsentFormAvailable && info.status === "REQUIRED" && A.showConsentForm ? A.showConsentForm() : null))
        .then(prepare, prepare);
    };
    setTimeout(start, 4000);   // (after the title is up, never in the way of the first frame)
    return { start,
      available: () => ready && !Flags.on("kill.ads"),
      show: () => { if (!ready) return Promise.resolve(false); ready = false; return A.showRewardVideoAd().then(r => { prepare(); return !!r; }, () => { prepare(); return false; }); }
    };
  }
  // the installed web app works offline: a service worker (sw.js, written by tools/package.py) keeps the page and the
  // music. Only where the page was served over https (or localhost) with one beside it; never in a claude.ai page,
  // a frame, a native shell, or under test.
  function registerServiceWorker() {
    if (!("serviceWorker" in navigator) || Platform.shell || navigator.webdriver || window.claude || window.top !== window.self) return false;
    if (!(location.protocol === "https:" || location.hostname === "localhost") || !PLATFORM_CONFIG.serviceWorker) return false;
    navigator.serviceWorker.register("sw.js").catch(() => {});
    return true;
  }
