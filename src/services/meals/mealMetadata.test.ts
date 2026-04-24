import { describe, expect, it } from "@jest/globals";
import {
  formatMealDayKey,
  getMealAiMetaFromAiResponse,
  getMealDayKey,
  getMealsForDayKey,
  normalizeMealAiMeta,
  normalizeMealDayKey,
  normalizeMealInputMethod,
  parseMealAiMeta,
  serializeMealAiMeta,
} from "@/services/meals/mealMetadata";
import type { Meal } from "@/types/meal";

const makeMeal = (overrides: Partial<Meal> = {}): Meal => ({
  userUid: "user-1",
  mealId: "meal-1",
  timestamp: "2026-03-18T10:00:00.000Z",
  dayKey: "2026-03-18",
  type: "lunch",
  name: "Meal",
  ingredients: [],
  createdAt: "2026-03-18T10:00:00.000Z",
  updatedAt: "2026-03-18T10:00:00.000Z",
  syncState: "synced",
  source: "manual",
  ...overrides,
});

describe("mealMetadata", () => {
  it("normalizes the canonical meal input methods", () => {
    expect(normalizeMealInputMethod("photo")).toBe("photo");
    expect(normalizeMealInputMethod("saved")).toBe("saved");
    expect(normalizeMealInputMethod("legacy")).toBeNull();
  });

  it("serializes and hydrates aiMeta safely", () => {
    const raw = serializeMealAiMeta({
      model: "gpt-5.4-mini",
      runId: "run-1",
      confidence: 0.92,
      warnings: ["low_confidence_ingredient"],
    });

    expect(raw).toBe(
      JSON.stringify({
        model: "gpt-5.4-mini",
        runId: "run-1",
        confidence: 0.92,
        warnings: ["low_confidence_ingredient"],
      }),
    );
    expect(parseMealAiMeta(raw)).toEqual({
      model: "gpt-5.4-mini",
      runId: "run-1",
      confidence: 0.92,
      warnings: ["low_confidence_ingredient"],
    });
  });

  it("returns null for malformed or empty aiMeta payloads", () => {
    expect(parseMealAiMeta("{bad-json")).toBeNull();
    expect(normalizeMealAiMeta({ foo: "bar" })).toBeNull();
    expect(serializeMealAiMeta(null)).toBeNull();
  });

  it("extracts aiMeta from AI responses only when supported fields exist", () => {
    expect(
      getMealAiMetaFromAiResponse({
        model: "gpt-5.4",
        runId: "run-2",
        confidence: 0.7,
        warnings: ["partial_totals"],
      }),
    ).toEqual({
      model: "gpt-5.4",
      runId: "run-2",
      confidence: 0.7,
      warnings: ["partial_totals"],
    });
    expect(
      getMealAiMetaFromAiResponse({
        version: "2026-03-01",
      }),
    ).toBeNull();
  });

  it("normalizes canonical meal day keys", () => {
    expect(normalizeMealDayKey("2026-03-18")).toBe("2026-03-18");
    expect(normalizeMealDayKey("bad-day")).toBeNull();
    expect(formatMealDayKey(new Date(2026, 2, 18, 23, 30))).toBe("2026-03-18");
  });

  it("selects a late-night meal by explicit dayKey instead of timestamp day", () => {
    const meal = makeMeal({
      mealId: "late-night",
      dayKey: "2026-03-18",
      timestamp: "2026-03-19T00:30:00.000Z",
      createdAt: "2026-03-19T00:30:00.000Z",
      updatedAt: "2026-03-19T00:30:00.000Z",
    });

    expect(getMealDayKey(meal)).toBe("2026-03-18");
    expect(getMealsForDayKey([meal], "2026-03-18")).toEqual([meal]);
    expect(getMealsForDayKey([meal], "2026-03-19")).toEqual([]);
  });
});
