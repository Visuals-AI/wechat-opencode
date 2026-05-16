import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, openSync, closeSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { DATA_DIR } from './constants.js';

const SERVICE_NAME = 'wechat-opencode';
const PID_PATH = join(DATA_DIR, `${SERVICE_NAME}.pid`);
const LOG_DIR = join(DATA_DIR, 'logs');
const STDOUT_PATH = join(LOG_DIR, 'stdout.log');
const STDERR_PATH = join(LOG_DIR, 'stderr.log');

function ensureDirs(): void {
  mkdirSync(LOG_DIR, { recursive: true });
}

function readPid(): number | undefined {
  try {
    const raw = readFileSync(PID_PATH, 'utf8').trim();
    const pid = Number(raw);
    return Number.isInteger(pid) && pid > 0 ? pid : undefined;
  } catch {
    return undefined;
  }
}

function isRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function start(): void {
  ensureDirs();
  const existingPid = readPid();
  if (existingPid && isRunning(existingPid)) {
    console.log(`Already running (PID: ${existingPid})`);
    return;
  }

  const out = openSync(STDOUT_PATH, 'a');
  const err = openSync(STDERR_PATH, 'a');
  const child = spawn(process.execPath, [join(process.cwd(), 'dist', 'main.js'), 'start'], {
    cwd: process.cwd(),
    detached: true,
    stdio: ['ignore', out, err],
    windowsHide: true,
    env: process.env,
  });

  child.unref();
  closeSync(out);
  closeSync(err);
  writeFileSync(PID_PATH, String(child.pid), 'utf8');
  console.log(`Started wechat-opencode daemon (PID: ${child.pid})`);
  console.log(`Logs: ${STDOUT_PATH}`);
}

function stop(): void {
  const pid = readPid();
  if (!pid) {
    console.log('Not running');
    return;
  }

  if (isRunning(pid)) {
    try {
      if (process.platform === 'win32') {
        spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
      } else {
        process.kill(pid, 'SIGTERM');
      }
      console.log(`Stopped (PID: ${pid})`);
    } catch (err) {
      console.error('Failed to stop daemon:', err);
      process.exitCode = 1;
      return;
    }
  } else {
    console.log('Not running (stale PID file)');
  }

  rmSync(PID_PATH, { force: true });
}

function status(): void {
  const pid = readPid();
  if (pid && isRunning(pid)) {
    console.log(`Running (PID: ${pid})`);
    return;
  }
  console.log('Not running');
}

function logs(): void {
  for (const file of [STDOUT_PATH, STDERR_PATH]) {
    if (!existsSync(file)) continue;
    const lines = readFileSync(file, 'utf8').split(/\r?\n/).slice(-100).join('\n');
    console.log(`=== ${file} ===`);
    console.log(lines);
  }
}

const command = process.argv[2];
switch (command) {
  case 'start':
    start();
    break;
  case 'stop':
    stop();
    break;
  case 'restart':
    stop();
    start();
    break;
  case 'status':
    status();
    break;
  case 'logs':
    logs();
    break;
  default:
    console.log('Usage: npm run daemon -- {start|stop|restart|status|logs}');
    process.exitCode = 1;
}
