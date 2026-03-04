import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import { getNotificationPlan } from "@/services/notifications/planService";
import { getDayISOInclusiveRange } from "@/services/notifications/dayRange";

const mockPost = jest.fn<(url: string, data?: unknown) => Promise<unknown>>();

jest.mock("@/services/apiClient", () => ({
  post: (url: string, data?: unknown) => mockPost(url, data),
}));

describe("notification plan service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-03-03T12:00:00.000Z"));
  });

  it("requests backend reconcile plan for the current day", async () => {
    mockPost.mockResolvedValue({
      aiStyle: "friendly",
      plans: [],
    });
    const expectedRange = getDayISOInclusiveRange(new Date("2026-03-03T12:00:00.000Z"));

    await getNotificationPlan("user-1");

    expect(mockPost).toHaveBeenCalledWith(
      "/api/v1/users/me/notifications/reconcile-plan",
      {
        startIso: expectedRange.startIso,
        endIso: expectedRange.endIso,
      }
    );
  });
});
