#!/usr/bin/env bash
# Stop the Sunnyday feed generator. Run from repo root or scripts/.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
FEEDGEN_DIR="$REPO_ROOT/feedgen"
PID_FILE="$FEEDGEN_DIR/feedgen.pid"

if ! [[ -f "$PID_FILE" ]]; then
  echo "Feed generator not running (no PID file)."
  exit 0
fi

pid=$(cat "$PID_FILE")
rm -f "$PID_FILE"
if kill -0 "$pid" 2>/dev/null; then
  kill "$pid"
  echo "Feed generator stopped (was PID $pid)."
else
  echo "Feed generator not running (stale PID $pid)."
fi
