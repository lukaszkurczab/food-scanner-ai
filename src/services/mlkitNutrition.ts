// src/services/mlkitNutrition.ts
import { debugScope } from "@/utils/debug";
import type {
  RecognizeTextResult,
  RecognizedLine,
} from "@/services/mlkitTextService";
import type { Ingredient } from "@/types";

const log = debugScope("OCR:Parse");

type Basis = "100g" | "serving" | "unknown";
type Unit = "g" | "ml";
type ColumnBias = "left" | "right";

const SYN = {
  protein: [
    "protein",
    "proteina",
    "proteine",
    "proteines",
    "proteinas",
    "bialko",
    "białko",
    "eiweiss",
    "eiweiß",
    "proteínas",
  ],
  fat: [
    "fat",
    "total fat",
    "grassi",
    "gras",
    "lipides",
    "tluszcz",
    "tłuszcz",
    "matiere grasse",
    "matieres grasses",
    "fett",
    "grasa",
    "grasas",
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
    "kohlenhydrate",
    "hidratos",
    "sugars",
    "cukry",
  ],
  kcal: [
    "kcal",
    "calorie",
    "calories",
    "energy",
    "energia",
    "energie",
    "energi",
    "cal",
    "calorias",
    "calorías",
    "kJ",
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
      if (t.length >= pref.length && (t.startsWith(pref) || pref.startsWith(t)))
        return true;
    }
  }
  return false;
}

