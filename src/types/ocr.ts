export type Basis = "100g" | "serving" | "unknown";
export type Unit = "g" | "ml";

export type ParsedNutrition = {
  basis: Basis;
  unit: Unit;
  protein: number;
  fat: number;
  carbs: number;
  kcal: number;
};
