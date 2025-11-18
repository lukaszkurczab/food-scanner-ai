import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { MacroCardProps } from "../CardOverlay";

function getLabel(protein: number, carbs: number, fat: number) {
  const total = Math.max(1, protein + carbs + fat);
  const pShare = protein / total;
  if (pShare >= 0.3) return "High protein";
  return "Balanced macros";
}

export default function MacroBadgeCard({
  protein,
  fat,
  carbs,
  kcal,
  textColor,
  bgColor,
}: MacroCardProps) {
  const label = getLabel(protein, carbs, fat);

  return (
    <View style={[styles.wrap]}>
      <View style={[styles.badge, { backgroundColor: bgColor }]}>
        <Text style={[styles.badgeText, { color: textColor }]}>{label}</Text>
      </View>
      <Text style={[styles.kcal, { color: textColor }]}>{kcal} kcal</Text>
      <Text style={[styles.details, { color: textColor }]}>
        P {protein} g • C {carbs} g • F {fat} g
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "transparent",
    alignItems: "flex-start",
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: { fontSize: 12, fontWeight: "600" },
  kcal: { marginTop: 4, fontWeight: "700", fontSize: 16 },
  details: { marginTop: 2, fontSize: 12 },
});
