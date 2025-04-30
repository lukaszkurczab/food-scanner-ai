import { uriToBase64 } from "@/utils/uriToBase64";
import { convertToJpeg } from "@/utils/ensureJpeg";
import Constants from "expo-constants";

const OPENAI_API_KEY = Constants.expoConfig?.extra?.openaiApiKey;

type Ingredient = { name: string; amount: number };

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
              text:
                "Try to list all visible food ingredients in this meal and estimate their approximate amounts in grams. Respond as JSON: [{ name: '...', amount: number }]. If unsure, make the best educated guess based on visual cues.",
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

      if (!Array.isArray(data) || !data[0]?.name) {
        console.warn("⚠️ Vision zwróciło nietypowy obiekt, nie składniki.");
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
