export type UnitsSystem = "metric" | "imperial";
export type Sex = "male" | "female" | null;

export type Goal = "lose" | "maintain" | "increase";
export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";
export type Preference =
  | "lowCarb"
  | "keto"
  | "highProtein"
  | "highCarb"
  | "lowFat"
  | "balanced"
  | "vegetarian"
  | "vegan"
  | "pescatarian"
  | "mediterranean"
  | "glutenFree"
  | "dairyFree"
  | "paleo";

export type FormData = {
  unitsSystem: "metric" | "imperial";
  age: string;
  sex: "male" | "female" | null;
  height: string;
  heightInch?: string;
  weight: string;
  preferences: Preference[];
  activityLevel: ActivityLevel | "";
  goal: Goal | "";
  calorieDeficit?: number;
  calorieSurplus?: number;
};
