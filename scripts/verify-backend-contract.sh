#!/usr/bin/env bash
# verify-backend-contract.sh — Read-only check that mobile contract matches backend canonical.
#
# This script is designed for CI: it compares the mobile-side contract
# snapshot against the backend repo's canonical snapshot and exits non-zero
# if they differ.  It never modifies files.
#
# Usage:
#   ./scripts/verify-backend-contract.sh                    # auto-detect sibling dir
#   BACKEND_REPO=/path/to/backend ./scripts/verify-backend-contract.sh  # explicit path
#
# For CI with separate repos, set BACKEND_REPO to the checkout path.
# Example GitHub Actions step:
#
#   - uses: actions/checkout@v5
#     with:
#       repository: <org>/food-scanner-ai-backend
#       path: backend
#   - run: BACKEND_REPO=backend ./scripts/verify-backend-contract.sh

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
  echo "SKIP: Backend repo not available — cannot verify cross-repo contract sync."
  echo "  Set BACKEND_REPO=/path/to/food-scanner-ai-backend to enable."
  exit 0
fi

BACKEND_CONTRACT="$BACKEND_ROOT/$BACKEND_CONTRACT_RELPATH"

if [[ ! -f "$BACKEND_CONTRACT" ]]; then
  echo "ERROR: Canonical contract not found at $BACKEND_CONTRACT"
  exit 1
fi

if [[ ! -f "$MOBILE_CONTRACT" ]]; then
  echo "ERROR: Mobile contract not found at $MOBILE_CONTRACT"
  exit 1
fi

if diff -q "$BACKEND_CONTRACT" "$MOBILE_CONTRACT" > /dev/null 2>&1; then
  echo "OK: Mobile contract matches backend canonical snapshot."
  exit 0
fi

echo "DRIFT DETECTED: Mobile contract differs from backend canonical."
echo ""
echo "Backend (canonical): $BACKEND_CONTRACT"
echo "Mobile (local copy): $MOBILE_CONTRACT"
echo ""
diff --unified "$BACKEND_CONTRACT" "$MOBILE_CONTRACT" || true
echo ""
echo "To fix: run ./scripts/sync-backend-contract.sh"
exit 1
