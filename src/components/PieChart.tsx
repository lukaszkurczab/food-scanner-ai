import React, { useState } from "react";
import { View, Text, LayoutChangeEvent } from "react-native";
import { Svg, Path, Circle } from "react-native-svg";
import { useTheme } from "@/theme/useTheme";
import { useTranslation } from "react-i18next";

type PieSlice = { value: number; color: string; label?: string };

type PieChartProps = {
  data: PieSlice[];
  maxSize?: number;
  minSize?: number;
  legendWidth?: number;
  gap?: number;
  strokeWidth?: number;
  fontSize?: number;
};

export const PieChart: React.FC<PieChartProps> = ({
  data,
  maxSize = 200,
  minSize = 100,
  legendWidth = 120,
  gap = 16,
  strokeWidth = 0,
  fontSize = 16,
}) => {
  const theme = useTheme();
  const { t } = useTranslation(["meals"]);
  const [parentW, setParentW] = useState(0);

  const filtered = data.map((s) => ({ ...s, value: Number(s.value) || 0 }));
  const nonZero = filtered.filter((s) => s.value > 0);
  const total = filtered.reduce((s, d) => s + d.value, 0);
  const EPS = 1e-6;

  const onLayout = (e: LayoutChangeEvent) =>
    setParentW(e.nativeEvent.layout.width);

  const canRow = parentW > 0 && parentW >= minSize + legendWidth + gap;
  const chartSize = parentW
    ? Math.max(
        minSize,
        Math.min(maxSize, canRow ? parentW - legendWidth - gap : parentW)
      )
    : maxSize;

  const radius = chartSize / 2;

  const renderSlice = (slice: PieSlice, i: number, startAngle: number) => {
    const sweep = (slice.value / total) * 360;
    if (sweep >= 360 - EPS) {
      return (
        <Circle key={i} cx={radius} cy={radius} r={radius} fill={slice.color} />
      );
    }
    const largeArc = sweep > 180 ? 1 : 0;
    const sr = (Math.PI / 180) * startAngle;
    const er = (Math.PI / 180) * (startAngle + sweep);
    const x1 = radius + radius * Math.sin(sr);
    const y1 = radius - Math.cos(sr) * radius;
    const x2 = radius + radius * Math.sin(er);
    const y2 = radius - Math.cos(er) * radius;

    return (
      <Path
        key={i}
        d={`M ${radius} ${radius} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`}
        fill={slice.color}
      />
    );
  };

  const getLabel = (label?: string) => {
    switch (label) {
      case "Carbs":
        return t("carbs", { ns: "meals" });
      case "Protein":
        return t("protein", { ns: "meals" });
      case "Fat":
        return t("fat", { ns: "meals" });
      default:
        return label;
    }
  };

  const Legend = () =>
    total > 0 && nonZero.length > 0 ? (
      <View style={{ minWidth: canRow ? legendWidth : undefined }}>
        {nonZero.map((slice, i) => (
          <View
            key={i}
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <View
              style={{
                width: 18,
                height: 18,
                borderRadius: 9,
                backgroundColor: slice.color,
                marginRight: 10,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            />
            <Text style={{ fontSize, color: theme.text }}>
              {getLabel(slice.label) ?? slice.value}
            </Text>
          </View>
        ))}
      </View>
    ) : null;

  let angle = 0;

  return (
    <View
      onLayout={onLayout}
      style={{
        width: "100%",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap,
        }}
      >
        <Svg width={chartSize} height={chartSize}>
          {total > 0 ? (
            nonZero.map((slice, i) => {
              const el = renderSlice(slice, i, angle);
              angle += (slice.value / total) * 360;
              return el;
            })
          ) : (
            <>
              <Circle cx={radius} cy={radius} r={radius} fill="transparent" />
              <Circle
                cx={radius}
                cy={radius}
                r={radius - strokeWidth / 2}
                fill="transparent"
              />
            </>
          )}
        </Svg>
        <Legend />
      </View>
    </View>
  );
};
