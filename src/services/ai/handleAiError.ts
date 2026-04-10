import { toAiContractError } from "@/services/ai/errorMapping";
import {
  createServiceError,
  getErrorStatus,
} from "@/services/contracts/serviceError";
import { logError } from "@/services/core/errorLogger";

export type UnknownErrorStrategy =
  | { action: "throw" }
  | { action: "return-null" }
  | { action: "wrap-unavailable" };

type AiErrorSource = "textMealService" | "VisionService";

type SourceMeta = {
  contractSource: string;
  failureMessage: string;
};

const SOURCE_META: Record<AiErrorSource, SourceMeta> = {
  textMealService: {
    contractSource: "TextMealService",
    failureMessage: "[textMealService] backend text analysis failed",
  },
  VisionService: {
    contractSource: "VisionService",
    failureMessage: "[visionService] backend photo analysis failed",
  },
};

export function handleAiError(
  error: unknown,
  source: AiErrorSource,
  logContext: Record<string, unknown>,
  strategy: UnknownErrorStrategy,
): never | null {
  const meta = SOURCE_META[source];
  const status = getErrorStatus(error);
  if (status === 402) {
    throw error;
  }

  logError(meta.failureMessage, logContext, error);

  const contractError = toAiContractError(error, meta.contractSource);
  if (contractError) {
    throw contractError;
  }

  if (strategy.action === "return-null") {
    return null;
  }

  if (strategy.action === "wrap-unavailable") {
    throw createServiceError({
      code: "ai/unavailable",
      source: meta.contractSource,
      retryable: true,
      message: "AI service unavailable",
      cause: error,
    });
  }

  throw error;
}
