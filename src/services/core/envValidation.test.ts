import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { validateEnv, warnMissingEnv } from "@/services/core/envValidation";

const mockReadPublicEnv = jest.fn<(name: string) => string | undefined>();
const mockLogWarning = jest.fn<
  (message: string, context?: unknown, error?: unknown) => void
>();

jest.mock("@/services/core/publicEnv", () => ({
  readPublicEnv: (name: string) => mockReadPublicEnv(name),
}));

jest.mock("@/services/core/errorLogger", () => ({
  logWarning: (message: string, context?: unknown, error?: unknown) =>
    mockLogWarning(message, context, error),
}));

describe("envValidation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns valid=true when all required env vars are set", () => {
    mockReadPublicEnv.mockImplementation((name: string) => {
      if (name === "EXPO_PUBLIC_API_BASE_URL") {
        return "https://api.example.com";
      }
      if (name === "EXPO_PUBLIC_API_VERSION") {
        return "v1";
      }
      return undefined;
    });

    expect(validateEnv()).toEqual({
      valid: true,
      missing: [],
    });
  });

  it("returns missing array when required env vars are missing", () => {
    mockReadPublicEnv.mockReturnValue(undefined);

    expect(validateEnv()).toEqual({
      valid: false,
      missing: ["EXPO_PUBLIC_API_BASE_URL", "EXPO_PUBLIC_API_VERSION"],
    });
  });

  it("calls logWarning when warnMissingEnv detects missing required vars", () => {
    mockReadPublicEnv.mockImplementation((name: string) => {
      if (name === "EXPO_PUBLIC_API_BASE_URL") {
        return "https://api.example.com";
      }
      return undefined;
    });

    warnMissingEnv();

    expect(mockLogWarning).toHaveBeenCalledWith("missing required env vars", {
      missing: ["EXPO_PUBLIC_API_VERSION"],
    }, undefined);
  });
});
