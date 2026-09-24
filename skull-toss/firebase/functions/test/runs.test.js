// The leaderboard's run checks and submitRun, against an in-memory database: npm test
const test = require("node:test"), assert = require("node:assert");
const Economy = require("../shared/economy.js"), Runs = require("../shared/runs.js"), makeHandlers = require("../handlers.js");
function memoryDb() {
  const docs = new Map();
  return { docs, tx: async fn => { const staged = []; const out = await fn({ get: async p => (docs.has(p) ? JSON.parse(JSON.stringify(docs.get(p))) : null), set: (p, o) => staged.push([p, o]) }); for (const [p, o] of staged) docs.set(p, JSON.parse(JSON.stringify(o))); return out; } };
}
const fair = { mode: "story", score: 48250, hits: 61, stage: 3, throws: 80, secs: 190, perfects: 20, bosses: 4, targets: 3, shots: 5, continues: 0, fragments: 2, name: "Ada" };
const h = makeHandlers(Economy, async () => ({ valid: false }), Runs);
const T0 = Date.UTC(2026, 8, 24, 12);
test("a fair run passes; forged ones don't", () => {
  assert.ok(Runs.check(fair).ok);
  const why = r => Runs.check({ ...fair, ...r }).why;
  assert.strictEqual(why({ score: 5e9 }), "score-ceiling");
  assert.strictEqual(why({ hits: 500 }), "more-hits-than-throws");
  assert.strictEqual(why({ perfects: 70 }), "more-perfects-than-hits");
  assert.strictEqual(why({ secs: 10 }), "clock");
  assert.strictEqual(why({ continues: 1 }), "continued");
  assert.strictEqual(why({ stage: 12 }), "stage");
  assert.strictEqual(why({ bosses: 9 }), "bosses");
  assert.strictEqual(why({ score: 48251 }), "score-steps");
  assert.strictEqual(why({ mode: "arcade" }), "story-only");
  assert.strictEqual(why({ score: "lots" }), "not-a-number:score");
});
test("a checked run goes on the board and this week's; a better one replaces it; a worse one doesn't", async () => {
  const db = memoryDb();
  const a = await h.submitRun({ db, uid: "u1", data: { run: fair }, now: T0 });
  assert.ok(a.accepted && a.best && a.weekBest);
  assert.strictEqual(db.docs.get("leaderboard/u1").score, 48250);
  assert.strictEqual(db.docs.get(`weekly/${Runs.weekOf(T0)}_u1`).score, 48250);
  const b = await h.submitRun({ db, uid: "u1", data: { run: { ...fair, score: 30000, name: "Ada B" } }, now: T0 + 60000 });
  assert.ok(!b.best && db.docs.get("leaderboard/u1").score === 48250 && db.docs.get("leaderboard/u1").name === "Ada B");
  await h.submitRun({ db, uid: "u1", data: { run: { ...fair, score: 60000 } }, now: T0 + 120000 });
  assert.strictEqual(db.docs.get("leaderboard/u1").score, 60000);
  assert.strictEqual([...db.docs.keys()].filter(k => k.startsWith("runs/u1_")).length, 3, "every run kept for audit");
});
test("forged runs and runs sent too fast are refused", async () => {
  const db = memoryDb();
  await assert.rejects(h.submitRun({ db, uid: "u1", data: { run: { ...fair, score: 9e8 } }, now: T0 }), e => e.code === "invalid-argument" && e.message === "score-ceiling");
  await h.submitRun({ db, uid: "u1", data: { run: fair }, now: T0 });
  await assert.rejects(h.submitRun({ db, uid: "u1", data: { run: fair }, now: T0 + 5000 }), e => e.code === "resource-exhausted");
  await assert.rejects(h.submitRun({ db, uid: null, data: { run: fair }, now: T0 }), e => e.code === "unauthenticated");
});
test("weeks run Monday to Sunday", () => {
  assert.strictEqual(Runs.weekOf(Date.UTC(2026, 0, 1)), "2026-W01");
  assert.strictEqual(Runs.weekOf(Date.UTC(2026, 8, 21)), Runs.weekOf(Date.UTC(2026, 8, 27)));
  assert.notStrictEqual(Runs.weekOf(Date.UTC(2026, 8, 27)), Runs.weekOf(Date.UTC(2026, 8, 28)));
});
