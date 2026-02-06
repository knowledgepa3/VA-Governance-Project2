#!/usr/bin/env bash
# =============================================================================
# ACE Governance Platform — PostgreSQL Nightly Backup
#
# Dumps the ace_governance database via pg_dump inside the running container,
# pipes through gzip on the host, and stores with 7-day retention.
#
# Cron (runs at 2:30 AM daily):
#   30 2 * * * /opt/ace-governance/scripts/backup-postgres.sh >> /var/log/ace-pg-backup.log 2>&1
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
BACKUP_DIR="/opt/backups/postgres"
CONTAINER_NAME="ace-postgres"
DB_USER="${POSTGRES_USER:-ace}"
DB_NAME="${POSTGRES_DB:-ace_governance}"
RETENTION_DAYS=7
MIN_SIZE_BYTES=100

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_FILE="${BACKUP_DIR}/ace_governance_${TIMESTAMP}.sql.gz"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

die() {
  log "ERROR: $*" >&2
  exit 1
}

# ---------------------------------------------------------------------------
# Pre-flight
# ---------------------------------------------------------------------------
log "=== PostgreSQL Backup Starting ==="

# Ensure backup directory exists
mkdir -p "${BACKUP_DIR}" || die "Cannot create backup directory: ${BACKUP_DIR}"

# Verify container is running
if ! docker inspect --format='{{.State.Running}}' "${CONTAINER_NAME}" 2>/dev/null | grep -q true; then
  die "Container '${CONTAINER_NAME}' is not running"
fi

# ---------------------------------------------------------------------------
# Dump
# ---------------------------------------------------------------------------
log "Dumping database '${DB_NAME}' from container '${CONTAINER_NAME}'..."

docker exec "${CONTAINER_NAME}" \
  pg_dump -U "${DB_USER}" -d "${DB_NAME}" \
    --clean --if-exists --no-owner \
  | gzip > "${BACKUP_FILE}"

# ---------------------------------------------------------------------------
# Verify
# ---------------------------------------------------------------------------
ACTUAL_SIZE="$(stat -c%s "${BACKUP_FILE}" 2>/dev/null || stat -f%z "${BACKUP_FILE}" 2>/dev/null || echo 0)"

if [ "${ACTUAL_SIZE}" -lt "${MIN_SIZE_BYTES}" ]; then
  rm -f "${BACKUP_FILE}"
  die "Backup file too small (${ACTUAL_SIZE} bytes) — likely empty or failed dump"
fi

log "Backup OK: ${BACKUP_FILE} (${ACTUAL_SIZE} bytes)"

# ---------------------------------------------------------------------------
# Retention — delete backups older than N days
# ---------------------------------------------------------------------------
DELETED=$(find "${BACKUP_DIR}" -name "ace_governance_*.sql.gz" -mtime +${RETENTION_DAYS} -delete -print | wc -l)
if [ "${DELETED}" -gt 0 ]; then
  log "Pruned ${DELETED} backup(s) older than ${RETENTION_DAYS} days"
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
TOTAL=$(find "${BACKUP_DIR}" -name "ace_governance_*.sql.gz" | wc -l)
TOTAL_SIZE=$(du -sh "${BACKUP_DIR}" | cut -f1)
log "Backup complete. ${TOTAL} backup(s) on disk, total size: ${TOTAL_SIZE}"
log "=== PostgreSQL Backup Finished ==="
