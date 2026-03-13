const { app, BrowserWindow, screen, ipcMain } = require("electron");
const path = require("path");

function createWindow() {
  const display = screen.getPrimaryDisplay();
  const { width, height } = display.workAreaSize;
  const TASKBAR_HOVER_GAP = 2;

  const win = new BrowserWindow({
    width,
    height: Math.max(1, height - TASKBAR_HOVER_GAP),
    show: true,
    frame: false,
    titleBarStyle: "hidden",
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

  const lockedHeight = Math.max(1, height - TASKBAR_HOVER_GAP);

  win.setResizable(false);
  win.setMinimumSize(width, lockedHeight);
  win.setMaximumSize(width, lockedHeight);
  win.setSize(width, lockedHeight);

  win.setPosition(0, 0);
  win.on("move", () => win.setPosition(0, 0));
  win.on("maximize", () => win.unmaximize());

  if (!app.isPackaged) {
    win.loadURL("http://localhost:5173");
  } else {
    win.loadFile(path.join(__dirname, "..", "renderer", "dist", "index.html"));
  }

  win.webContents.on("did-fail-load", (_event, errorCode, errorDescription) => {
    console.error("Window failed to load:", errorCode, errorDescription);
  });
}

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
