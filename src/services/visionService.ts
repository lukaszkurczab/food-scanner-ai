// src/services/visionService.ts
import { uriToBase64 } from "@/utils/uriToBase64";
import { convertToJpegAndResize } from "@/utils/convertToJpegAndResize";
import Constants from "expo-constants";
import type { Ingredient } from "@/types";

const IS_DEV = typeof __DEV__ !== "undefined" && __DEV__;
const OPENAI_API_KEY = Constants.expoConfig?.extra?.openaiApiKey;
const VISION_MODEL = "gpt-4o";
const MAX_TOKENS = 600;
const TIMEOUT_MS = 30000;
const RETRY_BACKOFF = 3000;

function extractJsonArray(raw: string): string | null {
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start !== -1 && end !== -1 && end > start)
    return raw.substring(start, end + 1);
  return null;
}

function fallbackJsonArray(raw: string): string | null {
  const match = raw.match(/\[.*?\]/s);
  return match ? match[0] : null;
}

function validateIngredients(arr: any[]): Ingredient[] {
  return arr.filter(
    (x) =>
      typeof x.name === "string" &&
      typeof x.amount === "number" &&
      !isNaN(x.amount) &&
      typeof x.kcal === "number" &&
      !isNaN(x.kcal) &&
      typeof x.protein === "number" &&
      !isNaN(x.protein) &&
      typeof x.fat === "number" &&
      !isNaN(x.fat) &&
      typeof x.carbs === "number" &&
      !isNaN(x.carbs)
  );
}

export async function detectIngredientsWithVision(
  userUid: string,
  imageUri: string
): Promise<Ingredient[] | null> {
  if (IS_DEV) {
    return [
      {
        name: "MockIngredient",
        amount: 100,
        kcal: 200,
        protein: 10,
        fat: 5,
        carbs: 25,
      },
    ];
  }

  let lastError: any = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const jpegUri = await convertToJpegAndResize(imageUri, 512, 512, {
        userUid,
        fileId: `vision-${Date.now()}`,
        dir: "tmp",
      });
      const imageBase64 = await uriToBase64(jpegUri);

      const payload = {
        model: VISION_MODEL,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze the image and extract either:
- a nutrition facts table, or
- visible food/drink ingredients.
Return a raw JSON array ONLY like:
[{ "name":"string","amount":100,"protein":8,"fat":5,"carbs":20,"kcal":180,"type":"food","fromTable":true }]`,
              },
              {
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
              },
            ],
          },
        ],
        max_tokens: MAX_TOKENS,
      };

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        }
      );
      clearTimeout(timeout);

      if (response.status === 429 || response.status === 500) {
        if (attempt === 0) {
          await new Promise((res) => setTimeout(res, RETRY_BACKOFF));
          continue;
        }
        return null;
      }

      const json = await response.json();
      if (json.error) {
        lastError = json.error;
        if (
          attempt === 0 &&
          (json.error.code === "rate_limit_exceeded" ||
            json.error.code === 429 ||
            json.error.code === 500)
        ) {
          await new Promise((res) => setTimeout(res, RETRY_BACKOFF));
          continue;
        }
        return null;
      }

      const raw = json.choices?.[0]?.message?.content;
      if (!raw) return null;

      let arrayStr = extractJsonArray(raw) || fallbackJsonArray(raw);
      if (!arrayStr) return null;

      try {
        const parsed = JSON.parse(arrayStr);
        const data = validateIngredients(parsed);
        if (!Array.isArray(data)) throw new Error("Not an array");
        return data;
      } catch (parseError) {
        lastError = parseError;
        if (attempt === 0) {
          await new Promise((res) => setTimeout(res, RETRY_BACKOFF));
          continue;
        }
        return null;
      }
    } catch (error: any) {
      lastError = error;
      if (attempt === 0) {
        await new Promise((res) => setTimeout(res, RETRY_BACKOFF));
        continue;
      }
      return null;
    }
  }
  return null;
}
