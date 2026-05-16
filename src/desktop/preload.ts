import electron from 'electron';

const { contextBridge, ipcRenderer } = electron;

contextBridge.exposeInMainWorld('wechatOpenCode', {
  chooseDirectory: () => ipcRenderer.invoke('choose-directory'),
  setup: (cwd: string) => ipcRenderer.invoke('setup', cwd),
  start: () => ipcRenderer.invoke('start'),
  stop: () => ipcRenderer.invoke('stop'),
  getStatus: () => ipcRenderer.invoke('get-status'),
  onLog: (callback: (entry: { source: string; text: string; timestamp: string }) => void) => {
    ipcRenderer.on('log', (_event, entry) => callback(entry));
  },
  onStatus: (callback: (status: { running: boolean; pid?: number }) => void) => {
    ipcRenderer.on('status', (_event, status) => callback(status));
  },
});
