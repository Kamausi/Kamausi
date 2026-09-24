// The server's rules, run against an in-memory database: npm test (node --test test/*.test.js, from firebase/functions)
const test = require("node:test"), assert = require("node:assert");
const Economy = require("../shared/economy.js"), makeHandlers = require("../handlers.js");
function memoryDb() {
  const docs = new Map();
  return { docs, tx: async fn => { const staged = []; const out = await fn({ get: async p => (docs.has(p) ? JSON.parse(JSON.stringify(docs.get(p))) : null), set: (p, o) => staged.push([p, o]) }); for (const [p, o] of staged) docs.set(p, JSON.parse(JSON.stringify(o))); return out; } };
}
const accept = async ({ receipt, product }) => ({ valid: receipt.startsWith("OK:"), product, id: receipt.slice(3) });
const call = async (h, name, db, uid, data = {}, now = Date.UTC(2026, 8, 24, 12)) => h[name]({ db, uid, data, now });
const refusal = async (p, code) => { await assert.rejects(p, e => e.code === code); };

test("a new wallet is empty; nobody signed out can use one", async () => {
  const db = memoryDb(), h = makeHandlers(Economy, accept);
  assert.deepStrictEqual((await call(h, "wallet", db, "u1")).souls, 0);
  await refusal(call(h, "wallet", db, null), "unauthenticated");
});
test("the daily Souls come once a UTC day", async () => {
  const db = memoryDb(), h = makeHandlers(Economy, accept), day = Date.UTC(2026, 8, 24, 1);
  assert.strictEqual((await call(h, "claimDailySouls", db, "u1", {}, day)).souls, Economy.DAILY);
  await refusal(call(h, "claimDailySouls", db, "u1", {}, day + 3600e3), "already-exists");
  assert.strictEqual((await call(h, "claimDailySouls", db, "u1", {}, day + 86400e3)).souls, 2 * Economy.DAILY);
});
test("a purchase credits its pack once; a reused or rejected receipt credits nothing", async () => {
  const db = memoryDb(), h = makeHandlers(Economy, accept);
  assert.strictEqual((await call(h, "redeemPurchase", db, "u1", { platform: "google", receipt: "OK:tx1", product: "souls.550" })).souls, 550);
  await refusal(call(h, "redeemPurchase", db, "u2", { platform: "google", receipt: "OK:tx1", product: "souls.550" }), "already-exists");
  await refusal(call(h, "redeemPurchase", db, "u1", { platform: "google", receipt: "BAD", product: "souls.550" }), "permission-denied");
  await refusal(call(h, "redeemPurchase", db, "u1", { platform: "google", receipt: "OK:tx2", product: "souls.9999" }), "not-found");
  assert.strictEqual((await call(h, "wallet", db, "u1")).souls, 550);
});
test("buying spends the server's price, once, and never more than the balance", async () => {
  const db = memoryDb(), h = makeHandlers(Economy, accept);
  await call(h, "redeemPurchase", db, "u1", { platform: "apple", receipt: "OK:a", product: "souls.550" });
  const w = await call(h, "buyWithSouls", db, "u1", { item: "skull:soul", souls: 1 });
  assert.strictEqual(w.souls, 550 - Economy.ITEMS["skull:soul"].souls); assert.ok(w.owned.includes("skull:soul"));
  await refusal(call(h, "buyWithSouls", db, "u1", { item: "skull:soul" }), "already-exists");
  await refusal(call(h, "buyWithSouls", db, "u1", { item: "skull:aurora" }), "failed-precondition");
  await refusal(call(h, "buyWithSouls", db, "u1", { item: "skull:nope" }), "not-found");
  const ledger = [...db.docs.keys()].filter(k => k.startsWith("ledger/u1_"));
  assert.strictEqual(ledger.length, 2, "every change of balance is in the ledger");
});
test("a wallet can't be forged into shape: junk is cleaned, and the cap holds", () => {
  const w = Economy.cleanWallet({ souls: 5e9, owned: ["skull:soul", "hat:free", 3], daily: 7 });
  assert.strictEqual(w.souls, Economy.MAX_SOULS); assert.deepStrictEqual(w.owned, ["skull:soul"]); assert.strictEqual(w.daily, "");
});
