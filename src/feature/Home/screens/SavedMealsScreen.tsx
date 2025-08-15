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
import type { Meal } from "@/types/meal";

export default function SavedMealsScreen({ navigation }: any) {
  const theme = useTheme();
  const { userData } = useUserContext();
  const uid = userData?.uid || "";
  const { meals, getMeals } = useMeals(uid);
  const { labels, data } = useMemo(
    () => getLastNDaysAggregated(meals, 7, "kcal"),
    [meals]
  );
  const [todayMeals, setTodayMeals] = useState<Meal[]>([]);
  const hasSurvey = !!userData?.surveyComplited;

  useEffect(() => {
    if (!uid) return;
    getMeals();
    // usunięto syncUserProfile() – zostaje tylko w UserProvider
  }, [uid, getMeals]);

  useEffect(() => {
    setTodayMeals(getTodayMeals(meals));
  }, [meals]);

  const totalCalories = todayMeals.reduce((sum, meal) => {
    const mealKcal = meal.ingredients.reduce(
      (acc, ing) => acc + (ing.kcal || 0),
      0
    );
    return sum + mealKcal;
  }, 0);

  const macros = calculateTotalNutrients(todayMeals);
  const goalCalories = hasSurvey ? userData?.calorieTarget ?? 0 : 0;

  return (
    <Layout>
      <View style={{ flex: 1, gap: theme.spacing.lg }}>
        {userData?.calorieTarget && userData.calorieTarget > 0 ? (
          <TargetProgressBar current={totalCalories} target={goalCalories} />
        ) : (
          <View style={styles.caloriesBox}>
            <Text style={[styles.caloriesText, { color: theme.text }]}>
              Total today: {totalCalories} kcal
            </Text>
            <Text
              style={[styles.link, { color: theme.link }]}
              onPress={() => navigation.navigate("Onboarding")}
            >
              Set your daily goal →
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
            <TodaysMacrosChart macros={macros} />
          </>
        )}

        <WeeklyProgressGraph data={data} labels={labels} />
        <ButtonSection />
      </View>
    </Layout>
  );
}

const styles = StyleSheet.create({
  caloriesBox: {
    marginBottom: 16,
  },
  caloriesText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  link: {
    marginTop: 4,
    fontSize: 14,
  },
});
