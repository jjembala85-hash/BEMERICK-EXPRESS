#!/usr/bin/env bash
# Restores a database backup into an empty scratch PostgreSQL and checks it
# against the live database. A backup is only trusted once this passes.
# Usage: verify-restore.sh <dump-file>
# Env:   LIVE_URL    the database the backup was taken from (read-only use)
#        RESTORE_URL an empty scratch database (never the live one)
set -euo pipefail
dump="$1"
[ -n "${LIVE_URL:-}" ] && [ -n "${RESTORE_URL:-}" ] || { echo "LIVE_URL and RESTORE_URL are required"; exit 2; }
[ "$LIVE_URL" != "$RESTORE_URL" ] || { echo "Refusing: RESTORE_URL is the live database"; exit 2; }

pg_restore --no-owner --no-privileges --exit-on-error -d "$RESTORE_URL" "$dump"

# Every table in the live database must exist in the restore, with rows where
# the live table has rows. Small differences are normal (writes after the dump).
tables_sql="select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' order by 1"
live_tables=$(psql "$LIVE_URL" -Atc "$tables_sql")
restored_tables=$(psql "$RESTORE_URL" -Atc "$tables_sql")
if [ "$live_tables" != "$restored_tables" ]; then
  echo "FAIL: table list differs"; diff <(echo "$live_tables") <(echo "$restored_tables") || true; exit 1
fi

failed=0
printf "%-28s %10s %10s\n" table live restored
for t in $live_tables; do
  live=$(psql "$LIVE_URL" -Atc "select count(*) from \"$t\"")
  restored=$(psql "$RESTORE_URL" -Atc "select count(*) from \"$t\"")
  printf "%-28s %10s %10s\n" "$t" "$live" "$restored"
  if [ "$live" -gt 0 ] && [ "$restored" -eq 0 ]; then echo "  FAIL: $t is empty in the backup"; failed=1; fi
done
[ "$failed" -eq 0 ] && echo "Restore check passed: $(echo "$live_tables" | wc -l) tables." || exit 1
