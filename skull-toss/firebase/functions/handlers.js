  // ───────────────────────── the server's handlers (Cloud Functions, and the game's stand-in) ─────────────────────────
  // Each handler is plain JavaScript over a tiny database interface, so the same code runs in Cloud Functions
  // (index.js adapts Firestore to it) and inside the game's dev build (a stand-in server the spec drives). A
  // handler gets { db, uid, data, now } and returns a plain object; it throws { code, message } to refuse.
  //   db.tx(fn): run fn(t) as one transaction, where t.get(path) → object|null and t.set(path, obj)
  // Paths: wallets/<uid> (balance and owned items), receipts/<id> (each store receipt, once), ledger/<uid>_<n>,
  // leaderboard/<uid> (the best checked run), weekly/<week>_<uid> (this week's), runs/<uid>_<time> (every run sent, for audit),
  // meta/<uid> (when this player last sent a run).
  const makeHandlers = (Economy, verifyReceipt, Runs) => {
    const refuse = (code, message) => { const e = new Error(message); e.code = code; throw e; };
    const signedIn = uid => { if (!uid || typeof uid !== "string") refuse("unauthenticated", "Sign in to use Souls"); };
    const walletPath = uid => `wallets/${uid}`;
    const log = (t, uid, entry, now) => t.set(`ledger/${uid}_${now}_${Math.floor(Math.random() * 1e6)}`, { uid, at: now, ...entry });
    return {
      // the balance and what it has bought (a read, for callers that can't listen to the document)
      async wallet({ db, uid }) { signedIn(uid); return db.tx(async t => Economy.cleanWallet(await t.get(walletPath(uid)))); },
      // spend Souls on a Soul Shop item: the price is the server's, never the caller's
      async buyWithSouls({ db, uid, data, now }) {
        signedIn(uid); const key = data && String(data.item || "");
        return db.tx(async t => {
          const r = Economy.buy(await t.get(walletPath(uid)), key);
          if (!r.ok) refuse(r.why === "short" ? "failed-precondition" : r.why === "owned" ? "already-exists" : "not-found", r.why);
          r.wallet.updatedAt = now; t.set(walletPath(uid), r.wallet); log(t, uid, { kind: "buy", item: key, souls: -r.spent }, now);
          return r.wallet;
        });
      },
      // the free daily Souls, once per UTC day
      async claimDailySouls({ db, uid, now }) {
        signedIn(uid);
        return db.tx(async t => {
          const r = Economy.claimDaily(await t.get(walletPath(uid)), now);
          if (!r.ok) refuse("already-exists", r.why);
          r.wallet.updatedAt = now; t.set(walletPath(uid), r.wallet); log(t, uid, { kind: "daily", souls: r.granted }, now);
          return r.wallet;
        });
      },
      // a store purchase: the receipt is checked with the store (verifyReceipt), credited once, and never twice
      async redeemPurchase({ db, uid, data, now }) {
        signedIn(uid);
        const platform = String((data && data.platform) || ""), receipt = String((data && data.receipt) || ""), product = String((data && data.product) || "");
        if (!Economy.PACKS[product]) refuse("not-found", "no-such-product");
        const check = await verifyReceipt({ platform, receipt, product });
        if (!check || !check.valid || check.product !== product || !check.id) refuse("permission-denied", "receipt-rejected");
        return db.tx(async t => {
          const rp = `receipts/${check.id.replace(/[^\w.-]/g, "_")}`;
          if (await t.get(rp)) refuse("already-exists", "receipt-used");
          const r = Economy.credit(await t.get(walletPath(uid)), product);
          r.wallet.updatedAt = now; t.set(walletPath(uid), r.wallet); t.set(rp, { uid, product, platform, at: now });
          log(t, uid, { kind: "purchase", product, souls: r.granted, receipt: check.id }, now);
          return r.wallet;
        });
      },
      // a finished Story run for the leaderboard: checked (shared/runs.js), rate-limited, kept for audit, and posted if
      // it beats the player's best (all-time and this week)
      async submitRun({ db, uid, data, now }) {
        signedIn(uid);
        if (!Runs) refuse("unimplemented", "no-run-rules");
        const c = Runs.check(data && data.run);
        if (!c.ok) refuse("invalid-argument", c.why);
        const r = c.run, week = Runs.weekOf(now);
        return db.tx(async t => {
          const meta = (await t.get(`meta/${uid}`)) || {};
          if (now - (meta.lastRun || 0) < 15000) refuse("resource-exhausted", "too-soon");
          t.set(`meta/${uid}`, { ...meta, lastRun: now });
          t.set(`runs/${uid}_${now}`, { uid, at: now, run: r, log: typeof (data && data.log) === "string" ? data.log.slice(0, 200000) : "" });
          const entry = { name: r.name, score: r.score, hits: r.hits, stage: r.stage, title: r.title, look: r.look, at: now };
          const best = await t.get(`leaderboard/${uid}`), wk = await t.get(`weekly/${week}_${uid}`);
          const isBest = !best || r.score > best.score, isWeek = !wk || r.score > wk.score;
          if (isBest) t.set(`leaderboard/${uid}`, entry);
          else if (best.name !== r.name) t.set(`leaderboard/${uid}`, { ...best, name: r.name });   // (a new headstone name follows the entry)
          if (isWeek) t.set(`weekly/${week}_${uid}`, { ...entry, week });
          return { accepted: true, best: isBest, weekBest: isWeek, week };
        });
      }
    };
  };
  if (typeof module !== "undefined" && module.exports) module.exports = makeHandlers;
