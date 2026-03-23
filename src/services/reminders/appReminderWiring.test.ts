import React from "react";
import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import TestRenderer, { act } from "react-test-renderer";
import App from "../../../App";

const mockInitReminderRuntime = jest.fn<() => Promise<void>>();
const mockSetReminderRuntimeUid =
  jest.fn<(uid: string | null) => Promise<void>>();
const mockStopReminderRuntime = jest.fn();

jest.mock("@/services/reminders/reminderRuntime", () => ({
  initReminderRuntime: () => mockInitReminderRuntime(),
  setReminderRuntimeUid: (uid: string | null) => mockSetReminderRuntimeUid(uid),
  stopReminderRuntime: () => mockStopReminderRuntime(),
}));

let mockUid: string | null = null;

jest.mock("@/context/AuthContext", () => {
  const ReactActual = jest.requireActual("react") as typeof import("react");

  return {
    AuthProvider: ({ children }: { children: React.ReactNode }) =>
      ReactActual.createElement(ReactActual.Fragment, null, children),
    useAuthContext: () => ({ uid: mockUid }),
  };
});

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
  const ReactActual = jest.requireActual("react") as typeof import("react");

  return {
    __esModule: true,
    default: () => ReactActual.createElement("View"),
  };
});

jest.mock("@react-navigation/native", () => {
  const ReactActual = jest.requireActual("react") as typeof import("react");

  return {
    NavigationContainer: ReactActual.forwardRef(
      (
        { children }: { children: React.ReactNode },
        _ref: React.ForwardedRef<unknown>,
      ) => ReactActual.createElement(ReactActual.Fragment, null, children),
    ),
  };
});

jest.mock("@/navigation/navigate", () => ({
  navigationRef: { getCurrentRoute: jest.fn() },
}));

jest.mock("@/context/UserContext", () => {
  const ReactActual = jest.requireActual("react") as typeof import("react");

  return {
    UserProvider: ({ children }: { children: React.ReactNode }) =>
      ReactActual.createElement(ReactActual.Fragment, null, children),
  };
});

jest.mock("@/context/MealDraftContext", () => {
  const ReactActual = jest.requireActual("react") as typeof import("react");

  return {
    MealDraftProvider: ({ children }: { children: React.ReactNode }) =>
      ReactActual.createElement(ReactActual.Fragment, null, children),
  };
});

jest.mock("@/context/PremiumContext", () => {
  const ReactActual = jest.requireActual("react") as typeof import("react");

  return {
    PremiumProvider: ({ children }: { children: React.ReactNode }) =>
      ReactActual.createElement(ReactActual.Fragment, null, children),
  };
});

jest.mock("@/context/HistoryContext", () => {
  const ReactActual = jest.requireActual("react") as typeof import("react");

  return {
    HistoryProvider: ({ children }: { children: React.ReactNode }) =>
      ReactActual.createElement(ReactActual.Fragment, null, children),
  };
});

jest.mock("@/context/AiCreditsContext", () => {
  const ReactActual = jest.requireActual("react") as typeof import("react");

  return {
    AiCreditsProvider: ({ children }: { children: React.ReactNode }) =>
      ReactActual.createElement(ReactActual.Fragment, null, children),
  };
});

jest.mock("@/theme/ThemeController", () => {
  const ReactActual = jest.requireActual("react") as typeof import("react");

  return {
    ThemeController: ({ children }: { children: React.ReactNode }) =>
      ReactActual.createElement(ReactActual.Fragment, null, children),
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
  initTelemetryClient: jest
    .fn<() => Promise<void>>()
    .mockResolvedValue(undefined),
  stopTelemetryClient: jest.fn(),
}));

jest.mock("@/services/telemetry/telemetryLifecycle", () => ({
  initTelemetryLifecycle: jest
    .fn<() => Promise<void>>()
    .mockResolvedValue(undefined),
  stopTelemetryLifecycle: jest.fn(),
}));

jest.mock("@/services/telemetry/navigationTelemetry", () => ({
  createNavigationTelemetryTracker: jest.fn(() => jest.fn()),
}));

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

    act(() => {
      renderer!.unmount();
    });
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

    act(() => {
      renderer!.unmount();
    });
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
