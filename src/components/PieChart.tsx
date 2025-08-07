import React from "react";
import { View, Text } from "react-native";
import { Svg, Path, Circle } from "react-native-svg";

type PieSlice = {
  value: number;
  color: string;
  label?: string;
};

type PieChartProps = {
  data: PieSlice[];
  size?: number;
  strokeWidth?: number;
  legendWidth?: number;
  fontSize?: number;
};

export const PieChart: React.FC<PieChartProps> = ({
  data,
  size = 200,
  strokeWidth = 0,
  legendWidth = 96,
  fontSize = 16,
}) => {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  let angle = 0;
  const radius = size / 2;

  if (!total || total <= 0) {
    return (
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Svg width={size} height={size}>
          <Circle cx={radius} cy={radius} r={radius} fill="transparent" />
          <Circle
            cx={radius}
            cy={radius}
            r={radius - strokeWidth / 2}
            fill="transparent"
          />
        </Svg>
        <View style={{ marginLeft: 18, minWidth: legendWidth }}>
          {data.map((slice, i) => (
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
                  borderColor: "#e0e0e0",
                }}
              />
              <Text style={{ fontSize, color: "#444" }}>
                {slice.label || 0}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  const renderSlice = (slice: PieSlice, i: number) => {
    const startAngle = angle;
    const sweep = (slice.value / total) * 360;
    angle += sweep;
    const largeArc = sweep > 180 ? 1 : 0;

    const startRadians = (Math.PI / 180) * startAngle;
    const endRadians = (Math.PI / 180) * (startAngle + sweep);

    const x1 = radius + radius * Math.sin(startRadians);
    const y1 = radius - radius * Math.cos(startRadians);
    const x2 = radius + radius * Math.sin(endRadians);
    const y2 = radius - radius * Math.cos(endRadians);

    return (
      <Path
        key={i}
        d={`
          M ${radius} ${radius}
          L ${x1} ${y1}
          A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}
          Z
        `}
        fill={slice.color}
        stroke="#fff"
        strokeWidth={strokeWidth}
      />
    );
  };

  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <Svg width={size} height={size}>
        {data.map(renderSlice)}
      </Svg>

      <View style={{ marginLeft: 18, minWidth: legendWidth }}>
        {data.map((slice, i) => (
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
                borderColor: "#e0e0e0",
              }}
            />
            <Text style={{ fontSize, color: "#444" }}>
              {slice.label || slice.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};
