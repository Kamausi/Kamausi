// Skull Toss on the desktop: one window with the game's page (app/index.html, from tools/package.py electron), full
// screen on F11 or from Settings, and Steam when it's running (achievements and the overlay; steamworks.js).
// The page gets a small, fixed bridge (preload.js) and nothing else: no Node, no file system.
const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path"), fs = require("fs");

// Steam: the app id from STEAM_APP_ID or steam_appid.txt (for development; Steam supplies it when launched from Steam)
function steamAppId() {
  if (process.env.STEAM_APP_ID) return Number(process.env.STEAM_APP_ID);
  try { return Number(fs.readFileSync(path.join(__dirname, "steam_appid.txt"), "utf8").trim()); } catch (e) { return 0; }
}
let steam = null;
try {
  const id = steamAppId();
  if (id) { const sw = require("steamworks.js"); steam = sw.init(id); sw.electronEnableSteamOverlay(); }
} catch (e) { console.warn("Steam isn't running, or steamworks.js couldn't start:", e.message); steam = null; }

let win = null;
function create() {
  win = new BrowserWindow({
    width: 1280, height: 800, minWidth: 360, minHeight: 560, backgroundColor: "#17130F", autoHideMenuBar: true, title: "Skull Toss", show: false,
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, sandbox: true, nodeIntegration: false }
  });
  win.loadFile(path.join(__dirname, "app", "index.html"));
  win.once("ready-to-show", () => win.show());
  // the page never navigates away; links open in the system browser
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https:/.test(url)) shell.openExternal(url); return { action: "deny" }; });
  win.webContents.on("will-navigate", e => e.preventDefault());
  win.webContents.on("before-input-event", (e, input) => { if (input.type === "keyDown" && input.key === "F11") { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); } });
  const hidden = h => { if (win && !win.isDestroyed()) win.webContents.send("win:hidden", h); };
  win.on("minimize", () => hidden(true)); win.on("restore", () => hidden(false));
}
ipcMain.on("win:fullscreen", (e, on) => win && win.setFullScreen(!!on));
ipcMain.on("win:isFullscreen", e => { e.returnValue = !!(win && win.isFullScreen()); });
ipcMain.on("app:quit", () => app.quit());
ipcMain.on("steam:info", e => { let name = ""; try { name = steam ? steam.localplayer.getName() : ""; } catch (x) {} e.returnValue = { ok: !!steam, name }; });
ipcMain.on("steam:achievement", (e, id) => { try { if (steam && /^[A-Z0-9_]{1,64}$/.test(id)) steam.achievement.activate(id); } catch (x) {} });

app.whenReady().then(create);
app.on("window-all-closed", () => app.quit());
