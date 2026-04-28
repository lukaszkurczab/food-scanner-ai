import { describe, expect, it } from "@jest/globals";
import type { Meal } from "@/types/meal";
import { resolveMealConflict } from "./conflict";

function baseMeal(overrides: Partial<Meal> = {}): Meal {
  return {
    userUid: "user-1",
    mealId: "meal-1",
    cloudId: "meal-1",
    timestamp: "2026-03-03T12:00:00.000Z",
    type: "lunch",
    name: "Meal",
    ingredients: [],
    createdAt: "2026-03-03T12:00:00.000Z",
    updatedAt: "2026-03-03T12:00:00.000Z",
    syncState: "pending",
    source: "manual",
    imageId: null,
    photoUrl: null,
    notes: null,
    tags: [],
    deleted: false,
    totals: { kcal: 100, protein: 10, carbs: 10, fat: 3 },
    ...overrides,
  };
}

describe("resolveMealConflict", () => {
  it("marks pending local edits as conflict when updates are within 5 minutes", () => {
    const local = baseMeal({ name: "Local", updatedAt: "2026-03-03T12:00:00.000Z" });
    const remote = baseMeal({ name: "Remote", updatedAt: "2026-03-03T12:03:00.000Z" });

    const result = resolveMealConflict(local, remote);

    expect(result.resolved).toEqual(
      expect.objectContaining({ name: "Local", syncState: "conflict" }),
    );
    expect(result.discarded).toEqual(expect.objectContaining({ name: "Remote" }));
    expect(result.decision).toBe("conflict");
    expect(result.reason).toBe("pending-ambiguous");
    expect(result.isAmbiguous).toBe(true);
  });

  it("keeps pending local edits when remote is older outside the ambiguous window", () => {
    const local = baseMeal({ name: "Local", updatedAt: "2026-03-03T12:10:00.000Z" });
    const remote = baseMeal({ name: "Remote", updatedAt: "2026-03-03T12:04:00.000Z" });

    const result = resolveMealConflict(local, remote);

    expect(result.resolved).toEqual(
      expect.objectContaining({ name: "Local", syncState: "pending" }),
    );
    expect(result.decision).toBe("local-wins");
    expect(result.reason).toBe("pending-local-newer");
    expect(result.isAmbiguous).toBe(false);
  });

  it("marks pending local edits as conflict when remote is newer", () => {
    const local = baseMeal({ name: "Local", updatedAt: "2026-03-03T12:00:00.000Z" });
    const remote = baseMeal({ name: "Remote", updatedAt: "2026-03-03T12:10:00.000Z" });

    const result = resolveMealConflict(local, remote);

    expect(result.resolved).toEqual(
      expect.objectContaining({ name: "Local", syncState: "conflict" }),
    );
    expect(result.discarded).toEqual(expect.objectContaining({ name: "Remote" }));
    expect(result.decision).toBe("conflict");
    expect(result.reason).toBe("pending-remote-newer");
    expect(result.isAmbiguous).toBe(false);
  });

  it("preserves failed local meals so pull cannot mask a dead-letter", () => {
    const local = baseMeal({
      name: "Failed local",
      syncState: "failed",
      updatedAt: "2026-03-03T12:00:00.000Z",
    });
    const remote = baseMeal({ name: "Remote", updatedAt: "2026-03-03T12:10:00.000Z" });

    const result = resolveMealConflict(local, remote);

    expect(result.resolved).toEqual(
      expect.objectContaining({ name: "Failed local", syncState: "failed" }),
    );
    expect(result.decision).toBe("local-wins");
    expect(result.reason).toBe("failed-local-preserved");
  });

  it("keeps a pending local upsert visible when a remote tombstone is newer", () => {
    const local = baseMeal({
      name: "Local upsert",
      syncState: "pending",
      deleted: false,
      updatedAt: "2026-03-03T12:00:00.000Z",
    });
    const remote = baseMeal({
      name: "Remote tombstone",
      syncState: "synced",
      deleted: true,
      updatedAt: "2026-03-03T12:10:00.000Z",
    });

    const result = resolveMealConflict(local, remote);

    expect(result.resolved).toEqual(
      expect.objectContaining({
        name: "Local upsert",
        deleted: false,
        syncState: "conflict",
      }),
    );
    expect(result.discarded).toEqual(expect.objectContaining({ deleted: true }));
    expect(result.decision).toBe("conflict");
    expect(result.reason).toBe("pending-remote-newer");
  });
});
