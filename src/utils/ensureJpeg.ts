import * as ImageManipulator from "expo-image-manipulator";

export async function convertToJpeg(uri: string): Promise<string> {
  try {
    const result = await ImageManipulator.manipulateAsync(uri, [], {
      format: ImageManipulator.SaveFormat.JPEG,
      compress: 0.8,
      base64: false,
    });

    return result.uri;
  } catch (error) {
    console.error("❌ Error converting to JPEG:", error);
    return uri;
}
}
