# wechat-opencode

Bridge personal WeChat to local OpenCode. Send messages from WeChat and have them processed by `opencode run --format json` in your configured working directory.

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
