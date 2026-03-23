#!/usr/bin/env bash
# ABOUTME: Runs the Google Ads performance report.
# ABOUTME: Loads env vars from root .env and passes --days flag through.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: .env not found at $ENV_FILE"
  exit 1
fi

set -a
source "$ENV_FILE"
set +a

cd "$SCRIPT_DIR/.."
exec npx tsx ads/scripts/report.ts "$@"
