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
  log.log("lines:", res.lines.length);
  const parsed = await withTiming("parseLines", () =>
    Promise.resolve(parseNutritionFromLines(res.lines))
  );
  log.log("parsed:", parsed);
  return parsed ? [toIngredient(parsed)] : null;
}

export async function extractNutritionFromTableLocal(
  imageUri: string
): Promise<Ingredient[] | null> {
  const onDevice = Device.isDevice;
  log.log("start", { onDevice, imageUri });
  try {
    const direct = await parseFrom(imageUri);
    if (direct?.length) {
      log.log("success:direct");
      return direct;
    }
    log.log("direct failed → try resized 1280");
    const img = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width: 1280 } }],
      { compress: 0.95, format: ImageManipulator.SaveFormat.JPEG }
    );
    const resized = await parseFrom(img.uri);
    if (resized?.length) log.log("success:resized");
    else log.warn("resized failed");
    return resized ?? null;
  } catch (e) {
    log.error("error", e);
    return null;
  }
}
