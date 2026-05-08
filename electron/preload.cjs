const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("timeTravel", {
  setOpacity: (value) => ipcRenderer.send("set-opacity", value),

  setAlwaysOnTop: (value) => ipcRenderer.send("set-always-on-top", value),

  setClickThrough: (value) => ipcRenderer.send("set-click-through", value),

  closeWindow: () => ipcRenderer.send("close-window"),

  minimizeWindow: () => ipcRenderer.send("minimize-window"),

  onClickThroughOff: (callback) => {
    ipcRenderer.on("click-through-off", callback);
  },

  transcribeAudio: (audioBuffer) => {
    return ipcRenderer.invoke("transcribe-audio", audioBuffer);
  }
});