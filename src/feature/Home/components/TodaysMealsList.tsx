import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Meal } from "@/src/types";
import { useTheme } from "@/src/theme/useTheme";

export const TodaysMealsList = ({ meals }: { meals: Meal[] }) => {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.text }]}>Today’s meals</Text>
      {meals.map((meal) => (
        <View key={meal.mealId} style={styles.mealRow}>
          <Text style={[styles.mealName, { color: theme.text }]}>{meal.name}</Text>
          <Text style={[styles.mealKcal, { color: theme.textSecondary }]}> 
            {meal.ingredients.reduce((sum, i) => sum + i.kcal, 0)} kcal
          </Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: 20 },
  title: { fontWeight: "bold", marginBottom: 8 },
  mealRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  mealName: {},
  mealKcal: {},
});