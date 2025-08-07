import React, { useState } from "react";
import { View, Text, StyleSheet, Dimensions, Pressable } from "react-native";
import {
  Svg,
  Line,
  Circle,
  G,
  Text as SvgText,
  Path,
  Defs,
  LinearGradient,
  Stop,
} from "react-native-svg";
import { useTheme } from "@/src/theme/useTheme";

type LineGraphProps = {
  data: number[];
  labels: string[];
  title?: string;
  stepY?: number;
  stepX?: number;
  height?: number;
};

export const LineGraph = ({
  data,
  labels,
  title,
  stepY = 200,
  stepX = 1,
  height = 120,
}: LineGraphProps) => {
  const theme = useTheme();
  const width = Dimensions.get("window").width - 40;
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const chartPadding = 20;
  const maxVal = Math.max(...data);
  const minVal = Math.min(...data);
  const range = maxVal - minVal || 1;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = chartPadding + height - ((v - minVal) / range) * height;
    return { x, y, value: v };
  });

  const linePath = points.reduce(
    (acc, point, i) => acc + `${i === 0 ? "M" : "L"}${point.x},${point.y} `,
    ""
  );

  const areaPath =
    linePath +
    `L${width},${height + chartPadding} L0,${height + chartPadding} Z`;

  return (
    <View style={styles.container}>
      {title && (
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      )}
      <Svg width={width} height={height + chartPadding * 2}>
        <Defs>
          <LinearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={theme.accent} stopOpacity={0.22} />
            <Stop offset="80%" stopColor={theme.accent} stopOpacity={0.03} />
          </LinearGradient>
        </Defs>
        <G>
          <Line
            x1={0}
            y1={height + chartPadding}
            x2={width}
            y2={height + chartPadding}
            stroke={theme.border}
            strokeWidth={1}
          />
          <Path d={areaPath} fill="url(#areaGradient)" />
          <Path
            d={linePath}
            fill="none"
            stroke={theme.accent}
            strokeWidth={2}
          />
          {points.map((p, i) => (
            <G key={i}>
              <Pressable
                onPress={() => setActiveIndex(activeIndex === i ? null : i)}
                style={{
                  position: "absolute",
                  left: p.x - 15,
                  top: p.y - 15,
                  width: 30,
                  height: 30,
                }}
              >
                <Circle cx={p.x} cy={p.y} r={4} fill={theme.accent} />
              </Pressable>
              {activeIndex === i && (
                <SvgText
                  x={p.x}
                  y={p.y - 8}
                  fontSize="12"
                  fontWeight="bold"
                  fill={theme.textSecondary}
                  textAnchor="middle"
                >
                  {p.value}
                </SvgText>
              )}
              {i % stepX === 0 && (
                <SvgText
                  x={p.x}
                  y={height + chartPadding + 14}
                  fontSize="10"
                  fill={theme.textSecondary}
                  textAnchor="middle"
                >
                  {labels[i]}
                </SvgText>
              )}
            </G>
          ))}
        </G>
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: 20 },
  title: { fontWeight: "bold", marginBottom: 8 },
});
