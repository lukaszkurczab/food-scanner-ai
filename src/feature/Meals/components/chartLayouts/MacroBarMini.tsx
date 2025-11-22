import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";

type Props = {
  protein: number;
  fat: number;
  carbs: number;
  kcal: number;
  barColor: string;
  showKcalLabel?: boolean;
};

export default function MacroBarMini({
  protein,
  fat,
  carbs,
  kcal,
  barColor,
  showKcalLabel = true,
}: Props) {
  const items = useMemo(
    () => [
      { key: "protein", label: "P", value: Math.max(0, protein) },
      { key: "carbs", label: "C", value: Math.max(0, carbs) },
      { key: "fat", label: "F", value: Math.max(0, fat) },
    ],
    [protein, carbs, fat]
  );

  const maxVal = Math.max(1, ...items.map((i) => i.value));

  return (
    <View style={styles.wrap}>
      {showKcalLabel && <Text style={styles.kcal}>{kcal} kcal</Text>}
      <View style={styles.chartRow}>
        {items.map((item) => (
          <View key={item.key} style={styles.barCol}>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  {
                    backgroundColor: barColor,
                    height: `${(item.value / maxVal) * 100}%`,
                  },
                ]}
              />
            </View>
            <Text style={styles.barLabel}>{item.label}</Text>
          </View>
        ))}
      </View>
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
  },
  chartRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    width: 180,
  },
  barCol: {
    alignItems: "center",
    flex: 1,
    marginHorizontal: 4,
  },
  barTrack: {
    width: 22,
    height: 80,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  barFill: {
    width: "100%",
    borderRadius: 999,
  },
  barLabel: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: "500",
  },
});
