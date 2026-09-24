// The device matrix (v41): every screen and sheet at eleven sizes, from a small phone to an ultrawide monitor, checked
// for what a player would notice. Writes docs/QA-MATRIX.md and a contact sheet per size in qa/ (not committed).
//   python3 src/build.py --dev && node tools/matrix.mjs            (exit 1 if anything fails)
// Checks, per size:
//   - nothing runs off the side (no horizontal scroll on any screen or sheet);
//   - no text is cut off (a label wider than its box, where the box hides the overflow);
//   - on touch sizes, every visible button is at least 40 px tall (the spec's 44 px goal allows for padding);
//   - every visible button and switch has a name a screen reader can read;
//   - in play, the HUD sits inside the screen and the play field fills it.
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PAGE = pathToFileURL(join(ROOT, "index-dev.html")).href;
const SIZES = [
  ["small phone (iPhone SE 1st gen)", 320, 568, true], ["Android phone", 360, 640, true], ["iPhone 15", 393, 852, true], ["iPhone 15 Pro Max", 430, 932, true],
  ["phone, landscape", 852, 393, true], ["foldable, open", 673, 841, true], ["iPad mini", 744, 1133, true], ["iPad Pro 13-inch", 1032, 1376, true],
  ["Steam Deck", 1280, 800, false], ["laptop", 1440, 900, false], ["ultrawide", 2560, 1080, false]
];
const SHEETS = ["play", "customize", "challenges", "store", "settings", "profile", "achievements", "codex", "mastery", "board", "souls"];

