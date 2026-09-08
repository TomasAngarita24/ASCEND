#!/usr/bin/env bash
# ASCEND - PostgreSQL restore from a pg_dump custom-format dump file.
#
# Usage:
#   bash scripts/restore-postgres.sh path/to/ascend-<timestamp>.dump
#
# Environment (defaults can come from the repo .env):
#   POSTGRES_USER   database role (default: from .env or "ascend")
#   POSTGRES_DB     database name  (default: from .env or "ascend")
#
# The target database must already exist and be empty enough to accept the
# restore. pg_restore drops existing objects (--clean --if-exists) before
# recreating them. Full instructions: docs/operations.md.

set -euo pipefail

cd "$(dirname "$0")/.."

[[ $# -ge 1 ]] || { echo "Usage: bash scripts/restore-postgres.sh <dump-file>" >&2; exit 2; }
DUMP_FILE="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
[[ -f "$DUMP_FILE" ]] || { echo "Dump file not found: $DUMP_FILE" >&2; exit 2; }

if [[ -f .env ]]; then
  while IFS= read -r line; do
    [[ -z "$line" || "$line" != *"="* || "$line" =~ ^# ]] && continue
    key="${line%%=*}"
    [[ "${!key+x}" ]] && continue
    export "$key=${line#*=}"
  done < .env
fi

POSTGRES_USER="${POSTGRES_USER:-ascend}"
POSTGRES_DB="${POSTGRES_DB:-ascend}"

echo "Restoring '$POSTGRES_DB' (as '$POSTGRES_USER') from $DUMP_FILE"
docker compose exec -T postgres \
  pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  --clean --if-exists --no-owner --no-acl \
  < "$DUMP_FILE"

echo "Restore finished."