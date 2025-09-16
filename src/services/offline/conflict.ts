import type { Meal } from "@/types/meal";

export function resolveMealConflict(local: Meal, remote: Meal): Meal {
  const localUpdated = new Date(local.updatedAt || "1970-01-01").getTime();
  const remoteUpdated = new Date(remote.updatedAt || "1970-01-01").getTime();

  if (remoteUpdated > localUpdated) {
    return { ...remote };
  }
  return { ...local };
}
