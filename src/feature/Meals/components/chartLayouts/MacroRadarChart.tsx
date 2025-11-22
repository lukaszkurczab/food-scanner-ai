import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle, Line, Polygon } from "react-native-svg";

type PieDatum = {
  value: number;
  color: string;
  label: string;
};

type Props = {
  data: PieDatum[];
  kcal: number;
  showKcalLabel?: boolean;
};

const SIZE = 180;
const PADDING = 8;
const MIN_RADIUS_RATIO = 0.1;

const degToRad = (deg: number) => (deg * Math.PI) / 180;

export default function MacroRadarChart({
  data,
  kcal,
  showKcalLabel = true,
}: Props) {
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const maxRadius = SIZE / 2 - PADDING;

  const sanitized = (data || []).map((d) => ({
    ...d,
    value: Math.max(0, d.value),
  }));

  if (!sanitized.length) {
    return (
      <View style={styles.wrap}>
        {showKcalLabel && <Text style={styles.kcal}>{kcal} kcal</Text>}
      </View>
    );
  }

  const hasPositive = sanitized.some((d) => d.value > 0);
  const normalized = hasPositive
    ? sanitized
    : sanitized.map((d) => ({ ...d, value: 1 }));

  const maxVal = Math.max(1, ...normalized.map((d) => d.value));

  const n = normalized.length;
  const angleStep = 360 / n;
  const baseAngle = -90;

  const levels = 4;
  const gridRadii = Array.from(
    { length: levels },
    (_, i) => maxRadius * ((i + 1) / levels)
  );

  const points = normalized.map((d, index) => {
    const angleDeg = baseAngle + index * angleStep;
    const angleRad = degToRad(angleDeg);
    const ratio = d.value / maxVal;
    const radius =
      d.value > 0
        ? maxRadius * (MIN_RADIUS_RATIO + (1 - MIN_RADIUS_RATIO) * ratio)
        : 0;
    const x = cx + radius * Math.cos(angleRad);
    const y = cy + radius * Math.sin(angleRad);
    return { x, y, color: d.color };
  });

  const polygonPoints =
    points.length >= 2
      ? points.map((p) => `${p.x},${p.y}`).join(" ")
      : `${cx + maxRadius},${cy}`;

  return (
    <View style={styles.wrap}>
      <View style={styles.chartContainer}>
        <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          {gridRadii.map((r, i) => (
            <Circle
              key={`grid-${i}`}
              cx={cx}
              cy={cy}
              r={r}
              stroke="rgba(255,255,255,0.25)"
              strokeWidth={1}
              fill="none"
            />
          ))}
          {normalized.map((_, index) => {
            const angleRad = degToRad(baseAngle + index * angleStep);
            const x = cx + maxRadius * Math.cos(angleRad);
            const y = cy + maxRadius * Math.sin(angleRad);
            return (
              <Line
                key={`axis-${index}`}
                x1={cx}
                y1={cy}
                x2={x}
                y2={y}
                stroke="rgba(255,255,255,0.25)"
                strokeWidth={1}
              />
            );
          })}
          <Polygon
            points={polygonPoints}
            fill="rgba(255,255,255,0.35)"
            stroke="rgba(255,255,255,0.85)"
            strokeWidth={1.5}
          />
          {points.map((p, i) => (
            <Circle
              key={`point-${i}`}
              cx={p.x}
              cy={p.y}
              r={3.5}
              fill={p.color}
            />
          ))}
        </Svg>
      </View>
      {showKcalLabel && <Text style={styles.kcal}>{kcal} kcal</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 220,
    alignItems: "center",
  },
  chartContainer: {
    width: SIZE,
    height: SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  kcal: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: "700",
  },
});
