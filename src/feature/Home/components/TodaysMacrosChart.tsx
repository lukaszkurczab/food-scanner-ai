// TodaysMacrosChart.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/src/theme/useTheme";
import { PieChart } from "@/src/components";

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
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.text }]}>Today’s macros</Text>
      <PieChart data={data} size={180} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: 20 },
  title: { fontWeight: "bold", marginBottom: 8 },
});
