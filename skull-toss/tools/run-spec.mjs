// Runs TEST_SPEC.js headless against the dev build and exits non-zero on any failure.
//   python3 src/build.py --dev && node tools/run-spec.mjs            (from skull-toss/)
//   node tools/run-spec.mjs <folder> [page]                          (defaults: this repo folder, index-dev.html)
// Needs Playwright with Chromium: npm install playwright && npx playwright install chromium
import { chromium } from "playwright";
import http from "http"; import fs from "fs"; import path from "path"; import url from "url";
const here = path.dirname(url.fileURLToPath(import.meta.url));
const dir = path.resolve(process.argv[2] || path.join(here, "..")), page = process.argv[3] || "index-dev.html";
const types = { ".html": "text/html", ".js": "text/javascript", ".mp3": "audio/mpeg", ".json": "application/json" };
const srv = http.createServer((q, r) => {
  const f = path.join(dir, decodeURIComponent(q.url.split("?")[0]));
  if (!f.startsWith(dir)) { r.writeHead(403); r.end(); return; }
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { "content-type": types[path.extname(f)] || "application/octet-stream" }); r.end(d); } });
}).listen(0);
const port = srv.address().port;
const b = await chromium.launch(), pg = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errors = []; pg.on("pageerror", e => errors.push(e.message));
await pg.goto(`http://localhost:${port}/${page}?test`, { waitUntil: "domcontentloaded", timeout: 120000 });
await pg.waitForFunction(() => window.__skullTossResults, null, { timeout: 600000 });
const res = await pg.evaluate(() => window.__skullTossResults), fail = res.filter(r => !r.pass);
console.log(`${res.length - fail.length}/${res.length} passed`);
for (const f of fail) console.log("FAIL:", f.name, "\n   ", f.error);
if (errors.length) console.log("page errors:\n  " + errors.join("\n  "));
await b.close(); srv.close(); process.exit(fail.length || errors.length ? 1 : 0);
