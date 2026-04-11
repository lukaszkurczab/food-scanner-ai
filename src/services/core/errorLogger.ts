import * as Sentry from "@sentry/react-native";
import * as apiClient from "@/services/core/apiClient";
import { readPublicEnv } from "@/services/core/publicEnv";

type ExtraContext = Record<string, unknown>;
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

function toExtraContext(
  context?: LogContext,
  error?: LogError,
): ExtraContext | undefined {
  const extra: ExtraContext = {};

  if (context !== undefined) {
    if (context && typeof context === "object" && !Array.isArray(context)) {
      Object.assign(extra, context as Record<string, unknown>);
    } else {
      extra.context = context;
    }
  }

  if (error !== undefined && !(error instanceof Error)) {
    extra.originalError = error;
  }

  return Object.keys(extra).length > 0 ? extra : undefined;
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
  if (__DEV__) console.log(message, context, error);
  sendToBackend(message, context, error);
}

export function logWarning(
  message: string,
  context?: LogContext,
  error?: LogError
) {
  if (__DEV__) console.warn(message, context, error);
  sendToBackend(message, context, error);
}

export function logError(message: string, context?: LogContext, error?: LogError) {
  if (__DEV__) console.error(message, context, error);
  sendToBackend(message, context, error);
}

export function captureException(
  message: string,
  context?: LogContext,
  error?: LogError
) {
  const err = error instanceof Error ? error : new Error(message);
  Sentry.captureException(err, {
    extra: toExtraContext(context, error),
  });
  sendToBackend(message, context, error);
}

export function captureMessage(message: string, extra?: ExtraContext): void {
  Sentry.captureMessage(message, { extra });
}
