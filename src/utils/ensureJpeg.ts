import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system";

type TargetOpts = {
  userUid: string;
  fileId?: string;
  dir?: "images" | "tmp";
};

function buildTargetPath({ userUid, fileId, dir = "images" }: TargetOpts) {
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

export async function convertToJpeg(
  uri: string,
  opts?: TargetOpts
): Promise<string> {
  try {
    const res = await ImageManipulator.manipulateAsync(uri, [], {
      format: ImageManipulator.SaveFormat.JPEG,
      compress: 0.8,
      base64: false,
    });
    if (!opts) return res.uri;
    const target = buildTargetPath(opts);
    await ensureDir(target);
    await FileSystem.copyAsync({ from: res.uri, to: target });
    return target;
  } catch {
    return uri;
  }
}
