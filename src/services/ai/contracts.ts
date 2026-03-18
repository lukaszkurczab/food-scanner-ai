import { asNumber, asString, isRecord } from "@/services/contracts/guards";

export type AiPersistence = "backend_owned";

export type AiCreditCosts = {
  chat: number;
  textMeal: number;
  photo: number;
};

export type AiCreditsStatus = {
  userId: string;
  tier: "free" | "premium";
  balance: number;
  allocation: number;
  periodStartAt: string;
  periodEndAt: string;
  costs: AiCreditCosts;
  renewalAnchorSource?: string | null;
  revenueCatEntitlementId?: string | null;
  revenueCatExpirationAt?: string | null;
  lastRevenueCatEventId?: string | null;
};

export type AiCreditsResponse = AiCreditsStatus;
export type AiCreditsAction = "chat" | "textMeal" | "photo";

function isValidDateString(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}

function parseAiCreditCosts(value: unknown): AiCreditCosts | null {
  if (!isRecord(value)) return null;

  const chat = asNumber(value.chat);
  const textMeal = asNumber(value.textMeal);
  const photo = asNumber(value.photo);
  if (chat === undefined || textMeal === undefined || photo === undefined) {
    return null;
  }

  return { chat, textMeal, photo };
}

function parseAiCreditsStatus(value: unknown): AiCreditsStatus | null {
  if (!isRecord(value)) return null;

  const userId = asString(value.userId);
  const tierRaw = asString(value.tier);
  const balance = asNumber(value.balance);
  const allocation = asNumber(value.allocation);
  const periodStartAt = asString(value.periodStartAt);
  const periodEndAt = asString(value.periodEndAt);
  const costs = parseAiCreditCosts(value.costs);
  if (
    !userId ||
    !tierRaw ||
    (tierRaw !== "free" && tierRaw !== "premium") ||
    balance === undefined ||
    allocation === undefined ||
    !periodStartAt ||
    !periodEndAt ||
    !isValidDateString(periodStartAt) ||
    !isValidDateString(periodEndAt) ||
    !costs
  ) {
    return null;
  }

  return {
    userId,
    tier: tierRaw,
    balance,
    allocation,
    periodStartAt,
    periodEndAt,
    costs,
    renewalAnchorSource: asString(value.renewalAnchorSource) ?? null,
    revenueCatEntitlementId: asString(value.revenueCatEntitlementId) ?? null,
    revenueCatExpirationAt: asString(value.revenueCatExpirationAt) ?? null,
    lastRevenueCatEventId: asString(value.lastRevenueCatEventId) ?? null,
  };
}

export function hasCreditsFields(value: unknown): value is AiCreditsStatus {
  return parseAiCreditsStatus(value) !== null;
}

export function parseCreditsFromResponse(value: unknown): AiCreditsStatus | null {
  const direct = parseAiCreditsStatus(value);
  if (direct) return direct;

  if (!isRecord(value)) return null;

  const nestedCredits = parseAiCreditsStatus(value.credits);
  if (nestedCredits) return nestedCredits;

  if (isRecord(value.detail)) {
    const nestedDetailCredits = parseAiCreditsStatus(value.detail.credits);
    if (nestedDetailCredits) return nestedDetailCredits;
    const nestedDetail = parseAiCreditsStatus(value.detail);
    if (nestedDetail) return nestedDetail;
  }

  return null;
}

export type AiBackendCreditsMeta = AiCreditsStatus & {
  version: string;
  persistence: AiPersistence;
  model?: string | null;
  runId?: string | null;
  confidence?: number | null;
  warnings?: string[] | null;
};

export type AiAskBackendResponse = AiBackendCreditsMeta & {
  reply: string;
};

export type AiAskE2EResponse = {
  reply: string;
  version: "e2e";
  persistence: AiPersistence;
};

export type AiAskResponse = AiAskBackendResponse | AiAskE2EResponse;

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

export type AiTextMealAnalyzeResponse = AiBackendCreditsMeta & {
  ingredients: AiMealIngredient[];
};

export type AiPhotoAnalyzeResponse = AiBackendCreditsMeta & {
  ingredients: AiMealIngredient[];
};
