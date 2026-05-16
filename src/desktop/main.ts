import electron from 'electron';
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

const { app, BrowserWindow, ipcMain, dialog } = electron;
type AppWindow = InstanceType<typeof BrowserWindow>;

let mainWindow: AppWindow | undefined;
let bridgeProcess: ChildProcess | undefined;

const projectRoot = app.isPackaged ? (process as any).resourcesPath : process.cwd();
const mainScript = join(projectRoot, 'dist', 'main.js');

function send(channel: string, payload: unknown): void {
  mainWindow?.webContents.send(channel, payload);
}

function appendLog(source: string, text: string): void {
  send('log', { source, text, timestamp: new Date().toISOString() });
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1120,
    height: 920,
    minWidth: 900,
    minHeight: 820,
    title: 'WeChat OpenCode Console',
    webPreferences: {
      preload: join(projectRoot, 'src', 'desktop', 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  void mainWindow.loadFile(join(projectRoot, 'src', 'desktop', 'renderer', 'index.html'));
  mainWindow.on('closed', () => {
    mainWindow = undefined;
  });
}

function setRunning(running: boolean): void {
  send('status', { running, pid: bridgeProcess?.pid });
}

function spawnNode(args: string[]): ChildProcess {
  return spawn(process.execPath, args, {
    cwd: projectRoot,
    env: { ...process.env, WOC_CONSOLE: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
}

ipcMain.handle('choose-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory'],
  });
  return result.canceled ? undefined : result.filePaths[0];
});

ipcMain.handle('setup', async (_event, cwd: string) => {
  if (!cwd) return { ok: false, error: '请选择工作目录' };
  if (!existsSync(mainScript)) return { ok: false, error: '请先运行 npm run build' };

  appendLog('system', `Starting setup with cwd: ${cwd}\n`);
  const child = spawnNode([mainScript, 'setup', '--cwd', cwd]);

  child.stdout?.on('data', (chunk) => appendLog('setup', String(chunk)));
  child.stderr?.on('data', (chunk) => appendLog('setup:error', String(chunk)));
  child.on('exit', (code) => appendLog('system', `Setup exited with code ${code}\n`));

  return { ok: true };
});

ipcMain.handle('start', async () => {
  if (bridgeProcess) return { ok: true, pid: bridgeProcess.pid };
  if (!existsSync(mainScript)) return { ok: false, error: '请先运行 npm run build' };

  bridgeProcess = spawnNode([mainScript, 'start']);
  appendLog('system', `Bridge started, PID ${bridgeProcess.pid}\n`);
  setRunning(true);

  bridgeProcess.stdout?.on('data', (chunk) => appendLog('bridge', String(chunk)));
  bridgeProcess.stderr?.on('data', (chunk) => appendLog('bridge:error', String(chunk)));
  bridgeProcess.on('exit', (code, signal) => {
    appendLog('system', `Bridge stopped, code=${code}, signal=${signal ?? 'none'}\n`);
    bridgeProcess = undefined;
    setRunning(false);
  });

  return { ok: true, pid: bridgeProcess.pid };
});

ipcMain.handle('stop', async () => {
  if (!bridgeProcess) return { ok: true };
  const pid = bridgeProcess.pid;
  if (process.platform === 'win32') {
    spawn('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
  } else {
    bridgeProcess.kill('SIGTERM');
  }
  appendLog('system', `Stop requested for PID ${pid}\n`);
  return { ok: true };
});

ipcMain.handle('get-status', async () => ({ running: !!bridgeProcess, pid: bridgeProcess?.pid }));

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (bridgeProcess) bridgeProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
