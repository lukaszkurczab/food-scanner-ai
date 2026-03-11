import * as apiClient from "@/services/core/apiClient";
import { readPublicEnv } from "@/services/core/publicEnv";

type LogContext = unknown;
type LogError = unknown;

const LOG_SOURCE = "mobile";
const LOGS_ENDPOINT = "/logs/error";

function isBackendLoggingEnabled(): boolean {
  return readPublicEnv("EXPO_PUBLIC_ENABLE_BACKEND_LOGGING") === "true";
}

function getErrorStack(error?: LogError): string | undefined {
  return error instanceof Error ? error.stack : undefined;
}

function sendToBackend(message: string, context?: LogContext, error?: LogError) {
  if (!isBackendLoggingEnabled()) {
    return;
  }

  try {
    void apiClient
      .post(LOGS_ENDPOINT, {
        source: LOG_SOURCE,
        message,
        stack: getErrorStack(error),
        context,
      })
      .catch(() => {
        // Logger failures must never cascade into app errors.
      });
  } catch {
    // Logger failures must never cascade into app errors.
  }
}

export function logInfo(message: string, context?: LogContext, error?: LogError) {
  console.log(message, context, error);
  sendToBackend(message, context, error);
}

export function logWarning(
  message: string,
  context?: LogContext,
  error?: LogError
) {
  console.warn(message, context, error);
  sendToBackend(message, context, error);
}

export function logError(message: string, context?: LogContext, error?: LogError) {
  console.error(message, context, error);
  sendToBackend(message, context, error);
}

export function captureException(
  message: string,
  context?: LogContext,
  error?: LogError
) {
  console.error(message, context, error);
  sendToBackend(message, context, error);
}
