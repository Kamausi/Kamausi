// The store art: app icons, splash screens, store screenshots and Steam's capsules, all drawn by the game itself.
//   python3 src/build.py --dev && node tools/store-assets.mjs            (everything)
//   node tools/store-assets.mjs icons | shots | steam                     (one set)
// Icons go in store/icons (and platforms/capacitor/assets for @capacitor/assets); screenshots in store/screenshots/<device>;
// Steam's capsules in store/steam. The screenshots and capsules are starting points: replace any with better ones.
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PAGE = pathToFileURL(join(ROOT, "index-dev.html")).href;
const which = process.argv[2] || "all";
const save = (file, dataUrl) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, Buffer.from(dataUrl.split(",")[1], "base64")); console.log("  " + file.slice(ROOT.length + 1)); };

const browser = await chromium.launch();
async function open(viewport, scale = 1) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: scale });
  page.on("pageerror", e => console.error("page error:", e.message));
  await page.goto(PAGE); await page.waitForFunction(() => window.SkullToss && window.SkullToss.debug && window.SkullToss.debug.renderIcon);
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => { const T = window.SkullToss.debug; T.sandbox(true); T.pause(true); });
  return page;
}

// ── icons ──
if (which === "all" || which === "icons") {
  console.log("icons");
  const page = await open({ width: 400, height: 800 });
  const icons = [["icon-1024.png", 1024, {}], ["icon-512.png", 512, {}], ["icon-192.png", 192, {}], ["icon-maskable-512.png", 512, { maskable: true }],
    ["apple-touch-icon.png", 180, {}], ["favicon-32.png", 32, {}], ["icon-foreground-1024.png", 1024, { transparent: true, maskable: true }]];
  for (const [name, size, o] of icons) save(join(ROOT, "store/icons", name), await page.evaluate(([s, o]) => window.SkullToss.debug.renderIcon(s, o), [size, o]));
  // @capacitor/assets reads these names (icon-only, icon-foreground, icon-background, splash, splash-dark)
  const cap = join(ROOT, "platforms/capacitor/assets");
  save(join(cap, "icon-only.png"), await page.evaluate(() => window.SkullToss.debug.renderIcon(1024)));
  save(join(cap, "icon-foreground.png"), await page.evaluate(() => window.SkullToss.debug.renderIcon(1024, { transparent: true, maskable: true })));
  save(join(cap, "icon-background.png"), await page.evaluate(() => { const c = document.createElement("canvas"); c.width = c.height = 1024; const x = c.getContext("2d"); x.fillStyle = "#26364A"; x.fillRect(0, 0, 1024, 1024); return c.toDataURL(); }));
  await page.close();
  const splash = await open({ width: 1366, height: 1366 }, 2);
  await splash.evaluate(() => window.SkullToss.debug.toTitle()); await splash.waitForTimeout(600);
  const s = await splash.evaluate(() => window.SkullToss.debug.renderCapsule(2732, 2732, { logoOnly: true, tagline: true, jpeg: true }));
  save(join(cap, "splash.jpg"), s); save(join(cap, "splash-dark.jpg"), s);
  await splash.close();
}

// ── store screenshots ──
const DEVICES = {
  "iphone-6.9": { viewport: { width: 430, height: 932 }, scale: 3 },     // 1290 × 2796 (App Store 6.9" / 6.7")
  "iphone-6.5": { viewport: { width: 414, height: 896 }, scale: 3 },     // 1242 × 2688 (App Store 6.5")
  "ipad-13": { viewport: { width: 1024, height: 1366 }, scale: 2 },      // 2048 × 2732 (App Store 12.9"/13")
  "android-phone": { viewport: { width: 360, height: 640 }, scale: 3 },  // 1080 × 1920 (Google Play)
  "steam": { viewport: { width: 1920, height: 1080 }, scale: 1 }         // 1920 × 1080 (Steam)
};
const SCENES = {
  "1-title": T => { T.setStats({ bones: 2450, bestStage: 5, games: 24, bestScore: 48200, bossKills: 4 }); T.toTitle(); },
  "2-aim": T => { T.setStats({ bestStage: 8, bossKills: 4 }); T.startMode("arcade", 2); T.step(4.5); T.calm(); T.holdAim(0.18, 0.62); T.step(0.2); document.querySelector(".stagecard").hidden = true; },
  "3-boss": T => { T.setStats({ bestStage: 8, bossKills: 4 }); T.start(); T.setStage(4); T.startBoss("end"); T.step(5.5); T.calm(); T.holdAim(-0.12, 0.58); T.step(0.2); document.querySelector(".stagecard").hidden = true; },
  "4-vault": T => { T.setStats({ bones: 5200, bestStage: 6, games: 40, makes: 900, perfects: 60 }); T.toTitle(); T.openSheet("customize"); },
  "5-director": T => { T.setStats({ bestStage: 3, bossKills: 2 }); T.toTitle(); document.getElementById("play").click(); }
};
if (which === "all" || which === "shots") {
  console.log("screenshots");
  for (const [device, D] of Object.entries(DEVICES)) {
    const page = await open(D.viewport, D.scale);
    for (const [name, set] of Object.entries(SCENES)) {
      await page.evaluate(src => { const T = window.SkullToss.debug; T.closeSheet(); (0, eval)(src)(T); }, `(${set.toString()})`);
      await page.waitForTimeout(900);
      const file = join(ROOT, "store/screenshots", device, `${name}.jpg`); mkdirSync(dirname(file), { recursive: true });
      await page.screenshot({ path: file, type: "jpeg", quality: 90 }); console.log("  " + file.slice(ROOT.length + 1));
    }
    await page.close();
  }
}

// ── Steam's capsules (partner.steamgames.com → Store Assets and Library Assets) ──
if (which === "all" || which === "steam") {
  console.log("steam capsules");
  const CAPS = [["header-920x430.png", 920, 430, {}], ["small-462x174.png", 462, 174, {}], ["main-1232x706.png", 1232, 706, { tagline: true }],
    ["vertical-748x896.png", 748, 896, { logoOnly: true, tagline: true }], ["library-600x900.png", 600, 900, { logoOnly: true, tagline: true }],
    ["library-hero-3840x1240.jpg", 3840, 1240, { art: false, jpeg: true }], ["library-logo-1280x720.png", 1280, 720, { transparent: true, logoOnly: true }]];
  for (const [name, w, h, o] of CAPS) {
    const page = await open({ width: Math.round(w / 2), height: Math.round(h / 2) }, 2);
    await page.evaluate(() => window.SkullToss.debug.toTitle()); await page.evaluate(() => { for (const el of document.querySelectorAll(".screen, .hud")) el.style.visibility = "hidden"; });
    await page.waitForTimeout(700);
    save(join(ROOT, "store/steam", name), await page.evaluate(([w, h, o]) => window.SkullToss.debug.renderCapsule(w, h, o), [w, h, o]));
    await page.close();
  }
}
await browser.close();
