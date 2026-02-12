#!/usr/bin/env bash
# Start the Sunnyday feed generator. Run from repo root or scripts/.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
FEEDGEN_DIR="$REPO_ROOT/feedgen"
PID_FILE="$FEEDGEN_DIR/feedgen.pid"

cd "$FEEDGEN_DIR"
if [[ -f "$PID_FILE" ]]; then
  pid=$(cat "$PID_FILE")
  if kill -0 "$pid" 2>/dev/null; then
    echo "Feed generator already running (PID $pid)."
    exit 0
  fi
  rm -f "$PID_FILE"
fi

if ! [[ -f "$FEEDGEN_DIR/server.js" ]]; then
  echo "Not found: $FEEDGEN_DIR/server.js" >&2
  exit 1
fi

node server.js &
echo $! > "$PID_FILE"
echo "Feed generator started (PID $(cat "$PID_FILE"))."
