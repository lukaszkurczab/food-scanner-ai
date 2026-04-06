import { describe, expect, it } from "@jest/globals";
import readinessLib from "../../../scripts/check-launch-readiness.lib.js";

type EasConfig = {
  build: Record<string, { env?: Record<string, string> }>;
};

const {
  EXPECTED_PRODUCTION_API_BASE_URL,
  EXPECTED_DEV_API_BASE_URL,
  validateEasApiBaseUrlProfiles,
} = readinessLib as {
  EXPECTED_PRODUCTION_API_BASE_URL: string;
  EXPECTED_DEV_API_BASE_URL: string;
  validateEasApiBaseUrlProfiles: (config: EasConfig) => string[];
};

function createConfig(
  overrides?: Partial<Record<"development" | "preview" | "internal" | "e2e-test" | "production", string>>,
): EasConfig {
  const defaultValueByProfile = {
    development: EXPECTED_DEV_API_BASE_URL,
    preview: EXPECTED_DEV_API_BASE_URL,
    internal: EXPECTED_DEV_API_BASE_URL,
    "e2e-test": EXPECTED_DEV_API_BASE_URL,
    production: EXPECTED_PRODUCTION_API_BASE_URL,
  };

  const merged: Record<
    "development" | "preview" | "internal" | "e2e-test" | "production",
    string
  > = {
    ...defaultValueByProfile,
    ...overrides,
  };
  return {
    build: {
      development: { env: { EXPO_PUBLIC_API_BASE_URL: merged.development } },
      preview: { env: { EXPO_PUBLIC_API_BASE_URL: merged.preview } },
      internal: { env: { EXPO_PUBLIC_API_BASE_URL: merged.internal } },
      "e2e-test": { env: { EXPO_PUBLIC_API_BASE_URL: merged["e2e-test"] } },
      production: { env: { EXPO_PUBLIC_API_BASE_URL: merged.production } },
    },
  };
}

describe("check-launch-readiness eas api mapping", () => {
  it("passes for expected dev and production mapping", () => {
    const config = createConfig();
    expect(validateEasApiBaseUrlProfiles(config)).toHaveLength(0);
  });

  it("fails when production points to localhost", () => {
    const config = createConfig({
      production: "http://localhost:8000",
    });
    const errors = validateEasApiBaseUrlProfiles(config);
    expect(errors.join("\n")).toContain("cannot use localhost");
  });

  it("fails when non-production profile points to production URL", () => {
    const config = createConfig({
      preview: EXPECTED_PRODUCTION_API_BASE_URL,
    });
    const errors = validateEasApiBaseUrlProfiles(config);
    expect(errors.join("\n")).toContain("build.preview.env.EXPO_PUBLIC_API_BASE_URL must equal");
  });

  it("fails when profile URL is not https", () => {
    const config = createConfig({
      internal: "http://fitaly-backend-smoke.up.railway.app",
    });
    const errors = validateEasApiBaseUrlProfiles(config);
    expect(errors.join("\n")).toContain("build.internal.env.EXPO_PUBLIC_API_BASE_URL must be an https URL");
  });
});
