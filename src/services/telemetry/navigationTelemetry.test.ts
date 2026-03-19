import { beforeEach, describe, expect, it, jest } from "@jest/globals";

jest.mock("@/services/telemetry/telemetryInstrumentation", () => ({
  trackScreenView: jest.fn(),
}));

import { createNavigationTelemetryTracker } from "@/services/telemetry/navigationTelemetry";

describe("navigationTelemetry", () => {
  const mockTrackScreenView = jest.fn<(routeName: string) => Promise<void>>();
  let currentRouteName: string | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    mockTrackScreenView.mockResolvedValue(undefined);
    currentRouteName = undefined;
  });

  it("tracks the initial screen and subsequent route changes once per distinct screen", () => {
    const handler = createNavigationTelemetryTracker({
      getCurrentRouteName: () => currentRouteName,
      trackScreenViewFn: mockTrackScreenView,
    });

    currentRouteName = "Home";
    handler();
    handler();

    currentRouteName = "MealAddMethod";
    handler();

    currentRouteName = "   ";
    handler();

    currentRouteName = "MealAddMethod";
    handler();

    expect(mockTrackScreenView).toHaveBeenCalledTimes(2);
    expect(mockTrackScreenView).toHaveBeenNthCalledWith(1, "Home");
    expect(mockTrackScreenView).toHaveBeenNthCalledWith(2, "MealAddMethod");
  });
});
