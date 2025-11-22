import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { PieChart } from "@/components/PieChart";

type PieDatum = { value: number; color: string; label: string };

type Props = {
  data: PieDatum[];
  kcal: number;
  showKcalLabel?: boolean;
  showLegend?: boolean;
  textColor?: string;
  fontFamily?: string;
  backgroundColor?: string;
};

export default function MacroPieChart({
  data,
  kcal,
  showKcalLabel = true,
  showLegend = true,
  textColor,
  fontFamily,
  backgroundColor,
}: Props) {
  const safeData = data.map((d) => ({
    ...d,
    value: Math.max(0, d.value),
  }));

  const kcalStyle = [styles.kcal, { color: textColor || "#000", fontFamily }];

  const legendTextStyle = [
    styles.legendText,
    { color: textColor || "#000", fontFamily },
  ];

  return (
    <View
      style={[
        styles.wrap,
        { backgroundColor: backgroundColor || "transparent" },
      ]}
    >
      {showKcalLabel && <Text style={kcalStyle}>{kcal} kcal</Text>}

      <PieChart
        data={safeData}
        maxSize={170}
        minSize={0}
        legendWidth={0}
        gap={0}
        fontSize={11}
      />

      {showLegend && (
        <View style={styles.legendRow}>
          {safeData.map((d) => (
            <View key={d.label} style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: d.color }]} />
              <Text style={legendTextStyle}>
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
  kcal: {
    fontWeight: "700",
    marginBottom: 4,
    fontSize: 16,
  },
  legendRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 4,
    marginVertical: 2,
  },
  legendText: {
    fontSize: 11,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
});
