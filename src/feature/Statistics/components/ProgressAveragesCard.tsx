import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { TargetProgressBar } from "@/components";
import { useTranslation } from "react-i18next";

type Props = {
  avgKcal?: number;
  dailyGoal?: number | null;
  days: number;
  totalKcal: number;
  caloriesSeries?: number[];
  countEmptyAsZero?: boolean;
};

export const ProgressAveragesCard: React.FC<Props> = ({
  avgKcal,
  dailyGoal,
  days,
  totalKcal,
  caloriesSeries,
  countEmptyAsZero = false,
}) => {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme.mode]);
  const { t } = useTranslation(["statistics", "common"]);

  let usedDays = days;
  let computedAvg = avgKcal ?? 0;
  let sumFromSeries = 0;

  if (Array.isArray(caloriesSeries) && caloriesSeries.length > 0) {
    sumFromSeries = caloriesSeries.reduce((s, v) => s + (Number(v) || 0), 0);
    const nonEmptyDays = caloriesSeries.filter(
      (v) => (Number(v) || 0) > 0
    ).length;
    usedDays = countEmptyAsZero ? days : Math.max(1, nonEmptyDays);
    if (avgKcal == null) {
      computedAvg = sumFromSeries / usedDays;
    }
  }

  if (avgKcal != null) {
    computedAvg = avgKcal;
  } else if (!Array.isArray(caloriesSeries) || caloriesSeries.length === 0) {
    computedAvg = totalKcal / Math.max(1, days);
  }

  const hasGoal = !!dailyGoal && dailyGoal > 0;

  const desc = hasGoal
    ? t("statistics:progress.descWithGoal", { days })
    : t("statistics:progress.descNoGoal", { days });

  return (
    <View
      style={[
        styles.card,
        { borderColor: theme.border, borderRadius: theme.rounded.md },
      ]}
    >
      <Text
        style={[
          styles.title,
        ]}
      >
        {t("statistics:progress.title")}
      </Text>

      <Text style={styles.subtitle}>
        {desc}
      </Text>

      {hasGoal ? (
        <TargetProgressBar
          current={Math.round(computedAvg)}
          target={Math.round(dailyGoal!)}
        />
      ) : (
        <Text style={styles.fallbackText}>
          {t("statistics:progress.totalInRange", {
            kcal: Math.round(sumFromSeries || totalKcal),
          })}
        </Text>
      )}
    </View>
  );
};

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    card: { borderWidth: 1, padding: theme.spacing.sm },
    title: {
      fontFamily: theme.typography.fontFamily.bold,
      marginBottom: theme.spacing.xs,
      color: theme.text,
      fontSize: theme.typography.size.lg,
    },
    subtitle: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.base,
      marginBottom: theme.spacing.md,
    },
    fallbackText: { color: theme.textSecondary },
  });
