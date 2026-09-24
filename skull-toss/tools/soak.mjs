// The soak test (v41): a bot plays every mode, many runs each, aiming anywhere from dead centre to wild, with
// continues, title cards and mischief on. After every throw the state must make sense; after every run the save must
// survive a save code, and a replay of the run must play back to the same score. Nothing may throw an error, and no
// string may be missing.
//   python3 src/build.py --dev && node tools/soak.mjs [runs per mode, default 6] [seed]
import { chromium } from "playwright";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const RUNS = Number(process.argv[2]) || 6, SEED = Number(process.argv[3]) || 1933;
const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: 400, height: 820 } });
const errors = []; page.on("pageerror", e => errors.push(e.message));
await page.goto(pathToFileURL(join(ROOT, "index-dev.html")).href);
await page.waitForFunction(() => window.SkullToss && window.SkullToss.debug && window.SkullToss.debug.sandbox);
const t0 = Date.now();
const report = await page.evaluate(([RUNS, SEED]) => {
  const T = window.SkullToss.debug, C = T.constants;
  let s = SEED >>> 0; const rnd = () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const problems = [], stats = { runs: 0, throws: 0, hits: 0, bosses: 0, replays: 0, maxStage: 0, modes: {} };
  const bad = (what, v) => { if (problems.length < 60) problems.push(`${what}: ${JSON.stringify(v)}`); };
  const finite = (o, path = "") => { for (const [k, v] of Object.entries(o || {})) { if (typeof v === "number" && !Number.isFinite(v)) bad(`not a number at ${path}${k}`, v); else if (v && typeof v === "object" && !Array.isArray(v)) finite(v, `${path}${k}.`); } };
  T.sandbox(true); T.pause(true); T.continues(true); T.cards(true); T.mischiefOn(true); T.encore(true);
  T.setStats({ bestStage: 9, bossKills: 8, bones: 5000 });   // (every mode open, every map reachable)
  T.seasonAt("2026-10-15T12:00:00Z");   // (a season on, so the Feature plays too)
  const MODES = ["story", "arcade", "practice", "rush", "curtain", "longshot", "gallery", "director", "feature"];
  for (const mode of MODES) {
    stats.modes[mode] = 0;
    for (let r = 0; r < RUNS; r++) {
      const map = Math.floor(rnd() * 8);
      if (mode === "story") T.start(); else T.startMode(mode, map);
      let steps = 0, throws = 0;
      while (T.state().state !== "over" && steps < 4000 && throws < 90) {
        const st = T.state();
        if (st.state === "ready" && !st.paused) {
          // aim: mostly near the ring, sometimes wild
          const wild = rnd() < 0.15, ax = wild ? (rnd() * 2 - 1) * 2.6 : st.ring.x + (rnd() * 2 - 1) * 0.5, ay = wild ? 0.4 + rnd() * 4.4 : st.ring.y + (rnd() * 2 - 1) * 0.45;
          if (T.throwAt(ax, ay)) { throws++; stats.throws++; }
        }
        T.step(Math.round((0.1 + rnd() * 0.25) * 240) / 240); steps++;   // (whole sim steps, as the game loop takes them)
        if (document.getElementById("reelCard") && !document.getElementById("reelCard").hidden && rnd() < 0.3) T.skipReel();
        const c = document.getElementById("continueBox");
        if (c && !c.hidden) { const b = rnd() < 0.5 ? document.getElementById("contBones") : document.getElementById("contNo"); if (b && !b.hidden && !b.disabled) b.click(); }
        const now = T.state(); finite(now, "state.");
        if (now.lives < 0 || now.lives > 5) bad("lives out of range", now.lives);
        if (now.score < 0) bad("negative score", now.score);
        stats.maxStage = Math.max(stats.maxStage, now.stage || 0);
      }
      if (T.state().state !== "over") { T.endRun(); T.step(2); }
      const end = T.state(); stats.runs++; stats.modes[mode]++; stats.hits += end.hits;
      const R = T.lastReplay();
      // the replay: the same run, throw for throw (a few per mode; they take a while)
      if (R && r < 2) {
        T.watchReplay(); let i = 0; for (; i < 6000 && T.state().state !== "over"; i++) T.step(0.05);
        const got = T.state(); stats.replays++;
        if (got.score !== end.score || got.throws !== end.throws) bad(`${mode} replay differs`, { got: [got.score, got.throws], was: [end.score, end.throws] });
        T.stopReplay();
      }
      // the save: through a save code and back, nothing lost
      const P = T.profile(), code = T.exportCode(); T.importCode(code); const Q = T.profile();
      for (const k of ["bestScore", "bestStage", "games", "makes", "bones", "xp"]) if (Q[k] !== P[k]) bad(`save code changed ${k}`, [P[k], Q[k]]);
      T.toTitle();
    }
  }
  const missing = T.missingStrings(); if (missing.length) bad("missing strings", missing);
  stats.bosses = T.profile().bossKills;
  return { problems, stats };
}, [RUNS, SEED]);
await browser.close();
const secs = Math.round((Date.now() - t0) / 1000);
console.log(`${report.stats.runs} runs, ${report.stats.throws} throws, ${report.stats.hits} hits, ${report.stats.replays} replays checked, furthest stage ${report.stats.maxStage} (${secs} s, seed ${SEED})`);
console.log("runs per mode: " + Object.entries(report.stats.modes).map(([m, n]) => `${m} ${n}`).join(", "));
for (const p of [...report.problems, ...errors.map(e => `page error: ${e}`)]) console.log("PROBLEM " + p);
process.exit(report.problems.length || errors.length ? 1 : 0);
