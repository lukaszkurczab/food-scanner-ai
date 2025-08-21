import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { LineGraph } from "@/components";
import { useTranslation } from "react-i18next";
import type { MetricKey } from "./MetricsGrid";

type Props = {
  labels: string[];
  data: number[];
  metric: MetricKey;
};

export const LineSection: React.FC<Props> = ({ labels, data, metric }) => {
  const theme = useTheme();
  const { t } = useTranslation(["statistics", "common"]);

  const titleMap: Record<MetricKey, string> = {
    kcal: t("statistics:charts.calories"),
    protein: t("statistics:charts.protein"),
    carbs: t("statistics:charts.carbs"),
    fat: t("statistics:charts.fat"),
  };

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
            marginBottom: theme.spacing.md,
          },
        ]}
      >
        {titleMap[metric]}
      </Text>
      <LineGraph
        data={data}
        labels={labels}
        stepX={Math.ceil(Math.max(1, labels.length) / 7)}
        height={140}
        smooth
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: { borderWidth: 1, padding: 14 },
  title: { fontWeight: "700", marginBottom: 8 },
});
