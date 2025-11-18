import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { PieChart } from "@/components/PieChart";

type PieDatum = { value: number; color: string; label: string };

type Props = {
  data: PieDatum[];
  kcal: number;
};

export default function MacroPieWithLegend({ data, kcal }: Props) {
  return (
    <View style={{ width: 220, alignItems: "center" }}>
      <Text style={styles.kcal}>{kcal} kcal</Text>
      <PieChart
        maxSize={180}
        minSize={120}
        legendWidth={0}
        gap={8}
        fontSize={12}
        data={data}
      />
      <View style={styles.legendRow}>
        {data.map((d) => (
          <View key={d.label} style={styles.legendItem}>
            <View
              style={[
                styles.dot,
                { backgroundColor: d.color, borderColor: "rgba(0,0,0,0.25)" },
              ]}
            />
            <Text style={styles.legendText}>
              {d.label}: {Math.round(d.value)} g
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
