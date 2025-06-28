type Gender = "male" | "female";
type Goal = "reduction" | "maintenance" | "mass";

export interface UserInput {
  gender: Gender;
  age: number;
  weight: number;
  height: number;
  activityLevel: number;
  goal: Goal;
}

export interface CalorieResult {
  bmr: number;
  tdee: number;
  adjustedTdee: number;
}

export type NutritionSurvey = UserInput & CalorieResult;
