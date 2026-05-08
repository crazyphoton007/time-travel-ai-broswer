const { app, BrowserWindow, ipcMain, globalShortcut } = require("electron");
const path = require("path");

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 700,
    minHeight: 450,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    backgroundColor: "#00000000",
    opacity: 0.88,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true
    }
  });

  mainWindow.loadURL("http://127.0.0.1:5173");
  mainWindow.setAlwaysOnTop(true, "screen-saver");

  globalShortcut.register("Control+Space", () => {
    mainWindow?.setIgnoreMouseEvents(false);
    mainWindow?.webContents.send("click-through-off");
  });
}

app.whenReady().then(createWindow);

ipcMain.on("set-opacity", (_, value) => {
  mainWindow?.setOpacity(value);
});

ipcMain.on("set-always-on-top", (_, value) => {
  mainWindow?.setAlwaysOnTop(value, "screen-saver");
});

ipcMain.on("set-click-through", (_, value) => {
  mainWindow?.setIgnoreMouseEvents(value, { forward: true });
});

ipcMain.on("close-window", () => {
  mainWindow?.close();
});

ipcMain.on("minimize-window", () => {
  mainWindow?.minimize();
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});