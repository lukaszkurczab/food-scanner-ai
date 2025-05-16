import { uriToBase64 } from "@/utils/uriToBase64";
import { convertToJpeg } from "@/utils/ensureJpeg";
import Constants from "expo-constants";
import { Ingredient } from "@/types";

const OPENAI_API_KEY = Constants.expoConfig?.extra?.openaiApiKey;

export async function detectIngredientsWithVision(
  imageUri: string
): Promise<Ingredient[] | null> {
  try {
    const jpegUri = await convertToJpeg(imageUri);
    const imageBase64 = await uriToBase64(jpegUri);

    const payload = {
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `
Your task is to analyze the provided image and detect either:
1. A full nutrition facts table, OR
2. Visible food or drink ingredients in a meal.

Return a JSON array of objects in this format:
[
  {
    "name": "string",
    "amount": number (in grams),
    "protein": number (per 100g),
    "fat": number (per 100g),
    "carbs": number (per 100g),
    "kcal": number (per 100g),
    "type": "food" or "drink",
    "fromTable": boolean
  }
]

Rules:
- If a nutrition table is detected, return fromTable as true.
- If a nutrition table is detected, return only the parsed data from it (assume amount = 100g).
- Otherwise, do your best to visually identify ingredients and estimate their values.
- Use educated guesses for macronutrient values if no table is found.
- If unsure about any value, give your best estimate.
- Never include explanations, only the JSON array.
              `.trim(),
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
    };

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const json = await response.json();

    if (json.error) {
      console.error("❌ OpenAI API returned an error:", json.error);
      return null;
    }

    const raw = json.choices?.[0]?.message?.content;
    if (!raw) {
      console.warn("⚠️ OpenAI response has no content.");
      return null;
    }

    const cleaned = raw
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    let data: Ingredient[];

    try {
      data = JSON.parse(cleaned);

      if (!Array.isArray(data) || !data[0]?.name || !data[0]?.type) {
        console.warn("⚠️ Unexpected Vision response structure.");
        return null;
      }

      return data;
    } catch (parseError) {
      console.error("❌ JSON parsing failed:", parseError);
      console.log("🗣️ Vision returned message:", raw);
      return null;
    }
  } catch (error) {
    console.error("❌ detectIngredientsWithVision error:", error);
    return null;
  }
}
