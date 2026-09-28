#!/usr/bin/env bash
# VERO TOOLS — backup of the Docker Compose deployment: MongoDB dump + uploads volume.
#
# Usage: scripts/backup.sh [options]
#   -o, --output DIR     parent directory for backups (default: $BACKUP_DIR or ~/vero-tools-backups)
#   -d, --db NAME        database to dump (default: vero_tools — the database in MONGO_URI)
#       --no-uploads     skip the uploads volume (STORAGE_DRIVER=s3 / cloudinary keep media elsewhere)
#       --keep-days N    afterwards delete backups older than N days from the output directory
#   -h, --help           show this help
#
# Creates DIR/vero-tools-<UTC timestamp>/ containing
#   mongo-<db>.archive.gz   mongodump --archive --gzip of the database
#   uploads.tar.gz          contents of /data/uploads (named volume "uploads")
#   SHA256SUMS, backup.txt  checksums and metadata
# Restore with scripts/restore.sh. The .env file (secrets) is not included — keep an encrypted copy of it.
# docker compose runs in the repository root; COMPOSE_FILE / COMPOSE_PROJECT_NAME are honoured.
#
# Cron example (daily 03:15, keep 14 days):
#   15 3 * * * /opt/vero-tools/scripts/backup.sh --keep-days 14 >> /var/log/vero-tools-backup.log 2>&1

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT="${BACKUP_DIR:-${HOME:-/root}/vero-tools-backups}"
DB="vero_tools"
WITH_UPLOADS=1
KEEP_DAYS=""

usage() { awk 'NR == 1 { next } /^#/ { sub(/^# ?/, ""); print; next } { exit }' "${BASH_SOURCE[0]}"; }
die() { echo "backup: $*" >&2; exit 1; }
log() { echo "backup: $*"; }

while [ $# -gt 0 ]; do
  case "$1" in
    -o | --output) [ $# -ge 2 ] || die "$1 needs a value"; OUTPUT="$2"; shift 2 ;;
    -d | --db) [ $# -ge 2 ] || die "$1 needs a value"; DB="$2"; shift 2 ;;
    --no-uploads) WITH_UPLOADS=0; shift ;;
    --keep-days) [ $# -ge 2 ] || die "$1 needs a value"; KEEP_DAYS="$2"; shift 2 ;;
    -h | --help) usage; exit 0 ;;
    *) die "unknown option: $1 (see --help)" ;;
  esac
done

[[ "$DB" =~ ^[A-Za-z0-9_-]{1,63}$ ]] || die "invalid database name: $DB"
[ -z "$KEEP_DAYS" ] || [[ "$KEEP_DAYS" =~ ^[0-9]+$ ]] || die "--keep-days expects a number of days"
command -v docker > /dev/null || die "docker is not installed"
docker compose version > /dev/null 2>&1 || die "the Docker Compose plugin (docker compose) is required"

cd "$ROOT"
running() { docker compose ps --status running --services 2> /dev/null | grep -qx "$1"; }
running mongo || die "the mongo service is not running (docker compose up -d mongo)"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DEST="$OUTPUT/vero-tools-$STAMP"
umask 077
mkdir -p -- "$OUTPUT"
# plain mkdir: never reuse (and on failure delete) an existing backup directory
mkdir -- "$DEST" 2> /dev/null || die "$DEST already exists — try again in a second"
cleanup() {
  local rc=$?
  if [ "$rc" -ne 0 ]; then
    echo "backup: FAILED — removing the incomplete $DEST" >&2
    rm -rf -- "$DEST"
  fi
}
trap cleanup EXIT

ARCHIVE="mongo-$DB.archive.gz"
log "MongoDB database \"$DB\" → $DEST/$ARCHIVE"
docker compose exec -T mongo mongodump --quiet --archive --gzip --db "$DB" > "$DEST/$ARCHIVE"
[ -s "$DEST/$ARCHIVE" ] || die "mongodump produced an empty archive"

FILES=("$ARCHIVE")
if [ "$WITH_UPLOADS" = 1 ]; then
  log "uploads volume → $DEST/uploads.tar.gz"
  if running api; then
    docker compose exec -T api tar -C /data/uploads -czf - . > "$DEST/uploads.tar.gz"
  else
    docker compose run --rm --no-deps -T --entrypoint tar api -C /data/uploads -czf - . > "$DEST/uploads.tar.gz"
  fi
  FILES+=("uploads.tar.gz")
fi

(cd "$DEST" && sha256sum -- "${FILES[@]}" > SHA256SUMS)
{
  echo "created_utc=$STAMP"
  echo "database=$DB"
  echo "uploads=$([ "$WITH_UPLOADS" = 1 ] && echo yes || echo no)"
  echo "compose_project=$(docker compose ps --format '{{.Project}}' 2> /dev/null | head -1)"
  if command -v git > /dev/null && git -C "$ROOT" rev-parse --short HEAD > /dev/null 2>&1; then
    echo "git_commit=$(git -C "$ROOT" rev-parse --short HEAD)"
  fi
} > "$DEST/backup.txt"

log "done: $DEST ($(du -sh "$DEST" | cut -f1))"

if [ -n "$KEEP_DAYS" ]; then
  log "removing backups older than $KEEP_DAYS days from $OUTPUT"
  find "$OUTPUT" -mindepth 1 -maxdepth 1 -type d -name 'vero-tools-*' -mtime +"$KEEP_DAYS" -print -exec rm -rf -- {} +
fi
