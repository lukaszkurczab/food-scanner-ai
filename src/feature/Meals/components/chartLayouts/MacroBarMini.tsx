import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";

type Props = {
  protein: number;
  fat: number;
  carbs: number;
  kcal: number;
  chartMacroColors?: {
    protein?: string;
    carbs?: string;
    fat?: string;
  };
  macroColor?: {
    protein?: string;
    carbs?: string;
    fat?: string;
  };
  showKcalLabel?: boolean;
  textColor?: string;
  fontFamily?: string;
  backgroundColor?: string;
};

const DEFAULT_PROTEIN = "#2196F3";
const DEFAULT_CARBS = "#81C784";
const DEFAULT_FAT = "#C6A025";

export default function MacroBarMini({
  protein,
  fat,
  carbs,
  kcal,
  chartMacroColors,
  macroColor,
  showKcalLabel = true,
  textColor,
  fontFamily,
  backgroundColor,
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

  const kcalStyle = [styles.kcal, { color: textColor || "#000", fontFamily }];

  const labelStyle = [
    styles.barLabel,
    { color: textColor || "#000", fontFamily },
  ];

  const colors = {
    protein:
      chartMacroColors?.protein || macroColor?.protein || DEFAULT_PROTEIN,
    carbs: chartMacroColors?.carbs || macroColor?.carbs || DEFAULT_CARBS,
    fat: chartMacroColors?.fat || macroColor?.fat || DEFAULT_FAT,
  };

  return (
    <View style={styles.wrap}>
      {showKcalLabel && <Text style={kcalStyle}>{kcal} kcal</Text>}
      <View style={styles.chartRow}>
        {items.map((item) => (
          <View key={item.key} style={styles.barCol}>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  {
                    backgroundColor: colors[item.key as keyof typeof colors],
                    height: `${(item.value / maxVal) * 100}%`,
                  },
                ]}
              />
            </View>
            <Text style={labelStyle}>{item.label}</Text>
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
    fontSize: 16,
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
