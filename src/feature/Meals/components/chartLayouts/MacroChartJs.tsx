import React from "react";
import { View, StyleSheet } from "react-native";
// @ts-ignore
import Chart from "react-native-chartjs";

type ChartKind = "pie" | "doughnut" | "bar" | "polarArea" | "radar";

type Props = {
  kind: ChartKind;
  labels: string[];
  values: number[];
  colors: string[];
};

export default function MacroChartJs({ kind, labels, values, colors }: Props) {
  const config = {
    type: kind,
    data: {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: colors,
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
      },
      scales:
        kind === "bar"
          ? {
              x: {
                ticks: { display: false },
                grid: { display: false },
              },
              y: {
                ticks: { display: false },
                grid: { display: false },
              },
            }
          : undefined,
    },
  };

  return (
    <View style={styles.container}>
      <Chart config={config as any} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 220,
    height: 180,
  },
});
