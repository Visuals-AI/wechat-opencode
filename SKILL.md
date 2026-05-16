---
name: wechat-opencode
description: 微信消息桥接 - 在微信中与 OpenCode 聊天。支持文字、图片、斜杠命令、工作目录切换和 OpenCode skill 触发。
---

# WeChat OpenCode Bridge

通过个人微信与本地 OpenCode 进行对话。

## 前置条件

- Node.js >= 18
- 已安装并配置 OpenCode CLI
- 个人微信账号（需扫码绑定）

## 安装

```bash
cd ~/.config/opencode/skills/wechat-opencode
npm install
```

`postinstall` 会自动执行 `npm run build` 编译 TypeScript。

## 触发后的执行流程

先探查当前状态，再给出可用操作。

### 第 1 步：检查是否已安装

```bash
cd ~/.config/opencode/skills/wechat-opencode && test -d node_modules && echo "installed" || echo "not_installed"
```

如果 `not_installed`，提示用户运行 `npm install`。

### 第 2 步：检查是否已绑定微信账号

```bash
ls ~/.wechat-opencode/accounts/*.json 2>/dev/null | head -1
```

如果没有账号文件，提示用户执行 `npm run setup` 扫码绑定。

### 第 3 步：检查 daemon 运行状态

```bash
cd ~/.config/opencode/skills/wechat-opencode && npm run daemon -- status
```

## 子命令参考

所有命令的工作目录为本项目目录。

| 命令 | 执行 | 说明 |
|------|------|------|
| setup | `npm run setup` | 首次安装向导：生成 QR 码、微信扫码、配置工作目录 |
| start | `npm run daemon -- start` | 启动后台服务 |
| stop | `npm run daemon -- stop` | 停止后台服务 |
| restart | `npm run daemon -- restart` | 重启后台服务 |
| status | `npm run daemon -- status` | 查看运行状态 |
| logs | `npm run daemon -- logs` | 查看最近日志 |

## 微信端命令

- `/help` 显示帮助
- `/clear` 清除当前会话
- `/status` 查看当前会话状态
- `/cwd [path]` 查看或切换工作目录
- `/model <provider/model>` 切换 OpenCode 模型
- `/permission <mode>` 切换权限模式
- `/skills` 列出已安装 OpenCode skills
- `/<skill> [args]` 触发已安装 skill

## 数据目录

所有数据存储在 `~/.wechat-opencode/`：

```text
~/.wechat-opencode/
├── accounts/
├── config.env
├── sessions/
├── get_updates_buf
└── logs/
```
