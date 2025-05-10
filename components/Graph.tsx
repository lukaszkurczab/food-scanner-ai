import React, { useEffect, useState } from "react";
import { Dimensions } from "react-native";
import { LineChart } from "react-native-chart-kit";

const screenWidth = Dimensions.get("window").width;

type GraphProps = {
  labels: string[];
  data: number[];
};

export default function Graph({ labels, data }: GraphProps) {
  const chartConfig = {
    backgroundColor: "#ffffff",
    backgroundGradientFrom: "#ffffff",
    backgroundGradientTo: "#ffffff",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  };

  return (
    <LineChart
      data={{
        labels,
        datasets: [{ data: data.map((v) => (isFinite(v) ? v : 0)) }],
      }}
      width={screenWidth - 20}
      height={220}
      chartConfig={chartConfig}
      bezier
      style={{
        marginVertical: 8,
        borderRadius: 16,
        alignSelf: "center",
      }}
    />
  );
}
