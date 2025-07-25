import type { UserData } from "@/src/types";

export function pickLatest(
  local: UserData,
  remote: UserData
): "local" | "remote" | "equal" {
  if (local.updatedAt > remote.updatedAt) return "local";
  if (local.updatedAt < remote.updatedAt) return "remote";
  return "equal";
}
