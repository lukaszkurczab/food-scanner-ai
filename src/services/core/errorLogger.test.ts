import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockSentryCaptureException = jest.fn();
const mockApiPost = jest.fn();
const mockReadPublicEnv = jest.fn();

jest.mock("@sentry/react-native", () => ({
  captureException: (...args: unknown[]) => mockSentryCaptureException(...args),
}));

jest.mock("@/services/core/apiClient", () => ({
  post: (...args: unknown[]) => mockApiPost(...args),
}));

jest.mock("@/services/core/publicEnv", () => ({
  readPublicEnv: (...args: unknown[]) => mockReadPublicEnv(...args),
}));

describe("errorLogger", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApiPost.mockImplementation(() => Promise.resolve(undefined));
    mockReadPublicEnv.mockImplementation((...args: unknown[]) =>
      args[0] === "EXPO_PUBLIC_ENABLE_BACKEND_LOGGING" ? "true" : undefined,
    );
  });

  it("sends only sanitized payload to backend logs endpoint", () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { logError } = require("@/services/core/errorLogger");
    const error = new Error("boom");
    error.stack = "user@example.com token=abc123";

    logError("failed user@example.com", {
      userUid: "user-1",
      feature: "chat",
      message: "raw user content",
      extra: "drop-me",
    }, error);

    expect(mockApiPost).toHaveBeenCalledTimes(1);
    expect(mockApiPost).toHaveBeenCalledWith(
      "/logs/error",
      expect.objectContaining({
        source: "mobile",
        context: {
          userUid: "user-1",
          feature: "chat",
        },
      }),
    );
    const payload = mockApiPost.mock.calls[0]?.[1] as {
      message: string;
      stack?: string;
      context?: Record<string, unknown>;
    };
    expect(payload.message).toContain("[redacted-email]");
    expect(payload.stack).toContain("[redacted-email]");
    expect(payload.stack).toContain("token=[redacted]");
    expect(payload.context?.message).toBeUndefined();
  });

  it("forwards sanitized context to sentry extra", () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { captureException } = require("@/services/core/errorLogger");
    captureException("boom", {
      userUid: "user-1",
      threadId: "thread-1",
      text: "should-not-pass",
    });

    expect(mockSentryCaptureException).toHaveBeenCalledTimes(1);
    const sentryOptions = mockSentryCaptureException.mock.calls[0]?.[1] as {
      extra?: Record<string, unknown>;
    };
    expect(sentryOptions.extra).toEqual({
      userUid: "user-1",
      threadId: "thread-1",
    });
  });
});
