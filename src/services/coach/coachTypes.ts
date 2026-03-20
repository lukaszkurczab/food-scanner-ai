export type CoachInsightType =
  | "under_logging"
  | "high_unknown_meal_details"
  | "low_protein_consistency"
  | "calorie_under_target"
  | "positive_momentum"
  | "stable";

export type CoachActionType =
  | "log_next_meal"
  | "open_chat"
  | "review_history"
  | "none";

export type CoachSource = "rules";

export type CoachEmptyReason = "no_data" | "insufficient_data";

export type CoachInsight = {
  id: string;
  type: CoachInsightType;
  priority: number;
  title: string;
  body: string;
  actionLabel: string | null;
  actionType: CoachActionType;
  reasonCodes: string[];
  source: CoachSource;
  validUntil: string | null;
  confidence: number;
  isPositive: boolean;
};

export type CoachMeta = {
  available: boolean;
  emptyReason: CoachEmptyReason | null;
  isDegraded: boolean;
};

export type CoachResponse = {
  dayKey: string;
  computedAt: string;
  source: CoachSource;
  insights: CoachInsight[];
  topInsight: CoachInsight | null;
  meta: CoachMeta;
};

export type CoachResponseSource =
  | "disabled"
  | "remote"
  | "memory"
  | "storage"
  | "fallback";

export type CoachResult = {
  coach: CoachResponse;
  source: CoachResponseSource;
  enabled: boolean;
  isStale: boolean;
  error: unknown | null;
};
