import OpenAI from "openai";
import Constants from "expo-constants";
import type { Ingredient } from "@/types";
import { canUseAiToday, consumeAiUse } from "./userService";

const OPENAI_API_KEY = Constants.expoConfig?.extra?.openaiApiKey;
const client = new OpenAI({ apiKey: OPENAI_API_KEY });

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
  return { name: x.name.trim(), amount, protein, fat, carbs, kcal };
};

function extractJsonArray(raw: string): string | null {
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start !== -1 && end !== -1 && end > start)
    return raw.substring(start, end + 1);
  const match = raw.match(/\[[\s\S]*\]/);
  return match ? match[0] : null;
}

export async function extractIngredientsFromText(
  uid: string,
  description: string,
  opts?: { isPremium?: boolean; limit?: number; lang?: string }
): Promise<Ingredient[] | null> {
  const isPremium = !!opts?.isPremium;
  const limit = opts?.limit ?? 1;
  const lang = (opts?.lang || "en").toString();

  if (!isPremium) {
    const allowed = await canUseAiToday(uid, isPremium, limit);
    if (!allowed) throw new Error("ai/daily-limit-reached");
  }

  const prompt =
    `From the user's meal description, return ONLY a JSON array of ingredients with grams and macros.\n` +
    `Schema for each item: { "name": "string", "amount": 123, "protein": 0, "fat": 0, "carbs": 0, "kcal": 0 }.\n` +
    `Use grams for "amount". Estimate when missing. Numbers only. No text outside the JSON array.\n` +
    `Ingredient "name" values MUST be in the user's language: ${lang}. Keep JSON keys (name, amount, protein, fat, carbs, kcal) in English.\n` +
    `User description: """${description.trim()}"""`;

  const res = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    max_tokens: 500,
    messages: [
      { role: "system", content: "You extract structured nutrition data." },
      { role: "user", content: prompt },
    ],
  });

  const raw = res.choices[0]?.message?.content || "";
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

  const normalized = parsed.map(normalize).filter((x): x is Ingredient => !!x);

  if (!isPremium) await consumeAiUse(uid, isPremium, limit);

  return normalized;
}
