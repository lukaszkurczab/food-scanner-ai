// src/services/offline/conflict.ts
import type { Meal } from "@/types/meal";

/**
 * Resolve conflict between local and remote Meal using Last-Write-Wins (LWW).
 * - Compare updatedAt (ISO string).
 * - If remote.updatedAt > local.updatedAt → return remote.
 * - Otherwise return local.
 * - "deleted" is treated like any other field (no special rules).
 */
export function resolveMealConflict(local: Meal, remote: Meal): Meal {
  const localUpdated = new Date(local.updatedAt || "1970-01-01").getTime();
  const remoteUpdated = new Date(remote.updatedAt || "1970-01-01").getTime();

  if (remoteUpdated > localUpdated) {
    return { ...remote };
  }
  return { ...local };
}
