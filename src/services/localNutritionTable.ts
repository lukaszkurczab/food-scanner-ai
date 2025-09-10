import * as ImageManipulator from "expo-image-manipulator";
import type { Ingredient } from "@/types";
import { extractTextFromImage, isSupported as ocrSupported } from "expo-text-extractor";

function toNumber(x: unknown): number {
  if (typeof x === "number") return isFinite(x) ? x : 0;
  if (typeof x === "string") {
    const n = Number(x.replace(/,/g, ".").replace(/[^0-9.+-]/g, ""));
    return isFinite(n) ? n : 0;
  }
  return 0;
}

function findValue(text: string, keys: string[]): number | null {
  const lines = text.split(/\r?\n/).map((l) => l.trim().toLowerCase());
  for (const line of lines) {
    for (const k of keys) {
      if (line.includes(k)) {
        const m = line.match(/([0-9]+[\.,]?[0-9]*)/);
        if (m) return toNumber(m[1]);
      }
    }
  }
  const m2 = text.match(new RegExp(`(?:${keys.join("|")})[^0-9]*([0-9]+[\.,]?[0-9]*)`, "i"));
  if (m2) return toNumber(m2[1]);
  return null;
}

export async function extractNutritionFromTableLocal(imageUri: string): Promise<Ingredient[] | null> {
  try {
    if (!ocrSupported) return null;
    const manu = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width: 1024 } }],
      { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
    );
    const lines: string[] = await extractTextFromImage(manu.uri);
    const text = Array.isArray(lines) ? lines.join("\n") : String(lines ?? "");
    if (!text || !text.trim()) return null;
    const kcal = findValue(text, ["kcal", "energi", "energia", "calorie"]) ?? null;
    const protein = findValue(text, ["protein", "proteina", "białko", "proteine"]) ?? 0;
    const fat = findValue(text, ["fat", "grassi", "tłuszcz", "gras", "lipides"]) ?? 0;
    const carbs = findValue(text, ["carb", "węgl", "glucid", "carbo"]) ?? 0;
    const k = kcal ?? protein * 4 + carbs * 4 + fat * 9;
    const ing: Ingredient = {
      id: `${Date.now()}`,
      name: "Nutrition",
      amount: 100,
      protein,
      fat,
      carbs,
      kcal: k,
    };
    return [ing];
  } catch {
    return null; // Fail silent to enable remote fallback
  }
}
