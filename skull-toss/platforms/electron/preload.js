// The only thing the page sees of the desktop: window.skullTossDesktop (read by src/js/03e_platform.js)
const { contextBridge, ipcRenderer } = require("electron");
const steam = ipcRenderer.sendSync("steam:info");
contextBridge.exposeInMainWorld("skullTossDesktop", {
  setFullscreen: on => ipcRenderer.send("win:fullscreen", !!on),
  isFullscreen: () => ipcRenderer.sendSync("win:isFullscreen"),
  quit: () => ipcRenderer.send("app:quit"),
  onBlur: fn => ipcRenderer.on("win:hidden", (e, hidden) => fn(!!hidden)),
  steam: { ok: !!steam.ok, name: String(steam.name || ""), activate: id => ipcRenderer.send("steam:achievement", String(id)) }
});
