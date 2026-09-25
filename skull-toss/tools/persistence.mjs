// The persistence audit (v52): the save, the way a player's device actually treats it. Each case opens the dev build
// in a fresh browser (its own storage, no test sandbox, so the real localStorage is read and written) and checks
// what a player would see: a first launch, a second launch, old saves from every schema, a broken save, a save code
// imported twice, a browser that won't give the page any storage, and one whose storage fills up mid-run.
//   python3 src/build.py --dev && node tools/persistence.mjs
import { chromium } from "playwright";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const URL = pathToFileURL(join(ROOT, "index-dev.html")).href;
const K = { profile: "skullToss.profile.v1", cos: "skullToss.cosmetics.v1", settings: "skullToss.settings.v1", best: "skullToss.best" };
const browser = await chromium.launch();
const results = [];
const check = (name, ok, detail = "") => { results.push({ name, ok: !!ok, detail }); };   // (bone counts are checked with >=: a launch can add the daily gift)

// one launch: a new context unless one is given (a second launch reuses the first's storage)
async function launch({ ctx, init, seed } = {}) {
  ctx = ctx || await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage(), errors = [];
  page.on("pageerror", e => errors.push(e.message));
  if (seed) await page.addInitScript(s => { if (!sessionStorage.getItem("__seeded")) { for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); sessionStorage.setItem("__seeded", "1"); } }, seed);
  if (init) await page.addInitScript(init);
  await page.goto(URL);
  await page.waitForFunction(() => window.SkullToss && window.SkullToss.debug && window.SkullToss.debug.profile, null, { timeout: 60000 });
  return { ctx, page, errors };
}
// play a short Story run to its end, the way the soak bot does (a few makes, then misses until it's over)
const playRun = page => page.evaluate(() => {
  const T = window.SkullToss.debug; T.pause(true); T.start();
  let throws = 0;
  for (let i = 0; i < 3000 && T.state().state !== "over" && throws < 40; i++) {
    const st = T.state();
    if (st.state === "ready" && !st.paused) { const make = throws < 3; if (T.throwAt(make ? st.ring.x : 2.6, make ? st.ring.y : 0.4)) throws++; }
    T.step(0.1);
    const c = document.getElementById("contNo"); if (c && !c.hidden && c.offsetParent) c.click();
  }
  if (T.state().state !== "over") { T.endRun(); T.step(2); }
  return { throws, over: T.state().state === "over", games: T.profile().games, hits: T.state().hits };
});
const stored = (page, k) => page.evaluate(k => { try { return localStorage.getItem(k); } catch (e) { return "<blocked>"; } }, k);

// 1 · first launch, then a second
{
  const { ctx, page, errors } = await launch();
  const P = await page.evaluate(() => window.SkullToss.debug.profile());
  check("first launch: a clean default profile", P.games === 0 && P.bones >= 0 && P.schema === 4, JSON.stringify({ games: P.games, schema: P.schema }));
  const run = await playRun(page);
  const saved = JSON.parse(await stored(page, K.profile) || "null");
  check("first launch: a finished run is saved", run.over && saved && saved.games === 1, JSON.stringify({ run, savedGames: saved && saved.games }));
  check("first launch: no page errors", !errors.length, errors.join(" | "));
  await page.close();
  const again = await launch({ ctx });
  const Q = await again.page.evaluate(() => window.SkullToss.debug.profile());
  check("second launch: the progress is still there", Q.games === 1 && Q.throws === saved.throws, JSON.stringify({ games: Q.games, throws: Q.throws }));
  check("second launch: a backup copy was kept", !!await stored(again.page, K.profile + ".bak"));
  check("second launch: no page errors", !again.errors.length, again.errors.join(" | "));
  await ctx.close();
}

