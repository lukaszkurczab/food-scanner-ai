export type MetricKey = "kcal" | "protein" | "carbs" | "fat";

export type RangeKey = "7d" | "30d" | "custom";

export type DateRange = {
  start: Date;
  end: Date;
};

export type StatisticsEmptyKind =
  | "none"
  | "no_history"
  | "no_entries_in_range";
