import type { Meal } from "@/types/meal";

export type ConflictResolutionResult = {
  resolved: Meal;
  discarded: Meal;
  isAmbiguous: boolean;
};

const AMBIGUOUS_WINDOW_MS = 5 * 60 * 1000;

export function resolveMealConflict(
  local: Meal,
  remote: Meal,
): ConflictResolutionResult {
  const localTs = new Date(local.updatedAt || "1970-01-01").getTime();
  const remoteTs = new Date(remote.updatedAt || "1970-01-01").getTime();
  const delta = Math.abs(localTs - remoteTs);
  const isAmbiguous = delta < AMBIGUOUS_WINDOW_MS;

  if (remoteTs > localTs) {
    return { resolved: { ...remote }, discarded: { ...local }, isAmbiguous };
  }
  return { resolved: { ...local }, discarded: { ...remote }, isAmbiguous };
}
