import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/src/theme/useTheme";
import { TargetProgressBar } from "../components/TargetProgressBar";
import { TodaysMealsList } from "../components/TodaysMealsList";
import { TodaysMacrosChart } from "../components/TodaysMacrosChart";
import { ButtonSection } from "../components/ButtonSection";
import { AddMealPlaceholder } from "../components/AddMealPlaceholder";
import { useUserContext } from "@/src/context/UserContext";
import { calculateTotalNutrients } from "@/src/utils/calculateTotalNutrients";
import { getTodayMeals } from "@/src/utils/getTodayMeals";
import { Layout, LineGraph } from "@/src/components";
import { getLastNDaysAggregated } from "@/src/utils/getLastNDaysAggregated";
import { useMeals } from "@/src/hooks/useMeals";
import { Meal } from "@/src/types";

export default function HomeScreen({ navigation }: any) {
  const theme = useTheme();
  const { userData } = useUserContext();
  const { meals, getMeals } = useMeals(userData!.uid);
  const { labels, data } = getLastNDaysAggregated(meals, 7, "kcal");
  const [todayMeals, setTodayMeals] = useState<Meal[]>([]);
  const hasSurvey = !!userData?.surveyComplited;

  useEffect(() => {
    getMeals();
  }, [getMeals]);

  useEffect(() => {
    const newData = getTodayMeals(meals);
    setTodayMeals(newData);
  }, [meals]);

  const totalCalories = todayMeals.reduce((sum, meal) => {
    const mealKcal = meal.ingredients.reduce((acc, ing) => acc + ing.kcal, 0);
    return sum + mealKcal;
  }, 0);

  const macros = calculateTotalNutrients(todayMeals);

  const goalCalories = hasSurvey ? userData.calorieTarget ?? 0 : 0;

  return (
    <Layout>
      <View style={{ flex: 1 }}>
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

        <LineGraph
          data={data}
          labels={labels}
          title="Weekly Progress"
          stepX={1}
        />
        <ButtonSection />
      </View>
    </Layout>
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