// 2 · old saves, one per schema, straight from localStorage
const OLD = {
  "schema 1 (v12, no number)": { p: { bestScore: 5000, boardBest: { score: 5000 }, games: 12, makes: 40, bones: 300, fragments: ["tophat"], achievements: ["whole-reel"] }, want: P => P.schema === 4 && P.boardBest === null && P.games === 12 && P.bones >= 300 && P.achievements.includes("half-reel") && !P.achievements.includes("whole-reel") && P.fragments.length === 0 },
  "schema 2 (v14)": { p: { schema: 2, bestStage: 7, games: 30, bossLog: { crow: 2 }, fragments: ["bowtie"] }, want: P => P.schema === 4 && P.bestStage === 5 && P.games === 30 && P.fragments.length === 0 },
  "schema 3 (v18)": { p: { schema: 3, bestStage: 7, games: 50, fragments: ["tophat", "whistle", "shadow"], bossLog: { pumpkin: 3 }, bio: "old", pic: { face: "x", frame: "y" } }, want: P => P.schema === 4 && P.bestStage === 7 && P.fragments.join() === "hollow,desert,abyss" && P.bossLog.pumpkin === 3 && P.bio === "" && P.pic === null },
  "schema 4 (today)": { p: { schema: 4, bestStage: 9, games: 80, fragments: ["hollow"], bio: "hi", mastery: ["map:1:3"] }, want: P => P.schema === 4 && P.games === 80 && P.bio === "hi" && P.mastery.includes("map:1:3") },
  "schema 9 (a newer build)": { p: { schema: 9, games: 5, futureField: { a: 1 } }, want: P => P.schema === 9 && P.games === 5 && P.futureField && P.futureField.a === 1 }
};
for (const [label, c] of Object.entries(OLD)) {
  const { ctx, page, errors } = await launch({ seed: { [K.profile]: JSON.stringify(c.p) } });
  const P = await page.evaluate(() => window.SkullToss.debug.profile());
  check(`old save, ${label}: loads and migrates`, c.want(P), JSON.stringify({ schema: P.schema, games: P.games, bestStage: P.bestStage, fragments: P.fragments, achievements: P.achievements }));
  const run = await playRun(page);
  const saved = JSON.parse(await stored(page, K.profile) || "null");
  check(`old save, ${label}: plays and saves over itself`, run.over && saved && saved.games === P.games + 1 && saved.schema === P.schema, JSON.stringify({ saved: saved && [saved.games, saved.schema] }));
  check(`old save, ${label}: no page errors`, !errors.length, errors.join(" | "));
  await ctx.close();
}

// 3 · a save cut off halfway (a crash mid-write), with and without a backup
{
  const good = JSON.stringify({ schema: 4, games: 21, bones: 777, name: "Morty" });
  let L = await launch({ seed: { [K.profile]: '{"schema":4,"games":22,"bon', [K.profile + ".bak"]: good } });
  let P = await L.page.evaluate(() => window.SkullToss.debug.profile());
  check("broken save with a backup: the backup loads", P.games === 21 && P.bones >= 777 && P.name === "Morty", JSON.stringify({ games: P.games, bones: P.bones }));
  check("broken save with a backup: the broken text is kept", (await stored(L.page, K.profile + ".corrupt")) === '{"schema":4,"games":22,"bon');
  check("broken save with a backup: no page errors", !L.errors.length, L.errors.join(" | "));
  await L.ctx.close();
  L = await launch({ seed: { [K.profile]: "\u0000\u0001not json", [K.cos]: "{{{", [K.settings]: "[1,2", [K.best]: "NaN" } });
  P = await L.page.evaluate(() => window.SkullToss.debug.profile());
  const run = await playRun(L.page);
  check("everything broken, no backup: starts fresh and plays", P.games === 0 && run.over && Number.isFinite(P.best), JSON.stringify({ games: P.games, best: P.best }));
  check("everything broken, no backup: no page errors", !L.errors.length, L.errors.join(" | "));
  await L.ctx.close();
}

