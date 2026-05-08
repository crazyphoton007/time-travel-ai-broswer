const { app, BrowserWindow, ipcMain, globalShortcut, session } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
require("dotenv").config();

const OpenAIImport = require("openai");
const OpenAI = OpenAIImport.default || OpenAIImport;

let mainWindow;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

function createWindow() {
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === "media") {
      callback(true);
      return;
    }

    callback(true);
  });

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

ipcMain.handle("transcribe-audio", async (_, audioBuffer) => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is missing in .env file");
  }

  const tempPath = path.join(os.tmpdir(), `timetravel-audio-${Date.now()}.webm`);

  try {
    fs.writeFileSync(tempPath, Buffer.from(audioBuffer));

    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempPath),
      model: "gpt-4o-mini-transcribe"
    });

    return transcription.text || "";
  } finally {
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
  }
});

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