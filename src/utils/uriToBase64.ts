import * as FileSystem from "expo-file-system";

export async function uriToBase64(uri: string): Promise<string> {
  let src = uri;
  if (!src.startsWith("file://")) {
    const target = `${FileSystem.cacheDirectory}b64-${Date.now()}.bin`;
    try {
      await FileSystem.copyAsync({ from: src, to: target });
      src = target;
    } catch {}
  }
  return FileSystem.readAsStringAsync(src, {
    encoding: FileSystem.EncodingType.Base64,
  });
}
