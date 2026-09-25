// The end-to-end regression (v52): a player's session, in real time, with real input. The spec and the soak drive
// the game through its test hooks; this one taps the buttons and drags on the canvas the way a thumb does, on a
// phone-sized touch screen, and checks what the player sees at each step. The hooks are used only to read the state
// and to skip ahead (to a boss, to a knockout), never to throw.
//   title → every menu sheet opens and closes → Play → Adventure → drag-and-release throws → pause and resume →
//   the mini-boss and the end boss knocked out (the reward paid once) → the next map → a turn of the phone →
//   misses to the end → no continue → the results → Again → quit (two taps) → the results → Menu → the title; the
//   same again with reduced motion.
// At every step: no page errors, no overlay left over the play field, no untranslated string key on screen.
//   python3 src/build.py --dev && node tools/e2e.mjs
import { chromium } from "playwright";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const browser = await chromium.launch();
const results = [];
const check = (name, ok, detail = "") => results.push({ name, ok: !!ok, detail });

async function session(reduced) {
  const tag = reduced ? "[reduced motion] " : "";
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, reducedMotion: reduced ? "reduce" : "no-preference" });
  const page = await ctx.newPage(), errors = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto(pathToFileURL(join(ROOT, "index-dev.html")).href);
  await page.waitForFunction(() => window.SkullToss && window.SkullToss.debug && window.SkullToss.debug.sandbox);
  await page.evaluate(() => { const T = window.SkullToss.debug; T.sandbox(true); T.setSetting("cards", "short"); });
  const S = () => page.evaluate(() => window.SkullToss.debug.state());
  const waitFor = async (fn, arg, ms = 15000) => { try { await page.waitForFunction(fn, arg, { timeout: ms, polling: 100 }); return true; } catch (e) { return false; } };
  const visible = sel => page.evaluate(sel => { const e = document.querySelector(sel); if (!e || e.hidden) return false; const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none" && +cs.opacity > 0.05; }, sel);
  // an untranslated key on screen looks like "ui.something" or "card.clear.t"
  const rawKeys = () => page.evaluate(() => (document.body.innerText.match(/\b(ui|card|plus|chal|hint|reel|boss|power|ach)\.[a-z][\w.-]+/g) || []).filter(k => !/\.(com|js|html|json)$/.test(k)));
  // the overlays that must not sit over the play field while Morty's ready
  const leftovers = () => page.evaluate(() => ["continueBox", "bonusBox", "pause", "over", "sheetScrim", "reelCard", "plusIntro", "codeBox"].filter(id => { const e = document.getElementById(id); return e && !e.hidden && getComputedStyle(e).display !== "none" && +getComputedStyle(e).opacity > 0.05; }));
  // a thumb's throw: press low on the screen, pull down (and a little sideways), let go. Calibrated on map 1 with the
  // ring held still: a straight 62-px pull goes through its middle (about 0.03 m higher for every pixel more)
  const drag = async (dx, dy) => { await page.mouse.move(195, 640); await page.mouse.down(); await page.mouse.move(195 + dx, 640 + dy, { steps: 6 }); await page.waitForTimeout(80); await page.mouse.up(); };

  // 1 · the title, every sheet in and out
  check(`${tag}the title is up`, await visible("#title"));
  for (const name of ["challenges", "customize", "store", "settings", "board", "profile", "achievements", "codex", "mastery"]) {
    await page.click(`[data-sheet="${name}"]`); const open = await waitFor(n => { const e = document.getElementById("sheet-" + n); return e && !e.hidden; }, name, 4000);
    const keys = await rawKeys();
    await page.keyboard.press("Escape"); const shut = await waitFor(n => document.getElementById("sheet-" + n).hidden && document.getElementById("sheetScrim").hidden, name, 4000);
    check(`${tag}menu: ${name} opens and closes`, open && shut && !keys.length, keys.join(", "));
  }
  // 2 · Play → Adventure
  await page.click("#play"); await waitFor(() => !document.getElementById("sheet-play").hidden, null, 4000);
  await page.click('#modePick [data-mode="story"]');
  const started = await waitFor(() => { const s = window.SkullToss.debug.state(); return s.state === "ready" && s.screen === "play"; }, null, 15000);
  check(`${tag}Play → Adventure starts a run`, started, JSON.stringify(await S()));
  // 3 · throws by hand: each drag must throw and come back to ready
  let thrown = 0, landed = 0;
  for (let i = 0; i < 6; i++) {
    await waitFor(() => window.SkullToss.debug.state().state === "ready", null, 8000);
    await page.evaluate(() => { const T = window.SkullToss.debug; T.calm(); T.freezeRing(0, T.constants.RING_Y); });
    const t0 = (await S()).throws; await drag((i % 3 - 1) * 4, 58 + (i % 3) * 4);
    if (await waitFor(t => window.SkullToss.debug.state().throws > t, t0, 3000)) thrown++;
    if (await waitFor(() => window.SkullToss.debug.state().state === "ready", null, 8000)) landed++;
  }
  const s3 = await S();
  check(`${tag}six drag-and-release throws, each thrown and settled, most of them in`, thrown === 6 && landed === 6 && s3.hits >= 4, JSON.stringify({ thrown, landed, hits: s3.hits, lives: s3.lives }));
  await page.evaluate(() => window.SkullToss.debug.unfreezeRing());
  check(`${tag}nothing left over the play field`, !(await leftovers()).length, (await leftovers()).join());
  // 4 · pause and resume by the buttons
  await page.click("#pauseBtn"); const paused = await waitFor(() => window.SkullToss.debug.state().paused, null, 3000);
  await page.click("#resumeBtn"); const resumed = await waitFor(() => !window.SkullToss.debug.state().paused, null, 3000);
  check(`${tag}pause and resume`, paused && resumed);
  // 5 · the mini-boss: skip to it, knock it out, one reward
  await page.evaluate(() => { const T = window.SkullToss.debug, C = T.constants; T.calm(); T.setHits(C.STAGE_MINI - 1); T.freezeRing(0, C.RING_Y); T.throwAt(0, C.RING_Y); });
  const mini = await waitFor(() => { const b = window.SkullToss.debug.boss(); return b && !b.dead && window.SkullToss.debug.state().state === "ready"; }, null, 12000);
  const m0 = await S();
  await page.evaluate(() => { window.SkullToss.debug.unfreezeRing(); window.SkullToss.debug.hurtBoss(99); window.SkullToss.debug.endThrow(); });
  const miniOut = await waitFor(() => !window.SkullToss.debug.boss() && window.SkullToss.debug.state().state === "ready", null, 12000);
  const m1 = await S();
  check(`${tag}mini-boss: appears, goes down, the bonus paid once`, mini && miniOut && m1.score > m0.score && m1.score - m0.score < 20000, JSON.stringify({ before: m0.score, after: m1.score }));
  // 6 · the end boss: knocked out, rewarded once, and on to the next map
  await page.evaluate(() => { const T = window.SkullToss.debug, C = T.constants; T.calm(); T.setHits(C.STAGE_BOSS - 1); T.freezeRing(0, C.RING_Y); T.throwAt(0, C.RING_Y); });
  const endBoss = await waitFor(() => { const b = window.SkullToss.debug.boss(); return b && b.kind === "pumpkin" && window.SkullToss.debug.state().state === "ready"; }, null, 15000);
  const b0 = await page.evaluate(() => ({ ...window.SkullToss.debug.state(), bones: window.SkullToss.debug.bones() }));
  await page.evaluate(() => { window.SkullToss.debug.unfreezeRing(); window.SkullToss.debug.hurtBoss(99); window.SkullToss.debug.endThrow(); });
  const keysKO = await (async () => { await page.waitForTimeout(1600); return rawKeys(); })();
  // (the bonus round and the crossing may be offered: decline them, as a hurried player would)
  const onward = await waitFor(() => { const s = window.SkullToss.debug.state(); const skip = document.getElementById("bonusSkip"); if (skip && skip.offsetParent) skip.click(); return s.stage === 2 && s.state === "ready"; }, null, 40000);
  const b1 = await page.evaluate(() => ({ ...window.SkullToss.debug.state(), bones: window.SkullToss.debug.bones() }));
  check(`${tag}end boss: goes down, the bonus paid once, on to map 2`, endBoss && onward && b1.score - b0.score >= 10000 && b1.score - b0.score < 40000 && b1.bones > b0.bones && !keysKO.length,
    JSON.stringify({ endBoss, onward, score: [b0.score, b1.score], bones: [b0.bones, b1.bones], stage: b1.stage, keys: keysKO }));
  check(`${tag}after the crossing, nothing left over the play field`, !(await leftovers()).length, (await leftovers()).join());
  // 7 · turn the phone mid-run
  await page.setViewportSize({ width: 844, height: 390 }); await page.waitForTimeout(600); await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(600);
  await page.evaluate(() => { const T = window.SkullToss.debug; T.calm(); T.freezeRing(0, T.constants.RING_Y); });
  const t7 = (await S()).throws; await drag(0, 62); const afterTurn = await waitFor(t => window.SkullToss.debug.state().throws > t, t7, 4000);
  check(`${tag}after turning the phone, a drag still throws`, afterTurn);
  // 8 · miss to the end: wild drags, decline the continue, the results
  let guard = 0;
  while ((await S()).state !== "over" && guard++ < 40) {
    const s = await S();
    if (s.state === "continue" || await visible("#continueBox")) { await page.click("#contNo").catch(() => {}); await page.waitForTimeout(400); continue; }
    if (s.state === "ready") { await page.evaluate(() => { const T = window.SkullToss.debug; T.calm(); T.unfreezeRing(); }); await drag(0, 16); }   // (a feeble pull: short every time)
    await page.waitForTimeout(700);
  }
  const results0 = await waitFor(() => { const o = document.getElementById("over"); return o && !o.hidden; }, null, 12000);
  const keysOver = await rawKeys();
  check(`${tag}misses to the end: the results come up`, results0 && !keysOver.length, JSON.stringify({ state: (await S()).state, keys: keysOver }));
  // 9 · Again, then back to the title
  await page.waitForTimeout(800); await page.click("#again");
  const again = await waitFor(() => { const s = window.SkullToss.debug.state(); return s.state === "ready" && s.stage === 1 && s.hits === 0; }, null, 15000);
  check(`${tag}Again starts a fresh run`, again);
  // quitting is two taps ("Tap again to end the run"), and ends on the results; Menu from there goes home
  await page.click("#pauseBtn"); await waitFor(() => window.SkullToss.debug.state().paused, null, 3000);
  await page.click("#quitBtn"); const armedOnly = (await S()).paused; await page.click("#quitBtn");
  const ended = await waitFor(() => { const o = document.getElementById("over"); return o && !o.hidden; }, null, 12000);
  await page.waitForTimeout(800); await page.click("#toMenu");
  const home = await waitFor(() => window.SkullToss.debug.state().state === "title" && !document.getElementById("title").hidden, null, 8000);
  await page.waitForTimeout(600);
  check(`${tag}quit from the pause menu: one tap arms it, the second ends the run; Menu goes home, nothing left over`, armedOnly && ended && home && !(await leftovers()).length, JSON.stringify({ armedOnly, ended, home, left: await leftovers() }));
  check(`${tag}no page errors all session`, !errors.length, errors.join(" | "));
  await ctx.close();
}
await session(false);
await session(true);
await browser.close();
const fail = results.filter(r => !r.ok);
for (const r of results) console.log(`${r.ok ? "ok  " : "FAIL"} ${r.name}${r.ok || !r.detail ? "" : "\n     " + r.detail}`);
console.log(`\n${results.length - fail.length}/${results.length} end-to-end checks passed`);
process.exit(fail.length ? 1 : 0);
