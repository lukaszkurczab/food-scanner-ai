import {
  createServiceError,
  getErrorStatus,
  isServiceError,
} from "@/services/contracts/serviceError";

export function toAiContractError(
  error: unknown,
  source: string,
) {
  const status = getErrorStatus(error);

  if (status === 401) {
    return createServiceError({
      code: "auth/required",
      source,
      retryable: false,
      message: "Authentication required",
      cause: error,
    });
  }

  if (
    status === 503 ||
    status === 502 ||
    status === 504 ||
    (isServiceError(error) && error.code === "api/timeout")
  ) {
    return createServiceError({
      code: "ai/unavailable",
      source,
      retryable: true,
      message: "AI service unavailable",
      cause: error,
    });
  }

  return null;
}
