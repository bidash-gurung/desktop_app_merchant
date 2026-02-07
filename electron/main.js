// main.js
const { app, BrowserWindow, screen, ipcMain } = require("electron");
const path = require("path");

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  const win = new BrowserWindow({
    width,
    height,
    show: true,

    // ✅ no OS titlebar => no dragging
    frame: false,
    titleBarStyle: "hidden",

    // ✅ lock size
    resizable: false,
    maximizable: false,
    fullscreenable: false,

    autoHideMenuBar: true,

    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // ✅ enforce exact size
  win.setResizable(false);
  win.setMinimumSize(width, height);
  win.setMaximumSize(width, height);
  win.setSize(width, height);

  // ✅ keep it pinned top-left
  win.setPosition(0, 0);
  win.on("move", () => win.setPosition(0, 0));
  win.on("maximize", () => win.unmaximize());

  const isDev = !app.isPackaged;
  if (isDev) win.loadURL("http://localhost:5173");
  else
    win.loadFile(path.join(__dirname, "..", "renderer", "dist", "index.html"));
}

// ✅ window controls
ipcMain.on("app:minimize", (e) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  if (win) win.minimize();
});

ipcMain.on("app:close", (e) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  if (win) win.close();
});

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
