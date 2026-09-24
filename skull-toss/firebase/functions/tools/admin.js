#!/usr/bin/env node
// Support's command line, run from firebase/functions with a service account:
//   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
//   node tools/admin.js <command> …
// Commands:
//   wallet <uid>                         the player's Souls, what they own, anything owed
//   ledger <uid> [n]                     their last n ledger entries (default 20), newest first
//   grant <uid> <souls> "<reason>"       Souls in (or out, with a minus), with the reason on the ledger
//   revoke-receipt <receipt id>          a store refund by hand: the pack's Souls come back off
//   reverse <ledger id>                  undo one ledger entry (a purchase, a daily claim or a grant)
//   report [YYYY-MM-DD]                  the day's play analytics, added up (default: today, UTC)
//   set-admin <uid> [off]                let a signed-in account use the support callable (or stop it)
// Everything goes through the same handlers the server runs (handlers.js), so the ledger records it all.
const admin = require("firebase-admin");
const Economy = require("../shared/economy.js"), Runs = require("../shared/runs.js"), Analytics = require("../shared/analytics.js");
const makeHandlers = require("../handlers.js");

admin.initializeApp();
const firestore = admin.firestore(), { FieldValue } = admin.firestore;
const db = {
  tx: fn => firestore.runTransaction(async tr => {
    const writes = [];
    const out = await fn({
      get: async p => { const s = await tr.get(firestore.doc(p)); return s.exists ? s.data() : null; },
      set: (p, o) => writes.push([p, o]),
      inc: (p, c) => writes.push([p, Object.fromEntries(Object.entries(c).map(([k, n]) => [k, FieldValue.increment(n)])), { merge: true }])
    });
    for (const [p, o, opts] of writes) tr.set(firestore.doc(p), o, opts || {});
    return out;
  })
};
const H = makeHandlers(Economy, async () => ({ valid: false }), Runs, Analytics);
const now = () => Date.now();
const print = o => console.log(JSON.stringify(o, null, 2));

// the funnel, in the order a new player meets it
const FUNNEL = Analytics.FIRSTS.map(f => `first_${f}`);

async function main([cmd, ...a]) {
  switch (cmd) {
    case "wallet": { const s = await firestore.doc(`wallets/${a[0]}`).get(); return print(Economy.cleanWallet(s.exists ? s.data() : null)); }
    case "ledger": {
      const q = await firestore.collection("ledger").where("uid", "==", a[0]).orderBy("at", "desc").limit(Number(a[1]) || 20).get();
      return print(q.docs.map(d => ({ id: d.id, ...d.data(), at: new Date(d.data().at).toISOString() })));
    }
    case "grant": return print(await H.admin.grant({ db, data: { uid: a[0], souls: Number(a[1]), reason: a.slice(2).join(" ") }, now: now() }));
    case "revoke-receipt": return print(await H.admin.revokeReceipt({ db, data: { receipt: a[0] }, now: now() }));
    case "reverse": return print(await H.admin.reverse({ db, data: { id: a[0] }, now: now() }));
    case "report": {
      const day = a[0] || new Date().toISOString().slice(0, 10), total = {};
      const q = await firestore.collection("metrics").where(admin.firestore.FieldPath.documentId(), ">=", `${day}_`).where(admin.firestore.FieldPath.documentId(), "<", `${day}_~`).get();
      for (const d of q.docs) for (const [k, n] of Object.entries(d.data())) total[k] = (total[k] || 0) + n;
      console.log(`Play analytics for ${day} (${q.size} shards)\n\nThe funnel:`);
      const top = total.first_launch || 0;
      for (const k of FUNNEL) console.log(`  ${k.slice(6).padEnd(10)} ${String(total[k] || 0).padStart(7)}${top ? `  ${Math.round((100 * (total[k] || 0)) / top)}%` : ""}`);
      console.log("\nEverything else:");
      for (const [k, n] of Object.entries(total).filter(([k]) => !FUNNEL.includes(k)).sort((x, y) => y[1] - x[1])) console.log(`  ${k.padEnd(28)} ${n}`);
      return;
    }
    case "set-admin": { await admin.auth().setCustomUserClaims(a[0], a[1] === "off" ? {} : { admin: true }); return console.log(a[1] === "off" ? "support access removed" : "support access granted (they need to sign in again)"); }
    default: console.log(require("fs").readFileSync(__filename, "utf8").split("\n").filter(l => l.startsWith("//")).map(l => l.slice(3)).join("\n"));
  }
}
main(process.argv.slice(2)).catch(e => { console.error(`${e.code || "error"}: ${e.message}`); process.exit(1); });
