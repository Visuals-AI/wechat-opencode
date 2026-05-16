import { spawn } from 'node:child_process';
import process from 'node:process';

const ELECTRON_VERSION = '33.3.1';
const passthrough = process.argv.slice(2);
const electronArgs = passthrough.length > 0 ? passthrough : ['dist/desktop/main.js'];
const args = ['-y', `electron@${ELECTRON_VERSION}`, ...electronArgs];

const env = {
  ...process.env,
  ELECTRON_MIRROR: process.env.ELECTRON_MIRROR || 'https://npmmirror.com/mirrors/electron/',
  npm_config_electron_mirror: process.env.npm_config_electron_mirror || 'https://npmmirror.com/mirrors/electron/',
};

const child = spawn('npx', args, {
  cwd: process.cwd(),
  env,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

child.on('exit', (code, signal) => {
  if (code === 0) return;

  console.error('\nElectron 启动失败。常见原因是 npx 缓存中的 Electron 二进制下载不完整。');
  console.error('请尝试清理 npx 缓存后重试：');
  console.error('  npm cache clean --force');
  console.error('  npm run desktop');
  console.error('\n如果仍失败，可以手动指定镜像源：');
  console.error('  PowerShell: $env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"; npm run desktop');
  console.error('  bash/zsh:   ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ npm run desktop');

  if (signal) {
    console.error(`Electron process exited by signal ${signal}`);
  }
  process.exit(code ?? 1);
});

child.on('error', (err) => {
  console.error('无法启动 npx/electron:', err.message);
  process.exit(1);
});
