#!/usr/bin/env bash
# Deploys Supabase Edge Functions to the hosted project.
# The project ref (and optionally the CLI access token) is read from
# packages/supabase/.env.local (or .env) so secrets never have to be
# hardcoded in the repo or typed on the command line.
#
# Usage:
#   bash scripts/deploy-functions.sh                     # deploy every function
#   bash scripts/deploy-functions.sh chat                # deploy one function
#   bash scripts/deploy-functions.sh chat parse-pdf      # deploy several
set -euo pipefail

# Resolve the package root (the parent of this script's directory).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Reads a value for the given key from the first env file that defines it.
# Tolerates "KEY=value", "KEY = value", and quoted values.
read_env_value() {
  local key="$1"
  local env_file candidate
  for env_file in "${PACKAGE_ROOT}/.env.local" "${PACKAGE_ROOT}/.env"; do
    if [ -f "${env_file}" ]; then
      candidate="$(grep -E "^[[:space:]]*${key}[[:space:]]*=" "${env_file}" | tail -n 1 | sed -E "s/^[[:space:]]*${key}[[:space:]]*=[[:space:]]*//; s/[\"']//g; s/[[:space:]]//g")"
      if [ -n "${candidate}" ]; then
        printf '%s' "${candidate}"
        return 0
      fi
    fi
  done
  return 1
}

PROJ_REF="$(read_env_value PROJ_REF || true)"
if [ -z "${PROJ_REF}" ]; then
  echo "ERROR: PROJ_REF not found in ${PACKAGE_ROOT}/.env.local or ${PACKAGE_ROOT}/.env" >&2
  exit 1
fi

# Authenticate the CLI from the env file when no token is already exported.
if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ]; then
  TOKEN="$(read_env_value SUPABASE_ACCESS_TOKEN || true)"
  if [ -n "${TOKEN}" ]; then
    export SUPABASE_ACCESS_TOKEN="${TOKEN}"
  fi
fi

# Prefer the workspace-local Supabase CLI, then fall back to a global install.
if [ -x "${PACKAGE_ROOT}/node_modules/.bin/supabase" ]; then
  SUPABASE_BIN="${PACKAGE_ROOT}/node_modules/.bin/supabase"
elif command -v supabase >/dev/null 2>&1; then
  SUPABASE_BIN="$(command -v supabase)"
else
  echo "ERROR: Supabase CLI not found. Run 'pnpm install' at the repo root first." >&2
  exit 1
fi

# deno check / the VS Code Deno extension create node_modules inside function
# dirs (nodeModulesDir: "auto"). The CLI uploads them as static assets, which
# bloats or breaks the deploy, so remove them first. They are recreated the
# next time deno tooling runs locally.
find "${PACKAGE_ROOT}/functions" -maxdepth 2 -type d -name node_modules -exec rm -rf {} + 2>/dev/null || true

deploy_function() {
  local name="$1"
  echo "==> Deploying function '${name}' to project ${PROJ_REF}"
  (cd "${PACKAGE_ROOT}" && "${SUPABASE_BIN}" functions deploy "${name}" --project-ref "${PROJ_REF}")
}



if [ "$#" -gt 0 ]; then
  # Deploy only the functions named on the command line.
  for FN in "$@"; do
    deploy_function "${FN}"
  done
else
  # Deploy every direct child of functions/ except shared/auxiliary folders.
  for DIR in "${PACKAGE_ROOT}/functions"/*/; do
    NAME="$(basename "${DIR}")"
    case "${NAME}" in
      _* | types) continue ;;
    esac
    deploy_function "${NAME}"
  done
fi

echo "All requested functions deployed."
