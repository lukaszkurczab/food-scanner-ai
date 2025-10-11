import Constants from "expo-constants";
import type { Ingredient } from "@/types";
import { canUseAiTodayFor, consumeAiUseFor } from "@/services/userService";
import { v4 as uuidv4 } from "uuid";

const OPENAI_API_KEY = Constants.expoConfig?.extra?.openaiApiKey;
const TIMEOUT_MS = 30000;

const toNumber = (v: unknown): number => {
  if (typeof v === "number") return isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = Number(v.replace(/[^0-9.+-]/g, ""));
    return isFinite(n) ? n : 0;
  }
  return 0;
};

const normalize = (x: any): Ingredient | null => {
  if (!x || typeof x.name !== "string" || !x.name.trim()) return null;
  const amount = toNumber(x.amount);
  const protein = toNumber(x.protein);
  const fat = toNumber(x.fat);
  const carbs = toNumber(x.carbs);
  const kcal = toNumber(x.kcal) || protein * 4 + carbs * 4 + fat * 9;
  if (!isFinite(amount) || amount <= 0) return null;
  return {
    id: uuidv4(),
    name: x.name.trim(),
    amount,
    protein,
    fat,
    carbs,
    kcal,
  };
};

function extractJsonArray(raw: string): string | null {
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start !== -1 && end !== -1 && end > start)
    return raw.substring(start, end + 1);
  const match = raw.match(/\[[\s\S]*\]/);
  return match ? match[0] : null;
}

function unwrapIfWrapped(s: string): string {
  try {
    const obj = JSON.parse(s);
    if (obj && typeof obj === "object" && typeof obj.description === "string")
      return obj.description;
    return s;
  } catch {
    return s;
  }
}

export async function extractIngredientsFromText(
  _uid: string,
  description: string,
  opts?: { isPremium?: boolean; limit?: number; lang?: string }
): Promise<Ingredient[] | null> {
  const lang = (opts?.lang || "en").toString();
  const isPremium = !!opts?.isPremium;
  const limit = opts?.limit ?? 1;

  if (!isPremium && _uid) {
    const allowed = await canUseAiTodayFor(_uid, isPremium, "text", limit);
    if (!allowed) return null;
  }

  console.log("Extracting ingredients from text:", description);

  const userPayload = unwrapIfWrapped(description);

  const systemPrompt =
    `You are a nutrition assistant. Analyze a JSON payload describing a meal.\n` +
    `Decide granularity: treat a prepared dish as ONE item; list multiple items only when clearly separate.\n` +
    `Convert household measures to grams/ml when present (teaspoon≈5g, tablespoon≈15g, cup≈240ml, slice bread≈30g, handful nuts≈30g, medium fruit≈150g).\n` +
    `Return ONLY a JSON array. Each item: {"name":"string","amount":123,"protein":0,"fat":0,"carbs":0,"kcal":0}.\n` +
    `Amount in grams (ml only for liquids). Numbers only. No prose.\n` +
    `The "name" must be in the user's language from the payload. Keep keys in English.\n` +
    `Example 1 (PL): Input {"name":"owsianka","ingredients":"pół szklanki płatków, szklanka mleka 2%, garść jagód, łyżeczka miodu","amount_g":null,"notes":null,"lang":"pl"} -> ` +
    `[{"name":"płatki owsiane","amount":40,"protein":5,"fat":3,"carbs":27,"kcal":150},{"name":"mleko 2%","amount":240,"protein":8,"fat":5,"carbs":12,"kcal":120},{"name":"jagody","amount":50,"protein":0,"fat":0,"carbs":8,"kcal":30},{"name":"miód","amount":7,"protein":0,"fat":0,"carbs":6,"kcal":20}]\n` +
    `Example 2 (EN): Input {"name":"burger","ingredients":"cheeseburger with fries","amount_g":null,"notes":null,"lang":"en"} -> ` +
    `[{"name":"cheeseburger with fries","amount":350,"protein":20,"fat":22,"carbs":35,"kcal":450}]`;

  const payload = {
    model: "gpt-4o-mini",
    temperature: 0,
    top_p: 0,
    max_tokens: 500,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPayload },
    ],
  } as const;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!resp.ok) return null;
    const json = await resp.json();
    const raw: string = json?.choices?.[0]?.message?.content || "";
    const arr = extractJsonArray(raw);
    if (!arr) return null;

    let parsed: any;
    try {
      parsed = JSON.parse(arr);
    } catch {
      const cleaned = arr
        .replace(/,\s*]/g, "]")
        .replace(/,\s*}/g, "}")
        .replace(/\bNaN\b/gi, "0");
      parsed = JSON.parse(cleaned);
    }
    if (!Array.isArray(parsed)) return null;

    const normalized = parsed
      .map(normalize)
      .filter((x): x is Ingredient => !!x);
    if (!isPremium && _uid)
      await consumeAiUseFor(_uid, isPremium, "text", limit);
    return normalized;
  } catch {
    clearTimeout(timeout);
    return null;
  }
}
