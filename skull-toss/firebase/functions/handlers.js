  // ───────────────────────── the server's handlers (Cloud Functions, and the game's stand-in) ─────────────────────────
  // Each handler is plain JavaScript over a tiny database interface, so the same code runs in Cloud Functions
  // (index.js adapts Firestore to it) and inside the game's dev build (a stand-in server the spec drives). A
  // handler gets { db, uid, data, now } and returns a plain object; it throws { code, message } to refuse.
  //   db.tx(fn): run fn(t) as one transaction, where t.get(path) → object|null, t.set(path, obj), and (optionally)
  //   t.inc(path, { field: n }), which adds to counters without reading them
  // Paths: wallets/<uid> (balance and owned items), receipts/<id> (each store receipt, once), ledger/<uid>_<n>,
  // leaderboard/<uid> (the best checked run), weekly/<week>_<uid> (this week's), runs/<uid>_<time> (every run sent, for audit),
  // meta/<uid> (when this player last sent a run), config/live (the live flags: 03d_flags.js in the game),
  // events/<day>_<uid>_<time> (a batch of play analytics, kept 30 days), metrics/<day>_<shard> (the day's counts, no
  // ids), ameta/<uid> (the analytics rate limit).
  // The callable handlers are the object's own keys. admin (not enumerable) holds the ones only support's tools and
  // the stores' refund notices may run, never a player.
  const makeHandlers = (Economy, verifyReceipt, Runs, Analytics) => {
    const refuse = (code, message) => { const e = new Error(message); e.code = code; throw e; };
    const signedIn = uid => { if (!uid || typeof uid !== "string") refuse("unauthenticated", "Sign in to use Souls"); };
    const walletPath = uid => `wallets/${uid}`;
    const log = (t, uid, entry, now) => t.set(`ledger/${uid}_${now}_${Math.floor(Math.random() * 1e6)}`, { uid, at: now, ...entry });
    // the live config: kill switches the server enforces too, and the oldest build it will take writes from
    const live = async t => (await t.get("config/live")) || {};
    const current = (L, data) => { const min = Number(L["build.min"]) || 0; if (min && (Number(data && data.build) || 0) < min) refuse("failed-precondition", "update-required"); };
    const inc = async (t, path, counts) => {
      if (t.inc) return t.inc(path, counts);
      const doc = (await t.get(path)) || {}; for (const [k, n] of Object.entries(counts)) doc[k] = (doc[k] || 0) + n; t.set(path, doc);
    };
    const shardOf = uid => { let h = 0; for (let i = 0; i < uid.length; i++) h = (h * 31 + uid.charCodeAt(i)) >>> 0; return h % 10; };
    const H = {
      // the balance and what it has bought (a read, for callers that can't listen to the document)
      async wallet({ db, uid }) { signedIn(uid); return db.tx(async t => Economy.cleanWallet(await t.get(walletPath(uid)))); },
      // spend Souls on a Soul Shop item: the price is the server's, never the caller's
      async buyWithSouls({ db, uid, data, now }) {
        signedIn(uid); const key = data && String(data.item || "");
        return db.tx(async t => {
          const L = await live(t); if (L["kill.souls"]) refuse("unavailable", "shop-closed"); current(L, data);
          const r = Economy.buy(await t.get(walletPath(uid)), key, Economy.dayOf(now));   // (the Cart's deal is the server's day's)
          if (!r.ok) refuse(r.why === "short" || r.why === "owed" ? "failed-precondition" : r.why === "owned" ? "already-exists" : "not-found", r.why);
          r.wallet.updatedAt = now; t.set(walletPath(uid), r.wallet); log(t, uid, { kind: "buy", item: key, souls: -r.spent }, now);
          return r.wallet;
        });
      },
      // v45: the Cart's Mystery Coffin, for Souls. The server takes the Souls; the game draws the look inside (a Vault
      // look, kept on the player's profile like any other)
      async openCoffinSouls({ db, uid, data, now }) {
        signedIn(uid);
        return db.tx(async t => {
          const L = await live(t); if (L["kill.souls"]) refuse("unavailable", "shop-closed"); current(L, data);
          const r = Economy.coffin(await t.get(walletPath(uid)));
          if (!r.ok) refuse("failed-precondition", r.why);
          r.wallet.updatedAt = now; t.set(walletPath(uid), r.wallet); log(t, uid, { kind: "coffin", souls: -r.spent }, now);
          return r.wallet;
        });
      },
      // the free daily Souls, once per UTC day
      async claimDailySouls({ db, uid, data, now }) {
        signedIn(uid);
        return db.tx(async t => {
          const L = await live(t); if (L["kill.souls"]) refuse("unavailable", "shop-closed"); current(L, data);
          const r = Economy.claimDaily(await t.get(walletPath(uid)), now);
          if (!r.ok) refuse("already-exists", r.why);
          r.wallet.updatedAt = now; t.set(walletPath(uid), r.wallet); log(t, uid, { kind: "daily", souls: r.granted }, now);
          return r.wallet;
        });
      },
      // a store purchase: the receipt is checked with the store (verifyReceipt), credited once, and never twice. (It
      // goes through even with the shop switched off: the player has paid.)
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
          const L = await live(t); if (L["kill.board"]) refuse("unavailable", "board-closed"); current(L, data);
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
      },
      // play analytics (v39), sent only with the player's consent: cut down to the shared list (shared/analytics.js),
      // kept 30 days as a batch, and added to the day's counts. Six batches a minute at most.
      async logEvents({ db, uid, data, now }) {
        signedIn(uid);
        if (!Analytics) refuse("unimplemented", "no-analytics");
        const events = Analytics.cleanBatch(data && data.events);
        if (!events.length) return { kept: 0 };
        const day = Economy.dayOf(now), session = String((data && data.session) || "").replace(/[^\w-]/g, "").slice(0, 40), build = Math.max(0, Math.floor(Number(data && data.build) || 0));
        return db.tx(async t => {
          const L = await live(t); if (L["kill.analytics"]) return { kept: 0, off: true };
          const m = (await t.get(`ameta/${uid}`)) || {}, win = Math.floor(now / 60000), n = m.win === win ? (m.n || 0) + 1 : 1;
          if (n > 6) refuse("resource-exhausted", "too-many");
          t.set(`ameta/${uid}`, { win, n });
          t.set(`events/${day}_${uid}_${now}_${n}`, { day, uid, session, build, at: now, expireAt: now + Analytics.KEEP_DAYS * 864e5, events });
          const counts = {};
          for (const e of events) {
            const by = e.name === "first" ? e.what : e.name === "run_end" || e.name === "run_start" ? e.mode : e.name === "boss_down" || e.name === "boss_start" ? e.kind : "";
            const k = `${e.name}${by ? "_" + by : ""}`.toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 48);   // (a funnel: first_throw, first_hit… by day)
            counts[k] = (counts[k] || 0) + 1;
          }
          await inc(t, `metrics/${day}_${shardOf(uid)}`, counts);
          return { kept: events.length };
        });
      }
    };
    // support and the stores only: refunds, make-goods and undoing a ledger entry (firebase/tools/admin.js, and the
    // stores' refund notices in index.js). Every one is written to the ledger like everything else.
    const admin = {
      // a store refund: the pack's Souls come back off the wallet it credited (owed where they're gone), once
      async revokeReceipt({ db, data, now }) {
        const id = String((data && data.receipt) || "").replace(/[^\w.-]/g, "_"); if (!id) refuse("invalid-argument", "no-receipt");
        return db.tx(async t => {
          const rp = `receipts/${id}`, rec = await t.get(rp);
          if (!rec) refuse("not-found", "no-such-receipt");
          if (rec.revoked) return { already: true, uid: rec.uid };
          const r = Economy.revoke(await t.get(walletPath(rec.uid)), Economy.PACKS[rec.product] || 0);
          r.wallet.updatedAt = now; t.set(walletPath(rec.uid), r.wallet); t.set(rp, { ...rec, revoked: now });
          log(t, rec.uid, { kind: "refund", product: rec.product, souls: -r.taken, owed: r.wallet.owed, receipt: id }, now);
          return { uid: rec.uid, wallet: r.wallet };
        });
      },
      // Souls in (a make-good) or out (a correction), with the reason on the ledger
      async grant({ db, data, now }) {
        const uid = String((data && data.uid) || ""), n = Math.trunc(Number(data && data.souls) || 0), why = String((data && data.reason) || "").slice(0, 200);
        if (!uid || !n || Math.abs(n) > 100000 || !why) refuse("invalid-argument", "uid, souls (±100000) and a reason");
        return db.tx(async t => {
          const r = Economy.adjust(await t.get(walletPath(uid)), n);
          r.wallet.updatedAt = now; t.set(walletPath(uid), r.wallet); log(t, uid, { kind: "grant", souls: n, reason: why }, now);
          return { uid, wallet: r.wallet };
        });
      },
      // undo one ledger entry (the economy's rollback): a purchase comes off and its Souls go back, a daily claim or a
      // grant is taken back. Marked so it can't be undone twice.
      async reverse({ db, data, now }) {
        const id = String((data && data.id) || ""); if (!/^[\w.-]+$/.test(id)) refuse("invalid-argument", "no-entry");
        return db.tx(async t => {
          const path = `ledger/${id}`, E = await t.get(path);
          if (!E) refuse("not-found", "no-such-entry");
          if (E.reversed) return { already: true };
          const w = await t.get(walletPath(E.uid));
          const r = E.kind === "buy" ? Economy.unbuy(w, E.item) : E.kind === "daily" || E.kind === "grant" ? Economy.adjust(w, -(E.souls || 0)) : { ok: false, why: "not-reversible" };
          if (!r.ok) refuse("failed-precondition", r.why);
          r.wallet.updatedAt = now; t.set(walletPath(E.uid), r.wallet); t.set(path, { ...E, reversed: now });
          log(t, E.uid, { kind: "reverse", of: id }, now);
          return { uid: E.uid, wallet: r.wallet };
        });
      }
    };
    Object.defineProperty(H, "admin", { value: admin, enumerable: false });
    return H;
  };
  if (typeof module !== "undefined" && module.exports) module.exports = makeHandlers;
