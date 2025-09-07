import { uriToBase64 } from "@/utils/uriToBase64";
import { convertToJpegAndResize } from "@/utils/convertToJpegAndResize";
import Constants from "expo-constants";
import type { Ingredient } from "@/types";
import { v4 as uuidv4 } from "uuid";
import { canUseAiToday, consumeAiUse } from "./userService";

const IS_DEV = typeof __DEV__ !== "undefined" && __DEV__;
const OPENAI_API_KEY = Constants.expoConfig?.extra?.openaiApiKey;
const VISION_MODEL = "gpt-4o";
const MAX_TOKENS = 600;
const TIMEOUT_MS = 30000;
const RETRY_BACKOFF = 3000;

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
  return { id: uuidv4(), name: x.name.trim(), amount, protein, fat, carbs, kcal };
};

function extractJsonArray(raw: string): string | null {
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start !== -1 && end !== -1 && end > start)
    return raw.substring(start, end + 1);
  return null;
}

function fallbackJsonArray(raw: string): string | null {
  const match = raw.match(/\[[\s\S]*\]/);
  return match ? match[0] : null;
}

export async function detectIngredientsWithVision(
  userUid: string,
  imageUri: string,
  opts?: { isPremium?: boolean; limit?: number }
): Promise<Ingredient[] | null> {
  const isPremium = !!opts?.isPremium;
  const limit = opts?.limit ?? 1;

  if (!isPremium) {
    const allowed = await canUseAiToday(userUid, isPremium, limit);
    if (!allowed) {
      throw new Error("ai/daily-limit-reached");
    }
  }

  const FORCE_REAL = true;
  if (IS_DEV && !FORCE_REAL) {
    if (!isPremium) await consumeAiUse(userUid, isPremium, limit);
    return [
      {
        id: uuidv4(),
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
        temperature: 0,
        top_p: 0,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text:
                  `Analyze the image and return ONLY a raw JSON array. No prose. ` +
                  `Prefer a nutrition facts table if visible. Otherwise infer visible foods/drinks. ` +
                  `Strict schema per item: { "name": "string", "amount": 123, "protein": 0, "fat": 0, "carbs": 0, "kcal": 0 }. ` +
                  `Use grams for "amount". Numbers only. If unknown, estimate conservatively or use 0. ` +
                  `Output example: ` +
                  `[{"name":"oatmeal","amount":120,"protein":6,"fat":4,"carbs":20,"kcal":148}]`,
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

      if (response.status === 429 || response.status >= 500) {
        if (attempt === 0) {
          await new Promise((res) => setTimeout(res, RETRY_BACKOFF));
          continue;
        }
        return null;
      }

      const json = await response.json();
      if (json?.error) {
        lastError = json.error;
        if (
          attempt === 0 &&
          (json.error.code === "rate_limit_exceeded" || response.status >= 500)
        ) {
          await new Promise((res) => setTimeout(res, RETRY_BACKOFF));
          continue;
        }
        return null;
      }

      const raw: string | undefined = json?.choices?.[0]?.message?.content;
      if (!raw || typeof raw !== "string") return null;

      const arrayStr = extractJsonArray(raw) || fallbackJsonArray(raw);
      if (!arrayStr) return null;

      let parsed: any;
      try {
        parsed = JSON.parse(arrayStr);
      } catch (e) {
        const cleaned = arrayStr
          .replace(/,\s*]/g, "]")
          .replace(/,\s*}/g, "}")
          .replace(/\bNaN\b/gi, "0");
        parsed = JSON.parse(cleaned);
      }

      if (!Array.isArray(parsed)) return null;

      const normalized: Ingredient[] = parsed
        .map(normalize)
        .filter((x): x is Ingredient => !!x);

      if (!isPremium) await consumeAiUse(userUid, isPremium, limit);

      return normalized;
    } catch (error) {
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
