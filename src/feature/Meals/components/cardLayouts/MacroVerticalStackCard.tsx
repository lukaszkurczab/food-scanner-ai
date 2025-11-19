import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { MacroCardProps } from "../CardOverlay";

export default function MacroVerticalStackCard({
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
  const rows = [
    { label: "Protein", value: protein, color: macroColors.protein },
    { label: "Carbs", value: carbs, color: macroColors.carbs },
    { label: "Fat", value: fat, color: macroColors.fat },
  ];

  return (
    <View style={[styles.card, { backgroundColor: bgColor }]}>
      {showKcal && (
        <Text style={[styles.kcal, { color: textColor }]}>{kcal} kcal</Text>
      )}
      {showMacros && (
        <View style={styles.list}>
          {rows.map((r) => (
            <View key={r.label} style={styles.row}>
              <View style={[styles.marker, { backgroundColor: r.color }]} />
              <Text style={[styles.rowText, { color: textColor }]}>
                {r.label} {r.value} g
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    minWidth: 180,
  },
  kcal: { fontSize: 16, fontWeight: "700", marginBottom: 6 },
  list: { gap: 4 },
  row: { flexDirection: "row", alignItems: "center" },
  marker: { width: 4, height: 14, borderRadius: 2, marginRight: 6 },
  rowText: { fontSize: 12 },
});
