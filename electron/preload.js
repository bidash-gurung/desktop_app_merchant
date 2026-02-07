// preload.js
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("appWindow", {
  minimize: () => ipcRenderer.send("app:minimize"),
  close: () => ipcRenderer.send("app:close"),
});
