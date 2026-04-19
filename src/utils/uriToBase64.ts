import * as FileSystem from "@/services/core/fileSystem";

export async function uriToBase64(uri: string): Promise<string> {
  let src = uri;
  if (!src.startsWith("file://")) {
    const target = `${FileSystem.cacheDirectory}b64-${Date.now()}.bin`;
    try {
      await FileSystem.copyAsync({ from: src, to: target });
      src = target;
    } catch {
      // Ignore copy failures and try reading from original URI.
    }
  }
  return FileSystem.readAsStringAsync(src, {
    encoding: FileSystem.EncodingType.Base64,
  });
}