function numberTokens(
  text: string
): { value: number; unit: "kcal" | "kj" | "g" | null }[] {
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

function detectBasisAndBias(lines: RecognizedLine[]): {
  basis: Basis;
  bias: ColumnBias;
  unit: Unit;
} {
  let basis: Basis = "unknown";
  let bias: ColumnBias = "left";
  let unit: Unit = "g";
  const withIdx = lines.map((l, i) => ({ i, t: l.text, n: norm(l.text) }));
  const headerCandidates = withIdx.filter(
    ({ n }) => fuzzyIncludes(n, SYN.per100) || fuzzyIncludes(n, SYN.serving)
  );
  const inferUnit = (text: string) =>
    /\b100\s*ml\b/.test(norm(text)) ||
    /\b100ml\b/.test(norm(text)) ||
    /\bml\b/.test(norm(text))
      ? ("ml" as Unit)
      : ("g" as Unit);

  if (headerCandidates.length > 0) {
    headerCandidates.sort((a, b) => a.i - b.i);
    const both = headerCandidates.find(
      ({ n }) => fuzzyIncludes(n, SYN.per100) && fuzzyIncludes(n, SYN.serving)
    );
    const header = both ?? headerCandidates[0];
    const n = header.n;
    const pIdx =
      SYN.per100
        .map((k) => n.indexOf(norm(k)))
        .filter((x) => x >= 0)
        .sort((a, b) => a - b)[0] ?? -1;
    const sIdx =
      SYN.serving
        .map((k) => n.indexOf(norm(k)))
        .filter((x) => x >= 0)
        .sort((a, b) => a - b)[0] ?? -1;
    if (pIdx >= 0) basis = "100g";
    if (sIdx >= 0 && basis === "unknown") basis = "serving";
    if (pIdx >= 0 && sIdx >= 0) basis = "100g";
    if (pIdx >= 0 && sIdx >= 0) bias = pIdx < sIdx ? "left" : "right";
    unit = inferUnit(header.t);
  } else {
    const has100 = withIdx.some(({ n }) => includesAny(n, SYN.per100));
    const hasServing = withIdx.some(({ n }) => includesAny(n, SYN.serving));
    if (has100 && !hasServing) basis = "100g";
    else if (!has100 && hasServing) basis = "serving";
    else if (has100 && hasServing) basis = "100g";
    const anyPer = withIdx.find(({ n }) => includesAny(n, SYN.per100));
    if (anyPer) unit = inferUnit(anyPer.t);
  }
  log.log("basis:", basis, "bias:", bias, "unit:", unit);
  return { basis, bias, unit };
}

function saneGram(val: number): boolean {
  return Number.isFinite(val) && val >= 0 && val <= 100;
}

function pickMacroFromText(
  text: string,
  preferPer100: boolean,
  bias: ColumnBias
): number | null {
  const nums = numberTokens(text);
  if (nums.length === 0) return null;
  const grams = nums.filter((n) => n.unit === "g").map((n) => n.value);
  if (grams.length > 0) {
    const candidate =
      preferPer100 && grams.length >= 2
        ? bias === "left"
          ? grams[0]
          : grams[grams.length - 1]
        : grams[0];
    return saneGram(candidate) ? candidate : null;
  }
  if (preferPer100 && nums.length >= 2) {
    const v = bias === "left" ? nums[0].value : nums[nums.length - 1].value;
    return saneGram(v) ? v : null;
  }
  const v = nums[0].value;
  return saneGram(v) ? v : null;
}

function pickKcalFromText(text: string, bias: ColumnBias): number | null {
  const kcals = numberTokens(text)
    .filter((n) => n.unit === "kcal")
    .map((n) => n.value);
  if (kcals.length > 0)
    return kcals.length >= 2
      ? kcals[bias === "left" ? 0 : kcals.length - 1]
      : kcals[0];
  const any = numberTokens(text).map((n) => n.value);
  if (any.length >= 2) {
    const plausible = any.find((x) => x > 1 && x < 1500);
    return plausible ?? null;
  }
  return null;
}

function findValuesNear(
  lines: RecognizedLine[],
  startIdx: number,
  maxLookahead = 3
): string | null {
  const base = lines[startIdx];
  const baseY = base.bbox.y;
  const baseH = base.bbox.height || 16;
  const maxDy = Math.max(24, baseH * 1.8);
  for (let j = 0; j < maxLookahead; j++) {
    const k = startIdx + j;
    if (k >= lines.length) break;
    const ln = lines[k];
    const dy = Math.abs(ln.bbox.y - baseY);
    if (dy > maxDy && j > 0) break;
    const hasNums = numberTokens(ln.text).length > 0;
    if (hasNums) return ln.text;
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

export function parseNutritionFromLines(
  lines: RecognizedLine[]
): ParsedNutrition | null {
  if (!lines || lines.length === 0) return null;
  const sorted = [...lines].sort((a, b) => a.bbox.y - b.bbox.y);
  const { basis, bias, unit } = detectBasisAndBias(sorted);
  const preferPer100 = basis === "100g";

  let protein: number | null = null;
  let fat: number | null = null;
  let carbs: number | null = null;
  let kcal: number | null = null;

  for (let i = 0; i < sorted.length; i++) {
    const t = sorted[i].text;
    const n = norm(t);

    if (
      protein == null &&
      (includesAny(n, SYN.protein) || fuzzyIncludes(n, SYN.protein))
    ) {
      const src =
        pickMacroFromText(t, preferPer100, bias) ??
        pickMacroFromText(findValuesNear(sorted, i) ?? "", preferPer100, bias);
      if (src != null) protein = src;
      continue;
    }
    if (fat == null && (includesAny(n, SYN.fat) || fuzzyIncludes(n, SYN.fat))) {
      const src =
        pickMacroFromText(t, preferPer100, bias) ??
        pickMacroFromText(findValuesNear(sorted, i) ?? "", preferPer100, bias);
      if (src != null) fat = src;
      continue;
    }
    if (
      carbs == null &&
      (includesAny(n, SYN.carbs) || fuzzyIncludes(n, SYN.carbs))
    ) {
      const src =
        pickMacroFromText(t, preferPer100, bias) ??
        pickMacroFromText(findValuesNear(sorted, i) ?? "", preferPer100, bias);
      if (src != null) carbs = src;
      continue;
    }
    if (
      kcal == null &&
      (includesAny(n, SYN.kcal) || fuzzyIncludes(n, SYN.kcal))
    ) {
      const srcText = t || findValuesNear(sorted, i) || "";
      const k = pickKcalFromText(srcText, bias);
      if (k != null) kcal = k;
      continue;
    }
  }

  const p = Number(protein ?? 0) || 0;
  const f = Number(fat ?? 0) || 0;
  const c = Number(carbs ?? 0) || 0;
  let k = Number(kcal ?? 0) || 0;

  if (!k && (p || f || c)) k = Math.round(p * 4 + c * 4 + f * 9);

  log.log("parsed:", { basis, unit, p, f, c, k });

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

export function parseNutritionFromResult(
  res: RecognizeTextResult
): ParsedNutrition | null {
  return parseNutritionFromLines(res.lines);
}
