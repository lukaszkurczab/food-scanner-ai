import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { Svg, Line, Circle, G, Text as SvgText, Path } from "react-native-svg";
import { useTheme } from "@/src/theme/useTheme";

const chartHeight = 120;
const chartPadding = 20;
const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const WeeklyProgressGraph = () => {
  const theme = useTheme();
  const width = Dimensions.get("window").width - 40;

  const data = [1800, 1700, 1900, 2000, 2200, 2300, 2100];
  const maxVal = Math.max(...data);
  const minVal = Math.min(...data);
  const range = maxVal - minVal || 1;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = chartPadding + chartHeight - ((v - minVal) / range) * chartHeight;
    return { x, y, value: v };
  });

  const linePath = points.reduce(
    (acc, point, i) => acc + `${i === 0 ? "M" : "L"}${point.x},${point.y} `,
    ""
  );

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.text }]}>Weekly Progress</Text>
      <Svg width={width} height={chartHeight + chartPadding * 2}>
        <G>
          <Line
            x1={0}
            y1={chartHeight + chartPadding}
            x2={width}
            y2={chartHeight + chartPadding}
            stroke={theme.border}
            strokeWidth={1}
          />
          <Path
            d={linePath}
            fill="none"
            stroke={theme.accent}
            strokeWidth={2}
          />
          {points.map((p, i) => (
            <G key={i}>
              <Circle cx={p.x} cy={p.y} r={4} fill={theme.accent} />
              <SvgText
                x={p.x}
                y={p.y - 8}
                fontSize="10"
                fill={theme.textSecondary}
                textAnchor="middle"
              >
                {p.value}
              </SvgText>
              <SvgText
                x={p.x}
                y={chartHeight + chartPadding + 12}
                fontSize="10"
                fill={theme.textSecondary}
                textAnchor="middle"
              >
                {labels[i]}
              </SvgText>
            </G>
          ))}
        </G>
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  title: {
    fontWeight: "bold",
    marginBottom: 8,
  },
});
