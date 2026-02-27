import { describe, expect, it } from "@jest/globals";
import {
  createServiceError,
  isServiceError,
  normalizeServiceError,
  ServiceError,
} from "@/services/contracts/serviceError";

describe("serviceError", () => {
  it("creates ServiceError with defaults and optional cause", () => {
    const error = createServiceError({
      code: "E_TEST",
      source: "tests",
      message: "failed",
      cause: { detail: true },
    });

    expect(error).toBeInstanceOf(ServiceError);
    expect(error.name).toBe("ServiceError");
    expect(error.message).toBe("failed");
    expect(error.code).toBe("E_TEST");
    expect(error.source).toBe("tests");
    expect(error.retryable).toBe(false);
    expect("cause" in error).toBe(true);
  });

  it("detects valid and invalid ServiceError shapes", () => {
    const error = new ServiceError({
      code: "E_X",
      source: "svc",
      retryable: true,
    });
    expect(isServiceError(error)).toBe(true);
    expect(isServiceError(new Error("x"))).toBe(false);
    expect(isServiceError({})).toBe(false);
  });

  it("normalizes errors from service error, record, Error and unknown", () => {
    const existing = createServiceError({
      code: "E_EXISTING",
      source: "svc",
      retryable: true,
    });
    expect(
      normalizeServiceError(existing, {
        code: "E_FALLBACK",
        source: "fallback",
      }),
    ).toBe(existing);

    const fromRecord = normalizeServiceError(
      { code: "E_RECORD", message: "record msg" },
      { code: "E_FALLBACK", source: "fallback", retryable: false },
    );
    expect(fromRecord.code).toBe("E_RECORD");
    expect(fromRecord.source).toBe("fallback");
    expect(fromRecord.message).toBe("record msg");

    const fromError = normalizeServiceError(new Error("boom"), {
      code: "E_FALLBACK",
      source: "fallback",
      message: "fallback msg",
      retryable: true,
    });
    expect(fromError.code).toBe("E_FALLBACK");
    expect(fromError.message).toBe("boom");
    expect(fromError.retryable).toBe(true);

    const fromUnknown = normalizeServiceError(123, {
      code: "E_UNKNOWN",
      source: "fallback",
    });
    expect(fromUnknown.code).toBe("E_UNKNOWN");
    expect(fromUnknown.source).toBe("fallback");
    expect(fromUnknown.message).toBe("E_UNKNOWN");
  });
});
