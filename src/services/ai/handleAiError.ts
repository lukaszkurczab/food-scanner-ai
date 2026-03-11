import { readAiUsageStatusFromApiErrorDetails } from "@/services/ai/contracts";
import { AiLimitExceededError } from "@/services/ai/AiLimitExceededError";
import { toAiContractError } from "@/services/ai/errorMapping";
import { isRecord } from "@/services/contracts/guards";
import {
  createServiceError,
  getErrorStatus,
} from "@/services/contracts/serviceError";
import { logError, logWarning } from "@/services/core/errorLogger";

export type UnknownErrorStrategy =
  | { action: "throw" }
  | { action: "return-null" }
  | { action: "wrap-unavailable" };

type AiErrorSource = "askDietAI" | "textMealService" | "VisionService";

type SourceMeta = {
  contractSource: string;
  limitMessage: string;
  failureMessage: string;
};

const SOURCE_META: Record<AiErrorSource, SourceMeta> = {
  askDietAI: {
    contractSource: "AskDietAI",
    limitMessage: "[askDietAI] backend AI usage limit reached",
    failureMessage: "[askDietAI] backend AI request failed",
  },
  textMealService: {
    contractSource: "TextMealService",
    limitMessage: "[textMealService] backend text analysis limit reached",
    failureMessage: "[textMealService] backend text analysis failed",
  },
  VisionService: {
    contractSource: "VisionService",
    limitMessage: "[visionService] backend photo analysis limit reached",
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

  if (getErrorStatus(error) === 429) {
    const usage = isRecord(error)
      ? readAiUsageStatusFromApiErrorDetails(error.details)
      : null;
    logWarning(meta.limitMessage, logContext, error);
    throw new AiLimitExceededError(undefined, usage ?? undefined);
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
