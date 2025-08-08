import React from "react";
import { View, Pressable, Text, StyleSheet } from "react-native";
import { useTheme } from "@/src/theme/useTheme";
import { useTranslation } from "react-i18next";

export type MetricKey = "kcal" | "protein" | "carbs" | "fat";

type Props = {
  values: { kcal: number; protein: number; carbs: number; fat: number };
  selected: MetricKey;
  onSelect: (m: MetricKey) => void;
};

export const MetricsGrid: React.FC<Props> = ({
  values,
  selected,
  onSelect,
}) => {
  const theme = useTheme();
  const { t } = useTranslation(["statistics", "common"]);

  const tiles: Array<{
    key: MetricKey;
    label: string;
    value: string;
    borderColor: string;
  }> = [
    {
      key: "kcal",
      label: t("statistics:tiles.calories"),
      value: `${Math.round(values.kcal)} ${t("common:kcal")}`,
      borderColor: theme.border,
    },
    {
      key: "protein",
      label: t("statistics:tiles.protein"),
      value: `${Math.round(values.protein)} ${t("common:gram")}`,
      borderColor: theme.macro.protein,
    },
    {
      key: "carbs",
      label: t("statistics:tiles.carbs"),
      value: `${Math.round(values.carbs)} ${t("common:gram")}`,
      borderColor: theme.macro.carbs,
    },
    {
      key: "fat",
      label: t("statistics:tiles.fat"),
      value: `${Math.round(values.fat)} ${t("common:gram")}`,
      borderColor: theme.macro.fat,
    },
  ];

  return (
    <View style={styles.grid}>
      {tiles.map((tItem) => {
        const active = selected === tItem.key;
        return (
          <Pressable
            key={tItem.key}
            onPress={() => onSelect(tItem.key)}
            style={[
              styles.card,
              {
                borderColor: tItem.borderColor,
                backgroundColor: active ? theme.overlay : theme.card,
                borderRadius: theme.rounded.md,
              },
            ]}
          >
            <Text
              style={[
                styles.label,
                {
                  color: theme.text,
                  fontSize: theme.typography.size.lg,
                  marginBottom: theme.spacing.md,
                },
              ]}
            >
              {tItem.label}
            </Text>
            <Text
              style={[
                styles.value,
                {
                  color: theme.text,
                  fontSize: theme.typography.size.lg,
                },
              ]}
            >
              {tItem.value}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  card: {
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexBasis: "48%",
  },
  label: { fontWeight: "500", marginBottom: 4 },
  value: { fontWeight: "700" },
});
