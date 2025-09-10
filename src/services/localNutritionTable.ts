import * as ImageManipulator from "expo-image-manipulator";
import type { Ingredient } from "@/types";
import { recognizeText } from "@/services/mlkitTextService";
import { parseNutritionFromLines, toIngredient } from "@/services/mlkitNutrition";

export async function extractNutritionFromTableLocal(
  imageUri: string
): Promise<Ingredient[] | null> {
  try {
    // Resize to reasonable width to help OCR and reduce memory
    const img = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width: 1024 } }],
      { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
    );

    const res = await recognizeText(img.uri);
    const parsed = parseNutritionFromLines(res.lines);
    if (!parsed) return null;
    const ing = toIngredient(parsed);
    return [ing];
  } catch {
    // ML Kit not linked or failed -> let caller use remote fallback
    return null;
  }
}
