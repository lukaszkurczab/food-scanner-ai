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
export type AiCreditTransactionType =
  | "deduct"
  | "refund"
  | "cycle_reset"
  | "subscription_transition"
  | string;

export type AiCreditTransactionItem = {
  id: string;
  type: AiCreditTransactionType;
  action: string;
  cost: number;
  balanceBefore: number;
  balanceAfter: number;
  tier: "free" | "premium";
  periodStartAt: string;
  periodEndAt: string;
  createdAt: string;
};

export type AiCreditTransactionsResponse = {
  items: AiCreditTransactionItem[];
};

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

function parseAiCreditTransactionItem(value: unknown): AiCreditTransactionItem | null {
  if (!isRecord(value)) return null;
  const id = asString(value.id);
  const type = asString(value.type);
  const action = asString(value.action);
  const cost = asNumber(value.cost);
  const balanceBefore = asNumber(value.balanceBefore);
  const balanceAfter = asNumber(value.balanceAfter);
  const tierRaw = asString(value.tier);
  const periodStartAt = asString(value.periodStartAt);
  const periodEndAt = asString(value.periodEndAt);
  const createdAt = asString(value.createdAt);
  if (
    !id ||
    !type ||
    !action ||
    cost === undefined ||
    balanceBefore === undefined ||
    balanceAfter === undefined ||
    !tierRaw ||
    (tierRaw !== "free" && tierRaw !== "premium") ||
    !periodStartAt ||
    !periodEndAt ||
    !createdAt ||
    !isValidDateString(periodStartAt) ||
    !isValidDateString(periodEndAt) ||
    !isValidDateString(createdAt)
  ) {
    return null;
  }
  return {
    id,
    type,
    action,
    cost,
    balanceBefore,
    balanceAfter,
    tier: tierRaw,
    periodStartAt,
    periodEndAt,
    createdAt,
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

export function parseCreditTransactionsResponse(
  value: unknown,
): AiCreditTransactionsResponse | null {
  if (!isRecord(value) || !Array.isArray(value.items)) return null;
  const items = value.items
    .map((item) => parseAiCreditTransactionItem(item))
    .filter((item): item is AiCreditTransactionItem => item !== null);
  return { items };
}

export type AiBackendCreditsMeta = AiCreditsStatus & {
  version: string;
  persistence: AiPersistence;
  model?: string | null;
  runId?: string | null;
  confidence?: number | null;
  warnings?: string[] | null;
};

export type AiScopeDecision =
  | "ALLOW_APP"
  | "ALLOW_USER_DATA"
  | "ALLOW_NUTRITION"
  | "DENY_OTHER";

export type AiChatRunLanguage = "pl" | "en";

export type AiChatRunRequest = {
  threadId: string;
  clientMessageId: string;
  message: string;
  language: AiChatRunLanguage;
};

export type AiChatRunUsage = {
  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
};

export type AiChatRunContextStats = {
  usedSummary: boolean;
  historyTurns: number;
  truncated: boolean;
  scopeDecision: AiScopeDecision;
};

export type AiChatRunResponse = AiBackendCreditsMeta & {
  runId: string;
  reply: string;
  assistantMessageId: string;
  usage: AiChatRunUsage;
  contextStats: AiChatRunContextStats;
  scopeDecision: AiScopeDecision;
};

export type AiChatRunE2EResponse = {
  reply: string;
  version: "e2e";
  persistence: AiPersistence;
};

export type AiChatRunAnyResponse = AiChatRunResponse | AiChatRunE2EResponse;

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
