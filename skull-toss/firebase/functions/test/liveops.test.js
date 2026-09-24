// Analytics, refunds, support's tools and the live config's switches (v39): npm test, from firebase/functions
const test = require("node:test"), assert = require("node:assert");
const Economy = require("../shared/economy.js"), Runs = require("../shared/runs.js"), Analytics = require("../shared/analytics.js"), makeHandlers = require("../handlers.js");
function memoryDb() {
  const docs = new Map(), copy = o => JSON.parse(JSON.stringify(o));
  return { docs, tx: async fn => { const staged = []; const out = await fn({ get: async p => (docs.has(p) ? copy(docs.get(p)) : null), set: (p, o) => staged.push([p, o]) }); for (const [p, o] of staged) docs.set(p, copy(o)); return out; } };
}
const accept = async ({ receipt, product }) => ({ valid: receipt.startsWith("OK:"), product, id: receipt.slice(3) });
const NOW = Date.UTC(2026, 8, 24, 12);
const H = () => makeHandlers(Economy, accept, Runs, Analytics);
const call = (h, name, db, uid, data = {}, now = NOW) => h[name]({ db, uid, data, now });
const refusal = async (p, code) => { await assert.rejects(p, e => e.code === code); };

test("analytics keep only the listed events and fields, file the batch for 30 days, and count the day", async () => {
  const db = memoryDb(), h = H();
  const r = await call(h, "logEvents", db, "u1", { session: "s1", build: 39, events: [
    { name: "first", what: "throw", runs: 0, mins: 1.5, email: "a@b.c" },
    { name: "run_end", mode: "story", score: 1200, secret: { deep: 1 } },
    { name: "not_an_event", x: 1 },
    { name: "error", msg: "x".repeat(500), src: "index.html:12" }
  ] });
  assert.strictEqual(r.kept, 3);
  const key = [...db.docs.keys()].find(k => k.startsWith("events/2026-09-24_u1_")), doc = db.docs.get(key);
  assert.ok(key.endsWith(`_${NOW}_1`), "each batch its own document, even in the same millisecond");
  assert.ok(doc && doc.expireAt === NOW + 30 * 864e5 && doc.build === 39 && doc.session === "s1");
  assert.ok(!("email" in doc.events[0]) && !("secret" in doc.events[1]), "fields not on the list never arrive");
  assert.strictEqual(doc.events[2].msg.length, Analytics.MAX_STR);
  const m = [...db.docs.entries()].find(([k]) => k.startsWith("metrics/2026-09-24_"))[1];
  assert.deepStrictEqual(m, { first_throw: 1, run_end_story: 1, error: 1 });
  assert.ok(!JSON.stringify(m).includes("u1"), "the day's counts name no one");
});
test("analytics: six batches a minute, and nothing when switched off", async () => {
  const db = memoryDb(), h = H(), ev = { events: [{ name: "sheet", id: "shop" }] };
  for (let i = 0; i < 6; i++) await call(h, "logEvents", db, "u1", ev, NOW + i);
  await refusal(call(h, "logEvents", db, "u1", ev, NOW + 7), "resource-exhausted");
  assert.strictEqual((await call(h, "logEvents", db, "u1", ev, NOW + 61000)).kept, 1, "a new minute");
  db.docs.set("config/live", { "kill.analytics": true });
  assert.deepStrictEqual(await call(h, "logEvents", db, "u2", ev), { kept: 0, off: true });
  await refusal(call(h, "logEvents", db, null, ev), "unauthenticated");
});
test("a refund takes the pack's Souls back; what's been spent becomes owed and blocks buying until paid off", async () => {
  const db = memoryDb(), h = H();
  await call(h, "redeemPurchase", db, "u1", { platform: "google", receipt: "OK:GPA.1", product: "souls.550" });
  await call(h, "buyWithSouls", db, "u1", { item: "skull:soul" });   // 400 of the 550
  const r = await h.admin.revokeReceipt({ db, data: { receipt: "GPA.1" }, now: NOW + 1 });
  assert.strictEqual(r.wallet.souls, 0); assert.strictEqual(r.wallet.owed, 400); assert.ok(r.wallet.owned.includes("skull:soul"), "what was bought stays");
  assert.deepStrictEqual(await h.admin.revokeReceipt({ db, data: { receipt: "GPA.1" }, now: NOW + 2 }), { already: true, uid: "u1" });
  await refusal(call(h, "buyWithSouls", db, "u1", { item: "band:soul" }), "failed-precondition");
  const w = await call(h, "claimDailySouls", db, "u1", {}, NOW + 3);
  assert.strictEqual(w.owed, 400 - Economy.DAILY); assert.strictEqual(w.souls, 0, "the daily Souls pay off what's owed first");
  await refusal(h.admin.revokeReceipt({ db, data: { receipt: "nope" }, now: NOW }), "not-found");
  assert.ok([...db.docs.values()].some(d => d.kind === "refund" && d.souls === -150 && d.owed === 400), "on the ledger");
});
test("support: a make-good goes on the ledger with its reason; any ledger entry can be undone once", async () => {
  const db = memoryDb(), h = H();
  await refusal(h.admin.grant({ db, data: { uid: "u1", souls: 50 }, now: NOW }), "invalid-argument");
  assert.strictEqual((await h.admin.grant({ db, data: { uid: "u1", souls: 500, reason: "ticket 12" }, now: NOW })).wallet.souls, 500);
  await call(h, "buyWithSouls", db, "u1", { item: "ring:soul" }, NOW + 1);
  const buyId = [...db.docs.entries()].find(([, d]) => d.kind === "buy")[0].slice("ledger/".length);
  const r = await h.admin.reverse({ db, data: { id: buyId }, now: NOW + 2 });
  assert.strictEqual(r.wallet.souls, 500); assert.ok(!r.wallet.owned.includes("ring:soul"), "the purchase comes off and its Souls go back");
  assert.deepStrictEqual(await h.admin.reverse({ db, data: { id: buyId }, now: NOW + 3 }), { already: true });
  const grantId = [...db.docs.entries()].find(([, d]) => d.kind === "grant")[0].slice("ledger/".length);
  assert.strictEqual((await h.admin.reverse({ db, data: { id: grantId }, now: NOW + 4 })).wallet.souls, 0);
  assert.ok(!Object.keys(h).includes("admin"), "support's tools are never callable by a player");
});
test("the live config: kill switches hold on the server too, and an old build is asked to update", async () => {
  const db = memoryDb(), h = H();
  await h.admin.grant({ db, data: { uid: "u1", souls: 999, reason: "test" }, now: NOW });
  db.docs.set("config/live", { "kill.souls": true });
  await refusal(call(h, "buyWithSouls", db, "u1", { item: "band:soul" }), "unavailable");
  await refusal(call(h, "claimDailySouls", db, "u1"), "unavailable");
  assert.strictEqual((await call(h, "redeemPurchase", db, "u1", { platform: "apple", receipt: "OK:t9", product: "souls.100" })).souls, 1099, "a paid pack still goes through");
  db.docs.set("config/live", { "build.min": 39 });
  await refusal(call(h, "buyWithSouls", db, "u1", { item: "band:soul", build: 38 }), "failed-precondition");
  assert.ok((await call(h, "buyWithSouls", db, "u1", { item: "band:soul", build: 39 })).owned.includes("band:soul"));
  db.docs.set("config/live", { "kill.board": true });
  await refusal(call(h, "submitRun", db, "u1", { run: {} }), "invalid-argument");   // (the run check comes first)
});
