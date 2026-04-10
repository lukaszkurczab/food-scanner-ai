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
  it("marks conflict as ambiguous when updates are within 5 minutes", () => {
    const local = baseMeal({ name: "Local", updatedAt: "2026-03-03T12:00:00.000Z" });
    const remote = baseMeal({ name: "Remote", updatedAt: "2026-03-03T12:03:00.000Z" });

    const result = resolveMealConflict(local, remote);

    expect(result.resolved).toEqual(expect.objectContaining({ name: "Remote" }));
    expect(result.discarded).toEqual(expect.objectContaining({ name: "Local" }));
    expect(result.isAmbiguous).toBe(true);
  });

  it("marks conflict as not ambiguous when updates are more than 5 minutes apart", () => {
    const local = baseMeal({ name: "Local", updatedAt: "2026-03-03T12:00:00.000Z" });
    const remote = baseMeal({ name: "Remote", updatedAt: "2026-03-03T12:06:00.000Z" });

    const result = resolveMealConflict(local, remote);

    expect(result.resolved).toEqual(expect.objectContaining({ name: "Remote" }));
    expect(result.isAmbiguous).toBe(false);
  });

  it("marks identical timestamps as ambiguous and keeps local on tie", () => {
    const local = baseMeal({ name: "Local", updatedAt: "2026-03-03T12:00:00.000Z" });
    const remote = baseMeal({ name: "Remote", updatedAt: "2026-03-03T12:00:00.000Z" });

    const result = resolveMealConflict(local, remote);

    expect(result.resolved).toEqual(expect.objectContaining({ name: "Local" }));
    expect(result.discarded).toEqual(expect.objectContaining({ name: "Remote" }));
    expect(result.isAmbiguous).toBe(true);
  });
});
