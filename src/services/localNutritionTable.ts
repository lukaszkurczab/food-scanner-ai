import * as Device from "expo-device";
import * as ImageManipulator from "expo-image-manipulator";
import type { Ingredient } from "@/types";
import { recognizeText } from "@/services/mlkitTextService";
import {
  parseNutritionFromLines,
  toIngredient,
} from "@/services/mlkitNutrition";
import { debugScope } from "@/utils/debug";
import { withTiming } from "@/utils/perf";

const log = debugScope("OCR:Local");

async function parseFrom(uri: string): Promise<Ingredient[] | null> {
  const res = await withTiming("recognizeText", () => recognizeText(uri));
  const parsed = await withTiming("parseLines", () =>
    Promise.resolve(parseNutritionFromLines(res.lines))
  );
  return parsed ? [toIngredient(parsed)] : null;
}

export async function extractNutritionFromTableLocal(
  imageUri: string
): Promise<Ingredient[] | null> {
  const onDevice = Device.isDevice;
  log.log("start", { onDevice, imageUri });
  try {
    const direct = await parseFrom(imageUri);
    if (direct?.length) return direct;

    const sizes = [1600, 1280, 960];
    for (const w of sizes) {
      const img = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: w } }],
        { compress: 0.95, format: ImageManipulator.SaveFormat.JPEG }
      );
      const res = await parseFrom(img.uri);
      if (res?.length) return res;
    }
    return null;
  } catch {
    return null;
  }
}
