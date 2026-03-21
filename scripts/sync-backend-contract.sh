#!/usr/bin/env bash
# sync-backend-contract.sh — Sync canonical Smart Reminders v1 contract from backend repo.
#
# This script copies the canonical contract snapshot from the backend repo
# into the mobile repo's contract fixtures directory.  It is the single
# mechanism for updating the mobile-side copy of the contract.
#
# Usage:
#   ./scripts/sync-backend-contract.sh                    # auto-detect sibling dir
#   BACKEND_REPO=/path/to/backend ./scripts/sync-backend-contract.sh  # explicit path
#
# The script:
#   1. Locates the backend repo (sibling directory or BACKEND_REPO env var)
#   2. Copies the canonical contract JSON
#   3. Reports whether anything changed
#
# In CI, use verify-backend-contract.sh instead (read-only check).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MOBILE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

MOBILE_CONTRACT="$MOBILE_ROOT/src/__contract_fixtures__/smart_reminders_v1.contract.json"
BACKEND_CONTRACT_RELPATH="tests/contract_fixtures/smart_reminders_v1.contract.json"

# Resolve backend repo location
if [[ -n "${BACKEND_REPO:-}" ]]; then
  BACKEND_ROOT="$BACKEND_REPO"
elif [[ -d "$MOBILE_ROOT/../food-scanner-ai-backend" ]]; then
  BACKEND_ROOT="$(cd "$MOBILE_ROOT/../food-scanner-ai-backend" && pwd)"
else
  echo "ERROR: Cannot find backend repo."
  echo "  Set BACKEND_REPO=/path/to/food-scanner-ai-backend"
  echo "  or place it as a sibling directory."
  exit 1
fi

BACKEND_CONTRACT="$BACKEND_ROOT/$BACKEND_CONTRACT_RELPATH"

if [[ ! -f "$BACKEND_CONTRACT" ]]; then
  echo "ERROR: Canonical contract not found at $BACKEND_CONTRACT"
  echo "  Run 'python scripts/export_reminder_contract.py' in the backend repo first."
  exit 1
fi

if diff -q "$BACKEND_CONTRACT" "$MOBILE_CONTRACT" > /dev/null 2>&1; then
  echo "OK: Mobile contract is already in sync with backend canonical."
  exit 0
fi

cp "$BACKEND_CONTRACT" "$MOBILE_CONTRACT"
echo "SYNCED: Copied canonical contract from backend to mobile."
echo "  From: $BACKEND_CONTRACT"
echo "  To:   $MOBILE_CONTRACT"
echo ""
echo "Review the diff and commit the updated fixture."
