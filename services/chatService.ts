import OpenAI from "openai";
import Constants from "expo-constants";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { MealHistory } from "@/types";

type Ingredient = {
  name: string;
  amount: number;
};

type Message = {
  from: "user" | "ai";
  text: string;
};

const rawKey = Constants.expoConfig?.extra?.openaiApiKey;
const apiKey = rawKey?.trim();
const openai = new OpenAI({ apiKey });

export async function askDietAI(
  question: string,
  meals: MealHistory[],
  chatHistory: Message[]
): Promise<string> {
  const recentMeals = meals
    .slice(0, 20)
    .map(
      (meal) =>
        `• ${meal.date} – ${meal.ingredients.map((i) => `${i}g`).join(", ")}`
    )
    .join("\n");

  const messages: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content:
        "Jesteś doświadczonym dietetykiem. Odpowiadasz profesjonalnie i zwięźle w języku użytkownika. Uwzględniasz historię posiłków i pytania użytkownika. Twoje odpowiedzi są praktyczne, oparte na wiedzy o żywieniu i stylu życia.",
    },
    {
      role: "user",
      content: `Oto ostatnie posiłki użytkownika:\n${recentMeals}`,
    },
    ...(chatHistory.slice(-10).map((msg) => ({
      role: msg.from === "user" ? "user" : "assistant",
      content: msg.text,
    })) as ChatCompletionMessageParam[]),
    {
      role: "user",
      content: question,
    },
  ];

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages,
    });

    return response.choices[0]?.message?.content || "Brak odpowiedzi.";
  } catch (error: any) {
    console.error("❌ Błąd zapytania do OpenAI:", error?.message || error);
    return "Wystąpił błąd podczas komunikacji z AI.";
  }
}
