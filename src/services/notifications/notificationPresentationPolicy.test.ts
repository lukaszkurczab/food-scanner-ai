import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockSetNotificationHandler = jest.fn();

jest.mock("expo-notifications", () => ({
  setNotificationHandler: (...args: unknown[]) =>
    mockSetNotificationHandler(...args),
}));

import {
  __resetNotificationPresentationPolicyForTests,
  getNotificationPresentationPolicyDiagnostics,
  initNotificationPresentationPolicy,
} from "@/services/notifications/notificationPresentationPolicy";

describe("notificationPresentationPolicy", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetNotificationPresentationPolicyForTests();
    jest.clearAllMocks();
  });

  it("initializes foreground policy once", () => {
    initNotificationPresentationPolicy();
    initNotificationPresentationPolicy();

    expect(mockSetNotificationHandler).toHaveBeenCalledTimes(1);
    expect(getNotificationPresentationPolicyDiagnostics().initialized).toBe(true);
  });

  it("resets policy state for tests", () => {
    initNotificationPresentationPolicy();
    __resetNotificationPresentationPolicyForTests();

    expect(mockSetNotificationHandler).toHaveBeenLastCalledWith(null);
    expect(getNotificationPresentationPolicyDiagnostics().initialized).toBe(false);
  });
});
