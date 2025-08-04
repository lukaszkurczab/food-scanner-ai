import * as ImageManipulator from "expo-image-manipulator";
import { Image } from "react-native";

export async function convertToJpegAndResize(
  uri: string,
  maxWidth = 512,
  maxHeight = 512
): Promise<string> {
  const { width, height } = await new Promise<{
    width: number;
    height: number;
  }>((resolve, reject) => {
    Image.getSize(uri, (w, h) => resolve({ width: w, height: h }), reject);
  });

  let newWidth = width;
  let newHeight = height;
  if (width > maxWidth || height > maxHeight) {
    const widthRatio = maxWidth / width;
    const heightRatio = maxHeight / height;
    const ratio = Math.min(widthRatio, heightRatio);
    newWidth = Math.round(width * ratio);
    newHeight = Math.round(height * ratio);
  }

  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: newWidth, height: newHeight } }],
    {
      compress: 0.7,
      format: ImageManipulator.SaveFormat.JPEG,
    }
  );

  return result.uri;
}
