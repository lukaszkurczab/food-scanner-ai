import React from "react";
import { Svg, Path } from "react-native-svg";

type PieSlice = {
  value: number;
  color: string;
};

type PieChartProps = {
  data: PieSlice[];
  size?: number;
  strokeWidth?: number;
};

export const PieChart: React.FC<PieChartProps> = ({
  data,
  size = 200,
  strokeWidth = 0,
}) => {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  let angle = 0;
  const radius = size / 2;

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
    <Svg width={size} height={size}>
      {data.map(renderSlice)}
    </Svg>
  );
};
