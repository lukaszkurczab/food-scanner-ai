export const UNITS = ["metric", "imperial"] as const;
export const SEX_NON_NULL = ["male", "female"] as const;

export const GOALS = ["lose", "maintain", "increase"] as const;
export const ACTIVITY = [
  "sedentary",
  "light",
  "moderate",
  "active",
  "very_active",
] as const;

export const PREFERENCES = [
  "lowCarb",
  "keto",
  "highProtein",
  "highCarb",
  "lowFat",
  "balanced",
  "vegetarian",
  "vegan",
  "pescatarian",
  "mediterranean",
  "glutenFree",
  "dairyFree",
  "paleo",
] as const;

export const CHRONIC = [
  "none",
  "diabetes",
  "hypertension",
  "asthma",
  "other",
] as const;
export const ALLERGIES = [
  "none",
  "peanuts",
  "gluten",
  "lactose",
  "other",
] as const;

export const AI_STYLE = ["none", "concise", "friendly", "detailed"] as const;
export const AI_FOCUS = [
  "none",
  "mealPlanning",
  "analyzingMistakes",
  "quickAnswers",
  "motivation",
  "other",
] as const;
