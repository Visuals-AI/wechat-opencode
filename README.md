# wechat-opencode

Bridge personal WeChat to local OpenCode. Send messages from WeChat and have them processed by `opencode run --format json` in your configured working directory.

![](./imgs/demo1.jpg)
![](./imgs/demo2.jpg)

## Features

- Text conversation with OpenCode through WeChat
- Image attachments via OpenCode `--file`
- Streaming text updates and tool-call progress from OpenCode JSON events
- Interrupt support by sending a new message while a run is active
- Slash commands for `/help`, `/clear`, `/model`, `/cwd`, `/prompt`, `/status`, `/skills`, and more
- OpenCode skill discovery from `~/.config/opencode/skills`, `~/.config/opencode/skill`, project `.opencode/skills`, `~/.claude/skills`, and `~/.agents/skills`
- Cross-platform daemon manager implemented in Node.js

## Prerequisites

- Node.js >= 18
- OpenCode CLI installed and authenticated
- Personal WeChat account for QR binding

## Installation

```bash
git clone https://github.com/Wechat-ggGitHub/wechat-opencode.git ~/.config/opencode/skills/wechat-opencode
cd ~/.config/opencode/skills/wechat-opencode
npm install
```

## Quick Start

```bash
npm run setup
npm run daemon -- start
```

Then send a message in WeChat.

## Linux Background Mode

Use this mode on Linux servers, SSH sessions, or any machine where you want the bridge to keep running without a desktop window.

One-command installer/startup:

```bash
chmod +x start.sh
./start.sh
```

Stop with:

```bash
./stop.sh
```

Reset WeChat login and force QR binding again:

```bash
./reset.sh
```

`reset.sh` stops the bridge and removes `accounts`, `sessions`, `get_updates_buf`, and `qrcode.png` under `~/.wechat-opencode/`. It keeps `config.env`.

First-time setup prints a terminal QR code. If the Linux machine has no GUI, scan the black-and-white QR code directly from the terminal:

```bash
npm run setup
```

Start the background bridge:

```bash
npm run daemon -- start
```

Check status:

```bash
npm run daemon -- status
```

View logs:

```bash
npm run daemon -- logs
```

Stop the bridge:

```bash
npm run daemon -- stop
```

Restart after code or config changes:

```bash
npm run daemon -- restart
```

The Node daemon manager is cross-platform, but this mode is the recommended Linux/headless workflow. Data and logs are stored in `~/.wechat-opencode/`.

## Desktop Console

Use this mode on Windows or any GUI machine when you want buttons and a live interaction console.

On Windows, double-click `start.vbs` from Explorer. It starts the desktop app without showing a console window and writes startup logs to `~/.wechat-opencode/logs/windows-startup.log`.

To stop the desktop app and related bridge processes without showing a console window, double-click `stop.vbs`. Stop logs are written to `~/.wechat-opencode/logs/windows-stop.log`.

To switch WeChat accounts, double-click `reset.vbs`. It stops the bridge, clears WeChat binding/session files, and writes logs to `~/.wechat-opencode/logs/windows-reset.log`. It keeps `config.env`.

For troubleshooting, run the batch file directly so you can see terminal output:

```powershell
start-windows.cmd
stop-windows.cmd
reset-windows.cmd
```

Start the Electron console:

```bash
npm run desktop
```

The console supports:

- Choosing the OpenCode working directory
- QR-code WeChat setup
- Start/stop buttons for the bridge
- Live logs for inbound WeChat messages, OpenCode text output, tool calls, and outbound WeChat replies

In Electron mode, the bridge runs as a child process of the desktop app. Use the window's `Start` and `Stop` buttons. Closing the desktop window stops the bridge process started by that window.

## Service Commands

```bash
npm run daemon -- status
npm run daemon -- stop
npm run daemon -- restart
npm run daemon -- logs
```

## WeChat Commands

| Command | Description |
| --- | --- |
| `/help` | Show available commands |
| `/clear` | Clear current session |
| `/reset` | Full reset including working directory |
| `/model <provider/model>` | Switch OpenCode model |
| `/permission <mode>` | Switch permission mode |
| `/prompt [text]` | View or set a system prompt prepended to every run |
| `/status` | View current session state |
| `/cwd [path]` | View or switch working directory |
| `/skills` | List installed OpenCode skills |
| `/history [n]` | View recent chat messages |
| `/compact` | Start a new OpenCode session |
| `/undo [n]` | Remove recent messages from local history |
| `/<skill> [args]` | Ask OpenCode to use an installed skill |

## Permission Modes

- `default`: use OpenCode's normal configured permissions
- `plan`: run with `--agent plan`
- `auto`: run with `--dangerously-skip-permissions`
- `acceptEdits`: accepted for command compatibility; currently maps to OpenCode default behavior

## How It Works

```text
WeChat (phone) <-> ilink bot API <-> Node.js daemon <-> opencode run --format json
```

Data is stored in `~/.wechat-opencode/`.
