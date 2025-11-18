import React from "react";
import { View, Text, StyleSheet } from "react-native";
import BarChart from "@/components/BarChart";

type Props = {
  protein: number;
  fat: number;
  carbs: number;
  kcal: number;
  accentSecondary: string;
};

export default function MacroBarMini({
  protein,
  fat,
  carbs,
  kcal,
  accentSecondary,
}: Props) {
  const labels = ["P", "C", "F"];
  const data = [protein, carbs, fat];

  return (
    <View style={{ width: 260 }}>
      <Text style={styles.title}>{kcal} kcal</Text>
      <BarChart
        labels={labels}
        data={data}
        barColor={accentSecondary}
        orientation="vertical"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontWeight: "700", marginBottom: 4, textAlign: "center" },
});
