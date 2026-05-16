const api = window.wechatOpenCode;
const cwdInput = document.getElementById('cwdInput');
const chooseBtn = document.getElementById('chooseBtn');
const setupBtn = document.getElementById('setupBtn');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const clearBtn = document.getElementById('clearBtn');
const consoleEl = document.getElementById('console');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const pidText = document.getElementById('pidText');

function append(source, text, timestamp = new Date().toISOString()) {
  const prefix = `[${new Date(timestamp).toLocaleTimeString()}] ${source}> `;
  const normalized = String(text).replace(/\r\n/g, '\n');
  const line = normalized.includes('\n')
    ? `${prefix}\n${normalized}`
    : `${prefix}${normalized}`;
  consoleEl.textContent += line.endsWith('\n') ? line : `${line}\n`;
  consoleEl.scrollTop = consoleEl.scrollHeight;
}

function setStatus(status) {
  statusDot.classList.toggle('running', status.running);
  statusText.textContent = status.running ? '运行中' : '未运行';
  pidText.textContent = `PID: ${status.pid ?? '-'}`;
  startBtn.disabled = status.running;
  stopBtn.disabled = !status.running;
}

if (!api) {
  append('error', 'preload 未加载成功：window.wechatOpenCode 不存在。请重新运行 npm run build && npm run desktop。\n');
  setupBtn.disabled = true;
  startBtn.disabled = true;
  stopBtn.disabled = true;
  chooseBtn.disabled = true;
  throw new Error('window.wechatOpenCode is not available');
}

chooseBtn.addEventListener('click', async () => {
  const dir = await api.chooseDirectory();
  if (dir) cwdInput.value = dir;
});

setupBtn.addEventListener('click', async () => {
  const result = await api.setup(cwdInput.value.trim());
  if (!result.ok) append('error', `${result.error}\n`);
});

startBtn.addEventListener('click', async () => {
  const result = await api.start();
  if (!result.ok) append('error', `${result.error}\n`);
});

stopBtn.addEventListener('click', async () => {
  const result = await api.stop();
  if (!result.ok) append('error', `${result.error}\n`);
});

clearBtn.addEventListener('click', () => {
  consoleEl.textContent = '';
});

api.onLog((entry) => append(entry.source, entry.text, entry.timestamp));
api.onStatus(setStatus);

api.getStatus().then(setStatus);
cwdInput.value = localStorage.getItem('wechat-opencode-cwd') || '';
cwdInput.addEventListener('input', () => localStorage.setItem('wechat-opencode-cwd', cwdInput.value));
append('system', '桌面控制台已启动。先选择工作目录并扫码绑定，然后启动桥接。\n');
