import { uriToBase64 } from "../utils/uriToBase64";
import { convertToJpeg } from "../utils/ensureJpeg";
import Constants from "expo-constants";
import { Ingredient } from "../types";

const OPENAI_API_KEY = Constants.expoConfig?.extra?.openaiApiKey;

type MealType = {
  id: string;
  image: string;
  ingredients: Ingredient[];
};

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
Important! Na razie testuję funkcjonalność w związku z czym zwróć przykładową odpowiedź na podstawie powyższych wymagań. 
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

export async function mockedDetectIngredientsWithVision(
  count: number,
  delay: number
): Promise<Ingredient[]> {
  const mockIngredients: Ingredient[] = Array.from({ length: count }).map(
    (_, i) => ({
      name: `MockIngredient${i + 1}`,
      amount: 100,
      protein: Number((Math.random() * 20).toFixed(1)),
      fat: Number((Math.random() * 20).toFixed(1)),
      carbs: Number((Math.random() * 50).toFixed(1)),
      kcal: Number((Math.random() * 300).toFixed(0)),
      type: Math.random() > 0.5 ? "food" : "drink",
      fromTable: Math.random() > 0.5,
    })
  );

  return new Promise((resolve) => {
    setTimeout(() => resolve(mockIngredients), delay);
  });
}

export async function getNutritionForName(
  meal: MealType
): Promise<Ingredient[] | null> {
  try {
    const payload = {
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: `
Given this meal:

${JSON.stringify(meal.ingredients, null, 2)}

Correct the nutritional values (kcal, protein, fat, carbs) for each ingredient **without changing the list or names**.

Return only an array of corrected ingredients in this format:
[
  {
    "amount": number,
    "carbs": number,
    "fat": number,
    "fromTable": boolean,
    "kcal": number,
    "name": string,
    "protein": number,
    "type": string
  }
]

- Do not reorder or remove items.
- Keep the same "amount", "fromTable", "name", and "type".
- Only fix: "kcal", "protein", "fat", "carbs".
- Return JSON only, no explanation or text.
        `.trim(),
        },
      ],
      max_tokens: 500,
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
      console.error("❌ OpenAI API error in getNutritionForName:", json.error);
      return null;
    }

    const raw = json.choices?.[0]?.message?.content;
    if (!raw) {
      console.warn("⚠️ No content returned in getNutritionForName");
      return null;
    }

    const cleaned = raw
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    try {
      const parsed = JSON.parse(cleaned);

      if (!Array.isArray(parsed)) {
        console.warn("⚠️ Expected an array of ingredients, got:", parsed);
        return null;
      }

      const valid = parsed.every(
        (ing: any) =>
          typeof ing.name === "string" &&
          typeof ing.kcal === "number" &&
          typeof ing.protein === "number" &&
          typeof ing.fat === "number" &&
          typeof ing.carbs === "number" &&
          typeof ing.amount === "number" &&
          typeof ing.fromTable === "boolean" &&
          typeof ing.type === "string"
      );

      if (!valid) {
        console.warn(
          "⚠️ One or more ingredients have invalid structure:",
          parsed
        );
        return null;
      }

      return parsed;
    } catch (err) {
      console.error("❌ Failed to parse JSON in getNutritionForName:", err);
      console.log("🗣️ Raw content:", raw);
      return null;
    }
  } catch (error) {
    console.error("❌ getNutritionForName error:", error);
    return null;
  }
}
