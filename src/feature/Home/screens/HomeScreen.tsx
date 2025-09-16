import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { TodaysMealsList } from "../components/TodaysMealsList";
import { TodaysMacrosChart } from "../components/TodaysMacrosChart";
import { ButtonSection } from "../components/ButtonSection";
import { AddMealPlaceholder } from "../components/AddMealPlaceholder";
import { useUserContext } from "@contexts/UserContext";
import { calculateTotalNutrients } from "@/utils/calculateTotalNutrients";
import { getTodayMeals } from "@/utils/getTodayMeals";
import { Layout, TargetProgressBar } from "@/components";
import { getLastNDaysAggregated } from "@/utils/getLastNDaysAggregated";
import { WeeklyProgressGraph } from "../components/WeeklyProgressGraph";
import { useMeals } from "@hooks/useMeals";
import type { Meal, Nutrients } from "@/types/meal";
import { useTranslation } from "react-i18next";
import { subscribeStreak } from "@/services/streakService";
import { StreakBadge } from "@/components/StreakBadge";
import { useAuthContext } from "@/context/AuthContext";

function filterNonZeroMacros(n: Nutrients): Partial<Nutrients> {
  const out: Partial<Nutrients> = {};
  if (n.protein > 0) out.protein = n.protein;
  if (n.fat > 0) out.fat = n.fat;
  if (n.carbs > 0) out.carbs = n.carbs;
  return out;
}

export default function HomeScreen({ navigation }: any) {
  const theme = useTheme();
  const { t } = useTranslation(["home", "common"]);
  const { userData } = useUserContext();
  const { uid } = useAuthContext();
  const [streak, setStreak] = useState(0);
  const { meals, getMeals } = useMeals(uid);

  const { labels, data } = useMemo(
    () => getLastNDaysAggregated(meals, 7, "kcal"),
    [meals]
  );
  const showWeeklyGraph = useMemo(() => data.some((v) => v > 0), [data]);

  const [todayMeals, setTodayMeals] = useState<Meal[]>([]);
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

  useEffect(() => {
    setTodayMeals(getTodayMeals(meals));
  }, [meals]);

  const totalCalories = todayMeals.reduce((sum, meal) => {
    if (Array.isArray(meal.ingredients) && meal.ingredients.length) {
      const mealKcal = meal.ingredients.reduce(
        (acc, ing) => acc + (ing.kcal ?? 0),
        0
      );
      return sum + mealKcal;
    }
    return sum + (meal.totals?.kcal ?? 0);
  }, 0);

  const macros = useMemo(
    () => calculateTotalNutrients(todayMeals),
    [todayMeals]
  );
  const nonZeroMacros = useMemo(() => filterNonZeroMacros(macros), [macros]);
  const showMacrosChart = useMemo(
    () =>
      (nonZeroMacros.protein ?? 0) > 0 ||
      (nonZeroMacros.fat ?? 0) > 0 ||
      (nonZeroMacros.carbs ?? 0) > 0,
    [nonZeroMacros]
  );

  const goalCalories = hasSurvey ? userData?.calorieTarget ?? 0 : 0;

  return (
    <Layout>
      <View style={[styles.flex1, { gap: theme.spacing.lg }]}>
        {userData?.calorieTarget && userData.calorieTarget > 0 ? (
          <View style={[styles.rowCenter, { gap: theme.spacing.sm }]}>
            <TargetProgressBar current={totalCalories} target={goalCalories} />
            <StreakBadge value={streak} />
          </View>
        ) : (
          <View style={styles.caloriesBox}>
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

        {todayMeals.length === 0 ? (
          <AddMealPlaceholder
            handleAddMeal={() => navigation.navigate("MealAddMethod")}
          />
        ) : (
          <>
            <TodaysMealsList meals={todayMeals} />
            {showMacrosChart && (
              <TodaysMacrosChart macros={nonZeroMacros as Nutrients} />
            )}
          </>
        )}

        {showWeeklyGraph && <WeeklyProgressGraph data={data} labels={labels} />}

        <ButtonSection />
      </View>
    </Layout>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  rowCenter: { flexDirection: "row", alignItems: "center" },
  caloriesBox: { marginBottom: 16 },
  caloriesText: { fontSize: 16, fontWeight: "bold" },
  link: { marginTop: 4, fontSize: 14 },
});
