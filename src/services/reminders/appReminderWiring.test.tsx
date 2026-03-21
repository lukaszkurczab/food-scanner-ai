/**
 * App-level wiring proof for Smart Reminders v1 runtime.
 *
 * This test renders the production Root component (inside App.tsx) with
 * mocked providers and asserts that the canonical runtime lifecycle —
 * init, uid propagation, and cleanup — is wired to real app lifecycle hooks.
 *
 * It is NOT a behavioral/E2E test of reminder scheduling.  It exists to
 * prove that App.tsx is the canonical runtime owner and that the wiring
 * cannot silently break without a test failure.
 */

import { describe, expect, it, jest, beforeEach } from "@jest/globals";

// ---------------------------------------------------------------------------
// Mock: reminderRuntime — the system under proof
// ---------------------------------------------------------------------------

const mockInitReminderRuntime = jest.fn<() => Promise<void>>();
const mockSetReminderRuntimeUid = jest.fn<(uid: string | null) => Promise<void>>();
const mockStopReminderRuntime = jest.fn();

jest.mock("@/services/reminders/reminderRuntime", () => ({
  initReminderRuntime: () => mockInitReminderRuntime(),
  setReminderRuntimeUid: (uid: string | null) => mockSetReminderRuntimeUid(uid),
  stopReminderRuntime: () => mockStopReminderRuntime(),
}));

// ---------------------------------------------------------------------------
// Mock: AuthContext — controllable uid source
// ---------------------------------------------------------------------------

let mockUid: string | null = null;

jest.mock("@/context/AuthContext", () => {
  const R = require("react");
  return {
    AuthProvider: ({ children }: { children: unknown }) =>
      R.createElement(R.Fragment, null, children),
    useAuthContext: () => ({ uid: mockUid }),
  };
});

// ---------------------------------------------------------------------------
// Mock: heavy dependencies that Root uses but are irrelevant to this proof
// ---------------------------------------------------------------------------

jest.mock("@/i18n", () => ({}));
jest.mock("@/FirebaseConfig", () => ({}));
jest.mock("react-native-get-random-values", () => ({}));
jest.mock("@/feature/Subscription", () => ({
  initRevenueCat: jest.fn(),
}));

jest.mock("@hooks/useAppFonts", () => ({
  useAppFonts: () => true,
}));

jest.mock("@/navigation/AppNavigator", () => {
  const R = require("react");
  return {
    __esModule: true,
    default: () => R.createElement("View"),
  };
});

jest.mock("@react-navigation/native", () => {
  const R = require("react");
  return {
    NavigationContainer: R.forwardRef(
      ({ children }: { children: unknown }, _ref: unknown) =>
        R.createElement(R.Fragment, null, children),
    ),
  };
});

jest.mock("@/navigation/navigate", () => ({
  navigationRef: { getCurrentRoute: jest.fn() },
}));

jest.mock("@/context/UserContext", () => {
  const R = require("react");
  return { UserProvider: ({ children }: { children: unknown }) => R.createElement(R.Fragment, null, children) };
});

jest.mock("@/context/MealDraftContext", () => {
  const R = require("react");
  return { MealDraftProvider: ({ children }: { children: unknown }) => R.createElement(R.Fragment, null, children) };
});

jest.mock("@/context/PremiumContext", () => {
  const R = require("react");
  return { PremiumProvider: ({ children }: { children: unknown }) => R.createElement(R.Fragment, null, children) };
});

jest.mock("@/context/HistoryContext", () => {
  const R = require("react");
  return { HistoryProvider: ({ children }: { children: unknown }) => R.createElement(R.Fragment, null, children) };
});

jest.mock("@/context/AiCreditsContext", () => {
  const R = require("react");
  return { AiCreditsProvider: ({ children }: { children: unknown }) => R.createElement(R.Fragment, null, children) };
});

jest.mock("@/theme/ThemeController", () => {
  const R = require("react");
  return {
    ThemeController: ({ children }: { children: unknown }) =>
      R.createElement(R.Fragment, null, children),
  };
});

jest.mock("@/components", () => ({
  ToastBridge: () => null,
}));

jest.mock("@/services/e2e/config", () => ({
  isE2EModeEnabled: () => false,
}));

jest.mock("@/services/e2e/deepLink", () => ({
  handleE2EDeepLink: jest.fn(),
}));

jest.mock("@/services/notifications/notificationTelemetry", () => ({
  initNotificationTelemetry: jest.fn(),
  stopNotificationTelemetry: jest.fn(),
}));

jest.mock("@/services/telemetry/telemetryClient", () => ({
  initTelemetryClient: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  stopTelemetryClient: jest.fn(),
}));

jest.mock("@/services/telemetry/telemetryLifecycle", () => ({
  initTelemetryLifecycle: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  stopTelemetryLifecycle: jest.fn(),
}));

jest.mock("@/services/telemetry/navigationTelemetry", () => ({
  createNavigationTelemetryTracker: jest.fn(() => jest.fn()),
}));

// ---------------------------------------------------------------------------
// Import App AFTER all mocks are in place
// ---------------------------------------------------------------------------

import React from "react";
import TestRenderer, { act } from "react-test-renderer";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { default: App } = require("../../../App") as { default: React.ComponentType };

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("App.tsx → Smart Reminders runtime wiring", () => {
  beforeEach(() => {
    mockUid = null;
    jest.clearAllMocks();
    mockInitReminderRuntime.mockResolvedValue(undefined);
    mockSetReminderRuntimeUid.mockResolvedValue(undefined);
  });

  it("calls initReminderRuntime on app bootstrap", async () => {
    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(React.createElement(App));
    });

    expect(mockInitReminderRuntime).toHaveBeenCalledTimes(1);
    act(() => { renderer!.unmount(); });
  });

  it("calls setReminderRuntimeUid when auth uid changes", async () => {
    mockUid = null;

    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(React.createElement(App));
    });

    expect(mockSetReminderRuntimeUid).toHaveBeenCalledWith(null);
    mockSetReminderRuntimeUid.mockClear();

    mockUid = "user-42";
    await act(async () => {
      renderer!.update(React.createElement(App));
    });

    expect(mockSetReminderRuntimeUid).toHaveBeenCalledWith("user-42");
    act(() => { renderer!.unmount(); });
  });

  it("calls stopReminderRuntime on unmount", async () => {
    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(React.createElement(App));
    });

    mockStopReminderRuntime.mockClear();

    act(() => {
      renderer!.unmount();
    });

    expect(mockStopReminderRuntime).toHaveBeenCalledTimes(1);
  });
});
