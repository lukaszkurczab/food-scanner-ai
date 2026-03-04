import { asNumber, asString, isRecord } from "./guards";

export type ServiceErrorInit = {
  code: string;
  source: string;
  message?: string;
  retryable?: boolean;
  cause?: unknown;
};

export class ServiceError extends Error {
  readonly code: string;
  readonly source: string;
  readonly retryable: boolean;

  constructor({
    code,
    source,
    message,
    retryable = false,
    cause,
  }: ServiceErrorInit) {
    super(message ?? code);
    this.name = "ServiceError";
    this.code = code;
    this.source = source;
    this.retryable = retryable;
    if (cause !== undefined) {
      Object.defineProperty(this, "cause", {
        value: cause,
        enumerable: false,
        configurable: true,
      });
    }
  }
}

export function createServiceError(init: ServiceErrorInit): ServiceError {
  return new ServiceError(init);
}

export function isServiceError(error: unknown): error is ServiceError {
  if (!(error instanceof Error) || !isRecord(error)) return false;
  return (
    typeof error.code === "string" &&
    typeof error.source === "string" &&
    typeof error.retryable === "boolean"
  );
}

export function normalizeServiceError(
  error: unknown,
  fallback: Omit<ServiceErrorInit, "cause">
): ServiceError {
  if (isServiceError(error)) return error;

  if (isRecord(error)) {
    const code = asString(error.code) ?? fallback.code;
    const message = asString(error.message) ?? fallback.message;
    return createServiceError({
      code,
      source: fallback.source,
      retryable: fallback.retryable,
      message,
      cause: error,
    });
  }

  if (error instanceof Error) {
    return createServiceError({
      ...fallback,
      message: error.message || fallback.message,
      cause: error,
    });
  }

  return createServiceError({ ...fallback, cause: error });
}

export function getErrorStatus(error: unknown): number | undefined {
  if (!isRecord(error)) return undefined;
  return asNumber(error.status);
}
