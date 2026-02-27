import { describe, expect, it } from "@jest/globals";
import { calculateMacroTargets } from "@/utils/calculateMacroTargets";

describe("calculateMacroTargets", () => {
  it("returns null for non-positive calorie target", () => {
    expect(calculateMacroTargets({ calorieTarget: 0 })).toBeNull();
    expect(calculateMacroTargets({ calorieTarget: -200 })).toBeNull();
  });

  it("uses balanced style when preferences are missing", () => {
    expect(calculateMacroTargets({ calorieTarget: 2000 })).toEqual({
      proteinGrams: 125,
      fatGrams: 65,
      carbsGrams: 225,
      proteinKcal: 500,
      fatKcal: 585,
      carbsKcal: 900,
    });
  });

  it("uses style priority order when multiple preferences are present", () => {
    expect(
      calculateMacroTargets({
        calorieTarget: 2000,
        preferences: ["balanced", "keto"],
      }),
    ).toEqual({
      proteinGrams: 100,
      fatGrams: 155,
      carbsGrams: 50,
      proteinKcal: 400,
      fatKcal: 1395,
      carbsKcal: 200,
    });
  });

  it("covers all style mappings for base ratios", () => {
    const cases = [
      {
        pref: "lowCarb",
        expected: { proteinGrams: 150, fatGrams: 90, carbsGrams: 150 },
      },
      {
        pref: "highCarb",
        expected: { proteinGrams: 125, fatGrams: 45, carbsGrams: 275 },
      },
      {
        pref: "lowFat",
        expected: { proteinGrams: 125, fatGrams: 35, carbsGrams: 300 },
      },
      {
        pref: "highProtein",
        expected: { proteinGrams: 150, fatGrams: 55, carbsGrams: 225 },
      },
      {
        pref: "mediterranean",
        expected: { proteinGrams: 100, fatGrams: 80, carbsGrams: 225 },
      },
      {
        pref: "paleo",
        expected: { proteinGrams: 150, fatGrams: 80, carbsGrams: 175 },
      },
    ] as const;

    cases.forEach(({ pref, expected }) => {
      expect(
        calculateMacroTargets({ calorieTarget: 2000, preferences: [pref] }),
      ).toEqual(
        expect.objectContaining({
          ...expected,
        }),
      );
    });
  });

  it("adjusts macro ratios for lose goal", () => {
    expect(
      calculateMacroTargets({
        calorieTarget: 2000,
        preferences: ["highProtein"],
        goal: "lose",
      }),
    ).toEqual(
      expect.objectContaining({
        proteinGrams: 175,
        fatGrams: 55,
        carbsGrams: 200,
      }),
    );
  });

  it("adjusts macro ratios for increase goal", () => {
    expect(
      calculateMacroTargets({
        calorieTarget: 2000,
        preferences: ["lowFat"],
        goal: "increase",
      }),
    ).toEqual(
      expect.objectContaining({
        proteinGrams: 100,
        fatGrams: 45,
        carbsGrams: 300,
      }),
    );
  });

  it("rounds calorie target before calculations", () => {
    expect(
      calculateMacroTargets({
        calorieTarget: 1999.6,
      }),
    ).toEqual(
      expect.objectContaining({
        proteinGrams: 125,
        fatGrams: 65,
        carbsGrams: 225,
      }),
    );
  });
});
