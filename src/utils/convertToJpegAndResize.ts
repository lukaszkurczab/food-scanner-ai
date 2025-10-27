import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system";
import { Image } from "react-native";

type TargetOpts = {
  userUid: string;
  fileId?: string;
  dir?: "images" | "tmp";
};

type EnhanceOpts = {
  grayscale?: boolean;
  threshold?: number;
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
  maxWidth = 1600,
  maxHeight = 1600,
  opts?: TargetOpts,
  _enhance?: EnhanceOpts
): Promise<string> {
  let srcUri = uri;
  if (!srcUri.startsWith("file://")) {
    const temp = `${FileSystem.cacheDirectory}res-${Date.now()}.jpg`;
    try {
      await FileSystem.copyAsync({ from: srcUri, to: temp });
      srcUri = temp;
    } catch {}
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

  const actions: ImageManipulator.Action[] = [
    { resize: { width: newWidth, height: newHeight } },
  ];

  const first = await ImageManipulator.manipulateAsync(srcUri, actions, {
    compress: 0.75,
    format: ImageManipulator.SaveFormat.JPEG,
  });

  const finalUri = first.uri;

  if (!opts) return finalUri;

  const target = buildTargetPath(opts);
  await ensureDir(target);
  await FileSystem.copyAsync({ from: finalUri, to: target });
  return target;
}
