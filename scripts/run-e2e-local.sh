#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
FLOW_PATH="${1:-e2e/maestro}"
PLATFORM="${E2E_PLATFORM:-ios}"
EXPO_PORT="${E2E_EXPO_PORT:-8081}"
RESULTS_PATH="${E2E_RESULTS_PATH:-/tmp/maestro-${PLATFORM}-results.xml}"
UDID="${E2E_UDID:-}"

EXPO_LOG="/tmp/expo-e2e.log"

cleanup() {
  if [[ -n "${EXPO_PID:-}" ]]; then
    kill "${EXPO_PID}" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT

echo "[e2e] Starting Expo dev server (port ${EXPO_PORT})..."
(
  cd "${ROOT_DIR}"
  E2E=true E2E_MOCK_CHAT_REPLY="E2E_MOCK_CHAT_REPLY: Keep hydration and protein consistent every day." \
    npx expo start --dev-client --host localhost --port "${EXPO_PORT}" --non-interactive
) >"${EXPO_LOG}" 2>&1 &
EXPO_PID=$!

echo "[e2e] Waiting for Metro to be ready..."
READY=0
for _ in $(seq 1 90); do
  if curl -fsS "http://127.0.0.1:${EXPO_PORT}/status" | rg -q "packager-status:running"; then
    READY=1
    break
  fi
  sleep 1
done

if [[ "${READY}" -ne 1 ]]; then
  echo "[e2e] Metro did not start in time. Last Expo logs:"
  tail -n 80 "${EXPO_LOG}" || true
  exit 1
fi

if [[ "${PLATFORM}" == "ios" ]]; then
  echo "[e2e] Priming iOS dev client with exp://127.0.0.1:${EXPO_PORT} ..."
  xcrun simctl openurl booted "exp://127.0.0.1:${EXPO_PORT}" >/dev/null 2>&1 || true
  sleep 4
fi

MAESTRO_CMD=(maestro test "${FLOW_PATH}" -p "${PLATFORM}" --format junit --output "${RESULTS_PATH}")
if [[ -n "${UDID}" ]]; then
  MAESTRO_CMD+=(--udid "${UDID}")
fi

echo "[e2e] Running: ${MAESTRO_CMD[*]}"
(
  cd "${ROOT_DIR}"
  "${MAESTRO_CMD[@]}"
)
