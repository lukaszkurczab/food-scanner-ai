import Constants from "expo-constants";
import OpenAI from "openai";
import type { Ingredient } from "@/types";

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

function extractJsonArray(raw: string): string | null {
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start !== -1 && end !== -1 && end > start) return raw.substring(start, end + 1);
  const match = raw.match(/\[[\s\S]*\]/);
  return match ? match[0] : null;
}

export async function extractNutritionFromTable(
  _uid: string,
  imageUri: string
): Promise<Ingredient[] | null> {
  // Use Vision to parse nutrition facts into a single ingredient (per 100 g)
  const prompt =
    `Read the nutrition facts label from the image and return ONLY a JSON array of one item.
Schema: [{"name":"string","amount":100,"protein":0,"fat":0,"carbs":0,"kcal":0}].
Use 100 as amount (grams). Parse protein/fat/carbs/kcal per 100 g. No text outside the JSON array.`;

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: "You extract structured nutrition data from labels." },
    {
      role: "user",
      content: [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: imageUri } as any },
      ],
    } as any,
  ];

  const res = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    max_tokens: 400,
    messages,
  });
  const raw = res.choices[0]?.message?.content || "";
  const arr = extractJsonArray(raw);
  if (!arr) return null;
  let parsed: any;
  try {
    parsed = JSON.parse(arr);
  } catch {
    const cleaned = arr.replace(/,\s*]/g, "]").replace(/,\s*}/g, "}");
    parsed = JSON.parse(cleaned);
  }
  const one = Array.isArray(parsed) ? parsed[0] : null;
  if (!one) return null;
  const ing: Ingredient = {
    id: `${Date.now()}`,
    name: typeof one.name === "string" && one.name.trim() ? one.name.trim() : "Nutrition",
    amount: 100,
    protein: toNumber(one.protein),
    fat: toNumber(one.fat),
    carbs: toNumber(one.carbs),
    kcal: toNumber(one.kcal),
  };
  return [ing];
}

