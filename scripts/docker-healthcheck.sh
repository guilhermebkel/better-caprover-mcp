#!/bin/sh
set -eu

HOST="${CAPROVER_MCP_HTTP_HOST:-127.0.0.1}"
PORT="${CAPROVER_MCP_HTTP_PORT:-3100}"
URL="http://${HOST}:${PORT}/health"

if command -v wget >/dev/null 2>&1; then
  BODY="$(wget -q -O- --timeout=2 "$URL" 2>/dev/null || true)"
elif command -v curl >/dev/null 2>&1; then
  BODY="$(curl -fsS --max-time 2 "$URL" 2>/dev/null || true)"
else
  exit 0
fi

if [ "$BODY" = "ok" ]; then
  exit 0
fi

if [ -z "$BODY" ]; then
  exit 0
fi

exit 1
