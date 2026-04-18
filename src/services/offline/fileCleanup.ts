import * as FileSystem from "expo-file-system/legacy";

function buildUserDir(base: string, segment: string, uid: string): string {
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  return `${normalizedBase}${segment}/${uid}`;
}

export async function cleanupUserOfflineAssets(uid: string | null): Promise<void> {
  if (!uid) return;

  const docDir = FileSystem.documentDirectory;
  if (!docDir) return;

  const targets = [
    buildUserDir(docDir, "users", uid),
    buildUserDir(docDir, "meals", uid),
  ];

  await Promise.all(
    targets.map(async (target) => {
      try {
        await FileSystem.deleteAsync(target, { idempotent: true });
      } catch {
        // Keep logout flow resilient if filesystem cleanup fails.
      }
    }),
  );
}

export async function cleanupTransientOfflineAssets(): Promise<void> {
  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) return;

  const normalizedCacheDir = cacheDir.endsWith("/") ? cacheDir : `${cacheDir}/`;
  const aiDir = `${normalizedCacheDir}ai`;

  try {
    await FileSystem.deleteAsync(aiDir, { idempotent: true });
  } catch {
    // Keep app bootstrap resilient if cache cleanup fails.
  }
}
