import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { PieChart } from "@/components";
import { useTranslation } from "react-i18next";

export const TodaysMacrosChart = ({
  macros,
}: {
  macros: { protein: number; fat: number; carbs: number };
}) => {
  const theme = useTheme();
  const { t } = useTranslation("home");

  const data = [
    { value: macros.protein, color: theme.macro.protein, label: "Protein" },
    { value: macros.fat, color: theme.macro.fat, label: "Fat" },
    { value: macros.carbs, color: theme.macro.carbs, label: "Carbs" },
  ];

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
        },
      ]}
    >
      <Text
        style={[
          styles.title,
          {
            color: theme.text,
            fontSize: theme.typography.size.lg,
            marginBottom: theme.spacing.lg,
          },
        ]}
      >
        {t("todaysMacros")}
      </Text>
      <PieChart data={data} maxSize={120} justify="space-around" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {},
  title: { fontWeight: "700" },
});
