/**
 * Cross-repo contract alignment tests.
 *
 * These tests validate that the canonical JSON fixtures in
 * `src/__contract_fixtures__/` match the mobile TypeScript type
 * definitions.  Mirror fixtures live in the backend repo at
 * `tests/contract_fixtures/`.
 *
 * When a fixture changes, the corresponding test must break in
 * *both* repos to prevent silent drift.
 */

import * as fs from "fs";
import * as path from "path";

import type { Meal, MealType, MealSyncState, MealInputMethod, MealSource } from "@/types/meal";
import type {
  CoachActionType,
  CoachEmptyReason,
  CoachInsightType,
  CoachResponse,
  CoachSource,
} from "@/services/coach/coachTypes";
import type {
  ReminderDecision,
  ReminderDecisionType,
  ReminderKind,
  ReminderReasonCode,
} from "@/services/reminders/reminderTypes";
import type {
  NutritionState,
  NutritionTopRisk,
  NutritionCoachPriority,
} from "@/services/nutritionState/nutritionStateTypes";
import {
  COACH_ACTION_TYPES,
  COACH_EMPTY_REASONS,
  COACH_INSIGHT_TYPES,
  COACH_SOURCES,
  getCoachInsightId,
  getCoachInsightValidUntil,
} from "@/services/coach/coachContract";
import {
  REMINDER_DECISION_TYPES,
  REMINDER_KINDS,
  REMINDER_REASON_CODES,
} from "@/services/reminders/reminderTypes";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FIXTURES_DIR = path.join(__dirname);

function loadFixture<T = unknown>(name: string): T {
  const raw = fs.readFileSync(path.join(FIXTURES_DIR, name), "utf-8");
  return JSON.parse(raw) as T;
}

// ---------------------------------------------------------------------------
// Fixture: enums.json — canonical enum values
// ---------------------------------------------------------------------------

type EnumsFixture = {
  MealType: string[];
  MealSyncState: string[];
  MealInputMethod: string[];
  MealSource: string[];
  GatewayRejectReasons: string[];
  TopRisk: string[];
  CoachPriority: string[];
  AiTier: string[];
  ReminderDecisionType: string[];
  ReminderKind: string[];
  ReminderReasonCode: string[];
};

type SmartReminderTelemetryFixture = {
  eventNames: string[];
  propsByEvent: Record<string, string[]>;
  disallowedEventNames: string[];
};

