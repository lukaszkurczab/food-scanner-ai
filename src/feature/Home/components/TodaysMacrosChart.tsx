import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { PieChart } from "@/components";

export const TodaysMacrosChart = ({
  macros,
}: {
  macros: { protein: number; fat: number; carbs: number };
}) => {
  const theme = useTheme();
  const data = [
    {
      value: macros.protein,
      color: theme.macro.protein,
      label: `Protein: ${macros.protein}g`,
    },
    {
      value: macros.fat,
      color: theme.macro.fat,
      label: `Fat: ${macros.fat}g`,
    },
    {
      value: macros.carbs,
      color: theme.macro.carbs,
      label: `Carbs: ${macros.carbs}g`,
    },
  ];

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
          {
            color: theme.text,
            fontSize: theme.typography.size.lg,
            marginBottom: theme.spacing.md,
          },
        ]}
      >
        Today’s macros
      </Text>
      <PieChart data={data} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { borderWidth: 1 },
  title: { fontWeight: "bold" },
});
