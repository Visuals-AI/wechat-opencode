#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

echo "== WeChat OpenCode Linux/headless starter =="

if ! command -v node >/dev/null 2>&1; then
  echo "Error: node is not installed. Please install Node.js >= 18 first." >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm is not installed. Please install npm first." >&2
  exit 1
fi

if ! command -v opencode >/dev/null 2>&1; then
  echo "Error: opencode is not installed or not in PATH." >&2
  echo "Install and authenticate OpenCode first, then rerun this script." >&2
  exit 1
fi

echo "Installing dependencies..."
npm install

echo "Building project..."
npm run build

if ! ls "${HOME}/.wechat-opencode/accounts"/*.json >/dev/null 2>&1; then
  echo "No WeChat account binding found. Starting setup..."
  echo "A terminal QR code will be printed below. Scan it with WeChat."
  npm run setup
fi

echo "Starting background daemon..."
npm run daemon -- start

echo ""
echo "Status:"
npm run daemon -- status

echo ""
echo "Useful commands:"
echo "  npm run daemon -- logs"
echo "  npm run daemon -- stop"
echo "  npm run daemon -- restart"
