import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { LineGraph } from "@/components/LineGraph";

type Props = {
  protein: number;
  fat: number;
  carbs: number;
  kcal: number;
  accent: string;
};

export default function MacroLineMini({
  protein,
  fat,
  carbs,
  kcal,
  accent,
}: Props) {
  const labels = ["P", "C", "F"];
  const data = [protein, carbs, fat];

  return (
    <View style={{ width: 260 }}>
      <Text style={styles.title}>{kcal} kcal</Text>
      <LineGraph labels={labels} data={data} color={accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontWeight: "700", marginBottom: 4, textAlign: "center" },
});
