import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { MacroCardProps } from "../CardOverlay";

export default function MacroSplitCard({
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
      <View style={styles.left}>
        {showKcal && (
          <Text style={[styles.kcal, { color: textColor }]}>{kcal} kcal</Text>
        )}
        <Text style={[styles.label, { color: textColor }]}>
          Today&apos;s meal
        </Text>
      </View>
      {showMacros && (
        <View style={styles.right}>
          <View style={styles.row}>
            <View
              style={[styles.dot, { backgroundColor: macroColors.protein }]}
            />
            <Text style={[styles.text, { color: textColor }]}>
              Protein {protein} g
            </Text>
          </View>
          <View style={styles.row}>
            <View
              style={[styles.dot, { backgroundColor: macroColors.carbs }]}
            />
            <Text style={[styles.text, { color: textColor }]}>
              Carbs {carbs} g
            </Text>
          </View>
          <View style={styles.row}>
            <View style={[styles.dot, { backgroundColor: macroColors.fat }]} />
            <Text style={[styles.text, { color: textColor }]}>Fat {fat} g</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    borderRadius: 18,
    padding: 10,
    minWidth: 220,
  },
  left: { flex: 1, justifyContent: "center" },
  right: { flex: 1, justifyContent: "center", gap: 4 },
  kcal: { fontSize: 18, fontWeight: "700" },
  label: { fontSize: 12, marginTop: 2 },
  row: { flexDirection: "row", alignItems: "center" },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  text: { fontSize: 12 },
});
