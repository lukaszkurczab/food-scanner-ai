import { describe, expect, it } from "@jest/globals";
import {
  redactSensitiveText,
  sanitizeErrorStack,
  sanitizeLogContext,
  sanitizeSentryEvent,
} from "@/services/core/loggingPrivacy";

describe("loggingPrivacy", () => {
  it("allowlists context keys and drops unsupported values", () => {
    const sanitized = sanitizeLogContext({
      userUid: "user-1",
      threadId: "thread-1",
      feature: "chat",
      message: "raw user content",
      unknown: "should-drop",
      complex: { nested: true },
    });

    expect(sanitized).toEqual({
      userUid: "user-1",
      threadId: "thread-1",
      feature: "chat",
    });
  });

  it("redacts sensitive text markers", () => {
    const redacted = redactSensitiveText(
      "email me: user@example.com token=abc123 Bearer sk-test-12345",
    );

    expect(redacted).toContain("[redacted-email]");
    expect(redacted).toContain("token=[redacted]");
    expect(redacted).toContain("Bearer [redacted]");
  });

  it("sanitizes stack traces before transport", () => {
    const err = new Error("boom");
    err.stack = "Error: boom\nat fn (file.ts:1)\nuser@example.com\nauthorization=secret";

    const stack = sanitizeErrorStack(err);
    expect(stack).toContain("[redacted-email]");
    expect(stack).toContain("authorization=[redacted]");
    expect(stack).not.toContain("user@example.com");
    expect(stack).not.toContain("authorization=secret");
  });

  it("scrubs sentry event pii-heavy fields", () => {
    const event = sanitizeSentryEvent({
      message: "failed for user@example.com",
      user: { id: "abc", email: "user@example.com" },
      request: {
        url: "https://example.com?token=secret",
        headers: { Authorization: "Bearer top-secret" },
        data: { text: "raw user content" },
      },
      extra: {
        userUid: "user-1",
        prompt: "raw prompt text",
      },
    });

    expect((event as { user?: unknown }).user).toBeUndefined();
    expect((event as { message: string }).message).toContain("[redacted-email]");
    expect((event as { request: { headers?: unknown; data?: unknown } }).request.headers).toBeUndefined();
    expect((event as { request: { data?: unknown } }).request.data).toBeUndefined();
    expect((event as { extra?: { prompt?: unknown; userUid?: unknown } }).extra?.prompt).toBeUndefined();
    expect((event as { extra?: { userUid?: unknown } }).extra?.userUid).toBe("user-1");
  });
});
