import { logWarning } from "@/services/core/errorLogger";
import { readPublicEnv } from "@/services/core/publicEnv";

export const REQUIRED_ENV_VARS = {
  EXPO_PUBLIC_API_BASE_URL: "Backend API base URL",
  EXPO_PUBLIC_API_VERSION: "API version (e.g. v1)",
} as const;

export const OPTIONAL_ENV_VARS = {
  EXPO_PUBLIC_ENABLE_BACKEND_LOGGING: "Enable backend error logging",
  EXPO_PUBLIC_ENABLE_TELEMETRY: "Enable telemetry",
  EXPO_PUBLIC_ENABLE_SMART_REMINDERS: "Enable smart reminders canonical surface",
} as const;

function hasValue(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function validateEnv(): { valid: boolean; missing: string[] } {
  const missing = Object.keys(REQUIRED_ENV_VARS).filter(
    (key) => !hasValue(readPublicEnv(key)),
  );

  return {
    valid: missing.length === 0,
    missing,
  };
}

export function warnMissingEnv(): void {
  const result = validateEnv();

  if (result.missing.length === 0) {
    return;
  }

  logWarning("missing required env vars", { missing: result.missing });

  if (__DEV__) {
    console.warn(
      `[envValidation] Missing required environment variables: ${result.missing.join(", ")}`,
    );
  }
}
