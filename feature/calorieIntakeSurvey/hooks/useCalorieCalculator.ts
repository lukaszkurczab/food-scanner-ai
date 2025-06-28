import { useMemo } from "react";
import { CalorieResult, UserInput } from "../types/types";

export const useCalorieCalculator = (input: UserInput): CalorieResult => {
  const { gender, age, weight, height, activityLevel, goal } = input;

  const result = useMemo(() => {
    const bmr =
      gender === "male"
        ? 10 * weight + 6.25 * height - 5 * age + 5
        : 10 * weight + 6.25 * height - 5 * age - 161;

    const tdee = bmr * activityLevel;

    let adjustedTdee = tdee;
    if (goal === "reduction") {
      adjustedTdee = tdee * 0.85;
    } else if (goal === "mass") {
      adjustedTdee = tdee * 1.1;
    }

    return {
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      adjustedTdee: Math.round(adjustedTdee),
    };
  }, [gender, age, weight, height, activityLevel, goal]);

  return result;
};
