import * as FileSystem from "expo-file-system";

type SaveArgs = {
  userUid: string;
  fileId: string;
  photoUri: string;
  dir?: "images" | "tmp";
};

function targetPath({ userUid, fileId, dir = "images" }: SaveArgs) {
  return `${FileSystem.documentDirectory}users/${userUid}/${dir}/${fileId}.jpg`;
}

async function ensureDirFor(filePath: string) {
  const parts = filePath.split("/");
  const dir = parts.slice(0, parts.length - 1).join("/") + "/";
  try {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  } catch {}
}

export async function savePhotoLocally(args: SaveArgs) {
  const path = targetPath(args);
  await ensureDirFor(path);
  await FileSystem.copyAsync({ from: args.photoUri, to: path });
  return path;
}

export async function deletePhotoLocally({
  userUid,
  fileId,
  dir = "images",
}: {
  userUid: string;
  fileId: string;
  dir?: "images" | "tmp";
}) {
  const path = `${FileSystem.documentDirectory}users/${userUid}/${dir}/${fileId}.jpg`;
  try {
    const info = await FileSystem.getInfoAsync(path);
    if (info.exists) await FileSystem.deleteAsync(path, { idempotent: true });
  } catch {}
}
