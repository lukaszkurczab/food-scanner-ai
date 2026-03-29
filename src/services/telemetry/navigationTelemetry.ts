import { trackScreenView } from "@/services/telemetry/telemetryInstrumentation";

type TrackScreenViewFn = (routeName: string) => Promise<void>;

type CreateNavigationTelemetryTrackerParams = {
  getCurrentRouteName: () => string | undefined;
  trackScreenViewFn?: TrackScreenViewFn;
};

export function createNavigationTelemetryTracker({
  getCurrentRouteName,
  trackScreenViewFn = trackScreenView,
}: CreateNavigationTelemetryTrackerParams): () => void {
  let previousRouteName: string | undefined;

  return () => {
    let currentRouteName: string | undefined;

    try {
      currentRouteName = getCurrentRouteName()?.trim();
    } catch {
      return;
    }

    if (!currentRouteName || previousRouteName === currentRouteName) {
      return;
    }

    previousRouteName = currentRouteName;
    void trackScreenViewFn(currentRouteName);
  };
}
