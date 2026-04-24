import { describe, expect, it } from "@jest/globals";
import type { Meal } from "@/types/meal";
import {
  addOrUpdateMealInSections,
  buildSectionsMap,
} from "@/feature/History/services/historySectionsService";

const TODAY_LABEL = "Today";
const LABELS = {
  todayLabel: TODAY_LABEL,
  yesterdayLabel: "Yesterday",
  locale: "en-US",
};

function makeMeal(overrides: Partial<Meal> = {}): Meal {
  return {
    userUid: "user-1",
    mealId: "meal-1",
    timestamp: "2026-02-25T10:00:00.000Z",
    type: "lunch",
    name: "Meal",
    ingredients: [],
    createdAt: "2026-02-25T10:00:00.000Z",
    updatedAt: "2026-02-25T10:00:00.000Z",
    syncState: "synced",
    source: "manual",
    cloudId: "cloud-1",
    ...overrides,
  };
}

describe("historySectionsService", () => {
  it("keeps section data sorted descending by timestamp when adding out of order", () => {
    const sections = new Map();

    addOrUpdateMealInSections(
      sections,
      makeMeal({ cloudId: "m1", mealId: "m1", timestamp: "2026-02-25T10:00:00.000Z" }),
      LABELS,
    );
    addOrUpdateMealInSections(
      sections,
      makeMeal({ cloudId: "m2", mealId: "m2", timestamp: "2026-02-25T12:00:00.000Z" }),
      LABELS,
    );
    addOrUpdateMealInSections(
      sections,
      makeMeal({ cloudId: "m3", mealId: "m3", timestamp: "2026-02-25T11:00:00.000Z" }),
      LABELS,
    );

    const section = sections.get("2026-02-25");
    expect(section?.data.map((meal: Meal) => meal.cloudId)).toEqual([
      "m2",
      "m3",
      "m1",
    ]);
  });

  it("updates existing meal in place when order value did not change", () => {
    const sections = buildSectionsMap(
      [
        makeMeal({ cloudId: "m2", mealId: "m2", timestamp: "2026-02-25T12:00:00.000Z" }),
        makeMeal({ cloudId: "m1", mealId: "m1", timestamp: "2026-02-25T10:00:00.000Z" }),
      ],
      LABELS,
    );

    addOrUpdateMealInSections(
      sections,
      makeMeal({
        cloudId: "m1",
        mealId: "m1",
        timestamp: "2026-02-25T10:00:00.000Z",
        name: "Updated name",
      }),
      LABELS,
    );

    const section = sections.get("2026-02-25");
    expect(section?.data.map((meal: Meal) => meal.cloudId)).toEqual(["m2", "m1"]);
    expect(section?.data[1].name).toBe("Updated name");
  });

  it("repositions existing meal when timestamp changes", () => {
    const sections = buildSectionsMap(
      [
        makeMeal({ cloudId: "m2", mealId: "m2", timestamp: "2026-02-25T12:00:00.000Z" }),
        makeMeal({ cloudId: "m1", mealId: "m1", timestamp: "2026-02-25T10:00:00.000Z" }),
      ],
      LABELS,
    );

    addOrUpdateMealInSections(
      sections,
      makeMeal({
        cloudId: "m1",
        mealId: "m1",
        timestamp: "2026-02-25T13:00:00.000Z",
      }),
      LABELS,
    );

    const section = sections.get("2026-02-25");
    expect(section?.data.map((meal: Meal) => meal.cloudId)).toEqual(["m1", "m2"]);
  });

  it("groups late-night meals by dayKey instead of timestamp day", () => {
    const sections = buildSectionsMap(
      [
        makeMeal({
          cloudId: "late",
          mealId: "late",
          dayKey: "2026-03-18",
          timestamp: "2026-03-19T00:30:00.000Z",
          createdAt: "2026-03-19T00:30:00.000Z",
          updatedAt: "2026-03-19T00:30:00.000Z",
        }),
      ],
      LABELS,
    );

    expect(sections.get("2026-03-18")?.data[0].cloudId).toBe("late");
    expect(sections.has("2026-03-19")).toBe(false);
  });
});
