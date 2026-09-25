// The mobile performance audit (v52). Plays the game in real time (not stepped: the real frame loop, the real
// adaptive quality) on a phone-sized, high-DPI screen with the CPU slowed down to stand in for a mid-range phone, and
// measures what a player would feel:
//   · frame pacing: the median and the 95th/99th percentile frame time, and the share of frames over 1/40 s (the
//     line the game's own adaptive quality counts as slow), per scene
//   · long tasks: anything over 50 ms on the main thread
//   · input latency: a touch on the canvas to the next frame
//   · the adaptive quality: where it settled, and whether it had to cut the resolution
//   · memory: the JS heap and DOM nodes before and after a long session, and the live particle counts
// Headless Chromium draws with a software GPU (a few frames a second at 3× DPR), so absolute numbers mean nothing
// about a phone: read the *cost* column (a scene's frame time against map 1's) and the *JS share* (how much of the
// frame is the game's own code rather than the browser's drawing). The GPU layer is left at Lite, as on a touch screen.
// The report goes to docs/perf/latest.md; the findings drawn from it are in docs/PERF-AUDIT.md.
//   python3 src/build.py --dev && node tools/perf.mjs [cpu slowdown, default 1] [long-session seconds, default 60]
import { chromium } from "playwright";
import { dirname, join } from "node:path";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CPU = Number(process.argv[2]) || 1, LONG = Number(process.argv[3]) || 60;
const browser = await chromium.launch({ args: ["--enable-precise-memory-info"] });

async function open({ reduced = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, reducedMotion: reduced ? "reduce" : "no-preference" });
  const page = await ctx.newPage(), errors = [];
  page.on("pageerror", e => errors.push(e.message));
  const cdp = await ctx.newCDPSession(page);
  await page.goto(pathToFileURL(join(ROOT, "index-dev.html")).href);
  await page.waitForFunction(() => window.SkullToss && window.SkullToss.debug && window.SkullToss.debug.sandbox);
  await page.evaluate(() => {
    const T = window.SkullToss.debug; T.sandbox(true); T.setSetting("gpu", "lite"); T.setSetting("cards", "short");
    // the recorder: every frame's gap, every long task, and a bot that throws whenever Morty is ready
    const R = window.__perf = { gaps: [], long: [], lat: [], on: false, last: 0 };
    const tick = ts => { if (R.on && R.last) R.gaps.push(ts - R.last); R.last = ts; requestAnimationFrame(tick); }; requestAnimationFrame(tick);
    try { new PerformanceObserver(l => { if (R.on) for (const e of l.getEntries()) R.long.push(Math.round(e.duration)); }).observe({ entryTypes: ["longtask"] }); } catch (e) {}
    addEventListener("pointerdown", e => { const t0 = e.timeStamp; requestAnimationFrame(() => R.lat.push(performance.now() - t0)); }, true);
    R.bot = setInterval(() => {
      if (!R.botOn) return;
      const s = T.state();
      if (s.state === "over") { R.restart && R.restart(); return; }
      const c = document.getElementById("contNo"); if (c && c.offsetParent) { c.click(); return; }
      if (s.state === "ready" && !s.paused && !s.sheet) T.throwAt(s.ring.x + (Math.random() - 0.5) * 0.5, s.ring.y + (Math.random() - 0.5) * 0.4);
    }, 350);
  });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU });
  await cdp.send("Performance.enable");
  return { ctx, page, cdp, errors };
}
const pct = (a, p) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
async function measure(page, secs) {
  // (each scene starts at full quality, so scenes compare like for like; the adaptive loop may still step it down)
  await page.evaluate(() => { window.SkullToss.debug.visualAnimation.setQuality(1); const R = window.__perf; R.gaps = []; R.long = []; R.last = 0; R.on = true; });
  await page.waitForTimeout(secs * 1000);
  return page.evaluate(() => { const R = window.__perf; R.on = false; const T = window.SkullToss.debug;
    return { gaps: R.gaps.slice(), long: R.long.slice(), q: T.visualAnimation ? null : null, quality: window.SkullToss.debug.visualAnimation.quality(), perf: T.perf() }; });
}
const summarise = (name, m) => ({ name, frames: m.gaps.length, fps: +(1000 / (m.gaps.reduce((a, b) => a + b, 0) / Math.max(1, m.gaps.length))).toFixed(1),
  p50: +pct(m.gaps, 0.5).toFixed(1), p95: +pct(m.gaps, 0.95).toFixed(1), p99: +pct(m.gaps, 0.99).toFixed(1), slow: +(100 * m.gaps.filter(g => g > 25).length / Math.max(1, m.gaps.length)).toFixed(1),
  long: m.long.length, longMax: m.long.length ? Math.max(...m.long) : 0, quality: m.quality.level, particles: m.perf.now.particles });
