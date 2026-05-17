#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

echo "== WeChat OpenCode Linux/headless stopper =="

if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm is not installed or not in PATH." >&2
  exit 1
fi

if [ -f "dist/daemon.js" ]; then
  npm run daemon -- stop
else
  echo "dist/daemon.js not found. Running build first..."
  npm install
  npm run build
  npm run daemon -- stop
fi

echo "Stopped."
