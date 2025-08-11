import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Meal } from "@/types";
import { useTheme } from "@/theme/useTheme";

export const TodaysMealsList = ({ meals }: { meals: Meal[] }) => {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          borderColor: theme.border,
          padding: theme.spacing.md,
          borderRadius: theme.rounded.md,
        },
      ]}
    >
      <Text
        style={[
          styles.title,
          { color: theme.text, fontSize: theme.typography.size.lg },
        ]}
      >
        Today’s meals
      </Text>
      {meals.map((meal) => (
        <View key={meal.mealId} style={styles.mealRow}>
          <Text
            style={{ color: theme.text, fontSize: theme.typography.size.md }}
          >
            {meal.name}
          </Text>
          <Text
            style={{
              color: theme.textSecondary,
              fontSize: theme.typography.size.md,
            }}
          >
            {meal.ingredients.reduce((sum, i) => sum + i.kcal, 0)} kcal
          </Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { borderWidth: 1 },
  title: { fontWeight: "bold", marginBottom: 8 },
  mealRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
});
