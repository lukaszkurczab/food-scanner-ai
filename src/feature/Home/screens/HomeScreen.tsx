import { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { TodaysMealsList } from "../components/TodaysMealsList";
import { ButtonSection } from "../components/ButtonSection";
import { useUserContext } from "@contexts/UserContext";
import { calculateTotalNutrients } from "@/utils/calculateTotalNutrients";
import { Layout, TargetProgressBar, PrimaryButton } from "@/components";
import { getLastNDaysAggregated } from "@/utils/getLastNDaysAggregated";
import { WeeklyProgressGraph } from "../components/WeeklyProgressGraph";
import { useMeals } from "@hooks/useMeals";
import type { Meal } from "@/types/meal";
import { useTranslation } from "react-i18next";
import { subscribeStreak } from "@/services/streakService";
import { useAuthContext } from "@/context/AuthContext";
import WeekStrip, { WeekDayItem } from "@/components/WeekStrip";
import EmptyDayView from "../components/EmptyDayView";
import { StreakBadge } from "@components/StreakBadge";
import { calculateMacroTargets } from "@/utils/calculateMacroTargets";
import { MacroTargetsRow } from "../components/MacroTargetsRow";
import type { StackNavigationProp } from "@react-navigation/stack";
import type { RootStackParamList } from "@/navigation/navigate";

function startEndOfLocalDay(d: Date) {
  const s = new Date(d);
  s.setHours(0, 0, 0, 0);
  const e = new Date(s.getTime() + 24 * 60 * 60 * 1000);
  return { start: s.getTime(), end: e.getTime() };
}

function parseMealTs(m: Meal): number | null {
  const raw = m.timestamp || m.createdAt;
  if (!raw) return null;
  if (typeof raw === "number") return raw;
  const t = Date.parse(raw);
  return Number.isNaN(t) ? null : t;
}

function getMealsForDate(all: Meal[], d: Date): Meal[] {
  const { start, end } = startEndOfLocalDay(d);
  return all.filter((m) => {
    const ts = parseMealTs(m);
    return ts !== null && ts >= start && ts < end;
  });
}

function buildLast7Days(): WeekDayItem[] {
  const now = new Date();
  const arr = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - (6 - i));
    return d;
  });
  return arr.map((d) => ({
    date: d,
    label: String(d.getDate()).padStart(2, "0"),
    isToday: d.toDateString() === new Date().toDateString(),
  }));
}

type HomeNavigation = StackNavigationProp<RootStackParamList>;
type Props = {
  navigation: HomeNavigation;
};

