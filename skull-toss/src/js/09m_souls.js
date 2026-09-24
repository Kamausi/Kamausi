  // ───────────────────────── Souls and the Soul Shop ─────────────────────────
  // Souls are the premium currency, and the server's alone: the balance and what it has bought live in
  // wallets/<uid>, written only by Cloud Functions (firebase/functions). They're never on the profile or in a save
  // code, and the client can't change them; it asks. The Soul Shop sells the items in the shared economy
  // (Economy.ITEMS) at the server's prices, a free handful of Souls once a day, and Soul packs, which need a store
  // (Payments: the native shells plug one in; the web build has none). Without a server the shop says so and
  // everything else in the game carries on.
  // the store (03e_platform.js plugs in the app stores' in-app purchases): available(), price(product), buy(product) →
  // { platform, receipt, finish }, and orphan(purchase) for one that arrives with no buy in progress
  let Payments = { available: () => false, price: () => null, buy: () => Promise.reject(new Error("no store")), orphan: () => {} };
  const Souls = {
    wallet: null, state: "off", unsub: null, busy: false, lastError: null, later: [],   // state: off | loading | ok | error
    known() { return !!this.wallet; },
    owns(key) { return !!this.wallet && this.wallet.owned.includes(key); },
    available() { return Backend.hasFunctions() && !Flags.on("kill.souls"); },   // (a kill switch can close the shop: 03d_flags.js)
    async connect() {
      if (this.unsub) { try { this.unsub(); } catch (e) {} this.unsub = null; }
      if (!Backend.hasFunctions()) {   // no server at all: nothing can be Soul-bound, so no Soul look stays on
        this.state = "off"; this.wallet = null;
        for (const k of KINDS) { const it = findItem(k, cos[k]); if (it && it.souls) cos[k] = DEFAULT_COS[k]; }
        applyCosmetics(); renderSoulsUI(); return;
      }
      this.state = "loading"; renderSoulsUI();
      try {
        if (Backend.kind === "firebase") this.unsub = Backend.db.doc("wallets/" + Backend.me.id).onSnapshot(s => this.set(s.exists ? s.data() : Economy.emptyWallet()), () => { this.state = "error"; renderSoulsUI(); });
        else this.set(await Backend.call("wallet"));
      } catch (e) { this.state = "error"; renderSoulsUI(); }
    },
    set(w) {
      this.wallet = Economy.cleanWallet(w); this.state = "ok";
      for (const k of KINDS) { const it = findItem(k, cos[k]); if (it && it.souls && !this.owns(`${k}:${it.id}`)) cos[k] = DEFAULT_COS[k]; }   // (the wallet has the last word on what's worn)
      applyCosmetics(); renderSoulsUI(); if (sheet === "customize") renderShop();
      if (this.later.length && !this.busy) { const P = this.later.shift(); setTimeout(() => this.settle(P).then(() => { if (this.later.length) this.set(this.wallet); }), 0); }
    },
    // every change goes through the server; the wallet it sends back is the new truth
    async ask(name, data, done) {
      if (this.busy || !this.available()) return false;
      this.busy = true; this.lastError = null; renderSoulsUI();
      try { const w = await Backend.call(name, { ...(data || {}), build: GAME_BUILD }); this.set(w); if (done) done(); return true; }
      catch (e) { this.lastError = e.code || "other"; const why = e.message === "update-required" ? "update" : ["failed-precondition", "already-exists", "unauthenticated", "permission-denied", "unavailable"].includes(e.code) ? e.code : "other"; toast(t(`souls.err.${why}`)); Sound.ui("deny"); return false; }
      finally { this.busy = false; renderSoulsUI(); }
    },
    buy(key) { const [kind, id] = key.split(":"); return this.ask("buyWithSouls", { item: key }, () => { equip(kind, id); toast(t("souls.bought", { name: Economy.ITEMS[key].name })); Sound.ui("buy"); Telemetry.emit("shop_buy", { kind, id, price: Economy.ITEMS[key].souls, cur: "souls" }); }); },
    claimDaily() { return this.ask("claimDailySouls", {}, () => { toast(t("souls.dailyGot", { n: Economy.DAILY })); Sound.ui("claim"); }); },
    redeem(purchase) { return this.ask("redeemPurchase", purchase, () => { toast(t("souls.packGot", { n: Economy.PACKS[purchase.product] })); Sound.ui("claim"); }); },
    // a Soul pack: the store takes the money, the server credits the receipt, and only then is the purchase finished
    // (so a pack the server hasn't credited yet is offered again at the next launch, and credited then)
    async buyPack(product) {
      if (!Payments.available()) return false;
      let P; try { P = await Payments.buy(product); } catch (e) { if (!/cancel/i.test(String(e && (e.message || e.code)))) toast(t("souls.err.other")); return false; }
      return this.settle({ ...P, product });
    },
    async settle(P) {
      const ok = await this.redeem({ platform: P.platform, receipt: P.receipt, product: P.product });
      if ((ok || this.lastError === "already-exists") && P.finish) P.finish();
      return ok;
    },
    // a purchase that arrived with no buy in progress: credited as soon as the wallet's here
    redeemLater(P) { if (this.state === "ok" && !this.busy) return this.settle(P); this.later.push(P); return null; }
  };
  // the Soul Shop sheet
  function renderSoulsUI() {
    for (const el of document.querySelectorAll(".souls-n")) el.textContent = Souls.wallet ? fmtN(Souls.wallet.souls) : "—";
    if (sheet !== "souls") return;
    const W = Souls.wallet, on = Souls.state === "ok";
    $("soulsStatus").textContent = !Souls.available() ? t("souls.offline") : Souls.state === "loading" ? t("souls.loading") : Souls.state === "error" ? t("souls.error") : W && W.owed ? t("souls.owed", { n: fmtN(W.owed) }) : "";
    $("soulsStatus").hidden = on && !(W && W.owed);
    const today = Economy.dayOf(Date.now()), dailyBtn = $("soulsDaily");
    dailyBtn.disabled = !on || Souls.busy || (W && W.daily === today);
    dailyBtn.textContent = W && W.daily === today ? t("souls.claimed") : t("souls.claim", { n: Economy.DAILY });
    const grid = $("soulsGrid"); grid.textContent = "";
    for (const [key, it] of Object.entries(Economy.ITEMS)) {
      const [kind, id] = key.split(":"), owned = Souls.owns(key), worn = owned && cos[kind] === id;
      const cv = h("canvas"), b = h("button", { type: "button", class: `item soul${worn ? " equipped" : owned ? " owned" : ""}`, data: { key }, disabled: !on || Souls.busy ? true : null },
        cv, h("span", {}, it.name), h("span", { class: "state" }, worn ? t("souls.worn") : owned ? t("souls.equip") : t("souls.price", { n: fmtN(it.souls) })));
      grid.append(b); drawItemIcon(cv, kind, id);
    }
    const packs = $("soulsPacks"); packs.textContent = "";
    for (const [product, n] of Object.entries(Economy.PACKS)) { const price = Payments.price(product);   // (the store's own price, in the player's currency)
      packs.append(h("button", { type: "button", class: "btn sm", data: { product }, disabled: !on || !Payments.available() || Souls.busy ? true : null }, t("souls.pack", { n: fmtN(n) }) + (price ? ` · ${price}` : ""))); }
    $("soulsPacksNote").textContent = Payments.available() ? "" : t("souls.inApp");
  }
  $("soulsGrid").addEventListener("click", e => {
    const b = e.target.closest("[data-key]"); if (!b || b.disabled) return;
    const key = b.dataset.key, [kind, id] = key.split(":");
    if (Souls.owns(key)) { equip(kind, id); renderSoulsUI(); Sound.ui("equip"); } else Souls.buy(key);
  });
  $("soulsDaily").addEventListener("click", () => Souls.claimDaily());
  $("soulsPacks").addEventListener("click", e => { const b = e.target.closest("[data-product]"); if (b && !b.disabled) Souls.buyPack(b.dataset.product); });
