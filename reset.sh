#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

DATA_DIR="${WOC_DATA_DIR:-${HOME}/.wechat-opencode}"
YES="${1:-}"

echo "== WeChat OpenCode login reset =="
echo "This will stop the bridge and remove WeChat account bindings."
echo "Kept: ${DATA_DIR}/config.env"
echo "Removed: accounts, sessions, sync buffer, QR image"
echo ""

if [ "$YES" != "--yes" ]; then
  printf "Continue? [y/N] "
  read -r answer
  case "$answer" in
    y|Y|yes|YES) ;;
    *) echo "Cancelled."; exit 0 ;;
  esac
fi

if command -v npm >/dev/null 2>&1 && [ -f "dist/daemon.js" ]; then
  npm run daemon -- stop || true
fi

rm -rf "${DATA_DIR}/accounts" "${DATA_DIR}/sessions"
rm -f "${DATA_DIR}/get_updates_buf" "${DATA_DIR}/qrcode.png"

echo "Reset complete. Run ./start.sh or npm run setup to scan a new WeChat account."
