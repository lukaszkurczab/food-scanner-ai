import { readPublicEnv } from "@/services/core/publicEnv";

const DEFAULT_API_VERSION = "v1";

function normalizePath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) {
    return "/";
  }

  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

// Changing API_VERSION to "v2" switches every endpoint built with withVersion().
export const API_VERSION =
  readPublicEnv("EXPO_PUBLIC_API_VERSION")?.trim() || DEFAULT_API_VERSION;

export function withVersion(path: string): string {
  const normalizedPath = normalizePath(path);
  const versionPrefix = `/api/${API_VERSION}`;

  if (
    normalizedPath === versionPrefix ||
    normalizedPath.startsWith(`${versionPrefix}/`) ||
    normalizedPath.startsWith(`${versionPrefix}?`)
  ) {
    return normalizedPath;
  }

  return `${versionPrefix}${normalizedPath}`;
}
