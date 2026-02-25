import Constants from "expo-constants";
import type { Ingredient, UserData } from "@/types";

type E2EExtra = {
  e2e?: boolean;
  e2eMockChatReply?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as E2EExtra;

const E2E_ENABLED = extra.e2e === true;
const DEFAULT_CHAT_REPLY =
  "E2E_MOCK_CHAT_REPLY: Keep hydration and protein consistent every day.";

export const E2E_DETERMINISTIC_INGREDIENT: Ingredient = {
  id: "e2e-ingredient-1",
  name: "E2E Oatmeal",
  amount: 250,
  unit: "g",
  kcal: 320,
  protein: 18,
  carbs: 42,
  fat: 10,
};

export function isE2EModeEnabled(): boolean {
  return E2E_ENABLED;
}

export function getE2EMockChatReply(): string {
  const raw = extra.e2eMockChatReply;
  if (typeof raw !== "string") return DEFAULT_CHAT_REPLY;
  const normalized = raw.trim();
  return normalized.length > 0 ? normalized : DEFAULT_CHAT_REPLY;
}

export function buildE2EProfileSeed(uid: string, email: string): Partial<UserData> {
  const nowIso = new Date().toISOString();
  return {
    uid,
    email,
    username: "e2e-user",
    language: "en",
    unitsSystem: "metric",
    age: "30",
    sex: "female",
    height: "170",
    weight: "65",
    preferences: ["balanced"],
    activityLevel: "moderate",
    goal: "maintain",
    surveyComplited: true,
    calorieTarget: 2200,
    chronicDiseases: [],
    allergies: [],
    plan: "free",
    darkTheme: false,
    syncState: "pending",
    createdAt: Date.parse("2025-01-01T00:00:00.000Z"),
    lastLogin: nowIso,
  };
}
