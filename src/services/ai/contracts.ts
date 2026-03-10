import { asNumber, asString, isRecord } from "@/services/contracts/guards";

export type AiPersistence = "backend_owned";

export type AiUsageWindow = {
  usageCount: number;
  remaining: number;
};

export type AiUsageStatus = {
  dateKey: string;
  usageCount: number;
  dailyLimit: number;
  remaining: number;
};

export function getAiDailyLimit(usage: AiUsageWindow): number {
  return Math.max(usage.usageCount + usage.remaining, 0);
}

function parseAiUsageStatus(value: unknown): AiUsageStatus | null {
  if (!isRecord(value)) return null;

  const dateKey = asString(value.dateKey);
  const usageCount = asNumber(value.usageCount);
  const dailyLimit = asNumber(value.dailyLimit);
  const remaining = asNumber(value.remaining);
  if (
    !dateKey ||
    usageCount === undefined ||
    dailyLimit === undefined ||
    remaining === undefined
  ) {
    return null;
  }

  return {
    dateKey,
    usageCount,
    dailyLimit,
    remaining,
  };
}

export function readAiUsageStatusFromApiErrorDetails(
  details: unknown,
): AiUsageStatus | null {
  const direct = parseAiUsageStatus(details);
  if (direct) return direct;

  if (!isRecord(details)) return null;

  const usage = parseAiUsageStatus(details.usage);
  if (usage) return usage;

  if (isRecord(details.detail)) {
    const detailUsage = parseAiUsageStatus(details.detail.usage);
    if (detailUsage) return detailUsage;
    return parseAiUsageStatus(details.detail);
  }

  return null;
}

export type AiBackendResponseMeta = AiUsageWindow & {
  dailyLimit?: number;
  dateKey: string;
  version: string;
  persistence: AiPersistence;
};

export type AiAskBackendResponse = AiBackendResponseMeta & {
  reply: string;
};

export type AiAskE2EResponse = {
  reply: string;
  version: "e2e";
  persistence: AiPersistence;
};

export type AiAskResponse = AiAskBackendResponse | AiAskE2EResponse;

export type AiUsageResponse = AiUsageStatus;

export type AiMealIngredient = {
  name: string;
  amount: number;
  protein: number;
  fat: number;
  carbs: number;
  kcal: number;
  unit?: "ml";
};

export type AiTextMealPayload = {
  name?: string | null;
  ingredients?: string | null;
  amount_g?: number | null;
  notes?: string | null;
};

export type AiTextMealAnalyzeResponse = AiBackendResponseMeta & {
  ingredients: AiMealIngredient[];
};

export type AiPhotoAnalyzeResponse = AiBackendResponseMeta & {
  ingredients: AiMealIngredient[];
};
