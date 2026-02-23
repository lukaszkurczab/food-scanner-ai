import type { Ingredient } from "@/types";

type IngredientCandidate = {
  name?: unknown;
  amount?: unknown;
  protein?: unknown;
  fat?: unknown;
  carbs?: unknown;
  kcal?: unknown;
  unit?: unknown;
};

export type NumberParser = (value: unknown) => number;

export type NormalizeIngredientOptions = {
  toNumber?: NumberParser;
  transformName?: (name: string) => string;
  allowMlUnit?: boolean;
  idFactory: () => string;
};

const defaultToNumber: NumberParser = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.+-]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

export function extractJsonArray(
  raw: string,
  opts?: { allowRegexFallback?: boolean },
): string | null {
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start !== -1 && end !== -1 && end > start) {
    return raw.substring(start, end + 1);
  }
  if (opts?.allowRegexFallback === false) return null;
  const match = raw.match(/\[[\s\S]*\]/);
  return match ? match[0] : null;
}

export function parseLenientJsonArray(arrayString: string): unknown[] | null {
  try {
    const parsed = JSON.parse(arrayString);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    try {
      const cleaned = arrayString
        .replace(/,\s*]/g, "]")
        .replace(/,\s*}/g, "}")
        .replace(/\bNaN\b/gi, "0");
      const reparsed = JSON.parse(cleaned);
      return Array.isArray(reparsed) ? reparsed : null;
    } catch {
      return null;
    }
  }
}

export function normalizeIngredientCandidate(
  value: unknown,
  opts: NormalizeIngredientOptions,
): Ingredient | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as IngredientCandidate;
  if (typeof candidate.name !== "string" || !candidate.name.trim()) return null;

  const toNumber = opts.toNumber ?? defaultToNumber;
  const amount = toNumber(candidate.amount);
  const protein = toNumber(candidate.protein);
  const fat = toNumber(candidate.fat);
  const carbs = toNumber(candidate.carbs);
  const kcal = toNumber(candidate.kcal) || protein * 4 + carbs * 4 + fat * 9;
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const normalizedName = opts.transformName
    ? opts.transformName(candidate.name.trim())
    : candidate.name.trim();

  const unit =
    opts.allowMlUnit &&
    typeof candidate.unit === "string" &&
    candidate.unit.toLowerCase() === "ml"
      ? ("ml" as const)
      : undefined;

  return {
    id: opts.idFactory(),
    name: normalizedName,
    amount,
    unit,
    protein,
    fat,
    carbs,
    kcal,
  };
}

export function extractAndNormalizeIngredients(
  raw: string,
  opts: NormalizeIngredientOptions,
  parseOpts?: { allowRegexFallback?: boolean },
): Ingredient[] | null {
  const arrayString = extractJsonArray(raw, parseOpts);
  if (!arrayString) return null;
  const parsed = parseLenientJsonArray(arrayString);
  if (!parsed) return null;
  return parsed
    .map((item) => normalizeIngredientCandidate(item, opts))
    .filter((item): item is Ingredient => item !== null);
}