const heap = async cdp => { const { metrics } = await cdp.send("Performance.getMetrics"); const g = n => (metrics.find(m => m.name === n) || {}).value || 0; return { heapMB: +(g("JSHeapUsedSize") / 1048576).toFixed(1), nodes: g("Nodes"), listeners: g("JSEventListeners") }; };

const rows = [], notes = [];
const S = await open();
const { page, cdp } = S;
// 1 · the title, idle (the curtains, the lights, the travelling scene behind)
rows.push(summarise("title (idle)", await measure(page, 6)));
// 2 · every map, played by the bot
for (let map = 1; map <= 8; map++) {
  await page.evaluate(m => { const T = window.SkullToss.debug; T.start(); T.setStage(m); T.setHits(5); window.__perf.restart = () => { T.start(); T.setStage(m); }; window.__perf.botOn = true; }, map);
  await page.waitForTimeout(1500);
  const name = (await page.evaluate(() => window.SkullToss.debug.stages()))[map - 1];
  rows.push(summarise(`map ${map}: ${name}${map === 4 || map === 5 ? " (water reflections)" : ""}`, await measure(page, 8)));
}
// 3 · an end boss fight, and a knockout
await page.evaluate(() => { const T = window.SkullToss.debug, C = T.constants; window.__perf.botOn = false; T.start(); T.setStage(1); T.setHits(C.STAGE_BOSS - 1); window.__perf.restart = () => T.start(); window.__perf.botOn = true; });
await page.waitForTimeout(4000);
rows.push(summarise("end boss fight (map 1)", await measure(page, 6)));
await page.evaluate(() => { window.__perf.botOn = false; window.SkullToss.debug.hurtBoss(99); window.SkullToss.debug.endThrow(); });
rows.push(summarise("boss knockout (the 3 s after)", await measure(page, 3)));
// 4 · a burning ring (the most particles), Adventure+ on the last map
await page.evaluate(() => { const T = window.SkullToss.debug; T.start(); T.setStage(2); T.setStreak(10); window.__perf.restart = () => { T.start(); T.setStage(2); T.setStreak(10); }; window.__perf.botOn = true; });
await page.waitForTimeout(1000);
rows.push(summarise("ring on fire (streak 10)", await measure(page, 6)));
await page.evaluate(() => { const T = window.SkullToss.debug; T.setStats({ storyClears: 1 }); T.startPlus(); T.setStage(8); window.__perf.restart = () => { T.startPlus(); T.setStage(8); }; });
await page.waitForTimeout(1000);
rows.push(summarise("Adventure+ map 8", await measure(page, 6)));
// 5 · turning the phone: portrait → landscape → portrait while playing
await page.evaluate(() => { window.__perf.gaps = []; window.__perf.long = []; window.__perf.last = 0; window.__perf.on = true; });
for (const [w, h] of [[844, 390], [390, 844], [844, 390], [390, 844]]) { await page.setViewportSize({ width: w, height: h }); await page.waitForTimeout(700); }
rows.push(summarise("turning the phone (4 rotations)", await page.evaluate(() => { const R = window.__perf; R.on = false; const T = window.SkullToss.debug; return { gaps: R.gaps.slice(), long: R.long.slice(), quality: T.visualAnimation.quality(), perf: T.perf() }; })));
// 6 · input latency: taps on the canvas while Morty's ready
await page.evaluate(() => { window.__perf.botOn = false; const T = window.SkullToss.debug; T.start(); T.setStage(1); window.__perf.lat = []; });
await page.waitForTimeout(1500);
for (let i = 0; i < 12; i++) { await page.mouse.move(195, 700); await page.mouse.down(); await page.mouse.move(195, 760, { steps: 3 }); await page.mouse.up(); await page.waitForTimeout(900); }
const lat = await page.evaluate(() => window.__perf.lat.slice());
// 7 · the long session: memory before and after
await page.evaluate(() => { const T = window.SkullToss.debug; T.start(); window.__perf.restart = () => T.startMode("arcade", Math.floor(Math.random() * 8)); window.__perf.botOn = true; });
const before = await heap(cdp);
await page.evaluate(() => { window.__perf.gaps = []; window.__perf.long = []; window.__perf.last = 0; window.__perf.on = true; });
await cdp.send("Profiler.enable"); await cdp.send("Profiler.setSamplingInterval", { interval: 1000 }); await cdp.send("Profiler.start");
await page.waitForTimeout(LONG * 1000);
const { profile } = await cdp.send("Profiler.stop");
const share = (() => { const byId = new Map(profile.nodes.map(n => [n.id, n])); const self = new Map(); let total = 0, js = 0;
  profile.samples.forEach((id, i) => { const n = byId.get(id), d = profile.timeDeltas[i] || 0, f = n.callFrame, native = !f.url; total += d;
    const k = (f.functionName || "(anon)") + (native ? " [browser]" : ""); self.set(k, (self.get(k) || 0) + d); if (!native) js += d; });
  return { js: +(100 * js / total).toFixed(1), top: [...self].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${k} ${(100 * v / total).toFixed(1)}%`) }; })();
const longRun = await page.evaluate(() => { const R = window.__perf; R.on = false; const T = window.SkullToss.debug; return { gaps: R.gaps.slice(), long: R.long.slice(), quality: T.visualAnimation.quality(), perf: T.perf() }; });
rows.push(summarise(`long session (${LONG} s, arcade on random maps)`, longRun));
await cdp.send("HeapProfiler.enable"); await cdp.send("HeapProfiler.collectGarbage");
const after = await heap(cdp);
const errors = S.errors.slice();
await S.ctx.close();
// 8 · reduced motion (a separate launch)
const RM = await open({ reduced: true });
await RM.page.evaluate(() => { const T = window.SkullToss.debug; T.start(); T.setStage(4); window.__perf.restart = () => { T.start(); T.setStage(4); }; window.__perf.botOn = true; });
await RM.page.waitForTimeout(1500);
rows.push(summarise("reduced motion, map 4", await measure(RM.page, 6)));
errors.push(...RM.errors);
await RM.ctx.close();
await browser.close();

// the report
const L = [];
L.push(`# Mobile performance audit: latest run`, "", `Generated by \`node tools/perf.mjs ${CPU} ${LONG}\` on ${new Date().toISOString().slice(0, 10)}: 390×844 at 3× DPR, touch, CPU slowdown ${CPU}×, GPU layer on Lite. Headless Chromium draws in software, so the fps and ms columns say nothing about a phone. Read **cost** (frame time against map 1's) and the JS share below. Findings: [../PERF-AUDIT.md](../PERF-AUDIT.md).`, "");
L.push("Frame times are in ms. *slow* is the share of frames over 25 ms, the line the adaptive quality counts; *quality* is where the adaptive quality stood at the end (1 = full effects, 0.5 = the floor, below which it cuts resolution).", "");
L.push("| scene | cost vs map 1 | fps | p50 | p95 | p99 | slow % | long tasks (max ms) | quality | particles |", "|---|---|---|---|---|---|---|---|---|---|");
const base = (rows.find(r => r.name.startsWith("map 1")) || rows[0]).p50;
for (const r of rows) L.push(`| ${r.name} | ${(r.p50 / base).toFixed(2)}× | ${r.fps} | ${r.p50} | ${r.p95} | ${r.p99} | ${r.slow} | ${r.long}${r.long ? ` (${r.longMax})` : ""} | ${r.quality} | ${r.particles} |`);
L.push("", `**Input latency** (touch on the canvas → next frame), ${lat.length} taps: median ${pct(lat, 0.5).toFixed(1)} ms, worst ${lat.length ? Math.max(...lat).toFixed(1) : "–"} ms.`, "");
L.push(`**Memory** over the long session: JS heap ${before.heapMB} → ${after.heapMB} MB (after garbage collection), DOM nodes ${before.nodes} → ${after.nodes}, event listeners ${before.listeners} → ${after.listeners}.`, "");
L.push(`**JS share** of the long session's main thread: ${share.js}% is the game's own code; the rest is the browser drawing. Top self time: ${share.top.join(" · ")}.`, "");
L.push(`**Page errors:** ${errors.length ? errors.join("; ") : "none"}.`, "");
const out = L.join("\n");
console.log(out);
mkdirSync(join(ROOT, "docs", "perf"), { recursive: true }); writeFileSync(join(ROOT, "docs", "perf", "latest.md"), out + "\n");
process.exit(errors.length ? 1 : 0);
