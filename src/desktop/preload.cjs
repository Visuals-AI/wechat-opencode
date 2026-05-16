const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('wechatOpenCode', {
  chooseDirectory: () => ipcRenderer.invoke('choose-directory'),
  setup: (cwd) => ipcRenderer.invoke('setup', cwd),
  start: () => ipcRenderer.invoke('start'),
  stop: () => ipcRenderer.invoke('stop'),
  getStatus: () => ipcRenderer.invoke('get-status'),
  onLog: (callback) => {
    ipcRenderer.on('log', (_event, entry) => callback(entry));
  },
  onStatus: (callback) => {
    ipcRenderer.on('status', (_event, status) => callback(status));
  },
});
