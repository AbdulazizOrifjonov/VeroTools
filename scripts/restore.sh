#!/usr/bin/env bash
# VERO TOOLS — restore a backup created by scripts/backup.sh (MongoDB database + uploads volume).
#
# Usage: scripts/restore.sh [options] BACKUP_DIR
#   -d, --db NAME        database name of the backup and restore target (default: vero_tools)
#       --no-mongo       restore only the uploads
#       --no-uploads     restore only the database
#       --keep-uploads   extract over the current uploads instead of replacing them
#   -y, --yes            do not ask for confirmation
#   -h, --help           show this help
#
# Steps: verify SHA256SUMS → start mongo/redis and wait until healthy → stop api, web and admin →
# drop the database and mongorestore the archive → replace the content of the uploads volume →
# flush the Redis cache → start the stopped services again.
# The images must exist (docker compose build, or pull prebuilt images) — restoring the uploads runs a
# one-off container of the api image. The current data is REPLACED: take a backup first.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DB="vero_tools"
WITH_MONGO=1
WITH_UPLOADS=1
KEEP_UPLOADS=0
ASSUME_YES=0
SRC=""

usage() { awk 'NR == 1 { next } /^#/ { sub(/^# ?/, ""); print; next } { exit }' "${BASH_SOURCE[0]}"; }
die() { echo "restore: $*" >&2; exit 1; }
log() { echo "restore: $*"; }

while [ $# -gt 0 ]; do
  case "$1" in
    -d | --db) [ $# -ge 2 ] || die "$1 needs a value"; DB="$2"; shift 2 ;;
    --no-mongo) WITH_MONGO=0; shift ;;
    --no-uploads) WITH_UPLOADS=0; shift ;;
    --keep-uploads) KEEP_UPLOADS=1; shift ;;
    -y | --yes) ASSUME_YES=1; shift ;;
    -h | --help) usage; exit 0 ;;
    -*) die "unknown option: $1 (see --help)" ;;
    *) [ -z "$SRC" ] || die "only one BACKUP_DIR may be given"; SRC="$1"; shift ;;
  esac
done

[ -n "$SRC" ] || { usage >&2; exit 2; }
[ -d "$SRC" ] || die "not a directory: $SRC"
SRC="$(cd "$SRC" && pwd)"
[[ "$DB" =~ ^[A-Za-z0-9_-]{1,63}$ ]] || die "invalid database name: $DB"
[ "$WITH_MONGO" = 1 ] || [ "$WITH_UPLOADS" = 1 ] || die "nothing to restore (--no-mongo and --no-uploads)"
ARCHIVE="$SRC/mongo-$DB.archive.gz"
UPLOADS_TAR="$SRC/uploads.tar.gz"
[ "$WITH_MONGO" = 0 ] || [ -s "$ARCHIVE" ] || die "missing $ARCHIVE (wrong --db?)"
[ "$WITH_UPLOADS" = 0 ] || [ -s "$UPLOADS_TAR" ] || die "missing $UPLOADS_TAR (use --no-uploads)"
command -v docker > /dev/null || die "docker is not installed"
docker compose version > /dev/null 2>&1 || die "the Docker Compose plugin (docker compose) is required"

if [ -f "$SRC/SHA256SUMS" ]; then
  (cd "$SRC" && sha256sum --quiet --check SHA256SUMS) || die "checksum verification failed in $SRC"
  log "checksums OK"
else
  log "warning: $SRC has no SHA256SUMS — integrity not verified"
fi

if [ "$ASSUME_YES" != 1 ]; then
  echo "This REPLACES$([ "$WITH_MONGO" = 1 ] && echo " the MongoDB database \"$DB\"")$([ "$WITH_MONGO" = 1 ] && [ "$WITH_UPLOADS" = 1 ] && echo " and")$([ "$WITH_UPLOADS" = 1 ] && echo " the uploaded media") with the backup"
  echo "  $SRC"
  read -r -p "Type the database name ($DB) to continue: " answer
  [ "$answer" = "$DB" ] || die "aborted"
fi

cd "$ROOT"
running() { docker compose ps --status running --services 2> /dev/null | grep -qx "$1"; }

log "starting mongo and redis (waiting until healthy)"
docker compose up -d --wait mongo redis

STOPPED=()
for service in api web admin; do
  if running "$service"; then STOPPED+=("$service"); fi
done
if [ "${#STOPPED[@]}" -gt 0 ]; then
  log "stopping ${STOPPED[*]}"
  docker compose stop "${STOPPED[@]}"
fi
restart() {
  if [ "${#STOPPED[@]}" -gt 0 ]; then
    log "starting ${STOPPED[*]}"
    docker compose up -d "${STOPPED[@]}"
  fi
}
on_exit() {
  local rc=$?
  if [ "$rc" -ne 0 ]; then
    echo "restore: FAILED (exit $rc) — the services stopped above are started again" >&2
    restart || true
  fi
}
trap on_exit EXIT

if [ "$WITH_MONGO" = 1 ]; then
  log "dropping database \"$DB\" and restoring $(basename "$ARCHIVE")"
  docker compose exec -T mongo mongosh --quiet --norc --eval "db.getSiblingDB('$DB').dropDatabase()" > /dev/null
  docker compose exec -T mongo mongorestore --quiet --archive --gzip --drop --nsInclude "$DB.*" < "$ARCHIVE"
fi

if [ "$WITH_UPLOADS" = 1 ]; then
  if [ "$KEEP_UPLOADS" = 1 ]; then
    log "extracting uploads over the current volume content"
    docker compose run --rm --no-deps -T --entrypoint tar api -xzf - -C /data/uploads < "$UPLOADS_TAR"
  else
    log "replacing the uploads volume content"
    docker compose run --rm --no-deps -T --entrypoint sh api -c 'set -e; find /data/uploads -mindepth 1 -delete; tar -xzf - -C /data/uploads' < "$UPLOADS_TAR"
  fi
fi

if running redis; then
  log "flushing the Redis cache (cached catalogue, settings, rate-limit counters)"
  docker compose exec -T redis redis-cli FLUSHDB > /dev/null
fi

trap - EXIT
restart
log "done — check: docker compose ps  and  curl -fsS http://127.0.0.1:4000/ready"
