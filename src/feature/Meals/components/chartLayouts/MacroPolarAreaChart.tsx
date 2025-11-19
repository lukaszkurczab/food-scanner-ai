import React from "react";
import { View, Text, StyleSheet } from "react-native";
import MacroChartJs from "./MacroChartJs";

type PieDatum = { value: number; color: string; label: string };

type Props = {
  data: PieDatum[];
  kcal: number;
  showKcalLabel?: boolean;
  showLegend?: boolean;
};

export default function MacroPolarAreaChart({
  data,
  kcal,
  showKcalLabel = true,
  showLegend = true,
}: Props) {
  const labels = data.map((d) => d.label);
  const values = data.map((d) => Math.max(0, d.value));
  const colors = data.map((d) => d.color);

  return (
    <View style={styles.wrap}>
      {showKcalLabel && <Text style={styles.kcal}>{kcal} kcal</Text>}
      <MacroChartJs
        kind="polarArea"
        labels={labels}
        values={values}
        colors={colors}
      />
      {showLegend && (
        <View style={styles.legendRow}>
          {data.map((d) => (
            <View key={d.label} style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: d.color }]} />
              <Text style={styles.legendText}>
                {d.label}: {Math.round(d.value)} g
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 220,
    alignItems: "center",
  },
  kcal: { fontWeight: "700", marginBottom: 4 },
  legendRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  legendItem: { flexDirection: "row", alignItems: "center" },
  legendText: { fontSize: 11 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 4 },
});
