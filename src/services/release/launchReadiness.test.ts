import { describe, expect, it } from "@jest/globals";
import Constants from "expo-constants";
import {
  getLaunchReadinessIssue,
  getLaunchReadinessIssueFromExtra,
} from "@/services/release/launchReadiness";

describe("launchReadiness", () => {
  it("does not block non-production builds", () => {
    expect(
      getLaunchReadinessIssueFromExtra({ buildProfile: "preview" }),
    ).toBeNull();
  });

  it("blocks production builds with missing TERMS_URL", () => {
    expect(
      getLaunchReadinessIssueFromExtra({
        buildProfile: "production",
        privacyUrl: "https://example.com/privacy",
      }),
    ).toBe(
      "Missing or invalid TERMS_URL in production build.",
    );
  });

  it("blocks production builds with missing PRIVACY_URL", () => {
    expect(
      getLaunchReadinessIssueFromExtra({
        buildProfile: "production",
        termsUrl: "https://example.com/terms",
      }),
    ).toBe(
      "Missing or invalid PRIVACY_URL in production build.",
    );
  });

  it("passes production builds with valid legal URLs", () => {
    expect(
      getLaunchReadinessIssueFromExtra({
        buildProfile: "production",
        termsUrl: "https://example.com/terms",
        privacyUrl: "https://example.com/privacy",
      }),
    ).toBeNull();
  });

  it("reads values from expo constants in getLaunchReadinessIssue", () => {
    const originalExtra = Constants.expoConfig?.extra;

    Constants.expoConfig = {
      ...(Constants.expoConfig ?? {}),
      extra: {
        buildProfile: "production",
        termsUrl: "https://example.com/terms",
        privacyUrl: "https://example.com/privacy",
      },
    };

    expect(getLaunchReadinessIssue()).toBeNull();

    Constants.expoConfig = {
      ...(Constants.expoConfig ?? {}),
      extra: originalExtra ?? {},
    };
  });
});