describe("Enum parity", () => {
  const enums = loadFixture<EnumsFixture>("enums.json");

  // These arrays are the single source of truth on the mobile side.
  // They must exactly match the fixture (which is the single source of
  // truth for the backend).  If either side adds/removes a value, the
  // test breaks.

  const MOBILE_MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack", "other"];
  const MOBILE_SYNC_STATES: MealSyncState[] = ["synced", "pending", "conflict", "failed"];
  const MOBILE_INPUT_METHODS: MealInputMethod[] = [
    "manual", "photo", "barcode", "text", "saved", "quick_add",
  ];
  const MOBILE_MEAL_SOURCES: NonNullable<MealSource>[] = ["ai", "manual", "saved"];
  const MOBILE_TOP_RISKS: NutritionTopRisk[] = [
    "none", "under_logging", "low_protein_consistency",
    "high_unknown_meal_details", "calorie_under_target",
  ];
  const MOBILE_COACH_PRIORITIES: NutritionCoachPriority[] = [
    "maintain", "logging_foundation", "protein_consistency",
    "meal_detail_quality", "calorie_adherence",
  ];
  const MOBILE_AI_TIERS: Array<"free" | "premium"> = ["free", "premium"];
  const MOBILE_REMINDER_DECISION_TYPES: ReminderDecisionType[] = [...REMINDER_DECISION_TYPES];
  const MOBILE_REMINDER_KINDS: ReminderKind[] = [...REMINDER_KINDS];
  const MOBILE_REMINDER_REASON_CODES: ReminderReasonCode[] = [...REMINDER_REASON_CODES];

  // Gateway reject reasons — must match useChatHistory.ts GATEWAY_REJECT_REASONS
  // (minus ML_OFF_TOPIC which is mobile-only for future ML classifier)
  const BACKEND_REJECT_REASONS = ["OFF_TOPIC", "TOO_SHORT"];

  test("MealType values match backend", () => {
    expect([...MOBILE_MEAL_TYPES].sort()).toEqual([...enums.MealType].sort());
  });

  test("MealSyncState values match backend", () => {
    expect([...MOBILE_SYNC_STATES].sort()).toEqual([...enums.MealSyncState].sort());
  });

  test("MealInputMethod values match backend", () => {
    expect([...MOBILE_INPUT_METHODS].sort()).toEqual([...enums.MealInputMethod].sort());
  });

  test("MealSource values match backend", () => {
    expect([...MOBILE_MEAL_SOURCES].sort()).toEqual([...enums.MealSource].sort());
  });

  test("GatewayRejectReasons match backend", () => {
    expect([...BACKEND_REJECT_REASONS].sort()).toEqual(
      [...enums.GatewayRejectReasons].sort(),
    );
  });

  test("TopRisk values match backend", () => {
    expect([...MOBILE_TOP_RISKS].sort()).toEqual([...enums.TopRisk].sort());
  });

  test("CoachPriority values match backend", () => {
    expect([...MOBILE_COACH_PRIORITIES].sort()).toEqual([...enums.CoachPriority].sort());
  });

  test("AiTier values match backend", () => {
    expect([...MOBILE_AI_TIERS].sort()).toEqual([...enums.AiTier].sort());
  });

  test("ReminderDecisionType values match backend", () => {
    expect([...MOBILE_REMINDER_DECISION_TYPES].sort()).toEqual(
      [...enums.ReminderDecisionType].sort(),
    );
  });

  test("ReminderKind values match backend", () => {
    expect([...MOBILE_REMINDER_KINDS].sort()).toEqual(
      [...enums.ReminderKind].sort(),
    );
  });

  test("ReminderReasonCode values match backend", () => {
    expect([...MOBILE_REMINDER_REASON_CODES].sort()).toEqual(
      [...enums.ReminderReasonCode].sort(),
    );
  });
});

// ---------------------------------------------------------------------------
// Fixture: meal_item.json — canonical meal shape
// ---------------------------------------------------------------------------

describe("Meal item contract", () => {
  const meal = loadFixture<Meal>("meal_item.json");

  test("has all required fields", () => {
    expect(meal.userUid).toBe("user-contract-1");
    expect(meal.mealId).toBe("meal-contract-1");
    expect(typeof meal.timestamp).toBe("string");
    expect(meal.type).toBe("lunch");
    expect(Array.isArray(meal.ingredients)).toBe(true);
    expect(typeof meal.createdAt).toBe("string");
    expect(typeof meal.updatedAt).toBe("string");
    expect(meal.syncState).toBe("synced");
  });

  test("ingredient shape matches", () => {
    const ing = meal.ingredients[0];
    expect(ing).toBeDefined();
    expect(typeof ing.id).toBe("string");
    expect(typeof ing.name).toBe("string");
    expect(typeof ing.amount).toBe("number");
    expect(ing.unit).toBe("g");
    expect(typeof ing.kcal).toBe("number");
    expect(typeof ing.protein).toBe("number");
    expect(typeof ing.fat).toBe("number");
    expect(typeof ing.carbs).toBe("number");
  });

  test("optional Foundation Sprint fields present", () => {
    expect(meal.dayKey).toBe("2026-03-18");
    expect(meal.loggedAtLocalMin).toBe(780);
    expect(meal.tzOffsetMin).toBe(60);
    expect(meal.source).toBe("ai");
    expect(meal.inputMethod).toBe("photo");
    expect(meal.aiMeta).toBeDefined();
    expect(meal.aiMeta?.model).toBe("gpt-4o");
    expect(meal.aiMeta?.confidence).toBe(0.88);
    expect(meal.totals?.kcal).toBe(330.0);
    expect(meal.totals?.protein).toBe(62.0);
  });

  test("fixture type field is a valid MealType", () => {
    const VALID: MealType[] = ["breakfast", "lunch", "dinner", "snack", "other"];
    expect(VALID).toContain(meal.type);
  });
});

