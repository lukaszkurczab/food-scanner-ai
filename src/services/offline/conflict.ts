import type { Meal } from "@/types/meal";

export type ConflictResolutionResult = {
  resolved: Meal;
  discarded: Meal;
  isAmbiguous: boolean;
  decision: "remote-wins" | "local-wins" | "conflict";
  reason:
    | "remote-newer"
    | "local-newer"
    | "pending-local-newer"
    | "pending-ambiguous"
    | "pending-remote-newer"
    | "failed-local-preserved"
    | "conflict-local-preserved";
};

const AMBIGUOUS_WINDOW_MS = 5 * 60 * 1000;

function toTimestamp(value?: string | null): number {
  const parsed = Date.parse(value || "1970-01-01T00:00:00.000Z");
  return Number.isFinite(parsed) ? parsed : 0;
}

function isLocalIntent(syncState: Meal["syncState"]): boolean {
  return syncState === "pending";
}

export function resolveMealConflict(
  local: Meal,
  remote: Meal,
): ConflictResolutionResult {
  const localTs = toTimestamp(local.updatedAt);
  const remoteTs = toTimestamp(remote.updatedAt);
  const delta = Math.abs(localTs - remoteTs);
  const isAmbiguous = delta < AMBIGUOUS_WINDOW_MS;

  if (local.syncState === "failed") {
    return {
      resolved: { ...local, syncState: "failed" },
      discarded: { ...remote },
      isAmbiguous,
      decision: "local-wins",
      reason: "failed-local-preserved",
    };
  }

  if (local.syncState === "conflict") {
    return {
      resolved: { ...local, syncState: "conflict" },
      discarded: { ...remote },
      isAmbiguous,
      decision: "conflict",
      reason: "conflict-local-preserved",
    };
  }

  if (isLocalIntent(local.syncState)) {
    if (remoteTs < localTs && !isAmbiguous) {
      return {
        resolved: { ...local, syncState: "pending" },
        discarded: { ...remote },
        isAmbiguous,
        decision: "local-wins",
        reason: "pending-local-newer",
      };
    }

    return {
      resolved: { ...local, syncState: "conflict" },
      discarded: { ...remote },
      isAmbiguous,
      decision: "conflict",
      reason: isAmbiguous ? "pending-ambiguous" : "pending-remote-newer",
    };
  }

  if (remoteTs > localTs) {
    return {
      resolved: { ...remote },
      discarded: { ...local },
      isAmbiguous,
      decision: "remote-wins",
      reason: "remote-newer",
    };
  }
  return {
    resolved: { ...local },
    discarded: { ...remote },
    isAmbiguous,
    decision: "local-wins",
    reason: "local-newer",
  };
}
