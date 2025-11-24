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
  fontFamily,
  fontWeight,
}: MacroCardProps) {
  const effectiveFontFamily = fontFamily ?? undefined;
  const effectiveFontWeight = fontWeight ?? "500";

  return (
    <View style={[styles.card, { backgroundColor: bgColor }]}>
      <View style={styles.left}>
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
        <Text
          style={[
            styles.label,
            {
              color: textColor,
              fontFamily: effectiveFontFamily,
              fontWeight: effectiveFontWeight,
            },
          ]}
        >
          Today&apos;s meal
        </Text>
      </View>
      {showMacros && (
        <View style={styles.right}>
          <View style={styles.row}>
            <View
              style={[styles.dot, { backgroundColor: macroColors.protein }]}
            />
            <Text
              style={[
                styles.text,
                {
                  color: textColor,
                  fontFamily: effectiveFontFamily,
                  fontWeight: effectiveFontWeight,
                },
              ]}
            >
              Protein {protein} g
            </Text>
          </View>
          <View style={styles.row}>
            <View
              style={[styles.dot, { backgroundColor: macroColors.carbs }]}
            />
            <Text
              style={[
                styles.text,
                {
                  color: textColor,
                  fontFamily: effectiveFontFamily,
                  fontWeight: effectiveFontWeight,
                },
              ]}
            >
              Carbs {carbs} g
            </Text>
          </View>
          <View style={styles.row}>
            <View style={[styles.dot, { backgroundColor: macroColors.fat }]} />
            <Text
              style={[
                styles.text,
                {
                  color: textColor,
                  fontFamily: effectiveFontFamily,
                  fontWeight: effectiveFontWeight,
                },
              ]}
            >
              Fat {fat} g
            </Text>
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
