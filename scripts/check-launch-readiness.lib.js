const REQUIRED_NON_PROD_BUILD_PROFILES = [
  "development",
  "preview",
  "internal",
  "e2e-test",
];
const PRODUCTION_BUILD_PROFILE = "production";
const EXPECTED_DEV_API_BASE_URL =
  "https://fitaly-backend-smoke.up.railway.app";
const EXPECTED_PRODUCTION_API_BASE_URL =
  "https://fitaly-backend-production.up.railway.app";

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isHttpsUrl(value) {
  return /^https:\/\//i.test(normalizeString(value));
}

function isLocalhostUrl(value) {
  const normalized = normalizeString(value);
  if (!normalized) {
    return false;
  }

  try {
    const parsed = new URL(normalized);
    return (
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname === "::1"
    );
  } catch {
    return false;
  }
}

function getProfileEnv(easConfig, profileName) {
  const profile = easConfig?.build?.[profileName];
  const env = profile?.env;
  return env && typeof env === "object" ? env : {};
}

function getApiBaseUrlForProfile(easConfig, profileName) {
  const profileEnv = getProfileEnv(easConfig, profileName);
  return normalizeString(profileEnv.EXPO_PUBLIC_API_BASE_URL);
}

function validateEasApiBaseUrlProfiles(easConfig) {
  const errors = [];

  for (const profileName of REQUIRED_NON_PROD_BUILD_PROFILES) {
    const value = getApiBaseUrlForProfile(easConfig, profileName);
    if (!value) {
      errors.push(
        `eas.json build.${profileName}.env.EXPO_PUBLIC_API_BASE_URL is missing.`,
      );
      continue;
    }
    if (!isHttpsUrl(value)) {
      errors.push(
        `eas.json build.${profileName}.env.EXPO_PUBLIC_API_BASE_URL must be an https URL (got: ${value}).`,
      );
    }
    if (value !== EXPECTED_DEV_API_BASE_URL) {
      errors.push(
        `eas.json build.${profileName}.env.EXPO_PUBLIC_API_BASE_URL must equal ${EXPECTED_DEV_API_BASE_URL} (got: ${value}).`,
      );
    }
    if (value.toLowerCase().includes("food-scanner")) {
      errors.push(
        `eas.json build.${profileName}.env.EXPO_PUBLIC_API_BASE_URL points to legacy domain (${value}).`,
      );
    }
  }

  const productionValue = getApiBaseUrlForProfile(
    easConfig,
    PRODUCTION_BUILD_PROFILE,
  );
  if (!productionValue) {
    errors.push(
      "eas.json build.production.env.EXPO_PUBLIC_API_BASE_URL is missing.",
    );
  } else {
    if (!isHttpsUrl(productionValue)) {
      errors.push(
        `eas.json build.production.env.EXPO_PUBLIC_API_BASE_URL must be an https URL (got: ${productionValue}).`,
      );
    }
    if (isLocalhostUrl(productionValue)) {
      errors.push(
        `eas.json build.production.env.EXPO_PUBLIC_API_BASE_URL cannot use localhost (got: ${productionValue}).`,
      );
    }
    if (productionValue !== EXPECTED_PRODUCTION_API_BASE_URL) {
      errors.push(
        `eas.json build.production.env.EXPO_PUBLIC_API_BASE_URL must equal ${EXPECTED_PRODUCTION_API_BASE_URL} (got: ${productionValue}).`,
      );
    }
    if (productionValue.toLowerCase().includes("food-scanner")) {
      errors.push(
        `eas.json build.production.env.EXPO_PUBLIC_API_BASE_URL points to legacy domain (${productionValue}).`,
      );
    }
  }

  return errors;
}

module.exports = {
  REQUIRED_NON_PROD_BUILD_PROFILES,
  PRODUCTION_BUILD_PROFILE,
  EXPECTED_DEV_API_BASE_URL,
  EXPECTED_PRODUCTION_API_BASE_URL,
  isHttpsUrl,
  isLocalhostUrl,
  getApiBaseUrlForProfile,
  validateEasApiBaseUrlProfiles,
};
