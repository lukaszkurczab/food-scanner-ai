import type { UserData } from "@/types";

export function pickLatest(
  local: UserData,
  remote: UserData
): "local" | "remote" | "equal" {
  const localTime = local.lastSyncedAt ? Date.parse(local.lastSyncedAt) : 0;
  const remoteTime = remote.lastSyncedAt ? Date.parse(remote.lastSyncedAt) : 0;

  if (localTime > remoteTime) return "local";
  if (localTime < remoteTime) return "remote";
  return "equal";
}

export async function fullSync({
  syncUserProfile,
  getChatHistory,
}: {
  syncUserProfile: () => Promise<void>;
  getChatHistory: () => Promise<void>;
}) {
  await Promise.all([syncUserProfile(), getChatHistory()]);
}
