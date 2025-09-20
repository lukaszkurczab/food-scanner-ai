import { debugScope } from "@/utils/debug";
import { getLexicon } from "@/services/nutritionLexicon";
import type {
  RecognizeTextResult,
  RecognizedLine,
} from "@/services/mlkitTextService";
import type { Ingredient } from "@/types";

const log = debugScope("OCR:Parse");

type Basis = "100g" | "serving" | "unknown";
type Unit = "g" | "ml";
type ColumnBias = "left" | "right";

const LEX = getLexicon();

function stripDiacritics(s: string): string {
  const n = s.normalize("NFD").replace(/\p{Diacritic}/gu, "");
  return n
    .replace(/ł/gi, "l")
    .replace(/ß/g, "ss")
    .replace(/æ/gi, "ae")
    .replace(/œ/gi, "oe");
}
function norm(s: string): string {
  return stripDiacritics(String(s)).toLowerCase();
}
function includesAny(hay: string, arr: string[]): boolean {
  const n = norm(hay);
  return arr.some((k) => n.includes(norm(k)));
}

function fuzzyIncludes(hay: string, arr: string[], minLen = 4): boolean {
  const n = norm(hay).replace(/[^a-z0-9\s]/g, " ");
  const tokens = n.split(/\s+/).filter((t) => t.length >= minLen);
  if (!tokens.length) return false;
  for (const key of arr) {
    const k = norm(key).replace(/[^a-z0-9]/g, "");
    if (!k || k.length < minLen) continue;
    const pref = k.slice(0, Math.min(6, k.length));
    if (n.includes(pref)) return true;
    for (const t of tokens) {
      if (t.startsWith(pref) || pref.startsWith(t)) return true;
    }
  }
  return false;
}

function sanitizeNumberToken(s: string) {
  s = s.replace(/(?<=\d)[\u00A0\u2000-\u200B\u202F\u205F\u3000\s](?=\d)/g, "");
  s = s.replace(/,(?=\d)/g, ".");
  s = s.replace(
    /(?<=\d)[.\u00A0\u2000-\u200B\u202F\u205F\u3000](?=\d{3}\b)/g,
    ""
  );
  return s;
}

type NumUnit = "kcal" | "kj" | "g" | "mg" | "%" | null;

function numberTokensWithPos(text: string) {
  const out: { value: number; unit: NumUnit; index: number }[] = [];
  const ntext = norm(text);
  const regex = /(-?\d+(?:[.,]\d+)?)(\s*(kcal|kj|g|mg|%))?/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(ntext)) !== null) {
    const raw = sanitizeNumberToken(m[1] || "");
    const val = parseFloat(raw);
    if (!Number.isFinite(val)) continue;
    const unit = ((m[3] as any) || null) as NumUnit;
    out.push({ value: val, unit, index: m.index });
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

  const inferUnit = (text: string) =>
    /\b100\s*ml\b/.test(norm(text)) || /\bml\b/.test(norm(text))
      ? ("ml" as Unit)
      : "g";

  const headerCandidates = withIdx.filter(
    ({ n }) =>
      fuzzyIncludes(n, LEX.per100) ||
      fuzzyIncludes(n, LEX.serving) ||
      /\b(100\s*(g|ml))\b/.test(n) ||
      /\bper\s*100\b/.test(n)
  );
  if (headerCandidates.length > 0) {
    headerCandidates.sort((a, b) => a.i - b.i);
    const header = headerCandidates[0];
    const n = header.n;
    const pIdxCandidates = [
      ...LEX.per100.map((k) => n.indexOf(norm(k))),
      n.search(/\b(100\s*(g|ml)|per\s*100)\b/),
    ]
      .filter((x) => x >= 0)
      .sort((a, b) => a - b);
    const sIdxCandidates = [...LEX.serving.map((k) => n.indexOf(norm(k)))]
      .filter((x) => x >= 0)
      .sort((a, b) => a - b);
    const pIdx = pIdxCandidates[0] ?? -1;
    const sIdx = sIdxCandidates[0] ?? -1;
    if (pIdx >= 0) basis = "100g";
    if (sIdx >= 0 && basis === "unknown") basis = "serving";
    if (pIdx >= 0 && sIdx >= 0) {
      basis = "100g";
      bias = pIdx < sIdx ? "left" : "right";
    }
    unit = inferUnit(header.t);
  }
  log.log("basis:", basis, "bias:", bias, "unit:", unit);
  return { basis, bias, unit };
}

function saneGram(val: number): boolean {
  return Number.isFinite(val) && val >= 0 && val <= 100;
}
function saneKcal(val: number): boolean {
  return Number.isFinite(val) && val >= 0 && val <= 900;
}

type Row = {
  y: number;
  text: string;
  line: RecognizedLine;
  nums: { value: number; unit: NumUnit; index: number }[];
};

