#!/usr/bin/env bash
# Restart the Sunnyday feed generator. Run from repo root or scripts/.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
"$SCRIPT_DIR/feedgen-stop.sh" || true
"$SCRIPT_DIR/feedgen-start.sh"