// ---------------------------------------------------------------------------
// Fixture: nutrition_state.json — canonical state shape
// ---------------------------------------------------------------------------

describe("Nutrition state contract", () => {
  const state = loadFixture<NutritionState>("nutrition_state.json");

  test("top-level keys match NutritionState type", () => {
    const expectedKeys = [
      "computedAt", "dayKey", "targets", "consumed", "remaining",
      "overTarget", "quality", "habits", "streak", "ai", "meta",
    ];
    expect(Object.keys(state).sort()).toEqual(expectedKeys.sort());
  });

  test("targets / consumed / remaining shapes", () => {
    expect(typeof state.targets.kcal).toBe("number");
    expect(typeof state.consumed.protein).toBe("number");
    expect(typeof state.remaining.carbs).toBe("number");
    expect(typeof state.overTarget.kcal).toBe("number");
  });

  test("quality shape", () => {
    expect(typeof state.quality.mealsLogged).toBe("number");
    expect(typeof state.quality.missingNutritionMeals).toBe("number");
    expect(typeof state.quality.dataCompletenessScore).toBe("number");
  });

  test("habits summary shape", () => {
    expect(state.habits.available).toBe(true);
    expect(typeof state.habits.behavior.loggingDays7).toBe("number");
    expect(typeof state.habits.behavior.validLoggingDays7).toBe("number");
    expect(typeof state.habits.behavior.loggingConsistency28).toBe("number");
    expect(typeof state.habits.behavior.validLoggingConsistency28).toBe("number");
    expect(typeof state.habits.behavior.avgValidMealsPerValidLoggedDay14).toBe("number");
    expect(typeof state.habits.behavior.mealTypeCoverage14.coveredCount).toBe("number");
    expect(typeof state.habits.behavior.mealTypeFrequency14.lunch).toBe("number");
    expect(typeof state.habits.behavior.dayCoverage14.validLoggedDays).toBe("number");
    expect(typeof state.habits.behavior.proteinDaysHit14.ratio).toBe("number");
    expect(state.habits.behavior.timingPatterns14.available).toBe(true);
    expect(typeof state.habits.behavior.timingPatterns14.firstMealMedianHour).toBe("number");
    expect(typeof state.habits.dataQuality.daysUsingTimestampTimingFallback14).toBe("number");
  });

  test("streak summary shape", () => {
    expect(state.streak.available).toBe(true);
    expect(typeof state.streak.current).toBe("number");
    expect(typeof state.streak.lastDate).toBe("string");
  });

  test("AI summary shape", () => {
    expect(state.ai.available).toBe(true);
    expect(state.ai.tier).toBe("free");
    expect(typeof state.ai.balance).toBe("number");
    expect(typeof state.ai.costs.chat).toBe("number");
    expect(typeof state.ai.costs.photo).toBe("number");
    expect(state.meta.isDegraded).toBe(false);
    expect(state.meta.componentStatus.habits).toBe("ok");
  });
});

// ---------------------------------------------------------------------------
// Fixture: coach_response.json — canonical coach shape
// ---------------------------------------------------------------------------

