#!/usr/bin/env python3
"""Package the game for each platform (v40).

    python3 tools/package.py web         dist/web: the installable web app (manifest, icons, a service worker, the music)
    python3 tools/package.py capacitor   platforms/capacitor/www: the page for the iOS and Android shell
    python3 tools/package.py electron    platforms/electron/app: the page for the desktop (Steam) shell
    python3 tools/package.py all         all three

Each is the release build (no test hooks) with the music beside it. Run node tools/store-assets.mjs first if
store/icons is missing. The web package is what firebase/firebase.json hosts."""
import json, pathlib, re, shutil, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
VERSION = json.loads((ROOT / "src" / "version.json").read_text())
MUSIC = ["menu.mp3", "a.mp3", "b.mp3", "boss.mp3", "pause.mp3", "shop.mp3"]
ICONS = ["icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png", "favicon-32.png"]


def build(pwa):
    subprocess.run([sys.executable, str(ROOT / "src" / "build.py")] + (["--pwa"] if pwa else []), check=True)
    return (ROOT / "index.html").read_text()


def fresh(folder):
    if folder.exists(): shutil.rmtree(folder)
    folder.mkdir(parents=True)
    return folder


def music(dest):
    (dest / "music").mkdir(exist_ok=True)
    for fn in MUSIC:
        src = ROOT / "music" / fn
        if src.exists(): shutil.copy2(src, dest / "music" / fn)


HEAD = """<meta name="theme-color" content="#17130F">
<meta name="description" content="Lob a cartoon skull through a haunted ring. A lost cartoon from 1933.">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" sizes="32x32" href="icons/favicon-32.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Skull Toss">
"""

MANIFEST = {
    "name": "Skull Toss", "short_name": "Skull Toss", "description": "Lob a cartoon skull through a haunted ring. A lost cartoon from 1933.",
    "start_url": "./", "scope": "./", "display": "fullscreen", "orientation": "portrait", "background_color": "#17130F", "theme_color": "#17130F",
    "categories": ["games"],
    "icons": [{"src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png"}, {"src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png"},
              {"src": "icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}]
}

# the service worker: the page is fetched fresh when there's a network (so a new build arrives at once) and served from
# the cache when there isn't; the music and icons come from the cache. Each build has its own cache; old ones go.
SW = """// Skull Toss's service worker (written by tools/package.py; build __BUILD__)
const CACHE = "skull-toss-__BUILD__", FILES = __FILES__;
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;   // (Firebase and fonts go straight to the network)
  if (req.mode === "navigate" || url.pathname.endsWith("/") || url.pathname.endsWith("index.html")) {
    e.respondWith(fetch(req).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put("./", copy)); return r; }).catch(() => caches.match("./")));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
});
"""


def web():
    html = build(pwa=True)
    dest = fresh(ROOT / "dist" / "web")
    html = html.replace("<title>Skull Toss</title>", "<title>Skull Toss</title>\n" + HEAD, 1)
    (dest / "index.html").write_text(html)
    music(dest)
    (dest / "icons").mkdir()
    for fn in ICONS:
        src = ROOT / "store" / "icons" / fn
        if not src.exists(): sys.exit(f"package refused: store/icons/{fn} is missing (run: python3 src/build.py --dev && node tools/store-assets.mjs icons)")
        shutil.copy2(src, dest / "icons" / fn)
    (dest / "manifest.webmanifest").write_text(json.dumps(MANIFEST, indent=1))
    files = ["./", "manifest.webmanifest"] + [f"icons/{fn}" for fn in ICONS] + [f"music/{fn}" for fn in MUSIC if (dest / "music" / fn).exists()]
    (dest / "sw.js").write_text(SW.replace("__BUILD__", str(VERSION["build"])).replace("__FILES__", json.dumps(files)))
    print(f"dist/web: build {VERSION['build']}, {sum(f.stat().st_size for f in dest.rglob('*') if f.is_file()) // 1024} KB")


def shell(name, sub):
    html = build(pwa=False)
    dest = fresh(ROOT / "platforms" / name / sub)
    (dest / "index.html").write_text(html)
    music(dest)
    print(f"platforms/{name}/{sub}: build {VERSION['build']}")


targets = sys.argv[1:] or ["all"]
for t in targets:
    if t in ("web", "all"): web()
    if t in ("capacitor", "all"): shell("capacitor", "www")
    if t in ("electron", "all"): shell("electron", "app")
    if t not in ("web", "capacitor", "electron", "all"): sys.exit(__doc__)
build(pwa=False)   # (leave the plain release build in index.html)
