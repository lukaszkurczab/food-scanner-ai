import { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Layout, Modal } from "@/components";
import { useTheme } from "@/theme/useTheme";
import { useTranslation } from "react-i18next";
import { useUserContext } from "@/context/UserContext";
import { useAuthContext } from "@/context/AuthContext";
import { useMeals } from "@/hooks/useMeals";
import { useNutritionState } from "@/hooks/useNutritionState";
import { calculateTotalNutrients } from "@/utils/calculateTotalNutrients";
import { calculateMacroTargets } from "@/utils/calculateMacroTargets";
import WeekStrip, { type WeekDayItem } from "@/components/WeekStrip";
import { MacroTargetsRow } from "../components/MacroTargetsRow";
import { TodaysMealsList } from "../components/TodaysMealsList";
import HomeHeroCard from "../components/HomeHeroCard";
import type { Meal } from "@/types/meal";
import type { StackNavigationProp } from "@react-navigation/stack";
import type { RootStackParamList } from "@/navigation/navigate";
import type {
  NutritionTargets,
} from "@/services/nutritionState/nutritionStateTypes";
import type { MacroTargets } from "@/utils/calculateMacroTargets";
import { useMealAddMethodState } from "@/feature/Meals/hooks/useMealAddMethodState";

function startEndOfLocalDay(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start: start.getTime(), end: end.getTime() };
}

function parseMealTs(meal: Meal): number | null {
  const raw = meal.timestamp || meal.createdAt;
  if (!raw) return null;
  if (typeof raw === "number") return raw;
  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? null : parsed;
}

function getMealsForDate(allMeals: Meal[], date: Date): Meal[] {
  const { start, end } = startEndOfLocalDay(date);

  return allMeals
    .filter((meal) => {
      const timestamp = parseMealTs(meal);
      return timestamp !== null && timestamp >= start && timestamp < end;
    })
    .sort((left, right) => {
      const leftTimestamp = parseMealTs(left) ?? 0;
      const rightTimestamp = parseMealTs(right) ?? 0;
      return leftTimestamp - rightTimestamp;
    });
}

function buildLast7Days(): WeekDayItem[] {
  const now = new Date();
  const todayString = now.toDateString();

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() - (6 - index));

    return {
      date,
      label: String(date.getDate()).padStart(2, "0"),
      isToday: date.toDateString() === todayString,
    };
  });
}

function toLocalDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function hasTargetValue(value: number | null): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function toMacroTargets(targets: NutritionTargets): MacroTargets | null {
  if (
    !hasTargetValue(targets.protein) &&
    !hasTargetValue(targets.carbs) &&
    !hasTargetValue(targets.fat)
  ) {
    return null;
  }

  const proteinGrams = targets.protein ?? 0;
  const carbsGrams = targets.carbs ?? 0;
  const fatGrams = targets.fat ?? 0;

  return {
    proteinGrams,
    carbsGrams,
    fatGrams,
    proteinKcal: Math.round(proteinGrams * 4),
    carbsKcal: Math.round(carbsGrams * 4),
    fatKcal: Math.round(fatGrams * 9),
  };
}

function clampProgress(value: number): number {
  return Math.max(0, Math.min(value, 1));
}

