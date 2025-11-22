import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Path, Circle } from "react-native-svg";

type PieDatum = {
  value: number;
  color: string;
  label: string;
};

type Props = {
  data: PieDatum[];
  kcal: number;
  showKcalLabel?: boolean;
  showLegend?: boolean;
  textColor?: string;
  fontFamily?: string;
  backgroundColor?: string;
};

const SIZE = 180;
const PADDING = 8;
const MIN_RADIUS = 3;

const degToRad = (deg: number) => (deg * Math.PI) / 180;

function buildSectorPath(
  cx: number,
  cy: number,
  radius: number,
  startAngleDeg: number,
  endAngleDeg: number
): string {
  const startRad = degToRad(startAngleDeg);
  const endRad = degToRad(endAngleDeg);

  const x1 = cx + radius * Math.cos(startRad);
  const y1 = cy + radius * Math.sin(startRad);
  const x2 = cx + radius * Math.cos(endRad);
  const y2 = cy + radius * Math.sin(endRad);

  const largeArcFlag = endAngleDeg - startAngleDeg > 180 ? 1 : 0;

  return [
    `M ${cx} ${cy}`,
    `L ${x1} ${y1}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
    "Z",
  ].join(" ");
}

export default function MacroPolarAreaChart({
  data,
  kcal,
  showKcalLabel = true,
  showLegend = true,
  textColor,
  fontFamily,
  backgroundColor,
}: Props) {
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const maxRadius = SIZE / 2 - PADDING;

  if (!data || data.length === 0) {
    return (
      <View
        style={[
          styles.wrap,
          { backgroundColor: backgroundColor || "transparent" },
        ]}
      >
        {showKcalLabel && (
          <Text
            style={[styles.kcal, { color: textColor || "#000", fontFamily }]}
          >
            {kcal} kcal
          </Text>
        )}
      </View>
    );
  }

  const sanitized = data.map((d) => ({
    ...d,
    value: Math.max(0, d.value),
  }));

  const hasPositive = sanitized.some((d) => d.value > 0);
  const normalized = hasPositive
    ? sanitized
    : sanitized.map((d) => ({ ...d, value: 1 }));

  const maxVal = Math.max(1, ...normalized.map((d) => d.value));

  const n = normalized.length;
  const angleStep = 360 / n;
  const baseAngle = -90;

  const kcalStyle = [styles.kcal, { color: textColor || "#000", fontFamily }];

  const legendTextStyle = [
    styles.legendText,
    { color: textColor || "#000", fontFamily },
  ];

  return (
    <View
      style={[
        styles.wrap,
        { backgroundColor: backgroundColor || "transparent" },
      ]}
    >
      <View style={styles.chartContainer}>
        <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          {n === 1 ? (
            <Circle
              cx={cx}
              cy={cy}
              r={Math.max(
                MIN_RADIUS,
                (normalized[0].value / maxVal) * maxRadius
              )}
              fill={normalized[0].color}
            />
          ) : (
            normalized.map((d, index) => {
              const startAngle = baseAngle + index * angleStep;
              const endAngle = startAngle + angleStep;
              const ratio = d.value / maxVal;

              let radius = hasPositive ? maxRadius * ratio : maxRadius;
              if (d.value > 0) {
                radius = Math.max(MIN_RADIUS, radius);
              }

              if (radius <= 0) return null;

              const path = buildSectorPath(
                cx,
                cy,
                radius,
                startAngle,
                endAngle
              );

              return (
                <Path key={`${d.label}-${index}`} d={path} fill={d.color} />
              );
            })
          )}
        </Svg>
      </View>

      {showKcalLabel && <Text style={kcalStyle}>{kcal} kcal</Text>}

      {showLegend && (
        <View style={styles.legendRow}>
          {sanitized.map((d) => (
            <View key={d.label} style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: d.color }]} />
              <Text style={legendTextStyle}>
                {d.label}: {Math.round(d.value)} g
              </Text>
            </View>
          ))}
        </View>
      )}
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
  legendRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 4,
    marginVertical: 2,
  },
  legendText: {
    fontSize: 11,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
});