function groupRows(lines: RecognizedLine[]): Row[] {
  const sorted = [...lines].sort((a, b) => a.bbox.y - b.bbox.y);
  const rows: Row[] = [];
  const dy = (l: RecognizedLine) => l.bbox.height || 18;
  for (const l of sorted) {
    const midY = l.bbox.y + (l.bbox.height || 16) / 2;
    const nums = numberTokensWithPos(l.text);
    if (!rows.length) {
      rows.push({ y: midY, text: l.text, line: l, nums });
      continue;
    }
    const last = rows[rows.length - 1];
    if (Math.abs(midY - last.y) <= Math.max(20, dy(l) * 0.8)) {
      rows.push({ y: midY, text: l.text, line: l, nums });
    } else {
      rows.push({ y: midY, text: l.text, line: l, nums });
    }
  }
  return rows;
}

function pickFromRow(
  row: Row,
  want: "g" | "kcal",
  bias: ColumnBias
): number | null {
  const candidates = row.nums.filter((n) => {
    if (want === "g") return n.unit === "g";
    return n.unit === "kcal";
  });
  if (candidates.length === 1) {
    const v = candidates[0].value;
    return want === "g" ? (saneGram(v) ? v : null) : saneKcal(v) ? v : null;
  }
  if (candidates.length >= 2) {
    const pick =
      bias === "left" ? candidates[0] : candidates[candidates.length - 1];
    const v = pick.value;
    return want === "g" ? (saneGram(v) ? v : null) : saneKcal(v) ? v : null;
  }
  if (!candidates.length && row.nums.length) {
    const nums = row.nums
      .filter((n) => n.unit !== "kj" && n.unit !== "%" && n.unit !== "mg")
      .map((n) => n);
    if (!nums.length) return null;
    const pick = bias === "left" ? nums[0] : nums[nums.length - 1];
    const v = pick.value;
    return want === "g" ? (saneGram(v) ? v : null) : saneKcal(v) ? v : null;
  }
  return null;
}

const isFatSub = (t: string) =>
  includesAny(t, LEX.fat_sub) || fuzzyIncludes(t, LEX.fat_sub);
const isCarbSub = (t: string) =>
  includesAny(t, LEX.carbs_sub) || fuzzyIncludes(t, LEX.carbs_sub);
const isNoiseRow = (t: string) => fuzzyIncludes(t, LEX.noise);

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

  const { basis, bias, unit } = detectBasisAndBias(lines);
  const preferPer100 = basis === "100g";
  const rows = groupRows(lines);

  let protein: number | null = null;
  let fat: number | null = null;
  let carbs: number | null = null;
  let kcal: number | null = null;

  for (let i = 0; i < rows.length; i++) {
    const t = rows[i].text;
    const n = norm(t);
    if (isNoiseRow(n)) continue;

    if (
      protein == null &&
      (includesAny(n, LEX.protein) || fuzzyIncludes(n, LEX.protein))
    ) {
      const v = pickFromRow(rows[i], "g", bias);
      if (v != null) protein = v;
      continue;
    }
    if (
      fat == null &&
      (includesAny(n, LEX.fat_total) || fuzzyIncludes(n, LEX.fat_total))
    ) {
      if (isFatSub(n)) continue;
      const v = pickFromRow(rows[i], "g", bias);
      if (v != null) fat = v;
      continue;
    }
    if (
      carbs == null &&
      (includesAny(n, LEX.carbs_total) || fuzzyIncludes(n, LEX.carbs_total))
    ) {
      if (isCarbSub(n)) continue;
      const v = pickFromRow(rows[i], "g", bias);
      if (v != null) carbs = v;
      continue;
    }
    if (
      kcal == null &&
      (includesAny(n, LEX.energy) || fuzzyIncludes(n, LEX.energy))
    ) {
      const v = pickFromRow(rows[i], "kcal", bias);
      if (v != null) kcal = v;
      continue;
    }
  }

  if ((!protein || !fat || !carbs || !kcal) && preferPer100) {
    const full = rows.map((r) => r.text).join("\n");
    const pickInline = (keys: string[], want: "g" | "kcal"): number | null => {
      const src = norm(full);
      const union = keys
        .map((k) => norm(k).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join("|");
      const unitRe = want === "g" ? "(?:\\s*g)" : "\\s*kcal";
      const re = new RegExp(
        `(?:^|\\b)(${union})[^\\d]{0,24}(-?\\d+(?:[.,]\\d+)?)${unitRe}`,
        "i"
      );
      const m = re.exec(src);
      if (!m) return null;
      const val = parseFloat(sanitizeNumberToken(m[2] || ""));
      if (!Number.isFinite(val)) return null;
      if (want === "g" && !saneGram(val)) return null;
      if (want === "kcal" && !saneKcal(val)) return null;
      return val;
    };
    if (protein == null) protein = pickInline(LEX.protein, "g");
    if (fat == null) fat = pickInline(LEX.fat_total, "g");
    if (carbs == null) carbs = pickInline(LEX.carbs_total, "g");
    if (kcal == null) kcal = pickInline(LEX.energy, "kcal");
  }

  const p = Number(protein ?? 0) || 0;
  const f = Number(fat ?? 0) || 0;
  const c = Number(carbs ?? 0) || 0;
  let k = Number(kcal ?? 0) || 0;

  if (!k && (p || f || c)) k = Math.round(p * 4 + c * 4 + f * 9);

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
