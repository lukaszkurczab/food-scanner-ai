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
  showKcal,
  showMacros,
  fontFamily,
  fontWeight,
}: MacroCardProps) {
  const effectiveFontFamily = fontFamily ?? undefined;
  const effectiveFontWeight = fontWeight ?? "700";

  const label = getLabel(protein, carbs, fat);

  return (
    <View style={styles.wrap}>
      <View style={[styles.badge, { backgroundColor: bgColor }]}>
        <Text
          style={[
            styles.badgeText,
            {
              color: textColor,
              fontFamily: effectiveFontFamily,
              fontWeight: effectiveFontWeight,
            },
          ]}
        >
          {label}
        </Text>
      </View>
      {showKcal && (
        <Text
          style={[
            styles.kcal,
            {
              color: textColor,
              fontFamily: effectiveFontFamily,
              fontWeight: effectiveFontWeight,
            },
          ]}
        >
          {kcal} kcal
        </Text>
      )}
      {showMacros && (
        <Text
          style={[
            styles.details,
            {
              color: textColor,
              fontFamily: effectiveFontFamily,
              fontWeight: effectiveFontWeight,
            },
          ]}
        >
          P {protein} g • C {carbs} g • F {fat} g
        </Text>
      )}
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
