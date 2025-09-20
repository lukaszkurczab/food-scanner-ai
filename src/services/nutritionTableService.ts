import Constants from "expo-constants";
import type { Ingredient } from "@/types";
import { uriToBase64 } from "@/utils/uriToBase64";
import { convertToJpeg } from "@/utils/ensureJpeg";
import { debugScope } from "@/utils/debug";
import { withTiming } from "@/utils/perf";

type RemoteItem = {
  name: string;
  amount: 100;
  unit: "g" | "ml";
  protein: number;
  fat: number;
  carbs: number;
  kcal: number;
};

const log = debugScope("OCR:Remote");
const OPENAI_API_KEY = Constants.expoConfig?.extra?.openaiApiKey;
const TIMEOUT_MS = 30000;

function saneParsed(x: RemoteItem): boolean {
  const inRange = (v: number, min: number, max: number) =>
    Number.isFinite(v) && v >= min && v <= max;
  const macrosOk =
    inRange(x.protein, 0, 100) &&
    inRange(x.fat, 0, 100) &&
    inRange(x.carbs, 0, 100);
  const kcalOk = inRange(x.kcal, 0, 900);
  return macrosOk && kcalOk;
}

const toNumber = (v: unknown): number => {
  if (typeof v === "number") return isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = Number(v.replace(/,/g, ".").replace(/[^0-9.+-]/g, ""));
    return isFinite(n) ? n : 0;
  }
  return 0;
};

function extractJsonArray(raw: string): string | null {
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start !== -1 && end !== -1 && end > start)
    return raw.substring(start, end + 1);
  const match = raw.match(/\[[\s\S]*\]/);
  return match ? match[0] : null;
}

export async function extractNutritionFromTable(
  _uid: string,
  imageUri: string
): Promise<Ingredient[] | null> {
  log.log("start", { imageUri });
  const jpegUri = await withTiming("ensureJpeg", () =>
    convertToJpeg(imageUri, {
      userUid: _uid || "anon",
      fileId: `nutrition-${Date.now()}.jpg`,
      dir: "tmp",
    })
  );
  const imageBase64 = await withTiming("readBase64", () =>
    uriToBase64(jpegUri)
  );

  const prompt =
    `Read the nutrition facts from the image. Return ONLY a JSON array with ONE object:\n` +
    `[{"name":"string","amount":100,"unit":"g|ml","protein":0,"fat":0,"carbs":0,"kcal":0}]\n` +
    `Detect whether the label uses grams or milliliters and set "unit" accordingly.\n` +
    `Values must be per 100 {unit}. Use numbers only. Do not invent data. No text outside the JSON.`;

  const payload = {
    model: "gpt-4o-mini",
    temperature: 0,
    max_tokens: 200,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          {
            type: "image_url",
            image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
          },
        ],
      },
    ],
  } as const;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const resp = await withTiming("openai:fetch", () =>
      fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })
    );
    if (!resp.ok) {
      log.warn("openai http", resp.status);
      return null;
    }
    const json = await resp.json();
    const raw: string = json?.choices?.[0]?.message?.content || "";
    const arr = extractJsonArray(raw);
    if (!arr) return null;

    let parsed: any;
    try {
      parsed = JSON.parse(arr);
    } catch {
      const cleaned = arr.replace(/,\s*]/g, "]").replace(/,\s*}/g, "}");
      parsed = JSON.parse(cleaned);
    }
    const one: RemoteItem | null = Array.isArray(parsed) ? parsed[0] : null;
    if (!one || !saneParsed(one)) {
      log.warn("remote:invalid", one);
      return null;
    }

    const ing: Ingredient = {
      id: `${Date.now()}`,
      name:
        typeof one.name === "string" && one.name.trim()
          ? one.name.trim()
          : "Nutrition",
      amount: 100,
      unit: one.unit === "ml" ? "ml" : "g",
      protein: toNumber(one.protein),
      fat: toNumber(one.fat),
      carbs: toNumber(one.carbs),
      kcal: toNumber(one.kcal),
    };
    log.log("parsed", ing);
    return [ing];
  } finally {
    clearTimeout(timeout);
  }
}