function getGreetingKey(hour: number): "morning" | "afternoon" | "evening" {
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

function getMealCountLabel(
  t: (key: string, options?: Record<string, unknown>) => string,
  count: number,
): string {
  return t("home:mealCount", {
    count,
    defaultValue: count === 1 ? "1 meal" : `${count} meals`,
  });
}

type HomeNavigation = StackNavigationProp<RootStackParamList, "Home">;

type Props = {
  navigation: HomeNavigation;
};

export default function HomeScreen({ navigation }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { t, i18n } = useTranslation(["home", "common", "meals"]);
  const { userData } = useUserContext();
  const { uid } = useAuthContext();
  const { meals, getMeals } = useMeals(uid);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const last7Days = useMemo(buildLast7Days, []);
  const selectedDayKey = useMemo(
    () => toLocalDayKey(selectedDate),
    [selectedDate],
  );
  const { state: nutritionState, enabled: nutritionStateEnabled, source: nutritionStateSource } =
    useNutritionState({ uid, dayKey: selectedDayKey });
  const mealAddEntry = useMealAddMethodState({
    navigation,
    replaceOnStart: false,
  });

  useEffect(() => {
    if (!uid) return;
    getMeals();
  }, [getMeals, uid]);

  const isToday = selectedDate.toDateString() === new Date().toDateString();
  const dayMeals = useMemo(
    () => getMealsForDate(meals, selectedDate),
    [meals, selectedDate],
  );
  const mealCount = dayMeals.length;
  const hasCanonicalNutritionState =
    nutritionStateEnabled &&
    nutritionState.dayKey === selectedDayKey &&
    nutritionStateSource !== "disabled" &&
    nutritionStateSource !== "fallback";

  const legacyMacros = useMemo(() => calculateTotalNutrients(dayMeals), [dayMeals]);
  const consumed = hasCanonicalNutritionState
    ? nutritionState.consumed
    : legacyMacros;
  const totalCalories = consumed.kcal;

  const goalCalories = hasCanonicalNutritionState
    ? (nutritionState.targets.kcal ?? userData?.calorieTarget ?? 0)
    : (userData?.calorieTarget ?? 0);

  const fallbackMacroTargets = useMemo(
    () =>
      userData?.calorieTarget && userData.calorieTarget > 0
        ? calculateMacroTargets({
            calorieTarget: userData.calorieTarget,
            preferences: userData.preferences,
            goal: userData.goal,
          })
        : null,
    [userData?.calorieTarget, userData?.goal, userData?.preferences],
  );
  const macroTargets = useMemo(() => {
    if (!hasCanonicalNutritionState) {
      return fallbackMacroTargets;
    }

    const stateTargets = toMacroTargets(nutritionState.targets);
    return stateTargets ?? fallbackMacroTargets;
  }, [fallbackMacroTargets, hasCanonicalNutritionState, nutritionState.targets]);

  const numberFormatter = useMemo(
    () => new Intl.NumberFormat(i18n.language || undefined),
    [i18n.language],
  );
  const fullDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.language || undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      }),
    [i18n.language],
  );

  const displayName = useMemo(() => {
    const candidate = userData?.username?.trim();
    if (!candidate) return null;
    return candidate.split(/\s+/)[0] ?? null;
  }, [userData?.username]);

  const kcalProgressLabel = useMemo(() => {
    const consumedLabel = numberFormatter.format(totalCalories);
    if (goalCalories > 0) {
      return `${consumedLabel} / ${numberFormatter.format(goalCalories)} kcal`;
    }
    return `${consumedLabel} kcal`;
  }, [goalCalories, numberFormatter, totalCalories]);

  const isCompletedDay = goalCalories > 0 && totalCalories >= goalCalories && mealCount > 0;
  const isPastIncompleteDay = !isToday && !isCompletedDay;
  const isTodayEmpty = isToday && mealCount === 0 && !isCompletedDay;

  const selectedMethodName = t(`meals:${mealAddEntry.preferredOption.titleKey}`);
  const methodSelectorLabel = t("home:methodSelector", {
    method: selectedMethodName,
    defaultValue: `Method: ${selectedMethodName}`,
  });

  const heroModel = useMemo(() => {
    if (isCompletedDay) {
      return {
        title: displayName
          ? t("home:hero.completed.title", {
              name: displayName,
              defaultValue: `Goal reached, ${displayName}`,
            })
          : "Goal reached",
        meta: `${kcalProgressLabel} · ${getMealCountLabel(t, mealCount)}`,
        ctaLabel: t("home:hero.completed.cta", "Review your day"),
        tone: "success" as const,
        supportText: t(
          "home:hero.completed.support",
          "See your full breakdown for today",
        ),
        showMethodSelector: false,
        progress: null,
        supportCopy: null,
      };
    }

    if (isPastIncompleteDay) {
      return {
        title: fullDateFormatter.format(selectedDate),
        meta: t(
          "home:hero.pastIncomplete.meta",
          "You missed a meal log",
        ),
        ctaLabel: t("home:hero.pastIncomplete.cta", "Add a missed meal"),
        tone: "default" as const,
        supportText: null,
        showMethodSelector: true,
        progress: null,
        supportCopy:
          mealCount === 0
            ? t(
                "home:hero.pastIncomplete.supportCopy",
                "You can still fill in what was missing.",
              )
            : null,
      };
    }

    const greetingKey = getGreetingKey(new Date().getHours());
    const greeting = displayName
      ? t(`home:hero.greeting.${greetingKey}`, {
          name: displayName,
          defaultValue: `${
            greetingKey === "morning"
              ? "Good morning"
              : greetingKey === "afternoon"
                ? "Good afternoon"
                : "Good evening"
          }, ${displayName}`,
        })
      : greetingKey === "morning"
        ? "Good morning"
        : greetingKey === "afternoon"
          ? "Good afternoon"
          : "Good evening";

    if (isTodayEmpty) {
      return {
        title: greeting,
        meta: fullDateFormatter.format(selectedDate),
        ctaLabel: t("home:hero.todayEmpty.cta", "Log breakfast"),
        tone: "default" as const,
        supportText: null,
        showMethodSelector: true,
        progress: null,
        supportCopy: t(
          "home:hero.todayEmpty.supportCopy",
          "Start with your first meal and the rest of today will build from there.",
        ),
      };
    }

    return {
      title: greeting,
      meta: `${getMealCountLabel(t, mealCount)} · ${kcalProgressLabel}`,
      ctaLabel: t("home:hero.todayInProgress.cta", "Log next meal"),
      tone: "default" as const,
      supportText: null,
      showMethodSelector: true,
      progress:
        goalCalories > 0 ? clampProgress(totalCalories / goalCalories) : null,
      supportCopy: null,
    };
  }, [
    displayName,
    fullDateFormatter,
    goalCalories,
    isCompletedDay,
    isPastIncompleteDay,
    isTodayEmpty,
    kcalProgressLabel,
    mealCount,
    selectedDate,
    t,
    totalCalories,
  ]);

  return (
    <Layout>
      <View style={[styles.screen, styles.screenGap]}>
        <WeekStrip
          days={last7Days}
          selectedDate={selectedDate}
          onSelect={setSelectedDate}
        />

        <HomeHeroCard
          title={heroModel.title}
          meta={heroModel.meta}
          ctaLabel={heroModel.ctaLabel}
          onPressCta={() => {
            if (isCompletedDay) {
              navigation.navigate("HistoryList");
              return;
            }

            void mealAddEntry.handleDirectStart();
          }}
          methodLabel={heroModel.showMethodSelector ? methodSelectorLabel : undefined}
          methodIcon={heroModel.showMethodSelector ? mealAddEntry.preferredOption.icon : undefined}
          onPressMethodSelector={
            heroModel.showMethodSelector
              ? () =>
                  navigation.navigate("MealAddMethod", {
                    selectionMode: "persistDefault",
                  })
              : undefined
          }
          progress={heroModel.progress}
          supportText={heroModel.supportText ?? undefined}
          tone={heroModel.tone}
        />

        {macroTargets ? (
          <MacroTargetsRow
            macroTargets={macroTargets}
            consumed={{
              protein: consumed.protein,
              carbs: consumed.carbs,
              fat: consumed.fat,
            }}
          />
        ) : null}

        {heroModel.supportCopy ? (
          <Text style={styles.supportCopy}>{heroModel.supportCopy}</Text>
        ) : null}

        {mealCount > 0 ? (
          <TodaysMealsList
            meals={dayMeals}
            onOpenMeal={(meal) => navigation.navigate("MealDetails", { meal })}
          />
        ) : null}
      </View>

      <Modal
        visible={mealAddEntry.showResumeModal}
        title={t("meals:continue_draft_title")}
        message={t("meals:continue_draft_message")}
        primaryAction={{
          label: t("meals:continue"),
          onPress: () => {
            void mealAddEntry.handleContinueDraft();
          },
        }}
        secondaryAction={{
          label: t("meals:discard"),
          onPress: () => {
            void mealAddEntry.handleDiscardDraft();
          },
          tone: "destructive",
        }}
        onClose={mealAddEntry.closeResumeModal}
      />
    </Layout>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    screen: {
      flex: 1,
    },
    screenGap: {
      gap: theme.spacing.sectionGap,
    },
    supportCopy: {
      color: theme.textTertiary,
      fontSize: theme.typography.size.bodyS,
      lineHeight: theme.typography.lineHeight.bodyS,
      fontFamily: theme.typography.fontFamily.regular,
      textAlign: "left",
      paddingHorizontal: theme.spacing.sm,
    },
  });
