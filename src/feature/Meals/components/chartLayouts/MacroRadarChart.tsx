import React from "react";
import { View, Text, StyleSheet } from "react-native";
import MacroChartJs from "./MacroChartJs";

type PieDatum = { value: number; color: string; label: string };

type Props = {
  data: PieDatum[];
  kcal: number;
  showKcalLabel?: boolean;
};

export default function MacroRadarChart({
  data,
  kcal,
  showKcalLabel = true,
}: Props) {
  const labels = data.map((d) => d.label);
  const values = data.map((d) => Math.max(0, d.value));
  const colors = data.map((d) => d.color);

  return (
    <View style={styles.wrap}>
      {showKcalLabel && <Text style={styles.kcal}>{kcal} kcal</Text>}
      <MacroChartJs
        kind="radar"
        labels={labels}
        values={values}
        colors={colors}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 220,
    alignItems: "center",
  },
  kcal: { fontWeight: "700", marginBottom: 4 },
});
