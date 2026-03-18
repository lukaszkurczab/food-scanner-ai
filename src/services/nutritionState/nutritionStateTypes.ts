export type NutritionTopRisk =
  | "none"
  | "under_logging"
  | "low_protein_consistency"
  | "high_unknown_meal_details"
  | "calorie_under_target";

export type NutritionCoachPriority =
  | "maintain"
  | "logging_foundation"
  | "protein_consistency"
  | "meal_detail_quality"
  | "calorie_adherence";

export type NutritionTargets = {
  kcal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
};

export type NutritionConsumed = {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type NutritionRemaining = {
  kcal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
};

export type NutritionQuality = {
  mealsLogged: number;
  missingNutritionMeals: number;
  dataCompletenessScore: number;
};

export type NutritionMealTypeCoverage14 = {
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
  snack: boolean;
  other: boolean;
  coveredCount: number;
};

export type NutritionProteinDaysHit14 = {
  hitDays: number;
  eligibleDays: number;
  unknownDays: number;
  ratio: number | null;
};

export type NutritionBehavior = {
  loggingDays7: number;
  loggingConsistency28: number;
  avgMealsPerLoggedDay14: number;
  mealTypeCoverage14: NutritionMealTypeCoverage14;
  kcalAdherence14: number | null;
  kcalUnderTargetRatio14: number | null;
  proteinDaysHit14: NutritionProteinDaysHit14;
};

export type NutritionDataQuality = {
  daysWithUnknownMealDetails14: number;
};

export type NutritionHabitsSummary = {
  available: boolean;
  behavior: NutritionBehavior;
  dataQuality: NutritionDataQuality;
  topRisk: NutritionTopRisk;
  coachPriority: NutritionCoachPriority;
};

export type NutritionStreakSummary = {
  available: boolean;
  current: number;
  lastDate: string | null;
};

export type NutritionAiCosts = {
  chat: number;
  textMeal: number;
  photo: number;
};

export type NutritionAiSummary = {
  available: boolean;
  tier: "free" | "premium" | null;
  balance: number | null;
  allocation: number | null;
  usedThisPeriod: number | null;
  periodStartAt: string | null;
  periodEndAt: string | null;
  costs: NutritionAiCosts;
};

export type NutritionState = {
  computedAt: string;
  dayKey: string;
  targets: NutritionTargets;
  consumed: NutritionConsumed;
  remaining: NutritionRemaining;
  quality: NutritionQuality;
  habits: NutritionHabitsSummary;
  streak: NutritionStreakSummary;
  ai: NutritionAiSummary;
};

export type NutritionStateSource =
  | "disabled"
  | "remote"
  | "memory"
  | "storage"
  | "fallback";

export type NutritionStateResult = {
  state: NutritionState;
  source: NutritionStateSource;
  enabled: boolean;
  isStale: boolean;
  error: unknown | null;
};

