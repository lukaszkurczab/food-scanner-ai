import { getApp } from "@react-native-firebase/app";
import { getAuth } from "@react-native-firebase/auth";
import { createServiceError } from "@/services/contracts/serviceError";
import { asString, isRecord } from "@/services/contracts/guards";
import { withVersion } from "@/services/apiVersioning";
import { readPublicEnv } from "@/services/publicEnv";

const DEFAULT_TIMEOUT_MS = 30_000;
const API_CLIENT_SOURCE = "ApiClient";

export type RequestMethod = "GET" | "POST";

export type RequestOptions = {
  timeout?: number;
};

export type ApiClientError = Error & {
  code: string;
  source: string;
  retryable: boolean;
  status?: number;
  details?: unknown;
  url?: string;
  method?: RequestMethod;
};

function getApiBaseUrl(): string {
  const baseUrl = readPublicEnv("EXPO_PUBLIC_API_BASE_URL")?.trim();

  if (!baseUrl) {
    throw createServiceError({
      code: "api/misconfigured",
      source: API_CLIENT_SOURCE,
      retryable: false,
      message: "Missing EXPO_PUBLIC_API_BASE_URL",
    });
  }

  return baseUrl.replace(/\/+$/, "");
}

function buildRequestUrl(path: string): string {
  const versionedPath = withVersion(path);
  return `${getApiBaseUrl()}${versionedPath}`;
}

async function getAuthToken(): Promise<string | null> {
  const auth = getAuth(getApp());
  const currentUser = auth.currentUser;

  if (!currentUser) {
    return null;
  }

  return currentUser.getIdToken();
}

async function getAuthorizationHeader(): Promise<Record<string, string>> {
  const token = await getAuthToken();

  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function parseJsonResponse(response: Response): Promise<unknown> {
  const rawBody = await response.text();

  if (!rawBody) {
    return null;
  }

  try {
    return JSON.parse(rawBody);
  } catch (error) {
    throw createServiceError({
      code: "api/invalid-json",
      source: API_CLIENT_SOURCE,
      retryable: false,
      message: "API response is not valid JSON",
      cause: error,
    });
  }
}

function readErrorMessage(payload: unknown, fallback: string): string {
  if (!isRecord(payload)) {
    return fallback;
  }

  return (
    asString(payload.message) ||
    asString(payload.detail) ||
    asString(payload.error) ||
    fallback
  );
}

function createApiClientError(params: {
  code: string;
  message: string;
  retryable: boolean;
  status?: number;
  details?: unknown;
  url: string;
  method: RequestMethod;
  cause?: unknown;
}): ApiClientError {
  const error = createServiceError({
    code: params.code,
    source: API_CLIENT_SOURCE,
    retryable: params.retryable,
    message: params.message,
    cause: params.cause,
  }) as ApiClientError;

  if (params.status !== undefined) {
    error.status = params.status;
  }

  error.details = params.details;
  error.url = params.url;
  error.method = params.method;

  return error;
}

type PerformRequestParams = {
  url: string;
  method: RequestMethod;
  timeoutMs: number;
  headers: Record<string, string>;
  body?: BodyInit;
};

function createTimeoutPromise(params: {
  controller: AbortController;
  timeoutMs: number;
  url: string;
  method: RequestMethod;
  onTimeoutId: (timeoutId: ReturnType<typeof setTimeout>) => void;
}): Promise<never> {
  return new Promise((_, reject) => {
    const timeoutId = setTimeout(() => {
      params.controller.abort();
      reject(
        createApiClientError({
          code: "api/timeout",
          message: `Request timed out after ${params.timeoutMs}ms`,
          retryable: true,
          url: params.url,
          method: params.method,
        })
      );
    }, params.timeoutMs);

    params.onTimeoutId(timeoutId);
  });
}

async function performRequest<T = unknown>({
  url,
  method,
  timeoutMs,
  headers,
  body,
}: PerformRequestParams): Promise<T> {
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  try {
    const responsePromise = fetch(url, {
      method,
      headers,
      ...(body !== undefined ? { body } : {}),
      signal: controller.signal,
    });

    const response = await Promise.race([
      responsePromise,
      createTimeoutPromise({
        controller,
        timeoutMs,
        url,
        method,
        onTimeoutId: (nextTimeoutId) => {
          timeoutId = nextTimeoutId;
        },
      }),
    ]);
    const payload = await parseJsonResponse(response);

    if (!response.ok) {
      throw createApiClientError({
        code: response.status === 429 ? "api/rate-limited" : "api/http-error",
        message: readErrorMessage(
          payload,
          `API request failed with status ${response.status}`
        ),
        retryable: response.status >= 500 || response.status === 429,
        status: response.status,
        details: payload,
        url,
        method,
      });
    }

    return payload as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw createApiClientError({
        code: "api/timeout",
        message: `Request timed out after ${timeoutMs}ms`,
        retryable: true,
        url,
        method,
        cause: error,
      });
    }

    throw error;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

export async function request<T = unknown>(
  method: RequestMethod,
  url: string,
  data?: unknown,
  options?: RequestOptions
): Promise<T> {
  const fullUrl = buildRequestUrl(url);
  const timeoutMs = options?.timeout ?? DEFAULT_TIMEOUT_MS;
  const authHeader = await getAuthorizationHeader();

  return performRequest<T>({
    url: fullUrl,
    method,
    timeoutMs,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...authHeader,
    },
    body: method === "POST" ? JSON.stringify(data) : undefined,
  });
}

export async function upload<T = unknown>(
  url: string,
  data: FormData,
  options?: RequestOptions,
): Promise<T> {
  const fullUrl = buildRequestUrl(url);
  const timeoutMs = options?.timeout ?? DEFAULT_TIMEOUT_MS;
  const authHeader = await getAuthorizationHeader();

  return performRequest<T>({
    url: fullUrl,
    method: "POST",
    timeoutMs,
    headers: {
      Accept: "application/json",
      ...authHeader,
    },
    body: data,
  });
}

export function get<T = unknown>(
  url: string,
  options?: RequestOptions
): Promise<T> {
  return request<T>("GET", url, undefined, options);
}

export function post<T = unknown>(
  url: string,
  data?: unknown,
  options?: RequestOptions
): Promise<T> {
  return request<T>("POST", url, data, options);
}
