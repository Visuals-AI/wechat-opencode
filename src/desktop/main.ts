import electron from 'electron';
import { spawn, type ChildProcess } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { homedir } from 'node:os';

const { app, BrowserWindow, ipcMain, dialog } = electron;
type AppWindow = InstanceType<typeof BrowserWindow>;

const desktopLogDir = join(homedir(), '.wechat-opencode', 'logs');
const desktopLogPath = join(desktopLogDir, 'desktop.log');

function desktopLog(message: string, data?: unknown): void {
  try {
    mkdirSync(desktopLogDir, { recursive: true });
    const suffix = data === undefined ? '' : ` ${JSON.stringify(data)}`;
    appendFileSync(desktopLogPath, `${new Date().toISOString()} ${message}${suffix}\n`, 'utf8');
  } catch {
    // ignore logging failures
  }
}

process.on('uncaughtException', (err) => {
  desktopLog('uncaughtException', { message: err.message, stack: err.stack });
  dialog.showErrorBox('WeChat OpenCode 启动失败', err.stack || err.message);
  app.quit();
});

process.on('unhandledRejection', (reason) => {
  const message = reason instanceof Error ? reason.message : String(reason);
  const stack = reason instanceof Error ? reason.stack : undefined;
  desktopLog('unhandledRejection', { message, stack });
});

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
  desktopLog('creating window', { projectRoot, mainScript });
  mainWindow = new BrowserWindow({
    width: 1120,
    height: 920,
    minWidth: 900,
    minHeight: 820,
    title: 'WeChat OpenCode Console',
    show: false,
    webPreferences: {
      preload: join(projectRoot, 'src', 'desktop', 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const htmlPath = join(projectRoot, 'src', 'desktop', 'renderer', 'index.html');
  mainWindow.once('ready-to-show', () => {
    desktopLog('window ready-to-show');
    mainWindow?.show();
    mainWindow?.focus();
  });
  void mainWindow.loadFile(htmlPath).catch((err) => {
    desktopLog('loadFile failed', { htmlPath, message: err.message, stack: err.stack });
    dialog.showErrorBox('WeChat OpenCode 页面加载失败', err.stack || err.message);
  });
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

app.whenReady().then(() => {
  desktopLog('app ready');
  createWindow();
}).catch((err) => {
  desktopLog('app ready failed', { message: err.message, stack: err.stack });
});

app.on('window-all-closed', () => {
  if (bridgeProcess) bridgeProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
