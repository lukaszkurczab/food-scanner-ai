import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "@/services/core/fileSystem";
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

// Compression steps tried in order when output exceeds maxBytes.
// Each entry is [quality, dimensionScale] where scale applies to maxWidth/maxHeight.
const COMPRESSION_FALLBACKS: Array<[number, number]> = [
  [0.6, 1.0],
  [0.4, 1.0],
  [0.4, 0.75],
  [0.25, 0.5],
];

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
  } catch {
    // Directory may already exist.
  }
}

async function getFileBytes(uri: string): Promise<number> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    return info.exists ? info.size ?? 0 : 0;
  } catch {
    return 0;
  }
}

export async function convertToJpegAndResize(
  uri: string,
  maxWidth = 1600,
  maxHeight = 1600,
  opts?: TargetOpts,
  enhance?: EnhanceOpts,
  maxBytes?: number,
): Promise<string> {
  void enhance;
  let srcUri = uri;
  if (!srcUri.startsWith("file://")) {
    const temp = `${FileSystem.cacheDirectory}res-${Date.now()}.jpg`;
    try {
      await FileSystem.copyAsync({ from: srcUri, to: temp });
      srcUri = temp;
    } catch {
      // Ignore copy failures and continue with original URI.
    }
  }

  const { width, height } = await new Promise<{
    width: number;
    height: number;
  }>((resolve, reject) => {
    Image.getSize(srcUri, (w, h) => resolve({ width: w, height: h }), reject);
  });

  function resolveTargetDimensions(
    dimScale: number,
  ): { newWidth: number; newHeight: number } {
    const scaledMaxW = Math.max(1, Math.round(maxWidth * dimScale));
    const scaledMaxH = Math.max(1, Math.round(maxHeight * dimScale));
    let newWidth = width;
    let newHeight = height;
    if (width > scaledMaxW || height > scaledMaxH) {
      const ratio = Math.min(scaledMaxW / width, scaledMaxH / height);
      newWidth = Math.round(width * ratio);
      newHeight = Math.round(height * ratio);
    }
    return { newWidth, newHeight };
  }

  async function compressOnce(quality: number, dimScale: number): Promise<string> {
    const { newWidth, newHeight } = resolveTargetDimensions(dimScale);
    const actions: ImageManipulator.Action[] = [
      { resize: { width: newWidth, height: newHeight } },
    ];
    const result = await ImageManipulator.manipulateAsync(srcUri, actions, {
      compress: quality,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    return result.uri;
  }

  let resultUri = await compressOnce(0.75, 1.0);

  if (maxBytes !== undefined && maxBytes > 0) {
    const initialSize = await getFileBytes(resultUri);
    if (initialSize > maxBytes) {
      for (const [quality, dimScale] of COMPRESSION_FALLBACKS) {
        resultUri = await compressOnce(quality, dimScale);
        const size = await getFileBytes(resultUri);
        if (size <= maxBytes) {
          break;
        }
      }
    }
  }

  if (!opts) return resultUri;

  const target = buildTargetPath(opts);
  await ensureDir(target);
  await FileSystem.copyAsync({ from: resultUri, to: target });
  return target;
}