describe("Coach response contract", () => {
  const coach = loadFixture<CoachResponse>("coach_response.json");

  const MOBILE_COACH_INSIGHT_TYPES: CoachInsightType[] = COACH_INSIGHT_TYPES;
  const MOBILE_COACH_ACTION_TYPES: CoachActionType[] = COACH_ACTION_TYPES;
  const MOBILE_COACH_SOURCES: CoachSource[] = COACH_SOURCES;
  const MOBILE_COACH_EMPTY_REASONS: CoachEmptyReason[] = COACH_EMPTY_REASONS;

  test("top-level keys match CoachResponse type", () => {
    const expectedKeys = [
      "dayKey",
      "computedAt",
      "source",
      "insights",
      "topInsight",
      "meta",
    ];
    expect(Object.keys(coach).sort()).toEqual(expectedKeys.sort());
  });

  test("coach response shape", () => {
    expect(coach.dayKey).toBe("2026-03-18");
    expect(coach.computedAt).toBe("2026-03-18T12:00:00Z");
    expect(MOBILE_COACH_SOURCES).toContain(coach.source);
    expect(Array.isArray(coach.insights)).toBe(true);
    expect(coach.insights).toHaveLength(1);
    expect(coach.topInsight?.type).toBe("positive_momentum");
    expect(coach.meta.available).toBe(true);
    expect(coach.meta.emptyReason).toBeNull();
    expect(coach.meta.isDegraded).toBe(false);
  });

  test("coach insight enum values match mobile contract", () => {
    expect(MOBILE_COACH_INSIGHT_TYPES).toContain(coach.insights[0]?.type);
    expect(MOBILE_COACH_ACTION_TYPES).toContain(coach.insights[0]?.actionType);
  });

  test("coach empty reason values match mobile contract", () => {
    expect(MOBILE_COACH_EMPTY_REASONS).toContain("no_data");
    expect(MOBILE_COACH_EMPTY_REASONS).toContain("insufficient_data");
    expect(coach.meta.emptyReason).toBeNull();
  });

  test("canonical fixture matches runtime contract assumptions", () => {
    expect(coach.topInsight).not.toBeNull();
    expect(coach.insights).toHaveLength(1);
    expect(coach.insights[0]).toEqual(coach.topInsight);
    expect(coach.topInsight?.id).toBe(
      getCoachInsightId(coach.dayKey, coach.topInsight!.type),
    );
    expect(coach.topInsight?.validUntil).toBe(
      getCoachInsightValidUntil(coach.dayKey),
    );
    expect(coach.topInsight?.reasonCodes).toEqual([
      "streak_positive",
      "consistency_improving",
    ]);
  });
});

// ---------------------------------------------------------------------------
// Fixture: reminder_decision.json — canonical reminder decision shape
// ---------------------------------------------------------------------------

