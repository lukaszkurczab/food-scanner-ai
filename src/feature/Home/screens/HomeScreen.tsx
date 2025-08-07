import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/src/theme/useTheme";
import { TargetProgressBar } from "../components/TargetProgressBar";
import { TodaysMealsList } from "../components/TodaysMealsList";
import { TodaysMacrosChart } from "../components/TodaysMacrosChart";
import { WeeklyProgressGraph } from "../components/WeeklyProgressGraph";
import { ButtonSection } from "../components/ButtonSection";
import { AddMealPlaceholder } from "../components/AddMealPlaceholder";
import { useUserContext } from "@/src/context/UserContext";
import { calculateTotalNutrients } from "@/src/utils/calculateTotalNutrients";
import { getTodayMeals } from "@/src/utils/getTodayMeals";

export default function HomeScreen() {
  const theme = useTheme();
  const { userData, meals } = useUserContext();

  const hasSurvey = !!userData?.surveyComplited;
  const todayMeals = getTodayMeals(meals);

  const totalCalories = todayMeals.reduce((sum, meal) => {
    const mealKcal = meal.ingredients.reduce((acc, ing) => acc + ing.kcal, 0);
    return sum + mealKcal;
  }, 0);

  const macros = calculateTotalNutrients(todayMeals);

  const goalCalories = hasSurvey ? userData.calorieTarget ?? 0 : 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {hasSurvey ? (
        <TargetProgressBar current={totalCalories} target={goalCalories} />
      ) : (
        <View style={styles.caloriesBox}>
          <Text style={[styles.caloriesText, { color: theme.text }]}>
            Total today: {totalCalories} kcal
          </Text>
          <Text style={[styles.link, { color: theme.link }]} onPress={() => {}}>
            Set your daily goal →
          </Text>
        </View>
      )}

      {todayMeals.length === 0 ? (
        <AddMealPlaceholder />
      ) : (
        <>
          <TodaysMealsList meals={todayMeals} />
          <TodaysMacrosChart macros={macros} />
        </>
      )}

      <WeeklyProgressGraph />
      <ButtonSection />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
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
