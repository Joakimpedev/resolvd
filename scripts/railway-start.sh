#!/usr/bin/env bash
# Railway start script.
#
# Runs `prisma migrate deploy`. If that fails (most commonly P3005 — "schema
# is not empty" — because the service previously used `db:push` and therefore
# has tables but no `_prisma_migrations` history), marks the init migration
# as already applied and retries. This is NON-DESTRUCTIVE: `migrate resolve`
# only writes a row to the `_prisma_migrations` table; it never drops data.
# The init migration describes the pre-redesign schema, so baselining it is
# the correct representation of what the DB already contains.
#
# After the first successful run, subsequent deploys hit the fast path
# (plain `migrate deploy`, no baseline dance).

set -u

cd "$(dirname "$0")/.."

SCHEMA="apps/api/prisma/schema.prisma"
INIT_MIGRATION="20260420000000_init"

echo "[start] prisma migrate deploy"
if npx prisma migrate deploy --schema "$SCHEMA"; then
  echo "[start] migrations applied cleanly"
else
  echo "[start] migrate deploy failed — assuming P3005; baselining init and retrying"
  # resolve --applied is idempotent-ish: it'll error if already applied, which
  # is harmless here (we fall through to the retry below).
  npx prisma migrate resolve --schema "$SCHEMA" --applied "$INIT_MIGRATION" || \
    echo "[start] (baseline resolve reported non-zero; continuing to retry)"
  echo "[start] retrying migrate deploy after baseline"
  npx prisma migrate deploy --schema "$SCHEMA"
fi

echo "[start] launching server"
exec node apps/api/dist/index.js
