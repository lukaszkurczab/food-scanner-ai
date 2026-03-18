import type { MealAiMeta, MealInputMethod } from "@/types/meal";

export const MEAL_INPUT_METHODS = [
  "manual",
  "photo",
  "barcode",
  "text",
  "saved",
  "quick_add",
] as const satisfies readonly MealInputMethod[];

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function normalizeMealInputMethod(
  value: unknown,
): MealInputMethod | null {
  return typeof value === "string" &&
    MEAL_INPUT_METHODS.includes(value as MealInputMethod)
    ? (value as MealInputMethod)
    : null;
}

export function normalizeMealAiMeta(value: unknown): MealAiMeta | null {
  if (!isRecord(value)) return null;

  const model = typeof value.model === "string" ? value.model : null;
  const runId = typeof value.runId === "string" ? value.runId : null;
  const confidence =
    typeof value.confidence === "number" && Number.isFinite(value.confidence)
      ? value.confidence
      : null;
  const warnings = Array.isArray(value.warnings)
    ? value.warnings.filter(
        (warning): warning is string => typeof warning === "string",
      )
    : null;

  if (
    model === null &&
    runId === null &&
    confidence === null &&
    warnings === null
  ) {
    return null;
  }

  return {
    model,
    runId,
    confidence,
    warnings,
  };
}

export function parseMealAiMeta(raw: string | null | undefined): MealAiMeta | null {
  if (!raw) return null;
  try {
    return normalizeMealAiMeta(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function serializeMealAiMeta(
  value: MealAiMeta | null | undefined,
): string | null {
  const normalized = normalizeMealAiMeta(value);
  return normalized ? JSON.stringify(normalized) : null;
}

export function getMealAiMetaFromAiResponse(value: unknown): MealAiMeta | null {
  return normalizeMealAiMeta(value);
}
