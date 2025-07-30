import type { UserData } from "@/src/types";

export function pickLatest(
  local: UserData,
  remote: UserData
): "local" | "remote" | "equal" {
  if (local.lastSyncedAt > remote.lastSyncedAt) return "local";
  if (local.lastSyncedAt < remote.lastSyncedAt) return "remote";
  return "equal";
}