const browser = await chromium.launch();
const results = [];
mkdirSync(join(ROOT, "qa"), { recursive: true });
for (const [name, width, height, touch] of SIZES) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, hasTouch: touch, isMobile: touch && width < 900 });
  const page = await ctx.newPage(); const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto(PAGE); await page.waitForFunction(() => window.SkullToss && window.SkullToss.debug && window.SkullToss.debug.sandbox);
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => { const T = window.SkullToss.debug; T.sandbox(true); T.pause(true); T.setStats({ bones: 12345, bestStage: 8, bossKills: 6, games: 30 }); T.toTitle(); });
  await page.waitForTimeout(700);
  const problems = [];
  const inspect = async where => page.evaluate(([where, touch]) => {
    const out = [], vw = innerWidth, doc = document.documentElement;
    if (doc.scrollWidth > vw + 1) out.push(`${where}: the page scrolls sideways (${doc.scrollWidth} > ${vw})`);
    const shown = el => { const r = el.getBoundingClientRect(), cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none" && !el.closest("[hidden]"); };
    const scope = document.querySelector(".sheet:not([hidden])") || document.querySelector(".screen.on, .screen:not([hidden])") || document.body;
    if (scope.classList && scope.classList.contains("sheet")) { const b = scope.querySelector(".sheet-body") || scope; if (b.scrollWidth > b.clientWidth + 2) out.push(`${where}: the sheet scrolls sideways (${b.scrollWidth} > ${b.clientWidth})`); }
    for (const el of scope.querySelectorAll("button, [role=switch], [role=radio], a[href], input, select")) {
      if (!shown(el)) continue;
      const r = el.getBoundingClientRect(), label = (el.getAttribute("aria-label") || el.textContent || el.getAttribute("title") || el.getAttribute("placeholder") || (el.labels && el.labels[0] && el.labels[0].textContent) || "").trim();
      const id = el.id || el.dataset.sheet || el.dataset.mode || el.dataset.v || (el.textContent || "").trim().slice(0, 24) || el.className;
      if (!label) out.push(`${where}: a control with no readable name (${el.outerHTML.slice(0, 80)})`);
      const strip = (() => { for (let p = el.parentElement; p; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if ((o === "auto" || o === "scroll") && p.scrollWidth > p.clientWidth && !p.classList.contains("sheet-body")) return true; } return false; })();
      if ((r.right > vw + 1 || r.left < -1) && !strip) out.push(`${where}: "${id}" runs off the side`);   // (a strip that scrolls sideways on purpose is fine)
      const hit = r.height + 2 * (parseFloat(getComputedStyle(el).getPropertyValue("--hit")) || 0);   // (--hit: a hit area drawn wider than the control)
      if (touch && hit < 40 && !el.closest(".seg") && el.type !== "range") out.push(`${where}: "${id}" is ${Math.round(hit)} px tall, short for a finger`);
    }
    for (const el of scope.querySelectorAll("b, span, p, h2, h3, .lbl, .sub, button")) {
      if (!shown(el) || !el.textContent.trim()) continue;
      const cs = getComputedStyle(el);
      if ((cs.overflow === "hidden" || cs.overflowX === "hidden" || cs.textOverflow === "ellipsis") && el.scrollWidth > el.clientWidth + 2 && cs.whiteSpace !== "normal")
        out.push(`${where}: text cut off in "${el.textContent.trim().slice(0, 30)}"`);
    }
    return out;
  }, [where, touch]);
  problems.push(...await inspect("title"));
  await page.screenshot({ path: join(ROOT, "qa", `${width}x${height}-title.png`) });
  for (const s of SHEETS) {
    await page.evaluate(s => { const T = window.SkullToss.debug; T.toTitle(); T.openSheet(s); }, s);
    await page.waitForTimeout(250);
    problems.push(...await inspect(`sheet ${s}`));
    if (s === "customize" || s === "settings") await page.screenshot({ path: join(ROOT, "qa", `${width}x${height}-${s}.png`) });
  }
  // in play: the field fills the screen, the HUD is inside it
  await page.evaluate(() => { const T = window.SkullToss.debug; T.closeSheet(); T.start(); T.step(2); });
  await page.waitForTimeout(300);
  problems.push(...await page.evaluate(() => {
    const out = [], st = document.getElementById("stage").getBoundingClientRect();
    if (Math.abs(st.width - innerWidth) > 2 || Math.abs(st.height - innerHeight) > 2) out.push(`play: the field is ${Math.round(st.width)}×${Math.round(st.height)}, not the screen`);
    for (const el of document.querySelectorAll(".hud > *, #hint, .prog")) { const r = el.getBoundingClientRect(); if (r.width && (r.left < -1 || r.right > innerWidth + 1 || r.top < -1 || r.bottom > innerHeight + 1)) out.push(`play: ${el.id || el.className} is off the screen`); }
    return out;
  }));
  await page.screenshot({ path: join(ROOT, "qa", `${width}x${height}-play.png`) });
  if (errors.length) problems.push(...errors.map(e => `page error: ${e}`));
  results.push({ name, width, height, touch, problems: [...new Set(problems)] });
  console.log(`${problems.length ? "FAIL" : "ok  "} ${name} ${width}×${height}${problems.length ? "\n  " + [...new Set(problems)].join("\n  ") : ""}`);
  await ctx.close();
}
await browser.close();
const md = ["# The device matrix", "", "Written by `node tools/matrix.mjs` (v41). Each size opens the title, all eleven sheets and a run in play, and checks for sideways scrolling, clipped text, controls that run off the screen, touch targets under 40 px, unnamed controls, and a HUD or play field that doesn't fit. Screenshots of each size are in `qa/` after a run.", "",
  "| Size | Viewport | Touch | Result |", "|---|---|---|---|",
  ...results.map(r => `| ${r.name} | ${r.width} × ${r.height} | ${r.touch ? "yes" : "no"} | ${r.problems.length ? `**${r.problems.length} problem${r.problems.length > 1 ? "s" : ""}**` : "pass"} |`), "",
  ...results.filter(r => r.problems.length).flatMap(r => [`## ${r.name} (${r.width} × ${r.height})`, "", ...r.problems.map(p => `- ${p}`), ""])];
writeFileSync(join(ROOT, "docs", "QA-MATRIX.md"), md.join("\n") + "\n");
process.exit(results.some(r => r.problems.length) ? 1 : 0);
