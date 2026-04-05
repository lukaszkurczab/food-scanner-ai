import Constants from "expo-constants";

const PRODUCTION_BUILD_PROFILE = "production";

type AppExtra = {
  buildProfile?: unknown;
  termsUrl?: unknown;
  privacyUrl?: unknown;
};

function readExtra(): AppExtra {
  return (Constants.expoConfig?.extra ?? {}) as AppExtra;
}

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isHttpUrl(value: string): boolean {
  return value.startsWith("https://") || value.startsWith("http://");
}

function isProductionBuild(extra: AppExtra): boolean {
  return (
    normalizeString(extra.buildProfile).toLowerCase() === PRODUCTION_BUILD_PROFILE
  );
}

export function getLaunchReadinessIssueFromExtra(extra: AppExtra): string | null {
  if (!isProductionBuild(extra)) {
    return null;
  }

  const termsUrl = normalizeString(extra.termsUrl);
  const privacyUrl = normalizeString(extra.privacyUrl);

  if (!isHttpUrl(termsUrl)) {
    return "Missing or invalid TERMS_URL in production build.";
  }
  if (!isHttpUrl(privacyUrl)) {
    return "Missing or invalid PRIVACY_URL in production build.";
  }

  return null;
}

export function getLaunchReadinessIssue(): string | null {
  return getLaunchReadinessIssueFromExtra(readExtra());
}
