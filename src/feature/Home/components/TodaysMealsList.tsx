import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";
import type { Meal } from "@/types/meal";
import { useTranslation } from "react-i18next";
import { PrimaryButton } from "@components/PrimaryButton";

type TodaysMealsListProps = {
  meals: Meal[];
  handleAddMeal: () => void;
};

export const TodaysMealsList = ({
  meals,
  handleAddMeal,
}: TodaysMealsListProps) => {
  const theme = useTheme();
  const { t } = useTranslation("home");

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.card,
          padding: theme.spacing.md,
          borderRadius: theme.rounded.md,
          shadowColor: theme.shadow,
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 2,
          gap: theme.spacing.md,
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
      {meals.map((meal) => {
        const kcal =
          Array.isArray(meal.ingredients) && meal.ingredients.length
            ? meal.ingredients.reduce((sum, i) => sum + (i.kcal ?? 0), 0)
            : meal.totals?.kcal ?? 0;
        return (
          <View
            key={
              meal.cloudId || meal.mealId || `${meal.name}-${meal.timestamp}`
            }
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
              {kcal} kcal
            </Text>
          </View>
        );
      })}
      <PrimaryButton label={t("addMeal")} onPress={handleAddMeal} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {},
  title: { fontWeight: "700" },
  mealRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
});
