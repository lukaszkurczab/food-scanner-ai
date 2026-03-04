export type AiPersistence = "backend_owned";

export type AiUsageWindow = {
  usageCount: number;
  remaining: number;
};

export function getAiDailyLimit(usage: AiUsageWindow): number {
  return Math.max(usage.usageCount + usage.remaining, 0);
}

export type AiBackendResponseMeta = AiUsageWindow & {
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

export type AiUsageResponse = {
  dateKey: string;
  usageCount: number;
  dailyLimit: number;
  remaining: number;
};

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
