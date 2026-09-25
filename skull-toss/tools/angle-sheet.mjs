// Morty's production sheet (v52): the skull as the game draws it, exported at the art's own 1000×1000 scale.
//   docs/art/morty/front.png                 the neutral front view, transparent
//   docs/art/morty/expressions/<mood>.png    each of the rig's 16 moods, transparent, 1000×1200: the same pivot and
//                                            the same x/y as the layers, with 200 px below for the dropped jaw
//   docs/art/morty/sheet-expressions.png     all 16 on one sheet, labelled
//   docs/art/morty/sheet-landmarks.png       the front view with its construction: pivot, sockets, nose, jaw hinge, bounds
//   docs/art/morty/landmarks.json            the same landmarks as numbers, in the 1000-px art space
// The source is the seven SVG layers in src/art/skull (one 1000×1000 canvas each); these exports are drawn from them by
// the game's own rig (08a_skull.js), so they match the game exactly. Only the front view exists: the rig turns the
// skull in the picture plane (roll), not round its vertical axis, so ¼, ½, ¾ and side views are for an illustrator.
//   python3 src/build.py --dev && node tools/angle-sheet.mjs
import { chromium } from "playwright";
import { dirname, join } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "docs", "art", "morty");
mkdirSync(join(OUT, "expressions"), { recursive: true });
const MOODS = ["idle", "aim", "fear", "excited", "perfect", "confused", "deadpan", "dizzy", "sleep", "happy", "smug", "strain", "ouch", "gleeful", "triumph", "ko"];
const browser = await chromium.launch(); const page = await browser.newPage();
await page.goto(pathToFileURL(join(ROOT, "index-dev.html")).href);
await page.waitForFunction(() => window.SkullToss && window.SkullToss.debug && window.SkullToss.debug.skullCard);
const data = await page.evaluate(async MOODS => {
  const T = window.SkullToss.debug, A = T.skullArt().art, N = 1000;
  // the rig's skull units (r = 1) at the art's own scale: 1 unit = 1 / k art pixels, centred on the art's pivot
  // (drawn on a 1200 square so an open jaw has room, then cropped to 1000 wide: the art's x and y stay as they are)
  const look = { hat: "none", aura: "none" }, M = 1200;
  const draw = (mood, h) => new Promise(res => { const img = new Image(); img.onload = () => { const cv = document.createElement("canvas"); cv.width = N; cv.height = h;
    cv.getContext("2d").drawImage(img, -(M - N) / 2, 0); res(cv.toDataURL("image/png")); };
    img.src = T.skullCard({ size: M, bg: "transparent", mood, t: 1.3, r: 1 / A.k / M, cy: A.cy / M, look }); });
  // (skullCard centres x on the square: shifting by (M − N) / 2 puts the pivot back on x = 500)
  const out = { moods: {} };
  out.front = await draw("idle", N);
  for (const m of MOODS) out.moods[m] = await draw(m, M);
  const S = T.skullArt(), toArt = (x, y) => ({ x: +(x / A.k + A.cx).toFixed(1), y: +(y / A.k + A.cy).toFixed(1) });
  out.landmarks = {
    canvas: [N, N], units: "art pixels (the SVG layers' 1000×1000 space)",
    pivot: { x: A.cx, y: +A.cy.toFixed(1), note: "the rig's centre: it scales, stretches and rolls about this point" },
    bounds: { top: +A.top.toFixed(1), bottom: +A.bot.toFixed(1), note: "the whole skull, jaw shut, plus a 9-px margin; 2.2 skull radii tall" },
    radius: +(1 / A.k).toFixed(1),
    cranium: A.box.cranium, jaw: A.box.jaw, mouth: A.box.mouth, teethUpper: A.box.upper, teethLower: A.box.lower,
    jawHinge: { y: +A.box.jaw.y0.toFixed(1), note: "the jaw drops from here" },
    noseBottom: toArt(0, A.noseBot).y, teethTop: toArt(0, A.upperTop).y,
    sockets: S.sockets.map((s, i) => ({ side: i ? "right" : "left", ...toArt(s.x, s.y), rx: +(s.rx / A.k).toFixed(1), ry: +(s.ry / A.k).toFixed(1) }))
  };
  // the landmark sheet: the front view on paper, with its construction drawn over it
  const cv = document.createElement("canvas"); cv.width = cv.height = N; const c = cv.getContext("2d"), L = out.landmarks;
  c.fillStyle = "#E8D8B4"; c.fillRect(0, 0, N, N);
  c.strokeStyle = "rgba(23,19,15,.12)"; c.lineWidth = 1; for (let i = 0; i <= N; i += 50) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, N); c.moveTo(0, i); c.lineTo(N, i); c.stroke(); }
  return new Promise(res => { const img = new Image(); img.onload = () => {
    c.drawImage(img, 0, 0);
    const line = (x0, y0, x1, y1, col, dash = []) => { c.strokeStyle = col; c.setLineDash(dash); c.lineWidth = 2; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); c.setLineDash([]); };
    const label = (s, x, y, col) => { c.font = "700 18px sans-serif"; c.fillStyle = col; c.fillText(s, x, y); };
    const box = (b, col, name) => { c.strokeStyle = col; c.lineWidth = 2; c.setLineDash([6, 4]); c.strokeRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0); c.setLineDash([]); label(name, b.x1 + 6, b.y0 + 16, col); };
    line(L.pivot.x, 0, L.pivot.x, N, "#A94332", [10, 6]); line(0, L.pivot.y, N, L.pivot.y, "#A94332", [10, 6]);
    c.fillStyle = "#A94332"; c.beginPath(); c.arc(L.pivot.x, L.pivot.y, 7, 0, Math.PI * 2); c.fill(); label("PIVOT", L.pivot.x + 10, L.pivot.y - 10, "#A94332");
    line(0, L.bounds.top, N, L.bounds.top, "#356B68"); line(0, L.bounds.bottom, N, L.bounds.bottom, "#356B68"); label("TOP", 12, L.bounds.top - 6, "#356B68"); label("BOTTOM", 12, L.bounds.bottom + 20, "#356B68");
    line(0, L.jawHinge.y, N, L.jawHinge.y, "#C49A42", [4, 4]); label("JAW HINGE", 12, L.jawHinge.y - 6, "#8A6A22");
    line(0, L.noseBottom, N, L.noseBottom, "#66506B", [4, 4]); label("NOSE", 12, L.noseBottom - 6, "#66506B");
    box(L.cranium, "#26364A", "cranium"); box(L.jaw, "#26364A", "jaw");
    for (const s of L.sockets) { c.strokeStyle = "#A94332"; c.lineWidth = 2; c.beginPath(); c.ellipse(s.x, s.y, s.rx, s.ry, 0, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.moveTo(s.x - 10, s.y); c.lineTo(s.x + 10, s.y); c.moveTo(s.x, s.y - 10); c.lineTo(s.x, s.y + 10); c.stroke(); }
    label("MORTY · FRONT · 1000×1000 art space", 20, 36, "#17130F");
    out.landmarkSheet = cv.toDataURL("image/png"); res(out);
  }; img.src = out.front; });
}, MOODS);
// the expression sheet: 4 × 4, each cell a quarter-size render on paper with its name
const sheet = await page.evaluate(({ moods, MOODS }) => new Promise(res => {
  const cell = 300, ch = 360, cv = document.createElement("canvas"); cv.width = cell * 4; cv.height = ch * 4 + 60; const c = cv.getContext("2d");
  c.fillStyle = "#E8D8B4"; c.fillRect(0, 0, cv.width, cv.height); c.font = "700 26px sans-serif"; c.fillStyle = "#17130F"; c.fillText("MORTY · EXPRESSIONS · front", 20, 40);
  let n = 0; MOODS.forEach((m, i) => { const img = new Image(); img.onload = () => {
    const x = (i % 4) * cell, y = 60 + Math.floor(i / 4) * ch; c.drawImage(img, x, y - 10, cell, ch);
    c.font = "700 20px sans-serif"; c.fillStyle = "#A94332"; c.fillText(m, x + 16, y + ch - 16);
    if (++n === MOODS.length) res(cv.toDataURL("image/png")); }; img.src = moods[m]; });
}), { moods: data.moods, MOODS });
await browser.close();
const save = (path, url) => writeFileSync(join(OUT, path), Buffer.from(url.split(",")[1], "base64"));
save("front.png", data.front);
for (const m of MOODS) save(`expressions/${m}.png`, data.moods[m]);
save("sheet-landmarks.png", data.landmarkSheet); save("sheet-expressions.png", sheet);
writeFileSync(join(OUT, "landmarks.json"), JSON.stringify(data.landmarks, null, 1) + "\n");
console.log(`wrote ${3 + MOODS.length} images and landmarks.json to docs/art/morty`);
