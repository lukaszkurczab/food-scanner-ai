import React from "react";
import { View, Text, StyleSheet } from "react-native";

type Props = {
  protein: number;
  carbs: number;
  fat: number;
  size?: number;
  colors: {
    protein: string;
    carbs: string;
    fat: string;
  };
};

export default function TriangleMacroChart({
  protein,
  carbs,
  fat,
  size = 180,
  colors,
}: Props) {
  const total = Math.max(1, protein + carbs + fat);
  const p = protein / total;
  const c = carbs / total;
  const f = fat / total;

  const h = (Math.sqrt(3) / 2) * size;

  const x = size * (c + f / 2);
  const y = h * (1 - f);

  return (
    <View style={[styles.wrap, { width: size, height: h }]}>
      <View
        style={[
          styles.triangle,
          { borderBottomColor: "rgba(255,255,255,0.2)", borderBottomWidth: h },
        ]}
      />

      <View
        style={[
          styles.point,
          {
            left: x - 6,
            top: y - 6,
            backgroundColor: "#fff",
          },
        ]}
      />

      <View style={styles.legend}>
        <Text style={{ color: colors.protein }}>
          Protein {Math.round(protein)}g
        </Text>
        <Text style={{ color: colors.carbs }}>Carbs {Math.round(carbs)}g</Text>
        <Text style={{ color: colors.fat }}>Fat {Math.round(fat)}g</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  triangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 90,
    borderRightWidth: 90,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
  point: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legend: {
    marginTop: 8,
    alignItems: "center",
    gap: 2,
  },
});
