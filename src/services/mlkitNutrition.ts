import type { RecognizeTextResult, RecognizedLine } from "@/services/mlkitTextService";
import type { Ingredient } from "@/types";

type Basis = "100g" | "serving" | "unknown";
type Unit = "g" | "ml";
type ColumnBias = "left" | "right";

const SYN = {
  // Keys normalized to ASCII lowercase
  protein: [
    "protein",
    "proteina",
    "proteine",
    "proteines",
    "proteinas",
    "bialko",
    "białko", // left for completeness before normalization
  ],
  fat: [
    "fat",
    "grassi",
    "gras",
    "lipides",
    "tluszcz",
    "tłuszcz",
    "matiere grasse",
    "matieres grasses",
  ],
  carbs: [
    "carb",
    "carbs",
    "carbo",
    "carbohydrates",
    "carboidrati",
    "glucid",
    "glucides",
    "weglow",
    "weglowodany",
    "węglow",
    "węglowodany",
  ],
  kcal: [
    "kcal",
    "calorie",
    "calories",
    "energy",
    "energia",
    "energie",
    "energi",
  ],
  per100: [
    "per 100",
    "per100",
    "100 g",
    "100g",
    "100 ml",
    "100ml",
    "na 100",
    "pour 100",
    "per 100 g",
    "per 100 ml",
  ],
  serving: [
    "serving",
    "porcja",
    "porcje",
    "porzione",
    "portion",
    "par portion",
    "per portion",
  ],
};

function stripDiacritics(s: string): string {
  const n = s.normalize("NFD").replace(/\p{Diacritic}/gu, "");
  return n
    .replace(/ł/gi, "l")
    .replace(/ß/g, "ss")
    .replace(/æ/gi, "ae")
    .replace(/œ/gi, "oe");
}

function norm(s: string): string {
  return stripDiacritics(s).toLowerCase();
}

function includesAny(hay: string, arr: string[]): boolean {
  const n = norm(hay);
  return arr.some((k) => n.includes(norm(k)));
}

// Fuzzy match tolerant to OCR errors: diacritics removed, truncated tokens, prefixes
function fuzzyIncludes(hay: string, arr: string[], minPrefix = 4): boolean {
  const n = norm(hay).replace(/[^a-z0-9\s]/g, " ");
  if (includesAny(n, arr)) return true;
  const tokens = n.split(/\s+/).filter(Boolean);
  for (const key of arr) {
    const k = norm(key).replace(/[^a-z0-9]/g, "");
    const pref = k.slice(0, Math.max(minPrefix, Math.min(5, k.length)));
    if (!pref) continue;
    if (n.includes(pref)) return true;
    for (const t of tokens) {
      if (t.length >= pref.length && (t.startsWith(pref) || pref.startsWith(t))) return true;
    }
  }
  return false;
}

function numberTokens(text: string): { value: number; unit: "kcal" | "kj" | "g" | null }[] {
  const out: { value: number; unit: "kcal" | "kj" | "g" | null }[] = [];
  const ntext = norm(text);
  const regex = /(-?\d+[\s.,]?\d*)\s*(kcal|kj|g)?/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(ntext)) !== null) {
    const raw = m[1]?.replace(/\s+/g, "").replace(",", ".");
    const val = parseFloat(raw);
    if (!Number.isFinite(val)) continue;
    const unit = (m[2] as any) || null;
    out.push({ value: val, unit });
  }
  return out;
}

function detectBasisAndBias(lines: RecognizedLine[]): { basis: Basis; bias: ColumnBias; unit: Unit } {
  let basis: Basis = "unknown";
  let bias: ColumnBias = "left";
  let unit: Unit = "g";
  const withIdx = lines.map((l, i) => ({ i, t: l.text, n: norm(l.text) }));
  const headerCandidates = withIdx.filter(
    ({ n }) => fuzzyIncludes(n, SYN.per100) || fuzzyIncludes(n, SYN.serving)
  );

  const inferUnit = (text: string) => {
    const n = norm(text);
    if (/\b100\s*ml\b/.test(n) || /\b100ml\b/.test(n) || /\bml\b/.test(n)) return "ml" as Unit;
    return "g" as Unit;
  };

  if (headerCandidates.length > 0) {
    // Prefer a line that mentions both per100 and serving
    headerCandidates.sort((a, b) => a.i - b.i);
    const both = headerCandidates.find(
      ({ n }) => fuzzyIncludes(n, SYN.per100) && fuzzyIncludes(n, SYN.serving)
    );
    const header = both ?? headerCandidates[0];
    const n = header.n;
    const pIdx = SYN.per100
      .map((k) => n.indexOf(norm(k)))
      .filter((x) => x >= 0)
      .sort((a, b) => a - b)[0] ?? -1;
    const sIdx = SYN.serving
      .map((k) => n.indexOf(norm(k)))
      .filter((x) => x >= 0)
      .sort((a, b) => a - b)[0] ?? -1;
    if (pIdx >= 0) basis = "100g";
    if (sIdx >= 0 && basis === "unknown") basis = "serving";
    if (pIdx >= 0 && sIdx >= 0) basis = "100g"; // prefer per 100 g
    // Column bias from order
    if (pIdx >= 0 && sIdx >= 0) bias = pIdx < sIdx ? "left" : "right";
    unit = inferUnit(header.t);
  } else {
    // Fallback textual only
    const has100 = withIdx.some(({ n }) => includesAny(n, SYN.per100));
    const hasServing = withIdx.some(({ n }) => includesAny(n, SYN.serving));
    if (has100 && !hasServing) basis = "100g";
    else if (!has100 && hasServing) basis = "serving";
    else if (has100 && hasServing) basis = "100g";
    // Try to infer unit from any line mentioning 100
    const anyPer = withIdx.find(({ n }) => includesAny(n, SYN.per100));
    if (anyPer) unit = inferUnit(anyPer.t);
  }
  return { basis, bias, unit };
}

