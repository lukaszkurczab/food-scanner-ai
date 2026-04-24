import { get, post } from "@/services/core/apiClient";
import {
  createServiceError,
  getErrorStatus,
} from "@/services/contracts/serviceError";

export function normalizeUsername(raw: string): string {
  return String(raw || "")
    .trim()
    .toLowerCase();
}

export async function isUsernameAvailable(
  candidate: string,
  _currentUid?: string | null
): Promise<boolean> {
  const username = normalizeUsername(candidate);

  if (!username) return false;

  const params = new URLSearchParams({ username });

  const response = await get<{ username: string; available: boolean }>(
    `/usernames/availability?${params.toString()}`,
  );

  return response.available;
}

export async function claimUsername(
  username: string,
  _uid?: string
): Promise<string> {
  const normalizedUsername = normalizeUsername(username);
  if (!normalizedUsername) {
    throw createServiceError({
      code: "username/invalid",
      source: "UsernameService",
      retryable: false,
      message: "Username is required",
    });
  }

  try {
    const response = await post<{ username: string }>(
      "/users/me/username",
      { username: normalizedUsername },
    );

    return response.username;
  } catch (error) {
    if (getErrorStatus(error) === 409) {
      throw createServiceError({
        code: "username/unavailable",
        source: "UsernameService",
        retryable: false,
        message: "Username unavailable",
        cause: error,
      });
    }

    if (getErrorStatus(error) === 400) {
      throw createServiceError({
        code: "username/invalid",
        source: "UsernameService",
        retryable: false,
        message: "Username invalid",
        cause: error,
      });
    }

    throw error;
  }
}
