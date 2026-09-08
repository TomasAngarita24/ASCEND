#!/usr/bin/env bash
# ASCEND - PostgreSQL backup via pg_dump inside the docker compose stack.
#
# Usage:
#   bash scripts/backup-postgres.sh [retention_days]
#
# Environment (defaults can come from the repo .env):
#   BACKUP_DIR      directory for the dump files (default: ./backups)
#   POSTGRES_USER   database role (default: from .env or "ascend")
#   POSTGRES_DB     database name  (default: from .env or "ascend")
#
# Produces a timestamped pg_dump custom-format file under $BACKUP_DIR and
# prunes dumps older than retention_days (default 7).
#
# Restore instructions: see docs/operations.md.

set -euo pipefail

cd "$(dirname "$0")/.."

RETENTION_DAYS="${1:-7}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$BACKUP_DIR"
BACKUP_DIR="$(cd "$BACKUP_DIR" && pwd)"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_FILE="$BACKUP_DIR/ascend-$TIMESTAMP.dump"

# Load repo .env without overriding variables that are already exported.
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

echo "Dumping '$POSTGRES_DB' (as '$POSTGRES_USER') -> $BACKUP_FILE"
docker compose exec -T postgres \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  --format=custom --no-owner --no-acl \
  > "$BACKUP_FILE"

SIZE="$(du -h "$BACKUP_FILE" | cut -f1)"
echo "Backup written: $BACKUP_FILE ($SIZE)"

CLEANED="$(find "$BACKUP_DIR" -type f -name 'ascend-*.dump' -mtime "+$RETENTION_DAYS" -delete -print | wc -l)"
echo "Retention (${RETENTION_DAYS}d): removed $CLEANED old backup(s)."
echo "Done."