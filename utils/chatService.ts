import { Meal } from "../types/common";
import OpenAI from "openai";
import Constants from "expo-constants";

const rawKey = Constants.expoConfig?.extra?.openaiApiKey;
const apiKey = rawKey?.trim();
const openai = new OpenAI({
  apiKey: apiKey,
});

export async function askDietAI(
  question: string,
  history: Meal[]
): Promise<string> {
  const formatted = history
    .slice(0, 5)
    .map(
      (meal) =>
        `- ${meal.date}: ${meal.ingredients
          .map((i) => `${i.name} ${i.amount}g`)
          .join(", ")}`
    )
    .join("\n");

  const prompt = `
Jesteś dietetykiem. Oto ostatnie posiłki użytkownika:
${formatted}

Pytanie użytkownika: ${question}
Odpowiedz konkretnie i profesjonalnie po polsku.
  `;

try {
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
  });

  return response.choices[0]?.message?.content || "Brak odpowiedzi.";
} catch (error: any) {
  console.error("❌ Błąd w zapytaniu do OpenAI:", error?.message || error);
  return "Wystąpił błąd podczas komunikacji z AI.";
}
}