describe("Reminder decision contract", () => {
  const sendReminder = loadFixture<ReminderDecision>("reminder_decision.json");
  const suppressReminder = loadFixture<ReminderDecision>("reminder_decision_suppress.json");
  const noopReminder = loadFixture<ReminderDecision>("reminder_decision_noop.json");

  test("top-level keys match ReminderDecision type", () => {
    const expectedKeys = [
      "dayKey",
      "computedAt",
      "decision",
      "kind",
      "reasonCodes",
      "scheduledAtUtc",
      "confidence",
      "validUntil",
    ];
    expect(Object.keys(sendReminder).sort()).toEqual(expectedKeys.sort());
    expect(Object.keys(suppressReminder).sort()).toEqual(expectedKeys.sort());
    expect(Object.keys(noopReminder).sort()).toEqual(expectedKeys.sort());
  });

  test("send reminder decision shape", () => {
    expect(sendReminder.dayKey).toBe("2026-03-18");
    expect(sendReminder.computedAt).toBe("2026-03-18T12:00:00Z");
    expect(REMINDER_DECISION_TYPES).toContain(sendReminder.decision);
    expect(REMINDER_KINDS).toContain(sendReminder.kind!);
    expect(Array.isArray(sendReminder.reasonCodes)).toBe(true);
    expect(sendReminder.reasonCodes).toEqual([
      "preferred_window_today",
      "day_partially_logged",
    ]);
    expect(sendReminder.scheduledAtUtc).toBe("2026-03-18T18:30:00Z");
    expect(sendReminder.confidence).toBe(0.84);
    expect(sendReminder.validUntil).toBe("2026-03-18T19:30:00Z");
  });

  test("suppress and noop semantics stay explicit", () => {
    expect(suppressReminder.decision).toBe("suppress");
    expect(suppressReminder.kind).toBeNull();
    expect(suppressReminder.scheduledAtUtc).toBeNull();
    expect(suppressReminder.reasonCodes).toEqual(["quiet_hours"]);

    expect(noopReminder.decision).toBe("noop");
    expect(noopReminder.kind).toBeNull();
    expect(noopReminder.scheduledAtUtc).toBeNull();
    expect(noopReminder.reasonCodes).toEqual(["insufficient_signal"]);
  });

  test("reason codes match mobile contract", () => {
    for (const reasonCode of [
      ...sendReminder.reasonCodes,
      ...suppressReminder.reasonCodes,
      ...noopReminder.reasonCodes,
    ]) {
      expect(REMINDER_REASON_CODES).toContain(reasonCode);
    }
  });

  test("send semantics stay explicit", () => {
    expect(sendReminder.decision).toBe("send");
    expect(sendReminder.kind).toBe("log_next_meal");
    expect(typeof sendReminder.scheduledAtUtc).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// Fixture: smart_reminder_telemetry.json — canonical smart reminder telemetry
// ---------------------------------------------------------------------------

describe("Smart reminder telemetry contract", () => {
  const fixture = loadFixture<SmartReminderTelemetryFixture>("smart_reminder_telemetry.json");

  const MOBILE_EVENT_NAMES = [
    "smart_reminder_suppressed",
    "smart_reminder_scheduled",
    "smart_reminder_noop",
    "smart_reminder_decision_failed",
    "smart_reminder_schedule_failed",
  ] as const;

  const MOBILE_PROPS_BY_EVENT = {
    smart_reminder_suppressed: [
      "decision",
      "suppressionReason",
      "confidenceBucket",
    ],
    smart_reminder_scheduled: [
      "reminderKind",
      "decision",
      "confidenceBucket",
      "scheduledWindow",
    ],
    smart_reminder_noop: [
      "decision",
      "noopReason",
      "confidenceBucket",
    ],
    smart_reminder_decision_failed: [
      "failureReason",
    ],
    smart_reminder_schedule_failed: [
      "reminderKind",
      "decision",
      "confidenceBucket",
      "failureReason",
    ],
  } as const;

  test("event names match backend fixture", () => {
    expect([...fixture.eventNames].sort()).toEqual([...MOBILE_EVENT_NAMES].sort());
  });

  test("props match backend fixture", () => {
    expect(Object.keys(fixture.propsByEvent).sort()).toEqual(
      Object.keys(MOBILE_PROPS_BY_EVENT).sort(),
    );

    for (const [eventName, propNames] of Object.entries(MOBILE_PROPS_BY_EVENT)) {
      expect([...fixture.propsByEvent[eventName]].sort()).toEqual([...propNames].sort());
    }
  });

  test("disallowed smart reminder telemetry events stay disallowed on mobile", () => {
    expect(fixture.disallowedEventNames.sort()).toEqual(
      ["smart_reminder_decision_computed", "smart_reminder_opened"].sort(),
    );
  });
});

// ---------------------------------------------------------------------------
// Fixture: gateway_reject.json — HTTP 400 reject shape
// ---------------------------------------------------------------------------

describe("Gateway reject contract", () => {
  const fixture = loadFixture<{ detail: Record<string, unknown> }>("gateway_reject.json");

  test("detail has required fields", () => {
    const { detail } = fixture;
    expect(detail.message).toBe("AI request blocked by gateway");
    expect(detail.code).toBe("AI_GATEWAY_BLOCKED");
    expect(typeof detail.reason).toBe("string");
    expect(typeof detail.score).toBe("number");
  });

  test("reason is in mobile GATEWAY_REJECT_REASONS", () => {
    // Mirror of useChatHistory.ts line 39
    const GATEWAY_REJECT_REASONS = new Set(["OFF_TOPIC", "ML_OFF_TOPIC", "TOO_SHORT"]);
    expect(GATEWAY_REJECT_REASONS.has(fixture.detail.reason as string)).toBe(true);
  });
});
