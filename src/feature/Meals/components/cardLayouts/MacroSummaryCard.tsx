import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { MacroCardProps } from "../CardOverlay";

export default function MacroSummaryCard({
  protein,
  fat,
  carbs,
  kcal,
  textColor,
  bgColor,
  macroColors,
  showKcal,
  showMacros,
}: MacroCardProps) {
  return (
    <View style={[styles.card, { backgroundColor: bgColor }]}>
      {showKcal && (
        <Text style={[styles.kcal, { color: textColor }]}>{kcal} kcal</Text>
      )}
      {showMacros && (
        <>
          <Text style={[styles.row, { color: textColor }]}>
            P {protein} g • C {carbs} g • F {fat} g
          </Text>
          <View style={styles.dotsRow}>
            <View
              style={[styles.dot, { backgroundColor: macroColors.protein }]}
            />
            <View
              style={[styles.dot, { backgroundColor: macroColors.carbs }]}
            />
            <View style={[styles.dot, { backgroundColor: macroColors.fat }]} />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    alignItems: "center",
    minWidth: 180,
  },
  kcal: { fontSize: 20, fontWeight: "700" },
  row: { marginTop: 4, fontSize: 12 },
  dotsRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 6,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
