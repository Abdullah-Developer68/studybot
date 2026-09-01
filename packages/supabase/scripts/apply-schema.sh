#!/usr/bin/env bash
set -euo pipefail

# ============================================
# Supabase CLI workflow using declarative schema
# ============================================
#
# HOW IT WORKS:
#   The DESIRED database state is declarative SQL (DDL only) in ./schemas/
#   The pg-delta diff engine ([experimental.pgdelta] in config.toml) compares
#   that desired state against the local DB and generates migration files
#   automatically. There is no [db.migrations].schema_paths entry.
#
#   seed.sql (configured in [db.seed]) runs AFTER migrations
#   during db reset — it's for dev/test data, not schema.
#
# WORKFLOW:
#   1. Edit schema files in ./schemas/
#   2. Run:  pnpm db:diff:file my_change
#      This generates a migration file in ./migrations/
#   3. Run:  pnpm db:reset
#      This applies all migrations + seed.sql to local DB
#   4. Run:  pnpm db:push
#      This pushes migrations to the linked remote project
#
# Usage:
#   bash scripts/apply-schema.sh [migration_name]
#
#   migration_name defaults to "schema_sync"
# ============================================

MIGRATION_NAME="${1:-schema_sync}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "==> Generating migration diff from schemas/ files..."
echo "    Desired state: ./schemas/*.sql (via pg-delta)"
echo "    Migration name: $MIGRATION_NAME"
echo ""

# supabase db diff uses the pg-delta engine to compare the declarative
# desired state (./schemas/) against the local database and generates
# migration files.
supabase db diff --local --file "$MIGRATION_NAME"

echo ""
echo "==> Done. Migration created in migrations/"
echo ""
echo "    Next steps:"
echo "      pnpm db:reset   — apply migrations + seed.sql to local DB"
echo "      pnpm db:push    — push migrations to linked remote project"