function pickMacroFromLine(line: string, preferPer100: boolean, bias: ColumnBias): number | null {
  const nums = numberTokens(line);
  if (nums.length === 0) return null;
  // Prefer grams
  const grams = nums.filter((n) => n.unit === "g");
  if (grams.length > 0) {
    // If two values on the line and we prefer per 100g, pick by column bias
    if (preferPer100 && grams.length >= 2) {
      return bias === "left" ? grams[0].value : grams[grams.length - 1].value;
    }
    return preferPer100 ? grams[0].value : grams[grams.length - 1].value;
  }
  // Fallback: any numeric
  if (preferPer100 && nums.length >= 2) {
    return bias === "left" ? nums[0].value : nums[nums.length - 1].value;
  }
  return preferPer100 ? nums[0].value : nums[nums.length - 1].value;
}

function pickKcalFromLine(line: string, bias: ColumnBias): number | null {
  const nums = numberTokens(line).filter((n) => n.unit === "kcal");
  if (nums.length > 0) {
    if (nums.length >= 2) return bias === "left" ? nums[0].value : nums[nums.length - 1].value;
    return nums[0].value;
  }
  // Some labels list kJ first, kcal after — try second numeric
  const any = numberTokens(line);
  if (any.length >= 2) {
    // Heuristic: choose the larger of two typical energy units in kcal context range 0..1000
    const v = any.find((x) => x.value > 1 && x.value < 1500)?.value;
    return v ?? null;
  }
  return null;
}

export type ParsedNutrition = {
  basis: Basis;
  unit: Unit;
  protein: number;
  fat: number;
  carbs: number;
  kcal: number;
};

export function parseNutritionFromLines(lines: RecognizedLine[]): ParsedNutrition | null {
  if (!lines || lines.length === 0) return null;
  // Sort lines by vertical position to approximate reading order
  const sorted = [...lines].sort((a, b) => a.bbox.y - b.bbox.y);
  const { basis, bias, unit } = detectBasisAndBias(sorted);
  const preferPer100 = basis === "100g";

  let protein: number | null = null;
  let fat: number | null = null;
  let carbs: number | null = null;
  let kcal: number | null = null;

  for (const ln of sorted) {
    const t = ln.text;
    const n = norm(t);
    if (protein == null && (includesAny(n, SYN.protein) || fuzzyIncludes(n, SYN.protein))) {
      protein = pickMacroFromLine(t, preferPer100, bias);
      continue;
    }
    if (fat == null && (includesAny(n, SYN.fat) || fuzzyIncludes(n, SYN.fat))) {
      fat = pickMacroFromLine(t, preferPer100, bias);
      continue;
    }
    if (carbs == null && (includesAny(n, SYN.carbs) || fuzzyIncludes(n, SYN.carbs))) {
      carbs = pickMacroFromLine(t, preferPer100, bias);
      continue;
    }
    if (kcal == null && (includesAny(n, SYN.kcal) || fuzzyIncludes(n, SYN.kcal))) {
      const k = pickKcalFromLine(t, bias);
      if (k != null) kcal = k;
      continue;
    }
  }

  // Fallbacks
  const p = Number(protein ?? 0) || 0;
  const f = Number(fat ?? 0) || 0;
  const c = Number(carbs ?? 0) || 0;
  let k = Number(kcal ?? 0) || 0;
  if (!k && (p || f || c)) {
    k = Math.round(p * 4 + c * 4 + f * 9);
  }

  if (p === 0 && f === 0 && c === 0 && k === 0) return null;

  return { basis, unit, protein: p, fat: f, carbs: c, kcal: k };
}

export function toIngredient(parsed: ParsedNutrition): Ingredient {
  return {
    id: `${Date.now()}`,
    name: "Nutrition",
    amount: 100,
    unit: parsed.unit,
    protein: parsed.protein,
    fat: parsed.fat,
    carbs: parsed.carbs,
    kcal: parsed.kcal,
  };
}

export function parseNutritionFromResult(res: RecognizeTextResult): ParsedNutrition | null {
  return parseNutritionFromLines(res.lines);
}
