import { isRecord } from "@/services/contracts/guards";
import {
  getErrorStatus,
  isServiceError,
} from "@/services/contracts/serviceError";

export type AiUxErrorType =
  | "offline"
  | "timeout"
  | "unavailable"
  | "limit"
  | "auth"
  | "unknown";

function hasTimeoutInCauseChain(error: unknown): boolean {
  let cursor: unknown = error;

  for (let i = 0; i < 4; i += 1) {
    if (!cursor) return false;
    if (isServiceError(cursor) && cursor.code === "api/timeout") return true;
    if (!isRecord(cursor) || !("cause" in cursor)) return false;
    cursor = cursor.cause;
  }

  return false;
}

function isNetworkFailure(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("network request failed") ||
    message.includes("failed to fetch")
  );
}

export function getAiUxErrorType(error: unknown): AiUxErrorType {
  if (isServiceError(error)) {
    if (error.code === "offline") return "offline";
    if (error.code === "api/timeout") return "timeout";
    if (error.code === "auth/required") return "auth";
    if (error.code === "api/rate-limited") {
      return "limit";
    }
    if (error.code === "ai/unavailable") {
      return hasTimeoutInCauseChain(error) ? "timeout" : "unavailable";
    }
  }

  const status = getErrorStatus(error);
  if (status === 401) return "auth";
  if (status === 429) return "limit";
  if (status === 504) return "timeout";
  if (status === 502 || status === 503) return "unavailable";

  if (isNetworkFailure(error)) return "offline";

  return "unknown";
}
