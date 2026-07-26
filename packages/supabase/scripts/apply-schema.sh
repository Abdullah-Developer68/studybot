#!/usr/bin/env bash
set -euo pipefail

# ============================================
# Supabase CLI workflow using declarative schema
# ============================================
#
# HOW IT WORKS:
#   config.toml → [db.migrations].schema_paths points to ./schema/*.sql
#   These files describe the DESIRED database state (DDL only).
#   The Supabase CLI diffs the desired state against the local DB
#   and generates migration files automatically.
#
#   seed.sql (configured in [db.seed]) runs AFTER migrations
#   during db reset — it's for dev/test data, not schema.
#
# WORKFLOW:
#   1. Edit schema files in ./schema/
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

echo "==> Generating migration diff from schema/ files..."
echo "    Desired state: ./schema/*.sql"
echo "    Migration name: $MIGRATION_NAME"
echo ""

# supabase db diff compares the desired schema (from schema_paths)
# against the local database and generates migration files.
supabase db diff --local --file "$MIGRATION_NAME"

echo ""
echo "==> Done. Migration created in migrations/"
echo ""
echo "    Next steps:"
echo "      pnpm db:reset   — apply migrations + seed.sql to local DB"
echo "      pnpm db:push    — push migrations to linked remote project"


