import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockUpload = jest.fn<(path: string, data: FormData) => Promise<unknown>>();

jest.mock("@/services/apiClient", () => ({
  upload: (...args: [string, FormData]) => mockUpload(...args),
}));

describe("feedbackService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpload.mockResolvedValue({});
  });

  it("uploads feedback through backend endpoint with optional attachment", async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { sendFeedback } = require("@/services/feedbackService");

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
    expect(mockUpload.mock.calls[0]?.[0]).toBe("/api/v1/users/me/feedback");
    expect(mockUpload.mock.calls[0]?.[1]).toBeInstanceOf(FormData);
  });
});
