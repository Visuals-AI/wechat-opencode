declare module 'electron' {
  export const app: {
    isPackaged: boolean;
    whenReady(): Promise<void>;
    on(event: string, listener: (...args: any[]) => void): void;
    quit(): void;
  };

  export class BrowserWindow {
    constructor(options: any);
    webContents: { send(channel: string, payload: unknown): void };
    loadFile(path: string): Promise<void>;
    on(event: string, listener: (...args: any[]) => void): void;
    once(event: string, listener: (...args: any[]) => void): void;
    show(): void;
    focus(): void;
    static getAllWindows(): BrowserWindow[];
  }

  export const ipcMain: {
    handle(channel: string, listener: (event: unknown, ...args: any[]) => unknown): void;
  };

  export const ipcRenderer: {
    invoke(channel: string, ...args: any[]): Promise<any>;
    on(channel: string, listener: (event: unknown, ...args: any[]) => void): void;
  };

  export const contextBridge: {
    exposeInMainWorld(key: string, api: unknown): void;
  };

  export const dialog: {
    showOpenDialog(window: BrowserWindow, options: any): Promise<{ canceled: boolean; filePaths: string[] }>;
    showErrorBox(title: string, content: string): void;
  };
}
