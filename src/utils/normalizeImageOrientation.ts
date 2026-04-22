import * as ImageManipulator from "expo-image-manipulator";

const ORIENTATION_NORMALIZE_QUALITY = 1;

export async function normalizeImageOrientation(uri: string): Promise<string> {
  if (!uri) return uri;

  try {
    const result = await ImageManipulator.manipulateAsync(uri, [], {
      compress: ORIENTATION_NORMALIZE_QUALITY,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    return result.uri || uri;
  } catch {
    return uri;
  }
}
