import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { PieChart } from "@/components/PieChart";

type PieDatum = { value: number; color: string; label: string };

type Props = {
  data: PieDatum[];
  kcal: number;
  showKcalLabel?: boolean;
  showLegend?: boolean;
};

export default function MacroPieChart({
  data,
  kcal,
  showKcalLabel = true,
  showLegend = true,
}: Props) {
  const safeData = data.map((d) => ({
    ...d,
    value: Math.max(0, d.value),
  }));

  return (
    <View style={styles.wrap}>
      {showKcalLabel && <Text style={styles.kcal}>{kcal} kcal</Text>}
      <PieChart
        data={safeData}
        maxSize={170}
        minSize={0} // pełny pie
        legendWidth={0}
        gap={0}
        fontSize={11}
      />
      {showLegend && (
        <View style={styles.legendRow}>
          {safeData.map((d) => (
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
