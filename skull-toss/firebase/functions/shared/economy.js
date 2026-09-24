  // ───────────────────────── the Souls economy (shared by the game and the server) ─────────────────────────
  // Souls are the premium currency. They are never kept on the player's profile or in a save code: the balance and
  // what it has bought live in wallets/<uid>, which only the server (Cloud Functions) can write. This file is the
  // one source of truth for what Souls buy and what they cost; the game's build embeds it too, so the shop and the
  // server always agree. Everything here is pure: no Firestore, no clock of its own.
  const Economy = (() => {
    // what the Soul Shop sells: two four-piece sets drawn from data (see SKINS, RINGS, TRAILS and BANDS in the game)
    const ITEMS = {
      "skull:soul":    { name: "Soul Skull",        souls: 400, s: 4 },
      "ring:soul":     { name: "Soul Ring",         souls: 250, s: 4 },
      "trail:soul":    { name: "Soul Trail",        souls: 300, s: 4 },
      "band:soul":     { name: "Soul Band",         souls: 150, s: 4 },
      "skull:aurora":  { name: "Aurora Skull",      souls: 400, s: 4 },
      "ring:aurora":   { name: "Aurora Ring",       souls: 250, s: 4 },
      "trail:aurora":  { name: "Aurora Trail",      souls: 300, s: 4 },
      "band:aurora":   { name: "Aurora Band",       souls: 150, s: 4 }
    };
    // what a real-money purchase credits, by store product id (the stores' own prices are set in their consoles)
    const PACKS = { "souls.100": 100, "souls.550": 550, "souls.1200": 1200 };
    const DAILY = 10;                 // the free Souls you can claim once a (UTC) day
    const MAX_SOULS = 1000000;        // a sanity cap: no wallet can hold more
    const emptyWallet = () => ({ souls: 0, owned: [], daily: "", receipts: 0, owed: 0, updatedAt: 0 });   // owed: Souls a refund took back that weren't there to take
    const cleanWallet = w => {
      const o = { ...emptyWallet(), ...(w && typeof w === "object" ? w : {}) };
      o.souls = Math.max(0, Math.min(MAX_SOULS, Math.floor(Number(o.souls) || 0)));
      o.owned = Array.isArray(o.owned) ? [...new Set(o.owned.filter(k => typeof k === "string" && ITEMS[k]))] : [];
      o.daily = typeof o.daily === "string" ? o.daily : ""; o.receipts = Math.max(0, Math.floor(Number(o.receipts) || 0));
      o.owed = Math.max(0, Math.min(MAX_SOULS, Math.floor(Number(o.owed) || 0)));
      return o;
    };
    const dayOf = ms => new Date(ms).toISOString().slice(0, 10);
    // each rule returns { ok, wallet } or { ok: false, why } without touching anything
    function buy(wallet, key) {
      const w = cleanWallet(wallet), it = ITEMS[key];
      if (!it) return { ok: false, why: "no-such-item" };
      if (w.owned.includes(key)) return { ok: false, why: "owned" };
      if (w.owed > 0) return { ok: false, why: "owed" };
      if (w.souls < it.souls) return { ok: false, why: "short" };
      return { ok: true, wallet: { ...w, souls: w.souls - it.souls, owned: w.owned.concat(key) }, spent: it.souls };
    }
    // Souls coming in pay off anything owed first
    const add = (w, n) => { const pay = Math.min(w.owed, n); return { ...w, owed: w.owed - pay, souls: Math.min(MAX_SOULS, w.souls + n - pay) }; };
    function claimDaily(wallet, now) {
      const w = cleanWallet(wallet), day = dayOf(now);
      if (w.daily === day) return { ok: false, why: "claimed" };
      return { ok: true, wallet: { ...add(w, DAILY), daily: day }, granted: DAILY };
    }
    function credit(wallet, product) {
      const w = cleanWallet(wallet), n = PACKS[product];
      if (!n) return { ok: false, why: "no-such-product" };
      return { ok: true, wallet: { ...add(w, n), receipts: w.receipts + 1 }, granted: n };
    }
    // a refund (the store took the money back): take the Souls back. What has been spent stays spent; what isn't
    // there to take becomes owed, paid off by the next Souls to come in, and nothing more can be bought meanwhile.
    function revoke(wallet, n) {
      const w = cleanWallet(wallet), take = Math.min(w.souls, n);
      return { ok: true, wallet: { ...w, souls: w.souls - take, owed: Math.min(MAX_SOULS, w.owed + n - take) }, taken: take };
    }
    // support's make-good (or a correction): Souls in or out, out never below zero
    function adjust(wallet, n) {
      const w = cleanWallet(wallet); n = Math.trunc(Number(n) || 0);
      return n >= 0 ? { ok: true, wallet: add(w, n) } : { ok: true, wallet: { ...w, souls: Math.max(0, w.souls + n) } };
    }
    // take a bought item back (undoing a purchase made in error): its Souls return and it comes off the wallet
    function unbuy(wallet, key) {
      const w = cleanWallet(wallet), it = ITEMS[key];
      if (!it || !w.owned.includes(key)) return { ok: false, why: "not-owned" };
      return { ok: true, wallet: { ...add(w, it.souls), owned: w.owned.filter(k => k !== key) } };
    }
    return { ITEMS, PACKS, DAILY, MAX_SOULS, emptyWallet, cleanWallet, dayOf, buy, claimDaily, credit, revoke, adjust, unbuy };
  })();
  if (typeof module !== "undefined" && module.exports) module.exports = Economy;
