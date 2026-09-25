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
      "band:aurora":   { name: "Aurora Band",       souls: 150, s: 4 },
      // a season's Premium Ticket (v42): owning it lets the game pay the Ticket's second reward on each stub
      "pass:s1":       { name: "Season One Premium Ticket", souls: 600, s: 4 },
      // v45: Mort's Curio Cart sells for Souls alone (they were bones before): its exclusives, by shelf
      "skull:disco":       { name: "Disco Ball", souls: 300, s: 4, cart: true },
      "skull:bubblegum":   { name: "Bubblegum", souls: 140, s: 3, cart: true },
      "skull:stained":     { name: "Stained Glass", souls: 320, s: 4, cart: true },
      "eyes:diamond":      { name: "Diamonds", souls: 270, s: 4, cart: true },
      "teeth:diamond":     { name: "Diamond Grill", souls: 300, s: 4, cart: true },
      "paint:eightball":   { name: "Eight Ball", souls: 150, s: 3, cart: true },
      "trail:coins":       { name: "Gold Coins", souls: 230, s: 4, cart: true },
      "trail:cards":       { name: "Playing Cards", souls: 130, s: 3, cart: true },
      "impact:kapow":      { name: "KA-POW!", souls: 230, s: 4, cart: true },
      "ring:lifebuoy":     { name: "Lifebuoy", souls: 150, s: 3, cart: true },
      "ring:saturn":       { name: "Saturn", souls: 300, s: 4, cart: true },
      "aim:starry":        { name: "Starry", souls: 200, s: 4, cart: true },
      "reel:bootleg":      { name: "Bootleg Copy", souls: 200, s: 4, cart: true },
      "hat:cake":          { name: "Birthday Cake", souls: 150, s: 3, cart: true },
      "hat:chicken":       { name: "Rubber Chicken", souls: 130, s: 3, cart: true },
      "hat:icecream":      { name: "Dropped Ice Cream", souls: 140, s: 3, cart: true },
      "hat:windup":        { name: "Wind-Up Key", souls: 160, s: 3, cart: true },
      "hat:lighthouse":    { name: "Lighthouse", souls: 320, s: 4, cart: true },
      "hat:chandelier":    { name: "Chandelier", souls: 400, s: 4, cart: true },
      "aura:coins":        { name: "Money Bags", souls: 270, s: 4, cart: true },
      "aura:cards":        { name: "House of Cards", souls: 150, s: 3, cart: true },
      "aura:void":         { name: "Black Hole", souls: 330, s: 4, cart: true },
      "pole:gold":         { name: "Solid Gold Post", souls: 280, s: 4, cart: true },
      "pole:rocket":       { name: "Rocket", souls: 370, s: 4, cart: true }
    };
    // what a real-money purchase credits, by store product id (the stores' own prices are set in their consoles)
    // v49: the tiers follow the industry's anchors: $4.99 for 500 is the baseline, each tier above adds a bigger bonus
    // (10%, 15%, 20%, 30%), and a $0.99 starter gives 100 (deliberately the worst value, to point at $4.99). usd is the
    // list price the stores' consoles are set to; the game shows the store's own price in the player's currency when
    // it has one. souls.550 and souls.1200 were the v30 packs: no longer offered, kept so an old receipt (or its
    // refund) still credits what it was sold for.
    const PACKS = { "souls.100": 100, "souls.500": 500, "souls.1100": 1100, "souls.2300": 2300, "souls.6000": 6000, "souls.13000": 13000, "souls.550": 550, "souls.1200": 1200 };
    const PACK_TIERS = [
      { product: "souls.100",   usd: 0.99,  base: 100,   bonus: 0 },
      { product: "souls.500",   usd: 4.99,  base: 500,   bonus: 0 },
      { product: "souls.1100",  usd: 9.99,  base: 1000,  bonus: 100 },
      { product: "souls.2300",  usd: 19.99, base: 2000,  bonus: 300 },
      { product: "souls.6000",  usd: 49.99, base: 5000,  bonus: 1000 },
      { product: "souls.13000", usd: 99.99, base: 10000, bonus: 3000 }
    ];
    const WELCOME = 200;              // v49: the Souls a player is given the first time they play
    const DAILY = 10;                 // the free Souls you can claim once a (UTC) day
    const COFFIN = 60;                // v45: the Cart's Mystery Coffin, opened for Souls (what's inside is a Vault look: the game draws it)
    const DEAL_OFF = 0.25;            // v45: the Cart's deal of the day, a quarter off one exclusive
    const CART = Object.keys(ITEMS).filter(k => ITEMS[k].cart);
    // the day's deal: the same exclusive for everyone on a (UTC) day, picked by the day itself
    function dealOf(day) {
      let h = 2166136261; for (const ch of String(day)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
      const key = CART[h % CART.length];
      return { key, souls: Math.round(ITEMS[key].souls * (1 - DEAL_OFF) / 10) * 10 };
    }
    const priceOf = (key, day) => { const d = day ? dealOf(day) : null; return d && d.key === key ? d.souls : ITEMS[key] ? ITEMS[key].souls : 0; };
    const MAX_SOULS = 1000000;        // a sanity cap: no wallet can hold more
    const emptyWallet = () => ({ souls: 0, owned: [], daily: "", receipts: 0, owed: 0, welcomed: false, updatedAt: 0 });   // owed: Souls a refund took back that weren't there to take
    const cleanWallet = w => {
      const o = { ...emptyWallet(), ...(w && typeof w === "object" ? w : {}) };
      o.souls = Math.max(0, Math.min(MAX_SOULS, Math.floor(Number(o.souls) || 0)));
      o.owned = Array.isArray(o.owned) ? [...new Set(o.owned.filter(k => typeof k === "string" && ITEMS[k]))] : [];
      o.daily = typeof o.daily === "string" ? o.daily : ""; o.receipts = Math.max(0, Math.floor(Number(o.receipts) || 0));
      o.owed = Math.max(0, Math.min(MAX_SOULS, Math.floor(Number(o.owed) || 0)));
      o.welcomed = o.welcomed === true;
      return o;
    };
    const dayOf = ms => new Date(ms).toISOString().slice(0, 10);
    // each rule returns { ok, wallet } or { ok: false, why } without touching anything
    function buy(wallet, key, day) {   // (day: the server's UTC day, for the Cart's deal)
      const w = cleanWallet(wallet), it = ITEMS[key], price = priceOf(key, day);
      if (!it) return { ok: false, why: "no-such-item" };
      if (w.owned.includes(key)) return { ok: false, why: "owned" };
      if (w.owed > 0) return { ok: false, why: "owed" };
      if (w.souls < price) return { ok: false, why: "short" };
      return { ok: true, wallet: { ...w, souls: w.souls - price, owned: w.owned.concat(key) }, spent: price };
    }
    // the Mystery Coffin: Souls out, nothing on the wallet (the look inside goes on the player's own profile)
    function coffin(wallet) {
      const w = cleanWallet(wallet);
      if (w.owed > 0) return { ok: false, why: "owed" };
      if (w.souls < COFFIN) return { ok: false, why: "short" };
      return { ok: true, wallet: { ...w, souls: w.souls - COFFIN }, spent: COFFIN };
    }
    // Souls coming in pay off anything owed first
    const add = (w, n) => { const pay = Math.min(w.owed, n); return { ...w, owed: w.owed - pay, souls: Math.min(MAX_SOULS, w.souls + n - pay) }; };
    function claimDaily(wallet, now) {
      const w = cleanWallet(wallet), day = dayOf(now);
      if (w.daily === day) return { ok: false, why: "claimed" };
      return { ok: true, wallet: { ...add(w, DAILY), daily: day }, granted: DAILY };
    }
    // v49: the welcome gift, once per account
    function welcome(wallet) {
      const w = cleanWallet(wallet);
      if (w.welcomed) return { ok: false, why: "claimed" };
      return { ok: true, wallet: { ...add(w, WELCOME), welcomed: true }, granted: WELCOME };
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
    return { ITEMS, PACKS, PACK_TIERS, WELCOME, welcome, DAILY, COFFIN, DEAL_OFF, CART, MAX_SOULS, emptyWallet, cleanWallet, dayOf, dealOf, priceOf, buy, coffin, claimDaily, credit, revoke, adjust, unbuy };
  })();
  if (typeof module !== "undefined" && module.exports) module.exports = Economy;
