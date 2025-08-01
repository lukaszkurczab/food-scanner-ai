import * as FileSystem from "expo-file-system";

export async function savePhotoLocally({
  photoUri,
  path,
}: {
  photoUri: string;
  path: string;
}) {
  await FileSystem.copyAsync({
    from: photoUri,
    to: path,
  });
  return path;
}
