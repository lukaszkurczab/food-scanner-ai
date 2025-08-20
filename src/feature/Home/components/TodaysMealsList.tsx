import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";
import type { Meal } from "@/types/meal";
import { useTranslation } from "react-i18next";

export const TodaysMealsList = ({ meals }: { meals: Meal[] }) => {
  const theme = useTheme();
  const { t } = useTranslation("home");

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
        {t("todaysMeals")}
      </Text>
      {meals.map((meal) => (
        <View
          key={meal.cloudId || meal.mealId || `${meal.name}-${meal.timestamp}`}
          style={styles.mealRow}
        >
          <Text
            style={{ color: theme.text, fontSize: theme.typography.size.md }}
          >
            {meal.name || t("meal")}
          </Text>
          <Text
            style={{
              color: theme.textSecondary,
              fontSize: theme.typography.size.md,
            }}
          >
            {meal.ingredients.reduce((sum, i) => sum + (i.kcal || 0), 0)} kcal
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
