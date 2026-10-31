#!/bin/sh
set -eu

MARKER_PATH="${CAPROVER_MCP_HTTP_MARKER_PATH:-/tmp/better-caprover-mcp-http.active}"
HOST="${CAPROVER_MCP_HTTP_HOST:-127.0.0.1}"
PORT="${CAPROVER_MCP_HTTP_PORT:-3100}"
URL="http://${HOST}:${PORT}/health"

if [ ! -f "$MARKER_PATH" ]; then
  exit 0
fi

if command -v node >/dev/null 2>&1; then
  BODY="$(node -e 'fetch(process.argv[1]).then((response) => response.text()).then((text) => { process.stdout.write(text); process.exit(0); }).catch(() => process.exit(1));' "$URL" 2>/dev/null || true)"
elif command -v curl >/dev/null 2>&1; then
  BODY="$(curl -fsS --max-time 2 "$URL" 2>/dev/null || true)"
elif command -v wget >/dev/null 2>&1; then
  BODY="$(wget -q -O- --timeout=2 "$URL" 2>/dev/null || true)"
else
  exit 1
fi

if [ "$BODY" = "ok" ]; then
  exit 0
fi

exit 1
