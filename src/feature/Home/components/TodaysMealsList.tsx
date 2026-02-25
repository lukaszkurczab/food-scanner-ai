import { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";
import type { Meal } from "@/types/meal";
import { useTranslation } from "react-i18next";
import { PrimaryButton } from "@components/PrimaryButton";

type Props = {
  meals: Meal[];
  handleAddMeal?: () => void;
  onOpenMeal?: (meal: Meal) => void;
};

export const TodaysMealsList = ({
  meals,
  handleAddMeal,
  onOpenMeal,
}: Props) => {
  const theme = useTheme();
  const { t } = useTranslation("home");
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
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
              style={styles.mealName}
              onPress={onOpenMeal ? () => onOpenMeal(meal) : undefined}
            >
              {meal.name || t("meal")}
            </Text>
            <Text
              style={styles.mealKcal}
            >
              {kcal} kcal
            </Text>
          </View>
        );
      })}

      {handleAddMeal ? (
        <PrimaryButton label={t("addMeal")} onPress={handleAddMeal} />
      ) : null}
    </View>
  );
};

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.card,
      padding: theme.spacing.md,
      borderRadius: theme.rounded.md,
      shadowColor: theme.shadow,
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 2,
      gap: theme.spacing.md,
    },
    title: {
      color: theme.text,
      fontSize: theme.typography.size.lg,
      fontFamily: theme.typography.fontFamily.bold,
    },
    mealRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: theme.spacing.xs,
    },
    mealName: {
      color: theme.text,
      fontSize: theme.typography.size.md,
    },
    mealKcal: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.md,
    },
  });
