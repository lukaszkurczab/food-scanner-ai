import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { MacroCardProps } from "../CardOverlay";

export default function MacroTagStripCard({
  protein,
  fat,
  carbs,
  kcal,
  textColor,
  bgColor,
  macroColors,
  showKcal,
  showMacros,
  fontFamily,
  fontWeight,
}: MacroCardProps) {
  const effectiveFontFamily = fontFamily ?? undefined;
  const baseWeight = fontWeight ?? "500";

  const items: { key: string; label: string; color: string }[] = [];

  if (showKcal) {
    items.push({ key: "kcal", label: `${kcal} kcal`, color: textColor });
  }

  if (showMacros) {
    items.push(
      { key: "P", label: `P ${protein} g`, color: macroColors.protein },
      { key: "C", label: `C ${carbs} g`, color: macroColors.carbs },
      { key: "F", label: `F ${fat} g`, color: macroColors.fat }
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <View style={styles.row}>
      {items.map((it) => {
        const effectiveWeight = it.key === "kcal" ? "700" : baseWeight;
        return (
          <View
            key={it.key}
            style={[
              styles.tag,
              { backgroundColor: bgColor, borderColor: it.color },
            ]}
          >
            <Text
              style={{
                color: it.color,
                fontSize: 12,
                fontWeight: effectiveWeight,
                fontFamily: effectiveFontFamily,
              }}
            >
              {it.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
});
