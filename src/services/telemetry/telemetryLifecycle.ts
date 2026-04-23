import { AppState, type AppStateStatus } from "react-native";
import { flush } from "@/services/telemetry/telemetryClient";
import {
  trackSessionStart,
} from "@/services/telemetry/telemetryInstrumentation";

type RemovableSubscription = {
  remove: () => void;
};

let initialized = false;
let currentAppState: AppStateStatus = AppState.currentState;
let appStateSubscription: RemovableSubscription | null = null;

function isForeground(state: AppStateStatus): boolean {
  return state === "active";
}

async function safeTrack(promise: Promise<void>): Promise<void> {
  try {
    await promise;
  } catch {
    // Telemetry lifecycle is best-effort and should never affect app flow.
  }
}

async function handleAppStateChange(nextState: AppStateStatus): Promise<void> {
  const previousState = currentAppState;
  currentAppState = nextState;

  if (isForeground(previousState) && !isForeground(nextState)) {
    void flush();
    return;
  }

  if (!isForeground(previousState) && isForeground(nextState)) {
    await safeTrack(trackSessionStart());
  }
}

export async function initTelemetryLifecycle(): Promise<void> {
  if (initialized) {
    return;
  }

  initialized = true;
  currentAppState = AppState.currentState;
  await safeTrack(trackSessionStart());
  appStateSubscription = AppState.addEventListener("change", (nextState) => {
    void handleAppStateChange(nextState);
  });
}

export function stopTelemetryLifecycle(): void {
  appStateSubscription?.remove();
  appStateSubscription = null;
  initialized = false;
  currentAppState = AppState.currentState;
}

export function __resetTelemetryLifecycleForTests(): void {
  stopTelemetryLifecycle();
}