export default function HomeScreen({ navigation }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme.mode]);
  const { t } = useTranslation(["home", "common"]);
  const { userData } = useUserContext();
  const { uid } = useAuthContext();
  const [streak, setStreak] = useState(0);
  const { meals, getMeals } = useMeals(uid);

  const last7Days = useMemo(buildLast7Days, []);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const isToday = selectedDate.toDateString() === new Date().toDateString();

  const dayMeals = useMemo(
    () => getMealsForDate(meals, selectedDate),
    [meals, selectedDate],
  );
  const hasSurvey = !!userData?.surveyComplited;

  useEffect(() => {
    if (!uid) return;
    const unsub = subscribeStreak(uid, (s) => setStreak(s.current || 0));
    return unsub;
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    getMeals();
  }, [uid, getMeals]);

  const { labels, data } = useMemo(
    () => getLastNDaysAggregated(meals, 7, "kcal"),
    [meals],
  );
  const showWeeklyGraph = useMemo(() => data.some((v) => v > 0), [data]);

  const totalCalories = dayMeals.reduce((sum, meal) => {
    if (Array.isArray(meal.ingredients) && meal.ingredients.length) {
      const mealKcal = meal.ingredients.reduce(
        (acc, ing) => acc + (ing.kcal ?? 0),
        0,
      );
      return sum + mealKcal;
    }
    return sum + (meal.totals?.kcal ?? 0);
  }, 0);

  const macros = useMemo(() => calculateTotalNutrients(dayMeals), [dayMeals]);

  const goalCalories = hasSurvey ? (userData?.calorieTarget ?? 0) : 0;

  const macroTargets = useMemo(
    () =>
      userData?.calorieTarget && userData.calorieTarget > 0
        ? calculateMacroTargets({
            calorieTarget: userData.calorieTarget,
            preferences: userData.preferences,
            goal: userData.goal,
          })
        : null,
    [userData?.calorieTarget, userData?.preferences, userData?.goal],
  );

  return (
    <Layout>
      <View style={[styles.screen, styles.screenGap]}>
        <WeekStrip
          days={last7Days}
          selectedDate={selectedDate}
          onSelect={setSelectedDate}
          onOpenHistory={() => navigation.navigate("HistoryList")}
          streak={streak}
        />

        {userData?.calorieTarget && userData.calorieTarget > 0 ? (
          <View style={[styles.headerRow, styles.headerRowGap]}>
            <TargetProgressBar current={totalCalories} target={goalCalories} />
            <StreakBadge value={streak} />
          </View>
        ) : (
          <View style={styles.goalCard}>
            <View style={styles.goalRow}>
              <View style={styles.goalRowContent}>
                <Text style={[styles.goalLabel, styles.goalLabelText]}>
                  {t("home:totalToday", "Total today")}
                </Text>
                <Text style={[styles.goalValue, styles.goalValueText]}>
                  {totalCalories} {t("common:kcal", "kcal")}
                </Text>
              </View>
            </View>

            <PrimaryButton
              label={t("home:setDailyGoal", "Set your daily goal")}
              onPress={() => navigation.navigate("Onboarding")}
            />
          </View>
        )}

        {macroTargets && (
          <MacroTargetsRow
            macroTargets={macroTargets}
            consumed={{
              protein: macros.protein,
              fat: macros.fat,
              carbs: macros.carbs,
            }}
          />
        )}

        {dayMeals.length === 0 ? (
          <EmptyDayView
            isToday={isToday}
            onAddMeal={
              isToday ? () => navigation.navigate("MealAddMethod") : undefined
            }
            onOpenHistory={
              isToday ? undefined : () => navigation.navigate("HistoryList")
            }
          />
        ) : (
          <TodaysMealsList
            meals={dayMeals}
            handleAddMeal={
              isToday ? () => navigation.navigate("MealAddMethod") : undefined
            }
            onOpenMeal={(meal: Meal) =>
              navigation.navigate("MealDetails", { meal })
            }
          />
        )}

        {showWeeklyGraph && <WeeklyProgressGraph data={data} labels={labels} />}

        <ButtonSection />
      </View>
    </Layout>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    screen: { flex: 1 },
    screenGap: { gap: theme.spacing.lg },
    headerRow: { flexDirection: "row", alignItems: "center" },
    headerRowGap: { gap: theme.spacing.sm },
    goalCard: {
      backgroundColor: theme.card,
      padding: theme.spacing.lg,
      borderRadius: theme.rounded.md,
      shadowColor: theme.shadow,
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 2,
      gap: theme.spacing.md,
    },
    goalRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    goalRowContent: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      width: "100%",
    },
    goalLabel: {
      fontSize: theme.typography.size.md,
      marginBottom: 2,
    },
    goalLabelText: {
      color: theme.textSecondary,
      fontFamily: theme.typography.fontFamily.medium,
    },
    goalValue: {
      fontSize: theme.typography.size.lg,
    },
    goalValueText: {
      color: theme.text,
      fontFamily: theme.typography.fontFamily.semiBold,
    },
    goalStatusPill: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.rounded.full,
      borderWidth: 1,
    },
    goalStatusText: {
      fontSize: theme.typography.size.xs,
    },
  });
