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

  const prompt =
    `You are an assistant that extracts structured nutrition data from meal descriptions.\n` +
    `You must decide if the user's text describes a single ready-made dish or multiple separate items.\n` +
    `If it is a single known dish (e.g., pizza, pierogi, burger, kebab, lasagne, soup, salad, curry, etc.), return it as ONE ingredient with estimated macros and grams — do NOT split it into parts (no dough, sauce, etc.).\n` +
    `If it lists multiple distinct items (like "apple and sandwich" or "eggs, tomato"), return multiple entries.\n` +
    `Prefer simplification and readability over detailed precision.\n` +
    `Output ONLY a JSON array of ingredients following this schema:\n` +
    `[{ "name": "string", "amount": 123, "protein": 0, "fat": 0, "carbs": 0, "kcal": 0 }]\n` +
    `Use grams for "amount". Numbers only. No text outside the JSON array.\n` +
    `Ingredient "name" values MUST be in the user's language (${lang}). Keep JSON keys (name, amount, protein, fat, carbs, kcal) in English.\n`;

  const payload = {
    model: "gpt-4.1-mini",
    temperature: 0,
    max_tokens: 500,
    messages: [
      {
        role: "system",
        content: `You extract simplified nutrition data and decide dish granularity. User description: """${description.trim()}"""`,
      },
      { role: "user", content: prompt },
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
    if (!isPremium && _uid) {
      await consumeAiUseFor(_uid, isPremium, "text", limit);
    }
    return normalized;
  } catch {
    clearTimeout(timeout);
    return null;
  }
}
