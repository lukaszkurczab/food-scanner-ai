import type { HomeDayState } from "@/feature/Home/services/homeDaySelectors";

type Translate = (key: string, options?: Record<string, unknown>) => string;

export type HomeHeroModel = {
  title: string;
  meta: string;
  ctaLabel: string;
  ctaAction: "review_history" | "add_meal";
  tone: "default" | "success";
  supportText: string | null;
  showMethodSelector: boolean;
  progress: number | null;
  supportCopy: string | null;
};

type GreetingKey = "morning" | "afternoon" | "evening";

function getGreetingKey(hour: number): GreetingKey {
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

function getMealCountLabel(t: Translate, count: number): string {
  return t("home:mealCount", { count });
}

function buildKcalProgressLabel(params: {
  numberFormatter: Intl.NumberFormat;
  totalCalories: number;
  goalCalories: number;
}): string {
  const consumedLabel = params.numberFormatter.format(params.totalCalories);
  if (params.goalCalories > 0) {
    return `${consumedLabel} / ${params.numberFormatter.format(params.goalCalories)} kcal`;
  }

  return `${consumedLabel} kcal`;
}

export function buildHomeHeroModel(params: {
  dayState: Pick<
    HomeDayState,
    "consumed" | "goalCalories" | "isToday" | "kcalProgress" | "mealCount" | "status"
  >;
  selectedDate: Date;
  displayName: string | null;
  t: Translate;
  numberFormatter: Intl.NumberFormat;
  fullDateFormatter: Intl.DateTimeFormat;
  now?: Date;
}): HomeHeroModel {
  const { dayState, displayName, fullDateFormatter, numberFormatter, selectedDate, t } =
    params;
  const totalCalories = dayState.consumed.kcal;
  const kcalProgressLabel = buildKcalProgressLabel({
    numberFormatter,
    totalCalories,
    goalCalories: dayState.goalCalories,
  });

  if (dayState.status === "completed") {
    return {
      title: displayName
        ? t("home:hero.completed.title", { name: displayName })
        : t("home:hero.completed.titleGeneric"),
      meta: `${kcalProgressLabel} · ${getMealCountLabel(t, dayState.mealCount)}`,
      ctaLabel: t("home:hero.completed.cta"),
      ctaAction: "review_history",
      tone: "success",
      supportText: t("home:hero.completed.support"),
      showMethodSelector: false,
      progress: null,
      supportCopy: null,
    };
  }

  if (dayState.status === "past_empty") {
    return {
      title: fullDateFormatter.format(selectedDate),
      meta: t("home:hero.pastIncomplete.meta"),
      ctaLabel: t("home:hero.pastIncomplete.cta"),
      ctaAction: "add_meal",
      tone: "default",
      supportText: null,
      showMethodSelector: true,
      progress: null,
      supportCopy: t("home:hero.pastIncomplete.supportCopy"),
    };
  }

  const greetingKey = getGreetingKey((params.now ?? new Date()).getHours());
  const greeting = displayName
    ? t(`home:hero.greeting.${greetingKey}`, { name: displayName })
    : t(`home:hero.greetingGeneric.${greetingKey}`);

  if (dayState.status === "today_empty") {
    return {
      title: greeting,
      meta: fullDateFormatter.format(selectedDate),
      ctaLabel: t("home:hero.todayEmpty.cta"),
      ctaAction: "add_meal",
      tone: "default",
      supportText: null,
      showMethodSelector: true,
      progress: null,
      supportCopy: t("home:hero.todayEmpty.supportCopy"),
    };
  }

  return {
    title: dayState.isToday ? greeting : fullDateFormatter.format(selectedDate),
    meta: `${getMealCountLabel(t, dayState.mealCount)} · ${kcalProgressLabel}`,
    ctaLabel: dayState.isToday
      ? t("home:hero.todayInProgress.cta")
      : t("home:hero.pastIncomplete.cta"),
    ctaAction: "add_meal",
    tone: "default",
    supportText: null,
    showMethodSelector: true,
    progress: dayState.kcalProgress,
    supportCopy: null,
  };
}
