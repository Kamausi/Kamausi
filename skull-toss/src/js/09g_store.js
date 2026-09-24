  // ───────────────────────── the Curio Cart: Mort's shop ─────────────────────────
  // A travelling cart run by Mort, a ghoul wizard (v46: he traded the bowler for a hat with stars on). v45: Mort takes Souls, never bones (the Vault is where bones
  // go). He sells his exclusives (things you can't get anywhere else), shelf by shelf; one of them each day at a
  // quarter off; and the Mystery Coffin (a Vault look you don't own yet, drawn as it lands). Souls are the server's
  // (09m_souls.js), so the prices are the shared economy's (Economy: CART, dealOf, COFFIN) and the server charges
  // them. Without a server the Cart shows its wares and says the Souls counter is shut. Nothing here changes the physics.
  const cart = { sel: null, R: makeRig(), bounce: 0, quip: 0, won: null, show: null };
  const MORT_QUIPS = ["Fresh from the grave. Barely worn!", "No refunds. No returns. No pulse.", "Souls, please. I don't take bones: I've got plenty.",
    "That hat? Belonged to a duke. Or a duck.", "Everything's haunted. No extra charge.", "Mind the coffin, it bites.", "Buy two, the second one's still full price!",
    "Lovely skull you've got there. Shame about the rest.", "I'd throw in a warranty, but you'd only throw it.",
    "Abraca-deal-bra. Souls, please.", "I'd magic up a discount, but the wand's on strike.", "Every look here is enchanted. Mostly with dust."];
  const today = () => Economy.dayOf(Date.now());
  // the day's deal: one exclusive, a quarter off (the server works it out the same way)
  function dailyDeals() {
    const D = Economy.dealOf(today()), [kind, id] = D.key.split(":"), it = findItem(kind, id);
    return it ? [{ kind, it, price: D.souls, off: Economy.DEAL_OFF }] : [];
  }
  const exclusives = () => KINDS.flatMap(kind => CATALOG[kind].filter(it => it.shop).map(it => ({ kind, it, price: Economy.priceOf(`${kind}:${it.id}`, today()) })));
  function cartPrice(kind, id) { return Economy.priceOf(`${kind}:${id}`, today()); }
  const soulsOpen = () => Souls.state === "ok" && Souls.available();
  // a Cart exclusive, for Souls: the server takes them and the wallet owns it
  function cartBuy(kind, id) {
    const it = findItem(kind, id), key = `${kind}:${id}`;
    if (!it || !it.shop || canUse(kind, it) || !soulsOpen()) return Promise.resolve(false);
    return Souls.ask("buyWithSouls", { item: key }, () => {
      profile.shopBuys++; equip(kind, id); cart.bounce = 1.4; cart.quip = (cart.quip + 1) % MORT_QUIPS.length;
      toast(`<b>Sold!</b> · ${it.name} ${KIND_LABEL[kind]}`); Sound.sample("purchase", () => Sound.ui("buy")); buzz([8, 30, 8]);
      checkUnlocks(); persist(800); Telemetry.emit("shop_buy", { kind, id, price: cartPrice(kind, id), cur: "souls" });
    }).then(ok => { if (sheet === "store") renderStore(); return ok; });
  }
  // the Mystery Coffin: something you don't own, mostly cheaper things, now and then a Special
  function coffinPool() { return KINDS.flatMap(kind => CATALOG[kind].filter(it => it.price && !it.shop && starsOf(it) <= 3 && !canUse(kind, it)).map(it => ({ kind, it }))); }
  function drawCoffinPick(rnd = Math.random) {
    const pool = coffinPool(); if (!pool.length) return null;
    const w = e => [0, 6, 3.5, 1.2][starsOf(e.it)], total = pool.reduce((s2, e) => s2 + w(e), 0);
    let r = rnd() * total, pick = pool[0];
    for (const e of pool) { r -= w(e); if (r <= 0) { pick = e; break; } }
    profile.coffins++; const key = pick.kind + ":" + pick.it.id; profile.unlocked.push(key);
    checkUnlocks(); persist(800); updatePips(); Telemetry.emit("shop_buy", { kind: pick.kind, id: pick.it.id, price: Economy.COFFIN, cur: "coffin" });
    return pick;
  }
  function openCoffin(rnd = Math.random) {
    if (!coffinPool().length || !soulsOpen()) return Promise.resolve(null);
    let got = null;
    return Souls.ask("openCoffinSouls", {}, () => { got = drawCoffinPick(rnd); }).then(() => got);
  }

  // ── the sheet: the day's deal, the coffin, then the exclusives shelf by shelf
  function cartTile(d, grid) {
    const { kind, it } = d, owned = canUse(kind, it), on = cos[kind] === it.id, sel = cart.sel && cart.sel.kind === kind && cart.sel.id === it.id;
    const b = document.createElement("button"); b.type = "button"; b.className = "item rar-" + rarityOf(it) + (on ? " equipped" : owned ? " owned" : "") + (sel ? " selected" : "");
    b.dataset.kind = kind; b.dataset.id = it.id;
    b.setAttribute("aria-label", `${it.name} ${KIND_LABEL[kind]}, ${owned ? "owned" : `${fmtN(d.price)} Souls`}`);
    b.innerHTML = `<span class="stars r-${rarityOf(it)}" aria-hidden="true">${starsText(it)}</span>`;
    const cv = document.createElement("canvas"); b.appendChild(cv);
    b.insertAdjacentHTML("beforeend", `<span>${it.name}</span><span class="kindtag">${KIND_LABEL[kind]}</span>` +
      (owned ? `<span class="state">${on ? "Wearing" : "Owned"}</span>` : `<span class="state"><span class="price soul">◆ ${fmtN(d.price)}</span>${d.off ? ` <s>${fmtN(it.souls)}</s>` : ""}</span>`));
    if (d.off && !owned) b.insertAdjacentHTML("beforeend", `<span class="sale">−${Math.round(d.off * 100)}%</span>`);
    drawItemIcon(cv, kind, it.id);
    grid.appendChild(b);
  }
  function renderStore() {
    const deals = dailyDeals(), ex = exclusives();
    const dg = $("dealGrid"), eg = $("exclGrid"); dg.innerHTML = ""; eg.innerHTML = "";
    deals.forEach(d => cartTile(d, dg));
    for (const kind of KINDS) {   // (shelf by shelf, as the Vault orders them)
      const L = ex.filter(d => d.kind === kind); if (!L.length) continue;
      eg.insertAdjacentHTML("beforeend", `<h4 class="cart-shelf">${CAT_LABEL[kind] || KIND_LABEL[kind]}</h4>`);
      const g = document.createElement("div"); g.className = "grid"; eg.appendChild(g); L.forEach(d => cartTile(d, g));
    }
    $("exclCount").textContent = `${ex.filter(d => canUse(d.kind, d.it)).length}/${ex.length} owned`;
    $("dealTimer").textContent = `new in ${fmtCountdown(msToReset())}`;
    const left = coffinPool().length, cb = $("coffinBtn"), open = soulsOpen();
    cb.disabled = !left || !open || Souls.busy || (Souls.wallet && Souls.wallet.souls < Economy.COFFIN);
    cb.innerHTML = !left ? "The coffin's empty" : `Open · ◆ ${fmtN(Economy.COFFIN)}`;
    $("coffinNote").textContent = left ? `${left} Vault looks you don't own yet could be inside` : "You own everything it could hold. Show-off.";
    $("cartStatus").hidden = open; $("cartStatus").textContent = !Souls.available() ? t("cart.offline") : Souls.state === "loading" ? t("souls.loading") : t("souls.error");
    if (profile.dealSeen !== dayKey()) { profile.dealSeen = dayKey(); persist(2000); updatePips(); }
    renderCartBar();
  }
  function renderCartBar() {
    const bar = $("cartBar"), s = cart.sel, it = s && findItem(s.kind, s.id);
    if (!it) { bar.hidden = true; return; }
    const owned = canUse(s.kind, it), price = cartPrice(s.kind, s.id), have = Souls.wallet ? Souls.wallet.souls : 0, need = (price || 0) - have, btn = $("cartBuy");
    bar.hidden = false;
    $("cartName").textContent = `${it.name} ${KIND_LABEL[s.kind]}`;
    $("cartSub").textContent = owned ? (cos[s.kind] === s.id ? "You're wearing it" : "Yours already") : it.shop ? `Curio Cart exclusive · Souls only · you have ◆ ${fmtN(have)}` : "";
    if (owned) { btn.disabled = cos[s.kind] === s.id; btn.textContent = cos[s.kind] === s.id ? "Wearing it" : "Wear it"; return; }
    if (!soulsOpen()) { btn.disabled = true; btn.textContent = t("cart.shut"); return; }
    btn.disabled = need > 0 || Souls.busy;
    btn.textContent = need > 0 ? `Need ◆ ${fmtN(need)} more` : `Buy · ◆ ${fmtN(price)}`;
  }
  function cartSelect(kind, id) { cart.sel = { kind, id }; cart.bounce = 1; kick(cart.R, 1.2, 0, Math.PI / 2, 300, 10); renderStore(); }
  for (const g of ["dealGrid", "exclGrid"]) $(g).addEventListener("click", e => {
    const b = e.target.closest(".item"); if (!b) return;
    Sound.ui("tick"); cartSelect(b.dataset.kind, b.dataset.id);
  });
  $("cartBuy").addEventListener("click", () => {
    const s = cart.sel; if (!s) return;
    const it = findItem(s.kind, s.id);
    if (canUse(s.kind, it)) { equip(s.kind, s.id); Sound.ui("equip"); renderStore(); return; }
    cartBuy(s.kind, s.id).then(ok => { if (!ok) { Sound.ui("deny"); const btn = $("cartBuy"); btn.classList.remove("deny"); void btn.offsetWidth; btn.classList.add("deny"); } else for (const el of document.querySelectorAll(".souls-chip")) bump(el); });
  });
  $("coffinBtn").addEventListener("click", () => {
    openCoffin().then(got => {
      if (!got) { Sound.ui("deny"); return; }
      cart.won = got; cart.sel = { kind: got.kind, id: got.it.id }; startCoffinShow(got); renderStore();
    });
  });

  // ── Mort's shop, drawn live at the top of the sheet: a crowded back wall, a heavy counter, and Mort
  // leaning on his glove looking bored by whatever you're considering. The wall is painted once per size.
  const parlour = { back: null, w: 0, h: 0 };
  const SHELF_JUNK = ["bottle", "jar", "book", "skull", "orb", "flask", "candle", "tin"];
  function paintJunk(c, kind, x, y, s, rnd) {
    const cols = ["#6E5A78", "#4E6E6A", "#7A6A50", "#5A5A72", "#6E4A4A"];
    c.fillStyle = cols[(rnd() * cols.length) | 0]; c.strokeStyle = INK; c.lineWidth = Math.max(1, s * 0.07); c.lineJoin = "round";
    c.save(); c.translate(x, y);
    if (kind === "bottle") { c.beginPath(); rr(c, -s * 0.3, -s * 0.75, s * 0.6, s * 0.75, s * 0.12); c.fill(); c.stroke(); c.beginPath(); rr(c, -s * 0.12, -s * 1.05, s * 0.24, s * 0.32, s * 0.05); c.fill(); c.stroke(); }
    else if (kind === "jar") { c.beginPath(); c.ellipse(0, -s * 0.4, s * 0.36, s * 0.42, 0, 0, TAU); c.fill(); c.stroke(); c.fillStyle = "#3A3038"; c.beginPath(); rr(c, -s * 0.22, -s * 0.92, s * 0.44, s * 0.16, s * 0.04); c.fill(); c.stroke(); }
    else if (kind === "book") { for (let i = 0; i < 3; i++) { c.fillStyle = cols[(i + 1) % cols.length]; c.beginPath(); rr(c, -s * 0.34 + i * s * 0.24, -s * (0.5 + i * 0.12), s * 0.2, s * (0.5 + i * 0.12), s * 0.03); c.fill(); c.stroke(); } }
    else if (kind === "skull") { c.fillStyle = "#B9AE94"; c.beginPath(); c.ellipse(0, -s * 0.42, s * 0.34, s * 0.32, 0, 0, TAU); c.fill(); c.stroke(); c.fillStyle = INK; for (const sd of [-1, 1]) { c.beginPath(); c.ellipse(sd * s * 0.13, -s * 0.46, s * 0.09, s * 0.11, 0, 0, TAU); c.fill(); } c.fillStyle = "#B9AE94"; c.beginPath(); rr(c, -s * 0.2, -s * 0.18, s * 0.4, s * 0.18, s * 0.05); c.fill(); c.stroke(); }
    else if (kind === "orb") { c.beginPath(); c.arc(0, -s * 0.46, s * 0.36, 0, TAU); c.fill(); c.stroke(); c.fillStyle = "rgba(242,231,201,.3)"; c.beginPath(); c.arc(-s * 0.12, -s * 0.58, s * 0.1, 0, TAU); c.fill(); c.fillStyle = "#4A3A2A"; c.beginPath(); rr(c, -s * 0.26, -s * 0.16, s * 0.52, s * 0.16, s * 0.04); c.fill(); c.stroke(); }
    else if (kind === "flask") { c.beginPath(); c.moveTo(-s * 0.08, -s * 0.9); c.lineTo(s * 0.08, -s * 0.9); c.lineTo(s * 0.38, 0); c.lineTo(-s * 0.38, 0); c.closePath(); c.fill(); c.stroke(); }
    else if (kind === "candle") { c.fillStyle = "#D9C9A5"; c.beginPath(); rr(c, -s * 0.1, -s * 0.8, s * 0.2, s * 0.8, s * 0.04); c.fill(); c.stroke(); c.fillStyle = "#E3B64B"; c.beginPath(); c.ellipse(0, -s * 0.92, s * 0.07, s * 0.13, 0, 0, TAU); c.fill(); }
    else { c.beginPath(); rr(c, -s * 0.34, -s * 0.5, s * 0.68, s * 0.5, s * 0.06); c.fill(); c.stroke(); c.strokeStyle = "rgba(242,231,201,.35)"; c.lineWidth = Math.max(1, s * 0.05); c.beginPath(); c.moveTo(-s * 0.22, -s * 0.3); c.lineTo(s * 0.22, -s * 0.3); c.stroke(); }
    c.restore();
  }
  // the back of the shop: plaster wall, two stacks of shelves crammed with junk, drapes and a lantern
  function paintShopBack(w, h) {
    const cv = document.createElement("canvas"), d = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(w * d); cv.height = Math.round(h * d);
    const c = cv.getContext("2d"); c.setTransform(d, 0, 0, d, 0, 0);
    const rnd = mulberry32(1933);
    const wall = c.createLinearGradient(0, 0, 0, h); wall.addColorStop(0, "#332A3C"); wall.addColorStop(1, "#1C1620");
    c.fillStyle = wall; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) { c.fillStyle = `rgba(0,0,0,${0.04 + rnd() * 0.06})`; c.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 9, 1 + rnd() * 3); }
    const CY = h * 0.66;                                   // where the counter top sits
    for (const side of [-1, 1]) {                          // a shelf stack either side of Mort
      const bw = w * 0.35, bx = side < 0 ? 0 : w - bw;
      c.fillStyle = "#2A2028"; c.fillRect(bx, 0, bw, CY);
      for (let row = 0; row < 3; row++) {
        const y = h * (0.18 + row * 0.18);
        c.fillStyle = "#5B3B20"; c.strokeStyle = INK; c.lineWidth = 2; c.beginPath(); rr(c, bx - 2, y, bw + 4, h * 0.028, 2); c.fill(); c.stroke();
        let x = bx + w * 0.02;
        while (x < bx + bw - w * 0.03) {
          const s = h * (0.07 + rnd() * 0.045);
          paintJunk(c, SHELF_JUNK[(rnd() * SHELF_JUNK.length) | 0], x + s * 0.4, y, s, rnd);
          x += s * (0.85 + rnd() * 0.5);
        }
      }
    }
    {                                                     // a notice nailed to the middle of the wall
      const bx = w * 0.46, by = h * 0.17, bw2 = w * 0.16, bh = h * 0.2;
      c.save(); c.translate(bx, by); c.rotate(-0.03);
      c.fillStyle = "#5B3B20"; c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); rr(c, -bw2 / 2, 0, bw2, bh, 3); c.fill(); c.stroke();
      c.fillStyle = "#D9C9A5"; c.beginPath(); rr(c, -bw2 / 2 + 4, 4, bw2 - 8, bh - 8, 2); c.fill();
      c.fillStyle = "#3A2F26"; c.font = `700 ${Math.max(6, h * 0.05)}px ${UIFONT}`; c.textAlign = "center"; c.textBaseline = "top";
      c.fillText("NO", 0, bh * 0.16); c.fillText("REFUNDS", 0, bh * 0.52);
      c.restore();
      c.strokeStyle = INK; c.lineWidth = 2; c.beginPath(); c.moveTo(bx, 0); c.lineTo(bx, by); c.stroke();
    }
    for (const side of [-1, 1]) {                          // heavy drapes in the top corners
      const x0 = side < 0 ? 0 : w;
      c.save(); c.fillStyle = side < 0 ? "#7A3530" : "#46543F"; c.strokeStyle = INK; c.lineWidth = 3;
      c.beginPath(); c.moveTo(x0, -2); c.lineTo(x0 + side * w * 0.34, -2);
      c.quadraticCurveTo(x0 + side * w * 0.26, h * 0.2, x0 + side * w * 0.13, h * 0.3);
      c.quadraticCurveTo(x0 + side * w * 0.05, h * 0.16, x0, h * 0.18); c.closePath(); c.fill(); c.stroke();
      c.strokeStyle = "rgba(0,0,0,.35)"; c.lineWidth = 2;
      for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(x0 + side * w * 0.05 * i, 0); c.quadraticCurveTo(x0 + side * w * 0.06 * i, h * 0.1, x0 + side * w * 0.03 * i, h * 0.16); c.stroke(); }
      c.restore();
    }
    return { c: cv, w, h, CY };
  }
  function shopBack(w, h) {
    if (!parlour.back || parlour.w !== w || parlour.h !== h) { parlour.back = paintShopBack(w, h); parlour.w = w; parlour.h = h; }
    return parlour.back;
  }
  // Mort himself, a ghoul wizard, chin in one glove, elbow on the counter, thoroughly unimpressed
  function drawMort(c, x, y, s, T, lookAt) {
    const tt = Math.floor(T * 12) / 12, bob = Math.sin(tt * 2.6) * s * 0.02 - (cart.bounce > 0 ? Math.sin(cart.bounce * Math.PI) * s * 0.07 : 0);
    c.save(); c.translate(x, y + bob); c.lineJoin = "round"; c.lineCap = "round"; c.strokeStyle = INK; c.lineWidth = Math.max(2, s * 0.03);
    // body (v46: Mort's a wizard now): a pear of a ghoul in a starry robe, gold-trimmed down the front, cut off by the counter
    const robe = () => { c.beginPath(); c.moveTo(-s * 0.46, s * 0.95); c.bezierCurveTo(-s * 0.62, s * 0.2, -s * 0.42, -s * 0.5, 0, -s * 0.55); c.bezierCurveTo(s * 0.42, -s * 0.5, s * 0.62, s * 0.2, s * 0.46, s * 0.95); c.closePath(); };
    c.fillStyle = "#3B2A6E"; robe(); c.fill(); c.stroke();
    c.save(); robe(); c.clip(); c.fillStyle = "rgba(0,0,0,.22)"; c.fillRect(s * 0.14, -s, s, s * 2);   // (the side away from the lantern)
    c.fillStyle = "#E8D38A"; for (const [sx, sy, r] of [[-0.3, 0.3, 0.05], [0.28, 0.1, 0.045], [-0.2, 0.72, 0.04], [0.3, 0.62, 0.05], [0.05, -0.2, 0.035]]) { star(c, sx * s, sy * s, r * s, 5, 0.45, tt); c.fill(); }
    c.beginPath(); c.arc(-s * 0.08, s * 0.08, s * 0.06, 0.6, 5.1); c.arc(-s * 0.05, s * 0.07, s * 0.05, 4.9, 0.8, true); c.fill();   // a little moon
    c.restore();
    c.strokeStyle = GOLD; c.lineWidth = s * 0.05; c.beginPath(); c.moveTo(-s * 0.1, s * 0.95); c.quadraticCurveTo(-s * 0.12, s * 0.3, 0, -s * 0.12); c.moveTo(s * 0.1, s * 0.95); c.quadraticCurveTo(s * 0.12, s * 0.3, 0, -s * 0.12); c.stroke();
    c.strokeStyle = INK; c.lineWidth = Math.max(2, s * 0.03);
    // the propping forearm: it comes up out of the counter and ends in a glove under his cheek
    c.strokeStyle = INK; c.lineWidth = s * 0.17; c.lineCap = "round";
    c.beginPath(); c.moveTo(-s * 0.56, s * 0.95); c.quadraticCurveTo(-s * 0.62, s * 0.3, -s * 0.46, -s * 0.02); c.stroke();
    c.strokeStyle = "#5E6E58"; c.lineWidth = s * 0.115; c.stroke();
    // head, tipped into the propping glove
    c.save(); c.rotate(-0.2); c.translate(-s * 0.06, s * 0.02);
    const look = clamp((lookAt || 0) * 1.1, -1.2, 1.2);
    for (const sd of [-1, 1]) {
      const px = sd * s * 0.16, py = -s * 0.3;
      c.fillStyle = CREAM; c.strokeStyle = INK; c.lineWidth = Math.max(2, s * 0.025);
      c.beginPath(); c.ellipse(px, py, s * 0.11, s * 0.13, 0, 0, TAU); c.fill(); c.stroke();
      c.fillStyle = INK; c.beginPath(); c.ellipse(px + look * s * 0.055, py + s * 0.025, s * 0.052, s * 0.072, 0, 0, TAU); c.fill();
      c.strokeStyle = INK; c.lineWidth = Math.max(2, s * 0.03);     // a heavy, bored lid
      c.beginPath(); c.moveTo(px - s * 0.12, py - s * 0.09); c.quadraticCurveTo(px, py - s * 0.16, px + s * 0.12, py - s * 0.07); c.stroke();
    }
    c.fillStyle = "#1A1510"; c.strokeStyle = INK; c.lineWidth = Math.max(2, s * 0.025);   // a sly one-sided grin
    c.beginPath(); c.moveTo(-s * 0.18, -s * 0.03); c.quadraticCurveTo(0, s * 0.14, s * 0.22, -s * 0.06); c.quadraticCurveTo(0, s * 0.02, -s * 0.18, -s * 0.03); c.fill(); c.stroke();
    c.fillStyle = CREAM; for (let k = -1; k <= 1; k++) c.fillRect(k * s * 0.07 - s * 0.024, -s * 0.05 + Math.abs(k) * s * 0.012, s * 0.048, s * 0.05);
    // a wispy grey beard under the grin
    c.fillStyle = "#D8D4CC"; c.strokeStyle = INK; c.lineWidth = Math.max(2, s * 0.025);
    c.beginPath(); c.moveTo(-s * 0.2, s * 0.05); c.quadraticCurveTo(-s * 0.16, s * 0.3, s * 0.02 + Math.sin(tt * 2) * s * 0.02, s * 0.44); c.quadraticCurveTo(s * 0.2, s * 0.28, s * 0.24, s * 0.02); c.quadraticCurveTo(s * 0.02, s * 0.12, -s * 0.2, s * 0.05); c.closePath(); c.fill(); c.stroke();
    c.strokeStyle = "rgba(90,84,76,.6)"; c.lineWidth = Math.max(1, s * 0.012); for (const bx of [-0.08, 0.02, 0.11]) { c.beginPath(); c.moveTo(bx * s, s * 0.12); c.quadraticCurveTo(bx * s + s * 0.02, s * 0.25, bx * s * 0.4, s * 0.36); c.stroke(); }
    // the wizard's hat: tall, crooked, starred, with a gold band and a moon on the front
    c.fillStyle = "#2E2260"; c.strokeStyle = INK; c.lineWidth = Math.max(2, s * 0.03);
    const tip = Math.sin(tt * 1.7) * s * 0.03;
    c.beginPath(); c.moveTo(-s * 0.3, -s * 0.54); c.quadraticCurveTo(-s * 0.16, -s * 0.8, -s * 0.02, -s * 0.98); c.quadraticCurveTo(s * 0.12, -s * 1.12, s * 0.36 + tip, -s * 1.02); c.quadraticCurveTo(s * 0.16, -s * 0.94, s * 0.12, -s * 0.84); c.quadraticCurveTo(s * 0.2, -s * 0.66, s * 0.3, -s * 0.54); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.ellipse(0, -s * 0.54, s * 0.42, s * 0.075, -0.06, 0, TAU); c.fill(); c.stroke();
    c.fillStyle = GOLD; c.beginPath(); c.moveTo(-s * 0.27, -s * 0.6); c.quadraticCurveTo(0, -s * 0.66, s * 0.27, -s * 0.6); c.lineTo(s * 0.25, -s * 0.66); c.quadraticCurveTo(0, -s * 0.72, -s * 0.25, -s * 0.66); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = "#E8D38A"; c.beginPath(); c.arc(-s * 0.04, -s * 0.78, s * 0.06, 0.7, 5.3); c.arc(-s * 0.01, -s * 0.79, s * 0.05, 5.1, 0.9, true); c.fill();
    star(c, s * 0.1, -s * 0.9, s * 0.035, 5, 0.45, 0); c.fill();
    const tw = 0.5 + 0.5 * Math.sin(T * 5); c.globalAlpha = tw; c.fillStyle = "#FFF3C0"; star(c, s * 0.42 + tip, -s * 1.06, s * 0.05 * (0.6 + tw * 0.6), 4, 0.3, 0); c.fill(); c.globalAlpha = 1;
    c.restore();
    c.strokeStyle = INK; c.lineWidth = Math.max(2, s * 0.025); c.fillStyle = "#F7F1DF";
    c.beginPath(); c.arc(-s * 0.44, -s * 0.06, s * 0.15, 0, TAU); c.fill(); c.stroke();
    for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(-s * (0.5 + k * 0.04), -s * (0.16 + (k % 2) * 0.03), s * 0.045, 0, TAU); c.fill(); c.stroke(); }
    c.restore();
  }
  // his arms, laid on the counter — drawn after it so they rest on top of the wood
  function drawMortArms(c, x, y, s, T) {
    const tt = Math.floor(T * 12) / 12, bob = Math.sin(tt * 2.6) * s * 0.02 - (cart.bounce > 0 ? Math.sin(cart.bounce * Math.PI) * s * 0.07 : 0);
    c.save(); c.translate(x, y + bob); c.lineJoin = "round"; c.lineCap = "round";
    const hose = (x1, y1, cx1, cy1, x2, y2) => {
      c.strokeStyle = INK; c.lineWidth = s * 0.17; c.beginPath(); c.moveTo(x1, y1); c.quadraticCurveTo(cx1, cy1, x2, y2); c.stroke();
      c.strokeStyle = "#5E6E58"; c.lineWidth = s * 0.115; c.stroke();
    };
    const glove = (gx, gy, flip) => {
      c.strokeStyle = INK; c.lineWidth = Math.max(2, s * 0.025); c.fillStyle = "#F7F1DF";
      c.beginPath(); c.arc(gx, gy, s * 0.14, 0, TAU); c.fill(); c.stroke();
      for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(gx + flip * s * (0.03 + k * 0.05), gy - s * (0.12 + (k % 2) * 0.02), s * 0.042, 0, TAU); c.fill(); c.stroke(); }
    };
    hose(s * 0.38, s * 0.5, s * 0.72, s * 0.34, s * 0.84, s * 0.08);       // his other arm, laid along the counter
    { const wx = s * 0.92, wy = s * 0.02, ex = s * 1.22, ey = -s * 0.34, tw = 0.5 + 0.5 * Math.sin(T * 6);   // his wand, held loosely, sparking now and then
      c.strokeStyle = INK; c.lineWidth = s * 0.06; c.beginPath(); c.moveTo(wx, wy); c.lineTo(ex, ey); c.stroke();
      c.strokeStyle = "#5A3A22"; c.lineWidth = s * 0.035; c.stroke(); c.strokeStyle = "#F2E7C9"; c.lineWidth = s * 0.035; c.beginPath(); c.moveTo(ex - (ex - wx) * 0.12, ey - (ey - wy) * 0.12); c.lineTo(ex, ey); c.stroke();
      c.fillStyle = `rgba(255,243,192,${0.35 + 0.5 * tw})`; star(c, ex, ey, s * (0.06 + 0.04 * tw), 4, 0.35, T * 2); c.fill();
      if (cart.bounce > 0) { c.fillStyle = "#FFE36A"; for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + T * 4, d = s * (0.1 + 0.25 * (1 - cart.bounce / 1.4)); star(c, ex + Math.cos(a) * d, ey + Math.sin(a) * d, s * 0.03, 5, 0.45, a); c.fill(); } } }
    glove(s * 0.9, s * 0.05, 1);
    c.restore();
  }
  // the counter: a slab of waxed wood with drawers under it, drawn over Mort so he stands behind it
  function drawCounter(c, w, h, CY) {
    const top = CY, lip = h * 0.075;
    c.fillStyle = "#4A2F19"; c.fillRect(0, top + lip, w, h - top - lip);
    const g = c.createLinearGradient(0, top, 0, top + lip);
    g.addColorStop(0, "#A0743F"); g.addColorStop(1, "#6B4526");
    c.fillStyle = g; c.strokeStyle = INK; c.lineWidth = 3;
    c.beginPath(); rr(c, -4, top, w + 8, lip, 3); c.fill(); c.stroke();
    c.strokeStyle = "rgba(0,0,0,.25)"; c.lineWidth = 1.5;
    for (let i = 1; i < 5; i++) { const y = top + lip * (i / 5); c.beginPath(); c.moveTo(w * 0.02, y); c.bezierCurveTo(w * 0.3, y - 2, w * 0.7, y + 2, w * 0.98, y); c.stroke(); }
    for (const [dx, dw] of [[0.04, 0.42], [0.54, 0.42]]) {      // two drawer faces
      c.fillStyle = "#5B3B20"; c.strokeStyle = INK; c.lineWidth = 2.5;
      c.beginPath(); rr(c, w * dx, top + lip + h * 0.035, w * dw, h * 0.18, 4); c.fill(); c.stroke();
      c.fillStyle = "#3A2513"; c.beginPath(); rr(c, w * (dx + dw * 0.34), top + lip + h * 0.075, w * dw * 0.32, h * 0.035, 3); c.fill(); c.stroke();
    }
  }
  function drawCart(T, dt) {
    const cv = $("cartCv"), [c, r] = fitCanvas(cv); if (!r.width) return;
    const w = r.width, h = r.height;
    cart.bounce = Math.max(0, cart.bounce - dt * 2.5);
    const back = shopBack(w, h), CY = back.CY;
    c.drawImage(back.c, 0, 0, w, h);
    // the lantern over the counter, swinging a little, throwing a warm pool
    const sw = Math.sin(T * 1.4) * 0.07, lx = w * 0.86, ly = h * 0.1;
    c.save(); c.translate(lx, 0); c.rotate(sw); c.strokeStyle = INK; c.lineWidth = 2;
    c.beginPath(); c.moveTo(0, -4); c.lineTo(0, ly); c.stroke();
    const fl = 0.82 + 0.18 * Math.sin(T * 9) * Math.sin(T * 3.3);
    c.fillStyle = "#3A2F26"; c.beginPath(); rr(c, -h * 0.045, ly, h * 0.09, h * 0.11, 3); c.fill(); c.stroke();
    c.fillStyle = `rgba(255,208,110,${0.85 * fl})`; c.beginPath(); rr(c, -h * 0.028, ly + h * 0.02, h * 0.056, h * 0.07, 2); c.fill();
    c.restore();
    const pool = c.createRadialGradient(lx, ly + h * 0.1, 0, lx, ly + h * 0.1, h * 0.7);
    pool.addColorStop(0, `rgba(255,200,110,${0.16 * fl})`); pool.addColorStop(1, "rgba(255,200,110,0)");
    c.fillStyle = pool; c.fillRect(0, 0, w, h);
    const ms = h * 0.52, mx = Math.min(w * 0.72, w - ms * 1.02), my = CY - h * 0.04;
    drawMort(c, mx, my, ms, T, cart.sel ? -1 : Math.sin(T * 0.7) * 0.5);
    drawCounter(c, w, h, CY);
    drawMortArms(c, mx, my, ms, T);
    // the thing you're looking at, sitting on the counter under a glow
    const d0 = cart.sel ? { kind: cart.sel.kind, id: cart.sel.id } : (() => { const d = dailyDeals()[0]; return { kind: d.kind, id: d.it.id }; })();
    const cx = w * 0.23, cy = CY - h * 0.01, sz = h * 0.4;
    const halo = c.createRadialGradient(cx, cy - sz * 0.45, 0, cx, cy - sz * 0.45, sz * 1.15);
    halo.addColorStop(0, "rgba(255,244,205,.72)"); halo.addColorStop(0.5, "rgba(255,225,150,.22)"); halo.addColorStop(1, "rgba(255,225,150,0)");
    c.fillStyle = halo; c.fillRect(cx - sz * 1.3, cy - sz * 1.7, sz * 2.6, sz * 2.6);
    c.fillStyle = "#4E7E76"; c.strokeStyle = INK; c.lineWidth = 2.5;       // a little dish to show it on
    c.beginPath(); c.moveTo(cx - sz * 0.5, cy - sz * 0.16); c.quadraticCurveTo(cx, cy + sz * 0.22, cx + sz * 0.5, cy - sz * 0.16); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = "#8FC4BA"; c.beginPath(); rr(c, cx - sz * 0.54, cy - sz * 0.24, sz * 1.08, sz * 0.1, sz * 0.05); c.fill(); c.stroke();
    // the tin beside it, chalked with the house rule
    const tx = cx + sz * 0.62, ty = cy - sz * 0.01;
    c.fillStyle = "#6E6256"; c.beginPath(); rr(c, tx - sz * 0.22, ty - sz * 0.24, sz * 0.44, sz * 0.24, 3); c.fill(); c.stroke();
    c.fillStyle = CREAM; c.font = `700 ${Math.max(7, sz * 0.1)}px ${UIFONT}`; c.textAlign = "center"; c.textBaseline = "middle";
    c.fillText("SOULS", tx, ty - sz * 0.115);
    c.save(); const pop = cart.bounce > 0 ? 1 + Math.sin(cart.bounce * Math.PI) * 0.12 : 1, bob = Math.sin(T * 2.2) * sz * 0.03;
    c.translate(cx - sz * 0.5 * pop, cy - sz * 1.05 + bob); c.scale((sz / 52) * pop, (sz / 52) * pop); drawItemArt(c, d0.kind, d0.id, T); c.restore();
    $("cartQuip").textContent = MORT_QUIPS[(Math.floor(T / 6) + cart.quip) % MORT_QUIPS.length];
  }

  // ── v45: the Mystery Coffin, opened: a viewport opens on a row of coffins sliding right to left, slowing, until one
  // stops under the lamp; its lid flies off and the look inside rises out of it
  const COFFIN_SHOW = { n: 26, land: 21, spin: 3.1, open: 0.55 };
  const coffinEl = $("coffinShow");
  function startCoffinShow(got) {
    cart.show = { t0: uiNow(), got, done: false };
    $("coffinWon").textContent = ""; $("coffinKeep").hidden = true; $("coffinWear").hidden = true;
    coffinEl.hidden = false; Sound.toon("whistleDown");
  }
  function endCoffinShow(wear) {
    const S = cart.show; if (!S) return;
    if (wear) { equip(S.got.kind, S.got.it.id); Sound.ui("equip"); }
    cart.show = null; coffinEl.hidden = true; renderStore();
  }
  $("coffinKeep").addEventListener("click", () => endCoffinShow(false));
  $("coffinWear").addEventListener("click", () => endCoffinShow(true));
  function drawCoffinShape(c, x, y, s, lid) {   // a six-sided coffin, lid on (lid 0) or flown off (lid 1)
    c.save(); c.translate(x, y); c.lineJoin = "round"; c.strokeStyle = INK; c.lineWidth = Math.max(2, s * 0.05);
    const P = [[-0.3, -0.62], [0.3, -0.62], [0.44, -0.24], [0.3, 0.62], [-0.3, 0.62], [-0.44, -0.24]];
    const path = k => { c.beginPath(); P.forEach(([px, py], i) => (i ? c.lineTo : c.moveTo).call(c, px * s * k, py * s * k)); c.closePath(); };
    path(1); c.fillStyle = "#2A1A0E"; c.fill(); c.stroke();                       // the box
    if (lid < 1) { c.save(); c.translate(lid * s * 0.9, -lid * s * 1.2); c.rotate(lid * 1.4); path(0.92); c.fillStyle = "#6B4526"; c.fill(); c.stroke();
      c.strokeStyle = "#E3B64B"; c.lineWidth = Math.max(2, s * 0.05); c.beginPath(); c.moveTo(0, -s * 0.34); c.lineTo(0, s * 0.3); c.moveTo(-s * 0.15, -s * 0.14); c.lineTo(s * 0.15, -s * 0.14); c.stroke(); c.restore(); }
    c.restore();
  }
  function drawCoffinShow(T) {
    const S = cart.show; if (!S) return;
    const cv = $("coffinCv"), [c, r] = fitCanvas(cv); if (!r.width) return;
    const w = r.width, h = r.height, e = uiNow() - S.t0, C = COFFIN_SHOW, gap = Math.min(w * 0.3, h * 0.42), s = gap * 0.8, cy = h * 0.52;
    c.fillStyle = "#140F18"; c.fillRect(0, 0, w, h);
    const lamp = c.createRadialGradient(w / 2, cy - s * 0.2, 0, w / 2, cy, h * 0.6); lamp.addColorStop(0, "rgba(255,210,130,.35)"); lamp.addColorStop(1, "rgba(255,210,130,0)");
    c.fillStyle = lamp; c.fillRect(0, 0, w, h);
    c.fillStyle = "#3A2513"; c.fillRect(0, cy + s * 0.62, w, h);   // the conveyor
    c.fillStyle = "rgba(0,0,0,.35)"; for (let i = -1; i < w / 24 + 1; i++) c.fillRect(i * 24 + ((-e * 300) % 24 + 24) % 24, cy + s * 0.62, 3, h);
    // where the row is: ease out from a fast slide to a stop with coffin C.land under the lamp
    const q = clamp(e / C.spin, 0, 1), ease = 1 - Math.pow(1 - q, 3), pos = ease * C.land;   // coffins passed
    for (let i = 0; i < C.n; i++) {
      const x = w / 2 + (i - pos) * gap; if (x < -gap || x > w + gap) continue;
      const lands = i === C.land, lid = lands ? clamp((e - C.spin - 0.15) / C.open, 0, 1) : 0;
      drawCoffinShape(c, x, cy + (lands && q >= 1 ? Math.sin(Math.min(1, (e - C.spin) / 0.15) * Math.PI) * -s * 0.06 : 0), s, easeOutBack(lid) * (lid > 0 ? 1 : 0));
      if (!lands || lid < 0.3) { c.fillStyle = "rgba(227,182,75,.5)"; c.font = `${Math.round(s * 0.28)}px ${DISPLAY}`; c.textAlign = "center"; c.textBaseline = "middle"; if (!lands || lid === 0) c.fillText("?", x, cy + s * 0.18); }
      if (lands && lid > 0) {   // the look rises out of it, under a burst
        const up = clamp((e - C.spin - 0.3) / 0.5, 0, 1), sz = s * 0.9 * easeOutBack(up);
        if (up > 0) {
          c.save(); c.globalAlpha = up; c.fillStyle = MUSTARD; for (let k = 0; k < 10; k++) { const a = (k / 10) * TAU + e; star(c, x + Math.cos(a) * s * 0.75, cy - s * 0.35 + Math.sin(a) * s * 0.55, s * 0.06, 5, 0.45, a); c.fill(); } c.restore();
          c.save(); c.translate(x - sz / 2, cy - s * 0.35 - sz / 2 - up * s * 0.12); c.scale(sz / 52, sz / 52); drawItemArt(c, S.got.kind, S.got.it.id, T); c.restore();
        }
      }
    }
    if (q >= 1 && !S.done && e > C.spin + 0.8) {
      S.done = true; Sound.unlock(); Sound.toon("kaboom");
      $("coffinWon").textContent = `${S.got.it.name} ${KIND_LABEL[S.got.kind]} · ${STAR_NAME[starsOf(S.got.it)]}`; $("coffinKeep").hidden = false; $("coffinWear").hidden = false;
      if (ui.kbd) $("coffinWear").focus({ preventScroll: true });
    }
    if (!S.done && q < 1 && Math.floor(pos) !== S.tick) { S.tick = Math.floor(pos); Sound.ui("tick"); }
  }
