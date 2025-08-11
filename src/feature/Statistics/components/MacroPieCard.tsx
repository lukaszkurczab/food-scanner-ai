import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { PieChart } from "@/components/PieChart";
import { useTranslation } from "react-i18next";

type Props = {
  protein: number;
  carbs: number;
  fat: number;
};

export const MacroPieCard: React.FC<Props> = ({ protein, carbs, fat }) => {
  const theme = useTheme();
  const { t } = useTranslation(["statistics", "common"]);

  const data = [
    {
      value: protein,
      color: theme.macro.protein,
      label: `${t("statistics:tiles.protein")}: ${Math.round(protein)} ${t(
        "common:gram"
      )}`,
    },
    {
      value: fat,
      color: theme.macro.fat,
      label: `${t("statistics:tiles.fat")}: ${Math.round(fat)} ${t(
        "common:gram"
      )}`,
    },
    {
      value: carbs,
      color: theme.macro.carbs,
      label: `${t("statistics:tiles.carbs")}: ${Math.round(carbs)} ${t(
        "common:gram"
      )}`,
    },
  ];

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
        {t("statistics:charts.macroBreakdown")}
      </Text>
      <PieChart data={data} maxSize={160} minSize={140} legendWidth={140} />
    </View>
  );
};

const styles = StyleSheet.create({
  card: { borderWidth: 1, padding: 14 },
  title: { fontWeight: "700", marginBottom: 8 },
});
