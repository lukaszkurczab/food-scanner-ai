import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { TodaysMealsList } from "../components/TodaysMealsList";
import { TodaysMacrosChart } from "../components/TodaysMacrosChart";
import { ButtonSection } from "../components/ButtonSection";
import { useUserContext } from "@contexts/UserContext";
import { calculateTotalNutrients } from "@/utils/calculateTotalNutrients";
import { Layout, TargetProgressBar } from "@/components";
import { getLastNDaysAggregated } from "@/utils/getLastNDaysAggregated";
import { WeeklyProgressGraph } from "../components/WeeklyProgressGraph";
import { useMeals } from "@hooks/useMeals";
import type { Meal, Nutrients } from "@/types/meal";
import { useTranslation } from "react-i18next";
import { subscribeStreak } from "@/services/streakService";
import { useAuthContext } from "@/context/AuthContext";
import WeekStrip, { WeekDayItem } from "@/components/WeekStrip";
import EmptyDayView from "../components/EmptyDayView";
import { StreakBadge } from "@components/StreakBadge";
import { calculateMacroTargets } from "@/utils/calculateMacroTargets";
import { MacroTargetsRow } from "../components/MacroTargetsRow";

function filterNonZeroMacros(n: Nutrients): Partial<Nutrients> {
  const out: Partial<Nutrients> = {};
  if (n.protein > 0) out.protein = n.protein;
  if (n.fat > 0) out.fat = n.fat;
  if (n.carbs > 0) out.carbs = n.carbs;
  return out;
}

function startEndOfLocalDay(d: Date) {
  const s = new Date(d);
  s.setHours(0, 0, 0, 0);
  const e = new Date(s.getTime() + 24 * 60 * 60 * 1000);
  return { start: s.getTime(), end: e.getTime() };
}

function parseMealTs(m: Meal): number | null {
  const raw = m.timestamp || (m as any).createdAt;
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

export default function HomeScreen({ navigation }: any) {
  const theme = useTheme();
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
    [meals, selectedDate]
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
    [meals]
  );
  const showWeeklyGraph = useMemo(() => data.some((v) => v > 0), [data]);

  const totalCalories = dayMeals.reduce((sum, meal) => {
    if (Array.isArray(meal.ingredients) && meal.ingredients.length) {
      const mealKcal = meal.ingredients.reduce(
        (acc, ing) => acc + (ing.kcal ?? 0),
        0
      );
      return sum + mealKcal;
    }
    return sum + (meal.totals?.kcal ?? 0);
  }, 0);

  const macros = useMemo(() => calculateTotalNutrients(dayMeals), [dayMeals]);
  const nonZeroMacros = useMemo(() => filterNonZeroMacros(macros), [macros]);
  const showMacrosChart =
    (nonZeroMacros.protein ?? 0) > 0 ||
    (nonZeroMacros.fat ?? 0) > 0 ||
    (nonZeroMacros.carbs ?? 0) > 0;

  const goalCalories = hasSurvey ? userData?.calorieTarget ?? 0 : 0;

  const macroTargets = useMemo(
    () =>
      userData?.calorieTarget && userData.calorieTarget > 0
        ? calculateMacroTargets({
            calorieTarget: userData.calorieTarget,
            preferences: userData.preferences,
            goal: userData.goal,
          })
        : null,
    [userData?.calorieTarget, userData?.preferences, userData?.goal]
  );

  useEffect(() => {
    if (macroTargets && goalCalories > 0) {
      console.log("CaloriAI macro targets", {
        kcalTarget: goalCalories,
        macros: macroTargets,
      });
    }
  }, [macroTargets, goalCalories]);

  return (
    <Layout showNavigationWithoutCard={true}>
      <View
        style={[
          styles.screen,
          { gap: theme.spacing.lg, padding: theme.spacing.lg },
        ]}
      >
        <WeekStrip
          days={last7Days}
          selectedDate={selectedDate}
          onSelect={setSelectedDate}
          onOpenHistory={() => navigation.navigate("HistoryList")}
          streak={streak}
        />

        {userData?.calorieTarget && userData.calorieTarget > 0 ? (
          <View style={[styles.headerRow, { gap: theme.spacing.sm }]}>
            <TargetProgressBar current={totalCalories} target={goalCalories} />
            <StreakBadge value={streak} />
          </View>
        ) : (
          <View style={[styles.card, styles.cardPad]}>
            <Text style={[styles.caloriesText, { color: theme.text }]}>
              {t("home:totalToday", "Total today")}: {totalCalories}{" "}
              {t("common:kcal", "kcal")}
            </Text>
            <Text
              style={[styles.link, { color: theme.link }]}
              onPress={() => navigation.navigate("Onboarding")}
            >
              {t("home:setDailyGoal", "Set your daily goal")} →
            </Text>
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
          <>
            <TodaysMealsList
              meals={dayMeals}
              handleAddMeal={
                isToday ? () => navigation.navigate("MealAddMethod") : undefined
              }
              onOpenMeal={(meal: Meal) =>
                navigation.navigate("MealDetails", { meal })
              }
            />
          </>
        )}

        {showWeeklyGraph && <WeeklyProgressGraph data={data} labels={labels} />}

        <ButtonSection />
      </View>
    </Layout>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerRow: { flexDirection: "row", alignItems: "center" },
  card: { backgroundColor: "transparent", borderRadius: 16 },
  cardPad: { padding: 16 },
  caloriesText: { fontSize: 18, fontWeight: "700" },
  link: { marginTop: 6, fontSize: 14 },
});
