import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { TargetProgressBar } from "@/components/TargetProgressBar";
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
    computedAvg = sumFromSeries / usedDays;
  } else if (avgKcal == null) {
    computedAvg = totalKcal / Math.max(1, days);
  }

  const hasGoal = !!dailyGoal && dailyGoal > 0;

  const desc = hasGoal
    ? Array.isArray(caloriesSeries) && !countEmptyAsZero
      ? t("statistics:progress.descWithGoal", { days })
      : t("statistics:progress.descWithGoal", { days })
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
          {
            color: theme.text,
            fontSize: theme.typography.size.lg,
          },
        ]}
      >
        {t("statistics:progress.title")}
      </Text>

      <Text
        style={{
          color: theme.textSecondary,
          fontSize: theme.typography.size.base,
          marginBottom: theme.spacing.md,
        }}
      >
        {desc}
      </Text>

      {hasGoal ? (
        <TargetProgressBar
          current={Math.round(computedAvg)}
          target={Math.round(dailyGoal!)}
        />
      ) : (
        <Text style={{ color: theme.textSecondary }}>
          {t("statistics:progress.totalInRange", {
            kcal: Math.round(sumFromSeries || totalKcal),
          })}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: { borderWidth: 1, padding: 14 },
  title: { fontWeight: "700", marginBottom: 8 },
});
