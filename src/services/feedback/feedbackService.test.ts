import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockUpload = jest.fn<(path: string, data: FormData) => Promise<unknown>>();

jest.mock("@/services/core/apiClient", () => ({
  upload: (...args: [string, FormData]) => mockUpload(...args),
}));

describe("feedbackService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpload.mockResolvedValue({});
  });

  it("sends only message when deviceInfo and attachmentUri are omitted", async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { sendFeedback } = require("@/services/feedback/feedbackService");

    await sendFeedback({ message: "Minimal report" });

    expect(mockUpload).toHaveBeenCalledTimes(1);
    expect(mockUpload.mock.calls[0]?.[0]).toBe("/users/me/feedback");
  });

  it("omits device fields when deviceInfo values are null", async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { sendFeedback } = require("@/services/feedback/feedbackService");

    await sendFeedback({
      message: "Report",
      deviceInfo: { modelName: null, osName: null, osVersion: null },
    });

    expect(mockUpload).toHaveBeenCalledTimes(1);
  });

  it("uses Date-based fallback filename when attachmentUri has no path separator", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { sendFeedback } = require("@/services/feedback/feedbackService");

    await sendFeedback({ message: "Report", attachmentUri: "noSlashName" });

    expect(mockUpload).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  it("uploads feedback through backend endpoint with optional attachment", async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { sendFeedback } = require("@/services/feedback/feedbackService");

    await sendFeedback({
      message: "Bug report",
      attachmentUri: "file:///tmp/screenshot.jpg",
      userUid: "user-1",
      email: "user@example.com",
      deviceInfo: {
        modelName: "Pixel",
        osName: "Android",
        osVersion: "15",
      },
    });

    expect(mockUpload).toHaveBeenCalledTimes(1);
    expect(mockUpload.mock.calls[0]?.[0]).toBe("/users/me/feedback");
    expect(mockUpload.mock.calls[0]?.[1]).toBeInstanceOf(FormData);
  });
});
