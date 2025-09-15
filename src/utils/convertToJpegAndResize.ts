import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system";
import { Image } from "react-native";

type TargetOpts = {
  userUid: string;
  fileId?: string;
  dir?: "images" | "tmp";
};

function buildTargetPath({
  userUid,
  fileId,
  dir = "images",
}: TargetOpts): string {
  const name = fileId ?? `img-${Date.now()}.jpg`;
  return `${FileSystem.documentDirectory}users/${userUid}/${dir}/${name}`;
}

async function ensureDir(path: string) {
  const parts = path.split("/");
  const dir = parts.slice(0, parts.length - 1).join("/") + "/";
  try {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  } catch {}
}

export async function convertToJpegAndResize(
  uri: string,
  maxWidth = 512,
  maxHeight = 512,
  opts?: TargetOpts
): Promise<string> {
  // Ensure we operate on a local file path; copy from other schemes if needed
  let srcUri = uri;
  if (!srcUri.startsWith("file://")) {
    const temp = `${FileSystem.cacheDirectory}res-${Date.now()}.jpg`;
    try {
      await FileSystem.copyAsync({ from: srcUri, to: temp });
      srcUri = temp;
    } catch {
      // proceed with original; Image.getSize might still support it
    }
  }
  const { width, height } = await new Promise<{
    width: number;
    height: number;
  }>((resolve, reject) => {
    Image.getSize(srcUri, (w, h) => resolve({ width: w, height: h }), reject);
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

  const manipulated = await ImageManipulator.manipulateAsync(
    srcUri,
    [{ resize: { width: newWidth, height: newHeight } }],
    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
  );

  if (!opts) return manipulated.uri;

  const target = buildTargetPath(opts);
  await ensureDir(target);
  await FileSystem.copyAsync({ from: manipulated.uri, to: target });
  return target;
}
