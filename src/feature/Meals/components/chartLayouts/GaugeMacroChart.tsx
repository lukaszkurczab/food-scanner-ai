import React from "react";
import { View, Text, StyleSheet } from "react-native";

type Datum = { value: number; color: string; label: string };

type Props = {
  data: Datum[];
  kcal: number;
  showLabel?: boolean;
  textColor?: string;
  fontFamily?: string;
  backgroundColor?: string;
};

export default function GaugeMacroChart({
  data,
  kcal,
  showLabel = true,
  textColor,
  fontFamily,
  backgroundColor,
}: Props) {
  const safeData = data.map((d) => ({
    ...d,
    value: Math.max(0, d.value),
  }));

  const hasPositive = safeData.some((d) => d.value > 0);
  const normalized = hasPositive
    ? safeData
    : safeData.map((d) => ({ ...d, value: 1 }));

  const labelStyle = [styles.kcal, { color: textColor || "#000", fontFamily }];

  return (
    <View
      style={[
        styles.wrap,
        { backgroundColor: backgroundColor || "transparent" },
      ]}
    >
      <View style={styles.gaugeOuter}>
        {normalized.map((d, i) => (
          <View
            key={i}
            style={[
              styles.segment,
              {
                backgroundColor: d.color,
                flex: d.value,
              },
            ]}
          />
        ))}
      </View>

      {showLabel && <Text style={labelStyle}>{kcal} kcal</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: 220, alignItems: "center" },
  gaugeOuter: {
    width: 200,
    height: 100,
    overflow: "hidden",
    flexDirection: "row",
    borderTopLeftRadius: 100,
    borderTopRightRadius: 100,
  },
  segment: {
    height: "100%",
  },
  kcal: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: "700",
  },
});