// 4 · a save code imported twice (and a stale code imported over newer progress)
{
  const { ctx, page, errors } = await launch();
  await playRun(page);
  const r = await page.evaluate(() => {
    const T = window.SkullToss.debug, strip = p => { const o = { ...p }; delete o.updatedAt; return JSON.stringify(o); };
    const code = T.exportCode(), before = T.profile();
    const once = T.importCode(code) && T.profile(), twice = T.importCode(code) && T.profile(), thrice = T.importCode(code) && T.profile();
    return { same: strip(once) === strip(twice) && strip(twice) === strip(thrice), grew: once.games !== before.games || once.bones !== before.bones, bones: [before.bones, once.bones, thrice.bones], games: [before.games, thrice.games] };
  });
  check("the same code imported three times: nothing doubles", r.same && !r.grew, JSON.stringify(r));
  const stale = await page.evaluate(() => {
    const T = window.SkullToss.debug, code = T.exportCode(), b0 = T.profile().bones;
    T.setBones(b0 + 250); T.setSetting("shake", true);   // (setSetting saves)
    const b1 = T.profile().bones; T.importCode(code);
    return { b0, b1, after: T.profile().bones, games: T.profile().games };
  });
  check("an older code over newer progress: the newer balance stands", stale.after === stale.b1, JSON.stringify(stale));
  const future = await page.evaluate(() => {
    const T = window.SkullToss.debug, dec = c => JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(c.slice(7)), ch => ch.charCodeAt(0))));
    const enc = o => "SKULL1." + btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(o)))).replace(/=+$/, "");
    const d = dec(T.exportCode()); d.p.updatedAt = Date.now() + 1000 * 86400 * 365 * 50; d.p.bones = 999999;
    const before = T.profile().bones; T.importCode(enc(d));
    return { before, after: T.profile().bones, updatedAt: T.profile().updatedAt, now: Date.now() };
  });
  check("a code dated years ahead: its date can't pin its balance in place", future.updatedAt <= future.now + 600e3, JSON.stringify(future));
  check("save codes: no page errors", !errors.length, errors.join(" | "));
  await ctx.close();
}

// 5 · no storage at all (a locked-down or private browser: every access throws)
{
  const { ctx, page, errors } = await launch({ init: () => {
    const deny = () => { throw new DOMException("The operation is insecure.", "SecurityError"); };
    Object.defineProperty(window, "localStorage", { get: deny, configurable: true });
    Object.defineProperty(window, "sessionStorage", { get: deny, configurable: true });
  } });
  const title = await page.evaluate(() => !document.getElementById("title").hidden);
  const run = await playRun(page);
  const P = await page.evaluate(() => window.SkullToss.debug.profile());
  check("storage blocked: the game opens", title);
  check("storage blocked: a run plays to the end and counts for this session", run.over && P.games === 1, JSON.stringify({ run, games: P.games }));
  check("storage blocked: no page errors", !errors.length, errors.join(" | "));
  await ctx.close();
}

// 6 · storage full: every write fails partway through a run
{
  const { ctx, page, errors } = await launch({ init: () => {
    const real = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) { if (window.__full) throw new DOMException("Quota exceeded", "QuotaExceededError"); return real.call(this, k, v); };
  } });
  await playRun(page);
  const before = await stored(page, K.profile);
  const r = await page.evaluate(() => {
    const T = window.SkullToss.debug; T.start(); window.__full = true;
    let makes = 0, throws = 0;
    for (let i = 0; i < 400 && throws < 6; i++) { const st = T.state(); if (st.state === "ready" && T.throwAt(st.ring.x, st.ring.y)) throws++; T.step(0.1); }
    const mid = T.state(); makes = mid.hits;
    T.endRun(); T.step(2);
    return { throws, makes, score: mid.score, state: T.state().state, games: T.profile().games };
  });
  const after = await stored(page, K.profile);
  check("storage full mid-run: the run carries on untouched", r.throws === 6 && r.makes > 0 && r.state === "over", JSON.stringify(r));
  check("storage full mid-run: the last good save is left as it was", after === before && JSON.parse(after).games === 1, "");
  check("storage full mid-run: this session still counts the run", r.games === 2, JSON.stringify(r));
  check("storage full mid-run: no page errors", !errors.length, errors.join(" | "));
  await ctx.close();
}

await browser.close();
const fail = results.filter(r => !r.ok);
for (const r of results) console.log(`${r.ok ? "ok  " : "FAIL"} ${r.name}${r.ok || !r.detail ? "" : "\n     " + r.detail}`);
console.log(`\n${results.length - fail.length}/${results.length} persistence checks passed`);
process.exit(fail.length ? 1 : 0);
